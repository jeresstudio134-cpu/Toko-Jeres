import React, { useState, useMemo, lazy, Suspense } from 'react';
import { Product, CartItem } from '../types';
import { formatRupiah } from '../utils/format';
import { Search, Plus, Minus, ShoppingBag, ArrowRight, Tag } from 'lucide-react';
import { optimizeImage } from '../utils/cloudinary';
import { preloadLazyChunk } from '../utils/preload';

const ProductThumbnail: React.FC<{
  src: string;
  alt: string;
  isFirst: boolean;
  onError: () => void;
}> = ({ src, alt, isFirst, onError }) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      src={src}
      alt={alt}
      loading={isFirst ? 'eager' : 'lazy'}
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

const ProductDetailModal = lazy(() =>
  import('./ProductDetailModal').then(m => ({ default: m.ProductDetailModal }))
);

interface KatalogViewProps {
  products: Product[];
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  onGoToKasir: () => void;
  onAddNewProduct: () => void;
  theme?: 'light' | 'dark';
}

export const KatalogView: React.FC<KatalogViewProps> = ({
  products,
  cart,
  addToCart,
  removeFromCart,
  onGoToKasir,
  onAddNewProduct,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return ['Semua', ...Array.from(set)];
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedCategory === 'Semua' || p.category === selectedCategory;
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) ||
        (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
      return matchCat && matchSearch && p.isActive !== false;
    });
  }, [products, selectedCategory, search]);

  // Total cart calculation
  const totalCartCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  const totalCartPrice = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  }, [cart]);

  const getProductCartQty = (productId: string): number => {
    const item = cart.find(c => c.product.id === productId);
    return item ? item.quantity : 0;
  };

  return (
    <div className="pb-28">
      {/* Top Search & Filter Bar */}
      <div
        className={`px-4 pt-3 pb-2.5 sticky top-0 z-20 border-b transition-colors ${
          isDark
            ? 'bg-neutral-950 border-neutral-800'
            : 'bg-white border-neutral-200/90 shadow-[0_1px_4px_rgba(0,0,0,0.02)]'
        }`}
      >
        <div className="relative mb-2.5">
          <Search
            className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
              isDark ? 'text-neutral-500' : 'text-neutral-400'
            }`}
          />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari menu, SKU, atau makanan..."
            className={`w-full text-xs rounded-xl pl-9 pr-8 py-2.5 outline-none transition-all border ${
              isDark
                ? 'bg-neutral-800/90 text-white placeholder-neutral-500 border-neutral-700/60 focus:ring-1 focus:ring-neutral-400'
                : 'bg-neutral-100 text-neutral-900 placeholder-neutral-400 border-neutral-200 focus:bg-white focus:ring-1 focus:ring-neutral-900'
            }`}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-xs px-1 ${
                isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-400 hover:text-neutral-800'
              }`}
            >
              ✕
            </button>
          )}
        </div>

        {/* Categories Horizontal Carousel */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all font-medium text-[11px] touch-manipulation ${
                selectedCategory === cat
                  ? isDark
                    ? 'bg-neutral-100 text-neutral-950 font-bold shadow-xs'
                    : 'bg-neutral-900 text-white font-bold shadow-xs'
                  : isDark
                  ? 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                  : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product List / Cards */}
      <div className="p-4 space-y-2.5">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                isDark ? 'bg-neutral-800 text-neutral-400' : 'bg-neutral-100 text-neutral-500'
              }`}
            >
              <ShoppingBag className="w-6 h-6 stroke-[1.5]" />
            </div>
            <p className={`text-sm font-semibold ${isDark ? 'text-neutral-200' : 'text-neutral-900'}`}>
              Tidak ada produk ditemukan
            </p>
            <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
              {search ? 'Coba ganti kata kunci pencarian Anda' : 'Kategori ini belum memiliki produk aktif'}
            </p>
            <button
              onClick={onAddNewProduct}
              className={`mt-4 px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 active:scale-95 transition-transform ${
                isDark
                  ? 'bg-neutral-100 text-neutral-900 hover:bg-white'
                  : 'bg-neutral-900 text-white hover:bg-neutral-800 shadow-xs'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Menu Baru</span>
            </button>
          </div>
        ) : (
          filteredProducts.map((product, index) => {
            const inCartQty = getProductCartQty(product.id);
            const isOutOfStock = product.stock <= 0;

            return (
              <div
                key={product.id}
                onClick={() => setSelectedProductForDetail(product)}
                onPointerEnter={() => preloadLazyChunk('productDetail')}
                onTouchStart={() => preloadLazyChunk('productDetail')}
                className={`border rounded-2xl p-3 flex items-center gap-3 transition-all cursor-pointer group active:scale-[0.99] ${
                  isDark
                    ? inCartQty > 0
                      ? 'border-neutral-600 bg-neutral-900 hover:border-neutral-500'
                      : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700'
                    : inCartQty > 0
                    ? 'border-neutral-400 bg-white hover:border-neutral-500 shadow-xs'
                    : 'border-neutral-200/90 bg-white hover:border-neutral-300 shadow-xs'
                }`}
              >
                {/* Product Thumbnail / Fallback Graphic */}
                <div
                  className={`w-16 h-16 aspect-square rounded-xl flex-shrink-0 overflow-hidden relative border flex items-center justify-center ${
                    isDark
                      ? 'bg-neutral-800 border-neutral-700/50'
                      : 'bg-neutral-100 border-neutral-200/80'
                  }`}
                >
                  {product.imageUrl && !imageErrors[product.id] ? (
                    <ProductThumbnail
                      src={optimizeImage(product.imageUrl, 200, 200)}
                      alt={product.name}
                      isFirst={index === 0}
                      onError={() => {
                        setImageErrors(prev => ({ ...prev, [product.id]: true }));
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-1 text-center select-none">
                      <Tag
                        className={`w-5 h-5 stroke-[1.5] mb-0.5 ${
                          isDark ? 'text-neutral-500' : 'text-neutral-400'
                        }`}
                      />
                      <span
                        className={`text-[9px] font-mono tracking-tighter uppercase truncate max-w-[50px] ${
                          isDark ? 'text-neutral-400' : 'text-neutral-500'
                        }`}
                      >
                        {product.category?.slice(0, 4) || 'MENU'}
                      </span>
                    </div>
                  )}

                  {isOutOfStock && (
                    <div className="z-10 absolute inset-0 bg-neutral-950/80 backdrop-blur-[1px] flex items-center justify-center">
                      <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider">
                        Habis
                      </span>
                    </div>
                  )}
                </div>

                {/* Info Center */}
                <div className="flex-1 min-w-0">
                  <div
                    className={`flex items-center gap-1 text-[11px] ${
                      isDark ? 'text-neutral-400' : 'text-neutral-500'
                    }`}
                  >
                    <span>{product.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{product.unit || 'pcs'}</span>
                    {product.stock <= 5 && product.stock > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">
                          Sisa {product.stock}
                        </span>
                      </>
                    )}
                  </div>
                  <h3
                    className={`text-xs font-bold truncate mt-0.5 ${
                      isDark ? 'text-white' : 'text-neutral-900'
                    }`}
                  >
                    {product.name}
                  </h3>
                  {product.description && (
                    <p
                      className={`text-[11px] truncate mt-0.5 ${
                        isDark ? 'text-neutral-400' : 'text-neutral-500'
                      }`}
                    >
                      {product.description}
                    </p>
                  )}
                  <div
                    className={`text-xs font-bold font-mono tabular-nums mt-1 ${
                      isDark ? 'text-neutral-100' : 'text-neutral-900'
                    }`}
                  >
                    {formatRupiah(product.price)}
                  </div>
                </div>

                {/* Action Hitbox - Mobile Touch Ergonomics */}
                <div
                  className="flex-shrink-0 flex items-center"
                  onClick={e => e.stopPropagation()}
                >
                  {isOutOfStock ? (
                    <span className="text-[11px] text-neutral-400 font-medium px-2 py-1">
                      Habis
                    </span>
                  ) : inCartQty === 0 ? (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        addToCart(product);
                      }}
                      className={`min-h-[44px] min-w-[44px] px-3.5 py-2 active:scale-95 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                        isDark
                          ? 'bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700'
                          : 'bg-neutral-900 hover:bg-neutral-800 text-white shadow-xs'
                      }`}
                      aria-label={`Tambah ${product.name} ke keranjang`}
                    >
                      <Plus className="w-3.5 h-3.5 font-bold" />
                      <span>Pilih</span>
                    </button>
                  ) : (
                    <div
                      className={`flex items-center rounded-xl p-1 border ${
                        isDark
                          ? 'bg-neutral-800 border-neutral-700'
                          : 'bg-neutral-100 border-neutral-200'
                      }`}
                    >
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          removeFromCart(product.id);
                        }}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-transform touch-manipulation ${
                          isDark
                            ? 'bg-neutral-700 text-white hover:bg-neutral-600'
                            : 'bg-white text-neutral-900 hover:bg-neutral-200 border border-neutral-200/80 shadow-xs'
                        }`}
                        aria-label="Kurangi jumlah"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span
                        className={`w-7 text-center text-xs font-bold font-mono select-none ${
                          isDark ? 'text-white' : 'text-neutral-900'
                        }`}
                      >
                        {inCartQty}
                      </span>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          addToCart(product);
                        }}
                        disabled={inCartQty >= product.stock}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-transform disabled:opacity-30 touch-manipulation ${
                          isDark
                            ? 'bg-white text-neutral-950 hover:bg-neutral-200'
                            : 'bg-neutral-900 text-white hover:bg-neutral-800'
                        }`}
                        aria-label="Tambah jumlah"
                      >
                        <Plus className="w-3.5 h-3.5 font-bold" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Bottom Quick Cart Bar (Thumb Zone) */}
      {totalCartCount > 0 && (
        <div className="fixed bottom-20 left-0 right-0 z-30 px-4 pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <button
              onClick={onGoToKasir}
              className={`w-full rounded-2xl p-3.5 shadow-2xl flex items-center justify-between active:scale-[0.98] transition-transform ${
                isDark
                  ? 'bg-white text-neutral-950'
                  : 'bg-neutral-900 text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono ${
                    isDark
                      ? 'bg-neutral-900 text-white'
                      : 'bg-white text-neutral-900'
                  }`}
                >
                  {totalCartCount}
                </div>
                <div className="text-left">
                  <div
                    className={`text-[10px] font-medium uppercase tracking-wider ${
                      isDark ? 'text-neutral-600' : 'text-neutral-400'
                    }`}
                  >
                    Total Pesanan
                  </div>
                  <div className="text-sm font-bold font-mono tabular-nums leading-tight">
                    {formatRupiah(totalCartPrice)}
                  </div>
                </div>
              </div>
              <div
                className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl border ${
                  isDark
                    ? 'bg-neutral-100 text-neutral-950 border-neutral-200'
                    : 'bg-neutral-800 text-white border-neutral-700'
                }`}
              >
                <span>Lanjut Bayar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProductForDetail && (
        <Suspense fallback={null}>
          <ProductDetailModal
            product={selectedProductForDetail}
            onClose={() => setSelectedProductForDetail(null)}
            onAdd={addToCart}
            theme={theme}
          />
        </Suspense>
      )}
    </div>
  );
};
