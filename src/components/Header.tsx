import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  MapPin, 
  LayoutDashboard, 
  UserCheck, 
  Clock, 
  Building2,
  ChevronDown
} from 'lucide-react';
import { Employee, OfficeLocation } from '../types/attendance';

interface HeaderProps {
  activeTab: 'employee' | 'kiosk' | 'admin';
  setActiveTab: (tab: 'employee' | 'kiosk' | 'admin') => void;
  employees: Employee[];
  activeEmployee: Employee;
  setActiveEmployee: (emp: Employee) => void;
  office: OfficeLocation;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  employees,
  activeEmployee,
  setActiveEmployee,
  office
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-lg">
      {/* Top Banner with Clock & Office */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-white truncate max-w-xs sm:max-w-md">{office.name}</span>
          <span className="hidden md:inline-block text-slate-500">•</span>
          <span className="hidden md:inline-flex items-center gap-1 text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-rose-400" />
            Radius Geofence: <strong className="text-emerald-400">{office.radiusMeters} meter</strong>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-800/90 px-2.5 py-1 rounded-md border border-slate-700/80">
            <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="font-mono text-emerald-300 font-bold tracking-wider">{formattedTime} WIB</span>
          </div>
          <span className="hidden sm:inline text-slate-400">{formattedDate}</span>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
            <QrCode className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-emerald-300 bg-clip-text text-transparent">
                HadirKu
              </h1>
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                LIVE GPS & QR
              </span>
            </div>
            <p className="text-xs text-slate-400">Presensi Berbasis Lokasi & Pemindaian QR Real-Time</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700/80">
          <button
            onClick={() => setActiveTab('employee')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'employee'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Presensi Karyawan</span>
          </button>

          <button
            onClick={() => setActiveTab('kiosk')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'kiosk'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Kiosk QR Kantor</span>
          </button>

          <button
            onClick={() => setActiveTab('admin')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'admin'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard HR</span>
          </button>
        </div>

        {/* Active Employee Selector */}
        <div className="relative">
          <button
            onClick={() => setShowEmployeeDropdown(!showEmployeeDropdown)}
            className="flex items-center gap-2.5 bg-slate-800/90 hover:bg-slate-700/80 px-3 py-1.5 rounded-xl border border-slate-700/80 transition-colors text-left"
          >
            <img
              src={activeEmployee.avatar}
              alt={activeEmployee.name}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-emerald-500/50"
            />
            <div className="text-xs hidden sm:block">
              <div className="font-semibold text-slate-100 flex items-center gap-1">
                <span className="truncate max-w-[120px]">{activeEmployee.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="text-[11px] text-emerald-400">{activeEmployee.role}</div>
            </div>
          </button>

          {showEmployeeDropdown && (
            <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-2 z-50">
              <div className="px-3 py-1.5 border-b border-slate-700/70 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Ganti Akun Karyawan (Simulasi)
              </div>
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-700/50">
                {employees.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => {
                      setActiveEmployee(emp);
                      setShowEmployeeDropdown(false);
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center gap-3 hover:bg-slate-700/60 transition-colors ${
                      emp.id === activeEmployee.id ? 'bg-emerald-500/10 text-emerald-300' : 'text-slate-200'
                    }`}
                  >
                    <img
                      src={emp.avatar}
                      alt={emp.name}
                      className="w-7 h-7 rounded-full object-cover"
                    />
                    <div className="text-xs truncate">
                      <div className="font-medium truncate">{emp.name}</div>
                      <div className="text-[10px] text-slate-400">{emp.department} • {emp.nip}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
