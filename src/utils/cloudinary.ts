import type { Product } from '../types';

// Semua foto produk; mendukung data lama yang hanya punya imageUrl
export const getProductImages = (p: Product): string[] =>
  (p.images && p.images.length ? p.images : p.imageUrl ? [p.imageUrl] : []).filter(Boolean);

// Perkecil foto HP sebelum diupload (sisi terpanjang maks 1600px)
export async function resizeImage(file: File, maxSize = 1600, quality = 0.85): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    return await new Promise(resolve =>
      canvas.toBlob(b => resolve(b || file), 'image/jpeg', quality)
    );
  } catch {
    return file;
  }
}

// Upload gambar ke Cloudinary:
// 1. Prioritas utama: Browser langsung mengunggah ke Cloudinary (unsigned, FormData) jika cloudName & uploadPreset tersedia
// 2. Fallback: Mengunggah melalui endpoint server /api/upload jika konfigurasi unsigned belum lengkap
export async function uploadImage(
  file: File,
  cloudName?: string,
  uploadPreset?: string
): Promise<string> {
  const blob = await resizeImage(file);

  const cName = (
    cloudName ||
    (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME ||
    (import.meta as any).env?.CLOUDINARY_CLOUD_NAME ||
    ''
  ).trim();

  const cPreset = (
    uploadPreset ||
    (import.meta as any).env?.VITE_CLOUDINARY_UPLOAD_PRESET ||
    (import.meta as any).env?.CLOUDINARY_UPLOAD_PRESET ||
    ''
  ).trim();

  // 1. Direct browser upload ke Cloudinary jika konfigurasi unsigned terisi
  if (cName && cPreset) {
    try {
      const form = new FormData();
      form.append('file', blob, file.name.replace(/\.[^.]+$/, '') + '.jpg');
      form.append('upload_preset', cPreset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cName}/image/upload`, {
        method: 'POST',
        body: form,
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.secure_url) {
        return data.secure_url as string;
      }
      console.warn('Direct upload ke Cloudinary gagal, mencoba fallback server /api/upload:', data?.error?.message);
    } catch (directErr) {
      console.warn('Direct upload ke Cloudinary mengalami kendala jaringan, mencoba fallback server:', directErr);
    }
  }

  // 2. Fallback: Upload melalui server endpoint /api/upload
  try {
    const base64DataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: base64DataUrl }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.secure_url) {
        return data.secure_url;
      }
    } else {
      const errData = await res.json().catch(() => ({}));
      if (errData?.error) {
        throw new Error(errData.error);
      }
    }
  } catch (serverErr: any) {
    if (serverErr.message && !serverErr.message.includes('belum dikonfigurasi')) {
      throw serverErr;
    }
  }

  throw new Error(
    'Pengunggahan gagal. Pastikan Cloud Name dan Upload Preset di Setelan atau Environment Variables sudah benar.'
  );
}

// Optimasi Cloudinary: sisipkan transformasi crop c_fill, g_auto, f_auto, q_auto
export function optimizeImage(
  url?: string | null,
  width = 800,
  height = 600
): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed.includes('res.cloudinary.com') || !trimmed.includes('/upload/')) {
    return trimmed;
  }

  // Cari kemunculan pertama /upload/
  const uploadIndex = trimmed.indexOf('/upload/');
  if (uploadIndex === -1) return trimmed;

  const afterUpload = trimmed.slice(uploadIndex + 8);
  const firstSlashIndex = afterUpload.indexOf('/');
  const firstSegment = firstSlashIndex !== -1 ? afterUpload.slice(0, firstSlashIndex) : afterUpload;

  // Jika segmen setelah /upload/ sudah berisi parameter transformasi (misal c_, w_, h_, f_, q_, dll)
  // Catatan: format version adalah v123... tanpa koma atau underscore sebelum slash
  if (
    firstSegment.includes(',') ||
    /^[a-z]{1,2}_/i.test(firstSegment) ||
    trimmed.includes('/upload/c_') ||
    trimmed.includes('/upload/f_auto') ||
    trimmed.includes('/upload/w_') ||
    trimmed.includes('/upload/q_auto')
  ) {
    return trimmed;
  }

  // Sisipkan transformasi tepat setelah /upload/ pertama tanpa menggandakan /upload/
  return (
    trimmed.slice(0, uploadIndex + 8) +
    `c_fill,g_auto,w_${width},h_${height},f_auto,q_auto/` +
    afterUpload
  );
}

// Alias untuk kompatibilitas
export function optimizedUrl(url: string, width = 800, height?: number): string {
  return optimizeImage(url, width, height || Math.round((width * 3) / 4));
}