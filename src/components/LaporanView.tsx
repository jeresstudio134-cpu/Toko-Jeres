import React, { useState, useMemo } from 'react';
import { Order, Product } from '../types';
import { CalendarDays } from 'lucide-react';
import { formatRupiah, formatDate } from '../utils/format';
import {
  TrendingUp,
  Receipt,
  DollarSign,
  Download,
  Layers,
  ChevronRight,
  Edit2,
  Save,
  Plus,
  Trash2,
  Search,
  X,
  SlidersHorizontal,
  Calendar,
} from 'lucide-react';

interface LaporanViewProps {
  orders: Order[];
  onSelectOrder: (order: Order) => void;
  onUpdateOrder?: (order: Order) => void;
  onDeleteOrder?: (orderId: string) => void;
  products?: Product[];
  isAdminAuthenticated?: boolean;
  theme?: 'light' | 'dark';
}

type Timeframe = 'today' | '7days' | 'month' | 'all';
type PaymentFilter = 'all' | 'tunai' | 'qris' | 'transfer' | 'debit';

const FilterChip: React.FC<{
  label: string;
  onRemove: () => void;
  isDark: boolean;
}> = ({ label, onRemove, isDark }) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border ${
      isDark
        ? 'bg-emerald-950/40 text-emerald-300 border-emerald-900/60'
        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
    }`}
  >
    {label}
    <button
      type="button"
      onClick={onRemove}
      className={`rounded-full p-0.5 ${
        isDark ? 'hover:bg-emerald-900/60' : 'hover:bg-emerald-100'
      }`}
    >
      <X className="w-2.5 h-2.5" />
    </button>
  </span>
);

export const LaporanView: React.FC<LaporanViewProps> = ({
  orders,
  onSelectOrder,
  onUpdateOrder,
  onDeleteOrder,
  products = [],
  isAdminAuthenticated = false,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';
  const [timeframe, setTimeframe] = useState<Timeframe>('all');

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  

  // Rentang tanggal aktif kalau salah satu kolom terisi
  const hasCustomRange = !!(customStart || customEnd);

  // Edit invoice (admin only)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editMethod, setEditMethod] = useState<Order['paymentMethod']>('tunai');
  const [editItems, setEditItems] = useState<Order['items']>([]);
  const [editDiscount, setEditDiscount] = useState(0);
  const [editTax, setEditTax] = useState(0);
  const [editNotes, setEditNotes] = useState('');
  const [addProductId, setAddProductId] = useState('');

  // Delete confirmation
  const [confirmDeleteOrder, setConfirmDeleteOrder] = useState<Order | null>(null);

  // Subtotal 1 baris item (kalau item punya luas m², ikut dikalikan)
  const calcItemSubtotal = (item: any) =>
    (Number(item.price) || 0) *
    (Number(item.quantity) || 0) *
    (item.area ? Number(item.area) : 1);

  const editSubtotal = editItems.reduce((acc, it) => acc + calcItemSubtotal(it), 0);
  const editTotal = Math.max(0, editSubtotal - editDiscount + editTax);

  const openEditOrder = (ord: Order) => {
    setEditingOrder(ord);
    setEditName(ord.customerName);
    setEditPhone(ord.customerPhone || '');
    setEditMethod(ord.paymentMethod);
    setEditItems(ord.items.map(it => ({ ...it })));
    setEditDiscount(ord.discount || 0);
    setEditTax(ord.tax || 0);
    setEditNotes(ord.notes || '');
    setAddProductId('');
  };

  const updateEditItem = (idx: number, patch: Record<string, number>) => {
    setEditItems(prev =>
      prev.map((it, i) => (i === idx ? { ...it, ...patch } : it))
    );
  };

  const updateEditItemArea = (
    idx: number,
    patch: { length?: number; width?: number }
  ) => {
    setEditItems(prev =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const length =
          patch.length !== undefined ? patch.length : ((it as any).length ?? 0);
        const width =
          patch.width !== undefined ? patch.width : ((it as any).width ?? 0);
        const area =
          length > 0 && width > 0 ? length * width : ((it as any).area ?? 0);
        return { ...it, length, width, area };
      })
    );
  };

  const toggleAreaMode = (idx: number, enabled: boolean) => {
    setEditItems(prev =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        if (!enabled) {
          return { ...it, length: 0, width: 0, area: 0 };
        }
        return { ...it, area: (it as any).area || 1 };
      })
    );
  };

  const removeEditItem = (idx: number) => {
    setEditItems(prev => prev.filter((_, i) => i !== idx));
  };

  const addEditItem = () => {
    const prod = products.find(p => p.id === addProductId);
    if (!prod) return;
    const existingIdx = editItems.findIndex(it => it.productId === prod.id);
    if (existingIdx >= 0) {
      updateEditItem(existingIdx, {
        quantity: editItems[existingIdx].quantity + 1,
      });
    } else {
      setEditItems(prev => [
        ...prev,
        {
          productId: prod.id,
          productName: prod.name,
          price: prod.price,
          costPrice: prod.costPrice || 0,
          quantity: 1,
          subtotal: prod.price,
          length: 0,
          width: 0,
          area: 0,
        } as any,
      ]);
    }
    setAddProductId('');
  };

  const handleSaveEditOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder || !editName.trim()) return;
    if (editItems.length === 0) {
      alert('Invoice minimal harus punya 1 item.');
      return;
    }
    const items = editItems.map(it => ({
      ...it,
      quantity: Number(it.quantity) || 0,
      price: Number(it.price) || 0,
      subtotal: calcItemSubtotal(it),
    }));
    const cashChange =
      editingOrder.cashGiven !== undefined && editingOrder.cashGiven !== null
        ? Math.max(0, editingOrder.cashGiven - editTotal)
        : editingOrder.cashChange ?? 0;

    onUpdateOrder?.({
      ...editingOrder,
      customerName: editName.trim(),
      customerPhone: editPhone.trim(),
      paymentMethod: editMethod,
      items,
      subtotal: editSubtotal,
      discount: editDiscount,
      tax: editTax,
      total: editTotal,
      cashChange,
      notes: editNotes.trim(),
    });
    setEditingOrder(null);
  };

  // Filter orders by timeframe (pakai waktu lokal / WIB)
  // Filter orders by timeframe + search + payment + status + custom range
const filteredOrders = useMemo(() => {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const q = searchQuery.trim().toLowerCase();

  return orders.filter(order => {
    const orderDate = new Date(order.createdAt);

    // Timeframe
    if (hasCustomRange) {
      // Custom range: start & end (format YYYY-MM-DD)
      if (customStart) {
        const start = new Date(customStart + 'T00:00:00');
        if (orderDate < start) return false;
      }
      if (customEnd) {
        const end = new Date(customEnd + 'T23:59:59');
        if (orderDate > end) return false;
      }
    } else {
      if (timeframe === 'today') {
        const orderStr = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getDate()).padStart(2, '0')}`;
        if (orderStr !== todayStr) return false;
      } else if (timeframe === '7days') {
        const diffDays = (now.getTime() - orderDate.getTime()) / (1000 * 3600 * 24);
        if (!(diffDays >= 0 && diffDays <= 7)) return false;
      } else if (timeframe === 'month') {
        if (!(
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getFullYear() === now.getFullYear()
        )) return false;
      }
    }

    // Payment method
    if (paymentFilter !== 'all' && order.paymentMethod !== paymentFilter) {
      return false;
    }

    

    // Search: invoiceNumber atau customerName
    if (q) {
      const inv = (order.invoiceNumber || '').toLowerCase();
      const cus = (order.customerName || '').toLowerCase();
      if (!inv.includes(q) && !cus.includes(q)) return false;
    }

    return true;
  });
}, [
  orders,
  timeframe,
  hasCustomRange,
  customStart,
  customEnd,
  paymentFilter,
  searchQuery,
]);

  // Aggregate Metrics
  const totalRevenue = useMemo(() => {
    return filteredOrders.reduce((acc, o) => acc + o.total, 0);
  }, [filteredOrders]);

  const totalOrdersCount = filteredOrders.length;

  const averageOrderValue = useMemo(() => {
    if (totalOrdersCount === 0) return 0;
    return Math.round(totalRevenue / totalOrdersCount);
  }, [totalRevenue, totalOrdersCount]);

  // Profit calculation (revenue - costPrice of items, ikut area)
  const totalProfit = useMemo(() => {
    return filteredOrders.reduce((acc, o) => {
      const orderCost = o.items.reduce((cAcc, item) => {
        const areaFactor = item.area ? Number(item.area) : 1;
        return cAcc + (item.costPrice || 0) * item.quantity * areaFactor;
      }, 0);
      return acc + (o.total - orderCost);
    }, 0);
  }, [filteredOrders]);

  // Top Selling Items
  const topProducts = useMemo(() => {
    const map = new Map<
      string,
      { name: string; quantity: number; revenue: number }
    >();
    filteredOrders.forEach(o => {
      o.items.forEach(item => {
        const existing = map.get(item.productId) || {
          name: item.productName,
          quantity: 0,
          revenue: 0,
        };
        existing.quantity += item.quantity;
        existing.revenue += item.subtotal;
        map.set(item.productId, existing);
      });
    });
    return Array.from(map.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [filteredOrders]);

  // Payment Breakdown
  const paymentBreakdown = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {
      tunai: { count: 0, total: 0 },
      qris: { count: 0, total: 0 },
      transfer: { count: 0, total: 0 },
      debit: { count: 0, total: 0 },
    };

    filteredOrders.forEach(o => {
      const method = o.paymentMethod || 'tunai';
      if (!map[method]) map[method] = { count: 0, total: 0 };
      map[method].count += 1;
      map[method].total += o.total;
    });

    return map;
  }, [filteredOrders]);

