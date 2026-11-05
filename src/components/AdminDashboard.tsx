import React, { useState } from 'react';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  Download, 
  Search, 
  Filter, 
  MapPin, 
  Settings, 
  Sliders, 
  Save, 
  ExternalLink,
  ShieldAlert,
  Calendar,
  Sparkles
} from 'lucide-react';
import { Employee, OfficeLocation, AttendanceRecord } from '../types/attendance';
import { formatDistance } from '../utils/geo';
import { RadarGeofenceMap } from './RadarGeofenceMap';

interface AdminDashboardProps {
  office: OfficeLocation;
  onUpdateOffice: (updated: OfficeLocation) => void;
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  office,
  onUpdateOffice,
  employees,
  attendanceRecords
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<OfficeLocation>({ ...office });
  const [isSavedNotice, setIsSavedNotice] = useState<boolean>(false);

  // Filter attendance for today
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecords = attendanceRecords.filter((r) => r.date === todayStr);

  // Unique employees who checked in today
  const uniqueCheckedInEmpIds = new Set(todayRecords.map((r) => r.employeeId));
  const totalEmployees = employees.length;
  const totalPresent = uniqueCheckedInEmpIds.size;
  const onTimeCount = todayRecords.filter((r) => r.status === 'TEPAT_WAKTU' && r.type === 'MASUK').length;
  const lateCount = todayRecords.filter((r) => r.status === 'TERLAMBAT' && r.type === 'MASUK').length;
  const outOfRadiusCount = todayRecords.filter((r) => !r.isInRadius && r.type === 'MASUK').length;
  const notPresentCount = Math.max(0, totalEmployees - totalPresent);

