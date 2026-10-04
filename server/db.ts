import { neon } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { eq, asc, desc, sql } from 'drizzle-orm';
import * as t from './schema.ts';
import type { Product, Customer, Order, StoreSettings } from '../src/types/index.ts';

// ======================================================
// KONEKSI NEON (Drizzle ORM) - hanya dari DATABASE_URL
// ======================================================
type Db = NeonHttpDatabase;
let cached: Db | null = null;

const getDb = (): Db | null => {
  const url = process.env.DATABASE_URL;
  if (!url || !url.trim()) return null;
  if (!cached) cached = drizzle(neon(url.trim()));
  return cached;
};

// ======================================================
// HELPER KONVERSI (NUMERIC dari Neon = teks, waktu = Date)
// ======================================================
const num = (v: any) => (v === null || v === undefined ? 0 : Number(v));
const numOrUndef = (v: any) => (v === null || v === undefined ? undefined : Number(v));
const str = (v: number | null | undefined) => (v === null || v === undefined ? null : String(v));
const iso = (v: any) => (v ? new Date(v).toISOString() : new Date().toISOString());
const dt = (v: any) => (v ? new Date(v) : new Date());

const imagesOf = (p: Product): string[] =>
  (p.images && p.images.length ? p.images : p.imageUrl ? [p.imageUrl] : []).filter(Boolean);

const toProduct = (r: typeof t.products.$inferSelect): Product => ({
  id: r.id,
  name: r.name,
  category: r.category,
  price: num(r.price),
  costPrice: num(r.costPrice),
  stock: num(r.stock),
  unit: r.unit || 'pcs',
  imageUrl: r.imageUrl || undefined,
  images: Array.isArray(r.images) && r.images.length ? r.images : r.imageUrl ? [r.imageUrl] : [],
  sku: r.sku || undefined,
  description: r.description || undefined,
  isActive: r.isActive !== false,
});

const toCustomer = (r: typeof t.customers.$inferSelect): Customer => ({
  id: r.id,
  name: r.name,
  phone: r.phone || '',
  email: r.email || undefined,
  address: r.address || undefined,
  totalSpent: num(r.totalSpent),
  ordersCount: num(r.ordersCount),
  firstVisit: iso(r.firstVisit),
  lastVisit: iso(r.lastVisit),
  notes: r.notes || undefined,
});

const toItem = (r: typeof t.orderItems.$inferSelect) => ({
  productId: r.productId || '',
  productName: r.productName,
  price: num(r.price),
  costPrice: numOrUndef(r.costPrice),
  quantity: num(r.quantity),
  length: numOrUndef(r.length),
  width: numOrUndef(r.width),
  area: numOrUndef(r.area),
  subtotal: num(r.subtotal),
  note: r.note || undefined,
});

const toOrder = (r: typeof t.orders.$inferSelect, items: (typeof t.orderItems.$inferSelect)[]): Order => ({
  id: r.id,
  invoiceNumber: r.invoiceNumber,
  customerId: r.customerId || undefined,
  customerName: r.customerName,
  customerPhone: r.customerPhone || undefined,
  items: items.map(toItem),
  subtotal: num(r.subtotal),
  discount: num(r.discount),
  tax: num(r.tax),
  total: num(r.total),
  paymentMethod: r.paymentMethod as Order['paymentMethod'],
  paymentStatus: (r.paymentStatus || 'lunas') as Order['paymentStatus'],
  cashGiven: numOrUndef(r.cashGiven),
  cashChange: numOrUndef(r.cashChange),
  createdAt: iso(r.createdAt),
  notes: r.notes || undefined,
});

const toSettings = (r: typeof t.storeSettings.$inferSelect): StoreSettings => ({
  storeName: r.storeName,
  tagline: r.tagline || '',
  address: r.address || '',
  phone: r.phone || '',
  receiptFooter: r.receiptFooter || '',
  paperWidth: (r.paperWidth || '58mm') as StoreSettings['paperWidth'],
  taxPercent: num(r.taxPercent),
  enableTax: !!r.enableTax,
  currency: r.currency || 'IDR',
  qrisCodeText: r.qrisCodeText || '',
  qrisImageUrl: r.qrisImageUrl || '',
  cloudinaryCloudName: r.cloudinaryCloudName || '',
  cloudinaryUploadPreset: r.cloudinaryUploadPreset || '',
  theme: (r.theme || 'light') as StoreSettings['theme'],
  adminPin: r.adminPin || '1234',
  neonDatabaseUrl: '',
});

