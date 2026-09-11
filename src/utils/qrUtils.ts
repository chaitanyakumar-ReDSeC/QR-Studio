import QRCode from 'qrcode';
import { EmailData, QRContentType, QRDesignConfig, ScanResult, VCardData, WifiData } from '../types';

/**
 * Format specialized types into standardized QR code strings
 */
export function formatQRContent(
  type: QRContentType,
  data: {
    url?: string;
    text?: string;
    wifi?: WifiData;
    email?: EmailData;
    phone?: string;
    sms?: { phone: string; message: string };
    vcard?: VCardData;
  }
): string {
  switch (type) {
    case 'url': {
      const raw = data.url?.trim() || '';
      if (!raw) return '';
      if (/^[a-zA-Z][a-zA-Z\d+\-.]*?:/.test(raw)) {
        return raw;
      }
      return `https://${raw}`;
    }

    case 'text':
      return data.text?.trim() || '';

    case 'wifi': {
      const wifi = data.wifi || { ssid: '', password: '', encryption: 'WPA', hidden: false };
      if (!wifi.ssid) return '';
      const escapedSsid = escapeWifiString(wifi.ssid);
      const escapedPass = escapeWifiString(wifi.password);
      const enc = wifi.encryption === 'nopass' ? 'nopass' : wifi.encryption;
      return `WIFI:S:${escapedSsid};T:${enc};P:${escapedPass};H:${wifi.hidden ? 'true' : 'false'};;`;
    }

    case 'email': {
      const email = data.email || { address: '', subject: '', body: '' };
      if (!email.address && !email.subject && !email.body) return '';
      const params = new URLSearchParams();
      if (email.subject) params.set('subject', email.subject);
      if (email.body) params.set('body', email.body);
      const qs = params.toString();
      return `mailto:${email.address}${qs ? `?${qs}` : ''}`;
    }

    case 'phone': {
      const phone = data.phone?.trim() || '';
      if (!phone) return '';
      return `tel:${phone.replace(/\s+/g, '')}`;
    }

    case 'vcard': {
      const v = data.vcard || {
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        company: '',
        title: '',
        url: '',
      };
      if (!v.firstName && !v.lastName && !v.phone && !v.email && !v.company && !v.title && !v.url) {
        return '';
      }
      return [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `N:${v.lastName};${v.firstName};;;`,
        `FN:${(v.firstName + ' ' + v.lastName).trim()}`,
        v.company ? `ORG:${v.company}` : '',
        v.title ? `TITLE:${v.title}` : '',
        v.phone ? `TEL;TYPE=CELL:${v.phone}` : '',
        v.email ? `EMAIL:${v.email}` : '',
        v.url ? `URL:${v.url}` : '',
        'END:VCARD',
      ]
        .filter(Boolean)
        .join('\n');
    }

    default:
      return '';
  }
}

