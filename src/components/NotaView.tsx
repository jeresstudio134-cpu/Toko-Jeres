import React, { useState } from 'react';
import { Order, StoreSettings } from '../types';
import {
  formatRupiah,
  formatDate,
  generateWhatsAppReceiptText,
  getWhatsAppShareUrl,
  extractInvoiceNumberFromScannedText,
} from '../utils/format';
import {
  Printer,
  Share2,
  Copy,
  Check,
  Search,
  Receipt,
  ScanLine,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { QRCodeComponent } from './QRCodeComponent';
import { preloadLazyChunk } from '../utils/preload';

const BarcodeScanner = React.lazy(() =>
  import('./BarcodeScanner').then(m => ({ default: m.BarcodeScanner }))
);

interface NotaViewProps {
  orders: Order[];
  activeOrder: Order | null;
  settings: StoreSettings;
  onSelectOrder: (order: Order) => void;
  onNewTransaction: () => void;
  theme?: 'light' | 'dark';
}

export const NotaView: React.FC<NotaViewProps> = ({
  orders,
  activeOrder,
  settings,
  onSelectOrder,
  onNewTransaction,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [viewFormat, setViewFormat] = useState<'thermal' | 'invoice'>('thermal');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanToast, setScanToast] = useState<{
    type: 'success' | 'notFound';
    message: string;
  } | null>(null);

  const currentOrder = activeOrder || (orders.length > 0 ? orders[0] : null);
  const qrReceiptText = currentOrder ? currentOrder.invoiceNumber : '';

  const handleBarcodeScanned = (scannedCode: string) => {
    setIsScannerOpen(false);
    const clean = scannedCode.trim();
    if (!clean) return;

    const extractedInvoice = extractInvoiceNumberFromScannedText(clean);

    // Cari order yang invoiceNumber-nya cocok dengan hasil ekstraksi atau substring
    const matched = orders.find(o => {
      const inv = o.invoiceNumber.toLowerCase().trim();
      return (
        inv === extractedInvoice.toLowerCase().trim() ||
        inv === clean.toLowerCase() ||
        clean.toLowerCase().includes(inv)
      );
    });

    if (matched) {
      onSelectOrder(matched);
      setSearch('');
      setScanToast({
        type: 'success',
        message: `Nota ${matched.invoiceNumber} (${matched.customerName}) berhasil ditemukan!`,
      });
      setTimeout(() => setScanToast(null), 4000);
    } else {
      const searchVal = extractedInvoice || clean;
      setSearch(searchVal);
      setScanToast({
        type: 'notFound',
        message: `Nota "${searchVal}" tidak ditemukan di daftar transaksi.`,
      });
      setTimeout(() => setScanToast(null), 4500);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const query = search.trim();
      if (query) {
        const extracted = extractInvoiceNumberFromScannedText(query);
        const matched = orders.find(o => {
          const inv = o.invoiceNumber.toLowerCase().trim();
          return (
            inv === extracted.toLowerCase().trim() ||
            inv === query.toLowerCase() ||
            query.toLowerCase().includes(inv)
          );
        });
        if (matched) {
          onSelectOrder(matched);
          setSearch('');
          setScanToast({
            type: 'success',
            message: `Nota ${matched.invoiceNumber} (${matched.customerName}) berhasil ditemukan!`,
          });
          setTimeout(() => setScanToast(null), 4000);
        } else {
          setScanToast({
            type: 'notFound',
            message: `Nota "${extracted || query}" tidak ditemukan.`,
          });
          setTimeout(() => setScanToast(null), 4000);
        }
      }
    }
  };

  const filteredOrders = orders.filter(
    o =>
      o.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (o.customerPhone && o.customerPhone.includes(search))
  );

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = async () => {
    if (!currentOrder) return;
    const text = generateWhatsAppReceiptText(currentOrder, settings);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleWhatsApp = () => {
    if (!currentOrder) return;
    const text = generateWhatsAppReceiptText(currentOrder, settings);
    const url = getWhatsAppShareUrl(currentOrder.customerPhone || '', text);
    window.open(url, '_blank');
  };

  return (
    <div className="pb-28 px-4 pt-3 max-w-md mx-auto space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h2 className={`text-sm font-bold tracking-tight ${isDark ? 'text-white' : 'text-neutral-900'}`}>
            Nota & Struk Penjualan
          </h2>
          <p className="text-[11px] text-neutral-500">Cetak printer thermal atau bagikan ke WhatsApp</p>
        </div>
        <button
          onClick={onNewTransaction}
          className={`px-3 py-1.5 text-xs font-bold rounded-xl border active:scale-95 transition-all ${
            isDark
              ? 'bg-neutral-800 text-neutral-200 border-neutral-700 hover:bg-neutral-750'
              : 'bg-neutral-100 text-neutral-900 border-neutral-200 hover:bg-neutral-200'
          }`}
        >
          + Order Baru
        </button>
      </div>

      {/* Toast Notifikasi Hasil Scan / Cari Barcode */}
      {scanToast && (
        <div
          className={`print:hidden p-3 rounded-xl border flex items-center justify-between text-xs transition-all shadow-sm ${
            scanToast.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
          }`}
        >
          <div className="flex items-center gap-2 pr-2">
            {scanToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
            )}
            <span className="font-semibold leading-tight">{scanToast.message}</span>
          </div>
          <button
            onClick={() => setScanToast(null)}
            aria-label="Tutup notifikasi"
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-neutral-500 flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {currentOrder ? (
        <div className="space-y-3.5 print:space-y-0">
          {/* Format Switcher */}
          <div
  className={`print:hidden flex items-center justify-between border p-1.5 rounded-xl transition-colors ${
              isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'
            }`}
          >
            <span className="text-[11px] text-neutral-500 pl-2 font-medium">Format Tampilan:</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setViewFormat('thermal')}
                className={`px-3 py-1 text-xs rounded-lg font-bold transition-colors ${
                  viewFormat === 'thermal'
                    ? isDark
                      ? 'bg-white text-neutral-950 shadow-xs'
                      : 'bg-neutral-900 text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                Thermal Struk
              </button>
              <button
                onClick={() => setViewFormat('invoice')}
                className={`px-3 py-1 text-xs rounded-lg font-bold transition-colors ${
                  viewFormat === 'invoice'
                    ? isDark
                      ? 'bg-white text-neutral-950 shadow-xs'
                      : 'bg-neutral-900 text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                Invoice Digital
              </button>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="grid grid-cols-3 gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 font-bold rounded-xl text-xs active:scale-95 transition-all shadow-sm ${
                isDark
                  ? 'bg-white text-neutral-950 hover:bg-neutral-100'
                  : 'bg-neutral-900 text-white hover:bg-neutral-800'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Nota</span>
            </button>
            <button
              onClick={handleWhatsApp}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs active:scale-95 transition-all shadow-sm"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Kirim WA</span>
            </button>
            <button
              onClick={handleCopyText}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 font-bold rounded-xl text-xs border active:scale-95 transition-all ${
                isDark
                  ? 'bg-neutral-800 text-neutral-200 border-neutral-700 hover:bg-neutral-750'
                  : 'bg-white text-neutral-800 border-neutral-200 hover:bg-neutral-100'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400">Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Teks</span>
                </>
              )}
            </button>
          </div>

          {/* THE RECEIPT ELEMENT (Targeted by @media print) */}
          <div
            id="printable-receipt" className={`mx-auto bg-white text-neutral-900 rounded-2xl shadow-xl border border-neutral-200/90 overflow-hidden font-mono text-xs transition-all print:w-full print:max-w-none print:mx-0 print:rounded-none print:border-0 print:shadow-none ${
              viewFormat === 'thermal'
                  ? 'max-w-[340px] p-5 print:text-[9pt]'
                  : 'w-full p-6 print:text-[10pt]'
            }`}
          >
            {/* Store Header */}
            <div className="text-center pb-3 border-b border-dashed border-neutral-300">
              <h3 className="font-bold text-sm tracking-wider text-black">
                {settings.storeName.toUpperCase()}
              </h3>
              {settings.tagline && (
                <p className="text-[10px] text-neutral-600 mt-0.5">{settings.tagline}</p>
              )}
              {settings.address && (
                <p className="text-[10px] text-neutral-600 mt-0.5 leading-tight">{settings.address}</p>
              )}
              {settings.phone && (
                <p className="text-[10px] text-neutral-600 mt-0.5">Telp: {settings.phone}</p>
              )}
            </div>

            {/* Meta Order Info */}
            <div className="py-2.5 border-b border-dashed border-neutral-300 space-y-1 text-[11px] text-neutral-700">
              <div className="flex justify-between">
                <span>No. Nota:</span>
                <span className="font-bold text-black">{currentOrder.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Tanggal:</span>
                <span>{formatDate(currentOrder.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span>Pelanggan:</span>
                <span className="font-semibold text-black truncate max-w-[170px]">
                  {currentOrder.customerName}
                </span>
              </div>
              {currentOrder.customerPhone && (
                <div className="flex justify-between">
                  <span>No. WA:</span>
                  <span>{currentOrder.customerPhone}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Metode:</span>
                <span className="uppercase font-semibold text-black">
                  {currentOrder.paymentMethod} ({currentOrder.paymentStatus})
                </span>
              </div>
              {currentOrder.notes && (
                <div className="flex justify-between text-neutral-500">
                  <span>Catatan:</span>
                  <span className="italic">{currentOrder.notes}</span>
                </div>
              )}
            </div>

            {/* Order Items Table */}
            <div className="py-3 border-b border-dashed border-neutral-300 space-y-2">
              {currentOrder.items.map((item, idx) => {
                const hasDimensions =
                  item.length !== undefined &&
                  item.width !== undefined &&
                  item.length > 0 &&
                  item.width > 0;
                const area = hasDimensions ? (item.area || item.length! * item.width!) : 1;

                return (
                  <div key={idx} className="space-y-0.5">
                    <div className="font-semibold text-black flex items-center justify-between">
                      <span>{item.productName}</span>
                      {hasDimensions && (
                        <span className="text-[10px] text-neutral-500 font-normal">
                          [{item.length}×{item.width}={area.toLocaleString('id-ID', { maximumFractionDigits: 2 })}m²]
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between text-[11px] text-neutral-600">
                      <span>
                        {hasDimensions ? (
                          <>
                            {item.quantity} x {formatRupiah(item.price)} × {area.toLocaleString('id-ID', { maximumFractionDigits: 2 })}m²
                          </>
                        ) : (
                          <>
                            {item.quantity} x {formatRupiah(item.price)}
                          </>
                        )}
                      </span>
                      <span className="font-medium text-black tabular-nums">
                        {formatRupiah(item.subtotal)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals & Calculations */}
            <div className="py-2.5 border-b border-dashed border-neutral-300 space-y-1 text-[11px]">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal:</span>
                <span className="tabular-nums">{formatRupiah(currentOrder.subtotal)}</span>
              </div>
              {currentOrder.discount > 0 && (
                <div className="flex justify-between text-neutral-700">
                  <span>Diskon:</span>
                  <span className="tabular-nums">-{formatRupiah(currentOrder.discount)}</span>
                </div>
              )}
              {currentOrder.tax > 0 && (
                <div className="flex justify-between text-neutral-600">
                  <span>Pajak (PPN):</span>
                  <span className="tabular-nums">+{formatRupiah(currentOrder.tax)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold text-black pt-1 border-t border-dashed border-neutral-300">
                <span>TOTAL:</span>
                <span className="tabular-nums">{formatRupiah(currentOrder.total)}</span>
              </div>
              {currentOrder.paymentMethod === 'tunai' && currentOrder.cashGiven && (
                <>
                  <div className="flex justify-between text-neutral-600 pt-1">
                    <span>Tunai:</span>
                    <span className="tabular-nums">{formatRupiah(currentOrder.cashGiven)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>Kembali:</span>
                    <span className="tabular-nums font-semibold text-black">
                      {formatRupiah(currentOrder.cashChange || 0)}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Footer & Barcode Simulation */}
            <div className="pt-3 text-center space-y-2">
              <p className="text-[10px] text-neutral-600 whitespace-pre-line leading-tight">
                {settings.receiptFooter || 'Terima kasih atas kunjungan Anda!'}
              </p>

              {/* QR Code - hanya berisi nomor nota */}
              <div className="pt-3 pb-1 flex flex-col items-center justify-center">
                <QRCodeComponent value={qrReceiptText} size={125} />

                <span className="text-[10px] tracking-widest text-black mt-1.5 font-mono font-bold">
                  {currentOrder.invoiceNumber}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`p-8 text-center border rounded-2xl ${
            isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
          }`}
        >
          <Receipt className="w-10 h-10 text-neutral-400 mx-auto mb-2" />
          <p className="text-xs text-neutral-500">Belum ada nota transaksi</p>
        </div>
      )}

      {/* History of Past Transactions */}
      <div
  className={`print:hidden border rounded-2xl p-3.5 space-y-3 transition-colors ${
          isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'
        }`}
      >
        <div className="flex items-center justify-between">
          <h3 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
            Riwayat Nota Penjualan
          </h3>
          <span className="text-[11px] text-neutral-400 font-mono">
            {orders.length} transaksi
          </span>
        </div>

        {/* Search & Scan */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Cari / scan QR no. nota..."
            className={`w-full text-xs rounded-xl pl-8 pr-10 py-2 border outline-none ${
              isDark
                ? 'bg-neutral-800 text-white placeholder-neutral-500 border-neutral-700/80 focus:border-neutral-500'
                : 'bg-neutral-50 text-neutral-900 placeholder-neutral-400 border-neutral-200 focus:border-neutral-400'
            }`}
          />
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            onPointerEnter={() => preloadLazyChunk('scanner')}
            onTouchStart={() => preloadLazyChunk('scanner')}
            title="Pindai QR Code dengan Kamera"
            aria-label="Pindai QR Code"
            className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg active:scale-95 transition-colors ${
              isDark
                ? 'text-neutral-400 hover:text-white hover:bg-neutral-700'
                : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/80'
            }`}
          >
            <ScanLine className="w-4 h-4" />
          </button>
        </div>

        {/* List of orders */}
        <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
          {filteredOrders.length === 0 ? (
            <p className="text-xs text-neutral-400 text-center py-4">
              Tidak ada nota sesuai pencarian
            </p>
          ) : (
            filteredOrders.map(ord => {
              const isSelected = currentOrder?.id === ord.id;
              return (
                <button
                  key={ord.id}
                  onClick={() => onSelectOrder(ord)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between ${
                    isSelected
                      ? isDark
                        ? 'bg-neutral-800 border-neutral-600'
                        : 'bg-neutral-100 border-neutral-400'
                      : isDark
                      ? 'bg-neutral-850/60 border-neutral-800/80 hover:bg-neutral-800'
                      : 'bg-neutral-50 border-neutral-200/80 hover:bg-neutral-100'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div
                      className={`flex items-center gap-1.5 text-xs font-bold truncate ${
                        isDark ? 'text-white' : 'text-neutral-900'
                      }`}
                    >
                      <span>{ord.invoiceNumber}</span>
                      <span className="text-[10px] text-neutral-500 font-normal">
                        ({ord.items.length} item)
                      </span>
                    </div>
                    <div className="text-[10px] text-neutral-500 mt-0.5 truncate">
                      {ord.customerName} · {formatDate(ord.createdAt)}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatRupiah(ord.total)}
                    </div>
                    <div className="text-[9px] uppercase font-mono text-neutral-500">
                      {ord.paymentMethod}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Kamera Barcode Scanner Modal */}
      {isScannerOpen && (
        <React.Suspense fallback={null}>
          <BarcodeScanner
            isOpen={isScannerOpen}
            onClose={() => setIsScannerOpen(false)}
            onScan={handleBarcodeScanned}
            theme={theme}
          />
        </React.Suspense>
      )}

      
    </div>
  );
};
