
import React from 'react';
import { Shield, CheckCircle2, XCircle, Lock, Unlock, UserCheck, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

const SecurityAuthority: React.FC = () => {
  const adminPermissions = [
    { label: 'Dashboard Monitoring (Full)', allowed: true },
    { label: 'Input Laporan Armada', allowed: true },
    { label: 'Arsip Data (View & Export)', allowed: true },
    { label: 'Hapus Laporan Individual', allowed: true },
    { label: 'Reset Seluruh Riwayat', allowed: true },
    { label: 'Konfigurasi Prompt AI', allowed: true },
    { label: 'Analisis Prediktif AI', allowed: true },
    { label: 'Sinkronisasi Real-time', allowed: true },
  ];

  const petugasPermissions = [
    { label: 'Dashboard Monitoring (Limited)', allowed: true },
    { label: 'Input Laporan Armada', allowed: true },
    { label: 'Arsip Data (View & Export)', allowed: true },
    { label: 'Hapus Laporan Individual', allowed: false },
    { label: 'Reset Seluruh Riwayat', allowed: false },
    { label: 'Konfigurasi Prompt AI', allowed: false },
    { label: 'Analisis Prediktif AI', allowed: true },
    { label: 'Sinkronisasi Real-time', allowed: true },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
      {/* Admin Authority */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="kaca-teknis rounded-[2.5rem] p-8 border border-red-500/20 shadow-2xl relative overflow-hidden group neon-red-glow"
      >
        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
          <Shield size={120} className="text-red-500" />
        </div>
        
        <div className="relative z-10 space-y-8">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-red-600 rounded-2xl shadow-lg shadow-red-900/40">
              <ShieldAlert size={24} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="flex h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse"></span>
                <p className="text-[9px] font-black text-red-500 uppercase tracking-[0.3em] font-mono">Level: 01</p>
              </div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">ADMINISTRATOR</h3>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">Otoritas & Izin Akses</p>
            <div className="grid grid-cols-1 gap-3">
              {adminPermissions.map((perm, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-tight">{perm.label}</span>
                  {perm.allowed ? (
                    <div className="flex items-center gap-2 text-emerald-500">
                      <Unlock size={14} />
                      <span className="text-[9px] font-black">GRANTED</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-500">
                      <Lock size={14} />
                      <span className="text-[9px] font-black">DENIED</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl">
              <p className="text-[10px] font-medium text-red-200 leading-relaxed italic">
                "Akses penuh ke seluruh infrastruktur data SI-CEKAT, termasuk manajemen riwayat dan optimasi mesin AI."
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Petugas Authority */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="kaca-teknis rounded-[2.5rem] p-8 border border-blue-500/20 shadow-2xl relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
          <UserCheck size={120} className="text-blue-500" />
        </div>

        <div className="relative z-10 space-y-8">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-blue-600 rounded-2xl shadow-lg shadow-blue-900/40">
              <UserCheck size={24} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="flex h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.3em] font-mono">Level: 02</p>
              </div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">PETUGAS LAPANGAN</h3>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">Otoritas & Izin Akses</p>
            <div className="grid grid-cols-1 gap-3">
              {petugasPermissions.map((perm, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-tight">{perm.label}</span>
                  {perm.allowed ? (
                    <div className="flex items-center gap-2 text-emerald-500">
                      <Unlock size={14} />
                      <span className="text-[9px] font-black">GRANTED</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Lock size={14} />
                      <span className="text-[9px] font-black">RESTRICTED</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl">
              <p className="text-[10px] font-medium text-blue-200 leading-relaxed italic">
                "Otoritas operasional untuk input data harian dan monitoring status kesiapan armada secara real-time."
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SecurityAuthority;
