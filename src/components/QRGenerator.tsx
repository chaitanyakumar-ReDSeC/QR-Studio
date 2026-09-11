import React, { useState, useEffect, useRef } from 'react';
import {
  Link,
  Type,
  Wifi,
  Mail,
  Phone,
  UserSquare2,
  Download,
  Copy,
  Printer,
  Check,
  Eye,
  EyeOff,
  QrCode,
  Sliders,
} from 'lucide-react';
import {
  QRContentType,
  AppSettings,
  WifiData,
  VCardData,
  EmailData,
} from '../types';
import {
  formatQRContent,
  renderQRToCanvas,
  generateQRSVG,
  downloadCanvasAsPNG,
  downloadCanvasAsJPEG,
  downloadSVG,
  copyCanvasToClipboard,
} from '../utils/qrUtils';
import { soundFx } from '../utils/audio';

interface QRGeneratorProps {
  settings: AppSettings;
  onOpenSettings: () => void;
  onNotify: (message: string, type?: 'success' | 'info' | 'error') => void;
  initialContent?: string;
  initialType?: QRContentType;
}

export const QRGenerator: React.FC<QRGeneratorProps> = ({
  settings,
  onOpenSettings,
  onNotify,
  initialContent = '',
  initialType = 'url',
}) => {
  // Content selection & inputs - all initially empty by default
  const [contentType, setContentType] = useState<QRContentType>(initialType);
  const [urlInput, setUrlInput] = useState(initialContent);
  const [textInput, setTextInput] = useState('');
  const [wifiData, setWifiData] = useState<WifiData>({
    ssid: '',
    password: '',
    encryption: 'WPA',
    hidden: false,
  });
  const [showWifiPassword, setShowWifiPassword] = useState(false);

  const [emailData, setEmailData] = useState<EmailData>({
    address: '',
    subject: '',
    body: '',
  });

  const [phoneInput, setPhoneInput] = useState('');

  const [vcardData, setVcardData] = useState<VCardData>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    company: '',
    title: '',
    url: '',
  });

  const [copied, setCopied] = useState(false);
  const [resolution, setResolution] = useState<number>(settings.defaultResolution || 1024);

  // Canvas ref
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Update local resolution when settings change
  useEffect(() => {
    if (settings.defaultResolution) {
      setResolution(settings.defaultResolution);
    }
  }, [settings.defaultResolution]);

  // Current formatted string
  const currentContent = formatQRContent(contentType, {
    url: urlInput,
    text: textInput,
    wifi: wifiData,
    email: emailData,
    phone: phoneInput,
    vcard: vcardData,
  });

  // Render QR code onto preview canvas whenever content or settings change
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !currentContent) return;

    renderQRToCanvas(canvas, currentContent, {
      fgColor: settings.fgColor,
      bgColor: settings.bgColor,
      errorCorrectionLevel: settings.errorCorrectionLevel,
      margin: settings.margin,
      size: 360,
      icon: settings.icon,
    }).catch((err) => {
      console.warn('QR Render error', err);
    });
  }, [currentContent, settings]);

  // Download Handlers
  const handleDownloadPNG = async () => {
    if (!currentContent) {
      onNotify('Please enter some details first', 'error');
      return;
    }
    soundFx.playClick();
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = resolution;
    tempCanvas.height = resolution;

    await renderQRToCanvas(tempCanvas, currentContent, {
      fgColor: settings.fgColor,
      bgColor: settings.bgColor,
      errorCorrectionLevel: settings.errorCorrectionLevel,
      margin: settings.margin,
      size: resolution,
      icon: settings.icon,
    });

    const filename = `qr_${contentType}_${resolution}px.png`;
    downloadCanvasAsPNG(tempCanvas, filename);
    onNotify('Downloaded PNG image', 'success');
  };

  const handleDownloadSVG = async () => {
    if (!currentContent) {
      onNotify('Please enter some details first', 'error');
      return;
    }
    soundFx.playClick();
    const svgString = await generateQRSVG(currentContent, {
      fgColor: settings.fgColor,
      bgColor: settings.bgColor,
      errorCorrectionLevel: settings.errorCorrectionLevel,
      margin: settings.margin,
      size: resolution,
      icon: settings.icon,
    });
    const filename = `qr_${contentType}.svg`;
    downloadSVG(svgString, filename);
    onNotify('Downloaded SVG vector', 'success');
  };

  const handleDownloadJPEG = async () => {
    if (!currentContent) {
      onNotify('Please enter some details first', 'error');
      return;
    }
    soundFx.playClick();
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = resolution;
    tempCanvas.height = resolution;

    await renderQRToCanvas(tempCanvas, currentContent, {
      fgColor: settings.fgColor,
      bgColor: settings.bgColor,
      errorCorrectionLevel: settings.errorCorrectionLevel,
      margin: settings.margin,
      size: resolution,
      icon: settings.icon,
    });

    const filename = `qr_${contentType}_${resolution}px.jpg`;
    downloadCanvasAsJPEG(tempCanvas, filename);
    onNotify('Downloaded JPEG image', 'success');
  };

  const handleCopyClipboard = async () => {
    if (!currentContent) {
      onNotify('Please enter some details first', 'error');
      return;
    }
    soundFx.playClick();
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    const success = await copyCanvasToClipboard(canvas);
    if (success) {
      setCopied(true);
      onNotify('Copied image to clipboard', 'success');
      setTimeout(() => setCopied(false), 2000);
    } else {
      onNotify('Could not copy image. You can download it instead.', 'error');
    }
  };

  const handlePrint = () => {
    if (!currentContent) {
      onNotify('Please enter some details first', 'error');
      return;
    }
    soundFx.playClick();
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      onNotify('Please allow popups to print', 'error');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print QR Code</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 90vh;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              color: #111;
              background: #fff;
              margin: 0;
            }
            .card {
              text-align: center;
              padding: 24px;
              border: 1px solid #ddd;
              border-radius: 8px;
              max-width: 420px;
            }
            img {
              width: 280px;
              height: 280px;
              display: block;
              margin: 0 auto 16px;
            }
            p { margin: 0; font-size: 13px; color: #555; word-break: break-all; }
            @media print {
              .card { border: none; }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <img src="${dataUrl}" alt="QR Code" />
            <p>${currentContent}</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Header */}
      <div className="pb-5 sm:pb-6 border-b border-zinc-800/80 mb-6 sm:mb-8">
        <h1 className="font-heading text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white">
          Generate QR Code
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Create clean QR codes for links, Wi-Fi, contacts, and text.
        </p>
      </div>

      {/* Main Layout - 2 columns on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: Types & Inputs (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Content Type Selector */}
          <div className="bg-zinc-900/90 p-1.5 rounded-xl border border-zinc-800">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {[
                { type: 'url', label: 'Link', icon: Link },
                { type: 'text', label: 'Text', icon: Type },
                { type: 'wifi', label: 'Wi-Fi', icon: Wifi },
                { type: 'email', label: 'Email', icon: Mail },
                { type: 'phone', label: 'Phone', icon: Phone },
                { type: 'vcard', label: 'Contact', icon: UserSquare2 },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = contentType === tab.type;
                return (
                  <button
                    key={tab.type}
                    id={`type-tab-${tab.type}`}
                    onClick={() => {
                      setContentType(tab.type as QRContentType);
                      soundFx.playClick();
                    }}
                    className={`flex flex-col items-center justify-center min-h-[46px] py-2 px-1 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-red-600 text-white font-semibold shadow-sm'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                    }`}
                  >
                    <Icon className="w-4 h-4 mb-1" />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 sm:p-6 space-y-4">
            <h2 className="text-sm font-semibold text-white">
              {contentType === 'url' && 'Link / URL'}
              {contentType === 'text' && 'Text Note'}
              {contentType === 'wifi' && 'Wi-Fi Network'}
              {contentType === 'email' && 'Email Message'}
              {contentType === 'phone' && 'Phone Number'}
              {contentType === 'vcard' && 'Contact Card'}
            </h2>

            {/* URL INPUT */}
            {contentType === 'url' && (
              <div className="space-y-2">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <Link className="w-4 h-4" />
                  </div>
                  <input
                    id="input-qr-url"
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full min-h-[44px] bg-black/60 border border-zinc-700/80 rounded-xl pl-10 pr-4 py-2.5 text-base sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* PLAIN TEXT INPUT */}
            {contentType === 'text' && (
              <div>
                <textarea
                  id="input-qr-text"
                  rows={4}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Enter text or message..."
                  className="w-full bg-black/60 border border-zinc-700/80 rounded-xl px-4 py-3 text-base sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors resize-y"
                />
              </div>
            )}

            {/* WI-FI INPUT */}
            {contentType === 'wifi' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      Network Name
                    </label>
                    <input
                      id="input-wifi-ssid"
                      type="text"
                      value={wifiData.ssid}
                      onChange={(e) => setWifiData({ ...wifiData, ssid: e.target.value })}
                      placeholder="My_WiFi_Network"
                      className="w-full min-h-[44px] bg-black/60 border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      Security
                    </label>
                    <select
                      id="input-wifi-enc"
                      value={wifiData.encryption}
                      onChange={(e) =>
                        setWifiData({ ...wifiData, encryption: e.target.value as 'WPA' | 'WEP' | 'nopass' })
                      }
                      className="w-full min-h-[44px] bg-black/60 border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-red-500"
                    >
                      <option value="WPA">WPA / WPA2 / WPA3</option>
                      <option value="WEP">WEP</option>
                      <option value="nopass">None (Open)</option>
                    </select>
                  </div>
                </div>

                {wifiData.encryption !== 'nopass' && (
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="input-wifi-pass"
                        type={showWifiPassword ? 'text' : 'password'}
                        value={wifiData.password}
                        onChange={(e) => setWifiData({ ...wifiData, password: e.target.value })}
                        placeholder="Network password"
                        className="w-full min-h-[44px] bg-black/60 border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white pr-10 placeholder-zinc-500 focus:outline-none focus:border-red-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowWifiPassword(!showWifiPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-white"
                      >
                        {showWifiPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <label className="flex items-center gap-2.5 text-xs text-zinc-400 cursor-pointer pt-1 min-h-[36px]">
                  <input
                    type="checkbox"
                    checked={wifiData.hidden}
                    onChange={(e) => setWifiData({ ...wifiData, hidden: e.target.checked })}
                    className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-red-600 focus:ring-red-500"
                  />
                  <span>Hidden Network</span>
                </label>
              </div>
            )}

            {/* EMAIL INPUT */}
            {contentType === 'email' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Email Address
                  </label>
                  <input
                    id="input-email-address"
                    type="email"
                    value={emailData.address}
                    onChange={(e) => setEmailData({ ...emailData, address: e.target.value })}
                    placeholder="name@example.com"
                    className="w-full min-h-[44px] bg-black/60 border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Subject
                  </label>
                  <input
                    id="input-email-subject"
                    type="text"
                    value={emailData.subject}
                    onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                    placeholder="Hello"
                    className="w-full min-h-[44px] bg-black/60 border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Body
                  </label>
                  <textarea
                    id="input-email-body"
                    rows={3}
                    value={emailData.body}
                    onChange={(e) => setEmailData({ ...emailData, body: e.target.value })}
                    placeholder="Write your message..."
                    className="w-full bg-black/60 border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 resize-none"
                  />
                </div>
              </div>
            )}

            {/* PHONE INPUT */}
            {contentType === 'phone' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Phone Number
                  </label>
                  <input
                    id="input-phone-number"
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full min-h-[44px] bg-black/60 border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
            )}

            {/* VCARD / CONTACT INPUT */}
            {contentType === 'vcard' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">First Name</label>
                    <input
                      type="text"
                      value={vcardData.firstName}
                      onChange={(e) => setVcardData({ ...vcardData, firstName: e.target.value })}
                      placeholder="Jane"
                      className="w-full min-h-[44px] bg-black/60 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-base sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={vcardData.lastName}
                      onChange={(e) => setVcardData({ ...vcardData, lastName: e.target.value })}
                      placeholder="Doe"
                      className="w-full min-h-[44px] bg-black/60 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-base sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Phone</label>
                    <input
                      type="text"
                      value={vcardData.phone}
                      onChange={(e) => setVcardData({ ...vcardData, phone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                      className="w-full min-h-[44px] bg-black/60 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-base sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Email</label>
                    <input
                      type="email"
                      value={vcardData.email}
                      onChange={(e) => setVcardData({ ...vcardData, email: e.target.value })}
                      placeholder="jane@example.com"
                      className="w-full min-h-[44px] bg-black/60 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-base sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Organization</label>
                    <input
                      type="text"
                      value={vcardData.company}
                      onChange={(e) => setVcardData({ ...vcardData, company: e.target.value })}
                      placeholder="Company or Studio"
                      className="w-full min-h-[44px] bg-black/60 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-base sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Title</label>
                    <input
                      type="text"
                      value={vcardData.title}
                      onChange={(e) => setVcardData({ ...vcardData, title: e.target.value })}
                      placeholder="Designer"
                      className="w-full min-h-[44px] bg-black/60 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-base sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Settings shortcut card */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 text-xs text-zinc-400">
            <span>Colors, quality, and margins can be configured in Settings.</span>
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 text-zinc-300 hover:text-white font-medium transition-colors py-1"
            >
              <Sliders className="w-3.5 h-3.5 text-red-500" />
              <span>Open Settings</span>
            </button>
          </div>
        </div>

        {/* Right Column: Preview & Download (5 Cols, sticky on desktop) */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
          {/* QR Preview Card */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center relative shadow-xl">
            <div className="w-full flex items-center justify-between mb-4">
              <span className="text-xs text-zinc-400 font-medium">QR Preview</span>
              {currentContent && (
                <span className="text-[11px] text-zinc-400 bg-black/40 px-2.5 py-0.5 rounded border border-zinc-800">
                  Ready to scan
                </span>
              )}
            </div>

            {/* QR Box with ample padding and strictly square aspect ratio */}
            <div className="w-full flex items-center justify-center py-2 sm:py-3">
              <div
                className="w-full max-w-[220px] xs:max-w-[250px] sm:max-w-[280px] md:max-w-[320px] aspect-square p-3 sm:p-5 rounded-2xl border border-zinc-800 transition-all flex items-center justify-center shadow-inner mx-auto"
                style={{ backgroundColor: currentContent ? settings.bgColor : '#0a0a0c' }}
              >
                {!currentContent ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-center p-3 sm:p-4 space-y-2">
                    <QrCode className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-700" />
                    <p className="text-xs text-zinc-400 max-w-[170px]">
                      Fill in the fields to generate a QR code
                    </p>
                  </div>
                ) : (
                  <canvas
                    ref={previewCanvasRef}
                    width={360}
                    height={360}
                    className="w-full h-full max-w-full max-h-full aspect-square object-contain block rounded"
                    style={{ imageRendering: 'pixelated' }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Download Card */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 sm:p-6 space-y-4">
            <h2 className="text-xs uppercase tracking-wider text-white font-semibold">
              Download Options
            </h2>

            {/* Resolution Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs text-zinc-400 font-medium">
                Resolution
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { size: 512, label: '512px' },
                  { size: 1024, label: '1024px' },
                  { size: 2048, label: '2048px' },
                ].map((res) => (
                  <button
                    key={res.size}
                    onClick={() => {
                      setResolution(res.size);
                      soundFx.playClick();
                    }}
                    className={`min-h-[40px] py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                      resolution === res.size
                        ? 'bg-red-600 text-white font-semibold shadow-sm'
                        : 'bg-black/50 text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-white'
                    }`}
                  >
                    {res.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                id="btn-download-png"
                onClick={handleDownloadPNG}
                disabled={!currentContent}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:hover:bg-red-600 text-white font-semibold text-xs sm:text-sm tracking-wide transition-all"
              >
                <Download className="w-4 h-4" />
                <span>PNG</span>
              </button>

              <button
                id="btn-download-svg"
                onClick={handleDownloadSVG}
                disabled={!currentContent}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-zinc-800 text-white font-semibold text-xs sm:text-sm tracking-wide border border-zinc-700 transition-all"
              >
                <Download className="w-4 h-4 text-red-400" />
                <span>SVG</span>
              </button>
            </div>

            {/* Secondary Utilities */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                id="btn-download-jpeg"
                onClick={handleDownloadJPEG}
                disabled={!currentContent}
                className="min-h-[42px] flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-black/60 hover:bg-zinc-800 disabled:opacity-40 text-zinc-300 border border-zinc-800 text-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>JPEG</span>
              </button>

              <button
                id="btn-copy-clipboard"
                onClick={handleCopyClipboard}
                disabled={!currentContent}
                className="min-h-[42px] flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-black/60 hover:bg-zinc-800 disabled:opacity-40 text-zinc-300 border border-zinc-800 text-xs transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              <button
                id="btn-print-qr"
                onClick={handlePrint}
                disabled={!currentContent}
                className="min-h-[42px] flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-black/60 hover:bg-zinc-800 disabled:opacity-40 text-zinc-300 border border-zinc-800 text-xs transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
