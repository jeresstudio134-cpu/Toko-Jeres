import React, { useState, useMemo } from 'react';
import { CartItem, Customer, Order, PaymentMethod, StoreSettings } from '../types';
import { formatRupiah } from '../utils/format';
import {
  Trash2,
  Plus,
  Minus,
  UserCheck,
  CreditCard,
  QrCode,
  Banknote,
  Building2,
  Receipt,
  Percent,
  ShoppingBag,
  Tag,
} from 'lucide-react';
import { optimizeImage } from '../utils/cloudinary';

const CartThumbnail: React.FC<{
  src: string;
  alt: string;
  onError: () => void;
}> = ({ src, alt, onError }) => {
  const [loaded, setLoaded] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    if (imgRef.current?.complete && imgRef.current?.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [src]);

  return (
    <img
      ref={imgRef}
      key={src}
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onLoad={() => setLoaded(true)}
      onError={onError}
      className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-200 ${
        loaded ? 'opacity-100' : 'opacity-0'
      }`}
    />
  );
};

interface KasirViewProps {
  cart: CartItem[];
  customers: Customer[];
  settings: StoreSettings;
  updateCartQuantity: (productId: string, quantity: number) => void;
  updateCartDimensions?: (productId: string, length?: number, width?: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  onOrderCompleted: (order: Order) => void;
  onGoToKatalog: () => void;
  theme?: 'light' | 'dark';
}

export const KasirView: React.FC<KasirViewProps> = ({
  cart,
  customers,
  settings,
  updateCartQuantity,
  updateCartDimensions,
  removeFromCart,
  clearCart,
  onOrderCompleted,
  onGoToKatalog,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';

  // Customer details for automatic recording
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  // Discount & Tax
  const [discountType, setDiscountType] = useState<'rp' | 'percent'>('rp');
  const [discountValue, setDiscountValue] = useState<number>(0);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('tunai');
  const [cashGiven, setCashGiven] = useState<number>(0);
  const [customerSuggestionsOpen, setCustomerSuggestionsOpen] = useState(false);
  const [cartImageErrors, setCartImageErrors] = useState<Record<string, boolean>>({});

  // Calculations with Panjang x Lebar multiplier support
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => {
      const area =
        item.length && item.width && item.length > 0 && item.width > 0
          ? item.length * item.width
          : 1;
      return acc + item.product.price * area * item.quantity;
    }, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    if (discountType === 'percent') {
      return Math.round((subtotal * (discountValue || 0)) / 100);
    }
    return Math.min(subtotal, discountValue || 0);
  }, [subtotal, discountType, discountValue]);

  const taxAmount = useMemo(() => {
    if (!settings.enableTax) return 0;
    const taxable = Math.max(0, subtotal - discountAmount);
    return Math.round((taxable * settings.taxPercent) / 100);
  }, [subtotal, discountAmount, settings.enableTax, settings.taxPercent]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal - discountAmount + taxAmount);
  }, [subtotal, discountAmount, taxAmount]);

  const cashChange = useMemo(() => {
    if (paymentMethod !== 'tunai') return 0;
    return Math.max(0, cashGiven - grandTotal);
  }, [paymentMethod, cashGiven, grandTotal]);

  // Autocomplete matching customers
  const matchingCustomers = useMemo(() => {
    if (!customerName && !customerPhone) return [];
    const term = (customerName || customerPhone).toLowerCase().trim();
    return customers
      .filter(
        c =>
          c.name.toLowerCase().includes(term) ||
          c.phone.replace(/[^0-9]/g, '').includes(term)
      )
      .slice(0, 4);
  }, [customers, customerName, customerPhone]);

  const handleSelectCustomer = (c: Customer) => {
    setCustomerName(c.name);
    setCustomerPhone(c.phone);
    setCustomerSuggestionsOpen(false);
  };

  const handleProcessOrder = () => {
    if (cart.length === 0) return;
    if (paymentMethod === 'tunai' && cashGiven < grandTotal) {
      alert('Jumlah uang tunai yang diterima kurang dari total tagihan!');
      return;
    }

    const orderId = `ord-${Date.now()}`;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const randomSeq = Math.floor(100 + Math.random() * 900);
    const invoiceNumber = `INV-${yyyy}${mm}${dd}-${randomSeq}`;

    const newOrder: Order = {
      id: orderId,
      invoiceNumber,
      customerName: customerName.trim() || 'Pelanggan Umum',
      customerPhone: customerPhone.trim() || undefined,
      items: cart.map(item => {
        const hasDimensions =
          item.length !== undefined &&
          item.width !== undefined &&
          item.length > 0 &&
          item.width > 0;
        const area = hasDimensions ? item.length! * item.width! : undefined;
        const itemSubtotal = item.product.price * (area || 1) * item.quantity;

        return {
          productId: item.product.id,
          productName: item.product.name,
          price: item.product.price,
          costPrice: item.product.costPrice,
          quantity: item.quantity,
          length: item.length,
          width: item.width,
          area,
          subtotal: itemSubtotal,
          note: item.note,
        };
      }),
      subtotal,
      discount: discountAmount,
      tax: taxAmount,
      total: grandTotal,
      paymentMethod,
      paymentStatus: 'lunas',
      cashGiven: paymentMethod === 'tunai' ? (cashGiven || grandTotal) : undefined,
      cashChange: paymentMethod === 'tunai' ? cashChange : undefined,
      createdAt: new Date().toISOString(),
      notes: orderNotes.trim() || undefined,
    };

    onOrderCompleted(newOrder);
  };

  if (cart.length === 0) {
    return (
      <div className="p-6 text-center py-20">
        <div
          className={`w-16 h-16 rounded-full border flex items-center justify-center mx-auto mb-4 ${
            isDark
              ? 'bg-neutral-800 border-neutral-700 text-neutral-400'
              : 'bg-neutral-100 border-neutral-200 text-neutral-500'
          }`}
        >
          <Receipt className="w-8 h-8 stroke-[1.5]" />
        </div>
        <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
          Keranjang Kasir Kosong
        </h2>
        <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
          Silakan pilih produk dari katalog menu untuk memulai transaksi kasir.
        </p>
        <button
          onClick={onGoToKatalog}
          className={`mt-5 px-5 py-2.5 font-bold rounded-xl text-xs inline-flex items-center gap-2 active:scale-95 transition-transform shadow-xs ${
            isDark
              ? 'bg-white text-neutral-950 hover:bg-neutral-200'
              : 'bg-neutral-900 text-white hover:bg-neutral-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Buka Katalog Menu</span>
        </button>
      </div>
    );
  }

  return (
    <div className="pb-32 px-4 pt-3 space-y-3.5 max-w-md mx-auto">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-sm font-bold tracking-tight ${isDark ? 'text-white' : 'text-neutral-900'}`}>
            Kasir & Pembayaran
          </h2>
          <p className="text-[11px] text-neutral-500">
            {cart.reduce((a, b) => a + b.quantity, 0)} item dalam keranjang
          </p>
        </div>
        <button
          onClick={clearCart}
          className="text-[11px] text-red-500 hover:text-red-600 font-medium flex items-center gap-1 px-2 py-1 rounded-md transition-colors"
        >
          <Trash2 className="w-3 h-3" />
          <span>Kosongkan</span>
        </button>
      </div>

      {/* Cart Items List */}
      <div
        className={`border rounded-2xl p-3.5 space-y-3 transition-colors ${
          isDark
            ? 'bg-neutral-900 border-neutral-800'
            : 'bg-white border-neutral-200/90 shadow-xs'
        }`}
      >
        {cart.map(item => {
          const hasDimensions =
            item.length !== undefined &&
            item.width !== undefined &&
            item.length > 0 &&
            item.width > 0;
          const area = hasDimensions ? item.length! * item.width! : 1;
          const itemSubtotal = item.product.price * area * item.quantity;

          return (
            <div
              key={item.product.id}
              className={`flex flex-col gap-2 pb-3 border-b last:border-0 last:pb-0 ${
                isDark ? 'border-neutral-800/80' : 'border-neutral-100'
              }`}
            >
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  {/* Thumbnail Produk Kasir */}
                  <div
                    className={`w-11 h-11 aspect-square rounded-xl flex-shrink-0 overflow-hidden relative border flex items-center justify-center ${
                      isDark
                        ? 'bg-neutral-800 border-neutral-700/60'
                        : 'bg-neutral-100 border-neutral-200/80'
                    }`}
                  >
                    {item.product.imageUrl && !cartImageErrors[item.product.id] ? (
                      <CartThumbnail
                        src={optimizeImage(item.product.imageUrl, 200, 200)}
                        alt={item.product.name}
                        onError={() =>
                          setCartImageErrors(prev => ({ ...prev, [item.product.id]: true }))
                        }
                      />
                    ) : (
                      <Tag
                        className={`w-4 h-4 stroke-[1.5] ${
                          isDark ? 'text-neutral-500' : 'text-neutral-400'
                        }`}
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                      {item.product.name}
                    </div>
                    <div className="text-[11px] text-neutral-500 font-mono tabular-nums">
                      {hasDimensions ? (
                        <>
                          {formatRupiah(item.product.price)} × {area.toLocaleString('id-ID', { maximumFractionDigits: 2 })} m² × {item.quantity} ={' '}
                          <span className={`font-bold ${isDark ? 'text-neutral-200' : 'text-neutral-900'}`}>
                            {formatRupiah(itemSubtotal)}
                          </span>
                        </>
                      ) : (
                        <>
                          {formatRupiah(item.product.price)} x {item.quantity} ={' '}
                          <span className={`font-bold ${isDark ? 'text-neutral-200' : 'text-neutral-900'}`}>
                            {formatRupiah(itemSubtotal)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  className={`flex items-center gap-1.5 rounded-xl p-1 border ${
                    isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-neutral-100 border-neutral-200'
                  }`}
                >
                  <button
                    onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-transform ${
                      isDark ? 'bg-neutral-700 text-white' : 'bg-white text-neutral-900 shadow-xs'
                    }`}
                    aria-label="Kurangi"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className={`w-6 text-center text-xs font-bold font-mono ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                    disabled={item.quantity >= item.product.stock}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-transform disabled:opacity-40 ${
                      isDark ? 'bg-white text-neutral-950' : 'bg-neutral-900 text-white'
                    }`}
                    aria-label="Tambah"
                  >
                    <Plus className="w-3 h-3 font-bold" />
                  </button>
                </div>
              </div>

              {/* Fitur Perkalian Panjang x Lebar Di Bawahnya (Simpel Saja) */}
              <div
                className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl border text-[11px] transition-colors ${
                  isDark
                    ? 'bg-neutral-850/80 border-neutral-800 text-neutral-300'
                    : 'bg-neutral-50 border-neutral-200/70 text-neutral-700'
                }`}
              >
                <div className="flex items-center gap-1.5 flex-wrap">

                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="P"
                      value={item.length ?? ''}
                      onChange={e => {
                        const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                        updateCartDimensions?.(item.product.id, val, item.width);
                      }}
                      className={`w-12 px-1.5 py-0.5 text-center font-mono font-medium rounded border text-xs focus:outline-none transition-colors ${
                        isDark
                          ? 'bg-neutral-800 border-neutral-700 text-white focus:border-neutral-500'
                          : 'bg-white border-neutral-200 text-neutral-900 focus:border-neutral-800 shadow-2xs'
                      }`}
                    />
                    <span className="text-neutral-400 font-bold">×</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="L"
                      value={item.width ?? ''}
                      onChange={e => {
                        const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                        updateCartDimensions?.(item.product.id, item.length, val);
                      }}
                      className={`w-12 px-1.5 py-0.5 text-center font-mono font-medium rounded border text-xs focus:outline-none transition-colors ${
                        isDark
                          ? 'bg-neutral-800 border-neutral-700 text-white focus:border-neutral-500'
                          : 'bg-white border-neutral-200 text-neutral-900 focus:border-neutral-800 shadow-2xs'
                      }`}
                    />
                    <span className="text-neutral-400 font-bold">=</span>
                    {hasDimensions && (
                      <span className={`font-mono font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        {area.toLocaleString('id-ID', { maximumFractionDigits: 2 })}
                      </span>
                    )}
                    <span className="text-[10px] text-neutral-400 font-medium">m²</span>
                  </div>
                </div>

                {hasDimensions && (
                  <button
                    type="button"
                    onClick={() => updateCartDimensions?.(item.product.id, undefined, undefined)}
                    className="text-[10.5px] text-neutral-400 hover:text-red-500 transition-colors font-medium active:scale-95"
                    title="Hapus ukuran P x L"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Customer Recording (Automatic CRM) */}
      <div
        className={`border rounded-2xl p-3.5 space-y-2.5 relative transition-colors ${
          isDark
            ? 'bg-neutral-900 border-neutral-800'
            : 'bg-white border-neutral-200/90 shadow-xs'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-900 dark:text-white">
            <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className={isDark ? 'text-white' : 'text-neutral-900'}>Data Customer</span>
          </div>
          
        </div>

        <p className="text-[11px] text-neutral-500">
          Data pelanggan & riwayat transaksi tersimpan otomatis.
        </p>

        <div className="space-y-2 pt-1">
          <div className="relative">
            <input
              type="text"
              value={customerName}
              onChange={e => {
                setCustomerName(e.target.value);
                setCustomerSuggestionsOpen(true);
              }}
              placeholder="Nama Pelanggan (cth: Budi Santoso / Meja 02)"
              className={`w-full text-xs rounded-xl px-3 py-2.5 border outline-none transition-all ${
                isDark
                  ? 'bg-neutral-800 text-white placeholder-neutral-500 border-neutral-700/80 focus:ring-1 focus:ring-neutral-400'
                  : 'bg-neutral-50 text-neutral-900 placeholder-neutral-400 border-neutral-200 focus:bg-white focus:ring-1 focus:ring-neutral-900'
              }`}
            />
            {/* Customer autocomplete dropdown */}
            {customerSuggestionsOpen && matchingCustomers.length > 0 && (
              <div
                className={`absolute top-full left-0 right-0 z-30 mt-1 border rounded-xl shadow-xl overflow-hidden ${
                  isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
                }`}
              >
                <div className="px-3 py-1.5 text-[10px] text-neutral-400 border-b border-neutral-200 dark:border-neutral-700 font-mono">
                  Pelanggan Terdaftar Sebelumnya:
                </div>
                {matchingCustomers.map(cust => (
                  <button
                    key={cust.id}
                    type="button"
                    onClick={() => handleSelectCustomer(cust)}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs border-b last:border-0 ${
                      isDark ? 'hover:bg-neutral-700 border-neutral-700/40 text-white' : 'hover:bg-neutral-50 border-neutral-100 text-neutral-900'
                    }`}
                  >
                    <div>
                      <div className="font-bold">{cust.name}</div>
                      <div className="text-[10px] text-neutral-500 font-mono">{cust.phone || 'Tanpa no. HP'}</div>
                    </div>
                    <div className="text-right text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                      {cust.ordersCount}x order
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <input
            type="tel"
            value={customerPhone}
            onChange={e => setCustomerPhone(e.target.value)}
            placeholder="Nomor WhatsApp/HP (cth: 081234567890)"
            className={`w-full text-xs rounded-xl px-3 py-2.5 border outline-none transition-all ${
              isDark
                ? 'bg-neutral-800 text-white placeholder-neutral-500 border-neutral-700/80 focus:ring-1 focus:ring-neutral-400'
                : 'bg-neutral-50 text-neutral-900 placeholder-neutral-400 border-neutral-200 focus:bg-white focus:ring-1 focus:ring-neutral-900'
            }`}
          />

          <input
            type="text"
            value={orderNotes}
            onChange={e => setOrderNotes(e.target.value)}
            placeholder="Catatan pesanan / No. Meja (opsional)"
            className={`w-full text-xs rounded-xl px-3 py-2.5 border outline-none transition-all ${
              isDark
                ? 'bg-neutral-800 text-white placeholder-neutral-500 border-neutral-700/80 focus:ring-1 focus:ring-neutral-400'
                : 'bg-neutral-50 text-neutral-900 placeholder-neutral-400 border-neutral-200 focus:bg-white focus:ring-1 focus:ring-neutral-900'
            }`}
          />
        </div>
      </div>

      {/* Diskon & Tagihan Ringkasan */}
      <div
        className={`border rounded-2xl p-3.5 space-y-2.5 transition-colors ${
          isDark
            ? 'bg-neutral-900 border-neutral-800'
            : 'bg-white border-neutral-200/90 shadow-xs'
        }`}
      >
        <div className="flex items-center justify-between text-xs">
          <span className="text-neutral-500 font-medium">Subtotal</span>
          <span className={`font-mono font-bold tabular-nums ${isDark ? 'text-white' : 'text-neutral-900'}`}>
            {formatRupiah(subtotal)}
          </span>
        </div>

        {/* Diskon row */}
        <div
          className={`flex items-center justify-between gap-2 pt-1 border-t ${
            isDark ? 'border-neutral-800' : 'border-neutral-100'
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
            <Percent className="w-3.5 h-3.5 text-amber-500" />
            <span>Diskon Potongan</span>
          </div>
          <div className="flex items-center gap-1">
            <div
              className={`flex rounded-lg p-0.5 border text-[10px] ${
                isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-neutral-100 border-neutral-200'
              }`}
            >
              <button
                type="button"
                onClick={() => setDiscountType('rp')}
                className={`px-1.5 py-0.5 rounded font-bold ${
                  discountType === 'rp'
                    ? isDark
                      ? 'bg-white text-neutral-950'
                      : 'bg-neutral-900 text-white'
                    : 'text-neutral-500'
                }`}
              >
                Rp
              </button>
              <button
                type="button"
                onClick={() => setDiscountType('percent')}
                className={`px-1.5 py-0.5 rounded font-bold ${
                  discountType === 'percent'
                    ? isDark
                      ? 'bg-white text-neutral-950'
                      : 'bg-neutral-900 text-white'
                    : 'text-neutral-500'
                }`}
              >
                %
              </button>
            </div>
            <input
              type="number"
              min="0"
              value={discountValue || ''}
              onChange={e => setDiscountValue(Number(e.target.value) || 0)}
              placeholder="0"
              className={`w-20 text-right text-xs font-mono px-2 py-1 rounded-lg border outline-none ${
                isDark ? 'bg-neutral-800 text-white border-neutral-700' : 'bg-neutral-50 text-neutral-900 border-neutral-200'
              }`}
            />
          </div>
        </div>

        {discountAmount > 0 && (
          <div className="flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 font-mono font-bold">
            <span>Potongan</span>
            <span>-{formatRupiah(discountAmount)}</span>
          </div>
        )}

        {settings.enableTax && (
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>PB1 / PPN ({settings.taxPercent}%)</span>
            <span className={`font-mono font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
              +{formatRupiah(taxAmount)}
            </span>
          </div>
        )}

        <div
          className={`flex items-center justify-between pt-2 border-t text-sm font-bold ${
            isDark ? 'border-neutral-800' : 'border-neutral-100'
          }`}
        >
          <span className={isDark ? 'text-white' : 'text-neutral-900'}>Total Tagihan</span>
          <span className="font-mono text-emerald-600 dark:text-emerald-400 text-base font-extrabold tabular-nums">
            {formatRupiah(grandTotal)}
          </span>
        </div>
      </div>

      {/* Metode Pembayaran */}
      <div
        className={`border rounded-2xl p-3.5 space-y-3 transition-colors ${
          isDark
            ? 'bg-neutral-900 border-neutral-800'
            : 'bg-white border-neutral-200/90 shadow-xs'
        }`}
      >
        <label className={`text-xs font-bold block ${isDark ? 'text-white' : 'text-neutral-900'}`}>
          Pilih Metode Pembayaran
        </label>

        <div className="grid grid-cols-4 gap-1.5">
          {[
            { id: 'tunai' as PaymentMethod, label: 'Tunai', icon: Banknote },
            { id: 'qris' as PaymentMethod, label: 'QRIS', icon: QrCode },
            { id: 'transfer' as PaymentMethod, label: 'Transfer', icon: Building2 },
            { id: 'debit' as PaymentMethod, label: 'Debit', icon: CreditCard },
          ].map(method => {
            const Icon = method.icon;
            const isSelected = paymentMethod === method.id;
            return (
              <button
                key={method.id}
                type="button"
                onClick={() => {
                  setPaymentMethod(method.id);
                  if (method.id === 'tunai' && cashGiven === 0) {
                    setCashGiven(grandTotal);
                  }
                }}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs transition-all min-h-[52px] ${
                  isSelected
                    ? isDark
                      ? 'bg-white text-neutral-950 font-bold border-white shadow-xs'
                      : 'bg-neutral-900 text-white font-bold border-neutral-900 shadow-xs'
                    : isDark
                    ? 'bg-neutral-800 text-neutral-300 border-neutral-700/80 hover:bg-neutral-750'
                    : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                <Icon className="w-4 h-4 mb-1" />
                <span className="text-[11px]">{method.label}</span>
              </button>
            );
          })}
        </div>

        {/* Kalkulator Tunai Cepat */}
        {paymentMethod === 'tunai' && (
          <div
            className={`pt-2 border-t space-y-2 ${
              isDark ? 'border-neutral-800' : 'border-neutral-100'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-500 font-medium">Uang Diterima:</span>
              <input
                type="number"
                value={cashGiven || ''}
                onChange={e => setCashGiven(Number(e.target.value) || 0)}
                placeholder="0"
                className={`w-32 text-right text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg border outline-none ${
                  isDark
                    ? 'bg-neutral-800 text-white border-neutral-700'
                    : 'bg-neutral-50 text-neutral-900 border-neutral-200'
                }`}
              />
            </div>

            {/* Quick cash shortcut chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setCashGiven(grandTotal)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                  isDark
                    ? 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:text-white'
                    : 'bg-neutral-100 text-neutral-800 border-neutral-200 hover:bg-neutral-200'
                }`}
              >
                Uang Pas
              </button>
              {[50000, 100000, 200000].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setCashGiven(val)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold border transition-colors ${
                    isDark
                      ? 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:text-white'
                      : 'bg-neutral-100 text-neutral-800 border-neutral-200 hover:bg-neutral-200'
                  }`}
                >
                  {formatRupiah(val)}
                </button>
              ))}
            </div>

            {/* Kembalian calculation display */}
            <div
              className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
                isDark ? 'bg-neutral-800/80 border-neutral-700/60' : 'bg-neutral-50 border-neutral-200'
              }`}
            >
              <span className="text-neutral-600 dark:text-neutral-300 font-semibold">Kembalian:</span>
              <span
                className={`font-mono font-bold text-sm ${
                  cashChange >= 0 && cashGiven >= grandTotal
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-500'
                }`}
              >
                {cashGiven >= grandTotal ? formatRupiah(cashChange) : 'Kurang ' + formatRupiah(grandTotal - cashGiven)}
              </span>
            </div>
          </div>
        )}

        {/* QRIS notice & Real Store QRIS Display */}
        {paymentMethod === 'qris' && (
          <div
            className={`p-4 rounded-xl border text-center space-y-2.5 transition-colors ${
              isDark ? 'bg-neutral-800/60 border-neutral-700' : 'bg-neutral-50 border-neutral-200'
            }`}
          >
            {settings.qrisImageUrl ? (
              <div className="space-y-2">
                <div className="inline-block p-3 bg-white rounded-2xl border-2 border-neutral-200 dark:border-neutral-700 shadow-md">
                  <img
                    src={settings.qrisImageUrl}
                    alt={`QRIS ${settings.storeName}`}
                    loading="lazy"
                    decoding="async"
                    className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-lg mx-auto"
                  />
                  <div className="mt-2 text-center border-t border-neutral-100 pt-1.5">
                    <span className="text-[11px] font-bold text-neutral-800 uppercase tracking-wider block">
                      {settings.storeName}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      QRIS Toko Resmi
                    </span>
                  </div>
                </div>

                <div className="text-center space-y-0.5">
                  <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                    Scan Barcode untuk Membayar {formatRupiah(grandTotal)}
                  </p>
                  <p className="text-[10px] text-neutral-500">
                    Mendukung GoPay, OVO, Dana, ShopeePay, BCA Mobile, Livin, dll.
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-2 space-y-2">
                <div className="w-14 h-14 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl mx-auto flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <QrCode className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                    Barcode QRIS Toko Belum Terpasang
                  </p>
                  <p className="text-[11px] text-neutral-500 max-w-xs mx-auto leading-relaxed">
                    Unggah foto barcode QRIS resmi toko Anda di menu <strong>Setelan &gt; Profil Toko</strong> agar pelanggan bisa langsung scan saat checkout.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Primary Sticky Checkout CTA */}
      <div
        className={`fixed bottom-16 left-0 right-0 z-30 p-3 border-t backdrop-blur-md transition-colors ${
          isDark
            ? 'bg-neutral-900/95 border-neutral-800'
            : 'bg-white/95 border-neutral-200/90 shadow-[0_-2px_10px_rgba(0,0,0,0.03)]'
        }`}
      >
        <div className="max-w-md mx-auto">
          <button
            onClick={handleProcessOrder}
            className={`w-full h-12 font-bold rounded-xl text-xs sm:text-sm flex items-center justify-between px-4 transition-all active:scale-[0.98] shadow-md ${
              isDark
                ? 'bg-white hover:bg-neutral-100 text-neutral-950'
                : 'bg-neutral-900 hover:bg-neutral-800 text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 stroke-[2.2]" />
              <span>Selesaikan & Cetak Nota</span>
            </div>
            <span className="font-mono text-sm tabular-nums font-extrabold">
              {formatRupiah(grandTotal)}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
