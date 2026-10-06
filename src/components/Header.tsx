import React from 'react';
import { StoreSettings, ActiveTab } from '../types';
import { Settings, Sun, Moon, ShieldCheck, Lock } from 'lucide-react';

interface HeaderProps {
  settings: StoreSettings;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  isAdminAuthenticated?: boolean;
  onLockAdmin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  activeTab,
  setActiveTab,
  theme,
  onToggleTheme,
  isAdminAuthenticated = false,
  onLockAdmin,
}) => {
  const isDark = theme === 'dark';

  return (
    <header
      className={`sticky top-0 z-30 px-4 py-3 select-none transition-colors border-b ${
        isDark
          ? 'bg-neutral-900 border-neutral-800'
          : 'bg-white border-neutral-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.02)]'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div>
            <div className="flex items-center gap-1.5">
              <h1
                className={`text-sm font-bold tracking-tight truncate max-w-[140px] sm:max-w-[180px] ${
                  isDark ? 'text-white' : 'text-neutral-900'
                }`}
              >
                {settings.storeName}
              </h1>
              {isAdminAuthenticated && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-0.5">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  <span>Admin</span>
                </span>
              )}
            </div>
            <p
              className={`text-[10px] truncate max-w-[140px] sm:max-w-[180px] -mt-0.5 ${
                isDark ? 'text-neutral-400' : 'text-neutral-500'
              }`}
            >
              {settings.tagline || 'Katalog & Kasir Toko'}
            </p>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5">
          {/* Quick Theme Toggle (Light / Dark) */}
          <button
            onClick={onToggleTheme}
            title={isDark ? 'Ganti ke Mode Terang (Putih)' : 'Ganti ke Mode Gelap'}
            className={`min-h-[34px] min-w-[34px] p-1.5 rounded-lg text-xs font-medium flex items-center justify-center transition-all ${
              isDark
                ? 'bg-neutral-800 text-amber-400 hover:bg-neutral-700'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
            aria-label="Toggle tema terang/gelap"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Settings / Admin Button */}
          <button
            onClick={() => setActiveTab('setelan')}
            aria-label="Pengaturan & Database"
            title={isAdminAuthenticated ? 'Admin Aktif - Pengaturan Database' : 'Akses Admin Database'}
            className={`min-h-[34px] min-w-[34px] p-1.5 rounded-lg transition-colors flex items-center justify-center ${
              activeTab === 'setelan'
                ? isDark
                  ? 'bg-neutral-800 text-white'
                  : 'bg-neutral-900 text-white font-bold'
                : isAdminAuthenticated
                ? isDark
                  ? 'bg-neutral-800 text-emerald-400 border border-neutral-700'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : isDark
                ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100'
            }`}
          >
            {isAdminAuthenticated ? (
              <Settings className="w-4 h-4" />
            ) : (
              <Lock className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
