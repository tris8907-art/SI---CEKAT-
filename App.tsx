import React, { useState, useEffect, useCallback } from 'react';
import { Flame, ClipboardCheck, LayoutDashboard, History, LogOut, RefreshCw, Settings, User, Maximize, Minimize, X, Database, BrainCircuit, Bell, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Dashboard from './components/Dashboard';
import ChecklistForm from './components/ChecklistForm';
import ReportTable from './components/ReportTable';
import Login from './components/Login';
import { InspectionData, AIConfig, ReadinessStatus } from './types';
import { generateDraftMessage } from './services/geminiService';
import { DEFAULT_AI_CONFIG } from './constants';
import { db, auth, handleFirestoreError, OperationType } from './services/firebase';
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc, setDoc, getDocs, writeBatch } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

import SecurityAuthority from './components/SecurityAuthority';

const App: React.FC = () => {
  // Inisialisasi state langsung dari localStorage untuk persistensi instan saat reload
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('damkar_auth') === 'true';
  });

  const [userRole, setUserRole] = useState<'admin' | 'petugas' | null>(() => {
    return localStorage.getItem('damkar_role') as 'admin' | 'petugas' | null;
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'checklist' | 'history' | 'security'>(() => {
    return localStorage.getItem('damkar_role') === 'petugas' ? 'checklist' : 'dashboard';
  });
  
  const [history, setHistory] = useState<InspectionData[]>(() => {
    const savedHistory = localStorage.getItem('damkar_history_backup');
    return savedHistory ? JSON.parse(savedHistory) : [];
  });
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isCommandCenter, setIsCommandCenter] = useState(false);
  
  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((e) => {
        console.error(`Error attempting to enable full-screen mode: ${e.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };
  
  const [aiConfig, setAiConfig] = useState<AIConfig>(DEFAULT_AI_CONFIG);

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsLoggedIn(true);
        // In a real app, we'd fetch the role from Firestore. 
        // For now, we'll trust the localStorage role if it exists, otherwise default to petugas.
        const savedRole = localStorage.getItem('damkar_role') as 'admin' | 'petugas' | null;
        setUserRole(savedRole || 'petugas');
      } else {
        setIsLoggedIn(false);
        setUserRole(null);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Real-time Reports Listener
  useEffect(() => {
    if (!isLoggedIn || !isAuthReady) return;

    const q = query(collection(db, 'reports'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reportsData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as InspectionData[];
      setHistory(reportsData);
      // Simpan ke cadangan lokal
      localStorage.setItem('damkar_history_backup', JSON.stringify(reportsData));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reports');
    });

    return () => unsubscribe();
  }, [isLoggedIn, isAuthReady]);

  // Real-time Config Listener
  useEffect(() => {
    if (!isLoggedIn || !isAuthReady) return;

    const unsubscribe = onSnapshot(doc(db, 'config', 'ai'), (docSnap) => {
      if (docSnap.exists()) {
        setAiConfig(docSnap.data() as AIConfig);
      } else {
        // Initialize config if it doesn't exist
        setDoc(doc(db, 'config', 'ai'), DEFAULT_AI_CONFIG).catch(err => {
          handleFirestoreError(err, OperationType.WRITE, 'config/ai');
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'config/ai');
    });

    return () => unsubscribe();
  }, [isLoggedIn, isAuthReady]);

  const updateAiConfig = async (newConfig: AIConfig) => {
    try {
      await setDoc(doc(db, 'config', 'ai'), newConfig);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'config/ai');
    }
  };

  const syncPendingReports = useCallback(async (currentHistory: InspectionData[]) => {
    // With Firebase, we don't need manual sync as much, but we can use this to generate AI drafts for reports that don't have them
    const pending = currentHistory.filter(r => !r.aiDraft);
    if (pending.length === 0 || !navigator.onLine) return;

    setIsSyncing(true);
    for (const report of pending) {
      try {
        const draft = await generateDraftMessage(report, aiConfig.draftInstruction);
        await setDoc(doc(db, 'reports', report.id), { ...report, aiDraft: draft }, { merge: true });
      } catch (e) {
        console.error("Gagal sinkronisasi laporan ID:", report.id);
      }
    }
    setIsSyncing(false);
  }, [aiConfig]);

  const handleLogin = (role: 'admin' | 'petugas') => {
    // In this simple version, we still use the mock login but it triggers the auth state
    // In a real app, we'd use Firebase Auth properly
    setIsLoggedIn(true);
    setUserRole(role);
    localStorage.setItem('damkar_auth', 'true');
    localStorage.setItem('damkar_role', role);
    setActiveTab(role === 'petugas' ? 'checklist' : 'dashboard');
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setIsLoggedIn(false);
      setUserRole(null);
      localStorage.removeItem('damkar_auth');
      localStorage.removeItem('damkar_role');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const addReport = async (report: InspectionData) => {
    try {
      // Use setDoc with the report.id to ensure the document ID matches the data ID
      // and include the id field in the data to satisfy security rules
      await setDoc(doc(db, 'reports', report.id), {
        ...report,
        statusSync: 'synced'
      });
      setActiveTab('history');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `reports/${report.id}`);
    }
  };

  const deleteReport = async (id: string) => {
    if (userRole !== 'admin') return;
    try {
      await deleteDoc(doc(db, 'reports', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `reports/${id}`);
    }
  };

  const resetHistory = async () => {
    if (userRole !== 'admin') return;
    try {
      const snapshot = await getDocs(collection(db, 'reports'));
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'reports');
    }
  };

  if (!isAuthReady) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <RefreshCw className="text-red-600 animate-spin" size={48} />
        <p className="text-white font-black uppercase tracking-widest text-xs">Inisialisasi Sistem...</p>
      </div>
    </div>
  );

  if (!isLoggedIn) return <Login onLogin={handleLogin} />;

  return (
    <div className={`min-h-[100dvh] flex bg-slate-950 overflow-hidden relative selection:bg-red-100 selection:text-red-900`}>
      {/* Sidebar - Always visible on desktop for both roles in this new aesthetic */}
      <aside className={`hidden md:flex flex-col w-24 lg:w-32 bg-slate-900/50 backdrop-blur-xl border-r border-white/5 p-4 py-8 z-50 transition-all duration-500`}>
        <div className="flex flex-col items-center gap-12 h-full">
          <div className="p-3 bg-red-600 rounded-2xl shadow-2xl shadow-red-900/40">
            <Shield size={24} className="text-white" />
          </div>

          <nav className="flex flex-col items-center gap-8 flex-1">
            {userRole === 'admin' && (
              <SidebarIcon 
                active={activeTab === 'dashboard'} 
                onClick={() => setActiveTab('dashboard')} 
                icon={<LayoutDashboard size={22} />} 
                label="DASHBOARD" 
              />
            )}
            <SidebarIcon 
              active={activeTab === 'checklist'} 
              onClick={() => setActiveTab('checklist')} 
              icon={<ClipboardCheck size={22} />} 
              label="INPUT ARMADA" 
            />
            <SidebarIcon 
              active={activeTab === 'history'} 
              onClick={() => setActiveTab('history')} 
              icon={<Database size={22} />} 
              label="ARSIP DATA" 
            />
            <SidebarIcon 
              active={activeTab === 'security'} 
              onClick={() => setActiveTab('security')} 
              icon={<Shield size={22} />} 
              label="OTORITAS" 
            />
            {userRole === 'admin' && (
              <SidebarIcon 
                active={false} 
                onClick={() => {}} 
                icon={<Settings size={22} />} 
                label="KONFIGURASI" 
              />
            )}
            <SidebarIcon 
              active={false} 
              onClick={() => {}} 
              icon={<BrainCircuit size={22} />} 
              label="ANALISIS AI" 
            />
          </nav>

          <div className="flex flex-col items-center gap-6 pt-6 border-t border-white/5 w-full">
            <SidebarIcon 
              active={false} 
              onClick={() => {}} 
              icon={<Bell size={22} />} 
              label="KENDALA TEKNIS" 
              color="red"
            />
            <button 
              onClick={handleLogout}
              className="p-3 text-slate-500 hover:text-red-500 transition-colors"
              title="Keluar"
            >
              <LogOut size={22} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-[100dvh] overflow-hidden relative">
        <div className={`atmosphere ${activeTab === 'history' ? 'opacity-0' : 'opacity-40'}`} />
        
        {/* Top Header */}
        <header className={`p-4 md:p-6 px-4 md:px-10 flex items-center justify-between z-10 no-print relative ${activeTab === 'history' ? 'bg-white/80 backdrop-blur-md border-b border-slate-100' : ''}`}>
          {/* Left Side: Logo on mobile, Spacer on desktop */}
          <div className="flex items-center md:w-32">
            <div className="md:hidden p-2 bg-red-600 rounded-lg shadow-lg shadow-red-900/20">
              <Shield size={16} className="text-white" />
            </div>
          </div>
          
          <div className="flex flex-col items-center text-center flex-1 min-w-0 px-2">
            <div className="flex items-center gap-2 md:gap-3 mb-0.5 md:mb-1">
              <div className={`hidden sm:block h-px w-8 md:w-12 ${activeTab === 'history' ? 'bg-gradient-to-r from-transparent to-slate-200' : 'bg-gradient-to-r from-transparent to-white/20'}`}></div>
              <h1 className={`text-base md:text-2xl font-black tracking-[0.1em] md:tracking-[0.2em] uppercase italic truncate ${activeTab === 'history' ? 'text-slate-900' : 'text-white'}`}>Sistem Monitoring</h1>
              <div className={`hidden sm:block h-px w-8 md:w-12 ${activeTab === 'history' ? 'bg-gradient-to-l from-transparent to-slate-200' : 'bg-gradient-to-l from-transparent to-white/20'}`}></div>
            </div>
            <p className="text-[7px] md:text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] md:tracking-[0.4em] truncate">Sistem Analisis Kesiapsiagaan Armada</p>
          </div>

          <div className="flex items-center gap-1.5 md:gap-3 md:absolute md:right-10">
            <button 
              onClick={() => syncPendingReports(history)}
              className={`p-2 md:p-3 rounded-xl md:rounded-2xl transition-all active:scale-95 border ${activeTab === 'history' ? 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-200' : 'bg-white/5 hover:bg-white/10 text-white border-white/10'}`}
              title="Sinkronisasi Data"
            >
              <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={toggleFullScreen}
              className={`p-2 md:p-3 rounded-xl md:rounded-2xl transition-all active:scale-95 border ${activeTab === 'history' ? 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-200' : 'bg-white/5 hover:bg-white/10 text-white border-white/10'}`}
              title="Layar Penuh"
            >
              {isFullScreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>
          </div>
        </header>

        {/* Tab Navigation (Sub-header) */}
        <div className="flex justify-center mb-4 md:mb-6 px-4 md:px-10 z-10">
          <div className="flex bg-slate-900/50 backdrop-blur-md p-1 md:p-1.5 rounded-xl md:rounded-2xl border border-white/5 shadow-2xl overflow-x-auto no-scrollbar">
            {userRole === 'admin' && (
              <TabButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={14} />} label="DASHBOARD" />
            )}
            <TabButton active={activeTab === 'checklist'} onClick={() => setActiveTab('checklist')} icon={<ClipboardCheck size={14} />} label="INPUT ARMADA" />
            <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<Database size={14} />} label="ARSIP DATA" />
            <TabButton active={activeTab === 'security'} onClick={() => setActiveTab('security')} icon={<Shield size={14} />} label="OTORITAS" />
          </div>
        </div>

        <div className={`flex-1 overflow-y-auto p-4 md:p-8 pb-32 md:pb-10 transition-all duration-700 scroll-smooth ${activeTab === 'history' ? 'bg-white' : ''}`}>
          <div className="max-w-[1600px] mx-auto w-full h-full">
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                >
                  <Dashboard 
                    reports={history} 
                    userRole={userRole} 
                    aiConfig={aiConfig} 
                    onUpdateAiConfig={updateAiConfig} 
                    onNavigate={setActiveTab}
                  />
                </motion.div>
              )}
              {activeTab === 'checklist' && (
                <motion.div
                  key="checklist"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  <ChecklistForm onSubmit={addReport} userRole={userRole} />
                </motion.div>
              )}
              {activeTab === 'history' && (
                <motion.div
                  key="history"
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4 }}
                >
                  <ReportTable 
                    reports={history} 
                    userRole={userRole} 
                    onDelete={deleteReport} 
                    onReset={resetHistory} 
                  />
                </motion.div>
              )}
              {activeTab === 'security' && (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  transition={{ duration: 0.4 }}
                >
                  <SecurityAuthority />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] no-print pb-[env(safe-area-inset-bottom)]">
          <div className="absolute inset-0 bg-white/80 backdrop-blur-2xl border-t border-slate-100"></div>
          <nav className="relative flex items-stretch h-20 px-4">
            {userRole !== 'admin' && (
              <MobileNavItem active={activeTab === 'checklist'} onClick={() => setActiveTab('checklist')} icon={<ClipboardCheck size={20} />} label="Input" />
            )}
            {userRole !== 'admin' && (
              <MobileNavItem active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History size={20} />} label="Arsip" />
            )}
            {userRole !== 'admin' && (
              <button onClick={handleLogout} className="flex-1 flex flex-col items-center justify-center gap-1 text-slate-400 group">
                <div className="p-2 rounded-xl group-active:bg-red-50 transition-colors">
                  <LogOut size={20} />
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest">Keluar</span>
              </button>
            )}
          </nav>
        </div>
      </main>
    </div>
  );
};

