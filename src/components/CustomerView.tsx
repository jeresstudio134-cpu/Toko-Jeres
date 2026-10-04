import React, { useState, useMemo } from 'react';
import { Customer, Order } from '../types';
import { formatRupiah, formatDateOnly } from '../utils/format';
import {
  Users,
  Search,
  MessageCircle,
  Plus,
  Download,
  Phone,
  ChevronRight,
  Trash2,
  X,
} from 'lucide-react';

interface CustomerViewProps {
  customers: Customer[];
  orders: Order[];
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer: (customer: Customer) => Promise<string | null>;
  onViewCustomerOrder: (order: Order) => void;
  onDeleteCustomer: (id: string) => Promise<string | null>;
  isAdminAuthenticated?: boolean;
  theme?: 'light' | 'dark';
}

export const CustomerView: React.FC<CustomerViewProps> = ({
  customers,
  orders,
  onAddCustomer,
  onUpdateCustomer,
  onViewCustomerOrder,
  onDeleteCustomer,
  isAdminAuthenticated = false,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'spent' | 'orders' | 'recent'>('spent');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Pesan notifikasi (toast)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 2500);
  };

  // Form for manual add
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Editing notes
  const [editNotes, setEditNotes] = useState('');

  // CRM Metrics
  const totalCustomers = customers.length;
  const repeatCustomers = customers.filter(c => c.ordersCount > 1).length;
  const totalLifetimeRevenue = customers.reduce((acc, c) => acc + (c.totalSpent || 0), 0);

  // Filtered and sorted customers
  const filteredCustomers = useMemo(() => {
    return customers
      .filter(
        c =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.phone.replace(/[^0-9]/g, '').includes(search.replace(/[^0-9]/g, '')) ||
          (c.address && c.address.toLowerCase().includes(search.toLowerCase()))
      )
      .sort((a, b) => {
        if (sortBy === 'spent') return (b.totalSpent || 0) - (a.totalSpent || 0);
        if (sortBy === 'orders') return (b.ordersCount || 0) - (a.ordersCount || 0);
        return new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime();
      });
  }, [customers, search, sortBy]);

  // Customer transactions history
  const customerOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    return orders.filter(
      o =>
        o.customerId === selectedCustomer.id ||
        (o.customerPhone && o.customerPhone === selectedCustomer.phone) ||
        o.customerName.toLowerCase() === selectedCustomer.name.toLowerCase()
    );
  }, [selectedCustomer, orders]);

  const handleOpenCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setEditNotes(c.notes || '');
  };

  const handleSaveNotes = async () => {
    if (!selectedCustomer) return;
    const updated: Customer = {
      ...selectedCustomer,
      notes: editNotes,
    };
    const error = await onUpdateCustomer(updated);
    if (error) {
      showToast('error', 'Gagal menyimpan catatan: ' + error);
      return;
    }
    setSelectedCustomer(updated);
    showToast('success', 'Catatan berhasil disimpan');
  };

  const handleDeleteCustomer = async (c: Customer) => {
    const ok = window.confirm(
      `Hapus customer "${c.name}"?\n\nRiwayat nota tidak ikut terhapus.`
    );
    if (!ok) return;
    const error = await onDeleteCustomer(c.id);
    if (error) {
      showToast('error', 'Gagal menghapus customer: ' + error);
      return;
    }
    setSelectedCustomer(null);
    showToast('success', `Customer "${c.name}" berhasil dihapus`);
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      name: newName.trim(),
      phone: newPhone.trim(),
      email: newEmail.trim() || undefined,
      address: newAddress.trim() || undefined,
      totalSpent: 0,
      ordersCount: 0,
      firstVisit: new Date().toISOString(),
      lastVisit: new Date().toISOString(),
      notes: newNotes.trim() || undefined,
    };

    onAddCustomer(newCust);
    setShowAddModal(false);
    setNewName('');
    setNewPhone('');
    setNewEmail('');
    setNewAddress('');
    setNewNotes('');
  };

  const handleExportCsv = () => {
    const headers = ['ID', 'Nama', 'No HP', 'Email', 'Alamat', 'Total Belanja', 'Jumlah Transaksi', 'Kunjungan Terakhir', 'Catatan'];
    const rows = customers.map(c => [
      c.id,
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.phone}"`,
      `"${c.email || ''}"`,
      `"${(c.address || '').replace(/"/g, '""')}"`,
      c.totalSpent,
      c.ordersCount,
      c.lastVisit,
      `"${(c.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `customer_kios_minimalis_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="pb-28 px-4 pt-3 max-w-md mx-auto space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-sm font-bold tracking-tight ${isDark ? 'text-white' : 'text-neutral-900'}`}>
            Database Customer
          </h2>
          <p className="text-[11px] text-neutral-500">Pencatatan otomatis dari setiap order kasir</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleExportCsv}
            title="Export CSV"
            className={`p-2 rounded-xl border text-xs active:scale-95 transition-all ${
              isDark
                ? 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-750'
                : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100 shadow-xs'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className={`px-3 py-1.5 font-bold rounded-xl text-xs inline-flex items-center gap-1 active:scale-95 transition-all shadow-xs ${
              isDark
                ? 'bg-white text-neutral-950 hover:bg-neutral-200'
                : 'bg-neutral-900 text-white hover:bg-neutral-800'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah</span>
          </button>
        </div>
      </div>

      {/* CRM Stats Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div
          className={`border rounded-2xl p-3 transition-colors ${
            isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'
          }`}
        >
          <span className="text-[10px] text-neutral-400 uppercase font-medium">Pelanggan</span>
          <div className={`text-base font-bold font-mono mt-0.5 tabular-nums ${isDark ? 'text-white' : 'text-neutral-900'}`}>
            {totalCustomers}
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Auto-recorded</span>
        </div>
        <div
          className={`border rounded-2xl p-3 transition-colors ${
            isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'
          }`}
        >
          <span className="text-[10px] text-neutral-400 uppercase font-medium">Repeat Order</span>
          <div className={`text-base font-bold font-mono mt-0.5 tabular-nums ${isDark ? 'text-white' : 'text-neutral-900'}`}>
            {repeatCustomers}
          </div>
          <span className="text-[10px] text-neutral-500">
            {totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0}% loyal
          </span>
        </div>
        <div
          className={`border rounded-2xl p-3 transition-colors ${
            isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'
          }`}
        >
          <span className="text-[10px] text-neutral-400 uppercase font-medium">Nilai Transaksi</span>
          <div className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums truncate">
            {formatRupiah(totalLifetimeRevenue)}
          </div>
          <span className="text-[10px] text-neutral-500">Total belanja</span>
        </div>
      </div>

      {/* Search & Sort Controls */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama, WhatsApp, atau alamat..."
            className={`w-full text-xs rounded-xl pl-8 pr-3 py-2 border outline-none ${
              isDark
                ? 'bg-neutral-900 text-white placeholder-neutral-500 border-neutral-800'
                : 'bg-white text-neutral-900 placeholder-neutral-400 border-neutral-200 shadow-xs'
            }`}
          />
        </div>

        {/* Sort segmented bar */}
        <div
          className={`flex items-center gap-1 p-1 rounded-xl border text-xs ${
            isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'
          }`}
        >
          <span className="text-[10px] text-neutral-500 px-2 font-medium">Urutkan:</span>
          <button
            onClick={() => setSortBy('spent')}
            className={`flex-1 py-1 rounded-lg text-[11px] font-bold transition-all ${
              sortBy === 'spent'
                ? isDark
                  ? 'bg-white text-neutral-950'
                  : 'bg-neutral-900 text-white'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            Total Belanja
          </button>
          <button
            onClick={() => setSortBy('orders')}
            className={`flex-1 py-1 rounded-lg text-[11px] font-bold transition-all ${
              sortBy === 'orders'
                ? isDark
                  ? 'bg-white text-neutral-950'
                  : 'bg-neutral-900 text-white'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            Frekuensi
          </button>
          <button
            onClick={() => setSortBy('recent')}
            className={`flex-1 py-1 rounded-lg text-[11px] font-bold transition-all ${
              sortBy === 'recent'
                ? isDark
                  ? 'bg-white text-neutral-950'
                  : 'bg-neutral-900 text-white'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            Terbaru
          </button>
        </div>
      </div>

      {/* Customer List */}
      <div className="space-y-2">
        {filteredCustomers.length === 0 ? (
          <div
            className={`border rounded-2xl p-8 text-center ${
              isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
            }`}
          >
            <Users className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
            <p className="text-xs text-neutral-500">Tidak ada data customer</p>
          </div>
        ) : (
          filteredCustomers.map(customer => {
            const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
            const waPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;

            return (
              <div
                key={customer.id}
                onClick={() => handleOpenCustomer(customer)}
                className={`border rounded-2xl p-3 flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] ${
                  isDark
                    ? 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
                    : 'bg-white border-neutral-200/90 hover:border-neutral-300 shadow-xs'
                }`}
              >
                <div className="flex-1 min-w-0 pr-3">
                  <div className="flex items-center gap-1.5">
                    <h3 className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                      {customer.name}
                    </h3>
                    {customer.ordersCount > 2 && (
                      <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 px-1.5 py-0.2 rounded">
                        Loyal
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-neutral-500 mt-1">
                    {customer.phone ? (
                      <span className="font-mono">{customer.phone}</span>
                    ) : (
                      <span>Tanpa no. HP</span>
                    )}
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                      {customer.ordersCount}x order
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{formatDateOnly(customer.lastVisit)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-right">
                    <div className={`text-xs font-bold font-mono tabular-nums ${isDark ? 'text-neutral-100' : 'text-neutral-900'}`}>
                      {formatRupiah(customer.totalSpent || 0)}
                    </div>
                  </div>

                  {customer.phone && (
                    <a
                      href={`https://wa.me/${waPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      title="Hubungi WhatsApp"
                      className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800/60 flex items-center justify-center active:scale-90 transition-transform shadow-xs"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  )}

                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Customer Detail Drawer / Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className={`w-full max-w-md border rounded-t-3xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto no-scrollbar space-y-4 ${
              isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200 shadow-2xl'
            }`}
          >
            <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-neutral-800' : 'border-neutral-100'}`}>
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                    isDark ? 'bg-neutral-800 text-white' : 'bg-neutral-100 text-neutral-900'
                  }`}
                >
                  {selectedCustomer.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                    {selectedCustomer.name}
                  </h3>
                  <p className="text-[11px] text-neutral-500 font-mono">
                    ID: {selectedCustomer.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isDark ? 'bg-neutral-800 text-neutral-400 hover:text-white' : 'bg-neutral-100 text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-2">
              <div className={`p-3 rounded-xl border ${isDark ? 'bg-neutral-850 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
                <span className="text-[10px] text-neutral-500 uppercase">Total Akumulasi</span>
                <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-nums">
                  {formatRupiah(selectedCustomer.totalSpent || 0)}
                </div>
              </div>
              <div className={`p-3 rounded-xl border ${isDark ? 'bg-neutral-850 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
                <span className="text-[10px] text-neutral-500 uppercase">Frekuensi Order</span>
                <div className={`text-sm font-bold font-mono mt-0.5 tabular-nums ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                  {selectedCustomer.ordersCount} kali
                </div>
              </div>
            </div>

            {/* Info details */}
            <div className="space-y-2 text-xs">
              {selectedCustomer.phone && (
                <div className={`flex items-center justify-between p-2.5 rounded-xl border ${isDark ? 'bg-neutral-800/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-neutral-500" />
                    <span className="font-mono font-semibold">{selectedCustomer.phone}</span>
                  </div>
                  <a
                    href={`https://wa.me/${selectedCustomer.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-xs"
                  >
                    <MessageCircle className="w-3 h-3" />
                    <span>Chat WA</span>
                  </a>
                </div>
              )}

              {selectedCustomer.address && (
                <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-neutral-800/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
                  <span className="text-[10px] text-neutral-500 block mb-0.5">Alamat:</span>
                  <p>{selectedCustomer.address}</p>
                </div>
              )}

              <div className={`p-2.5 rounded-xl border space-y-1.5 ${isDark ? 'bg-neutral-800/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
                <span className="text-[10px] text-neutral-500 block">Catatan Pelanggan:</span>
                <textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="Cth: Suka kopi less sugar, sering beli saat weekend..."
                  className={`w-full text-xs p-2 rounded-lg border outline-none ${
                    isDark ? 'bg-neutral-900 text-white border-neutral-700' : 'bg-white text-neutral-900 border-neutral-200'
                  }`}
                  rows={2}
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    className={`px-3 py-1 font-bold rounded-lg text-[11px] ${
                      isDark ? 'bg-neutral-200 text-neutral-950' : 'bg-neutral-900 text-white'
                    }`}
                  >
                    Simpan Catatan
                  </button>

                  {isAdminAuthenticated && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCustomer(selectedCustomer)}
                      className={`px-3 py-1 font-bold rounded-lg text-[11px] border inline-flex items-center gap-1 active:scale-95 transition-all ${
                        isDark
                          ? 'border-red-900/60 text-red-400 hover:bg-red-950/40'
                          : 'border-red-200 text-red-600 hover:bg-red-50'
                      }`}
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Hapus Customer</span>
                    </button>
                  )}
                </div>
              </div>
            </div>



            {/* Transaction History of this Customer */}
            <div className={`space-y-2 pt-2 border-t ${isDark ? 'border-neutral-800' : 'border-neutral-100'}`}>
              <h4 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                Riwayat Transaksi Pelanggan
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                {customerOrders.length === 0 ? (
                  <p className="text-[11px] text-neutral-500 italic">Belum ada nota terkait</p>
                ) : (
                  customerOrders.map(ord => (
                    <div
                      key={ord.id}
                      onClick={() => {
                        onViewCustomerOrder(ord);
                        setSelectedCustomer(null);
                      }}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                        isDark
                          ? 'bg-neutral-800/50 hover:bg-neutral-800 border-neutral-700/60'
                          : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold font-mono">
                          {ord.invoiceNumber}
                        </div>
                        <div className="text-[10px] text-neutral-500">
                          {formatDateOnly(ord.createdAt)} · {ord.items.length} item
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                          {formatRupiah(ord.total)}
                        </div>
                        <span className="text-[9px] text-neutral-500 uppercase font-mono">
                          {ord.paymentMethod}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <form
            onSubmit={handleCreateCustomer}
            className={`w-full max-w-md border rounded-t-3xl sm:rounded-2xl p-5 space-y-3 ${
              isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200 shadow-2xl'
            }`}
          >
            <div className={`flex items-center justify-between border-b pb-2 ${isDark ? 'border-neutral-800' : 'border-neutral-100'}`}>
              <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                Tambah Pelanggan Baru
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className={`w-7 h-7 rounded-full flex items-center justify-center ${
                  isDark ? 'bg-neutral-800 text-neutral-400' : 'bg-neutral-100 text-neutral-500'
                }`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] text-neutral-500 block">Nama Lengkap *</label>
              <input
                required
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Cth: Ahmad Subari"
                className={`w-full text-xs p-2.5 rounded-xl border outline-none ${
                  isDark ? 'bg-neutral-800 text-white border-neutral-700' : 'bg-neutral-50 text-neutral-900 border-neutral-200'
                }`}
              />

              <label className="text-[11px] text-neutral-500 block">Nomor WhatsApp / HP</label>
              <input
                type="tel"
                value={newPhone}
                onChange={e => setNewPhone(e.target.value)}
                placeholder="08123456789"
                className={`w-full text-xs p-2.5 rounded-xl border outline-none ${
                  isDark ? 'bg-neutral-800 text-white border-neutral-700' : 'bg-neutral-50 text-neutral-900 border-neutral-200'
                }`}
              />

              <label className="text-[11px] text-neutral-500 block">Alamat (Opsional)</label>
              <input
                type="text"
                value={newAddress}
                onChange={e => setNewAddress(e.target.value)}
                placeholder="Alamat singkat..."
                className={`w-full text-xs p-2.5 rounded-xl border outline-none ${
                  isDark ? 'bg-neutral-800 text-white border-neutral-700' : 'bg-neutral-50 text-neutral-900 border-neutral-200'
                }`}
              />

              <label className="text-[11px] text-neutral-500 block">Catatan</label>
              <input
                type="text"
                value={newNotes}
                onChange={e => setNewNotes(e.target.value)}
                placeholder="Preferensi atau info penting..."
                className={`w-full text-xs p-2.5 rounded-xl border outline-none ${
                  isDark ? 'bg-neutral-800 text-white border-neutral-700' : 'bg-neutral-50 text-neutral-900 border-neutral-200'
                }`}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className={`flex-1 py-2.5 font-bold rounded-xl text-xs ${
                  isDark ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-100 text-neutral-700'
                }`}
              >
                Batal
              </button>
              <button
                type="submit"
                className={`flex-1 py-2.5 font-bold rounded-xl text-xs shadow-xs ${
                  isDark ? 'bg-white text-neutral-950' : 'bg-neutral-900 text-white'
                }`}
              >
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pesan notifikasi */}
      {toast && (
        <div
          role="status"
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] max-w-[90vw] px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
};
