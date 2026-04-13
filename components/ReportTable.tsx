
import React, { useState, useMemo } from 'react';
import { Search, Download, Eye, Trash2, RotateCcw, X, CheckCircle2, AlertTriangle, ShieldAlert, Truck, Database, User, Calendar, Gauge, Droplets, MessageSquare, Copy, Send, FileText, FilterX, Clock, LayoutGrid, Table as TableIcon } from 'lucide-react';
import { InspectionData, ReadinessStatus, InspectionStatus } from '../types';
import { UNITS } from '../constants';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  reports: InspectionData[];
  userRole?: 'admin' | 'petugas' | null;
  onDelete?: (id: string) => void;
  onReset?: () => void;
}

const ReportTable: React.FC<Props> = ({ reports, userRole, onDelete, onReset }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReadinessStatus | 'ALL'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedReport, setSelectedReport] = useState<InspectionData | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState('');
  const CONFIRM_KEYWORD = 'SELUMA';

  const filtered = useMemo(() => {
    return reports
      .filter(r => {
        const matchesSearch = 
          r.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.personnelName.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
        
        // Robust date comparison using local date strings (YYYY-MM-DD)
        const d = new Date(r.timestamp);
        const reportDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        
        let matchesDate = true;
        if (startDate && reportDateStr < startDate) matchesDate = false;
        if (endDate && reportDateStr > endDate) matchesDate = false;
        
        return matchesSearch && matchesStatus && matchesDate;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [reports, searchTerm, statusFilter, startDate, endDate]);

  const handleResetAction = () => {
    if (userRole !== 'admin') return;
    if (resetConfirmInput === CONFIRM_KEYWORD) {
      onReset?.();
      setIsResetModalOpen(false);
      setResetConfirmInput('');
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setStartDate('');
    setEndDate('');
  };

  const clearDateFilter = () => {
    setStartDate('');
    setEndDate('');
  };

  const handleCopyDraft = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Laporan berhasil disalin!');
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

  const exportToCSV = () => {
    if (reports.length === 0) return;
    const headers = ["Waktu", "Personel", "Status"];
    const rows = filtered.map(r => {
      let statusText = "";
      if (r.status === ReadinessStatus.SIAGA) {
        statusText = "Aman (Siaga)";
      } else {
        const repairs = [];
        if (r.engineOilRadiator === InspectionStatus.PERBAIKAN) repairs.push("Oli & Radiator");
        if (r.electricalLights === InspectionStatus.PERBAIKAN) repairs.push("Listrik & Lampu");
        if (r.sirenHorn === InspectionStatus.PERBAIKAN) repairs.push("Sirine & Klakson");
        if (r.tireCondition === InspectionStatus.PERBAIKAN) repairs.push("Ban & Roda");
        if (r.pumpPTO === InspectionStatus.PERBAIKAN) repairs.push("Pompa & PTO");
        if (r.tankCondition === InspectionStatus.PERBAIKAN) repairs.push("Tangki Air");
        if (r.hoseCondition === InspectionStatus.PERBAIKAN) repairs.push("Selang (Hose)");
        if (r.nozzleCondition === InspectionStatus.PERBAIKAN) repairs.push("Nozzle");
        if (r.brakesCondition === InspectionStatus.PERBAIKAN) repairs.push("Sistem Rem");
        
        statusText = `Butuh Perbaikan${repairs.length > 0 ? ` (${repairs.join(", ")})` : ""}`;
      }

      return [
        `"${new Date(r.timestamp).toLocaleString('id-ID').replace(/"/g, '""')}"`,
        `"${r.personnelName.replace(/"/g, '""')}"`,
        `"${statusText.replace(/"/g, '""')}"`
      ];
    });
    const csvContent = [headers.map(h => `"${h}"`), ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `arsip_damkar_seluma_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    if (filtered.length === 0) return;
    
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(192, 0, 0); // Merah Damkar
    doc.text('SI-CEKAT - Damkar Kabupaten Seluma', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Arsip Laporan Operasional`, 14, 30);
    doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')} WIB`, 14, 35);
    
    const tableColumn = ["ID", "Waktu", "Unit", "Personel", "Status", "BBM", "Air", "Odo"];
    const tableRows = filtered.map(r => [
      r.id.substring(0, 8),
      new Date(r.timestamp).toLocaleString('id-ID'),
      r.unitNumber,
      r.personnelName,
      r.status.split(' ')[0], // Shorten status
      `${r.fuelLevel}%`,
      `${r.waterLevel}%`,
      r.odometer
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      theme: 'grid',
      headStyles: { fillColor: [192, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3 },
      alternateRowStyles: { fillColor: [250, 250, 250] },
    });

    doc.save(`arsip_damkar_seluma_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {/* Reset Modal - Admin Only */}
      {isResetModalOpen && userRole === 'admin' && (
        <div className="fixed inset-0 bg-red-950/90 backdrop-blur-xl flex items-center justify-center p-4 z-[200]">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border-4 border-red-50">
            <div className="bg-red-600 p-10 text-white text-center">
              <ShieldAlert size={64} className="mx-auto mb-4 animate-bounce" />
              <h3 className="text-2xl font-black uppercase italic">Tindakan Kritis</h3>
              <p className="text-red-100 text-[10px] font-bold uppercase tracking-widest mt-2">Penghapusan Seluruh Database</p>
            </div>
            <div className="p-10 space-y-8">
              <input 
                type="text" 
                placeholder={`Ketik "${CONFIRM_KEYWORD}"`}
                className="w-full py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none text-center font-black tracking-[0.5em] text-red-600 uppercase"
                value={resetConfirmInput}
                onChange={(e) => setResetConfirmInput(e.target.value.toUpperCase())}
              />
              <div className="flex flex-col gap-3">
                <button onClick={handleResetAction} disabled={resetConfirmInput !== CONFIRM_KEYWORD} className="w-full bg-red-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-20">HAPUS PERMANEN</button>
                <button onClick={() => setIsResetModalOpen(false)} className="w-full bg-slate-100 text-slate-600 py-5 rounded-2xl font-black text-xs uppercase tracking-widest">BATAL</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail View Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col scale-100 animate-in zoom-in-95">
            <div className="bg-slate-900 p-8 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-red-600 rounded-2xl shadow-lg">
                  <Truck size={32} />
                </div>
                <div>
                  <h3 className="font-black text-2xl uppercase italic tracking-tighter">Laporan Unit {selectedReport.unitNumber}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                    <Calendar size={12} /> {new Date(selectedReport.timestamp).toLocaleString('id-ID')} WIB
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedReport(null)} className="p-3 hover:bg-white/10 rounded-full transition-all bg-white/5"><X size={28} /></button>
            </div>
            
            <div className="p-10 overflow-y-auto space-y-10 bg-slate-50/50 backdrop-blur-md scrollbar-hide">
               <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
                 <DetailBadge icon={<User size={16}/>} label="Personel Pelapor" value={selectedReport.personnelName} />
                 <DetailBadge icon={<Gauge size={16}/>} label="Odometer" value={`${selectedReport.odometer} KM`} />
                 <DetailBadge icon={<Droplets size={16}/>} label="Level BBM" value={`${selectedReport.fuelLevel}%`} />
                 <DetailBadge icon={<Droplets size={16}/>} label="Kapasitas Air" value={`${selectedReport.waterLevel}%`} />
                 <DetailBadge icon={<ShieldAlert size={16}/>} label="Status Kesiapan" value={selectedReport.status} isStatus />
               </div>

               <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                    <Database size={14} className="text-red-600" /> Hasil Pemeriksaan Teknis
                  </h4>
                  <div className="kaca p-8 rounded-2xl border border-white/40 shadow-xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8">
                      <TechnicalItem label="Oli & Radiator" status={selectedReport.engineOilRadiator} />
                      <TechnicalItem label="Lampu & Rotator" status={selectedReport.electricalLights} />
                      <TechnicalItem label="Sirine & Klakson" status={selectedReport.sirenHorn} />
                      <TechnicalItem label="Ban & Roda" status={selectedReport.tireCondition} />
                      <TechnicalItem label="Pompa & PTO" status={selectedReport.pumpPTO} />
                      <TechnicalItem label="Tangki Air" status={selectedReport.tankCondition} />
                      <TechnicalItem label="Selang (Hose)" status={selectedReport.hoseCondition} />
                      <TechnicalItem label="Nozzle" status={selectedReport.nozzleCondition} />
                      <TechnicalItem label="Sistem Rem" status={selectedReport.brakesCondition} />
                  </div>
               </div>

               <div className="kaca p-8 rounded-2xl border border-white/40 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <FileText size={80} />
                  </div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Catatan Operasional</h4>
                  <p className="text-sm text-slate-700 font-medium leading-relaxed italic">
                    "{selectedReport.notes || 'Seluruh sistem dilaporkan dalam kondisi standar operasional.'}"
                  </p>
               </div>

                <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-2">
                      <FileText size={14} /> Laporan Harian Armada
                    </h4>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleCopyDraft(formatDailyReport(selectedReport))} 
                        className="p-2 text-slate-400 hover:text-white transition-all"
                        title="Salin Laporan"
                      >
                        <Copy size={18} />
                      </button>
                      <button 
                        onClick={() => handleWhatsAppShare(formatDailyReport(selectedReport))}
                        className="p-2 text-slate-400 hover:text-[#25D366] transition-all"
                        title="Kirim ke WhatsApp"
                      >
                        <Send size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50">
                    <pre className="text-[10px] text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                      {formatDailyReport(selectedReport)}
                    </pre>
                  </div>
                </div>
            </div>
            
            <div className="p-6 bg-white border-t border-slate-100 shrink-0">
              <button onClick={() => setSelectedReport(null)} className="w-full bg-slate-100 text-slate-900 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Tutup Detail</button>
            </div>
          </div>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col gap-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
             <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Arsip Laporan</h2>
             <div className="flex items-center gap-3 mt-2">
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 <Database size={12} className="text-red-600" /> Basis Data Operasional Damkar Seluma
               </p>
               <div className="h-1 w-1 bg-slate-300 rounded-full"></div>
               <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                 <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></div>
                 <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Backup Lokal Aktif</span>
               </div>
             </div>
          </div>
          {userRole === 'admin' && (
            <button onClick={() => setIsResetModalOpen(true)} className="bg-red-600 text-white px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-red-200 hover:bg-red-700 transition-all flex items-center gap-3 active:scale-95">
              <RotateCcw size={18} /> Reset Database
            </button>
          )}
        </div>

        {/* Filter Section */}
        <div className="space-y-4 md:space-y-6 bg-white p-5 md:p-8 rounded-2xl border border-slate-200 shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4">
            <div className="md:col-span-7 relative group">
              <Search className="absolute left-5 md:left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-600 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Cari Unit atau Nama Personel..."
                className="w-full pl-14 md:pl-16 pr-5 md:pr-6 py-4 md:py-5 bg-slate-50 border border-slate-200 rounded-2xl font-black text-[10px] md:text-sm text-slate-900 outline-none focus:border-red-600 focus:bg-white transition-all shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="md:col-span-5 flex gap-2 md:gap-3">
              <button onClick={exportToCSV} className="flex-1 bg-slate-50 text-slate-600 rounded-2xl font-black text-[8px] md:text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 md:gap-2 hover:bg-slate-100 transition-all border border-slate-200 shadow-sm active:scale-95">
                <Download size={16} /> CSV
              </button>
              <button onClick={exportToPDF} className="flex-1 bg-slate-900 text-white rounded-2xl font-black text-[8px] md:text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 md:gap-2 hover:bg-slate-800 transition-all shadow-xl active:scale-95">
                <FileText size={16} /> PDF
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 items-end">
            <div className="col-span-1 lg:col-span-2 space-y-1.5 md:space-y-2">
              <label className="text-[7px] md:text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-3 md:ml-4">Dari</label>
              <div className="relative">
                <Calendar className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                <input 
                  type="date" 
                  className="w-full pl-10 md:pl-14 pr-3 md:pr-4 py-3 md:py-4 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl font-black text-[9px] md:text-[11px] text-slate-900 outline-none focus:border-red-600 focus:bg-white transition-all uppercase shadow-sm"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={endDate || undefined}
                />
              </div>
            </div>
            <div className="col-span-1 lg:col-span-2 space-y-1.5 md:space-y-2">
              <label className="text-[7px] md:text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-3 md:ml-4">Sampai</label>
              <div className="relative">
                <Calendar className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                <input 
                  type="date" 
                  className="w-full pl-10 md:pl-14 pr-3 md:pr-4 py-3 md:py-4 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl font-black text-[9px] md:text-[11px] text-slate-900 outline-none focus:border-red-600 focus:bg-white transition-all uppercase shadow-sm"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || undefined}
                />
              </div>
            </div>
            {(startDate || endDate || searchTerm || statusFilter !== 'ALL') && (
              <button 
                onClick={resetFilters}
                className="col-span-2 lg:col-span-1 h-[44px] md:h-[56px] bg-red-50 text-red-600 rounded-xl md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 md:gap-2 hover:bg-red-100 transition-all border border-red-100"
              >
                <FilterX size={16} /> Reset
              </button>
            )}
          </div>
        </div>

        {/* Status Quick Filter */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 flex-1">
             <FilterBtn label="Semua Data" active={statusFilter === 'ALL'} onClick={() => setStatusFilter('ALL')} />
             <FilterBtn label="Unit Siaga" active={statusFilter === ReadinessStatus.SIAGA} onClick={() => setStatusFilter(ReadinessStatus.SIAGA)} count={reports.filter(r => r.status === ReadinessStatus.SIAGA).length} />
             <FilterBtn label="Terbatas" active={statusFilter === ReadinessStatus.SIAGA_TERBATAS} onClick={() => setStatusFilter(ReadinessStatus.SIAGA_TERBATAS)} count={reports.filter(r => r.status === ReadinessStatus.SIAGA_TERBATAS).length} />
             <FilterBtn label="Off-Service" active={statusFilter === ReadinessStatus.OFF_SERVICE} onClick={() => setStatusFilter(ReadinessStatus.OFF_SERVICE)} count={reports.filter(r => r.status === ReadinessStatus.OFF_SERVICE).length} />
          </div>
          
          <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
            <button 
              onClick={() => setViewMode('card')}
              className={`p-2.5 rounded-xl transition-all flex items-center gap-2 ${viewMode === 'card' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
              title="Tampilan Kartu"
            >
              <LayoutGrid size={18} />
              <span className="text-[9px] font-black uppercase tracking-widest pr-1">Kartu</span>
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={`p-2.5 rounded-xl transition-all flex items-center gap-2 ${viewMode === 'table' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
              title="Tampilan Tabel"
            >
              <TableIcon size={18} />
              <span className="text-[9px] font-black uppercase tracking-widest pr-1">Tabel</span>
            </button>
          </div>
        </div>

        {/* Reports Content */}
        {viewMode === 'table' ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit</th>
                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Waktu</th>
                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Personel</th>
                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(r => (
                    <tr 
                      key={r.id} 
                      className="hover:bg-slate-50 transition-colors group cursor-pointer"
                      onClick={() => setSelectedReport(r)}
                    >
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            r.status === ReadinessStatus.SIAGA ? 'bg-emerald-50 text-emerald-600' : 
                            r.status === ReadinessStatus.SIAGA_TERBATAS ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                          }`}>
                            <Truck size={16} />
                          </div>
                          <span className="font-black italic text-slate-900 uppercase">{r.unitNumber}</span>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-700">{new Date(r.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                          <p className="text-[9px] font-black text-slate-400 uppercase">{new Date(r.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</p>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-slate-300" />
                          <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{r.personnelName}</span>
                        </div>
                      </td>
                      <td className="p-6">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                          r.status === ReadinessStatus.SIAGA ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                          r.status === ReadinessStatus.SIAGA_TERBATAS ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                        }`}>
                          {r.status.split(' ')[0]}
                        </span>
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedReport(r); }}
                            className="p-2 text-slate-400 hover:text-slate-900 transition-all"
                            title="Lihat Detail"
                          >
                            <Eye size={18} />
                          </button>
                          {userRole === 'admin' && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); onDelete?.(r.id); }}
                              className="p-2 text-slate-400 hover:text-rose-600 transition-all"
                              title="Hapus"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map(r => (
              <div 
                key={r.id} 
                onClick={() => setSelectedReport(r)}
                className="group bg-white rounded-2xl border border-slate-200 p-8 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer relative overflow-hidden"
              >
                {/* Status Indicator Bar */}
                <div className={`absolute top-0 left-0 right-0 h-2.5 ${
                  r.status === ReadinessStatus.SIAGA ? 'bg-emerald-500' : 
                  r.status === ReadinessStatus.SIAGA_TERBATAS ? 'bg-amber-500' : 'bg-rose-600'
                }`}></div>

                {/* Admin Delete Button - Hover Only */}
                {userRole === 'admin' && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete?.(r.id); }}
                    className="absolute top-8 right-8 p-2.5 bg-rose-50 text-rose-600 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-600 hover:text-white z-10"
                  >
                    <Trash2 size={18} />
                  </button>
                )}

                <div className="flex flex-col h-full gap-6">
                  {/* Unit & Status Section */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className={`p-4 rounded-2xl shadow-inner ${
                        r.status === ReadinessStatus.SIAGA ? 'bg-emerald-50 text-emerald-600' : 
                        r.status === ReadinessStatus.SIAGA_TERBATAS ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                      }`}>
                        <Truck size={24} />
                      </div>
                      <div>
                        <h4 className="text-xl font-black italic tracking-tighter uppercase text-slate-900 group-hover:text-rose-600 transition-colors">{r.unitNumber}</h4>
                        <p className={`text-[9px] font-black uppercase tracking-widest ${
                          r.status === ReadinessStatus.SIAGA ? 'text-emerald-600' : 
                          r.status === ReadinessStatus.SIAGA_TERBATAS ? 'text-amber-600' : 'text-rose-600'
                        }`}>{r.status.split(' ')[0]}</p>
                      </div>
                    </div>
                  </div>

                  {/* Main Info */}
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center gap-3 text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <User size={14} className="text-rose-600" />
                      <span className="text-[10px] font-black uppercase tracking-tight truncate">{r.personnelName}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <Calendar size={14} className="text-rose-600" />
                      <span className="text-[10px] font-bold uppercase tracking-tight">
                        {new Date(r.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <Clock size={14} className="text-rose-600" />
                      <span className="text-[10px] font-bold uppercase tracking-tight">
                        {new Date(r.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                      </span>
                    </div>
                  </div>

                  {/* Fluid Level Indicators */}
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-400">
                        <span className="flex items-center gap-1.5"><Droplets size={10} className="text-rose-500" /> BBM</span>
                        <span className={r.fuelLevel < 25 ? 'text-rose-600 animate-pulse' : 'text-slate-600'}>{r.fuelLevel}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-200/50 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className={`h-full transition-all duration-1000 ease-out shadow-lg ${r.fuelLevel < 25 ? 'bg-rose-600' : 'bg-rose-500'}`}
                          style={{ width: `${r.fuelLevel}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-400">
                        <span className="flex items-center gap-1.5"><Droplets size={10} className="text-blue-500" /> Air Tangki</span>
                        <span className={r.waterLevel < 30 ? 'text-rose-600 animate-pulse' : 'text-slate-600'}>{r.waterLevel}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-200/50 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className={`h-full transition-all duration-1000 ease-out shadow-lg ${r.waterLevel < 30 ? 'bg-amber-500' : 'bg-blue-500'}`}
                          style={{ width: `${r.waterLevel}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Condition Indicators */}
                  <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                     <div className="flex gap-2">
                        <ConditionDot status={r.engineOilRadiator} />
                        <ConditionDot status={r.brakesCondition} />
                        <ConditionDot status={r.tireCondition} />
                        <ConditionDot status={r.pumpPTO} />
                        <ConditionDot status={r.tankCondition} />
                     </div>
                     <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                        <Gauge size={12} className="text-rose-600" />
                        <span className="text-[10px] font-black text-slate-600 tracking-tighter">{r.odometer.toLocaleString()} KM</span>
                     </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-slate-300 text-[10px] font-black uppercase tracking-[0.3em] opacity-0 group-hover:opacity-100 group-hover:text-rose-600 transition-all pt-4">
                    <Eye size={14} /> Buka Detail Laporan
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filtered.length === 0 && (
          <div className="p-24 text-center bg-white rounded-2xl border border-slate-100">
             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
               <Database size={32} className="text-slate-200" />
             </div>
             <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-300">Tidak ada arsip laporan ditemukan</p>
             <p className="text-[9px] font-bold text-slate-400 uppercase mt-2 italic">Pastikan filter atau kata kunci pencarian benar</p>
          </div>
        )}
      </div>
    </div>
  );
};

const ConditionDot = ({ status }: { status: InspectionStatus }) => (
  <div className={`w-2 h-2 rounded-full ${status === InspectionStatus.AMAN ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
);

const FilterBtn = ({ label, active, onClick, count }: any) => (
  <button 
    onClick={onClick} 
    className={`px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl text-[8px] md:text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 md:gap-3 whitespace-nowrap shadow-sm ${
      active ? 'bg-slate-900 text-white border-slate-900 shadow-xl scale-105' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
    }`}
  >
    {label}
    {count !== undefined && (
      <span className={`px-1.5 md:px-2 py-0.5 rounded-lg text-[7px] md:text-[8px] ${active ? 'bg-red-600 text-white' : 'bg-slate-200/50 text-slate-500'}`}>
        {count}
      </span>
    )}
  </button>
);

const DetailBadge = ({ icon, label, value, isStatus }: any) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center shadow-sm flex flex-col items-center gap-3">
    <div className="p-2 bg-slate-50 text-slate-400 rounded-lg">
      {icon}
    </div>
    <div className="space-y-1">
      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className={`text-[10px] font-black uppercase tracking-tight leading-tight ${
        isStatus ? (
          value.includes('SIAGA') && !value.includes('TERBATAS') ? 'text-green-600' :
          value.includes('TERBATAS') ? 'text-yellow-600' : 'text-red-600'
        ) : 'text-slate-900'
      }`}>
        {value}
      </p>
    </div>
  </div>
);

const TechnicalItem = ({ label, status }: any) => (
  <div className="flex items-center justify-between py-3 border-b border-slate-50 last:border-none group">
    <div className="flex items-center gap-3">
      <div className={`w-1.5 h-1.5 rounded-full ${status === InspectionStatus.AMAN ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight group-hover:text-slate-800 transition-colors">{label}</span>
    </div>
    <div className="flex items-center gap-1.5">
      {status === InspectionStatus.AMAN ? (
        <CheckCircle2 size={12} className="text-green-600" />
      ) : (
        <AlertTriangle size={12} className="text-red-600" />
      )}
      <span className={`text-[9px] font-black uppercase tracking-widest ${status === InspectionStatus.AMAN ? 'text-green-600' : 'text-red-600'}`}>
        {status}
      </span>
    </div>
  </div>
);

export default ReportTable;