const SidebarIcon = ({ active, onClick, icon, label, color }: any) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center gap-2 group relative w-full"
  >
    <div className={`p-4 rounded-2xl transition-all duration-500 ${
      active 
        ? 'bg-white/10 text-white shadow-xl border border-white/10' 
        : color === 'red' ? 'text-red-500 bg-red-500/10 border border-red-500/20' : 'text-slate-500 hover:text-white hover:bg-white/5'
    }`}>
      {icon}
    </div>
    <span className={`text-[7px] font-black uppercase tracking-widest transition-colors duration-500 ${active ? 'text-white' : 'text-slate-600 group-hover:text-slate-400'}`}>
      {label}
    </span>
    {active && (
      <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-8 bg-red-600 rounded-r-full shadow-[0_0_15px_rgba(220,38,38,0.8)]"></div>
    )}
  </button>
);

const TabButton = ({ active, onClick, icon, label }: any) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 md:gap-3 px-3 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl transition-all duration-500 text-[8px] md:text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${
      active 
        ? 'bg-white/10 text-white shadow-xl border border-white/10' 
        : 'text-slate-500 hover:text-white hover:bg-white/5'
    }`}
  >
    {icon}
    {label}
  </button>
);

const MobileNavItem = ({ active, onClick, icon, label }: any) => (
  <button 
    onClick={onClick}
    className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-500 ${
      active ? 'text-red-500' : 'text-slate-500'
    }`}
  >
    <div className={`p-2 rounded-xl transition-all duration-500 ${active ? 'bg-red-500/10' : ''}`}>
      {icon}
    </div>
    <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

export default App;