const handleExportExcel = async () => {
    const XLSX = await import('xlsx');

    const header = [
      'No',
      'No Nota',
      'Tanggal',
      'Nama Pelanggan',
      'No HP',
      'Subtotal',
      'Diskon',
      'Pajak',
      'Total',
      'Metode Bayar',
      'Status',
    ];

    const dataRows = filteredOrders.map((o, i) => [
      i + 1,
      o.invoiceNumber,
      formatDate(o.createdAt),
      o.customerName,
      o.customerPhone || '',
      o.subtotal,
      o.discount || 0,
      o.tax || 0,
      o.total,
      (o.paymentMethod || 'tunai').toUpperCase(),
      o.paymentStatus || '',
    ]);

    // Ringkasan total (ditaruh di sisi kanan tabel)
    const methods = Array.from(
      new Set([
        'tunai',
        'qris',
        'transfer',
        'debit',
        ...filteredOrders.map(o => o.paymentMethod || 'tunai'),
      ])
    );

    const summary: any[][] = [
      ['Metode Bayar', 'Jumlah Nota', 'Total'],
      ...methods.map(m => {
        const list = filteredOrders.filter(o => (o.paymentMethod || 'tunai') === m);
        return [
          m.toUpperCase(),
          list.length,
          list.reduce((a, o) => a + (o.total || 0), 0),
        ];
      }),
      [
        'TOTAL KESELURUHAN',
        filteredOrders.length,
        filteredOrders.reduce((a, o) => a + (o.total || 0), 0),
      ],
    ];

    // Gabungkan: tabel di kiri (kolom A-K), kolom L kosong, ringkasan di M-O
    const aoa: any[][] = [
      ['Laporan Penjualan'],
      [`Dicetak: ${formatDate(new Date().toISOString())}`],
      [],
    ];
    const bodyRows = Math.max(dataRows.length + 1, summary.length);
    for (let i = 0; i < bodyRows; i++) {
      const left = [...(i === 0 ? header : dataRows[i - 1] || [])];
      while (left.length < header.length) left.push('');
      const right = summary[i];
      aoa.push(right ? [...left, '', ...right] : left);
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Lebar kolom
    ws['!cols'] = [
      { wch: 5 },
      { wch: 22 },
      { wch: 20 },
      { wch: 24 },
      { wch: 16 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 10 },
      { wch: 3 },  // pemisah
      { wch: 24 }, // Metode Bayar (ringkasan)
      { wch: 13 }, // Jumlah Nota
      { wch: 16 }, // Total
    ];

    // Format angka ribuan: Subtotal-Total (F-I) dan ringkasan (N-O)
    for (let r = 4; r < aoa.length; r++) {
      for (const c of [5, 6, 7, 8, 13, 14]) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        if (cell && typeof cell.v === 'number') cell.z = '#,##0';
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan');

    const label = hasCustomRange
      ? `${customStart || 'awal'}_sd_${customEnd || 'akhir'}`
      : timeframe;
    XLSX.writeFile(
      wb,
      `laporan_penjualan_${label}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

const resetFilters = () => {
  setSearchQuery('');
  setPaymentFilter('all');
  setCustomStart('');
  setCustomEnd('');
  setTimeframe('all');
};

const activeFilterCount = useMemo(() => {
  let n = 0;
  if (searchQuery.trim()) n++;
  if (paymentFilter !== 'all') n++;
  if (hasCustomRange) n++;
  else if (timeframe !== 'all') n++;
  return n;
}, [searchQuery, paymentFilter, hasCustomRange, timeframe]);

  return (
    <div className="pb-28 px-4 pt-3 max-w-md mx-auto space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2
            className={`text-sm font-bold tracking-tight ${
              isDark ? 'text-white' : 'text-neutral-900'
            }`}
          >
            Laporan Penjualan
          </h2>
          <p className="text-[11px] text-neutral-500">
            Ringkasan omset & statistik transaksi
          </p>
        </div>
        <button
          onClick={handleExportExcel}
          className={`px-3 py-1.5 text-xs font-bold rounded-xl border inline-flex items-center gap-1.5 active:scale-95 transition-all ${
            isDark
              ? 'bg-neutral-800 text-neutral-200 border-neutral-700 hover:bg-neutral-750'
              : 'bg-white text-neutral-900 border-neutral-200 hover:bg-neutral-100 shadow-xs'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Excel</span>
        </button>
      </div>

      

{/* Filter (selalu tampil) */}
<div className="space-y-2">
  {/* Cari */}
  <div
    className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
      isDark
        ? 'bg-neutral-900 border-neutral-800'
        : 'bg-white border-neutral-200 shadow-xs'
    }`}
  >
    <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
    <input
      type="text"
      value={searchQuery}
      onChange={e => setSearchQuery(e.target.value)}
      placeholder="Cari no nota / nama..."
      className={`flex-1 min-w-0 text-xs bg-transparent outline-none ${
        isDark ? 'text-white placeholder:text-neutral-600' : 'text-neutral-900 placeholder:text-neutral-400'
      }`}
    />
    {searchQuery && (
      <button
        type="button"
        onClick={() => setSearchQuery('')}
        className="text-neutral-400 hover:text-neutral-600"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    )}
  </div>

  {/* Panel filter */}
  <div
    className={`p-3 rounded-2xl border space-y-3 ${
      isDark
        ? 'bg-neutral-900 border-neutral-800'
        : 'bg-white border-neutral-200 shadow-xs'
    }`}
  >
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-neutral-500 uppercase font-bold">
        Filter{activeFilterCount > 0 ? ` (${activeFilterCount} aktif)` : ''}
      </span>
      {activeFilterCount > 0 && (
        <button
          type="button"
          onClick={resetFilters}
          className="text-[10px] text-red-500 hover:text-red-600 font-bold"
        >
          Reset semua
        </button>
      )}
    </div>

    {/* Metode bayar */}
    <div>
      <label className="text-[10px] text-neutral-500 uppercase font-bold block mb-1.5">
        Metode Bayar
      </label>
      <div className="grid grid-cols-5 gap-1">
        {(['all', 'tunai', 'qris', 'transfer', 'debit'] as PaymentFilter[]).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => setPaymentFilter(m)}
            className={`py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors ${
              paymentFilter === m
                ? isDark
                  ? 'bg-white text-neutral-950'
                  : 'bg-neutral-900 text-white'
                : isDark
                  ? 'bg-neutral-800 text-neutral-400 hover:text-white'
                  : 'bg-neutral-100 text-neutral-500 hover:text-neutral-900'
            }`}
          >
            {m === 'all' ? 'Semua' : m}
          </button>
        ))}
      </div>
    </div>

    {/* Periode */}
    <div>
      <label className="text-[10px] text-neutral-500 uppercase font-bold block mb-1.5">
        Periode
      </label>
      <div className="grid grid-cols-4 gap-1">
        {([
          { id: 'today', label: 'Hari Ini' },
          { id: '7days', label: '7 Hari' },
          { id: 'month', label: 'Bulan Ini' },
          { id: 'all', label: 'Semua' },
        ] as { id: Timeframe; label: string }[]).map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setTimeframe(item.id);
              setCustomStart('');
              setCustomEnd('');
            }}
            className={`py-1.5 rounded-lg text-[10px] font-bold transition-colors ${
              !hasCustomRange && timeframe === item.id
                ? isDark
                  ? 'bg-white text-neutral-950'
                  : 'bg-neutral-900 text-white'
                : isDark
                  ? 'bg-neutral-800 text-neutral-400 hover:text-white'
                  : 'bg-neutral-100 text-neutral-500 hover:text-neutral-900'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>

    {/* Rentang tanggal */}
<div>
  <label className="text-[10px] text-neutral-500 uppercase font-bold block mb-1.5">
    Rentang Tanggal
  </label>
  <div className="grid grid-cols-2 gap-2">
    {([
      { label: 'Dari', value: customStart, set: setCustomStart, max: customEnd || undefined, min: undefined },
      { label: 'Sampai', value: customEnd, set: setCustomEnd, min: customStart || undefined, max: undefined },
    ] as const).map(f => (
      <div key={f.label} className="min-w-0">
        <label className="text-[9px] text-neutral-500 block mb-0.5">{f.label}</label>
        <div
          className={`relative h-9 w-full min-w-0 rounded-lg border overflow-hidden ${
            isDark
              ? 'bg-neutral-800 border-neutral-700'
              : 'bg-neutral-50 border-neutral-200'
          }`}
        >
          {/* Teks tampilan (dikontrol sendiri, sama di semua perangkat) */}
          <span
            className={`absolute inset-y-0 left-2 right-8 flex items-center text-xs font-mono pointer-events-none truncate ${
              f.value
                ? isDark ? 'text-white' : 'text-neutral-900'
                : 'text-neutral-400'
            }`}
          >
            {f.value
              ? new Date(f.value + 'T00:00:00').toLocaleDateString('id-ID', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                }).replace(/,/g, '')
              : 'dd mmm yyyy'}
          </span>

          {/* Ikon kalender */}
          <CalendarDays className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />

          {/* Input asli, transparan di atas semuanya agar tetap bisa diklik */}
          <input
            type="date"
            value={f.value}
            min={f.min}
            max={f.max}
            onChange={e => f.set(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none"
            style={{ WebkitAppearance: 'none', fontSize: 16 }}
          />
        </div>
      </div>
    ))}
  </div>
  {hasCustomRange && (
    <p className="text-[10px] text-neutral-500 mt-1.5">
      Rentang tanggal dipakai menggantikan pilihan Periode di atas.
    </p>
  )}
</div>
  </div>
</div>

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Total Omset */}
        <div
          className={`border rounded-2xl p-3.5 transition-colors ${
            isDark
              ? 'bg-neutral-900 border-neutral-800'
              : 'bg-white border-neutral-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-neutral-500 uppercase font-medium">
              Total Omset
            </span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-base font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums truncate">
            {formatRupiah(totalRevenue)}
          </div>
          <div className="text-[10px] text-neutral-500 mt-0.5">
            Pendapatan kotor
          </div>
        </div>

        {/* Total Transaksi */}
        <div
          className={`border rounded-2xl p-3.5 transition-colors ${
            isDark
              ? 'bg-neutral-900 border-neutral-800'
              : 'bg-white border-neutral-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-neutral-500 uppercase font-medium">
              Jumlah Pesanan
            </span>
            <Receipt className="w-3.5 h-3.5 text-neutral-400" />
          </div>
          <div
            className={`text-base font-extrabold font-mono mt-1 tabular-nums ${
              isDark ? 'text-white' : 'text-neutral-900'
            }`}
          >
            {totalOrdersCount}
          </div>
          <div className="text-[10px] text-neutral-500 mt-0.5">
            Nota transaksi terbit
          </div>
        </div>

        {/* Estimasi Laba */}
        <div
          className={`border rounded-2xl p-3.5 transition-colors ${
            isDark
              ? 'bg-neutral-900 border-neutral-800'
              : 'bg-white border-neutral-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-neutral-500 uppercase font-medium">
              Estimasi Laba
            </span>
            <DollarSign className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-sm font-bold font-mono text-amber-600 dark:text-amber-300 mt-1 tabular-nums truncate">
            {formatRupiah(totalProfit)}
          </div>
          <div className="text-[10px] text-neutral-500 mt-0.5">
            Omset - modal bahan
          </div>
        </div>

        {/* Rata-rata per order */}
        <div
          className={`border rounded-2xl p-3.5 transition-colors ${
            isDark
              ? 'bg-neutral-900 border-neutral-800'
              : 'bg-white border-neutral-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-neutral-500 uppercase font-medium">
              Rata-rata Order
            </span>
            <Layers className="w-3.5 h-3.5 text-neutral-400" />
          </div>
          <div
            className={`text-sm font-bold font-mono mt-1 tabular-nums truncate ${
              isDark ? 'text-neutral-200' : 'text-neutral-900'
            }`}
          >
            {formatRupiah(averageOrderValue)}
          </div>
          <div className="text-[10px] text-neutral-500 mt-0.5">
            Nilai rata-rata / nota
          </div>
        </div>
      </div>

      {/* Menu / Produk Terlaris */}
      <div
        className={`border rounded-2xl p-3.5 space-y-3 transition-colors ${
          isDark
            ? 'bg-neutral-900 border-neutral-800'
            : 'bg-white border-neutral-200 shadow-xs'
        }`}
      >
        <div className="flex items-center justify-between">
          <h3
            className={`text-xs font-bold ${
              isDark ? 'text-white' : 'text-neutral-900'
            }`}
          >
            Menu & Produk Terlaris
          </h3>
          <span className="text-[10px] text-neutral-400 font-mono font-bold">
            Top 5
          </span>
        </div>

        {topProducts.length === 0 ? (
          <p className="text-xs text-neutral-400 text-center py-4">
            Belum ada data penjualan pada periode ini
          </p>
        ) : (
          <div className="space-y-2.5">
            {topProducts.map((p, idx) => {
              const maxQty = topProducts[0]?.quantity || 1;
              const percent = Math.round((p.quantity / maxQty) * 100);

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span
                      className={`font-semibold truncate max-w-[200px] ${
                        isDark ? 'text-white' : 'text-neutral-900'
                      }`}
                    >
                      {idx + 1}. {p.name}
                    </span>
                    <span
                      className={`font-mono font-bold tabular-nums ${
                        isDark ? 'text-neutral-300' : 'text-neutral-900'
                      }`}
                    >
                      {p.quantity} terjual
                    </span>
                  </div>
                  {/* Progress bar visual */}
                  <div
                    className={`w-full rounded-full h-1.5 overflow-hidden ${
                      isDark ? 'bg-neutral-800' : 'bg-neutral-100'
                    }`}
                  >
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
                    <span>Omset Produk:</span>
                    <span>{formatRupiah(p.revenue)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Metode Pembayaran Breakdown */}
      <div
        className={`border rounded-2xl p-3.5 space-y-3 transition-colors ${
          isDark
            ? 'bg-neutral-900 border-neutral-800'
            : 'bg-white border-neutral-200 shadow-xs'
        }`}
      >
        <h3
          className={`text-xs font-bold ${
            isDark ? 'text-white' : 'text-neutral-900'
          }`}
        >
          Distribusi Metode Pembayaran
        </h3>

        <div className="grid grid-cols-2 gap-2">
          {Object.entries(paymentBreakdown).map(([method, data]) => {
            const pct =
              totalRevenue > 0
                ? Math.round((data.total / totalRevenue) * 100)
                : 0;
            return (
              <div
                key={method}
                className={`p-2.5 rounded-xl border ${
                  isDark
                    ? 'bg-neutral-800/60 border-neutral-700/60'
                    : 'bg-neutral-50 border-neutral-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[11px] font-bold uppercase ${
                      isDark ? 'text-white' : 'text-neutral-900'
                    }`}
                  >
                    {method}
                  </span>
                  <span className="text-[10px] font-mono text-neutral-500">
                    {data.count}x
                  </span>
                </div>
                <div
                  className={`text-xs font-bold font-mono mt-1 tabular-nums truncate ${
                    isDark ? 'text-neutral-200' : 'text-neutral-900'
                  }`}
                >
                  {formatRupiah(data.total)}
                </div>
                <div className="text-[10px] text-neutral-500 mt-0.5 font-mono">
                  {pct}% dari total
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transaksi Terbaru dalam Periode */}
      <div
        className={`border rounded-2xl p-3.5 space-y-2.5 transition-colors ${
          isDark
            ? 'bg-neutral-900 border-neutral-800'
            : 'bg-white border-neutral-200 shadow-xs'
        }`}
      >
        <div className="flex items-center justify-between">
  <h3 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
    Daftar Transaksi
  </h3>
  <span className="text-[10px] text-neutral-400 font-mono font-bold">
    {filteredOrders.length} nota
  </span>
</div>

        <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar">
          {filteredOrders.length === 0 ? (
            <p className="text-xs text-neutral-500 text-center py-3">
              Tidak ada data transaksi
            </p>
          ) : (
            filteredOrders.map(ord => (
              <div
                key={ord.id}
                onClick={() => onSelectOrder(ord)}
                className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                  isDark
                    ? 'bg-neutral-800/60 hover:bg-neutral-800 border-neutral-750'
                    : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200'
                }`}
              >
                <div>
                  <div
                    className={`text-xs font-bold font-mono ${
                      isDark ? 'text-white' : 'text-neutral-900'
                    }`}
                  >
                    {ord.invoiceNumber}
                  </div>
                  <div className="text-[10px] text-neutral-500">
                    {formatDate(ord.createdAt)} · {ord.customerName}
                  </div>
                </div>
                <div className="text-right flex items-center gap-2">
                  <div>
                    <div className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatRupiah(ord.total)}
                    </div>
                    <span className="text-[9px] uppercase font-mono text-neutral-500">
                      {ord.paymentMethod}
                    </span>
                  </div>

                  {isAdminAuthenticated && (
                    <>
                      <button
                        type="button"
                        title="Edit Invoice"
                        onClick={e => {
                          e.stopPropagation();
                          openEditOrder(ord);
                        }}
                        className={`p-1 rounded-md transition-colors ${
                          isDark
                            ? 'text-neutral-400 hover:text-white hover:bg-neutral-700'
                            : 'text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200'
                        }`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {onDeleteOrder && (
                        <button
                          type="button"
                          title="Hapus Invoice"
                          onClick={e => {
                            e.stopPropagation();
                            setConfirmDeleteOrder(ord);
                          }}
                          className={`p-1 rounded-md transition-colors ${
                            isDark
                              ? 'text-neutral-400 hover:text-red-400 hover:bg-red-950/40'
                              : 'text-neutral-400 hover:text-red-600 hover:bg-red-50'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  )}

                  <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Edit Invoice (Admin) */}
      {isAdminAuthenticated && editingOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 transition-opacity duration-150 animate-in fade-in">
          <form
            onSubmit={handleSaveEditOrder}
            className={`w-full max-w-md border rounded-t-3xl sm:rounded-2xl p-5 space-y-3 max-h-[92vh] overflow-y-auto no-scrollbar transition-all duration-150 animate-in fade-in zoom-in-95 ${
              isDark
                ? 'bg-neutral-900 border-neutral-800'
                : 'bg-white border-neutral-200 shadow-2xl'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3
                  className={`text-sm font-bold ${
                    isDark ? 'text-white' : 'text-neutral-900'
                  }`}
                >
                  Edit Invoice
                </h3>
                <p className="text-[11px] text-neutral-500 font-mono">
                  {editingOrder.invoiceNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className={`w-7 h-7 rounded-full flex items-center justify-center ${
                  isDark
                    ? 'bg-neutral-800 text-neutral-400'
                    : 'bg-neutral-100 text-neutral-500'
                }`}
              >
                ✕
              </button>
            </div>

            {/* Customer */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-neutral-500 block mb-1">
                  Nama Customer *
                </label>
                <input
                  required
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className={`w-full text-xs p-2.5 rounded-xl border outline-none ${
                    isDark
                      ? 'bg-neutral-800 text-white border-neutral-700'
                      : 'bg-neutral-50 text-neutral-900 border-neutral-200'
                  }`}
                />
              </div>
              <div>
                <label className="text-[11px] text-neutral-500 block mb-1">
                  No. HP
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  className={`w-full text-xs p-2.5 rounded-xl border outline-none font-mono ${
                    isDark
                      ? 'bg-neutral-800 text-white border-neutral-700'
                      : 'bg-neutral-50 text-neutral-900 border-neutral-200'
                  }`}
                />
              </div>
            </div>

            {/* Item */}
            <div className="space-y-2">
              <label className="text-[11px] text-neutral-500 block">
                Item Pesanan
              </label>

              {editItems.map((it, idx) => {
                const isAreaMode = !!(
                  (it as any).length ||
                  (it as any).width ||
                  (it as any).area
                );
                return (
                  <div
                    key={`${it.productId}-${idx}`}
                    className={`p-2.5 rounded-xl border space-y-2 ${
                      isDark
                        ? 'bg-neutral-800/60 border-neutral-700'
                        : 'bg-neutral-50 border-neutral-200'
                    }`}
                  >
                    {/* Header item */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-xs font-bold truncate ${
                          isDark ? 'text-white' : 'text-neutral-900'
                        }`}
                      >
                        {it.productName}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleAreaMode(idx, !isAreaMode)}
                          title={
                            isAreaMode
                              ? 'Matikan mode m²'
                              : 'Aktifkan mode m² (P × L)'
                          }
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                            isAreaMode
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : isDark
                              ? 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white'
                              : 'bg-white text-neutral-500 border-neutral-200 hover:text-neutral-900'
                          }`}
                        >
                          m²
                        </button>
                        <button
                          type="button"
                          onClick={() => removeEditItem(idx)}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg"
                          title="Hapus item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Info harga × qty (× area) */}
                    <div className="text-[11px] font-mono text-neutral-500">
                      {formatRupiah(it.price)} × {it.quantity}
                      {isAreaMode && (it as any).area
                        ? ` × ${(it as any).area} m²`
                        : ''}{' '}
                      ={' '}
                      <strong
                        className={isDark ? 'text-white' : 'text-neutral-900'}
                      >
                        {formatRupiah(calcItemSubtotal(it))}
                      </strong>
                    </div>

                    {/* Input harga & jumlah */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-neutral-500 block mb-0.5">
                          Harga (Rp){isAreaMode ? ' / m²' : ''}
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={it.price}
                          onChange={e =>
                            updateEditItem(idx, {
                              price: Number(e.target.value),
                            })
                          }
                          className={`w-full text-xs p-2 rounded-lg border outline-none font-mono ${
                            isDark
                              ? 'bg-neutral-800 text-white border-neutral-700'
                              : 'bg-white text-neutral-900 border-neutral-200'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-neutral-500 block mb-0.5">
                          Jumlah
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={it.quantity}
                          onChange={e =>
                            updateEditItem(idx, {
                              quantity: Number(e.target.value),
                            })
                          }
                          className={`w-full text-xs p-2 rounded-lg border outline-none font-mono ${
                            isDark
                              ? 'bg-neutral-800 text-white border-neutral-700'
                              : 'bg-white text-neutral-900 border-neutral-200'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Input P × L (muncul kalau area mode aktif) */}
                    {isAreaMode && (
                      <div
                        className={`p-2 rounded-lg border flex items-end gap-2 ${
                          isDark
                            ? 'bg-neutral-800/40 border-neutral-700'
                            : 'bg-white border-neutral-200'
                        }`}
                      >
                        <div className="flex-1">
                          <label className="text-[10px] text-neutral-500 block mb-0.5">
                            P (m)
                          </label>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={(it as any).length ?? ''}
                            onChange={e =>
                              updateEditItemArea(idx, {
                                length: Number(e.target.value),
                              })
                            }
                            placeholder="0"
                            className={`w-full text-xs p-2 rounded-lg border outline-none font-mono ${
                              isDark
                                ? 'bg-neutral-800 text-white border-neutral-700'
                                : 'bg-neutral-50 text-neutral-900 border-neutral-200'
                            }`}
                          />
                        </div>
                        <span className="text-neutral-400 text-xs pb-2">
                          ×
                        </span>
                        <div className="flex-1">
                          <label className="text-[10px] text-neutral-500 block mb-0.5">
                            L (m)
                          </label>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={(it as any).width ?? ''}
                            onChange={e =>
                              updateEditItemArea(idx, {
                                width: Number(e.target.value),
                              })
                            }
                            placeholder="0"
                            className={`w-full text-xs p-2 rounded-lg border outline-none font-mono ${
                              isDark
                                ? 'bg-neutral-800 text-white border-neutral-700'
                                : 'bg-neutral-50 text-neutral-900 border-neutral-200'
                            }`}
                          />
                        </div>
                        <span className="text-neutral-400 text-xs pb-2">
                          =
                        </span>
                        <div className="w-16 pb-2 text-right">
                          <span
                            className={`text-xs font-bold font-mono ${
                              isDark ? 'text-emerald-400' : 'text-emerald-600'
                            }`}
                          >
                            {((it as any).area ?? 0).toFixed(2)} m²
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Tambah item */}
              {products.length > 0 && (
                <div className="flex gap-2">
                  <select
                    value={addProductId}
                    onChange={e => setAddProductId(e.target.value)}
                    className={`flex-1 text-xs p-2.5 rounded-xl border outline-none ${
                      isDark
                        ? 'bg-neutral-800 text-white border-neutral-700'
                        : 'bg-neutral-50 text-neutral-900 border-neutral-200'
                    }`}
                  >
                    <option value="">+ Tambah produk...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatRupiah(p.price)})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={addEditItem}
                    disabled={!addProductId}
                    className={`px-3 rounded-xl text-xs font-bold inline-flex items-center disabled:opacity-40 ${
                      isDark
                        ? 'bg-white text-neutral-950'
                        : 'bg-neutral-900 text-white'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Diskon, pajak */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-neutral-500 block mb-1">
                  Diskon (Rp)
                </label>
                <input
                  type="number"
                  min={0}
                  value={editDiscount}
                  onChange={e => setEditDiscount(Number(e.target.value))}
                  className={`w-full text-xs p-2.5 rounded-xl border outline-none font-mono ${
                    isDark
                      ? 'bg-neutral-800 text-white border-neutral-700'
                      : 'bg-neutral-50 text-neutral-900 border-neutral-200'
                  }`}
                />
              </div>
              <div>
                <label className="text-[11px] text-neutral-500 block mb-1">
                  Pajak (Rp)
                </label>
                <input
                  type="number"
                  min={0}
                  value={editTax}
                  onChange={e => setEditTax(Number(e.target.value))}
                  className={`w-full text-xs p-2.5 rounded-xl border outline-none font-mono ${
                    isDark
                      ? 'bg-neutral-800 text-white border-neutral-700'
                      : 'bg-neutral-50 text-neutral-900 border-neutral-200'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-neutral-500 block mb-1">
                Metode Bayar
              </label>
              <select
                value={editMethod}
                onChange={e =>
                  setEditMethod(e.target.value as Order['paymentMethod'])
                }
                className={`w-full text-xs p-2.5 rounded-xl border outline-none ${
                  isDark
                    ? 'bg-neutral-800 text-white border-neutral-700'
                    : 'bg-neutral-50 text-neutral-900 border-neutral-200'
                }`}
              >
                <option value="tunai">Tunai</option>
                <option value="qris">QRIS</option>
                <option value="transfer">Transfer</option>
                <option value="debit">Debit</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-neutral-500 block mb-1">
                Catatan
              </label>
              <input
                type="text"
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                className={`w-full text-xs p-2.5 rounded-xl border outline-none ${
                  isDark
                    ? 'bg-neutral-800 text-white border-neutral-700'
                    : 'bg-neutral-50 text-neutral-900 border-neutral-200'
                }`}
              />
            </div>

            {/* Ringkasan */}
            <div
              className={`p-3 rounded-xl border text-xs font-mono space-y-1 ${
                isDark
                  ? 'bg-neutral-800/60 border-neutral-700 text-neutral-300'
                  : 'bg-neutral-50 border-neutral-200 text-neutral-700'
              }`}
            >
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatRupiah(editSubtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Diskon</span>
                <span>- {formatRupiah(editDiscount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Pajak</span>
                <span>{formatRupiah(editTax)}</span>
              </div>
              <div
                className={`flex justify-between font-bold pt-1 border-t ${
                  isDark
                    ? 'border-neutral-700 text-white'
                    : 'border-neutral-200 text-neutral-900'
                }`}
              >
                <span>Total</span>
                <span>{formatRupiah(editTotal)}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className={`flex-1 py-2.5 font-bold rounded-xl text-xs ${
                  isDark
                    ? 'bg-neutral-800 text-neutral-300'
                    : 'bg-neutral-100 text-neutral-700'
                }`}
              >
                Batal
              </button>
              <button
                type="submit"
                className={`flex-1 py-2.5 font-bold rounded-xl text-xs inline-flex items-center justify-center gap-1.5 ${
                  isDark
                    ? 'bg-white text-neutral-950'
                    : 'bg-neutral-900 text-white'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Invoice */}
      {isAdminAuthenticated && confirmDeleteOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 transition-opacity duration-150 animate-in fade-in">
          <div
            className={`w-full max-w-sm border rounded-2xl p-5 space-y-4 transition-all duration-150 animate-in fade-in zoom-in-95 ${
              isDark
                ? 'bg-neutral-900 border-neutral-800'
                : 'bg-white border-neutral-200 shadow-2xl'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  isDark
                    ? 'bg-red-950/50 text-red-400'
                    : 'bg-red-50 text-red-600'
                }`}
              >
                <Trash2 className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h3
                  className={`text-sm font-bold ${
                    isDark ? 'text-white' : 'text-neutral-900'
                  }`}
                >
                  Hapus Invoice?
                </h3>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Invoice{' '}
                  <strong className="font-mono">
                    {confirmDeleteOrder.invoiceNumber}
                  </strong>{' '}
                  milik <strong>{confirmDeleteOrder.customerName}</strong> akan
                  dihapus permanen. Tindakan ini tidak bisa dibatalkan.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteOrder(null)}
                className={`flex-1 py-2.5 font-bold rounded-xl text-xs ${
                  isDark
                    ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteOrder?.(confirmDeleteOrder.id);
                  setConfirmDeleteOrder(null);
                }}
                className={`flex-1 py-2.5 font-bold rounded-xl text-xs inline-flex items-center justify-center gap-1.5 ${
                  isDark
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};