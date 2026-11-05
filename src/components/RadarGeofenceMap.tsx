import React, { useState } from 'react';
import { Building2, MapPin, Users, Info, Crosshair } from 'lucide-react';
import { OfficeLocation, AttendanceRecord } from '../types/attendance';
import { calculateBearing, formatDistance } from '../utils/geo';

interface RadarGeofenceMapProps {
  office: OfficeLocation;
  attendanceRecords: AttendanceRecord[];
}

export const RadarGeofenceMap: React.FC<RadarGeofenceMapProps> = ({
  office,
  attendanceRecords
}) => {
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

  // Map canvas settings
  const viewBoxSize = 400;
  const center = viewBoxSize / 2; // (200, 200)
  const maxMapRangeMeters = office.radiusMeters * 2.2; // Scaling range so the office radius fits cleanly

  // Convert distance and bearing into (x, y) coordinates on the SVG map
  const getCoordinatesForRecord = (record: AttendanceRecord) => {
    const bearing = calculateBearing(
      office.latitude,
      office.longitude,
      record.latitude,
      record.longitude
    );
    // Scale distance to pixels
    const pixelDistance = Math.min(
      (record.distanceFromOfficeMeters / maxMapRangeMeters) * (viewBoxSize * 0.42),
      viewBoxSize * 0.46
    );

    const rad = ((bearing - 90) * Math.PI) / 180;
    const x = center + pixelDistance * Math.cos(rad);
    const y = center + pixelDistance * Math.sin(rad);

    return { x, y, bearing };
  };

  // Radius circles in pixels
  const officeRadiusPixels = (office.radiusMeters / maxMapRangeMeters) * (viewBoxSize * 0.42);
  const outerBufferRadiusPixels = (office.radiusMeters * 1.5 / maxMapRangeMeters) * (viewBoxSize * 0.42);

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/80 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-emerald-600" />
            <span>Radar & Peta Geofencing Kehadiran</span>
          </h3>
          <p className="text-xs text-slate-500">
            Visualisasi posisi GPS real-time karyawan terhadap perimeter geofence kantor ({office.radiusMeters}m)
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-300" />
            <span className="text-slate-600">Dalam Radius</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500 border border-rose-300" />
            <span className="text-slate-600">Di Luar Radius</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* SVG Interactive Radar Canvas */}
        <div className="md:col-span-7 flex justify-center">
          <div className="relative w-full max-w-[340px] aspect-square bg-slate-900 rounded-3xl shadow-inner border border-slate-800 p-2 overflow-hidden">
            <svg
              viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
              className="w-full h-full select-none"
            >
              {/* Grid Lines */}
              <circle cx={center} cy={center} r={viewBoxSize * 0.46} fill="none" stroke="#1e293b" strokeWidth="1" />
              <line x1={center} y1={10} x2={center} y2={viewBoxSize - 10} stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
              <line x1={10} y1={center} x2={viewBoxSize - 10} y2={center} stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />

              {/* Outer Buffer Zone */}
              <circle
                cx={center}
                cy={center}
                r={outerBufferRadiusPixels}
                fill="none"
                stroke="#334155"
                strokeWidth="1.5"
                strokeDasharray="6 6"
              />

              {/* Safe Office Geofence Circle (Zone Hijau) */}
              <circle
                cx={center}
                cy={center}
                r={officeRadiusPixels}
                fill="rgba(16, 185, 129, 0.12)"
                stroke="#10b981"
                strokeWidth="2"
              />

              {/* Pulsing radar wave animation */}
              <circle
                cx={center}
                cy={center}
                r={officeRadiusPixels}
                fill="none"
                stroke="#34d399"
                strokeWidth="1"
                className="animate-ping"
                style={{ transformOrigin: 'center', animationDuration: '3s' }}
              />

              {/* Compass Labels */}
              <text x={center} y={24} fill="#64748b" fontSize="10" textAnchor="middle" fontWeight="bold">U</text>
              <text x={viewBoxSize - 20} y={center + 4} fill="#64748b" fontSize="10" textAnchor="middle" fontWeight="bold">T</text>
              <text x={center} y={viewBoxSize - 14} fill="#64748b" fontSize="10" textAnchor="middle" fontWeight="bold">S</text>
              <text x={20} y={center + 4} fill="#64748b" fontSize="10" textAnchor="middle" fontWeight="bold">B</text>

              {/* Office Center Point */}
              <g transform={`translate(${center - 12}, ${center - 12})`}>
                <rect width="24" height="24" rx="6" fill="#0f766e" stroke="#2dd4bf" strokeWidth="2" />
                <foreignObject width="24" height="24">
                  <div className="w-full h-full flex items-center justify-center text-teal-200">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                </foreignObject>
              </g>

              {/* Attendance Pins Plotted */}
              {attendanceRecords.map((rec) => {
                const { x, y } = getCoordinatesForRecord(rec);
                const isSelected = selectedRecord?.id === rec.id;
                const pinColor = rec.isInRadius ? '#10b981' : '#f43f5e';

                return (
                  <g
                    key={rec.id}
                    transform={`translate(${x}, ${y})`}
                    className="cursor-pointer transition-transform duration-200 hover:scale-125"
                    onClick={() => setSelectedRecord(rec)}
                  >
                    {/* Ripple on selected */}
                    {isSelected && (
                      <circle r="14" fill={pinColor} fillOpacity="0.3" className="animate-ping" />
                    )}
                    <circle r="7" fill={pinColor} stroke="#ffffff" strokeWidth="2" />
                    <text
                      y="-10"
                      textAnchor="middle"
                      fill="#e2e8f0"
                      fontSize="9"
                      fontWeight="bold"
                      className="pointer-events-none drop-shadow"
                    >
                      {rec.employeeName.split(' ')[0]}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right: Selected Employee Pin Card or Details */}
        <div className="md:col-span-5 space-y-3">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Detail Titik Presensi
            </span>

            {selectedRecord ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedRecord.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                    alt={selectedRecord.employeeName}
                    className="w-12 h-12 rounded-xl object-cover ring-2 ring-emerald-500/40"
                  />
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">{selectedRecord.employeeName}</h4>
                    <p className="text-[11px] text-slate-500">{selectedRecord.employeeDepartment} • {selectedRecord.employeeNip}</p>
                    <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedRecord.isInRadius ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {selectedRecord.isInRadius ? 'Dalam Geofence' : 'Di Luar Geofence'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs bg-white p-2.5 rounded-xl border border-slate-200/60">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Waktu Scan:</span>
                    <span className="font-mono font-bold text-slate-800">{selectedRecord.time} WIB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Jarak ke Kantor:</span>
                    <span className="font-bold text-emerald-700">{formatDistance(selectedRecord.distanceFromOfficeMeters)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Koordinat:</span>
                    <span className="font-mono text-slate-600 text-[10px]">{selectedRecord.latitude.toFixed(5)}, {selectedRecord.longitude.toFixed(5)}</span>
                  </div>
                  {selectedRecord.notes && (
                    <div className="pt-1 border-t border-slate-100 text-slate-600 text-[11px] italic">
                      &quot;{selectedRecord.notes}&quot;
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-slate-500 space-y-1">
                <Info className="w-5 h-5 mx-auto text-slate-400" />
                <p>Klik titik pin karyawan pada radar di samping untuk melihat rincian lokasi presensinya.</p>
              </div>
            )}
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200/70 p-3 rounded-2xl text-xs text-emerald-900 space-y-1">
            <span className="font-bold flex items-center gap-1.5 text-emerald-800">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              Radius Geofence: {office.radiusMeters} meter
            </span>
            <p className="text-[11px] text-emerald-700">
              Karyawan wajib berada dalam lingkaran hijau untuk dinyatakan sah hadir di kantor.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