  // Filtered list
  const filteredRecords = attendanceRecords.filter((rec) => {
    const matchesSearch =
      rec.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.employeeNip.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.employeeDepartment.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || rec.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || rec.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Handle save office settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateOffice(settingsForm);
    setIsSavedNotice(true);
    setTimeout(() => {
      setIsSavedNotice(false);
      setShowSettingsModal(false);
    }, 1200);
  };

  // Get current GPS for office coordinates
  const handleUseCurrentGPSForOffice = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setSettingsForm((prev) => ({
            ...prev,
            latitude: Number(pos.coords.latitude.toFixed(6)),
            longitude: Number(pos.coords.longitude.toFixed(6))
          }));
        },
        () => {
          alert('Tidak dapat mendeteksi GPS saat ini.');
        }
      );
    }
  };

  // Export CSV download
  const handleExportCSV = () => {
    const headers = [
      'ID Presensi',
      'NIP',
      'Nama Karyawan',
      'Departemen',
      'Jabatan',
      'Tipe',
      'Status',
      'Tanggal',
      'Waktu',
      'Jarak ke Kantor (m)',
      'Dalam Radius',
      'Latitude',
      'Longitude',
      'Catatan'
    ];

    const rows = filteredRecords.map((r) => [
      r.id,
      r.employeeNip,
      `"${r.employeeName}"`,
      `"${r.employeeDepartment}"`,
      `"${r.employeeRole}"`,
      r.type,
      r.status,
      r.date,
      r.time,
      r.distanceFromOfficeMeters,
      r.isInRadius ? 'Ya' : 'Tidak',
      r.latitude,
      r.longitude,
      `"${r.notes || '-'}"`
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rekap_presensi_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 space-y-6">
      {/* Top Header & Settings Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-3xl shadow-sm border border-slate-200/80">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Dashboard Manajemen Presensi</h2>
          <p className="text-xs text-slate-500">
            Monitoring data kehadiran real-time, perimeter geofence, dan rekapitulasi pegawai
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Pengaturan Geofence & Shift</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm shadow-emerald-600/20 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Rekap CSV</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Pegawai</span>
            <div className="p-2 bg-slate-100 text-slate-600 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-800 font-mono">{totalEmployees}</span>
            <span className="text-xs text-slate-500 ml-1.5">orang</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Hadir Hari Ini</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-emerald-700 font-mono">{totalPresent}</span>
            <span className="text-xs text-emerald-600 ml-1.5 font-semibold">
              ({totalEmployees > 0 ? Math.round((totalPresent / totalEmployees) * 100) : 0}%)
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Tepat Waktu</span>
            <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-teal-700 font-mono">{onTimeCount}</span>
            <span className="text-xs text-teal-600 ml-1.5">pegawai</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Terlambat</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-amber-700 font-mono">{lateCount}</span>
            <span className="text-xs text-amber-600 ml-1.5">pegawai</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Belum Hadir</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-rose-700 font-mono">{notPresentCount}</span>
            <span className="text-xs text-rose-600 ml-1.5">pegawai</span>
          </div>
        </div>
      </div>

      {/* Radar Map Visualizer */}
      <RadarGeofenceMap office={office} attendanceRecords={todayRecords} />

      {/* Real-Time Attendance Log Table */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/80 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Log Presensi Real-Time</h3>
            <p className="text-xs text-slate-500">Daftar presensi yang terverifikasi dengan lokasi GPS dan QR Code</p>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama, NIP, divisi..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 font-medium text-slate-700"
            >
              <option value="ALL">Semua Status</option>
              <option value="TEPAT_WAKTU">Tepat Waktu</option>
              <option value="TERLAMBAT">Terlambat</option>
              <option value="DI_LUAR_RADIUS">Di Luar Radius</option>
              <option value="DINAS">Dinas Luar</option>
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 font-medium text-slate-700"
            >
              <option value="ALL">Semua Tipe</option>
              <option value="MASUK">Presensi Masuk</option>
              <option value="KELUAR">Presensi Keluar</option>
              <option value="DINAS_LUAR">Dinas Luar</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Karyawan</th>
                <th className="py-3 px-4">Tipe & Waktu</th>
                <th className="py-3 px-4">Jarak GPS ke Kantor</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Foto Selfie</th>
                <th className="py-3 px-4">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Tidak ditemukan data presensi yang sesuai.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={rec.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                          alt={rec.employeeName}
                          className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
                        />
                        <div>
                          <div className="font-bold text-slate-800">{rec.employeeName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {rec.employeeNip} • {rec.employeeDepartment}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${rec.type === 'MASUK' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span>{rec.type === 'MASUK' ? 'Masuk' : rec.type === 'KELUAR' ? 'Keluar' : 'Dinas Luar'}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {rec.time} WIB ({rec.date})
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-bold">
                        <MapPin className={`w-3.5 h-3.5 ${rec.isInRadius ? 'text-emerald-600' : 'text-rose-500'}`} />
                        <span className={rec.isInRadius ? 'text-emerald-700' : 'text-rose-600'}>
                          {formatDistance(rec.distanceFromOfficeMeters)}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {rec.latitude.toFixed(4)}, {rec.longitude.toFixed(4)}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold inline-block ${
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
                    </td>

                    <td className="py-3 px-4 text-center">
                      {rec.photoUrl ? (
                        <button
                          onClick={() => setSelectedPhoto(rec.photoUrl || null)}
                          className="group relative inline-block cursor-pointer"
                          title="Klik untuk perbesar foto"
                        >
                          <img
                            src={rec.photoUrl}
                            alt="Selfie"
                            className="w-9 h-9 rounded-lg object-cover ring-1 ring-slate-200 group-hover:ring-emerald-500 transition-all mx-auto"
                          />
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[10px]">-</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-600 text-[11px]">
                      {rec.notes ? (
                        <span className="italic truncate max-w-xs block">&quot;{rec.notes}&quot;</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Office Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-800 text-sm">Pengaturan Lokasi Geofence & Shift</h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Kantor / Cabang:</label>
                <input
                  type="text"
                  value={settingsForm.name}
                  onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alamat Kantor:</label>
                <input
                  type="text"
                  value={settingsForm.address}
                  onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Latitude:</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={settingsForm.latitude}
                    onChange={(e) => setSettingsForm({ ...settingsForm, latitude: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Longitude:</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={settingsForm.longitude}
                    onChange={(e) => setSettingsForm({ ...settingsForm, longitude: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                    required
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleUseCurrentGPSForOffice}
                className="w-full py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl font-semibold flex items-center justify-center gap-1.5 border border-emerald-200 transition-colors cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Gunakan Lokasi GPS Saya Saat Ini Sebagai Titik Kantor</span>
              </button>

              <div>
                <div className="flex justify-between font-semibold text-slate-700 mb-1">
                  <span>Radius Toleransi Geofence:</span>
                  <span className="font-bold text-emerald-600 font-mono">{settingsForm.radiusMeters} meter</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="500"
                  step="10"
                  value={settingsForm.radiusMeters}
                  onChange={(e) => setSettingsForm({ ...settingsForm, radiusMeters: parseInt(e.target.value) || 100 })}
                  className="w-full accent-emerald-600"
                />
                <span className="text-[10px] text-slate-400">Rekomendasi lobi gedung: 50m - 150m</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jam Masuk Kerja:</label>
                  <input
                    type="time"
                    value={settingsForm.workStartTime}
                    onChange={(e) => setSettingsForm({ ...settingsForm, workStartTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Toleransi Terlambat (Menit):</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={settingsForm.lateGraceMinutes}
                    onChange={(e) => setSettingsForm({ ...settingsForm, lateGraceMinutes: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
              </div>

              {isSavedNotice && (
                <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl text-center font-bold">
                  ✓ Pengaturan Berhasil Disimpan!
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Selfie Zoom Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="bg-white rounded-3xl p-3 max-w-sm w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedPhoto}
              alt="Bukti Selfie Karyawan"
              className="w-full aspect-[4/3] object-cover rounded-2xl ring-1 ring-slate-200"
            />
            <div className="flex justify-between items-center px-2">
              <span className="text-xs font-semibold text-slate-700">Bukti Verifikasi Wajah</span>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="px-3 py-1 bg-slate-800 text-white rounded-lg text-xs font-medium cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
