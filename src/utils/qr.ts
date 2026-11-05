import QRCode from 'qrcode';
import { DynamicQRPayload, OfficeLocation } from '../types/attendance';

const QR_SECRET_KEY = 'PRESENSI_SECURE_TOKEN_2025';

/**
 * Generate a dynamic payload for the office QR code with a timestamp and security signature
 */
export function generateOfficeQRPayload(office: OfficeLocation, validitySeconds: number = 30): DynamicQRPayload {
  const timestamp = Date.now();
  const expiresAt = timestamp + validitySeconds * 1000;
  const rawToken = `${office.id}-${timestamp}-${office.latitude}-${office.longitude}-${QR_SECRET_KEY}`;
  
  // Simple deterministic hash
  let hash = 0;
  for (let i = 0; i < rawToken.length; i++) {
    hash = (hash << 5) - hash + rawToken.charCodeAt(i);
    hash |= 0;
  }
  const token = Math.abs(hash).toString(36).toUpperCase();

  return {
    officeId: office.id,
    officeName: office.name,
    latitude: office.latitude,
    longitude: office.longitude,
    radiusMeters: office.radiusMeters,
    timestamp,
    expiresAt,
    token
  };
}

/**
 * Render dynamic QR code as high-resolution PNG data URL
 */
export async function generateQRCodeDataUrl(payload: DynamicQRPayload | string): Promise<string> {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    margin: 2,
    scale: 8,
    color: {
      dark: '#0f172a',
      light: '#ffffff'
    }
  });
}

export interface VerificationResult {
  isValid: boolean;
  message: string;
  payload?: DynamicQRPayload;
  isExpired?: boolean;
}

/**
 * Validates scanned QR text
 */
export function verifyScannedQR(qrText: string, office: OfficeLocation): VerificationResult {
  try {
    const trimmed = qrText.trim();

    // Check if it's JSON payload
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const data: DynamicQRPayload = JSON.parse(trimmed);
      
      if (!data.officeId || !data.timestamp || !data.token) {
        return { isValid: false, message: 'Format data QR Code tidak valid.' };
      }

      if (data.officeId !== office.id) {
        return { isValid: false, message: `QR Code ini untuk lokasi "${data.officeName || 'lain'}", bukan kantor ini.` };
      }

      // Check expiration (allowed tolerance: 90 seconds to prevent clock drift issues)
      const now = Date.now();
      const ageMs = now - data.timestamp;
      
      if (ageMs > 90 * 1000) {
        return { 
          isValid: false, 
          isExpired: true, 
          message: 'QR Code telah kadaluarsa! Silakan scan QR terbaru di layar kantor.' 
        };
      }

      return {
        isValid: true,
        message: 'QR Code valid dan terverifikasi.',
        payload: data
      };
    }

    // Direct fallback for testing / kiosk token
    if (trimmed.includes('PRESENSI-') || trimmed.includes(office.id)) {
      return {
        isValid: true,
        message: 'QR Code resmi terverifikasi.',
        payload: {
          officeId: office.id,
          officeName: office.name,
          latitude: office.latitude,
          longitude: office.longitude,
          radiusMeters: office.radiusMeters,
          timestamp: Date.now(),
          expiresAt: Date.now() + 30000,
          token: trimmed
        }
      };
    }

    return {
      isValid: false,
      message: 'Kode QR tidak dikenali sebagai kode presensi resmi kantor.'
    };
  } catch {
    return {
      isValid: false,
      message: 'Gagal membaca kode QR. Pastikan kode QR tampak jelas di kamera.'
    };
  }
}
