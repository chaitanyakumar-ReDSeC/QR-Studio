export type QRContentType = 'url' | 'text' | 'wifi' | 'email' | 'phone' | 'vcard';

export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export type QRColorPreset = 
  | 'classic'       // Black on White
  | 'inverted'      // White on Pitch Black
  | 'crimson_dark'  // Crimson Red on Pitch Black
  | 'crimson_white' // Crimson Red on Crisp White
  | 'black_crimson' // Black on Crimson Red
  | 'custom';

export interface QRDesignConfig {
  fgColor: string;
  bgColor: string;
  errorCorrectionLevel: ErrorCorrectionLevel;
  margin: number;
  size: number;
  icon?: 'none' | 'link' | 'wifi' | 'shield' | 'star' | 'qr';
  label?: string;
}

export interface AppSettings {
  fgColor: string;
  bgColor: string;
  colorPreset: QRColorPreset;
  errorCorrectionLevel: ErrorCorrectionLevel;
  margin: number;
  defaultResolution: number;
  icon: 'none' | 'link' | 'wifi' | 'shield' | 'star' | 'qr';
  soundEnabled: boolean;
}

export interface WifiData {
  ssid: string;
  password: string;
  encryption: 'WPA' | 'WEP' | 'nopass';
  hidden: boolean;
}

export interface VCardData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  company: string;
  title: string;
  url: string;
}

export interface EmailData {
  address: string;
  subject: string;
  body: string;
}

export interface ScanResult {
  id: string;
  rawText: string;
  detectedType: 'url' | 'wifi' | 'email' | 'phone' | 'text' | 'vcard';
  timestamp: number;
  parsedDetails?: {
    title?: string;
    actionUrl?: string;
    wifi?: WifiData;
    email?: EmailData;
  };
}

export interface ToastMessage {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'error';
}

