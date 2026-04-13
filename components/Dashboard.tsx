
import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AlertCircle, Bell, AlertTriangle, Sparkles, RefreshCw, ShieldCheck, BrainCircuit, Save, Zap, MessageSquare, Send, ChevronDown, ChevronUp, ClipboardCheck, History, Maximize, ChevronRight, User, Flame, Calendar, Activity, Wifi, Cloud, Clock, Settings } from 'lucide-react';
import { InspectionData, ReadinessStatus, AIConfig } from '../types';
import { UNITS } from '../constants';
import { generateDailySummary } from '../services/geminiService';

interface Props {
  reports: InspectionData[];
  userRole: 'admin' | 'petugas' | null;
  aiConfig: AIConfig;
  onUpdateAiConfig: (config: AIConfig) => void;
  onNavigate: (tab: 'dashboard' | 'checklist' | 'history') => void;
}

const Dashboard: React.FC<Props> = ({ reports, userRole, aiConfig, onUpdateAiConfig, onNavigate }) => {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const reportDate = new Date(r.timestamp).toISOString().split('T')[0];
      return reportDate === selectedDate;
    });
  }, [reports, selectedDate]);

  const [summaryData, setSummaryData] = useState<{ fleetSummary: string, unitPredictions: any[] } | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [draftPrompt, setDraftPrompt] = useState(aiConfig.draftInstruction);
  const [summaryPrompt, setSummaryPrompt] = useState(aiConfig.summaryInstruction);
  const [isAdminConfigOpen, setIsAdminConfigOpen] = useState(false);
  const [manualInstructions, setManualInstructions] = useState<Record<string, string>>({});
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    if (reports.length > 0) {
      setLastUpdate(new Date());
    }
  }, [reports]);

  useEffect(() => {
    if (filteredReports.length > 0) {
      handleGetSummary();
    } else {
      setSummaryData(null);
    }
  }, [filteredReports, aiConfig.summaryInstruction]);

  const stats = useMemo(() => {
    const ready = filteredReports.filter(r => r.status === ReadinessStatus.SIAGA).length;
    const limited = filteredReports.filter(r => r.status === ReadinessStatus.SIAGA_TERBATAS).length;
    const off = filteredReports.filter(r => r.status === ReadinessStatus.OFF_SERVICE).length;
    
    const avgFuel = filteredReports.length > 0 
      ? Math.round(filteredReports.reduce((acc, r) => acc + (r.fuelLevel || 0), 0) / filteredReports.length) 
      : 0;
    const avgWater = filteredReports.length > 0 
      ? Math.round(filteredReports.reduce((acc, r) => acc + (r.waterLevel || 0), 0) / filteredReports.length) 
      : 0;

    return { ready, limited, off, total: filteredReports.length, avgFuel, avgWater };
  }, [filteredReports]);

  const latestReportsPerUnit = useMemo(() => {
    const latest: Record<string, InspectionData> = {};
    reports.forEach(report => {
      if (!latest[report.unitNumber] || new Date(report.timestamp) > new Date(latest[report.unitNumber].timestamp)) {
        latest[report.unitNumber] = report;
      }
    });
    return Object.values(latest);
  }, [reports]);

  const posStats = useMemo(() => {
    // Get unique locations from UNITS
    const locations = Array.from(new Set(UNITS.map(u => u.location)));
    
    return locations.map(loc => {
      // Find units belonging to this location
      const unitsAtPos = UNITS.filter(u => u.location === loc).map(u => u.name);
      
      // Filter the latest reports for these units
      const reportsAtPos = latestReportsPerUnit.filter(r => unitsAtPos.includes(r.unitNumber));
      
      if (reportsAtPos.length === 0) {
        return { name: loc, fuel: 0, water: 0, count: 0 };
      }
      
      const fuel = Math.round(reportsAtPos.reduce((acc, r) => acc + (r.fuelLevel || 0), 0) / reportsAtPos.length);
      const water = Math.round(reportsAtPos.reduce((acc, r) => acc + (r.waterLevel || 0), 0) / reportsAtPos.length);
      
      return { name: loc, fuel, water, count: reportsAtPos.length };
    });
  }, [latestReportsPerUnit]);

  const chartData = useMemo(() => {
    return [
      { name: 'Siaga', total: stats.ready, color: '#3b82f6' },
      { name: 'Terbatas', total: stats.limited, color: '#f59e0b' },
      { name: 'Rusak', total: stats.off, color: '#ef4444' },
    ];
  }, [stats]);

  const handleGetSummary = async () => {
    if (filteredReports.length === 0) return;
    setIsSummarizing(true);
    const text = await generateDailySummary(filteredReports, aiConfig.summaryInstruction);
    try {
      const parsed = JSON.parse(text);
      setSummaryData(parsed);
    } catch (e) {
      console.error("Failed to parse AI summary", e);
      setSummaryData({
        fleetSummary: text,
        unitPredictions: []
      });
    }
    setIsSummarizing(false);
  };

  const handleSaveConfig = () => {
    if (userRole !== 'admin') return;
    onUpdateAiConfig({
      draftInstruction: draftPrompt,
      summaryInstruction: summaryPrompt
    });
    alert('Struktur Prompt AI Telah Diperbarui!');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Date Filter Header - Tactical Control Bar */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-red-600/20 to-blue-600/20 rounded-[2.5rem] blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
        <div className="relative flex flex-col lg:flex-row items-center justify-between gap-6 bg-slate-900/80 backdrop-blur-2xl p-6 lg:p-8 rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden">
          {/* Analysis Engine Status Bar - Floating */}
          <div className="absolute top-4 right-8 hidden lg:flex items-center gap-3 z-20">
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Engine Online</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
              <Cloud size={10} className="text-blue-500" />
              <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Cloud Synced</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-500/10 border border-slate-500/20 rounded-full">
              <Wifi size={10} className="text-slate-500" />
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Live Feed</span>
            </div>
          </div>

          {/* Decorative Background Elements */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-red-600/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
          
          <div className="flex items-center gap-6 w-full lg:w-auto">
            <div className="relative">
              <div className="p-4 bg-red-600 rounded-2xl shadow-lg shadow-red-900/40 relative z-10">
                <Calendar className="text-white" size={24} />
              </div>
              <div className="absolute -inset-1 bg-red-600/20 rounded-2xl blur-sm animate-pulse"></div>
            </div>
            
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="flex h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
                <p className="text-[9px] font-black text-red-500 uppercase tracking-[0.2em] font-mono">Operational Archive</p>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight flex items-baseline gap-3">
                DATA: <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                  {new Date(selectedDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-slate-800 rounded-md border border-white/5">
                    <ClipboardCheck size={10} className="text-slate-400" />
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">{filteredReports.length} Laporan Terverifikasi</span>
                </div>
                <div className="h-1 w-1 rounded-full bg-slate-700"></div>
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-slate-800 rounded-md border border-white/5">
                    <History size={10} className="text-slate-400" />
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Status: Sinkron</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className="h-12 w-px bg-white/5 hidden lg:block"></div>
            
            <div className="relative w-full lg:w-64 group/input">
              <label className="absolute -top-2 left-4 px-2 bg-slate-900 text-[8px] font-black text-red-500 uppercase tracking-[0.2em] z-20">Pilih Tanggal</label>
              <div className="relative">
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-slate-950/50 border border-white/10 hover:border-red-500/50 text-white text-xs font-black uppercase tracking-[0.15em] px-6 py-4 rounded-2xl outline-none transition-all cursor-pointer appearance-none relative z-10 focus:ring-2 focus:ring-red-500/20"
                />
                <div className="absolute right-5 top-1/2 -translate-y-1/2 z-20 pointer-events-none text-slate-500 group-hover/input:text-red-500 transition-colors">
                  <ChevronDown size={18} />
                </div>
              </div>
            </div>

            <button 
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all active:scale-95 group/btn"
              title="Hari Ini"
            >
              <RefreshCw size={18} className="text-slate-400 group-hover/btn:text-white transition-colors" />
            </button>
          </div>
        </div>
      </div>

      {filteredReports.length === 0 && (
        <div className="kaca-teknis rounded-[2.5rem] p-12 border border-white/10 shadow-2xl text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-6 bg-slate-800/50 rounded-full border border-white/5">
              <History size={48} className="text-slate-600" />
            </div>
          </div>
          <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Tidak ada catatan data untuk tanggal ini</h3>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">Silakan pilih tanggal lain atau masukkan data baru</p>
        </div>
      )}

      {/* Top Row: Main Metrics & Analysis */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Fleet Health Overview (5/12) */}
        <div className="xl:col-span-5 kaca-teknis rounded-[2.5rem] p-8 border border-white/10 shadow-2xl relative overflow-hidden group neon-red-glow">
          <div className="absolute inset-0 corner-glow-tl pointer-events-none"></div>
          <div className="absolute inset-0 corner-glow-br pointer-events-none"></div>
          
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <CircularGauge value={stats.avgFuel} label="FUEL AVG" subLabel="BBM" color={stats.avgFuel < 30 ? 'red' : 'blue'} />
              <div className="text-center">
                <p className={`text-[10px] font-black uppercase tracking-widest ${stats.avgFuel < 30 ? 'text-red-500 animate-pulse' : 'text-blue-500'}`}>
                  {stats.avgFuel < 30 ? 'CRITICAL' : 'OPTIMAL'}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center space-y-4">
              <CircularGauge value={stats.avgWater} label="WATER AVG" subLabel="Air" color="blue" />
              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">OPTIMAL</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-6 border-t border-white/5">
            <div className="flex flex-col items-center p-3 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 group-hover:bg-emerald-500/10 transition-colors">
              <p className="text-[7px] font-black text-emerald-500/60 uppercase tracking-widest mb-1">SIAGA</p>
              <span className="text-xl font-black text-emerald-500 font-mono">{stats.ready}</span>
              <p className="text-[6px] font-bold text-slate-600 uppercase mt-1">UNIT READY</p>
            </div>
            <div className="flex flex-col items-center p-3 bg-yellow-500/5 rounded-2xl border border-yellow-500/10 group-hover:bg-yellow-500/10 transition-colors">
              <p className="text-[7px] font-black text-yellow-500/60 uppercase tracking-widest mb-1">TERBATAS</p>
              <span className="text-xl font-black text-yellow-500 font-mono">{stats.limited}</span>
              <p className="text-[6px] font-bold text-slate-600 uppercase mt-1">SIAGA OPS</p>
            </div>
            <div className="flex flex-col items-center p-3 bg-red-500/5 rounded-2xl border border-red-500/10 group-hover:bg-red-500/10 transition-colors">
              <p className="text-[7px] font-black text-red-500/60 uppercase tracking-widest mb-1">OFF SERVICE</p>
              <span className="text-xl font-black text-red-500 font-mono">{stats.off}</span>
              <p className="text-[6px] font-bold text-slate-600 uppercase mt-1">PERBAIKAN</p>
            </div>
          </div>
        </div>

        {/* AI Intelligence Report (7/12) */}
        <div className="xl:col-span-7 kaca-teknis rounded-[2.5rem] p-8 border border-white/10 shadow-2xl relative overflow-hidden group neon-red-glow">
          <div className="absolute inset-0 corner-glow-tl pointer-events-none"></div>
          <div className="absolute inset-0 corner-glow-br pointer-events-none"></div>
          
          <div className="flex flex-col h-full space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-600 rounded-xl shadow-lg shadow-red-900/40">
                  <BrainCircuit size={20} className="text-white" />
                </div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest italic">Laporan Intelijen AI</h3>
              </div>
              {isSummarizing && (
                <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                  <RefreshCw size={12} className="text-red-500 animate-spin" />
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Menganalisis...</span>
                </div>
              )}
            </div>

            <div className="flex-1 bg-white/5 rounded-[2rem] border border-white/5 p-6 overflow-y-auto max-h-[250px] no-scrollbar">
              {isSummarizing ? (
                <div className="space-y-4 animate-pulse">
                  <div className="h-4 bg-white/10 rounded w-3/4"></div>
                  <div className="h-4 bg-white/10 rounded w-full"></div>
                  <div className="h-4 bg-white/10 rounded w-5/6"></div>
                </div>
              ) : summaryData ? (
                <div className="space-y-4">
                  <p className="text-xs font-medium text-slate-300 leading-relaxed italic">
                    "{summaryData.fleetSummary}"
                  </p>
                  <div className="pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles size={14} className="text-red-500" />
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">Rekomendasi Strategis</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {summaryData.unitPredictions?.slice(0, 2).map((pred: any, i: number) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-red-500/5 rounded-xl border border-red-500/10">
                          <Zap size={12} className="text-red-500 mt-0.5" />
                          <p className="text-[10px] font-bold text-slate-400 leading-tight">
                            <span className="text-white">{pred.unit}:</span> {pred.prediction}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-30">
                  <BrainCircuit size={40} className="text-slate-500" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Menunggu Data Laporan...</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center">
                    <User size={12} className="text-slate-500" />
                  </div>
                ))}
                <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-red-600 flex items-center justify-center text-[8px] font-black text-white">
                  +AI
                </div>
              </div>
              <button 
                onClick={handleGetSummary}
                disabled={isSummarizing}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all active:scale-95"
              >
                <RefreshCw size={14} className={`text-slate-400 ${isSummarizing ? 'animate-spin' : ''}`} />
                <span className="text-[9px] font-black text-white uppercase tracking-widest">Refresh Analisis</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Predictive Analysis Row: 3 Units */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {UNITS.map((unit) => {
          const prediction = summaryData?.unitPredictions?.find(p => p.unit.includes(unit.id) || p.unit.includes(unit.name.split(' ')[1]));
          return (
            <div key={unit.id} className="kaca-teknis rounded-[2.5rem] p-6 border border-white/10 shadow-2xl relative overflow-hidden group neon-red-glow">
              <div className="absolute inset-0 corner-glow-tl pointer-events-none"></div>
              <div className="flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-800 rounded-xl border border-white/5">
                      <Flame size={18} className="text-red-500" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-widest">{unit.name}</h4>
                      <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{unit.location}</p>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-md border ${prediction?.risk > 70 ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'} text-[8px] font-black uppercase tracking-widest`}>
                    {prediction?.risk > 70 ? 'HIGH RISK' : 'STABLE'}
                  </div>
                </div>

                <div className="flex items-center justify-center py-4">
                  <RiskGauge value={prediction?.risk || 0} size="normal" />
                </div>

                <div className="bg-white/5 rounded-2xl p-4 border border-white/5 min-h-[80px] flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-2">
                    <BrainCircuit size={12} className="text-red-500" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Prediksi AI</span>
                  </div>
                  <p className="text-[10px] font-medium text-slate-300 leading-relaxed italic">
                    {isSummarizing ? 'Menganalisis...' : prediction?.prediction || 'Menunggu data laporan terbaru untuk analisis prediktif...'}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Middle Row: Data Per Pos */}
      <div className="kaca-teknis rounded-[2.5rem] p-8 border border-white/10 shadow-2xl relative overflow-hidden group neon-red-glow">
        <div className="absolute inset-0 corner-glow-tl pointer-events-none"></div>
        <div className="absolute inset-0 corner-glow-br pointer-events-none"></div>
        
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-black text-white uppercase tracking-tighter italic">DATA PER POS <span className="text-slate-500 font-bold text-xs ml-2">(RATA-RATA BBM & AIR)</span></h3>
          </div>
          <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">REAL-TIME DATA STREAMING</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {posStats.map((pos, idx) => (
            <PostCard key={idx} name={pos.name} fuel={pos.fuel} water={pos.water} />
          ))}
        </div>
      </div>

      {/* Live Activity Feed Row */}
      <div className="kaca-teknis rounded-[2.5rem] p-8 border border-white/10 shadow-2xl relative overflow-hidden group">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 rounded-2xl border border-emerald-500/20">
              <Activity className="text-emerald-500" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tighter italic">LIVE ACTIVITY FEED</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">INPUT PETUGAS TERBARU (SINKRONISASI CLOUD)</p>
            </div>
          </div>
          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">
            LAST SYNC: {lastUpdate.toLocaleTimeString()}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {reports.length > 0 ? (
            reports.slice(0, 4).map((report) => (
              <div key={report.id} className="p-4 bg-white/5 rounded-3xl border border-white/5 flex items-start gap-3 group hover:bg-white/10 transition-all">
                <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                  report.status === ReadinessStatus.SIAGA ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
                  report.status === ReadinessStatus.SIAGA_TERBATAS ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]' : 
                  'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-xs font-black text-white truncate uppercase tracking-tight">{report.unitNumber}</p>
                    <span className="text-[8px] text-slate-500 font-mono font-bold">{new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider truncate">{report.personnelName}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-8 text-center opacity-30">
              <Clock size={32} className="mx-auto mb-2 text-slate-600" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Menunggu Aktivitas Petugas...</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Operational Archive */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 corner-glow-tl opacity-50 pointer-events-none"></div>
        
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-red-600/10 rounded-2xl border border-red-500/20 shadow-inner">
            <History size={20} className="text-red-500" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">OPERATIONAL ARCHIVE</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">LOG AKTIVITAS: <span className="text-red-500">{filteredReports.length} LAPORAN TERDETEKSI</span></p>
          </div>
        </div>

        {/* Precise Header Row */}
        <div className="hidden lg:grid grid-cols-12 gap-4 px-5 mb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
          <div className="col-span-2 pl-7">Unit ID</div>
          <div className="col-span-2">Readiness Status</div>
          <div className="col-span-4">Observasi & Kendala</div>
          <div className="col-span-2">Instruksi Manual</div>
          <div className="col-span-2 text-right pr-4">Kirim</div>
        </div>

        <div className="space-y-3">
          {filteredReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 opacity-40">
              <ShieldCheck size={48} className="text-emerald-500" />
              <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-900">No Data Available</p>
            </div>
          ) : (
            filteredReports
              .sort((a, b) => {
                const statusOrder = { [ReadinessStatus.OFF_SERVICE]: 0, [ReadinessStatus.SIAGA_TERBATAS]: 1, [ReadinessStatus.SIAGA]: 2 };
                return (statusOrder[a.status as keyof typeof statusOrder] ?? 3) - (statusOrder[b.status as keyof typeof statusOrder] ?? 3);
              })
              .map(report => (
                <div key={report.id} className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center p-5 bg-slate-50 hover:bg-slate-100 rounded-3xl border border-slate-100 hover:border-slate-200 transition-all duration-300 group relative">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-transparent group-hover:bg-red-500 rounded-r-full transition-all"></div>
                  
                  {/* Unit Column */}
                  <div className="col-span-1 lg:col-span-2 flex items-center gap-4">
                    <div className="relative">
                      <div className={`w-3 h-3 rounded-full ${
                        report.status === ReadinessStatus.OFF_SERVICE ? 'bg-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.6)]' : 
                        report.status === ReadinessStatus.SIAGA_TERBATAS ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                      }`}></div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-base font-black text-slate-900 font-mono tracking-tighter">{report.unitNumber}</span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest lg:hidden">UNIT ID</span>
                    </div>
                  </div>

                  {/* Status Column */}
                  <div className="col-span-1 lg:col-span-2">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border w-fit ${
                        report.status === ReadinessStatus.OFF_SERVICE ? 'bg-red-500/10 border-red-500/20 text-red-500' : 
                        report.status === ReadinessStatus.SIAGA_TERBATAS ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' :
                        'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                      }`}>
                        {report.status}
                      </span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest lg:hidden">STATUS</span>
                    </div>
                  </div>

                  {/* Notes Column */}
                  <div className="col-span-1 lg:col-span-4">
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-medium text-slate-600 leading-relaxed line-clamp-1 group-hover:line-clamp-none transition-all">
                        {report.notes || 'Tinjau detail dan sinkronkan datanya'}
                      </p>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest lg:hidden">OBSERVASI</span>
                    </div>
                  </div>

                  {/* Manual Instruction Column */}
                  <div className="col-span-1 lg:col-span-2">
                    <div className="flex flex-col gap-1">
                      <input 
                        type="text"
                        placeholder="Ketik instruksi manual..."
                        value={manualInstructions[report.id] || ''}
                        onChange={(e) => setManualInstructions(prev => ({ ...prev, [report.id]: e.target.value }))}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] text-slate-900 placeholder:text-slate-400 focus:border-red-500/50 outline-none transition-all"
                      />
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest lg:hidden">INSTRUKSI MANUAL</span>
                    </div>
                  </div>

                  {/* Action Column */}
                  <div className="col-span-1 lg:col-span-2 flex justify-end">
                    <button 
                      onClick={() => {
                        const customInst = manualInstructions[report.id] || 'Mohon segera ditindaklanjuti dan dilaporkan kembali.';
                        const message = `*INSTRUKSI OPERASIONAL DAMKAR SELUMA*\n\n` +
                          `*Unit:* ${report.unitNumber}\n` +
                          `*Status:* ${report.status}\n` +
                          `*Kendala:* ${report.notes || 'Tinjau detail dan sinkronkan datanya'}\n\n` +
                          `*Instruksi:* ${customInst}`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
                      }}
                      className="w-full lg:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-emerald-500 text-slate-600 hover:text-white border border-slate-200 hover:border-emerald-400 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 shadow-lg"
                    >
                      <MessageSquare size={14} />
                      Kirim
                    </button>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* Admin Config - Still useful but hidden by default */}
      {userRole === 'admin' && (
        <div className="kaca border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden transition-all duration-500">
          <button 
            onClick={() => setIsAdminConfigOpen(!isAdminConfigOpen)}
            className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-red-950 rounded-xl border border-red-900/30 group-hover:scale-110 transition-transform">
                <BrainCircuit className="text-red-500" size={20} />
              </div>
              <div className="text-left">
                <h3 className="text-base font-black uppercase tracking-tight italic text-white">Konfigurasi Analisis AI</h3>
              </div>
            </div>
            {isAdminConfigOpen ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
          </button>
          {isAdminConfigOpen && (
            <div className="p-6 pt-0 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <PromptEditor label="Draf Message Engine" value={draftPrompt} onChange={setDraftPrompt} />
                <PromptEditor label="Summary Analysis Engine" value={summaryPrompt} onChange={setSummaryPrompt} />
              </div>
              <button onClick={handleSaveConfig} className="w-full bg-red-600 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition">
                Simpan Konfigurasi
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// New Helper Components
const CircularGauge = ({ value, label, subLabel, color }: any) => {
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const strokeColor = color === 'red' ? '#ef4444' : '#3b82f6';

  return (
    <div className="relative flex items-center justify-center w-32 h-32">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="64"
          cy="64"
          r={radius}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="8"
          fill="transparent"
        />
        <circle
          cx="64"
          cy="64"
          r={radius}
          stroke={strokeColor}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">{label}</p>
        <p className="text-2xl font-black text-white font-mono leading-none">{value}%</p>
        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">{subLabel}</p>
      </div>
    </div>
  );
};

const RiskGauge = ({ value, size = 'normal' }: { value: number, size?: 'normal' | 'large' }) => {
  const radius = size === 'large' ? 60 : 45;
  const strokeWidth = size === 'large' ? 12 : 8;
  const circumference = Math.PI * radius; // Half circle
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className={`relative flex items-center justify-center ${size === 'large' ? 'w-48 h-24' : 'w-36 h-18'} overflow-hidden`}>
      <svg className={`w-full h-full transform rotate-180`}>
        <defs>
          <linearGradient id="riskGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
        <circle
          cx={size === 'large' ? 96 : 72}
          cy={size === 'large' ? 96 : 72}
          r={radius}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
        />
        <circle
          cx={size === 'large' ? 96 : 72}
          cy={size === 'large' ? 96 : 72}
          r={radius}
          stroke="url(#riskGradient)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute bottom-0 flex flex-col items-center">
        <div className="flex justify-between w-full px-2 mb-1">
          <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">LOW</span>
          <span className="text-[8px] font-black text-red-500 uppercase tracking-widest">HIGH</span>
        </div>
        <div className="bg-slate-900 border border-white/10 px-4 py-1 rounded-full shadow-xl">
          <span className="text-[10px] font-black text-white uppercase tracking-widest">RISK</span>
        </div>
      </div>
    </div>
  );
};

const PostCard = ({ name, fuel, water }: any) => {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  
  return (
    <div className="bg-white/5 rounded-[2rem] border border-white/5 p-6 space-y-6 hover:bg-white/10 transition-all group relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4">
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></div>
      </div>
      
      <div className="space-y-1.5">
        <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] font-mono">{name}</h4>
        <div className="h-0.5 w-10 bg-red-500/40 rounded-full"></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-20 h-20">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="40" cy="40" r={radius} stroke="rgba(255,255,255,0.03)" strokeWidth="5" fill="transparent" />
              <circle 
                cx="40" cy="40" r={radius} 
                stroke="#ef4444" strokeWidth="5" 
                strokeDasharray={circumference} 
                strokeDashoffset={circumference - (fuel / 100) * circumference} 
                strokeLinecap="round" fill="transparent" 
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[13px] font-black text-white font-mono">{fuel}%</span>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">FUEL</span>
            <span className="text-[6px] font-bold text-slate-600 uppercase tracking-tighter">(BBM)</span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="relative w-20 h-20">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="40" cy="40" r={radius} stroke="rgba(255,255,255,0.03)" strokeWidth="5" fill="transparent" />
              <circle 
                cx="40" cy="40" r={radius} 
                stroke="#3b82f6" strokeWidth="5" 
                strokeDasharray={circumference} 
                strokeDashoffset={circumference - (water / 100) * circumference} 
                strokeLinecap="round" fill="transparent" 
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[13px] font-black text-white font-mono">{water}%</span>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">WATER</span>
            <span className="text-[6px] font-bold text-slate-600 uppercase tracking-tighter">(AIR)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Components
const PromptEditor = ({ label, value, onChange, placeholder }: any) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between px-2">
      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 italic">{label}</label>
      <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">System Prompt</span>
    </div>
    <textarea 
      className="w-full h-48 p-6 bg-slate-950 border border-slate-800 rounded-[2rem] font-medium text-xs text-slate-300 focus:border-red-600 focus:bg-slate-900 outline-none transition-all shadow-inner resize-none"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  </div>
);

export default Dashboard;
