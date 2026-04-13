
import React, { useState, useEffect } from 'react';
import { Save, AlertTriangle, ClipboardCheck, Send, CheckCircle2, MessageSquare, Copy, X, RefreshCw, User, Truck, FileText, ChevronDown, ShieldCheck, ShieldAlert } from 'lucide-react';
import { UNITS } from '../constants';
import { InspectionData, InspectionStatus, ReadinessStatus } from '../types';
import { generateDraftMessage } from '../services/geminiService';

interface Props {
  onSubmit: (data: InspectionData) => void;
  userRole?: 'admin' | 'petugas' | null;
}

const INITIAL_FORM_STATE = {
  personnelName: '',
  unitNumber: UNITS[0].name,
  odometer: 0,
  engineOilRadiator: InspectionStatus.AMAN,
  electricalLights: InspectionStatus.AMAN,
  sirenHorn: InspectionStatus.AMAN,
  tireCondition: InspectionStatus.AMAN,
  pumpPTO: InspectionStatus.AMAN,
  tankCondition: InspectionStatus.AMAN,
  hoseCondition: InspectionStatus.AMAN,
  nozzleCondition: InspectionStatus.AMAN,
  brakesCondition: InspectionStatus.AMAN,
  fuelLevel: 100,
  waterLevel: 100,
  notes: ''
};

