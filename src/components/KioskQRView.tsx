import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  QrCode, 
  ShieldCheck, 
  Clock, 
  MapPin, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Sparkles,
  Users,
  CheckCircle2,
  Building2,
  AlertCircle
} from 'lucide-react';
import { OfficeLocation, AttendanceRecord, DynamicQRPayload } from '../types/attendance';
import { generateOfficeQRPayload, generateQRCodeDataUrl } from '../utils/qr';
import { formatDistance } from '../utils/geo';

interface KioskQRViewProps {
  office: OfficeLocation;
  recentAttendances: AttendanceRecord[];
  onQuickSimulateEmployeeScan?: () => void;
}

const QR_REFRESH_INTERVAL_SECONDS = 20;

export const KioskQRView: React.FC<KioskQRViewProps> = ({
  office,
  recentAttendances,
  onQuickSimulateEmployeeScan
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [currentPayload, setCurrentPayload] = useState<DynamicQRPayload | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(QR_REFRESH_INTERVAL_SECONDS);
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Generate a fresh dynamic QR payload and image
  const refreshQR = useCallback(async () => {
    const payload = generateOfficeQRPayload(office, QR_REFRESH_INTERVAL_SECONDS + 10);
    setCurrentPayload(payload);
    try {
      const dataUrl = await generateQRCodeDataUrl(payload);
      setQrDataUrl(dataUrl);
      setSecondsRemaining(QR_REFRESH_INTERVAL_SECONDS);
    } catch (err) {
      console.error('Failed to generate QR code', err);
    }
  }, [office]);

  // Initial generation
  useEffect(() => {
    refreshQR();
  }, [refreshQR]);

  // Countdown timer and auto-refresh
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          refreshQR();
          return QR_REFRESH_INTERVAL_SECONDS;
        }
        return prev - 1;
      });
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, [refreshQR]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const formattedTime = currentTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const formattedDate = currentTime.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Calculate percentage of timer circle
  const progressPercent = ((QR_REFRESH_INTERVAL_SECONDS - secondsRemaining) / QR_REFRESH_INTERVAL_SECONDS) * 100;

  return (
    <div
      ref={containerRef}
      className="max-w-6xl mx-auto px-4 py-6 sm:px-6 space-y-6"
    >
      {/* Kiosk Mode Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-md border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm text-slate-100">{office.name}</h2>
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                DISPLAY LOBI
              </span>
            </div>
            <p className="text-xs text-slate-400">Layar Presensi QR Dinamis Anti-Kecurangan</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              isSoundEnabled ? 'bg-slate-800 text-emerald-400 hover:bg-slate-700' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
            title="Toggle Suara Sambutan"
          >
            {isSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{isSoundEnabled ? 'Audio Aktif' : 'Mute'}</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Layar Penuh (Kiosk Tablet)"
          >
            <Maximize className="w-4 h-4" />
            <span className="hidden sm:inline">Layar Penuh</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: The Dynamic QR Code Box */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 flex flex-col items-center justify-center text-center space-y-6 relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-emerald-50/60 to-transparent pointer-events-none" />

          {/* Time & Date Display */}
          <div className="relative z-10 space-y-1">
            <div className="inline-flex items-center gap-2 bg-slate-900 text-emerald-400 font-mono text-2xl sm:text-3xl font-extrabold px-5 py-2 rounded-2xl shadow-inner border border-slate-800 tracking-wider">
              <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
              <span>{formattedTime} WIB</span>
            </div>
            <div className="text-xs font-semibold text-slate-500 pt-1">{formattedDate}</div>
          </div>

          {/* QR Code Container with Countdown Ring */}
          <div className="relative p-5 bg-white rounded-3xl shadow-xl border-2 border-slate-200/80">
            {qrDataUrl ? (
              <div className="relative">
                <img
                  src={qrDataUrl}
                  alt="Dynamic Office QR Code"
                  className="w-64 h-64 sm:w-72 sm:h-72 object-contain rounded-2xl mx-auto"
                />
                
                {/* Center Badge */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-lg border-2 border-emerald-500 flex items-center justify-center">
                    <QrCode className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
                <span className="text-slate-400 text-xs">Memuat kode QR...</span>
              </div>
            )}

            {/* Countdown Badge */}
            <div className="mt-4 flex items-center justify-between text-xs px-2 text-slate-600">
              <div className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Anti-Screenshot Dinamis</span>
              </div>

              <div className="flex items-center gap-1.5 font-mono font-bold text-slate-800">
                <span>Diperbarui dalam</span>
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs">
                  {secondsRemaining}
                </span>
                <span>detik</span>
              </div>
            </div>

            {/* Linear Progress Bar */}
            <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-1000 ease-linear"
                style={{ width: `${100 - progressPercent}%` }}
              />
            </div>
          </div>

          {/* Security & Instructions */}
          <div className="max-w-md text-xs text-slate-500 space-y-1.5">
            <p className="font-semibold text-slate-800">
              Buka aplikasi HadirKu di smartphone Anda dan scan QR di atas.
            </p>
            <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              Presensi otomatis memverifikasi jarak Anda (Maks. {office.radiusMeters} meter dari lobi).
            </p>
          </div>

          {/* Security Token Details */}
          {currentPayload && (
            <div className="text-[10px] font-mono text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60 max-w-sm truncate">
              Token ID: {currentPayload.token} • Valid: 20 detik
            </div>
          )}
        </div>

        {/* Right Side: Live Check-in Feed Ticker */}
        <div className="lg:col-span-5 space-y-6">
          {/* Geofence Parameters Card */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>Titik Geofence Kantor</span>
            </div>
            
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Alamat:</span>
                <span className="font-medium text-slate-700 text-right max-w-[200px] truncate">{office.address}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Koordinat Kantor:</span>
                <span className="font-mono text-slate-700 font-semibold">{office.latitude.toFixed(4)}, {office.longitude.toFixed(4)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Radius Diizinkan:</span>
                <span className="font-bold text-emerald-600 font-mono">{office.radiusMeters} meter</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Batas Toleransi Telat:</span>
                <span className="font-semibold text-amber-700 font-mono">08:15 WIB</span>
              </div>
            </div>
          </div>

          {/* Live Recent Check-Ins Ticker */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <h3 className="font-bold text-slate-800 text-sm">Aktivitas Presensi Real-Time</h3>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Live Feed
              </span>
            </div>

            {recentAttendances.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                <Users className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                Belum ada presensi yang tercatat hari ini.
              </div>
            ) : (
              <div className="space-y-3">
                {recentAttendances.slice(0, 5).map((record) => (
                  <div
                    key={record.id}
                    className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200/70 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={record.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                        alt={record.employeeName}
                        className="w-10 h-10 rounded-xl object-cover ring-2 ring-emerald-500/40"
                      />
                      <div>
                        <div className="font-bold text-xs text-slate-800 truncate max-w-[130px] sm:max-w-[160px]">
                          {record.employeeName}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {record.employeeDepartment} • {formatDistance(record.distanceFromOfficeMeters)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-bold text-xs text-slate-800">
                        {record.time}
                      </div>
                      <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                        record.status === 'TEPAT_WAKTU'
                          ? 'bg-emerald-100 text-emerald-800'
                          : record.status === 'TERLAMBAT'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {record.type === 'MASUK' ? 'Masuk' : 'Keluar'} • {record.status === 'TEPAT_WAKTU' ? 'Tepat' : 'Telat'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
