import React, { useState, useEffect, useRef } from 'react';
import { QrCode, ScanLine, Settings, Menu, X } from 'lucide-react';

interface HeaderProps {
  activeTab: 'generator' | 'scanner' | 'settings';
  onSelectTab: (tab: 'generator' | 'scanner' | 'settings') => void;
  isCameraActive: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  isCameraActive,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);

  // Close mobile menu when clicking outside the entire header
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [mobileMenuOpen]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const handleTabClick = (tab: 'generator' | 'scanner' | 'settings') => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header ref={headerRef} className="w-full bg-[#0a0a0c] border-b border-zinc-800/80 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Logo & Brand Identity */}
          <div
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => handleTabClick('generator')}
          >
            <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-700/80 flex items-center justify-center relative overflow-hidden group">
              <QrCode className="w-5 h-5 text-red-500 transition-transform duration-300 group-hover:scale-110" />
            </div>

            <span className="font-heading font-bold text-lg sm:text-xl tracking-tight text-white">
              QR Studio
            </span>
          </div>

          {/* Desktop Navigation Tabs: Visible on md+ */}
          <nav className="hidden md:flex items-center p-1 bg-zinc-900/90 border border-zinc-800 rounded-xl">
            <button
              id="nav-tab-generator"
              onClick={() => handleTabClick('generator')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'generator'
                  ? 'bg-red-600 text-white shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>Generate QR</span>
            </button>

            <button
              id="nav-tab-scanner"
              onClick={() => handleTabClick('scanner')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all relative ${
                activeTab === 'scanner'
                  ? 'bg-red-600 text-white shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <ScanLine className="w-4 h-4" />
              <span>Scan QR</span>
              {isCameraActive && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute -top-0.5 -right-0.5" />
              )}
            </button>

            <button
              id="nav-tab-settings"
              onClick={() => handleTabClick('settings')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'settings'
                  ? 'bg-red-600 text-white shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </nav>

          {/* Mobile Hamburger Button: Visible on < md */}
          <div className="flex md:hidden items-center">
            <button
              id="btn-mobile-menu-toggle"
              type="button"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex items-center justify-center w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 active:bg-zinc-800 transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-red-500" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Slide-down Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-800 bg-[#0c0c0e]/95 backdrop-blur-md px-4 pt-3 pb-5 space-y-2 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          <button
            id="mobile-nav-generator"
            type="button"
            onClick={() => handleTabClick('generator')}
            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'generator'
                ? 'bg-red-600 text-white font-semibold shadow-sm'
                : 'bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 hover:text-white border border-zinc-800/80 active:bg-zinc-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <QrCode className="w-5 h-5" />
              <span>Generate QR</span>
            </div>
            {activeTab === 'generator' && (
              <span className="text-[11px] uppercase tracking-wider bg-red-700 px-2 py-0.5 rounded">
                Active
              </span>
            )}
          </button>

          <button
            id="mobile-nav-scanner"
            type="button"
            onClick={() => handleTabClick('scanner')}
            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-medium transition-colors relative ${
              activeTab === 'scanner'
                ? 'bg-red-600 text-white font-semibold shadow-sm'
                : 'bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 hover:text-white border border-zinc-800/80 active:bg-zinc-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <ScanLine className="w-5 h-5" />
              <span>Scan QR</span>
              {isCameraActive && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
              )}
            </div>
            {activeTab === 'scanner' && (
              <span className="text-[11px] uppercase tracking-wider bg-red-700 px-2 py-0.5 rounded">
                Active
              </span>
            )}
          </button>

          <button
            id="mobile-nav-settings"
            type="button"
            onClick={() => handleTabClick('settings')}
            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'settings'
                ? 'bg-red-600 text-white font-semibold shadow-sm'
                : 'bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 hover:text-white border border-zinc-800/80 active:bg-zinc-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </div>
            {activeTab === 'settings' && (
              <span className="text-[11px] uppercase tracking-wider bg-red-700 px-2 py-0.5 rounded">
                Active
              </span>
            )}
          </button>
        </div>
      )}
    </header>
  );
};
