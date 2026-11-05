export type AttendanceType = 'MASUK' | 'KELUAR' | 'DINAS_LUAR';

export type AttendanceStatus = 'TEPAT_WAKTU' | 'TERLAMBAT' | 'DI_LUAR_RADIUS' | 'DINAS';

export interface Employee {
  id: string;
  nip: string;
  name: string;
  role: string;
  department: string;
  avatar: string;
  email: string;
  shift: string;
}

export interface OfficeLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number; // Geofence radius in meters (e.g. 100m)
  workStartTime: string; // e.g. "08:00"
  workEndTime: string;   // e.g. "17:00"
  lateGraceMinutes: number; // e.g. 15 minutes
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNip: string;
  employeeRole: string;
  employeeDepartment: string;
  type: AttendanceType;
  status: AttendanceStatus;
  timestamp: string; // ISO string
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  latitude: number;
  longitude: number;
  distanceFromOfficeMeters: number;
  isInRadius: boolean;
  photoUrl?: string;
  notes?: string;
  qrTokenUsed?: string;
}

export interface DynamicQRPayload {
  officeId: string;
  officeName: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  timestamp: number;
  expiresAt: number;
  token: string;
}

export interface GeolocationState {
  latitude: number;
  longitude: number;
  accuracy: number;
  isSimulated: boolean;
  error?: string;
}
