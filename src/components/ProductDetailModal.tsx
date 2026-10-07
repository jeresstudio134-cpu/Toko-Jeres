import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Tag } from 'lucide-react';
import { Product } from '../types';
import { formatRupiah } from '../utils/format';
import { getProductImages, optimizeImage } from '../utils/cloudinary';

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
  onAdd?: (product: Product) => void;
  theme?: 'light' | 'dark';
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onAdd,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';
  const images = getProductImages(product);
  const outOfStock = product.stock <= 0;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [imageErrorMap, setImageErrorMap] = useState<Record<number, boolean>>({});

  const hasValidImage = images.length > 0 && !imageErrorMap[selectedIndex];

  // Tutup dengan tombol Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && images.length > 1) {
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
      }
      if (e.key === 'ArrowRight' && images.length > 1) {
        setSelectedIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, images.length]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 md:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className={`relative w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-2xl border shadow-2xl flex flex-col md:flex-row ${
          isDark
            ? 'bg-neutral-900 border-neutral-800 text-white'
            : 'bg-white border-neutral-200 text-neutral-900'
        }`}
      >
        {/* Kolom Kiri: Tampilan Foto Utama Berbasis Rasio 4/3 */}
        <div className="relative w-full md:w-[480px] md:flex-1 flex-shrink-0 flex items-center justify-center bg-neutral-100 dark:bg-neutral-950">
          <div
            className={`relative w-full aspect-[4/3] max-h-[45vh] md:max-h-none overflow-hidden bg-neutral-100 dark:bg-neutral-800 select-none`}
          >
            {hasValidImage ? (
              <img
                src={optimizeImage(images[selectedIndex], 800, 600)}
                alt={`${product.name} - Foto ${selectedIndex + 1}`}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover object-center"
                onError={() => setImageErrorMap(prev => ({ ...prev, [selectedIndex]: true }))}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-500 p-6 text-center select-none">
                <Tag className="w-12 h-12 stroke-[1.5] mb-2 opacity-35" />
                <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">
                  Belum Ada Foto
                </span>
              </div>
            )}

            {/* Tombol Navigasi Kiri (<) */}
            {images.length > 1 && hasValidImage && (
              <button
                type="button"
                onClick={() =>
                  setSelectedIndex(prev => (prev > 0 ? prev - 1 : images.length - 1))
                }
                className="z-10 absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition-all shadow-md active:scale-95"
                aria-label="Foto sebelumnya"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {/* Tombol Navigasi Kanan (>) */}
            {images.length > 1 && hasValidImage && (
              <button
                type="button"
                onClick={() =>
                  setSelectedIndex(prev => (prev < images.length - 1 ? prev + 1 : 0))
                }
                className="z-10 absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition-all shadow-md active:scale-95"
                aria-label="Foto berikutnya"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            {/* Nomor Index Foto */}
            {images.length > 1 && hasValidImage && (
              <span className="z-10 absolute bottom-2.5 left-2.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/60 text-white backdrop-blur-xs">
                {selectedIndex + 1} / {images.length}
              </span>
            )}
          </div>
        </div>

        {/* Kolom Kanan: Judul, Thumbnail Pilihan Foto, Harga, Detail, Tombol Aksi */}
        <div className="w-full md:w-80 lg:w-96 p-4 sm:p-5 flex flex-col justify-between overflow-y-auto max-h-[47vh] md:max-h-[85vh] border-t md:border-t-0 md:border-l border-neutral-200 dark:border-neutral-800">
          <div className="space-y-4">
            {/* Header info */}
            <div>
              <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 font-mono">
                <span>{product.category}</span>
                <span>·</span>
                <span>{product.unit || 'pcs'}</span>
                {product.sku && (
                  <>
                    <span>·</span>
                    <span>SKU: {product.sku}</span>
                  </>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-bold leading-snug mt-1">
                {product.name}
              </h2>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                  {formatRupiah(product.price)}
                </span>
                <span
                  className={`text-[11px] font-mono font-bold ${
                    outOfStock ? 'text-red-500' : 'text-neutral-500'
                  }`}
                >
                  {outOfStock ? 'Stok habis' : `Stok: ${product.stock}`}
                </span>
              </div>
            </div>

            {/* Thumbnail Pilihan Foto */}
            {images.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold text-neutral-500 mb-1.5">
                  Foto Produk ({images.length})
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-4 gap-2">
                  {images.map((src, i) => (
                    <button
                      key={`${src}-${i}`}
                      type="button"
                      onClick={() => setSelectedIndex(i)}
                      onMouseEnter={() => setSelectedIndex(i)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all cursor-pointer bg-neutral-100 dark:bg-neutral-800 ${
                        selectedIndex === i
                          ? 'border-emerald-600 dark:border-emerald-400 ring-2 ring-emerald-500/30 scale-102 shadow-xs'
                          : 'border-neutral-200 dark:border-neutral-700 opacity-70 hover:opacity-100 hover:border-neutral-400'
                      }`}
                    >
                      <img
                        src={optimizeImage(src, 200, 200)}
                        alt={`Thumbnail ${i + 1}`}
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-cover object-center"
                      />
                      {i === 0 && (
                        <span className="z-10 absolute bottom-0.5 left-0.5 right-0.5 text-[7px] font-bold text-center bg-black/60 text-white rounded-[2px] leading-tight py-0.5">
                          Sampul
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Deskripsi */}
            {product.description && (
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <div className="text-[11px] font-semibold text-neutral-500 mb-1">
                  Deskripsi Menu
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}
          </div>

          {/* Tombol Aksi di Bawah */}
          <div className="pt-3 mt-3 border-t border-neutral-200 dark:border-neutral-800 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs border transition-colors ${
                isDark
                  ? 'border-neutral-700 text-neutral-300 hover:bg-neutral-800'
                  : 'border-neutral-300 text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              Tutup
            </button>
            {onAdd && (
              <button
                type="button"
                disabled={outOfStock}
                onClick={() => {
                  onAdd(product);
                  onClose();
                }}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs inline-flex items-center justify-center gap-1.5 disabled:opacity-40 transition-transform active:scale-98 shadow-sm ${
                  isDark
                    ? 'bg-white text-neutral-950 hover:bg-neutral-100'
                    : 'bg-neutral-900 text-white hover:bg-neutral-800'
                }`}
              >
                <span>Pilih</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