// Pembuat nilai untuk INSERT / UPDATE
const productValues = (p: Product) => {
  const imgs = imagesOf(p);
  return {
    name: p.name,
    category: p.category,
    price: String(p.price),
    costPrice: String(p.costPrice || 0),
    stock: p.stock,
    unit: p.unit || 'pcs',
    imageUrl: imgs[0] ?? null,
    images: imgs,
    sku: p.sku ?? null,
    description: p.description ?? null,
    isActive: p.isActive !== false,
  };
};

const customerValues = (c: Customer) => ({
  name: c.name,
  phone: c.phone || '',
  email: c.email ?? null,
  address: c.address ?? null,
  totalSpent: String(c.totalSpent || 0),
  ordersCount: c.ordersCount || 0,
  firstVisit: dt(c.firstVisit),
  lastVisit: dt(c.lastVisit),
  notes: c.notes ?? null,
});

const orderValues = (o: Order) => ({
  invoiceNumber: o.invoiceNumber,
  customerId: o.customerId ?? null,
  customerName: o.customerName,
  customerPhone: o.customerPhone ?? null,
  subtotal: String(o.subtotal),
  discount: String(o.discount || 0),
  tax: String(o.tax || 0),
  total: String(o.total),
  paymentMethod: o.paymentMethod,
  paymentStatus: o.paymentStatus || 'lunas',
  cashGiven: str(o.cashGiven),
  cashChange: str(o.cashChange),
  notes: o.notes ?? null,
  createdAt: dt(o.createdAt),
});

const itemValues = (orderId: string, it: any, position: number) => ({
  orderId,
  position,
  productId: it.productId ?? null,
  productName: it.productName,
  price: String(it.price),
  costPrice: str(it.costPrice),
  quantity: String(it.quantity),
  length: str(it.length),
  width: str(it.width),
  area: str(it.area),
  subtotal: String(it.subtotal),
  note: it.note ?? null,
});

const settingsValues = (s: StoreSettings) => ({
  storeName: s.storeName,
  tagline: s.tagline || '',
  address: s.address || '',
  phone: s.phone || '',
  receiptFooter: s.receiptFooter || '',
  paperWidth: s.paperWidth || '58mm',
  taxPercent: String(s.taxPercent || 0),
  enableTax: !!s.enableTax,
  currency: s.currency || 'IDR',
  qrisCodeText: s.qrisCodeText || '',
  qrisImageUrl: s.qrisImageUrl || '',
  cloudinaryCloudName: s.cloudinaryCloudName || '',
  cloudinaryUploadPreset: s.cloudinaryUploadPreset || '',
  theme: s.theme || 'light',
  adminPin: s.adminPin || '1234',
});

// ======================================================
// DATA AWAL (hanya dipakai sekali kalau database masih kosong)
// ======================================================
const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'JERES STUDIO',
  tagline: 'Toko & Kasir HP',
  address: 'Jl. Senopati No. 42, Jakarta Selatan',
  phone: '0812-8899-7722',
  receiptFooter: 'Terima kasih atas kunjungan Anda!\nBarang yang sudah dibeli tidak dapat ditukar.',
  paperWidth: '58mm',
  taxPercent: 11,
  enableTax: false,
  currency: 'IDR',
  qrisCodeText: '00020101021226590014ID.LINKAJA.WWW011893600911002234010202150000000000000005204581253033605802ID5914JERES STUDIO6007JAKARTA61051219062070703A01630454D1',
  qrisImageUrl: '',
  cloudinaryCloudName: 'kios-minimalis',
  cloudinaryUploadPreset: 'ml_default',
  theme: 'light',
  adminPin: '1234',
  neonDatabaseUrl: '',
};

