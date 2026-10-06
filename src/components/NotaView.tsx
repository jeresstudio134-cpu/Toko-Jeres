import React, { useState } from 'react';
import { Order, StoreSettings } from '../types';
import { formatRupiah, formatDate, generateWhatsAppReceiptText, getWhatsAppShareUrl } from '../utils/format';
import {
  Printer,
  Share2,
  Copy,
  Check,
  Search,
  Receipt,
  FileText,
} from 'lucide-react';

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
  // Default to full 1 halaman (A4 / standar) as requested
  const [viewFormat, setViewFormat] = useState<'full' | 'thermal'>('full');

  const currentOrder = activeOrder || (orders.length > 0 ? orders[0] : null);

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
    <div className={`pb-28 px-4 pt-3 mx-auto space-y-4 transition-all ${viewFormat === 'full' ? 'max-w-3xl' : 'max-w-md'}`}>
      {/* Top Header */}
      <div className="no-print print:hidden flex items-center justify-between">
        <div>
          <h2 className={`text-sm font-bold tracking-tight ${isDark ? 'text-white' : 'text-neutral-900'}`}>
            Nota & Struk Penjualan
          </h2>
          <p className="text-[11px] text-neutral-500">
            {viewFormat === 'full'
              ? 'Format cetak 1 halaman penuh (A4 / printer standar EPSON, Canon, HP)'
              : 'Format cetak mini struk kasir thermal (58mm / 80mm)'}
          </p>
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

      {currentOrder ? (
        <div className="space-y-3.5">
          {/* Format Switcher */}
          <div
            className={`no-print print:hidden flex flex-wrap items-center justify-between gap-2 border p-1.5 rounded-xl transition-colors ${
              isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'
            }`}
          >
            <div className="flex items-center gap-1.5 pl-2">
              <span className="text-[11px] text-neutral-500 font-medium">Format Cetak:</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {viewFormat === 'full' ? '1 Halaman Penuh' : 'Struk Thermal'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewFormat('full')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-bold transition-all ${
                  viewFormat === 'full'
                    ? isDark
                      ? 'bg-white text-neutral-950 shadow-xs'
                      : 'bg-neutral-900 text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>1 Halaman Penuh (A4)</span>
              </button>
              <button
                type="button"
                onClick={() => setViewFormat('thermal')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-bold transition-all ${
                  viewFormat === 'thermal'
                    ? isDark
                      ? 'bg-white text-neutral-950 shadow-xs'
                      : 'bg-neutral-900 text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Struk Thermal (80mm)</span>
              </button>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="no-print print:hidden grid grid-cols-3 gap-2">
            <button
              onClick={handlePrint}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 font-bold rounded-xl text-xs active:scale-95 transition-all shadow-sm ${
                isDark
                  ? 'bg-white text-neutral-950 hover:bg-neutral-100'
                  : 'bg-neutral-900 text-white hover:bg-neutral-800'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak {viewFormat === 'full' ? '1 Halaman Penuh' : 'Struk'}</span>
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

          {/* ============================================================== */}
          {/* THE RECEIPT ELEMENT (Targeted by @media print #printable-receipt) */}
          {/* ============================================================== */}
          {viewFormat === 'full' ? (
            /* ----------------------------------------------------------- */
            /* 1 HALAMAN PENUH (Full Page A4 / Standard Paper Print Layout) */
            /* ----------------------------------------------------------- */
            <div
              id="printable-receipt"
              className="print-full-page mx-auto bg-white text-neutral-900 rounded-2xl shadow-xl border border-neutral-300 p-6 sm:p-8 font-sans text-xs transition-all overflow-hidden"
            >
              {/* Header / Kop Nota Toko */}
              <div className="flex items-start justify-between pb-4 border-b-2 border-neutral-900 gap-4">
                <div className="space-y-1 max-w-[62%]">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-950 uppercase leading-none">
                    {settings.storeName || 'JERES STUDIO'}
                  </h1>
                  {settings.tagline && (
                    <p className="text-[11px] sm:text-xs font-semibold text-neutral-700 tracking-wide uppercase pt-0.5">
                      {settings.tagline}
                    </p>
                  )}
                  {settings.address && (
                    <p className="text-[11px] text-neutral-600 leading-snug pt-0.5">
                      {settings.address}
                    </p>
                  )}
                  {settings.phone && (
                    <p className="text-[11px] font-medium text-neutral-800">
                      Telp / WhatsApp: {settings.phone}
                    </p>
                  )}
                </div>

                <div className="text-right space-y-1">
                  <div className="text-lg sm:text-xl font-black tracking-wider text-neutral-950 uppercase leading-none">
                    NOTA PENJUALAN
                  </div>
                  <div className="inline-block px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border-2 border-neutral-900 bg-neutral-900 text-white">
                    {currentOrder.paymentStatus === 'lunas' ? 'LUNAS' : 'BELUM LUNAS'}
                  </div>
                  <div className="text-xs font-mono font-bold text-neutral-900 pt-0.5">
                    No. Nota: {currentOrder.invoiceNumber}
                  </div>
                  <div className="text-[11px] text-neutral-600">
                    Tanggal: {formatDate(currentOrder.createdAt)}
                  </div>
                </div>
              </div>

              {/* Customer & Transaction Info */}
              <div className="grid grid-cols-2 gap-4 py-3 my-2 border-b border-neutral-200 text-xs">
                <div className="space-y-0.5 bg-neutral-50/70 p-3 rounded-lg border border-neutral-200">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                    Kepada Yth:
                  </span>
                  <p className="font-bold text-neutral-900 text-sm">
                    {currentOrder.customerName || 'Pelanggan Umum'}
                  </p>
                  {currentOrder.customerPhone && (
                    <p className="text-neutral-600 text-[11px]">
                      No. HP / WA: {currentOrder.customerPhone}
                    </p>
                  )}
                  {currentOrder.notes && (
                    <p className="text-neutral-500 italic text-[11px] pt-0.5">
                      Catatan: {currentOrder.notes}
                    </p>
                  )}
                </div>

                <div className="space-y-0.5 text-right bg-neutral-50/70 p-3 rounded-lg border border-neutral-200">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                    Informasi Transaksi:
                  </span>
                  <p className="text-neutral-700 text-[11px]">
                    Metode Bayar: <span className="font-bold uppercase text-neutral-900">{currentOrder.paymentMethod}</span>
                  </p>
                  <p className="text-neutral-600 text-[11px]">
                    Status: <span className="font-semibold uppercase">{currentOrder.paymentStatus}</span>
                  </p>
                  <p className="text-neutral-500 text-[10px] font-mono">
                    ID Transaksi: {currentOrder.id}
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="py-2 flex-1">
                <table className="w-full text-left border-collapse border border-neutral-300">
                  <thead>
                    <tr className="bg-neutral-100 border-b-2 border-neutral-900 text-neutral-900 text-[11px] font-bold">
                      <th className="py-2.5 px-3 text-center w-12 border-r border-neutral-300">NO</th>
                      <th className="py-2.5 px-3 border-r border-neutral-300">NAMA ITEM / DESKRIPSI</th>
                      <th className="py-2.5 px-3 text-right w-32 border-r border-neutral-300">HARGA</th>
                      <th className="py-2.5 px-3 text-center w-20 border-r border-neutral-300">QTY</th>
                      <th className="py-2.5 px-3 text-right w-36">SUBTOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 text-xs">
                    {currentOrder.items.map((item, idx) => {
                      const hasDimensions =
                        item.length !== undefined &&
                        item.width !== undefined &&
                        item.length > 0 &&
                        item.width > 0;
                      const area = hasDimensions ? (item.area || item.length! * item.width!) : 1;

                      return (
                        <tr key={idx} className="hover:bg-neutral-50/50">
                          <td className="py-2.5 px-3 text-center font-mono text-[11px] text-neutral-500 border-r border-neutral-200">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 border-r border-neutral-200">
                            <div className="font-bold text-neutral-900">{item.productName}</div>
                            {hasDimensions && (
                              <div className="text-[10px] text-neutral-600 font-mono mt-0.5">
                                Ukuran: {item.length}m × {item.width}m ({area.toLocaleString('id-ID', { maximumFractionDigits: 2 })}m²)
                              </div>
                            )}
                            {item.note && (
                              <div className="text-[10px] italic text-neutral-500 mt-0.5">
                                {item.note}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-neutral-700 border-r border-neutral-200 tabular-nums">
                            {formatRupiah(item.price)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-neutral-800 border-r border-neutral-200">
                            {item.quantity} {hasDimensions ? 'm²' : 'pcs'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-neutral-950 tabular-nums">
                            {formatRupiah(item.subtotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totals & Notes Section */}
              <div className="grid grid-cols-2 gap-6 pt-3 pb-2 border-t border-neutral-200 mt-auto">
                {/* Left Column: Notes & Barcode */}
                <div className="space-y-3 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">
                      Ketentuan & Catatan:
                    </span>
                    <p className="text-[11px] text-neutral-600 leading-relaxed whitespace-pre-line">
                      {settings.receiptFooter || 'Terima kasih atas kunjungan Anda!\nBarang yang sudah dibeli tidak dapat ditukar atau dikembalikan.'}
                    </p>
                  </div>

                  {/* Simulated Barcode */}
                  <div className="pt-2">
                    <div className="h-8 w-56 flex items-center justify-between gap-[2px] overflow-hidden opacity-90">
                      {Array.from({ length: 48 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-full bg-black"
                          style={{ width: i % 4 === 0 ? '3px' : i % 3 === 0 ? '1px' : '2px' }}
                        />
                      ))}
                    </div>
                    <span className="text-[9px] font-mono tracking-widest text-neutral-600 mt-0.5 block">
                      {currentOrder.invoiceNumber}
                    </span>
                  </div>
                </div>

                {/* Right Column: Totals Summary Box */}
                <div className="space-y-1.5 text-xs bg-neutral-50 p-3.5 rounded-xl border border-neutral-200">
                  <div className="flex justify-between text-neutral-600">
                    <span>Subtotal Pesanan:</span>
                    <span className="font-mono tabular-nums">{formatRupiah(currentOrder.subtotal)}</span>
                  </div>
                  {currentOrder.discount > 0 && (
                    <div className="flex justify-between text-neutral-700">
                      <span>Potongan Diskon:</span>
                      <span className="font-mono tabular-nums text-red-600">-{formatRupiah(currentOrder.discount)}</span>
                    </div>
                  )}
                  {currentOrder.tax > 0 && (
                    <div className="flex justify-between text-neutral-600">
                      <span>Pajak (PPN):</span>
                      <span className="font-mono tabular-nums">+{formatRupiah(currentOrder.tax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-base sm:text-lg font-black text-neutral-950 pt-2 border-t-2 border-neutral-900">
                    <span>TOTAL:</span>
                    <span className="font-mono tabular-nums">{formatRupiah(currentOrder.total)}</span>
                  </div>
                  {currentOrder.paymentMethod === 'tunai' && currentOrder.cashGiven && (
                    <div className="pt-1.5 border-t border-dashed border-neutral-300 space-y-1 text-[11px]">
                      <div className="flex justify-between text-neutral-600">
                        <span>Tunai Diterima:</span>
                        <span className="font-mono tabular-nums">{formatRupiah(currentOrder.cashGiven)}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-neutral-900">
                        <span>Uang Kembalian:</span>
                        <span className="font-mono tabular-nums">{formatRupiah(currentOrder.cashChange || 0)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Signature Block */}
              <div className="grid grid-cols-2 gap-8 pt-6 pb-2 text-center text-xs">
                <div>
                  <p className="text-neutral-600 font-medium text-[11px]">Tanda Terima Pelanggan,</p>
                  <div className="h-14"></div>
                  <p className="font-bold text-neutral-900 border-t border-dotted border-neutral-400 pt-1 inline-block min-w-[160px]">
                    ( {currentOrder.customerName || 'Pelanggan'} )
                  </p>
                </div>
                <div>
                  <p className="text-neutral-600 font-medium text-[11px]">Hormat Kami, {settings.storeName}</p>
                  <div className="h-14"></div>
                  <p className="font-bold text-neutral-900 border-t border-dotted border-neutral-400 pt-1 inline-block min-w-[160px]">
                    ( Kasir / Petugas Toko )
                  </p>
                </div>
              </div>

              {/* Document Verification Watermark */}
              <div className="pt-2 text-center text-[9px] text-neutral-400 border-t border-neutral-100">
                Dokumen ini sah dan dicetak otomatis melalui Aplikasi Kasir {settings.storeName}
              </div>
            </div>
          ) : (
            /* ----------------------------------------------------------- */
            /* STRUK THERMAL (Compact Thermal Roll Paper 58mm / 80mm)      */
            /* ----------------------------------------------------------- */
            <div
              id="printable-receipt"
              className="print-thermal mx-auto bg-white text-neutral-900 rounded-2xl shadow-xl border border-neutral-200/90 overflow-hidden font-mono text-xs transition-all max-w-[340px] p-5"
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

                {/* Barcode visual placeholder */}
                <div className="pt-2 flex flex-col items-center justify-center opacity-85">
                  <div className="h-7 w-48 flex items-center justify-between gap-[2px] px-2 overflow-hidden">
                    {Array.from({ length: 42 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-full bg-black"
                        style={{ width: i % 3 === 0 ? '3px' : i % 5 === 0 ? '1px' : '2px' }}
                      />
                    ))}
                  </div>
                  <span className="text-[9px] tracking-widest text-neutral-600 mt-1 font-mono">
                    {currentOrder.invoiceNumber}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          className={`no-print print:hidden p-8 text-center border rounded-2xl ${
            isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
          }`}
        >
          <Receipt className="w-10 h-10 text-neutral-400 mx-auto mb-2" />
          <p className="text-xs text-neutral-500">Belum ada nota transaksi</p>
        </div>
      )}

      {/* History of Past Transactions */}
      <div
        className={`no-print print:hidden border rounded-2xl p-3.5 space-y-3 transition-colors ${
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

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari no. nota / nama pembeli..."
            className={`w-full text-xs rounded-xl pl-8 pr-3 py-2 border outline-none ${
              isDark
                ? 'bg-neutral-800 text-white placeholder-neutral-500 border-neutral-700/80'
                : 'bg-neutral-50 text-neutral-900 placeholder-neutral-400 border-neutral-200'
            }`}
          />
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
    </div>
  );
};
