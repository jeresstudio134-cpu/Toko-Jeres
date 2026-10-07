/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Product, Customer, Order, StoreSettings, CartItem, ActiveTab } from './types';
import { ApiService } from './services/api';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { KatalogView } from './components/KatalogView';
import { KasirView } from './components/KasirView';
import { CustomerView } from './components/CustomerView';
import { DelayedFallback } from './components/DelayedFallback';
import { preloadAllLazyComponents } from './utils/preload';

const NotaView = lazy(() =>
  import('./components/NotaView').then(m => ({ default: m.NotaView }))
);
const LaporanView = lazy(() =>
  import('./components/LaporanView').then(m => ({ default: m.LaporanView }))
);
const SetelanView = lazy(() =>
  import('./components/SetelanView').then(m => ({ default: m.SetelanView }))
);

const CACHE_KEY = 'jeres_cache_v1';
const THEME_KEY = 'jeres_theme';

interface AppCache {
  products?: Product[];
  customers?: Customer[];
  orders?: Order[];
  settings?: StoreSettings;
}

const loadAppCache = (): AppCache | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Gagal membaca cache lokal:', err);
  }
  return null;
};

export default function App() {
  const cached = React.useMemo(() => loadAppCache(), []);

  const [products, setProducts] = useState<Product[]>(() => cached?.products || []);
  const [customers, setCustomers] = useState<Customer[]>(() => cached?.customers || []);
  const [orders, setOrders] = useState<Order[]>(() => cached?.orders || []);
  const [settings, setSettings] = useState<StoreSettings>(() => ({
    storeName: 'JERES STUDIO',
    tagline: 'Toko & Kasir HP',
    address: 'Jl. Senopati No. 42, Jakarta Selatan',
    phone: '0812-8899-7722',
    receiptFooter: 'Terima kasih atas kunjungan Anda!\nBarang yang sudah dibeli tidak dapat ditukar.',
    paperWidth: '58mm',
    taxPercent: 11,
    enableTax: false,
    currency: 'IDR',
    theme: 'light',
    adminPin: '1234',
    ...(cached?.settings || {}),
  }));
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState<boolean>(() => !!cached);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('katalog');
  const [, startTransition] = React.useTransition();

  const handleTabChange = (newTab: ActiveTab) => {
    startTransition(() => {
      setActiveTab(newTab);
    });
  };

  const [activeOrder, setActiveOrder] = useState<Order | null>(() => {
    return cached?.orders && cached.orders.length > 0 ? cached.orders[0] : null;
  });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_KEY);
      if (savedTheme === 'light' || savedTheme === 'dark') {
        return savedTheme;
      }
    } catch {}
    return cached?.settings?.theme || 'light';
  });
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('kios_admin_auth') === 'true';
    } catch {
      return false;
    }
  });

  // Sinkronkan tema ke HTML dan LocalStorage secara konsisten
  useEffect(() => {
    const isD = theme === 'dark';
    if (isD) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.backgroundColor = '#0a0a0a';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.backgroundColor = '#fafafa';
    }
    const meta = document.getElementById('meta-theme-color');
    if (meta) {
      meta.setAttribute('content', isD ? '#0a0a0a' : '#ffffff');
    }
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {}
  }, [theme]);

  // Preload semua komponen lazy setelah halaman utama tampil (requestIdleCallback / 1500ms)
  useEffect(() => {
    const runPreload = () => {
      preloadAllLazyComponents();
    };

    if (typeof window !== 'undefined') {
      if ('requestIdleCallback' in window) {
        const id = (window as any).requestIdleCallback(runPreload, { timeout: 2000 });
        return () => (window as any).cancelIdleCallback(id);
      } else {
        const timer = setTimeout(runPreload, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  // Load initial data via /api/bootstrap (Stale-While-Revalidate)
  const fetchBootstrap = async () => {
    setIsValidating(true);
    try {
      const data = await ApiService.getBootstrap();
      if (Array.isArray(data.products)) setProducts(data.products);
      if (Array.isArray(data.customers)) setCustomers(data.customers);
      if (Array.isArray(data.orders)) {
        setOrders(data.orders);
        if (data.orders.length > 0) {
          setActiveOrder(prev => prev ?? data.orders[0]);
        }
      }
      if (data.settings) {
        setSettings(prev => ({
          ...prev,
          ...data.settings,
          adminPin: data.settings.adminPin || prev.adminPin || '1234',
        }));
        if (data.settings.theme) {
          setTheme(data.settings.theme);
          try {
            localStorage.setItem(THEME_KEY, data.settings.theme);
          } catch {}
        }
      }

      // Simpan ke cache tanpa data sensitif seperti adminPin
      try {
        const { adminPin, ...safeSettings } = data.settings || ({} as any);
        const toCache: AppCache = {
          products: data.products,
          customers: data.customers,
          orders: data.orders,
          settings: safeSettings as StoreSettings,
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(toCache));
      } catch (cacheErr) {
        console.warn('Gagal menyimpan cache:', cacheErr);
      }
    } catch (e) {
      console.error('Error fetching bootstrap data:', e);
    } finally {
      setIsLoaded(true);
      setIsValidating(false);
    }
  };

  useEffect(() => {
    fetchBootstrap();
  }, []);

  useEffect(() => {
    if (settings.storeName) {
      document.title = `${settings.storeName} - Toko & Kasir HP`;
    }
  }, [settings.storeName]);

  const handleToggleTheme = async () => {
    const nextTheme: 'light' | 'dark' = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    const updatedSettings: StoreSettings = { ...settings, theme: nextTheme };
    setSettings(updatedSettings);
    try {
      await ApiService.updateSettings({ theme: nextTheme });
    } catch (err) {
      console.error('Failed saving theme to server:', err);
    }
  };

  const handleSetAdminAuth = (val: boolean) => {
    setIsAdminAuthenticated(val);
    try {
      if (val) {
        sessionStorage.setItem('kios_admin_auth', 'true');
      } else {
        sessionStorage.removeItem('kios_admin_auth');
      }
    } catch {
      // ignore
    }
  };

  // Cart operations
  const addToCart = (product: Product) => {
    setCart(prev => {
      const idx = prev.findIndex(item => item.product.id === product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          quantity: Math.min(product.stock, next[idx].quantity + 1),
        };
        return next;
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const idx = prev.findIndex(item => item.product.id === productId);
      if (idx >= 0) {
        if (prev[idx].quantity > 1) {
          const next = [...prev];
          next[idx] = { ...next[idx], quantity: next[idx].quantity - 1 };
          return next;
        }
        return prev.filter(item => item.product.id !== productId);
      }
      return prev;
    });
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(item => item.product.id !== productId));
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId
          ? { ...item, quantity: Math.min(item.product.stock, quantity) }
          : item
      )
    );
  };

  const updateCartDimensions = (productId: string, length?: number, width?: number) => {
    setCart(prev =>
      prev.map(item => {
        if (item.product.id !== productId) return item;
        const area = (length && width && length > 0 && width > 0) ? length * width : undefined;
        return {
          ...item,
          length,
          width,
          area,
        };
      })
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  /**
   * Transaksi Selesai via Full Database API
   */
  const handleOrderCompleted = async (newOrder: Order) => {
    try {
      const result = await ApiService.createOrder(newOrder);
      const savedOrder = result.order;

      setOrders(prev => [savedOrder, ...prev]);
      setActiveOrder(savedOrder);
      clearCart();
      setActiveTab('nota');

      Promise.all([ApiService.getProducts(), ApiService.getCustomers()])
        .then(([updatedProducts, updatedCustomers]) => {
          setProducts(updatedProducts);
          setCustomers(updatedCustomers);
        })
        .catch(err => console.error('Failed refreshing data:', err));
    } catch (err: any) {
      console.error('Order creation failed:', err);
      alert('Gagal memproses transaksi ke database server: ' + err.message);
    }
  };

  const handleUpdateSettings = async (newSettings: StoreSettings) => {
    try {
      const updated = await ApiService.updateSettings(newSettings);
      setSettings(updated);
      if (updated.theme) {
        setTheme(updated.theme);
      }
    } catch (err: any) {
      console.error('Failed updating settings:', err);
      alert('Gagal menyimpan pengaturan ke database: ' + err.message);
    }
  };

  const handleUpdateProducts = async (newProducts: Product[]) => {
    const before = products;
    setProducts(newProducts);
    try {
      const beforeMap = new Map(before.map(p => [p.id, p]));
      const newIds = new Set(newProducts.map(p => p.id));
      const ops: Promise<unknown>[] = [];

      for (const p of newProducts) {
        const old = beforeMap.get(p.id);
        if (!old) ops.push(ApiService.createProduct(p));
        else if (JSON.stringify(old) !== JSON.stringify(p)) ops.push(ApiService.updateProduct(p.id, p));
      }
      for (const p of before) {
        if (!newIds.has(p.id)) ops.push(ApiService.deleteProduct(p.id));
      }

      await Promise.all(ops);
      setProducts(await ApiService.getProducts());
    } catch (err: any) {
      console.error('Failed saving products:', err);
      alert('Gagal menyimpan menu ke database: ' + err.message);
      try {
        setProducts(await ApiService.getProducts());
      } catch {
        setProducts(before);
      }
    }
  };

  const handleAddCustomer = async (newCust: Customer) => {
    try {
      const created = await ApiService.createCustomer(newCust);
      setCustomers(prev => [created, ...prev]);
    } catch (err) {
      console.error('Failed adding customer:', err);
    }
  };

    const handleUpdateCustomer = async (updatedCust: Customer): Promise<string | null> => {
    try {
      const updated = await ApiService.updateCustomer(updatedCust.id, updatedCust);
      setCustomers(prev => prev.map(c => (c.id === updated.id ? updated : c)));
      return null;
    } catch (err: any) {
      console.error('Failed updating customer:', err);
      return err?.message || 'Terjadi kesalahan';
    }
  };

  const handleDeleteCustomer = async (customerId: string): Promise<string | null> => {
    try {
      await ApiService.deleteCustomer(customerId, settings.adminPin || '');
      setCustomers(prev => prev.filter(c => c.id !== customerId));
      return null;
    } catch (err: any) {
      console.error('Failed deleting customer:', err);
      return err?.message || 'Terjadi kesalahan';
    }
  };

  // Handler untuk update order (simpan hasil edit invoice dari LaporanView)
  const handleUpdateOrder = async (updatedOrder: Order) => {
    try {
      const saved = await ApiService.updateOrder(updatedOrder.id, updatedOrder);
      setOrders(prev => prev.map(o => (o.id === saved.id ? saved : o)));
      setActiveOrder(prev => (prev && prev.id === saved.id ? saved : prev));
      const [updatedProducts, updatedCustomers] = await Promise.all([
        ApiService.getProducts(),
        ApiService.getCustomers(),
      ]);
      setProducts(updatedProducts);
      setCustomers(updatedCustomers);
    } catch (err: any) {
      console.error('Failed updating order:', err);
      alert('Gagal menyimpan perubahan invoice: ' + err.message);
    }
  };

  // Handler untuk pilih order dari list laporan → buka di tab Nota
  const handleSelectOrder = (order: Order) => {
    setActiveOrder(order);
    handleTabChange('nota');
  };

  // Handler untuk hapus order
  const handleDeleteOrder = async (orderId: string) => {
    try {
      await ApiService.deleteOrder(orderId);
      setOrders(prev => prev.filter(o => o.id !== orderId));
      setActiveOrder(prev => (prev && prev.id === orderId ? null : prev));
    } catch (err: any) {
      console.error('Failed deleting order:', err);
      alert('Gagal menghapus invoice: ' + err.message);
    }
  };

  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const isDark = theme === 'dark';

  if (!isLoaded) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          isDark ? 'bg-neutral-950 text-neutral-400' : 'bg-[#fafafa] text-neutral-500'
        }`}
      >
        <span className="text-xs font-mono">Memuat...</span>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen print:min-h-0 print:block flex flex-col items-center justify-start antialiased transition-colors duration-150 ${
        isDark
          ? 'bg-neutral-950 text-neutral-100 selection:bg-neutral-800'
          : 'bg-[#fafafa] text-neutral-900 selection:bg-neutral-200'
      }`}
    >
      <div
        className={`w-full max-w-lg min-h-screen print:min-h-0 print:max-w-none print:block flex flex-col transition-colors duration-150 ${
          isDark
            ? 'bg-neutral-950 sm:border-x sm:border-neutral-800/80 shadow-2xl shadow-black/40'
            : 'bg-white sm:border-x sm:border-neutral-200/70 sm:shadow-[0_0_40px_rgba(0,0,0,0.03)]'
        }`}
      >
        <div className="print:hidden relative">
          {isValidating && (
            <div className="absolute top-2 right-14 z-50 pointer-events-none flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono border border-emerald-500/20 backdrop-blur-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[9px]">Sinkronisasi</span>
            </div>
          )}
          <Header
            settings={settings}
            activeTab={activeTab}
            setActiveTab={handleTabChange}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            isAdminAuthenticated={isAdminAuthenticated}
            onLockAdmin={() => handleSetAdminAuth(false)}
          />
        </div>

        <main className="flex-1 w-full overflow-y-auto no-scrollbar print:overflow-visible print:block">
          <Suspense fallback={<DelayedFallback delay={300} />}>
          {activeTab === 'katalog' && (
            <KatalogView
              products={products}
              cart={cart}
              addToCart={addToCart}
              removeFromCart={removeFromCart}
              onGoToKasir={() => handleTabChange('kasir')}
              onAddNewProduct={() => handleTabChange('setelan')}
              theme={theme}
            />
          )}

          {activeTab === 'kasir' && (
            <KasirView
              cart={cart}
              customers={customers}
              settings={settings}
              updateCartQuantity={updateCartQuantity}
              updateCartDimensions={updateCartDimensions}
              removeFromCart={removeFromCart}
              clearCart={clearCart}
              onOrderCompleted={handleOrderCompleted}
              onGoToKatalog={() => handleTabChange('katalog')}
              theme={theme}
            />
          )}

          {activeTab === 'nota' && (
            <NotaView
              orders={orders}
              activeOrder={activeOrder}
              settings={settings}
              onSelectOrder={setActiveOrder}
              onNewTransaction={() => handleTabChange('katalog')}
              theme={theme}
            />
          )}

          {activeTab === 'customer' && (
            <CustomerView
              customers={customers}
              orders={orders}
              onAddCustomer={handleAddCustomer}
              onUpdateCustomer={handleUpdateCustomer}
              onViewCustomerOrder={handleSelectOrder}
              onDeleteCustomer={handleDeleteCustomer}
              isAdminAuthenticated={isAdminAuthenticated}
              theme={theme}
            />
          )}

          {activeTab === 'laporan' && (
            <LaporanView
              orders={orders}
              onSelectOrder={handleSelectOrder}
              onUpdateOrder={handleUpdateOrder}
              onDeleteOrder={handleDeleteOrder}
              products={products}
              isAdminAuthenticated={isAdminAuthenticated}
              theme={theme}
            />
          )}

          {activeTab === 'setelan' && (
            <SetelanView
              settings={settings}
              products={products}
              customers={customers}
              orders={orders}
              onUpdateSettings={handleUpdateSettings}
              onUpdateProducts={handleUpdateProducts}
              theme={theme}
              onToggleTheme={handleToggleTheme}
              isAdminAuthenticated={isAdminAuthenticated}
              setIsAdminAuthenticated={handleSetAdminAuth}
              onGoBackToKatalog={() => handleTabChange('katalog')}
            />
          )}
          </Suspense>
        </main>

        <div className="print:hidden">
          <BottomNav
            activeTab={activeTab}
            setActiveTab={handleTabChange}
            cartCount={totalCartCount}
            theme={theme}
          />
        </div>
      </div>
    </div>
  );
}