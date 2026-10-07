export const preloadLazyChunk = (
  component: 'nota' | 'laporan' | 'setelan' | 'scanner' | 'productDetail'
) => {
  switch (component) {
    case 'nota':
      return import('../components/NotaView');
    case 'laporan':
      return import('../components/LaporanView');
    case 'setelan':
      return import('../components/SetelanView');
    case 'scanner':
      return import('../components/BarcodeScanner');
    case 'productDetail':
      return import('../components/ProductDetailModal');
  }
};

export const preloadAllLazyComponents = () => {
  try {
    preloadLazyChunk('nota');
    preloadLazyChunk('laporan');
    preloadLazyChunk('setelan');
    preloadLazyChunk('scanner');
    preloadLazyChunk('productDetail');
  } catch (err) {
    // ignore preload errors
  }
};
