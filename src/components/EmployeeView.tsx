import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import { 
  Camera, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Crosshair, 
  ArrowRight,
  ShieldCheck,
  Calendar,
  Clock,
  Sparkles,
  Info,
  Maximize2
} from 'lucide-react';
import { 
  Employee, 
  OfficeLocation, 
  AttendanceRecord, 
  AttendanceType, 
  GeolocationState 
} from '../types/attendance';
import { calculateDistanceMeters, formatDistance } from '../utils/geo';
import { verifyScannedQR, generateOfficeQRPayload } from '../utils/qr';
import { playScannerBeep, playSuccessChime, playErrorAlert, speakText } from '../utils/audio';
import { PRESET_LOCATIONS } from '../data/mockData';

interface EmployeeViewProps {
  employee: Employee;
  office: OfficeLocation;
  attendanceRecords: AttendanceRecord[];
  onAddAttendance: (record: AttendanceRecord) => void;
  onOpenSuccessModal: (record: AttendanceRecord) => void;
  onRequestOpenKiosk: () => void;
}

export const EmployeeView: React.FC<EmployeeViewProps> = ({
  employee,
  office,
  attendanceRecords,
  onAddAttendance,
  onOpenSuccessModal,
  onRequestOpenKiosk
}) => {
  // Geolocation state
  const [geoState, setGeoState] = useState<GeolocationState>({
    latitude: PRESET_LOCATIONS[0].latitude,
    longitude: PRESET_LOCATIONS[0].longitude,
    accuracy: 8,
    isSimulated: true
  });
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(0);
  const [isGettingRealLocation, setIsGettingRealLocation] = useState<boolean>(false);

  // Attendance form state
  const [attendanceType, setAttendanceType] = useState<AttendanceType>('MASUK');
  const [notes, setNotes] = useState<string>('');
  const [takeSelfie, setTakeSelfie] = useState<boolean>(true);

  // Camera & Scanner state
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [scannedResult, setScannedResult] = useState<{ status: 'idle' | 'success' | 'error'; message: string }>({
    status: 'idle',
    message: ''
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopId = useRef<number | null>(null);

  // Compute live distance from office
  const distanceToOffice = calculateDistanceMeters(
    geoState.latitude,
    geoState.longitude,
    office.latitude,
    office.longitude
  );
  const isInRadius = distanceToOffice <= office.radiusMeters;

  // Filter today's attendance for this employee
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecords = attendanceRecords.filter(
    (r) => r.employeeId === employee.id && r.date === todayStr
  );
  const checkInRecord = todayRecords.find((r) => r.type === 'MASUK');
  const checkOutRecord = todayRecords.find((r) => r.type === 'KELUAR');

  // Request actual device GPS
  const handleGetRealLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolokasi tidak didukung oleh browser Anda.');
      return;
    }
    setIsGettingRealLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoState({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          isSimulated: false
        });
        setIsGettingRealLocation(false);
      },
      (err) => {
        setIsGettingRealLocation(false);
        setGeoState((prev) => ({
          ...prev,
          error: `Gagal akses GPS: ${err.message}. Menggunakan simulasi lokasi.`
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Change preset simulation location
  const handleSelectPreset = (index: number) => {
    setSelectedPresetIndex(index);
    const loc = PRESET_LOCATIONS[index];
    setGeoState({
      latitude: loc.latitude,
      longitude: loc.longitude,
      accuracy: 5,
      isSimulated: true
    });
  };

  // Capture frame photo as selfie data URL
  const captureSelfieSnapshot = (): string => {
    if (!takeSelfie) {
      return employee.avatar;
    }
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          return canvas.toDataURL('image/jpeg', 0.85);
        }
      }
    }
    return employee.avatar;
  };

  // Stop camera stream safely
  const stopCamera = useCallback(() => {
    if (scanLoopId.current) {
      cancelAnimationFrame(scanLoopId.current);
      scanLoopId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  }, []);

  // Process verified attendance
  const submitAttendance = useCallback((qrTokenUsed?: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour12: false });
    
    // Check punctuality based on office settings
    let status: 'TEPAT_WAKTU' | 'TERLAMBAT' | 'DI_LUAR_RADIUS' | 'DINAS' = 'TEPAT_WAKTU';

    if (attendanceType === 'DINAS_LUAR') {
      status = 'DINAS';
    } else if (!isInRadius) {
      status = 'DI_LUAR_RADIUS';
    } else if (attendanceType === 'MASUK') {
      const [startHour, startMin] = office.workStartTime.split(':').map(Number);
      const limitMinutes = startHour * 60 + startMin + office.lateGraceMinutes;
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      if (currentMinutes > limitMinutes) {
        status = 'TERLAMBAT';
      }
    }

    const photoUrl = captureSelfieSnapshot();

    const newRecord: AttendanceRecord = {
      id: `ATT-${Date.now()}`,
      employeeId: employee.id,
      employeeName: employee.name,
      employeeNip: employee.nip,
      employeeRole: employee.role,
      employeeDepartment: employee.department,
      type: attendanceType,
      status: status,
      timestamp: now.toISOString(),
      date: todayStr,
      time: timeStr,
      latitude: geoState.latitude,
      longitude: geoState.longitude,
      distanceFromOfficeMeters: distanceToOffice,
      isInRadius: isInRadius,
      photoUrl: photoUrl,
      notes: notes.trim() || undefined,
      qrTokenUsed: qrTokenUsed || 'QR-VERIFIED'
    };

    onAddAttendance(newRecord);
    stopCamera();
    playSuccessChime();

    const actionText = attendanceType === 'MASUK' ? 'masuk' : attendanceType === 'KELUAR' ? 'pulang' : 'dinas';
    speakText(`Presensi ${actionText} berhasil. Terima kasih ${employee.name.split(' ')[0]}`);

    onOpenSuccessModal(newRecord);
  }, [
    attendanceType,
    isInRadius,
    office,
    employee,
    todayStr,
    geoState,
    distanceToOffice,
    notes,
    onAddAttendance,
    stopCamera,
    onOpenSuccessModal
  ]);

  // Handle scanned QR string
  const handleScannedCode = useCallback((codeString: string) => {
    playScannerBeep();
    const verification = verifyScannedQR(codeString, office);

    if (!verification.isValid) {
      playErrorAlert();
      setScannedResult({
        status: 'error',
        message: verification.message
      });
      return;
    }

    // Geolocation check enforcement (except if it's explicitly designated as DINAS_LUAR)
    if (attendanceType !== 'DINAS_LUAR' && !isInRadius) {
      playErrorAlert();
      setScannedResult({
        status: 'error',
        message: `Presensi Ditolak! Anda berada di luar radius kantor (${distanceToOffice} m). Maksimal toleransi adalah ${office.radiusMeters} m.`
      });
      return;
    }

    setScannedResult({
      status: 'success',
      message: 'QR Code Valid! Memverifikasi kehadiran dan foto selfie...'
    });

    setTimeout(() => {
      submitAttendance(verification.payload?.token || 'TOKEN-OK');
    }, 600);
  }, [office, attendanceType, isInRadius, distanceToOffice, submitAttendance]);

  // Animation frame scanner loop
  const scanLoop = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert'
        });

        if (code && code.data) {
          handleScannedCode(code.data);
          return; // Stop loop once detected
        }
      }
    }
    scanLoopId.current = requestAnimationFrame(scanLoop);
  }, [handleScannedCode]);

  // Start camera stream
  const startCamera = async () => {
    setCameraError(null);
    setScannedResult({ status: 'idle', message: '' });
    setIsScanning(true);

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
          audio: false
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.play();
          scanLoopId.current = requestAnimationFrame(scanLoop);
        }
      } else {
        setCameraError('Kamera tidak didukung pada browser ini.');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Izin kamera ditolak atau perangkat tidak ditemukan.';
      setCameraError(errorMsg);
    }
  };

  // Flip camera between front and back
  const handleFlipCamera = () => {
    stopCamera();
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
    setTimeout(() => {
      startCamera();
    }, 200);
  };

  // Instant simulator test scan (convenient if user has no physical camera or second screen)
  const handleSimulateQuickScan = () => {
    const dummyPayload = generateOfficeQRPayload(office, 45);
    handleScannedCode(JSON.stringify(dummyPayload));
  };

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 space-y-6">
      {/* Employee Greeting & Today's Summary */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={employee.avatar}
              alt={employee.name}
              className="w-16 h-16 rounded-2xl object-cover ring-4 ring-emerald-500/20 shadow-md"
            />
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-slate-100" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-800">{employee.name}</h2>
              <span className="text-xs bg-slate-100 text-slate-600 font-mono px-2 py-0.5 rounded-md border border-slate-200">
                {employee.nip}
              </span>
            </div>
            <p className="text-sm text-slate-500 font-medium">
              {employee.role} • <span className="text-emerald-700 font-semibold">{employee.department}</span>
            </p>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Shift: {employee.shift}</span>
            </div>
          </div>
        </div>

        {/* Today's Punch Card Status */}
        <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80 min-w-[260px]">
          <div className="bg-white p-2.5 rounded-lg border border-slate-200/60 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 block">Jam Masuk</span>
            <div className="text-sm font-bold text-slate-800 mt-0.5 flex items-center gap-1.5">
              {checkInRecord ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="font-mono text-emerald-700">{checkInRecord.time}</span>
                </>
              ) : (
                <span className="text-slate-400 font-medium text-xs">Belum Absen</span>
              )}
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-lg border border-slate-200/60 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 block">Jam Keluar</span>
            <div className="text-sm font-bold text-slate-800 mt-0.5 flex items-center gap-1.5">
              {checkOutRecord ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-rose-500" />
                  <span className="font-mono text-rose-700">{checkOutRecord.time}</span>
                </>
              ) : (
                <span className="text-slate-400 font-medium text-xs">Belum Absen</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Geolocation Card (Radius & Coordinates) */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200/80 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl ${isInRadius ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Status Geofencing GPS</h3>
              <p className="text-xs text-slate-500">Pengecekan koordinat fisik terhadap titik lokasi kantor</p>
            </div>
          </div>

          {/* Badge In Radius or Out */}
          <div className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs ${
            isInRadius
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}>
            {isInRadius ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>DALAM RADIUS KANTOR</span>
              </>
            ) : (
              <>
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>DI LUAR RADIUS</span>
              </>
            )}
          </div>
        </div>

        {/* Distance Visual Meter */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-600">Jarak Anda ke Titik Kantor:</span>
            <span className={`font-bold font-mono text-sm ${isInRadius ? 'text-emerald-700' : 'text-rose-600'}`}>
              {formatDistance(distanceToOffice)}
            </span>
          </div>

          {/* Progress Bar of Geofence */}
          <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden relative">
            <div
              className={`h-full transition-all duration-500 ${
                isInRadius ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
              style={{
                width: `${Math.min(100, Math.max(5, (distanceToOffice / (office.radiusMeters * 2)) * 100))}%`
              }}
            />
            {/* Limit Marker */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-slate-800 z-10" 
              style={{ left: '50%' }}
              title="Batas Radius Geofence"
            />
          </div>

          <div className="flex justify-between items-center text-[11px] text-slate-500">
            <span>0 m (Pusat Kantor)</span>
            <span className="font-semibold text-slate-700">Batas Maks: {office.radiusMeters} meter</span>
            <span>200+ m</span>
          </div>
        </div>

        {/* Location Simulator & Real GPS Trigger */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>Simulasi Lokasi (Untuk Uji Coba Presensi):</span>
            <button
              onClick={handleGetRealLocation}
              disabled={isGettingRealLocation}
              className="inline-flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGettingRealLocation ? 'animate-spin' : ''}`} />
              <span>{isGettingRealLocation ? 'Mencari GPS...' : 'Ambil GPS Asli HP/Laptop'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PRESET_LOCATIONS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectPreset(idx)}
                className={`text-left p-2.5 rounded-xl text-xs transition-all border ${
                  geoState.isSimulated && selectedPresetIndex === idx
                    ? 'bg-emerald-50/80 border-emerald-400 ring-1 ring-emerald-400 text-emerald-900 font-semibold'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="truncate">{preset.label}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{preset.desc}</div>
              </button>
            ))}
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-2 pt-1 font-mono">
            <Crosshair className="w-3.5 h-3.5 text-slate-400" />
            <span>Koordinat: {geoState.latitude.toFixed(6)}, {geoState.longitude.toFixed(6)} (Akurasi ±{geoState.accuracy}m)</span>
            {geoState.isSimulated && <span className="text-amber-600 font-sans font-medium">[Mode Simulasi]</span>}
          </div>
        </div>
      </div>

      {/* Attendance Action & QR Scanner Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200/80 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Pemindaian QR Code Kehadiran</h3>
            <p className="text-xs text-slate-500">Scan QR Code dinamis yang tampil di monitor kiosk kantor</p>
          </div>
          <button
            onClick={onRequestOpenKiosk}
            className="text-xs inline-flex items-center gap-1 text-slate-600 hover:text-emerald-700 font-semibold bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Buka Layar Kiosk QR</span>
          </button>
        </div>

        {/* Type Selector (Masuk / Keluar / Dinas Luar) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">Pilih Jenis Presensi:</label>
          <div className="grid grid-cols-3 gap-2.5">
            <button
              onClick={() => setAttendanceType('MASUK')}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 border ${
                attendanceType === 'MASUK'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/30 ring-2 ring-emerald-500/30'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Masuk</span>
              </div>
              <span className={`text-[10px] font-normal ${attendanceType === 'MASUK' ? 'text-emerald-100' : 'text-slate-500'}`}>
                Mulai Jam Kerja
              </span>
            </button>

            <button
              onClick={() => setAttendanceType('KELUAR')}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 border ${
                attendanceType === 'KELUAR'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-600/30 ring-2 ring-rose-500/30'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-1">
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Keluar / Pulang</span>
              </div>
              <span className={`text-[10px] font-normal ${attendanceType === 'KELUAR' ? 'text-rose-100' : 'text-slate-500'}`}>
                Akhir Jam Kerja
              </span>
            </button>

            <button
              onClick={() => setAttendanceType('DINAS_LUAR')}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 border ${
                attendanceType === 'DINAS_LUAR'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm shadow-amber-600/30 ring-2 ring-amber-500/30'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Dinas Luar</span>
              </div>
              <span className={`text-[10px] font-normal ${attendanceType === 'DINAS_LUAR' ? 'text-amber-100' : 'text-slate-500'}`}>
                Tugas / WFH Luar
              </span>
            </button>
          </div>
        </div>

        {/* Notes (Optional / Required for Dinas Luar) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Catatan Kehadiran {attendanceType === 'DINAS_LUAR' ? '(Wajib: Tuliskan keperluan dinas/kunjungan)' : '(Opsional)'}:
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              attendanceType === 'DINAS_LUAR'
                ? 'Contoh: Meeting dengan klien PT Telkom di Menara Kuningan'
                : 'Contoh: Hadir di ruang rapat lantai 18'
            }
            className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-slate-50"
          />
        </div>

        {/* Selfie Verification Toggle */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/80">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-emerald-600" />
            <div>
              <span className="text-xs font-bold text-slate-800">Verifikasi Foto Selfie</span>
              <p className="text-[11px] text-slate-500">Ambil potret wajah saat melakukan scan untuk validasi autentik</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={takeSelfie}
              onChange={(e) => setTakeSelfie(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        {/* Scanner Viewfinder / Camera Interface */}
        {!isScanning ? (
          <div className="bg-gradient-to-b from-slate-900 to-slate-800 rounded-2xl p-6 text-center text-white space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/30">
              <Camera className="w-8 h-8" />
            </div>
            <div className="max-w-sm mx-auto">
              <h4 className="font-bold text-sm">Siap Memindai QR Code Kantor</h4>
              <p className="text-xs text-slate-300 mt-1">
                Arahkan kamera ke QR Code yang ditampilkan pada layar monitor di lobi atau meja resepsionis kantor.
              </p>
            </div>

            {/* Validation warning if out of radius */}
            {!isInRadius && attendanceType !== 'DINAS_LUAR' && (
              <div className="bg-rose-500/20 border border-rose-500/40 p-3 rounded-xl text-xs text-rose-200 flex items-center gap-2 text-left">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>
                  <strong>Perhatian:</strong> Anda saat ini terdeteksi berada di luar radius kantor ({distanceToOffice} m &gt; {office.radiusMeters} m). Presensi reguler akan ditolak kecuali Anda memilih tipe <strong>Dinas Luar</strong> atau berada dalam radius.
                </span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={startCamera}
                className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Buka Kamera & Scan QR</span>
              </button>

              <button
                onClick={handleSimulateQuickScan}
                className="w-full sm:w-auto px-5 py-3 bg-slate-700/80 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-slate-600 transition-all cursor-pointer"
                title="Langsung memvalidasi presensi dengan token QR kantor aktif"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Simulasi Scan Cepat (1-Klik)</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 relative shadow-2xl">
            {/* Camera Viewfinder */}
            <div className="relative aspect-video sm:aspect-[4/3] max-h-[380px] w-full bg-black flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Viewfinder Target Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                <div className="relative w-56 h-56 sm:w-64 sm:h-64 border-2 border-emerald-400/70 rounded-2xl">
                  {/* Corner brackets */}
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                  {/* Animated Laser Scanline */}
                  <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-lg shadow-emerald-400 animate-scan" />
                </div>
              </div>

              {/* Status / Error Toast inside Camera */}
              {scannedResult.message && (
                <div
                  className={`absolute bottom-4 left-4 right-4 p-3 rounded-xl text-xs font-semibold backdrop-blur-md flex items-center gap-2 ${
                    scannedResult.status === 'success'
                      ? 'bg-emerald-900/90 text-emerald-200 border border-emerald-500/50'
                      : 'bg-rose-900/90 text-rose-200 border border-rose-500/50'
                  }`}
                >
                  {scannedResult.status === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{scannedResult.message}</span>
                </div>
              )}

              {cameraError && (
                <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center text-white space-y-3">
                  <AlertTriangle className="w-10 h-10 text-amber-400" />
                  <p className="text-xs text-slate-300 max-w-sm">{cameraError}</p>
                  <button
                    onClick={handleSimulateQuickScan}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-bold"
                  >
                    Gunakan Simulasi Scan Otomatis
                  </button>
                </div>
              )}
            </div>

            {/* Camera Controls Bar */}
            <div className="p-3 bg-slate-800 flex items-center justify-between gap-3 text-white">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Kamera Aktif • Arahkan ke QR Code</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleFlipCamera}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Ganti Kamera Depan / Belakang"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Balik Kamera</span>
                </button>

                <button
                  onClick={handleSimulateQuickScan}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 rounded-lg text-xs font-medium text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Scan langsung jika kamera sulit fokus"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Scan Cepat</span>
                </button>

                <button
                  onClick={stopCamera}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 rounded-lg text-xs font-medium text-white transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Personal Attendance History for this Employee */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200/80 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-slate-800 text-sm">Riwayat Presensi Saya</h3>
          </div>
          <span className="text-xs text-slate-500">
            Total {todayRecords.length} aktivitas hari ini
          </span>
        </div>

        {todayRecords.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            <Info className="w-6 h-6 mx-auto mb-2 text-slate-300" />
            Belum ada catatan presensi untuk hari ini. Silakan scan QR code di atas untuk melakukan presensi Masuk.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {todayRecords.map((rec) => (
              <div key={rec.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${
                    rec.type === 'MASUK' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                  }`}>
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 flex items-center gap-2">
                      <span>Presensi {rec.type === 'MASUK' ? 'Masuk' : rec.type === 'KELUAR' ? 'Keluar' : 'Dinas Luar'}</span>
                      <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {rec.time} WIB
                      </span>
                    </div>
                    <div className="text-slate-500 text-[11px] mt-0.5 flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        Jarak: {formatDistance(rec.distanceFromOfficeMeters)}
                      </span>
                      {rec.notes && <span>• &quot;{rec.notes}&quot;</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {rec.photoUrl && (
                    <img
                      src={rec.photoUrl}
                      alt="Selfie"
                      className="w-9 h-9 rounded-lg object-cover ring-1 ring-slate-200"
                    />
                  )}
                  <span className={`px-2.5 py-1 rounded-md font-bold text-[10px] ${
                    rec.status === 'TEPAT_WAKTU'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : rec.status === 'TERLAMBAT'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : rec.status === 'DINAS'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {rec.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
