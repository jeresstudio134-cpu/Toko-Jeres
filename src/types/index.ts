export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  costPrice?: number; // Harga modal untuk hitung profit
  stock: number;
  unit: string; // pcs, porsi, cup, botol, pack
  imageUrl?: string;
  images?: string[];
  sku?: string;
  description?: string;
  isActive: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  totalSpent: number;
  ordersCount: number;
  firstVisit: string;
  lastVisit: string;
  notes?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  note?: string;
  customPrice?: number;
  length?: number; // Panjang (P)
  width?: number;  // Lebar (L)
  area?: number;   // Luas = P x L
  dimensionUnit?: 'm' | 'cm';
}

export type PaymentMethod = 'tunai' | 'qris' | 'transfer' | 'debit';
export type PaymentStatus = 'lunas' | 'belum_lunas';

export interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  costPrice?: number;
  quantity: number;
  subtotal: number;
  note?: string;
  length?: number;
  width?: number;
  area?: number;
  dimensionUnit?: 'm' | 'cm';
}

export interface Order {
  id: string;
  invoiceNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number; // in rupiah
  discountPercent?: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  cashGiven?: number;
  cashChange?: number;
  createdAt: string; // ISO date string
  notes?: string;
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  address: string;
  phone: string;
  receiptFooter: string;
  paperWidth: '58mm' | '80mm';
  taxPercent: number;
  enableTax: boolean;
  currency: string;
  qrisCodeText?: string;
  qrisImageUrl?: string;
  cloudinaryCloudName?: string;
  cloudinaryUploadPreset?: string;
  theme?: 'light' | 'dark';
  adminPin?: string;
  neonDatabaseUrl?: string;
}

export type ActiveTab = 'katalog' | 'kasir' | 'nota' | 'customer' | 'laporan' | 'setelan';