const DEFAULT_PRODUCTS: Product[] = [
  { id: 'prod-1', name: 'Kopi Susu Aren Special', category: 'Minuman', price: 22000, costPrice: 9500, stock: 45, unit: 'cup', sku: 'DRK-001', description: 'Espresso double shot, susu segar, gula aren organik lokal', isActive: true },
  { id: 'prod-2', name: 'Matcha Latte Uji', category: 'Minuman', price: 28000, costPrice: 12000, stock: 32, unit: 'cup', sku: 'DRK-002', description: 'Matcha murni dari Uji Jepang dengan susu oat pilihan', isActive: true },
  { id: 'prod-3', name: 'Cold Brew Citrus Black', category: 'Minuman', price: 25000, costPrice: 10000, stock: 20, unit: 'botol', sku: 'DRK-003', description: 'Steeped 16 jam dengan hint citrus segar', isActive: true },
  { id: 'prod-4', name: 'Almond Butter Croissant', category: 'Pastry', price: 26000, costPrice: 13000, stock: 18, unit: 'pcs', sku: 'PST-001', description: 'Flaky French butter pastry dengan roasted almond flakes', isActive: true },
  { id: 'prod-5', name: 'Artisan Cinnamon Roll', category: 'Pastry', price: 24000, costPrice: 11000, stock: 15, unit: 'pcs', sku: 'PST-002', description: 'Cream cheese glaze lembut dengan kayu manis ceylon wangi', isActive: true },
  { id: 'prod-6', name: 'Sourdough Toast & Kaya', category: 'Makanan', price: 28000, costPrice: 12500, stock: 24, unit: 'porsi', sku: 'FOD-001', description: 'Roti sourdough panggang dengan selai srikaya pandan & butter', isActive: true },
  { id: 'prod-7', name: 'Linen Tote Bag Natural', category: 'Merchandise', price: 75000, costPrice: 38000, stock: 12, unit: 'pcs', sku: 'MCH-001', description: 'Tas kanvas katun organik 100% minimalis ramah lingkungan', isActive: true },
  { id: 'prod-8', name: 'Ceramic Mug Off-White 250ml', category: 'Merchandise', price: 65000, costPrice: 30000, stock: 10, unit: 'pcs', sku: 'MCH-002', description: 'Cangkir keramik handmade matte texture', isActive: true },
];

const DEFAULT_CUSTOMERS: Customer[] = [
  { id: 'cust-1', name: 'Budi Santoso', phone: '081234567890', email: 'budi.santoso@email.com', address: 'Kebayoran Baru, Jakarta Selatan', totalSpent: 188000, ordersCount: 4, firstVisit: new Date(Date.now() - 14 * 86400000).toISOString(), lastVisit: new Date(Date.now() - 1 * 86400000).toISOString(), notes: 'Suka kopi less sugar, pelanggan tetap' },
  { id: 'cust-2', name: 'Siti Rahma', phone: '085712345678', email: 'siti.rahma@email.com', address: 'Tebet Barat, Jakarta', totalSpent: 124000, ordersCount: 2, firstVisit: new Date(Date.now() - 8 * 86400000).toISOString(), lastVisit: new Date(Date.now() - 2 * 86400000).toISOString(), notes: 'Favorit: Matcha Latte Uji' },
  { id: 'cust-3', name: 'Dimas Wicaksono', phone: '081899887766', email: 'dimas.w@email.com', totalSpent: 75000, ordersCount: 1, firstVisit: new Date(Date.now() - 3 * 86400000).toISOString(), lastVisit: new Date(Date.now() - 3 * 86400000).toISOString(), notes: 'Beli tote bag merchandise' },
];

const DEFAULT_ORDERS: Order[] = [
  {
    id: 'ord-101', invoiceNumber: 'INV-20260928-001', customerId: 'cust-1', customerName: 'Budi Santoso', customerPhone: '081234567890',
    items: [
      { productId: 'prod-1', productName: 'Kopi Susu Aren Special', price: 22000, costPrice: 9500, quantity: 2, subtotal: 44000 },
      { productId: 'prod-4', productName: 'Almond Butter Croissant', price: 26000, costPrice: 13000, quantity: 1, subtotal: 26000 },
    ],
    subtotal: 70000, discount: 0, tax: 0, total: 70000, paymentMethod: 'qris', paymentStatus: 'lunas',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), notes: 'Meja 03',
  },
  {
    id: 'ord-102', invoiceNumber: 'INV-20260929-002', customerId: 'cust-2', customerName: 'Siti Rahma', customerPhone: '085712345678',
    items: [
      { productId: 'prod-2', productName: 'Matcha Latte Uji', price: 28000, costPrice: 12000, quantity: 2, subtotal: 56000 },
      { productId: 'prod-5', productName: 'Artisan Cinnamon Roll', price: 24000, costPrice: 11000, quantity: 1, subtotal: 24000 },
    ],
    subtotal: 80000, discount: 5000, tax: 0, total: 75000, paymentMethod: 'tunai', paymentStatus: 'lunas',
    cashGiven: 100000, cashChange: 25000, createdAt: new Date(Date.now() - 1 * 86400000).toISOString(), notes: 'Takeaway',
  },
];

