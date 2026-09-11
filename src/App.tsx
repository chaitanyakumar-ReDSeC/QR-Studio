/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Github } from 'lucide-react';
import { Header } from './components/Header';
import { QRGenerator } from './components/QRGenerator';
import { QRScanner } from './components/QRScanner';
import { SettingsView } from './components/SettingsView';
import { ToastContainer } from './components/Toast';
import { AppSettings, QRContentType, ToastMessage } from './types';

const SETTINGS_STORAGE_KEY = 'qr_studio_user_settings';

const DEFAULT_SETTINGS: AppSettings = {
  fgColor: '#000000',
  bgColor: '#ffffff',
  colorPreset: 'classic',
  errorCorrectionLevel: 'M',
  margin: 2,
  defaultResolution: 1024,
  icon: 'none',
  soundEnabled: true,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'generator' | 'scanner' | 'settings'>('generator');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Persistent user settings
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // Ignore
    }
    return DEFAULT_SETTINGS;
  });

  // Prefill state when sending from Scanner to Generator
  const [generatorPrefill, setGeneratorPrefill] = useState<{
    content: string;
    type: QRContentType;
  }>({
    content: '',
    type: 'url',
  });

  // Save settings on update
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore
    }
  }, [settings]);

  // Toast notification helper
  const addToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'info') => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const handleResetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    try {
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
    } catch {
      // Ignore
    }
  };

  // Send content to Generator from Scanner
  const handleSendToGenerator = useCallback((content: string, type: QRContentType) => {
    setGeneratorPrefill({ content, type });
    setActiveTab('generator');
  }, []);

  // Keyboard Shortcuts (G: Generator, S: Scanner)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

      if (e.key === 'g' || e.key === 'G') {
        setActiveTab('generator');
      } else if (e.key === 's' || e.key === 'S') {
        setActiveTab('scanner');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white flex flex-col font-sans selection:bg-red-600 selection:text-white">
      {/* Header with three navigation tabs */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isCameraActive={isCameraActive}
      />

      {/* Main Content */}
      <main className="flex-1 w-full pb-16">
        {activeTab === 'generator' && (
          <QRGenerator
            key={generatorPrefill.content + generatorPrefill.type}
            settings={settings}
            onOpenSettings={() => setActiveTab('settings')}
            initialContent={generatorPrefill.content}
            initialType={generatorPrefill.type}
            onNotify={addToast}
          />
        )}

        {activeTab === 'scanner' && (
          <QRScanner
            soundEnabled={settings.soundEnabled}
            onNotify={addToast}
            onSendToGenerator={handleSendToGenerator}
            onCameraStatusChange={setIsCameraActive}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onResetSettings={handleResetSettings}
            onNotify={addToast}
          />
        )}
      </main>

      {/* Subtle Minimalist Footer */}
      <footer className="w-full border-t border-zinc-900 bg-[#070709] py-5 text-zinc-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
            <span className="text-zinc-400 font-medium">QR Studio</span>
            <span className="text-zinc-700">•</span>
            <span className="text-zinc-400">Developed by Chaitanya Kumar Sathivada</span>
          </div>

          <a
            id="btn-github-profile"
            href="https://www.github.com/chaitanyakumar-ReDSeC"
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[40px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors text-xs font-medium"
          >
            <Github className="w-4 h-4 text-zinc-300" />
            <span>GitHub</span>
          </a>
        </div>
      </footer>

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