const ChecklistForm: React.FC<Props> = ({ onSubmit, userRole }) => {
  const [formData, setFormData] = useState<Partial<InspectionData>>(() => {
    // Muat draf dari localStorage jika ada
    const savedDraft = localStorage.getItem('damkar_form_draft');
    if (savedDraft) {
      try {
        return JSON.parse(savedDraft);
      } catch (e) {
        return INITIAL_FORM_STATE;
      }
    }
    return INITIAL_FORM_STATE;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [aiDraft, setAiDraft] = useState<string>('');

  // Auto-save draf setiap kali formData berubah
  useEffect(() => {
    localStorage.setItem('damkar_form_draft', JSON.stringify(formData));
  }, [formData]);

  const calculateStatus = (data: Partial<InspectionData>): ReadinessStatus => {
    const criticalFails = [
      data.engineOilRadiator,
      data.brakesCondition,
      data.tireCondition
    ].filter(s => s === InspectionStatus.PERBAIKAN).length;

    const majorFails = [
      data.pumpPTO,
      data.tankCondition,
      data.electricalLights
    ].filter(s => s === InspectionStatus.PERBAIKAN).length;

    if (criticalFails > 0) return ReadinessStatus.OFF_SERVICE;
    if (majorFails > 0) return ReadinessStatus.SIAGA_TERBATAS;
    return ReadinessStatus.SIAGA;
  };

  const handleInputChange = (field: keyof InspectionData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleWhatsAppShare = (text: string) => {
    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  const formatDailyReport = (r: InspectionData) => {
    const unit = UNITS.find(u => u.name === r.unitNumber);
    const pos = unit ? unit.location : 'Pos Damkar Seluma';
    
    const date = new Date(r.timestamp);
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    const dayName = days[date.getDay()];
    const dateNum = date.getDate();
    const monthName = months[date.getMonth()];
    const year = date.getFullYear();
    
    const formattedDate = `${dayName}, ${dateNum} ${monthName} ${year}`;
    
    return `YUDHA BRAMA JAYA!
LAPORAN HARIAN KESIAPSIAGAAN ARMADA
PEMADAM KEBAKARAN KABUPATEN SELUMA
------------------------------------------
📅 Waktu: ${formattedDate}
🚛 Unit: ${r.unitNumber.toUpperCase()}
📍 Pos: ${pos}
------------------------------------------
🛑 STATUS OPERASIONAL: 🚒 ${r.status.toUpperCase()}
📟 Odometer: ${r.odometer} KM
------------------------------------------
⚙️ DATA TEKNIS KENDARAAN:
- Pompa PTO: ${r.pumpPTO}
- Sistem Rem: ${r.brakesCondition}
- Kapasitas Air: ${r.waterLevel}%
- Kapasitas BBM: ${r.fuelLevel}%
- Kelistrikan: ${r.electricalLights}
------------------------------------------
🛠️ INVENTARIS PERALATAN:
- Selang (Hose): ${r.hoseCondition}
- Nozzle: ${r.nozzleCondition}
------------------------------------------
📝 CATATAN TEKNIS:
${r.notes || 'Kondisi terpantau aman dan terkendali.'}
------------------------------------------
👤 Petugas Pelapor: ${r.personnelName}
------------------------------------------
"PANTANG PULANG SEBELUM PADAM"
Laporan dikirim via SI-CEKAT Mobile`;
  };

  const [submittedReport, setSubmittedReport] = useState<InspectionData | null>(null);

  // Prevent accidental reload/navigation when form is being filled
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const isDirty = JSON.stringify(formData) !== JSON.stringify(INITIAL_FORM_STATE);
      if (isDirty && !isSubmitting && !showSuccess) {
        e.preventDefault();
        e.returnValue = ''; 
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formData, isSubmitting, showSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.personnelName || formData.personnelName.trim() === '') {
      alert("Harap masukkan nama personel pelapor.");
      return;
    }
    
    setIsSubmitting(true);
    const finalStatus = calculateStatus(formData);
    
    const report: InspectionData = {
      ...formData as InspectionData,
      id: `REP-${Date.now()}`,
      timestamp: new Date().toISOString(),
      status: finalStatus,
      statusSync: 'synced'
    };

    setSubmittedReport(report);
    onSubmit(report);
    
    // Hapus draf setelah berhasil kirim
    localStorage.removeItem('damkar_form_draft');
    
    setIsSubmitting(false);
    setShowSuccess(true);
    
    setFormData(INITIAL_FORM_STATE);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 md:space-y-12 pb-32 md:pb-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {showSuccess && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[150] flex items-center justify-center p-4 md:p-6">
          <div className="bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 border border-white/10 neon-red-glow">
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-900 p-10 md:p-14 text-white text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl"></div>
              <div className="absolute top-6 right-6">
                <button onClick={() => setShowSuccess(false)} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-md border border-white/10"><X size={24} /></button>
              </div>
              <div className="relative z-10">
                <div className="w-20 h-20 md:w-28 md:h-28 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 md:mb-8 backdrop-blur-md border border-white/30 rotate-12">
                  <CheckCircle2 size={56} className="text-white" />
                </div>
                <h3 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-none mb-3 md:mb-4">Data Terverifikasi</h3>
                <p className="text-emerald-100 text-[9px] md:text-[11px] font-black uppercase tracking-[0.5em] opacity-80">Laporan Operasional Berhasil Diarsipkan</p>
              </div>
            </div>
            
            <div className="p-10 md:p-14 space-y-8 md:space-y-10">
              {submittedReport && (
                <div className="bg-white/5 p-8 md:p-10 rounded-[2.5rem] border border-white/10 space-y-6 md:space-y-8 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-slate-400 font-black text-[9px] md:text-[11px] uppercase tracking-widest">
                      <FileText size={16} className="text-emerald-500" /> Report Preview
                    </div>
                    <span className="text-[8px] md:text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20 uppercase tracking-widest">Encrypted & Synced</span>
                  </div>
                  <div className="bg-slate-950 p-6 md:p-8 rounded-2xl border border-white/5 shadow-inner max-h-[200px] overflow-y-auto scrollbar-hide">
                    <pre className="text-[9px] md:text-[11px] font-mono text-slate-400 whitespace-pre-wrap leading-relaxed">
                      {formatDailyReport(submittedReport)}
                    </pre>
                  </div>
                  <div className="grid grid-cols-2 gap-4 md:gap-6">
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(formatDailyReport(submittedReport));
                        alert('Laporan disalin ke clipboard!');
                      }} 
                      className="bg-white/5 text-white py-5 md:py-6 rounded-2xl font-black text-[9px] md:text-[11px] uppercase flex items-center justify-center gap-3 hover:bg-white/10 transition-all active:scale-95 border border-white/10"
                    >
                      <Copy size={18} /> Salin Teks
                    </button>
                    <button 
                      onClick={() => handleWhatsAppShare(formatDailyReport(submittedReport))}
                      className="bg-emerald-600 text-white py-5 md:py-6 rounded-2xl font-black text-[9px] md:text-[11px] uppercase flex items-center justify-center gap-3 hover:bg-emerald-700 transition-all active:scale-95 shadow-xl shadow-emerald-900/20"
                    >
                      <Send size={18} /> WhatsApp
                    </button>
                  </div>
                </div>
              )}
              
              <button 
                onClick={() => setShowSuccess(false)} 
                className="w-full bg-white/5 text-slate-400 py-6 md:py-8 rounded-2xl font-black text-[11px] md:text-xs uppercase tracking-[0.3em] hover:bg-white/10 hover:text-white transition-all active:scale-95 border border-white/5"
              >
                Kembali ke Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="kaca-teknis rounded-[3rem] shadow-2xl overflow-hidden group border border-white/10 neon-red-glow relative">
        <div className="absolute inset-0 corner-glow-tl pointer-events-none"></div>
        <div className="absolute inset-0 corner-glow-br pointer-events-none"></div>
        <div className="p-10 md:p-16 text-white relative overflow-hidden border-b border-white/10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-[120px] -mr-48 -mt-48 pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex items-center gap-6 md:gap-8">
              <div className="p-4 md:p-6 bg-red-600 rounded-[2rem] shadow-2xl shadow-red-900/40 rotate-3 group-hover:rotate-0 transition-transform duration-500">
                <ClipboardCheck size={48} className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.5em] text-red-500">Operational Entry</span>
                  <div className="h-px w-12 bg-red-500/30"></div>
                </div>
                <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-none text-white">Input Armada</h2>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="px-5 py-2.5 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
                <p className="text-[10px] md:text-[12px] font-black text-slate-400 uppercase tracking-widest">Damkar Seluma</p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-10 md:p-16 space-y-12 md:space-y-20 bg-slate-900/20 backdrop-blur-xl">
          {/* Section: Identitas */}
          <div className="space-y-8 md:space-y-12">
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-red-500 font-black italic">01</div>
              <h3 className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.5em] text-slate-400 italic">Identitas Pelaporan</h3>
              <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
              <div className="space-y-4 md:space-y-5">
                <label className="flex items-center gap-3 text-[9px] md:text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1"><User size={14} className="text-red-500"/> Nama Personel Pelapor</label>
                <input 
                  type="text"
                  placeholder="Masukkan Nama Lengkap..."
                  className="w-full p-5 md:p-7 bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl font-bold text-xs md:text-sm text-white placeholder:text-slate-700 focus:border-red-600 focus:bg-white/10 outline-none transition-all shadow-inner"
                  value={formData.personnelName}
                  onChange={(e) => handleInputChange('personnelName', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-4 md:space-y-5">
                <label className="flex items-center gap-3 text-[9px] md:text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1"><Truck size={14} className="text-red-500"/> Pilih Unit Armada</label>
                <div className="relative">
                  <select 
                    className="w-full p-5 md:p-7 bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl font-bold text-xs md:text-sm text-white focus:border-red-600 focus:bg-white/10 outline-none transition-all cursor-pointer shadow-inner appearance-none"
                    value={formData.unitNumber}
                    onChange={(e) => handleInputChange('unitNumber', e.target.value)}
                  >
                    {UNITS.map(unit => <option key={unit.id} value={unit.name} className="bg-slate-900 text-white">{unit.name.toUpperCase()}</option>)}
                  </select>
                  <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600">
                    <ChevronDown size={20} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Teknis */}
          <div className="space-y-8 md:space-y-12">
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-red-500 font-black italic">02</div>
              <h3 className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.5em] text-slate-400 italic">Data Teknis Armada</h3>
              <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
              <div className="space-y-4 md:space-y-5">
                <label className="text-[9px] md:text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Odometer Reading (KM)</label>
                <input 
                  type="number" 
                  className="w-full p-5 md:p-7 bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl font-black font-mono text-xs md:text-sm text-white focus:border-red-600 focus:bg-white/10 outline-none transition-all shadow-inner"
                  value={formData.odometer}
                  onChange={(e) => handleInputChange('odometer', parseInt(e.target.value))}
                  required
                />
              </div>
              <div className="space-y-4 md:space-y-5">
                <div className="flex justify-between items-center px-2">
                  <label className="text-[9px] md:text-[11px] font-black text-slate-500 uppercase tracking-widest">Kapasitas BBM</label>
                  <span className={`text-xl md:text-3xl font-black italic tracking-tighter font-mono ${formData.fuelLevel! < 30 ? 'text-red-500' : 'text-white'}`}>{formData.fuelLevel}%</span>
                </div>
                <div className="flex items-center gap-6 p-6 md:p-8 bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 shadow-inner">
                  <input 
                    type="range" 
                    min="0" max="100" 
                    className="flex-1 accent-red-600 cursor-pointer h-2 bg-white/10 rounded-full appearance-none"
                    value={formData.fuelLevel}
                    onChange={(e) => handleInputChange('fuelLevel', parseInt(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
              <div className="space-y-4 md:space-y-5">
                <div className="flex justify-between items-center px-2">
                  <label className="text-[9px] md:text-[11px] font-black text-slate-500 uppercase tracking-widest">Kapasitas Air Tangki</label>
                  <span className={`text-xl md:text-3xl font-black italic tracking-tighter font-mono ${formData.waterLevel! < 50 ? 'text-blue-500' : 'text-white'}`}>{formData.waterLevel}%</span>
                </div>
                <div className="flex items-center gap-6 p-6 md:p-8 bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 shadow-inner">
                  <input 
                    type="range" 
                    min="0" max="100" 
                    className="flex-1 accent-blue-600 cursor-pointer h-2 bg-white/10 rounded-full appearance-none"
                    value={formData.waterLevel}
                    onChange={(e) => handleInputChange('waterLevel', parseInt(e.target.value))}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Checklist */}
          <div className="space-y-8 md:space-y-12">
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-red-500 font-black italic">03</div>
              <h3 className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.5em] text-slate-400 italic">Verifikasi Sistem & Inventaris</h3>
              <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
              <CheckItem label="Oli & Radiator" field="engineOilRadiator" value={formData.engineOilRadiator!} onChange={handleInputChange} />
              <CheckItem label="Lampu & Rotator" field="electricalLights" value={formData.electricalLights!} onChange={handleInputChange} />
              <CheckItem label="Sirine & Klakson" field="sirenHorn" value={formData.sirenHorn!} onChange={handleInputChange} />
              <CheckItem label="Ban & Roda" field="tireCondition" value={formData.tireCondition!} onChange={handleInputChange} />
              <CheckItem label="Pompa & PTO" field="pumpPTO" value={formData.pumpPTO!} onChange={handleInputChange} />
              <CheckItem label="Tangki Air" field="tankCondition" value={formData.tankCondition!} onChange={handleInputChange} />
              <CheckItem label="Selang (Hose)" field="hoseCondition" value={formData.hoseCondition!} onChange={handleInputChange} />
              <CheckItem label="Nozzle" field="nozzleCondition" value={formData.nozzleCondition!} onChange={handleInputChange} />
              <CheckItem label="Sistem Rem" field="brakesCondition" value={formData.brakesCondition!} onChange={handleInputChange} />
            </div>
          </div>

          {/* Section: Notes */}
          <div className="space-y-5 md:space-y-6">
            <label className="text-[10px] md:text-[12px] font-black text-slate-500 uppercase tracking-widest ml-1">Catatan Teknis Tambahan</label>
            <textarea 
              className="w-full p-8 md:p-10 bg-white/5 backdrop-blur-sm border border-white/10 rounded-[2.5rem] font-medium text-xs md:text-sm text-white placeholder:text-slate-700 focus:border-red-600 focus:bg-white/10 outline-none transition-all h-40 md:h-56 shadow-inner resize-none"
              placeholder="Deskripsikan kondisi teknis lainnya secara mendetail..."
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
            />
          </div>

          <div className="pt-8 md:pt-12">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-red-600 text-white py-8 md:py-10 rounded-[2.5rem] font-black text-xs md:text-sm uppercase tracking-[0.4em] shadow-2xl shadow-red-900/40 hover:bg-red-700 active:scale-[0.98] transition-all flex items-center justify-center gap-4 md:gap-6 disabled:opacity-50 group"
            >
              {isSubmitting ? <RefreshCw className="animate-spin" size={24} /> : <Save size={24} className="group-hover:scale-125 transition-transform duration-500" />}
              {isSubmitting ? 'Processing Data...' : 'Finalisasi & Simpan Laporan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CheckItem = ({ label, field, value, onChange }: any) => (
  <div className="space-y-3 group">
    <div className="flex items-center justify-between px-1">
      <label className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{label}</label>
      <div className={`w-1.5 h-1.5 rounded-full ${value === InspectionStatus.AMAN ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse'}`}></div>
    </div>
    <div className="flex bg-slate-950/50 backdrop-blur-sm p-1.5 rounded-2xl border border-white/10 shadow-inner">
      <button 
        type="button"
        onClick={() => onChange(field, InspectionStatus.AMAN)}
        className={`flex-1 py-3 md:py-4 rounded-xl text-[9px] md:text-[10px] font-black uppercase transition-all duration-500 flex items-center justify-center gap-2 ${value === InspectionStatus.AMAN ? 'bg-emerald-600 text-white shadow-lg scale-[1.02] neon-emerald-glow' : 'text-slate-600 hover:bg-white/5 hover:text-slate-400'}`}
      >
        <ShieldCheck size={14} className={value === InspectionStatus.AMAN ? 'opacity-100' : 'opacity-30'} />
        Aman
      </button>
      <button 
        type="button"
        onClick={() => onChange(field, InspectionStatus.PERBAIKAN)}
        className={`flex-1 py-3 md:py-4 rounded-xl text-[9px] md:text-[10px] font-black uppercase transition-all duration-500 flex items-center justify-center gap-2 ${value === InspectionStatus.PERBAIKAN ? 'bg-red-600 text-white shadow-lg scale-[1.02] neon-red-glow' : 'text-slate-600 hover:bg-white/5 hover:text-slate-400'}`}
      >
        <ShieldAlert size={14} className={value === InspectionStatus.PERBAIKAN ? 'opacity-100' : 'opacity-30'} />
        Rusak
      </button>
    </div>
  </div>
);

export default ChecklistForm;