// ======================================================
// DATABASE
// ======================================================
export class ServerDatabase {
  private ready: Promise<boolean> | null = null;
  private lastError: string | null = null;

  /** Ambil koneksi Neon. Kalau gagal, lempar error yang jelas (tanpa data palsu). */
  private async db(): Promise<Db> {
    const db = getDb();
    if (!db) {
      this.lastError = 'DATABASE_URL belum diset';
      throw new Error(this.lastError);
    }
    if (!this.ready) {
      this.ready = this.setup(db)
        .then(() => true)
        .catch(err => {
          this.lastError = err.message;
          this.ready = null; // coba lagi di request berikutnya
          console.warn('Neon database setup error:', err.message);
          throw err;
        });
    }
    await this.ready;
    this.lastError = null;
    return db;
  }

  public async status() {
    try {
      await this.db();
      return { connected: true, hasDatabaseUrl: true, error: null as string | null };
    } catch (e: any) {
      return {
        connected: false,
        hasDatabaseUrl: !!process.env.DATABASE_URL?.trim(),
        error: this.lastError ?? e.message,
      };
    }
  }

  // -------------------------
  // Buat tabel kalau belum ada (aman dijalankan berulang)
  // -------------------------
  private async setup(db: Db): Promise<void> {
    await Promise.all([
      db.execute(sql`CREATE TABLE IF NOT EXISTS store_settings (
        id INT PRIMARY KEY,
        store_name VARCHAR(255) NOT NULL,
        tagline VARCHAR(255),
        address TEXT,
        phone VARCHAR(50),
        receipt_footer TEXT,
        paper_width VARCHAR(10) DEFAULT '58mm',
        tax_percent NUMERIC(5, 2) DEFAULT 0,
        enable_tax BOOLEAN DEFAULT FALSE,
        currency VARCHAR(10) DEFAULT 'IDR',
        qris_code_text TEXT,
        qris_image_url TEXT,
        cloudinary_cloud_name VARCHAR(255),
        cloudinary_upload_preset VARCHAR(255),
        theme VARCHAR(10) DEFAULT 'light',
        admin_pin VARCHAR(20) DEFAULT '1234'
      )`),
      db.execute(sql`CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        price NUMERIC(12, 2) NOT NULL,
        cost_price NUMERIC(12, 2) DEFAULT 0,
        stock INT NOT NULL DEFAULT 0,
        unit VARCHAR(30) DEFAULT 'pcs',
        image_url TEXT,
        sku VARCHAR(100),
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`),
      db.execute(sql`CREATE TABLE IF NOT EXISTS customers (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        email VARCHAR(255),
        address TEXT,
        total_spent NUMERIC(14, 2) DEFAULT 0,
        orders_count INT DEFAULT 0,
        first_visit TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_visit TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        notes TEXT
      )`),
      db.execute(sql`CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(64) PRIMARY KEY,
        invoice_number VARCHAR(100) UNIQUE NOT NULL,
        customer_id VARCHAR(64),
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(50),
        subtotal NUMERIC(12, 2) NOT NULL,
        discount NUMERIC(12, 2) DEFAULT 0,
        tax NUMERIC(12, 2) DEFAULT 0,
        total NUMERIC(12, 2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        payment_status VARCHAR(50) DEFAULT 'lunas',
        cash_given NUMERIC(12, 2),
        cash_change NUMERIC(12, 2),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`),
    ]);

    await db.execute(sql`CREATE TABLE IF NOT EXISTS order_items (
      id BIGSERIAL PRIMARY KEY,
      order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      position INT NOT NULL DEFAULT 0,
      product_id VARCHAR(64),
      product_name VARCHAR(255) NOT NULL,
      price NUMERIC(12, 2) NOT NULL,
      cost_price NUMERIC(12, 2),
      quantity NUMERIC(12, 2) NOT NULL,
      length NUMERIC(12, 3),
      width NUMERIC(12, 3),
      area NUMERIC(12, 3),
      subtotal NUMERIC(14, 2) NOT NULL,
      note TEXT
    )`);

    await Promise.all([
      db.execute(sql`ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS qris_image_url TEXT`),
      db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS seq BIGSERIAL`),
      db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb`),
      db.execute(sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS seq BIGSERIAL`),
      db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS seq BIGSERIAL`),
      db.execute(sql`CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id)`),
    ]);

