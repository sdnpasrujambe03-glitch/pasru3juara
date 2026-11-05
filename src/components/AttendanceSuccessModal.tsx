import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, 
  MapPin, 
  Clock, 
  Calendar, 
  ShieldCheck, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { AttendanceRecord, OfficeLocation } from '../types/attendance';
import { formatDistance } from '../utils/geo';

interface AttendanceSuccessModalProps {
  record: AttendanceRecord | null;
  office: OfficeLocation;
  onClose: () => void;
  onViewDashboard?: () => void;
}

export const AttendanceSuccessModal: React.FC<AttendanceSuccessModalProps> = ({
  record,
  office,
  onClose,
  onViewDashboard
}) => {
  useEffect(() => {
    if (record) {
      try {
        confetti({
          particleCount: 60,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#10b981', '#06b6d4', '#3b82f6', '#f59e0b']
        });
      } catch {
        // Fallback gracefully if canvas-confetti is not available
      }
    }
  }, [record]);

  if (!record) return null;

  const isMasuk = record.type === 'MASUK';
  const isKeluar = record.type === 'KELUAR';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 text-center space-y-5 transform transition-all scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated Icon */}
        <div className="relative mx-auto w-20 h-20">
          <div className="absolute inset-0 rounded-full bg-emerald-100 animate-ping opacity-75" />
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 text-white">
            <CheckCircle2 className="w-10 h-10" />
          </div>
        </div>

        {/* Title & Greeting */}
        <div className="space-y-1">
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest flex items-center justify-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Presensi Terverifikasi!
          </span>
          <h3 className="text-xl font-extrabold text-slate-800">
            {isMasuk ? 'Presensi Masuk Berhasil' : isKeluar ? 'Presensi Pulang Berhasil' : 'Presensi Dinas Berhasil'}
          </h3>
          <p className="text-xs text-slate-500">
            Terima kasih, data kehadiran Anda telah disimpan secara real-time.
          </p>
        </div>

        {/* Employee & Location Snapshot Card */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70 space-y-3 text-left">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-200/60">
            <img
              src={record.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt={record.employeeName}
              className="w-12 h-12 rounded-xl object-cover ring-2 ring-emerald-500/40"
            />
            <div>
              <h4 className="font-bold text-xs text-slate-800">{record.employeeName}</h4>
              <p className="text-[11px] text-slate-500 font-mono">{record.employeeNip}</p>
              <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                record.status === 'TEPAT_WAKTU'
                  ? 'bg-emerald-100 text-emerald-800'
                  : record.status === 'TERLAMBAT'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {record.status.replace('_', ' ')}
              </span>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> Waktu Absen:
              </span>
              <span className="font-mono font-bold text-slate-800">{record.time} WIB</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Tanggal:
              </span>
              <span className="font-semibold text-slate-700">{record.date}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-500" /> Jarak ke Kantor:
              </span>
              <span className="font-bold text-emerald-700">
                {formatDistance(record.distanceFromOfficeMeters)}
                <span className="text-[10px] font-normal text-slate-400 ml-1">
                  (Maks. {office.radiusMeters}m)
                </span>
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/60 font-mono">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Validasi QR:
              </span>
              <span className="truncate max-w-[150px]">{record.qrTokenUsed || 'VERIFIED'}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <button
            onClick={onClose}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
          >
            Selesai
          </button>

          {onViewDashboard && (
            <button
              onClick={() => {
                onClose();
                onViewDashboard();
              }}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Lihat Rekap HR
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
