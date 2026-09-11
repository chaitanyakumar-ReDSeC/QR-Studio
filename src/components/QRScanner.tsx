import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import {
  Camera,
  CameraOff,
  Upload,
  Copy,
  ExternalLink,
  RefreshCw,
  Zap,
  ZapOff,
  Check,
  QrCode,
  FileImage,
  Wifi,
  Mail,
  Phone,
  UserCheck,
} from 'lucide-react';
import { ScanResult, QRContentType } from '../types';
import { parseScannedContent } from '../utils/qrUtils';
import { soundFx } from '../utils/audio';

interface QRScannerProps {
  soundEnabled: boolean;
  onNotify: (message: string, type?: 'success' | 'info' | 'error') => void;
  onSendToGenerator: (content: string, type: QRContentType) => void;
  onCameraStatusChange: (active: boolean) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({
  soundEnabled,
  onNotify,
  onSendToGenerator,
  onCameraStatusChange,
}) => {
  // Scanner state
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [torchAvailable, setTorchAvailable] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [isScanningPaused, setIsScanningPaused] = useState<boolean>(false);

  // Results state
  const [latestScan, setLatestScan] = useState<ScanResult | null>(null);
  const [lastScannedText, setLastScannedText] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // References
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastDetectionTimeRef = useRef<number>(0);

  // Enumerate available video input cameras
  const refreshDevices = async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices.filter((d) => d.kind === 'videoinput');
      setDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedDeviceId) {
        const backCam = videoInputs.find(
          (d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear')
        );
        setSelectedDeviceId(backCam ? backCam.deviceId : videoInputs[0].deviceId);
      }
    } catch {
      // Ignore
    }
  };

  // Start Camera Stream
  const startCamera = async (deviceId?: string) => {
    setCameraError(null);
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera is not supported on this browser or connection.');
      }

      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsCameraActive(true);
      onCameraStatusChange(true);

      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities = track.getCapabilities ? (track.getCapabilities() as { torch?: boolean }) : {};
        setTorchAvailable(Boolean(capabilities && capabilities.torch));
      }

      refreshDevices();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unable to access camera';
      console.warn('Camera stream failed:', errorMsg);
      setCameraError(
        errorMsg.includes('Permission') || errorMsg.includes('NotAllowedError')
          ? 'Camera permission was denied. Please allow camera access in your browser settings.'
          : errorMsg
      );
      setIsCameraActive(false);
      onCameraStatusChange(false);
    }
  };

  // Stop Camera Stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    setIsCameraActive(false);
    setIsTorchOn(false);
    onCameraStatusChange(false);
  }, [onCameraStatusChange]);

  // Toggle Flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && torchAvailable) {
      try {
        const newState = !isTorchOn;
        await track.applyConstraints({
          advanced: [{ torch: newState } as unknown as MediaTrackConstraintSet],
        });
        setIsTorchOn(newState);
        soundFx.playClick();
      } catch (err) {
        console.warn('Torch failed', err);
      }
    }
  };

  // Process detected code
  const handleDetectedCode = useCallback(
    (codeText: string) => {
      const now = Date.now();
      if (codeText === lastScannedText && now - lastDetectionTimeRef.current < 2500) {
        return;
      }

      lastDetectionTimeRef.current = now;
      setLastScannedText(codeText);

      if (soundEnabled) {
        soundFx.playScanSuccess();
      }
      if (navigator.vibrate) {
        navigator.vibrate([80]);
      }

      const result = parseScannedContent(codeText);
      setLatestScan(result);
      onNotify('QR code scanned successfully', 'success');
    },
    [soundEnabled, lastScannedText, onNotify]
  );

  // Main scanning loop
  useEffect(() => {
    if (!isCameraActive || isScanningPaused) return;

    let isMounted = true;

    const scanFrame = () => {
      if (!isMounted) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const width = video.videoWidth;
        const height = video.videoHeight;

        if (width > 0 && height > 0) {
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, width, height);
            const imageData = ctx.getImageData(0, 0, width, height);

            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            });

            if (code && code.data && code.data.trim()) {
              handleDetectedCode(code.data);
            }
          }
        }
      }

      animFrameIdRef.current = requestAnimationFrame(scanFrame);
    };

    animFrameIdRef.current = requestAnimationFrame(scanFrame);

    return () => {
      isMounted = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [isCameraActive, isScanningPaused, handleDetectedCode]);

  // Decode Image File
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      onNotify('Please select an image file', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);

        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        });

        if (code && code.data) {
          handleDetectedCode(code.data);
        } else {
          onNotify('No QR code found in this image', 'error');
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Clipboard paste support (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            processImageFile(blob);
            onNotify('Scanning pasted image...', 'info');
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const handleCopyScan = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    soundFx.playClick();
    onNotify('Copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const getTypeName = (detectedType: string) => {
    switch (detectedType) {
      case 'url':
        return 'Link / URL';
      case 'wifi':
        return 'Wi-Fi Network';
      case 'email':
        return 'Email Message';
      case 'phone':
        return 'Phone Number';
      case 'vcard':
        return 'Contact Card';
      default:
        return 'Text';
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 sm:pb-6 border-b border-zinc-800/80 mb-6 sm:mb-8">
        <div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="font-heading text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white">
              Scan QR Code
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono bg-zinc-900 text-zinc-300 border border-zinc-800">
              <span className={`w-2 h-2 rounded-full ${isCameraActive ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
              {isCameraActive ? 'Camera On' : 'Standby'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Point your camera at a QR code, or upload an image file.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Torch */}
          {torchAvailable && isCameraActive && (
            <button
              onClick={toggleTorch}
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center p-2.5 rounded-xl border text-xs transition-colors ${
                isTorchOn
                  ? 'bg-red-600 text-white border-red-500 shadow-sm'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
              }`}
              title="Toggle Flashlight"
            >
              {isTorchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
            </button>
          )}

          {/* Camera Switch / Restart */}
          {isCameraActive && (
            <button
              onClick={() => startCamera(selectedDeviceId)}
              className="min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-red-500" />
              <span>Restart</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Viewfinder (7 cols) and Scanned Result (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: Viewfinder */}
        <div className="lg:col-span-7 space-y-4">
          <div
            className={`relative w-full aspect-[4/3] sm:aspect-[16/10] bg-black rounded-2xl border-2 overflow-hidden transition-all ${
              isDragging
                ? 'border-red-500 bg-red-950/20'
                : 'border-zinc-800 hover:border-zinc-700'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files?.[0]) {
                processImageFile(e.dataTransfer.files[0]);
              }
            }}
          >
            {/* Live Video Feed */}
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                isCameraActive ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {/* Inactive state */}
            {!isCameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 sm:p-6 text-center bg-zinc-950/90 z-20">
                <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3">
                  <CameraOff className="w-6 h-6 text-zinc-500" />
                </div>
                <h2 className="text-base font-semibold text-white mb-1">
                  Camera Inactive
                </h2>
                <p className="text-xs text-zinc-400 max-w-sm mb-5">
                  {cameraError || 'Activate your camera to scan QR codes directly, or choose an image file.'}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => startCamera(selectedDeviceId)}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    Turn On Camera
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 border border-zinc-700"
                  >
                    <Upload className="w-4 h-4 text-red-400" />
                    Upload Image
                  </button>
                </div>
              </div>
            )}

            {/* Framing Reticle - sized appropriately for mobile and desktop */}
            {isCameraActive && (
              <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center p-4">
                <div className="relative w-48 h-48 xs:w-56 xs:h-56 sm:w-64 sm:h-64">
                  <div className="absolute top-0 left-0 w-7 h-7 border-t-2 border-l-2 border-red-500 rounded-tl" />
                  <div className="absolute top-0 right-0 w-7 h-7 border-t-2 border-r-2 border-red-500 rounded-tr" />
                  <div className="absolute bottom-0 left-0 w-7 h-7 border-b-2 border-l-2 border-red-500 rounded-bl" />
                  <div className="absolute bottom-0 right-0 w-7 h-7 border-b-2 border-r-2 border-red-500 rounded-br" />

                  {!isScanningPaused && (
                    <div className="absolute left-1 right-1 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_8px_#ef4444] animate-scan-laser" />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Camera controls bar */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="w-full sm:w-auto flex items-center gap-2 flex-1">
              <Camera className="w-4 h-4 text-zinc-400 flex-shrink-0" />
              <select
                value={selectedDeviceId}
                onChange={(e) => {
                  setSelectedDeviceId(e.target.value);
                  startCamera(e.target.value);
                }}
                className="w-full min-h-[44px] bg-black/60 border border-zinc-800 rounded-xl px-3 py-2 text-base sm:text-xs text-white focus:outline-none focus:border-red-500"
              >
                {devices.length === 0 && <option value="">Default Camera</option>}
                {devices.map((device, index) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${index + 1}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              {isCameraActive && (
                <button
                  onClick={() => {
                    setIsScanningPaused(!isScanningPaused);
                    soundFx.playClick();
                  }}
                  className={`flex-1 sm:flex-none min-h-[44px] px-3.5 py-2 rounded-xl border text-xs transition-colors ${
                    isScanningPaused
                      ? 'bg-red-600 text-white border-red-500'
                      : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:text-white'
                  }`}
                >
                  {isScanningPaused ? 'Resume' : 'Pause'}
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    processImageFile(e.target.files[0]);
                  }
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 sm:flex-none min-h-[44px] flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-black/60 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs transition-colors"
              >
                <FileImage className="w-4 h-4 text-red-400" />
                <span>Upload Image</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Result Box */}
        <div className="lg:col-span-5 space-y-6">
          {latestScan ? (
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 sm:p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <span className="text-xs uppercase tracking-wider text-white font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Scanned Result
                </span>
                <span className="text-xs text-zinc-400 font-mono">
                  {new Date(latestScan.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Type and content */}
              <div className="space-y-2">
                <span className="text-xs text-red-400 font-medium flex items-center gap-1.5">
                  {latestScan.detectedType === 'url' && <ExternalLink className="w-3.5 h-3.5" />}
                  {latestScan.detectedType === 'wifi' && <Wifi className="w-3.5 h-3.5" />}
                  {latestScan.detectedType === 'email' && <Mail className="w-3.5 h-3.5" />}
                  {latestScan.detectedType === 'phone' && <Phone className="w-3.5 h-3.5" />}
                  {latestScan.detectedType === 'vcard' && <UserCheck className="w-3.5 h-3.5" />}
                  <span>{getTypeName(latestScan.detectedType)}</span>
                </span>

                <div className="bg-black/70 rounded-xl p-3 border border-zinc-800 text-xs text-zinc-200 break-all max-h-48 overflow-y-auto font-mono">
                  {latestScan.rawText}
                </div>
              </div>

              {/* Wi-Fi info if applicable */}
              {latestScan.detectedType === 'wifi' && latestScan.parsedDetails?.wifi && (
                <div className="bg-black/50 border border-zinc-800 rounded-xl p-3 space-y-2 text-xs">
                  <div className="flex justify-between text-zinc-400">
                    <span>Network:</span>
                    <span className="text-white font-semibold">{latestScan.parsedDetails.wifi.ssid}</span>
                  </div>
                  {latestScan.parsedDetails.wifi.password && (
                    <div className="flex justify-between text-zinc-400 items-center">
                      <span>Password:</span>
                      <span className="text-white font-mono">{latestScan.parsedDetails.wifi.password}</span>
                    </div>
                  )}
                  {latestScan.parsedDetails.wifi.password && (
                    <button
                      onClick={() => handleCopyScan(latestScan.parsedDetails?.wifi?.password || '')}
                      className="w-full min-h-[40px] py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 mt-2"
                    >
                      <Copy className="w-3.5 h-3.5 text-red-400" />
                      Copy Password
                    </button>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="space-y-2 pt-1">
                {latestScan.detectedType === 'url' && (
                  <a
                    href={latestScan.rawText}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full min-h-[44px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs sm:text-sm tracking-wide transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Open Link</span>
                  </a>
                )}

                {latestScan.detectedType === 'phone' && (
                  <a
                    href={latestScan.rawText}
                    className="w-full min-h-[44px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs sm:text-sm tracking-wide transition-all"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Call Number</span>
                  </a>
                )}

                {latestScan.detectedType === 'email' && (
                  <a
                    href={latestScan.rawText}
                    className="w-full min-h-[44px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs sm:text-sm tracking-wide transition-all"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Send Email</span>
                  </a>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleCopyScan(latestScan.rawText)}
                    className="min-h-[44px] flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 text-xs transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Text</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      soundFx.playClick();
                      let gType: QRContentType = 'text';
                      if (latestScan.detectedType === 'url') gType = 'url';
                      else if (latestScan.detectedType === 'wifi') gType = 'wifi';
                      else if (latestScan.detectedType === 'email') gType = 'email';
                      else if (latestScan.detectedType === 'phone') gType = 'phone';
                      else if (latestScan.detectedType === 'vcard') gType = 'vcard';

                      onSendToGenerator(latestScan.rawText, gType);
                      onNotify('Loaded in QR Generator', 'info');
                    }}
                    className="min-h-[44px] flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-black/60 hover:bg-zinc-800 text-red-400 border border-zinc-800 text-xs transition-colors"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Edit QR</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-3 min-h-[220px]">
              <QrCode className="w-10 h-10 text-zinc-700" />
              <h2 className="text-sm font-semibold text-white">
                Ready to Scan
              </h2>
              <p className="text-xs text-zinc-400 max-w-xs">
                Hold your camera up to a QR code or upload an image to scan it.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