    // Isi data contoh hanya kalau database benar-benar baru
    const has = await db.select({ id: t.storeSettings.id }).from(t.storeSettings).where(eq(t.storeSettings.id, 1));
    if (has.length > 0) return;

    await this.saveSettings(db, DEFAULT_SETTINGS);
    for (const p of DEFAULT_PRODUCTS) await this.insertProduct(db, p);
    for (const c of DEFAULT_CUSTOMERS) await this.insertCustomer(db, c);
    for (const o of DEFAULT_ORDERS) await this.insertOrder(db, o);
  }

  // -------------------------
  // Helper tulis data
  // -------------------------
  private async saveSettings(db: Db, s: StoreSettings): Promise<void> {
    const v = settingsValues(s);
    await db.insert(t.storeSettings).values({ id: 1, ...v })
      .onConflictDoUpdate({ target: t.storeSettings.id, set: v });
  }

  private async insertProduct(db: Db, p: Product): Promise<void> {
    await db.insert(t.products).values({ id: p.id, ...productValues(p) }).onConflictDoNothing();
  }

  private async insertCustomer(db: Db, c: Customer): Promise<void> {
    await db.insert(t.customers).values({ id: c.id, ...customerValues(c) }).onConflictDoNothing();
  }

  /** Simpan order + itemnya. Mengembalikan false kalau order sudah ada. */
  private async insertOrder(db: Db, o: Order): Promise<boolean> {
    const r = await db.insert(t.orders).values({ id: o.id, ...orderValues(o) })
      .onConflictDoNothing().returning({ id: t.orders.id });
    if (r.length === 0) return false;
    if (o.items.length > 0) {
      await db.insert(t.orderItems).values(o.items.map((it, i) => itemValues(o.id, it, i)));
    }
    return true;
  }

  // -------------------------
  // Products
  // -------------------------
  public async getProducts(): Promise<Product[]> {
    const db = await this.db();
    const rows = await db.select().from(t.products).orderBy(asc(t.products.seq));
    return rows.map(toProduct);
  }

  public async getProductById(id: string): Promise<Product | undefined> {
    const db = await this.db();
    const rows = await db.select().from(t.products).where(eq(t.products.id, id));
    return rows[0] ? toProduct(rows[0]) : undefined;
  }

  public async createProduct(product: Omit<Product, 'id'> & { id?: string }): Promise<Product> {
    const db = await this.db();
    const newProduct: Product = {
      ...product,
      id: product.id || `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      isActive: product.isActive !== undefined ? product.isActive : true,
    };
    const [row] = await db.insert(t.products).values({ id: newProduct.id, ...productValues(newProduct) }).returning();
    return toProduct(row);
  }

  public async updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
    const db = await this.db();
    const current = await this.getProductById(id);
    if (!current) return null;
    const next: Product = { ...current, ...updates, id };
    await db.update(t.products).set(productValues(next)).where(eq(t.products.id, id));
    return next;
  }

  public async deleteProduct(id: string): Promise<boolean> {
    const db = await this.db();
    const r = await db.delete(t.products).where(eq(t.products.id, id)).returning({ id: t.products.id });
    return r.length > 0;
  }

  // -------------------------
  // Customers (CRM otomatis)
  // -------------------------
  public async getCustomers(): Promise<Customer[]> {
    const db = await this.db();
    const rows = await db.select().from(t.customers).orderBy(desc(t.customers.seq));
    return rows.map(toCustomer);
  }

  public async getCustomerById(id: string): Promise<Customer | undefined> {
    const db = await this.db();
    const rows = await db.select().from(t.customers).where(eq(t.customers.id, id));
    return rows[0] ? toCustomer(rows[0]) : undefined;
  }

  public async createCustomer(cust: Omit<Customer, 'id'> & { id?: string }): Promise<Customer> {
    const db = await this.db();
    const newCust: Customer = {
      ...cust,
      id: cust.id || `cust-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      firstVisit: cust.firstVisit || new Date().toISOString(),
      lastVisit: cust.lastVisit || new Date().toISOString(),
      totalSpent: cust.totalSpent || 0,
      ordersCount: cust.ordersCount || 0,
    };
    const [row] = await db.insert(t.customers).values({ id: newCust.id, ...customerValues(newCust) }).returning();
    return toCustomer(row);
  }

  public async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | null> {
    const db = await this.db();
    const current = await this.getCustomerById(id);
    if (!current) return null;
    const next: Customer = { ...current, ...updates, id };
    await db.update(t.customers).set(customerValues(next)).where(eq(t.customers.id, id));
    return next;
  }

  public async recordCustomerFromOrder(name: string, phone: string, total: number): Promise<Customer> {
    const db = await this.db();
    const cleanPhone = phone.replace(/[^0-9+]/g, '').trim();
    const cleanName = name.trim() || 'Pelanggan Umum';
    const now = new Date();

    let found: typeof t.customers.$inferSelect | undefined;

    // 1. Cari lewat nomor HP
    if (cleanPhone) {
      const r = await db.select().from(t.customers)
        .where(sql`regexp_replace(COALESCE(${t.customers.phone}, ''), '[^0-9+]', '', 'g') = ${cleanPhone}`)
        .orderBy(asc(t.customers.seq)).limit(1);
      found = r[0];
    }
    // 2. Cari lewat nama (pelanggan umum tanpa HP memakai satu baris yang sama)
    if (!found && (cleanName !== 'Pelanggan Umum' || !cleanPhone)) {
      const r = await db.select().from(t.customers)
        .where(sql`LOWER(${t.customers.name}) = LOWER(${cleanName})`)
        .orderBy(asc(t.customers.seq)).limit(1);
      found = r[0];
    }

    if (found) {
      const patch: Partial<typeof t.customers.$inferInsert> = {
        totalSpent: sql`${t.customers.totalSpent} + ${total}` as any,
        ordersCount: sql`${t.customers.ordersCount} + 1` as any,
        lastVisit: now,
      };
      if (cleanName !== 'Pelanggan Umum' && (!found.name || found.name === 'Pelanggan Umum')) patch.name = cleanName;
      if (cleanPhone && !found.phone) patch.phone = cleanPhone;
      const [row] = await db.update(t.customers).set(patch).where(eq(t.customers.id, found.id)).returning();
      return toCustomer(row);
    }

    const [row] = await db.insert(t.customers).values({
      id: `cust-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: cleanName,
      phone: cleanPhone || '',
      totalSpent: String(total),
      ordersCount: 1,
      firstVisit: now,
      lastVisit: now,
      notes: 'Pencatatan otomatis dari pesanan kasir',
    }).returning();
    return toCustomer(row);
  }

  // -------------------------
  // Orders
  // -------------------------
  public async getOrders(): Promise<Order[]> {
    const db = await this.db();
    const orders = await db.select().from(t.orders).orderBy(desc(t.orders.seq));
    const items = await db.select().from(t.orderItems).orderBy(asc(t.orderItems.position), asc(t.orderItems.id));
    const byOrder = new Map<string, (typeof t.orderItems.$inferSelect)[]>();
    for (const it of items) {
      const list = byOrder.get(it.orderId) || [];
      list.push(it);
      byOrder.set(it.orderId, list);
    }
    return orders.map(o => toOrder(o, byOrder.get(o.id) || []));
  }

  public async getOrderById(id: string): Promise<Order | undefined> {
    const db = await this.db();
    const o = await db.select().from(t.orders).where(eq(t.orders.id, id));
    if (!o[0]) return undefined;
    const items = await db.select().from(t.orderItems)
      .where(eq(t.orderItems.orderId, id))
      .orderBy(asc(t.orderItems.position), asc(t.orderItems.id));
    return toOrder(o[0], items);
  }

  public async createOrder(orderInput: Order): Promise<{ order: Order; customer: Customer }> {
    const db = await this.db();

    // 1. Catat customer otomatis
    const customer = await this.recordCustomerFromOrder(
      orderInput.customerName,
      orderInput.customerPhone || '',
      orderInput.total
    );

    const finalizedOrder: Order = {
      ...orderInput,
      customerId: customer.id,
      createdAt: orderInput.createdAt || new Date().toISOString(),
    };

    // 2. Simpan order + item + potong stok sekaligus (satu paket, semua berhasil atau semua batal)
    const ops: any[] = [db.insert(t.orders).values({ id: finalizedOrder.id, ...orderValues(finalizedOrder) })];
    if (finalizedOrder.items.length > 0) {
      ops.push(db.insert(t.orderItems).values(finalizedOrder.items.map((it, i) => itemValues(finalizedOrder.id, it, i))));
    }
    for (const it of finalizedOrder.items) {
      if (!it.productId) continue;
      ops.push(
        db.update(t.products)
          .set({ stock: sql`GREATEST(0, ${t.products.stock} - ${it.quantity})` as any })
          .where(eq(t.products.id, it.productId))
      );
    }
    await db.batch(ops as [any, ...any[]]);

    return { order: finalizedOrder, customer };
  }

  public async updateOrder(
    id: string,
    updates: Partial<
      Pick<Order, 'customerName' | 'customerPhone' | 'paymentMethod' | 'items' | 'discount' | 'tax' | 'notes'>
    >
  ): Promise<Order | null> {
    const db = await this.db();
    const current = await this.getOrderById(id);
    if (!current) return null;

    const next: Order = { ...current };

    if (updates.customerName !== undefined && updates.customerName.trim()) {
      next.customerName = updates.customerName.trim();
    }
    if (updates.customerPhone !== undefined) next.customerPhone = updates.customerPhone.trim();
    if (updates.paymentMethod !== undefined) next.paymentMethod = updates.paymentMethod;
    if (updates.notes !== undefined) next.notes = updates.notes;

    if (updates.items !== undefined) {
      if (updates.items.length === 0) throw new Error('Invoice minimal harus punya 1 item.');
      next.items = updates.items.map(it => ({
        ...it,
        subtotal: (Number(it.price) || 0) * (Number(it.quantity) || 0) * (it.area ? Number(it.area) : 1),
      }));
    }

    next.subtotal = next.items.reduce((acc, it) => acc + (Number(it.subtotal) || 0), 0);
    if (updates.discount !== undefined) next.discount = Math.max(0, Number(updates.discount) || 0);
    if (updates.tax !== undefined) next.tax = Math.max(0, Number(updates.tax) || 0);
    next.total = Math.max(0, next.subtotal - (next.discount || 0) + (next.tax || 0));

    if (next.cashGiven !== undefined && next.cashGiven !== null) {
      next.cashChange = Math.max(0, next.cashGiven - next.total);
    }

    const diff = next.total - current.total;
    const ops: any[] = [];

    if (updates.items !== undefined) {
      // Kembalikan stok lama, kurangi stok baru
      const delta = new Map<string, number>();
      for (const it of current.items) delta.set(it.productId, (delta.get(it.productId) || 0) + it.quantity);
      for (const it of updates.items) delta.set(it.productId, (delta.get(it.productId) || 0) - it.quantity);
      for (const [productId, d] of delta.entries()) {
        if (d === 0 || !productId) continue;
        ops.push(
          db.update(t.products)
            .set({ stock: sql`GREATEST(0, ${t.products.stock} + ${d})` as any })
            .where(eq(t.products.id, productId))
        );
      }
      ops.push(db.delete(t.orderItems).where(eq(t.orderItems.orderId, id)));
      ops.push(db.insert(t.orderItems).values(next.items.map((it, i) => itemValues(id, it, i))));
    }

    if (diff !== 0 && current.customerId) {
      ops.push(
        db.update(t.customers)
          .set({ totalSpent: sql`GREATEST(0, ${t.customers.totalSpent} + ${diff})` as any })
          .where(eq(t.customers.id, current.customerId))
      );
    }

    ops.push(
      db.update(t.orders).set({
        customerName: next.customerName,
        customerPhone: next.customerPhone ?? null,
        subtotal: String(next.subtotal),
        discount: String(next.discount || 0),
        tax: String(next.tax || 0),
        total: String(next.total),
        paymentMethod: next.paymentMethod,
        cashChange: str(next.cashChange),
        notes: next.notes ?? null,
      }).where(eq(t.orders.id, id))
    );

    await db.batch(ops as [any, ...any[]]);
    return next;
  }

  public async deleteOrder(id: string): Promise<boolean> {
    const db = await this.db();
    const r = await db.delete(t.orders).where(eq(t.orders.id, id)).returning({ id: t.orders.id });
    return r.length > 0;
  }

  // -------------------------
  // Settings
  // -------------------------
  public async getSettings(): Promise<StoreSettings> {
    const db = await this.db();
    const r = await db.select().from(t.storeSettings).where(eq(t.storeSettings.id, 1));
    return r[0] ? toSettings(r[0]) : { ...DEFAULT_SETTINGS, neonDatabaseUrl: '' };
  }

  public async updateSettings(settings: Partial<StoreSettings>): Promise<StoreSettings> {
    const db = await this.db();
    const { neonDatabaseUrl, ...safe } = settings; // URL database tidak pernah disimpan dari browser
    const current = await this.getSettings();
    const next: StoreSettings = { ...current, ...safe, neonDatabaseUrl: '' };
    await this.saveSettings(db, next);
    return next;
  }

  // -------------------------
  // Neon (tombol "Tes Koneksi" / "Sinkronkan" di Setelan)
  // Sekarang selalu memakai DATABASE_URL di server, bukan URL dari browser.
  // -------------------------
  public async testNeonConnection(_url?: string): Promise<{ success: boolean; message: string; timestamp?: string }> {
    try {
      const db = await this.db();
      const r: any = await db.execute(sql`SELECT NOW() AS current_time`);
      const rows = r?.rows ?? r;
      return {
        success: true,
        message: 'Koneksi ke Neon PostgreSQL berhasil!',
        timestamp: rows?.[0]?.current_time ? String(rows[0].current_time) : undefined,
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Gagal tersambung ke Neon PostgreSQL.' };
    }
  }

  public async syncToNeon(_url?: string): Promise<{ success: boolean; message: string }> {
    const s = await this.status();
    return s.connected
      ? { success: true, message: 'Data sudah tersimpan langsung di Neon. Sinkronisasi manual tidak diperlukan.' }
      : { success: false, message: s.error || 'Neon tidak terhubung.' };
  }

  // -------------------------
  // Backup / Restore
  // -------------------------
  public async importBackup(backupData: {
    store?: Partial<StoreSettings>;
    products?: Product[];
    customers?: Customer[];
    orders?: Order[];
  }): Promise<{ success: boolean; message: string; counts: { products: number; customers: number; orders: number } }> {
    const db = await this.db();

    if (backupData.store) await this.updateSettings(backupData.store);

    if (Array.isArray(backupData.products)) {
      for (const p of backupData.products) {
        const v = productValues(p);
        await db.insert(t.products).values({ id: p.id, ...v }).onConflictDoUpdate({ target: t.products.id, set: v });
      }
    }
    if (Array.isArray(backupData.customers)) {
      for (const c of backupData.customers) {
        const v = customerValues(c);
        await db.insert(t.customers).values({ id: c.id, ...v }).onConflictDoUpdate({ target: t.customers.id, set: v });
      }
    }
    if (Array.isArray(backupData.orders)) {
      for (const o of backupData.orders) await this.insertOrder(db, o);
    }

    const count = async (table: any) => {
      const r = await db.select({ c: sql<number>`count(*)::int` }).from(table);
      return Number(r[0]?.c || 0);
    };

    return {
      success: true,
      message: 'Database berhasil dipulihkan dari file cadangan!',
      counts: {
        products: await count(t.products),
        customers: await count(t.customers),
        orders: await count(t.orders),
      },
    };
  }
}

export const serverDb = new ServerDatabase();