function escapeWifiString(str: string): string {
  return str.replace(/([\\;,:"])/g, '\\$1');
}

/**
 * Parse scanned QR string into categorized and structured representation
 */
export function parseScannedContent(text: string): ScanResult {
  const trimmed = text.trim();
  const id = 'scan_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  // Check URL
  if (/^https?:\/\//i.test(trimmed)) {
    return {
      id,
      rawText: trimmed,
      detectedType: 'url',
      timestamp: Date.now(),
      parsedDetails: {
        title: trimmed.replace(/^https?:\/\//, ''),
        actionUrl: trimmed,
      },
    };
  }

  // Check Wi-Fi
  if (/^WIFI:/i.test(trimmed)) {
    const ssidMatch = trimmed.match(/S:([^;]+)/);
    const passMatch = trimmed.match(/P:([^;]+)/);
    const encMatch = trimmed.match(/T:([^;]+)/);
    const hiddenMatch = trimmed.match(/H:(true|false)/i);

    const ssid = ssidMatch ? ssidMatch[1].replace(/\\([\\;,:"])/g, '$1') : 'Unknown WiFi';
    const password = passMatch ? passMatch[1].replace(/\\([\\;,:"])/g, '$1') : '';
    const encryption = (encMatch ? encMatch[1] : 'WPA') as 'WPA' | 'WEP' | 'nopass';
    const hidden = hiddenMatch ? hiddenMatch[1].toLowerCase() === 'true' : false;

    return {
      id,
      rawText: trimmed,
      detectedType: 'wifi',
      timestamp: Date.now(),
      parsedDetails: {
        title: `Wi-Fi: ${ssid}`,
        wifi: { ssid, password, encryption, hidden },
      },
    };
  }

  // Check Email
  if (/^mailto:/i.test(trimmed)) {
    const rawMail = trimmed.slice(7);
    const [addr, query] = rawMail.split('?');
    const params = new URLSearchParams(query || '');
    return {
      id,
      rawText: trimmed,
      detectedType: 'email',
      timestamp: Date.now(),
      parsedDetails: {
        title: addr || 'Email Address',
        email: {
          address: addr || '',
          subject: params.get('subject') || '',
          body: params.get('body') || '',
        },
      },
    };
  }

  // Check Phone
  if (/^tel:/i.test(trimmed)) {
    const phone = trimmed.slice(4);
    return {
      id,
      rawText: trimmed,
      detectedType: 'phone',
      timestamp: Date.now(),
      parsedDetails: {
        title: phone,
        actionUrl: trimmed,
      },
    };
  }

  // Check vCard
  if (/^BEGIN:VCARD/i.test(trimmed)) {
    const fnMatch = trimmed.match(/FN:(.+)/i);
    const name = fnMatch ? fnMatch[1].trim() : 'Contact Card';
    return {
      id,
      rawText: trimmed,
      detectedType: 'vcard',
      timestamp: Date.now(),
      parsedDetails: {
        title: name,
      },
    };
  }

  // Fallback to text
  return {
    id,
    rawText: trimmed,
    detectedType: 'text',
    timestamp: Date.now(),
    parsedDetails: {
      title: trimmed.length > 30 ? trimmed.substring(0, 30) + '...' : trimmed,
    },
  };
}

/**
 * Generate QR code on HTML Canvas with optional center emblem badge
 */
export async function renderQRToCanvas(
  canvas: HTMLCanvasElement,
  content: string,
  config: QRDesignConfig
): Promise<void> {
  const qrSize = config.size;
  // If icon is present, force higher error correction level to ensure scan reliability
  const ecl = config.icon && config.icon !== 'none' ? 'H' : config.errorCorrectionLevel;

  await QRCode.toCanvas(canvas, content || ' ', {
    width: qrSize,
    margin: config.margin,
    color: {
      dark: config.fgColor,
      light: config.bgColor,
    },
    errorCorrectionLevel: ecl,
  });

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Render center icon if configured
  if (config.icon && config.icon !== 'none') {
    const centerSize = qrSize * 0.22;
    const centerPos = (qrSize - centerSize) / 2;
    const radius = centerSize * 0.25;

    // Draw background badge pill
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(centerPos, centerPos, centerSize, centerSize, radius);
    ctx.fillStyle = config.bgColor;
    ctx.fill();
    ctx.lineWidth = Math.max(2, qrSize * 0.008);
    ctx.strokeStyle = config.fgColor;
    ctx.stroke();

    // Draw minimalist icon inside badge
    ctx.fillStyle = config.fgColor;
    ctx.strokeStyle = config.fgColor;
    ctx.lineWidth = Math.max(2, qrSize * 0.006);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const iconX = centerPos + centerSize / 2;
    const iconY = centerPos + centerSize / 2;
    const iconR = centerSize * 0.28;

    if (config.icon === 'wifi') {
      ctx.beginPath();
      ctx.arc(iconX, iconY + iconR * 0.5, iconR * 0.9, Math.PI * 1.25, Math.PI * 1.75);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(iconX, iconY + iconR * 0.5, iconR * 0.5, Math.PI * 1.25, Math.PI * 1.75);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(iconX, iconY + iconR * 0.45, iconR * 0.15, 0, Math.PI * 2);
      ctx.fill();
    } else if (config.icon === 'link') {
      ctx.beginPath();
      ctx.ellipse(iconX - iconR * 0.3, iconY, iconR * 0.4, iconR * 0.25, -Math.PI / 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(iconX + iconR * 0.3, iconY, iconR * 0.4, iconR * 0.25, -Math.PI / 4, 0, Math.PI * 2);
      ctx.stroke();
    } else if (config.icon === 'shield') {
      ctx.beginPath();
      ctx.moveTo(iconX, iconY - iconR);
      ctx.lineTo(iconX + iconR * 0.8, iconY - iconR * 0.5);
      ctx.lineTo(iconX + iconR * 0.8, iconY + iconR * 0.2);
      ctx.quadraticCurveTo(iconX + iconR * 0.4, iconY + iconR, iconX, iconY + iconR * 1.1);
      ctx.quadraticCurveTo(iconX - iconR * 0.4, iconY + iconR, iconX - iconR * 0.8, iconY + iconR * 0.2);
      ctx.lineTo(iconX - iconR * 0.8, iconY - iconR * 0.5);
      ctx.closePath();
      ctx.stroke();
    } else if (config.icon === 'star') {
      drawStar(ctx, iconX, iconY, 5, iconR, iconR * 0.45);
      ctx.fill();
    } else if (config.icon === 'qr' || config.icon === 'sparkles') {
      // Minimalist square dot grid
      const s = iconR * 0.5;
      ctx.fillRect(iconX - s * 1.1, iconY - s * 1.1, s * 0.9, s * 0.9);
      ctx.fillRect(iconX + s * 0.2, iconY - s * 1.1, s * 0.9, s * 0.9);
      ctx.fillRect(iconX - s * 1.1, iconY + s * 0.2, s * 0.9, s * 0.9);
      ctx.fillRect(iconX + s * 0.2, iconY + s * 0.2, s * 0.9, s * 0.9);
    }
    ctx.restore();
  }

  // Draw optional label caption under QR if configured
  if (config.label && config.label.trim()) {
    // Label can be drawn if a bottom banner is desired
  }
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerRadius: number,
  innerRadius: number
) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
}

/**
 * Generate clean SVG string for vector download
 */
export async function generateQRSVG(content: string, config: QRDesignConfig): Promise<string> {
  const ecl = config.icon && config.icon !== 'none' ? 'H' : config.errorCorrectionLevel;
  return await QRCode.toString(content || ' ', {
    type: 'svg',
    width: config.size,
    margin: config.margin,
    color: {
      dark: config.fgColor,
      light: config.bgColor,
    },
    errorCorrectionLevel: ecl,
  });
}

/**
 * Download canvas content as PNG file
 */
export function downloadCanvasAsPNG(
  canvas: HTMLCanvasElement,
  filename: string = 'qrcode.png'
): void {
  const link = document.createElement('a');
  link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/**
 * Download canvas content as JPEG file
 */
export function downloadCanvasAsJPEG(
  canvas: HTMLCanvasElement,
  filename: string = 'qrcode.jpg'
): void {
  const link = document.createElement('a');
  link.download = filename.endsWith('.jpg') || filename.endsWith('.jpeg') ? filename : `${filename}.jpg`;
  link.href = canvas.toDataURL('image/jpeg', 0.95);
  link.click();
}

/**
 * Download string content as SVG file
 */
export function downloadSVG(svgString: string, filename: string = 'qrcode.svg'): void {
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename.endsWith('.svg') ? filename : `${filename}.svg`;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Copy canvas image directly to OS clipboard
 */
export async function copyCanvasToClipboard(canvas: HTMLCanvasElement): Promise<boolean> {
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      return new Promise((resolve) => {
        canvas.toBlob(async (blob) => {
          if (!blob) {
            resolve(false);
            return;
          }
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob }),
            ]);
            resolve(true);
          } catch {
            // Fallback to text copy of data url
            try {
              await navigator.clipboard.writeText(canvas.toDataURL('image/png'));
              resolve(true);
            } catch {
              resolve(false);
            }
          }
        }, 'image/png');
      });
    } else {
      await navigator.clipboard.writeText(canvas.toDataURL('image/png'));
      return true;
    }
  } catch {
    return false;
  }
}
