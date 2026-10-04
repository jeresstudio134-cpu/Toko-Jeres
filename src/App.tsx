/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Product, Customer, Order, StoreSettings, CartItem, ActiveTab } from './types';
import { ApiService } from './services/api';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { KatalogView } from './components/KatalogView';
import { KasirView } from './components/KasirView';
import { NotaView } from './components/NotaView';
import { CustomerView } from './components/CustomerView';
import { LaporanView } from './components/LaporanView';
import { SetelanView } from './components/SetelanView';

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<StoreSettings>({
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
  });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('katalog');
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('kios_admin_auth') === 'true';
    } catch {
      return false;
    }
  });

  // Load all initial data from the Full Server Database
  const refreshDatabase = async () => {
    try {
      const [prodList, custList, ordList, storeSet] = await Promise.all([
        ApiService.getProducts(),
        ApiService.getCustomers(),
        ApiService.getOrders(),
        ApiService.getSettings(),
      ]);
      setProducts(prodList);
      setCustomers(custList);
      setOrders(ordList);
      if (ordList.length > 0 && !activeOrder) {
        setActiveOrder(ordList[0]);
      }
      setSettings(storeSet);
      if (storeSet.theme) {
        setTheme(storeSet.theme);
      }
    } catch (e) {
      console.error('Error fetching database:', e);
    } finally {
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    refreshDatabase();
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

  const handleUpdateCustomer = async (updatedCust: Customer) => {
    try {
      const updated = await ApiService.updateCustomer(updatedCust.id, updatedCust);
      setCustomers(prev => prev.map(c => (c.id === updated.id ? updated : c)));
    } catch (err) {
      console.error('Failed updating customer:', err);
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    try {
      await ApiService.deleteCustomer(customerId, settings.adminPin || '');
      setCustomers(prev => prev.filter(c => c.id !== customerId));
    } catch (err: any) {
      console.error('Failed deleting customer:', err);
      alert('Gagal menghapus customer: ' + err.message);
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
    setActiveTab('nota');
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
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <span className="text-xs text-neutral-400 font-mono">Memuat...</span>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-start antialiased transition-colors duration-150 ${
        isDark
          ? 'bg-neutral-950 text-neutral-100 selection:bg-neutral-800'
          : 'bg-[#fafafa] text-neutral-900 selection:bg-neutral-200'
      }`}
    >
      <div
        className={`w-full max-w-lg min-h-screen flex flex-col transition-colors duration-150 ${
          isDark
            ? 'bg-neutral-950 sm:border-x sm:border-neutral-800/80 shadow-2xl shadow-black/40'
            : 'bg-white sm:border-x sm:border-neutral-200/70 sm:shadow-[0_0_40px_rgba(0,0,0,0.03)]'
        }`}
      >
        <Header
          settings={settings}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          isAdminAuthenticated={isAdminAuthenticated}
          onLockAdmin={() => handleSetAdminAuth(false)}
        />

        <main className="flex-1 w-full overflow-y-auto no-scrollbar">
          {activeTab === 'katalog' && (
            <KatalogView
              products={products}
              cart={cart}
              addToCart={addToCart}
              removeFromCart={removeFromCart}
              onGoToKasir={() => setActiveTab('kasir')}
              onAddNewProduct={() => setActiveTab('setelan')}
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
              onGoToKatalog={() => setActiveTab('katalog')}
              theme={theme}
            />
          )}

          {activeTab === 'nota' && (
            <NotaView
              orders={orders}
              activeOrder={activeOrder}
              settings={settings}
              onSelectOrder={setActiveOrder}
              onNewTransaction={() => setActiveTab('katalog')}
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
              onGoBackToKatalog={() => setActiveTab('katalog')}
            />
          )}
        </main>

        <BottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          cartCount={totalCartCount}
          theme={theme}
        />
      </div>
    </div>
  );
}