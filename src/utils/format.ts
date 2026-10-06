import { Order, StoreSettings } from '../types';

export const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (isoString: string): string => {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return isoString;
  }
};

export const formatDateOnly = (isoString: string): string => {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return isoString;
  }
};

/**
 * Membuat format teks struk yang rapi untuk dikirim via WhatsApp atau disalin
 */
export const generateWhatsAppReceiptText = (order: Order, settings: StoreSettings): string => {
  const line = '--------------------------------';
  const itemsText = order.items
    .map(item => {
      let desc = item.productName;
      if (item.length && item.width) {
        const areaStr =
          item.area !== undefined
            ? item.area.toFixed(2)
            : item.dimensionUnit === 'cm'
            ? ((item.length * item.width) / 10000).toFixed(2)
            : (item.length * item.width).toFixed(2);
        desc += ` (${item.length}×${item.width} ${item.dimensionUnit || 'm'} = ${areaStr} m²)`;
      }
      if (item.note) {
        desc += `\n  Catatan: ${item.note}`;
      }
      return `${desc}\n  ${item.quantity}x @ ${formatRupiah(item.price)} = ${formatRupiah(item.subtotal)}`;
    })
    .join('\n');

  let text = `*${settings.storeName.toUpperCase()}*\n`;
  if (settings.tagline) text += `${settings.tagline}\n`;
  if (settings.address) text += `${settings.address}\n`;
  if (settings.phone) text += `Telp/WA: ${settings.phone}\n`;
  text += `${line}\n`;
  text += `No. Nota : *${order.invoiceNumber}*\n`;
  text += `Tanggal  : ${formatDate(order.createdAt)}\n`;
  text += `Pelanggan: *${order.customerName}*${order.customerPhone ? ` (${order.customerPhone})` : ''}\n`;
  text += `Metode   : ${order.paymentMethod.toUpperCase()} (${order.paymentStatus.toUpperCase()})\n`;
  text += `${line}\n`;
  text += `${itemsText}\n`;
  text += `${line}\n`;
  text += `Subtotal : ${formatRupiah(order.subtotal)}\n`;
  if (order.discount > 0) {
    text += `Diskon   : -${formatRupiah(order.discount)}\n`;
  }
  if (order.tax > 0) {
    text += `Pajak    : +${formatRupiah(order.tax)}\n`;
  }
  text += `*TOTAL    : ${formatRupiah(order.total)}*\n`;
  if (order.paymentMethod === 'tunai' && order.cashGiven) {
    text += `Bayar    : ${formatRupiah(order.cashGiven)}\n`;
    text += `Kembali  : ${formatRupiah(order.cashChange || 0)}\n`;
  }
  text += `${line}\n`;
  text += `${settings.receiptFooter || 'Terima kasih atas pesanan Anda!'}\n`;

  return text;
};

export const getWhatsAppShareUrl = (phone: string, text: string): string => {
  let cleanPhone = phone.replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '62' + cleanPhone.slice(1);
  } else if (!cleanPhone.startsWith('62') && cleanPhone.length > 0) {
    cleanPhone = '62' + cleanPhone;
  }
  const encodedText = encodeURIComponent(text);
  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodedText}`;
  }
  return `https://wa.me/?text=${encodedText}`;
};

/**
 * Membuat ringkasan teks nota untuk dimasukkan ke dalam QR Code
 * Berisi nomor nota, tanggal, nama pelanggan, no wa, metode pembayaran, catatan, total & status (tanpa rincian item)
 */
export const generateQRCodeReceiptText = (order: Order, settings: StoreSettings): string => {
  const line = '--------------------------------';

  return [
    `=== NOTA RESMI: ${settings.storeName.toUpperCase()} ===`,
    settings.tagline ? settings.tagline : null,
    settings.address ? `Alamat   : ${settings.address}` : null,
    settings.phone ? `Telp/WA  : ${settings.phone}` : null,
    line,
    `No. Nota : ${order.invoiceNumber}`,
    `Tanggal  : ${formatDate(order.createdAt)}`,
    `Pelanggan: ${order.customerName}`,
    order.customerPhone ? `No. WA   : ${order.customerPhone}` : null,
    `Metode   : ${order.paymentMethod.toUpperCase()} (${order.paymentStatus.toUpperCase()})`,
    order.notes ? `Catatan  : ${order.notes}` : null,
    line,
    `Subtotal : ${formatRupiah(order.subtotal)}`,
    order.discount > 0 ? `Diskon   : -${formatRupiah(order.discount)}` : null,
    order.tax > 0 ? `Pajak    : +${formatRupiah(order.tax)}` : null,
    `TOTAL    : ${formatRupiah(order.total)}`,
    order.paymentMethod === 'tunai' && order.cashGiven
      ? `Tunai    : ${formatRupiah(order.cashGiven)}\nKembali  : ${formatRupiah(order.cashChange || 0)}`
      : null,
    line,
    settings.receiptFooter || 'Terima kasih atas pesanan Anda!',
  ]
    .filter(Boolean)
    .join('\n');
};

/**
 * Mengekstrak nomor nota dari teks hasil scan (bisa nomor nota polos atau teks nota lengkap)
 */
export const extractInvoiceNumberFromScannedText = (scannedText: string): string => {
  const clean = scannedText.trim();
  // 1. Deteksi pola standar nomor nota INV-YYYYMMDD-XXX atau sejenisnya
  const invMatch = clean.match(/INV-[A-Za-z0-9-]+/i);
  if (invMatch) {
    return invMatch[0].trim();
  }
  // 2. Deteksi baris "No. Nota: ..."
  const lineMatch = clean.match(/no\.?\s*nota\s*:\s*([^\n\r]+)/i);
  if (lineMatch && lineMatch[1]) {
    return lineMatch[1].trim();
  }
  return clean;
};

