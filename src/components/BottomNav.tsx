import React from 'react';
import { ActiveTab } from '../types';
import { ShoppingBag, Receipt, Users, BarChart3 } from 'lucide-react';
import { preloadLazyChunk } from '../utils/preload';

interface BottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  cartCount: number;
  theme?: 'light' | 'dark';
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab, cartCount, theme = 'light' }) => {
  const isDark = theme === 'dark';

  const handlePreload = (tabId: ActiveTab) => {
    if (tabId === 'nota') preloadLazyChunk('nota');
    else if (tabId === 'laporan') preloadLazyChunk('laporan');
  };

  const tabs = [
    { id: 'katalog' as ActiveTab, label: 'Katalog', icon: ShoppingBag },
    { id: 'kasir' as ActiveTab, label: 'Kasir', icon: Receipt, badge: cartCount },
    { id: 'nota' as ActiveTab, label: 'Nota', icon: Receipt },
    { id: 'customer' as ActiveTab, label: 'Customer', icon: Users },
    { id: 'laporan' as ActiveTab, label: 'Laporan', icon: BarChart3 },
  ];

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-40 backdrop-blur-md transition-colors border-t pb-[env(safe-area-inset-bottom,0px)] ${
        isDark
          ? 'bg-neutral-900/95 border-neutral-800'
          : 'bg-white/95 border-neutral-200/80 shadow-[0_-2px_10px_rgba(0,0,0,0.03)]'
      }`}
    >
      <div className="max-w-lg mx-auto grid grid-cols-5 h-16 items-center px-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              onPointerEnter={() => handlePreload(tab.id)}
              onTouchStart={() => handlePreload(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1 transition-all duration-150 min-h-[48px] touch-manipulation select-none ${
                isActive
                  ? isDark
                    ? 'text-white'
                    : 'text-neutral-950'
                  : isDark
                  ? 'text-neutral-400 hover:text-neutral-200'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.7]'
                  }`}
                />
                {tab.badge && tab.badge > 0 ? (
                  <span
                    className={`absolute -top-1.5 -right-2.5 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-xs ${
                      isDark
                        ? 'bg-neutral-100 text-neutral-950'
                        : 'bg-neutral-900 text-white'
                    }`}
                  >
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                ) : null}
              </div>
              <span
                className={`text-[10px] mt-1 tracking-tight ${
                  isActive ? 'font-bold' : 'font-medium'
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <span
                  className={`absolute bottom-1 w-1 h-1 rounded-full ${
                    isDark ? 'bg-white' : 'bg-neutral-900'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
