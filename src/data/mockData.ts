import { Employee, OfficeLocation, AttendanceRecord } from '../types/attendance';

export const DEFAULT_OFFICE: OfficeLocation = {
  id: 'OFFICE-JKT-01',
  name: 'Head Office PT Nusantara Solusi Digital',
  address: 'Gedung Menara Sudirman Lt. 18, Jl. Jend. Sudirman Kav. 60, Jakarta Selatan',
  latitude: -6.2255,
  longitude: 106.8085,
  radiusMeters: 100, // 100 meters
  workStartTime: '08:00',
  workEndTime: '17:00',
  lateGraceMinutes: 15
};

export const MOCK_EMPLOYEES: Employee[] = [
  {
    id: 'EMP-001',
    nip: 'NSD-2023-0101',
    name: 'Budi Pratama, S.Kom',
    role: 'Senior Software Engineer',
    department: 'Engineering',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    email: 'budi.pratama@nusantara.co.id',
    shift: 'Regular Pagi (08:00 - 17:00)'
  },
  {
    id: 'EMP-002',
    nip: 'NSD-2023-0102',
    name: 'Siti Rahmawati, S.E.',
    role: 'HR & People Operations Lead',
    department: 'Human Resources',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    email: 'siti.rahma@nusantara.co.id',
    shift: 'Regular Pagi (08:00 - 17:00)'
  },
  {
    id: 'EMP-003',
    nip: 'NSD-2024-0205',
    name: 'Ahmad Fauzan',
    role: 'UI/UX Product Designer',
    department: 'Product & Design',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    email: 'ahmad.fauzan@nusantara.co.id',
    shift: 'Regular Pagi (08:00 - 17:00)'
  },
  {
    id: 'EMP-004',
    nip: 'NSD-2023-0098',
    name: 'Dewi Lestari, M.M.',
    role: 'Finance & Accounting Manager',
    department: 'Finance',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    email: 'dewi.lestari@nusantara.co.id',
    shift: 'Regular Pagi (08:00 - 17:00)'
  },
  {
    id: 'EMP-005',
    nip: 'NSD-2024-0312',
    name: 'Rian Hidayat',
    role: 'Operations & Facility Officer',
    department: 'General Affairs',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    email: 'rian.hidayat@nusantara.co.id',
    shift: 'Regular Pagi (08:00 - 17:00)'
  },
  {
    id: 'EMP-006',
    nip: 'NSD-2024-0419',
    name: 'Nadia Putri',
    role: 'Digital Marketing Specialist',
    department: 'Marketing',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    email: 'nadia.putri@nusantara.co.id',
    shift: 'Regular Pagi (08:00 - 17:00)'
  }
];

export const PRESET_LOCATIONS = [
  {
    label: '🟢 Di Meja Kerja Kantor (12 meter - Dalam Radius)',
    latitude: -6.22558,
    longitude: 106.80856,
    desc: 'Lantai 18, zona meja kerja'
  },
  {
    label: '🟢 Pintu Masuk / Lobi Utama (38 meter - Dalam Radius)',
    latitude: -6.22572,
    longitude: 106.80871,
    desc: 'Lantai dasar, lobi akses turnstile'
  },
  {
    label: '🟢 Area Parkir Gedung (85 meter - Dalam Radius)',
    latitude: -6.22615,
    longitude: 106.80895,
    desc: 'Basement B2 area parkir'
  },
  {
    label: '🔴 Kedai Kopi Seberang (185 meter - Di Luar Radius)',
    latitude: -6.22685,
    longitude: 106.80965,
    desc: 'Luar area toleransi geofence kantor'
  },
  {
    label: '🔴 Rumah / WFH (4.5 km - Di Luar Radius)',
    latitude: -6.25500,
    longitude: 106.79000,
    desc: 'Lokasi tempat tinggal karyawan'
  }
];

export const INITIAL_ATTENDANCE_RECORDS: AttendanceRecord[] = [
  {
    id: 'ATT-20251104-001',
    employeeId: 'EMP-002',
    employeeName: 'Siti Rahmawati, S.E.',
    employeeNip: 'NSD-2023-0102',
    employeeRole: 'HR & People Operations Lead',
    employeeDepartment: 'Human Resources',
    type: 'MASUK',
    status: 'TEPAT_WAKTU',
    timestamp: '2026-11-04T07:48:12+07:00',
    date: '2026-11-04',
    time: '07:48:12',
    latitude: -6.22556,
    longitude: 106.80854,
    distanceFromOfficeMeters: 8,
    isInRadius: true,
    photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    notes: 'Presensi via Kiosk Lobi Utama'
  },
  {
    id: 'ATT-20251104-002',
    employeeId: 'EMP-005',
    employeeName: 'Rian Hidayat',
    employeeNip: 'NSD-2024-0312',
    employeeRole: 'Operations & Facility Officer',
    employeeDepartment: 'General Affairs',
    type: 'MASUK',
    status: 'TEPAT_WAKTU',
    timestamp: '2026-11-04T07:55:40+07:00',
    date: '2026-11-04',
    time: '07:55:40',
    latitude: -6.22570,
    longitude: 106.80868,
    distanceFromOfficeMeters: 26,
    isInRadius: true,
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    notes: 'Presensi via Scan QR Mobile'
  },
  {
    id: 'ATT-20251104-003',
    employeeId: 'EMP-004',
    employeeName: 'Dewi Lestari, M.M.',
    employeeNip: 'NSD-2023-0098',
    employeeRole: 'Finance & Accounting Manager',
    employeeDepartment: 'Finance',
    type: 'MASUK',
    status: 'TERLAMBAT',
    timestamp: '2026-11-04T08:24:15+07:00',
    date: '2026-11-04',
    time: '08:24:15',
    latitude: -6.22559,
    longitude: 106.80859,
    distanceFromOfficeMeters: 14,
    isInRadius: true,
    photoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    notes: 'Terlambat 9 menit (KRL mengalami anjlokan sinyal)'
  }
];
