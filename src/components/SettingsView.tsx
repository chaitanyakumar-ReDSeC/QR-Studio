import React from 'react';
import { Sliders, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { AppSettings, ErrorCorrectionLevel, QRColorPreset } from '../types';
import { soundFx } from '../utils/audio';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onResetSettings: () => void;
  onNotify: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onResetSettings,
  onNotify,
}) => {
  const handlePresetSelect = (preset: QRColorPreset) => {
    soundFx.playClick();
    let fg = settings.fgColor;
    let bg = settings.bgColor;

    switch (preset) {
      case 'classic':
        fg = '#000000';
        bg = '#ffffff';
        break;
      case 'inverted':
        fg = '#ffffff';
        bg = '#09090b';
        break;
      case 'crimson_dark':
        fg = '#ef4444';
        bg = '#09090b';
        break;
      case 'crimson_white':
        fg = '#dc2626';
        bg = '#ffffff';
        break;
      case 'black_crimson':
        fg = '#09090b';
        bg = '#ef4444';
        break;
      default:
        break;
    }

    onUpdateSettings({
      colorPreset: preset,
      fgColor: fg,
      bgColor: bg,
    });
    onNotify('Theme updated', 'info');
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Header */}
      <div className="pb-5 sm:pb-6 border-b border-zinc-800 mb-6 sm:mb-8">
        <h1 className="font-heading text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <Sliders className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
          Settings
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Customize QR appearance, default export quality, and scanning preferences.
        </p>
      </div>

      <div className="space-y-6 sm:space-y-8">
        {/* Color Palette & Themes */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 sm:p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-white">Theme & Color Palette</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Select a pre-configured palette or define custom colors</p>
            </div>
            {/* Live swatch */}
            <div
              className="w-8 h-8 rounded-lg border border-zinc-700 flex items-center justify-center shadow-inner flex-shrink-0"
              style={{ backgroundColor: settings.bgColor }}
              title="Preview background"
            >
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: settings.fgColor }}
                title="Preview foreground"
              />
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="space-y-2">
            <label className="block text-xs text-zinc-400 font-medium">Presets</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
              {[
                { id: 'classic', label: 'Classic Black', bg: 'bg-white', fg: 'bg-black' },
                { id: 'inverted', label: 'Pitch Inverted', bg: 'bg-zinc-950 border border-zinc-700', fg: 'bg-white' },
                { id: 'crimson_dark', label: 'Crimson Stealth', bg: 'bg-zinc-950 border border-zinc-700', fg: 'bg-red-500' },
                { id: 'crimson_white', label: 'Ruby White', bg: 'bg-white', fg: 'bg-red-600' },
                { id: 'black_crimson', label: 'Vivid Red', bg: 'bg-red-600', fg: 'bg-black' },
              ].map((p) => {
                const isActive = settings.colorPreset === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handlePresetSelect(p.id as QRColorPreset)}
                    className={`min-h-[46px] flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                      isActive
                        ? 'border-red-500 bg-red-950/20'
                        : 'border-zinc-800 bg-black/40 hover:border-zinc-700'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-md ${p.bg} flex items-center justify-center flex-shrink-0`}>
                      <div className={`w-2.5 h-2.5 rounded-sm ${p.fg}`} />
                    </div>
                    <span className="text-xs text-zinc-200 font-medium truncate">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Color Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="block text-xs text-zinc-400 font-medium">Foreground Color</label>
              <div className="min-h-[44px] flex items-center gap-3 bg-black/50 border border-zinc-800 rounded-xl p-2.5">
                <input
                  type="color"
                  value={settings.fgColor}
                  onChange={(e) =>
                    onUpdateSettings({
                      fgColor: e.target.value,
                      colorPreset: 'custom',
                    })
                  }
                  className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.fgColor}
                  onChange={(e) =>
                    onUpdateSettings({
                      fgColor: e.target.value,
                      colorPreset: 'custom',
                    })
                  }
                  className="bg-transparent text-sm font-mono text-white uppercase focus:outline-none flex-1"
                  placeholder="#000000"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs text-zinc-400 font-medium">Background Color</label>
              <div className="min-h-[44px] flex items-center gap-3 bg-black/50 border border-zinc-800 rounded-xl p-2.5">
                <input
                  type="color"
                  value={settings.bgColor}
                  onChange={(e) =>
                    onUpdateSettings({
                      bgColor: e.target.value,
                      colorPreset: 'custom',
                    })
                  }
                  className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.bgColor}
                  onChange={(e) =>
                    onUpdateSettings({
                      bgColor: e.target.value,
                      colorPreset: 'custom',
                    })
                  }
                  className="bg-transparent text-sm font-mono text-white uppercase focus:outline-none flex-1"
                  placeholder="#ffffff"
                />
              </div>
            </div>
          </div>
        </div>

        {/* QR Properties: Quality, Border & Emblem */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 sm:p-6 space-y-6">
          <div className="border-b border-zinc-800/80 pb-3">
            <h2 className="text-sm sm:text-base font-semibold text-white">QR Code Configuration</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Control scannability, padding, and center logo</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            {/* Error correction */}
            <div className="space-y-1.5">
              <label className="block text-xs text-zinc-400 font-medium">Scan Quality</label>
              <select
                value={settings.errorCorrectionLevel}
                onChange={(e) =>
                  onUpdateSettings({
                    errorCorrectionLevel: e.target.value as ErrorCorrectionLevel,
                  })
                }
                className="w-full min-h-[44px] bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2 text-base sm:text-xs text-white focus:outline-none focus:border-red-500"
              >
                <option value="L">Fast (Low redundancy)</option>
                <option value="M">Standard (Recommended)</option>
                <option value="Q">Enhanced (Good for print)</option>
                <option value="H">Maximum (Best scannability)</option>
              </select>
            </div>

            {/* Margin */}
            <div className="space-y-1.5">
              <label className="block text-xs text-zinc-400 font-medium">Border Spacing</label>
              <select
                value={settings.margin}
                onChange={(e) => onUpdateSettings({ margin: Number(e.target.value) })}
                className="w-full min-h-[44px] bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2 text-base sm:text-xs text-white focus:outline-none focus:border-red-500"
              >
                <option value={1}>Compact</option>
                <option value={2}>Normal (Recommended)</option>
                <option value={4}>Spacious</option>
              </select>
            </div>

            {/* Center Logo */}
            <div className="space-y-1.5">
              <label className="block text-xs text-zinc-400 font-medium">Center Icon</label>
              <select
                value={settings.icon}
                onChange={(e) =>
                  onUpdateSettings({
                    icon: e.target.value as AppSettings['icon'],
                  })
                }
                className="w-full min-h-[44px] bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2 text-base sm:text-xs text-white focus:outline-none focus:border-red-500"
              >
                <option value="none">None</option>
                <option value="link">Link</option>
                <option value="wifi">Wi-Fi</option>
                <option value="shield">Shield</option>
                <option value="star">Star</option>
                <option value="qr">QR Symbol</option>
              </select>
            </div>
          </div>

          {/* Export Resolution */}
          <div className="space-y-2 pt-2">
            <label className="block text-xs text-zinc-400 font-medium">Default Download Size</label>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { size: 512, label: '512px' },
                { size: 1024, label: '1024px (HD)' },
                { size: 2048, label: '2048px (4K)' },
              ].map((res) => (
                <button
                  key={res.size}
                  onClick={() => onUpdateSettings({ defaultResolution: res.size })}
                  className={`min-h-[42px] py-2 px-3 rounded-xl text-xs font-medium transition-all ${
                    settings.defaultResolution === res.size
                      ? 'bg-red-600 text-white font-semibold shadow-sm'
                      : 'bg-black/50 text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-white'
                  }`}
                >
                  {res.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Audio & Feedback */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-white">Sound Effects</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Play an audible tone when a QR code is detected by the scanner
              </p>
            </div>
            <button
              onClick={() => {
                const next = !settings.soundEnabled;
                onUpdateSettings({ soundEnabled: next });
                if (next) soundFx.playScanSuccess();
              }}
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center p-2.5 rounded-xl border transition-colors ${
                settings.soundEnabled
                  ? 'bg-red-600 text-white border-red-500 shadow-sm'
                  : 'bg-zinc-900 text-zinc-500 border-zinc-800'
              }`}
            >
              {settings.soundEnabled ? (
                <Volume2 className="w-5 h-5" />
              ) : (
                <VolumeX className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Reset Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            onClick={() => {
              onResetSettings();
              onNotify('Reset settings to default', 'info');
            }}
            className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 text-xs font-medium transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset to Defaults</span>
          </button>

          <span className="text-xs text-zinc-500">
            Changes save automatically
          </span>
        </div>
      </div>
    </div>
  );
};
