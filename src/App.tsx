import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { EmployeeView } from './components/EmployeeView';
import { KioskQRView } from './components/KioskQRView';
import { AdminDashboard } from './components/AdminDashboard';
import { AttendanceSuccessModal } from './components/AttendanceSuccessModal';
import { 
  Employee, 
  OfficeLocation, 
  AttendanceRecord 
} from './types/attendance';
import { 
  DEFAULT_OFFICE, 
  MOCK_EMPLOYEES, 
  INITIAL_ATTENDANCE_RECORDS 
} from './data/mockData';
import { QrCode, MapPin, ShieldCheck, Heart } from 'lucide-react';

const STORAGE_KEY_RECORDS = 'hadirku_attendance_records_v1';
const STORAGE_KEY_OFFICE = 'hadirku_office_config_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<'employee' | 'kiosk' | 'admin'>('employee');
  const [employees] = useState<Employee[]>(MOCK_EMPLOYEES);
  const [activeEmployee, setActiveEmployee] = useState<Employee>(MOCK_EMPLOYEES[0]);

  // Load persisted office configuration or fallback to default
  const [office, setOffice] = useState<OfficeLocation>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_OFFICE);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return DEFAULT_OFFICE;
  });

  // Load persisted attendance records or fallback to mock
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECORDS);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return INITIAL_ATTENDANCE_RECORDS;
  });

  // Modal for successful check-in
  const [successRecord, setSuccessRecord] = useState<AttendanceRecord | null>(null);

  // Sync records to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(attendanceRecords));
    } catch (e) {
      console.warn('Could not save records to localStorage', e);
    }
  }, [attendanceRecords]);

  // Sync office to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_OFFICE, JSON.stringify(office));
    } catch (e) {
      console.warn('Could not save office to localStorage', e);
    }
  }, [office]);

  // Handler to add attendance
  const handleAddAttendance = (record: AttendanceRecord) => {
    setAttendanceRecords((prev) => [record, ...prev]);
  };

  // Handler to update office
  const handleUpdateOffice = (updated: OfficeLocation) => {
    setOffice(updated);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        employees={employees}
        activeEmployee={activeEmployee}
        setActiveEmployee={setActiveEmployee}
        office={office}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {activeTab === 'employee' && (
          <EmployeeView
            employee={activeEmployee}
            office={office}
            attendanceRecords={attendanceRecords}
            onAddAttendance={handleAddAttendance}
            onOpenSuccessModal={(rec) => setSuccessRecord(rec)}
            onRequestOpenKiosk={() => setActiveTab('kiosk')}
          />
        )}

        {activeTab === 'kiosk' && (
          <KioskQRView
            office={office}
            recentAttendances={attendanceRecords}
          />
        )}

        {activeTab === 'admin' && (
          <AdminDashboard
            office={office}
            onUpdateOffice={handleUpdateOffice}
            employees={employees}
            attendanceRecords={attendanceRecords}
          />
        )}
      </main>

      {/* Success Modal */}
      <AttendanceSuccessModal
        record={successRecord}
        office={office}
        onClose={() => setSuccessRecord(null)}
        onViewDashboard={() => {
          setSuccessRecord(null);
          setActiveTab('admin');
        }}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-800">HadirKu</span>
            <span>— Sistem Presensi Karyawan Berbasis Geofence GPS & QR Code Dinamis</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Anti-Fake GPS & Anti-Screenshot
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-rose-500" /> Haversine Radius Formula
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
