/**
 * Hitung jarak antara dua koordinat GPS menggunakan formula Haversine
 * @returns Jarak dalam meter
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Radius Bumi dalam meter
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Format jarak menjadi format yang ramah dibaca (meter / km)
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters} meter`;
  }
  const km = (meters / 1000).toFixed(2);
  return `${km} km`;
}

/**
 * Cek apakah koordinat berada di dalam radius geofence kantor
 */
export function isWithinGeofence(
  userLat: number,
  userLng: number,
  officeLat: number,
  officeLng: number,
  allowedRadiusMeters: number
): { inRadius: boolean; distanceMeters: number } {
  const distance = calculateDistanceMeters(userLat, userLng, officeLat, officeLng);
  return {
    inRadius: distance <= allowedRadiusMeters,
    distanceMeters: distance
  };
}

/**
 * Hitung arah mata angin / bearing dari titik kantor ke karyawan
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
  const brng = Math.atan2(y, x);
  return ((brng * 180) / Math.PI + 360) % 360;
}

/**
 * Konversi bearing ke nama arah mata angin Indonesia
 */
export function getCompassDirection(bearing: number): string {
  const directions = [
    'Utara',
    'Timur Laut',
    'Timur',
    'Tenggara',
    'Selatan',
    'Barat Daya',
    'Barat',
    'Barat Laut'
  ];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}
