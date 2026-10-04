import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';
import type { Product, Customer, Order, StoreSettings } from '../src/types/index.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

const getSql = () => {
  const url = process.env.DATABASE_URL;
  if (!url || !url.trim()) return null;
  try {
    return neon(url);
  } catch (e) {
    console.warn('Neon init error:', e);
    return null;
  }
};

// Neon mengembalikan NUMERIC sebagai teks dan waktu sebagai Date, jadi diubah di sini
const num = (v: any) => (v === null || v === undefined ? 0 : Number(v));
const numOrUndef = (v: any) => (v === null || v === undefined ? undefined : Number(v));
const iso = (v: any) => (v ? new Date(v).toISOString() : new Date().toISOString());

const imagesOf = (p: Product): string[] =>
  (p.images && p.images.length ? p.images : p.imageUrl ? [p.imageUrl] : []).filter(Boolean);

const toProduct = (r: any): Product =>
  ({
    id: r.id,
    name: r.name,
    category: r.category,
    price: num(r.price),
    costPrice: num(r.cost_price),
    stock: num(r.stock),
    unit: r.unit || 'pcs',
    imageUrl: r.image_url || undefined,
    images:
      Array.isArray(r.images) && r.images.length ? r.images : r.image_url ? [r.image_url] : [],
    sku: r.sku || undefined,
    description: r.description || undefined,
    isActive: r.is_active !== false,
  }) as Product;

const toCustomer = (r: any): Customer =>
  ({
    id: r.id,
    name: r.name,
    phone: r.phone || '',
    email: r.email || undefined,
    address: r.address || undefined,
    totalSpent: num(r.total_spent),
    ordersCount: num(r.orders_count),
    firstVisit: iso(r.first_visit),
    lastVisit: iso(r.last_visit),
    notes: r.notes || undefined,
  }) as Customer;

const toItem = (r: any) => ({
  productId: r.product_id,
  productName: r.product_name,
  price: num(r.price),
  costPrice: numOrUndef(r.cost_price),
  quantity: num(r.quantity),
  length: numOrUndef(r.length),
  width: numOrUndef(r.width),
  area: numOrUndef(r.area),
  subtotal: num(r.subtotal),
  note: r.note || undefined,
});

const toOrder = (r: any, items: any[]): Order =>
  ({
    id: r.id,
    invoiceNumber: r.invoice_number,
    customerId: r.customer_id || undefined,
    customerName: r.customer_name,
    customerPhone: r.customer_phone || undefined,
    items: items.map(toItem),
    subtotal: num(r.subtotal),
    discount: num(r.discount),
    tax: num(r.tax),
    total: num(r.total),
    paymentMethod: r.payment_method,
    paymentStatus: r.payment_status,
    cashGiven: numOrUndef(r.cash_given),
    cashChange: numOrUndef(r.cash_change),
    createdAt: iso(r.created_at),
    notes: r.notes || undefined,
  }) as Order;

const toSettings = (r: any): StoreSettings =>
  ({
    storeName: r.store_name,
    tagline: r.tagline || '',
    address: r.address || '',
    phone: r.phone || '',
    receiptFooter: r.receipt_footer || '',
    paperWidth: r.paper_width || '58mm',
    taxPercent: num(r.tax_percent),
    enableTax: !!r.enable_tax,
    currency: r.currency || 'IDR',
    qrisCodeText: r.qris_code_text || '',
    qrisImageUrl: r.qris_image_url || '',
    cloudinaryCloudName: r.cloudinary_cloud_name || '',
    cloudinaryUploadPreset: r.cloudinary_upload_preset || '',
    theme: r.theme || 'light',
    adminPin: r.admin_pin || '1234',
    neonDatabaseUrl: '',
  }) as StoreSettings;

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
  {
    id: 'prod-1',
    name: 'Kopi Susu Aren Special',
    category: 'Minuman',
    price: 22000,
    costPrice: 9500,
    stock: 45,
    unit: 'cup',
    sku: 'DRK-001',
    description: 'Espresso double shot, susu segar, gula aren organik lokal',
    isActive: true,
  },
  {
    id: 'prod-2',
    name: 'Matcha Latte Uji',
    category: 'Minuman',
    price: 28000,
    costPrice: 12000,
    stock: 32,
    unit: 'cup',
    sku: 'DRK-002',
    description: 'Matcha murni dari Uji Jepang dengan susu oat pilihan',
    isActive: true,
  },
  {
    id: 'prod-3',
    name: 'Cold Brew Citrus Black',
    category: 'Minuman',
    price: 25000,
    costPrice: 10000,
    stock: 20,
    unit: 'botol',
    sku: 'DRK-003',
    description: 'Steeped 16 jam dengan hint citrus segar',
    isActive: true,
  },
  {
    id: 'prod-4',
    name: 'Almond Butter Croissant',
    category: 'Pastry',
    price: 26000,
    costPrice: 13000,
    stock: 18,
    unit: 'pcs',
    sku: 'PST-001',
    description: 'Flaky French butter pastry dengan roasted almond flakes',
    isActive: true,
  },
  {
    id: 'prod-5',
    name: 'Artisan Cinnamon Roll',
    category: 'Pastry',
    price: 24000,
    costPrice: 11000,
    stock: 15,
    unit: 'pcs',
    sku: 'PST-002',
    description: 'Cream cheese glaze lembut dengan kayu manis ceylon wangi',
    isActive: true,
  },
  {
    id: 'prod-6',
    name: 'Sourdough Toast & Kaya',
    category: 'Makanan',
    price: 28000,
    costPrice: 12500,
    stock: 24,
    unit: 'porsi',
    sku: 'FOD-001',
    description: 'Roti sourdough panggang dengan selai srikaya pandan & butter',
    isActive: true,
  },
  {
    id: 'prod-7',
    name: 'Linen Tote Bag Natural',
    category: 'Merchandise',
    price: 75000,
    costPrice: 38000,
    stock: 12,
    unit: 'pcs',
    sku: 'MCH-001',
    description: 'Tas kanvas katun organik 100% minimalis ramah lingkungan',
    isActive: true,
  },
  {
    id: 'prod-8',
    name: 'Ceramic Mug Off-White 250ml',
    category: 'Merchandise',
    price: 65000,
    costPrice: 30000,
    stock: 10,
    unit: 'pcs',
    sku: 'MCH-002',
    description: 'Cangkir keramik handmade matte texture',
    isActive: true,
  },
];

const DEFAULT_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    name: 'Budi Santoso',
    phone: '081234567890',
    email: 'budi.santoso@email.com',
    address: 'Kebayoran Baru, Jakarta Selatan',
    totalSpent: 188000,
    ordersCount: 4,
    firstVisit: new Date(Date.now() - 14 * 86400000).toISOString(),
    lastVisit: new Date(Date.now() - 1 * 86400000).toISOString(),
    notes: 'Suka kopi less sugar, pelanggan tetap',
  },
  {
    id: 'cust-2',
    name: 'Siti Rahma',
    phone: '085712345678',
    email: 'siti.rahma@email.com',
    address: 'Tebet Barat, Jakarta',
    totalSpent: 124000,
    ordersCount: 2,
    firstVisit: new Date(Date.now() - 8 * 86400000).toISOString(),
    lastVisit: new Date(Date.now() - 2 * 86400000).toISOString(),
    notes: 'Favorit: Matcha Latte Uji',
  },
  {
    id: 'cust-3',
    name: 'Dimas Wicaksono',
    phone: '081899887766',
    email: 'dimas.w@email.com',
    totalSpent: 75000,
    ordersCount: 1,
    firstVisit: new Date(Date.now() - 3 * 86400000).toISOString(),
    lastVisit: new Date(Date.now() - 3 * 86400000).toISOString(),
    notes: 'Beli tote bag merchandise',
  },
];

const DEFAULT_ORDERS: Order[] = [
  {
    id: 'ord-101',
    invoiceNumber: 'INV-20260928-001',
    customerId: 'cust-1',
    customerName: 'Budi Santoso',
    customerPhone: '081234567890',
    items: [
      { productId: 'prod-1', productName: 'Kopi Susu Aren Special', price: 22000, costPrice: 9500, quantity: 2, subtotal: 44000 },
      { productId: 'prod-4', productName: 'Almond Butter Croissant', price: 26000, costPrice: 13000, quantity: 1, subtotal: 26000 },
    ],
    subtotal: 70000,
    discount: 0,
    tax: 0,
    total: 70000,
    paymentMethod: 'qris',
    paymentStatus: 'lunas',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    notes: 'Meja 03',
  },
  {
    id: 'ord-102',
    invoiceNumber: 'INV-20260929-002',
    customerId: 'cust-2',
    customerName: 'Siti Rahma',
    customerPhone: '085712345678',
    items: [
      { productId: 'prod-2', productName: 'Matcha Latte Uji', price: 28000, costPrice: 12000, quantity: 2, subtotal: 56000 },
      { productId: 'prod-5', productName: 'Artisan Cinnamon Roll', price: 24000, costPrice: 11000, quantity: 1, subtotal: 24000 },
    ],
    subtotal: 80000,
    discount: 5000,
    tax: 0,
    total: 75000,
    paymentMethod: 'tunai',
    paymentStatus: 'lunas',
    cashGiven: 100000,
    cashChange: 25000,
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    notes: 'Takeaway',
  },
];

interface DatabaseSchema {
  settings: StoreSettings;
  products: Product[];
  customers: Customer[];
  orders: Order[];
}

export class ServerDatabase {
  private ready: Promise<boolean> | null = null;
  private lastError: string | null = null;
  private localData: DatabaseSchema;

  constructor() {
    this.localData = this.loadLocalData();
  }

  private ensureDataDir(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch {
      // Ignore if read-only filesystem
    }
  }

  private loadLocalData(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
          products: parsed.products && parsed.products.length > 0 ? parsed.products : DEFAULT_PRODUCTS,
          customers: parsed.customers && parsed.customers.length > 0 ? parsed.customers : DEFAULT_CUSTOMERS,
          orders: parsed.orders && parsed.orders.length > 0 ? parsed.orders : DEFAULT_ORDERS,
        };
      }
    } catch (e) {
      console.warn('Failed reading local database file, using defaults:', e);
    }

    const initial: DatabaseSchema = {
      settings: DEFAULT_SETTINGS,
      products: DEFAULT_PRODUCTS,
      customers: DEFAULT_CUSTOMERS,
      orders: DEFAULT_ORDERS,
    };
    this.saveLocalData(initial);
    return initial;
  }

  private saveLocalData(data?: DatabaseSchema): void {
    const toSave = data || this.localData;
    try {
      this.ensureDataDir();
      fs.writeFileSync(DB_FILE, JSON.stringify(toSave, null, 2), 'utf-8');
    } catch {
      // Ignore write errors in read-only environment
    }
  }

  private async db() {
    const sql = getSql();
    if (!sql) {
      this.lastError = 'DATABASE_URL belum diset';
      return null;
    }

    if (!this.ready) {
      this.ready = this.setup().then(() => true).catch(err => {
        this.lastError = err.message;
        this.ready = null; // coba lagi di request berikutnya
        console.warn('Neon database setup error:', err.message);
        return false;
      });
    }

    const ok = await this.ready;
    if (!ok) return null;
    this.lastError = null;
    return sql;
  }

  public async status() {
    const sql = await this.db();
    return {
      connected: !!sql,
      hasDatabaseUrl: !!process.env.DATABASE_URL?.trim(),
      error: sql ? null : this.lastError,
    };
  }

  // -------------------------
  // Buat tabel + pindahkan data lama
  // -------------------------
  private async setup(): Promise<void> {
    const sql = getSql();
    if (!sql) return;

    await Promise.all([
      sql`CREATE TABLE IF NOT EXISTS store_settings (
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
      )`,
      sql`CREATE TABLE IF NOT EXISTS products (
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
      )`,
      sql`CREATE TABLE IF NOT EXISTS customers (
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
      )`,
      sql`CREATE TABLE IF NOT EXISTS orders (
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
      )`,
    ]);

    await sql`CREATE TABLE IF NOT EXISTS order_items (
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
    )`;

    // Kolom urutan (tabel hasil Sinkronkan lama tidak punya)
    await Promise.all([
      sql`ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS qris_image_url TEXT`,
      sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS seq BIGSERIAL`,
      sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb`,
      sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS seq BIGSERIAL`,
      sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS seq BIGSERIAL`,
      sql`CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id)`,
    ]);

    const has = await sql`SELECT 1 FROM store_settings WHERE id = 1`;
    if (has.length > 0) return;

    // Pertama kali: pindahkan dari tabel app_* kalau ada, kalau tidak pakai data contoh
    let settings: StoreSettings = DEFAULT_SETTINGS;
    let prods: Product[] = DEFAULT_PRODUCTS;
    let custs: Customer[] = DEFAULT_CUSTOMERS;
    let ords: Order[] = DEFAULT_ORDERS;

    const legacy = await sql`SELECT to_regclass('public.app_settings') AS t`;
    if (legacy[0]?.t) {
      const [s, p, c, o] = await Promise.all([
        sql`SELECT data FROM app_settings WHERE id = 1`,
        sql`SELECT data FROM app_products ORDER BY seq ASC`,
        sql`SELECT data FROM app_customers ORDER BY seq ASC`,
        sql`SELECT data FROM app_orders ORDER BY seq ASC`,
      ]);
      if (s[0]) {
        settings = { ...DEFAULT_SETTINGS, ...(s[0].data as object) } as StoreSettings;
        prods = p.map(x => x.data as Product);
        custs = c.map(x => x.data as Customer);
        ords = o.map(x => x.data as Order);
      }
    }

    await this.saveSettings(settings);
    for (const p of prods) await this.insertProduct(p);
    for (const c of custs) await this.insertCustomer(c);
    for (const o of ords) await this.insertOrder(o);
  }

  // -------------------------
  // Helper tulis data
  // -------------------------
  private async saveSettings(s: StoreSettings): Promise<void> {
    const sql = getSql();
    if (!sql) return;
    await sql`INSERT INTO store_settings
      (id, store_name, tagline, address, phone, receipt_footer, paper_width, tax_percent, enable_tax,
       currency, qris_code_text, qris_image_url, cloudinary_cloud_name, cloudinary_upload_preset, theme, admin_pin)
      VALUES (1, ${s.storeName}, ${s.tagline || ''}, ${s.address || ''}, ${s.phone || ''}, ${s.receiptFooter || ''},
       ${s.paperWidth || '58mm'}, ${s.taxPercent || 0}, ${!!s.enableTax}, ${s.currency || 'IDR'},
       ${s.qrisCodeText || ''}, ${s.qrisImageUrl || ''}, ${s.cloudinaryCloudName || ''}, ${s.cloudinaryUploadPreset || ''},
       ${s.theme || 'light'}, ${s.adminPin || '1234'})
      ON CONFLICT (id) DO UPDATE SET
        store_name = EXCLUDED.store_name,
        tagline = EXCLUDED.tagline,
        address = EXCLUDED.address,
        phone = EXCLUDED.phone,
        receipt_footer = EXCLUDED.receipt_footer,
        paper_width = EXCLUDED.paper_width,
        tax_percent = EXCLUDED.tax_percent,
        enable_tax = EXCLUDED.enable_tax,
        currency = EXCLUDED.currency,
        qris_code_text = EXCLUDED.qris_code_text,
        qris_image_url = EXCLUDED.qris_image_url,
        cloudinary_cloud_name = EXCLUDED.cloudinary_cloud_name,
        cloudinary_upload_preset = EXCLUDED.cloudinary_upload_preset,
        theme = EXCLUDED.theme,
        admin_pin = EXCLUDED.admin_pin`;
  }

  private async insertProduct(p: Product): Promise<void> {
    const sql = getSql();
    if (!sql) return;
    const imgs = imagesOf(p);
    await sql`INSERT INTO products (id, name, category, price, cost_price, stock, unit, image_url, images, sku, description, is_active)
      VALUES (${p.id}, ${p.name}, ${p.category}, ${p.price}, ${p.costPrice || 0}, ${p.stock}, ${p.unit || 'pcs'},
       ${imgs[0] ?? null}, ${JSON.stringify(imgs)}::jsonb, ${p.sku ?? null}, ${p.description ?? null}, ${p.isActive !== false})
      ON CONFLICT (id) DO NOTHING`;
  }

  private async saveProduct(p: Product): Promise<void> {
    const sql = getSql();
    if (!sql) return;
    const imgs = imagesOf(p);
    await sql`UPDATE products SET
      name = ${p.name}, category = ${p.category}, price = ${p.price}, cost_price = ${p.costPrice || 0},
      stock = ${p.stock}, unit = ${p.unit || 'pcs'}, image_url = ${imgs[0] ?? null},
      images = ${JSON.stringify(imgs)}::jsonb, sku = ${p.sku ?? null},
      description = ${p.description ?? null}, is_active = ${p.isActive !== false}
      WHERE id = ${p.id}`;
  }

  private async insertCustomer(c: Customer): Promise<void> {
    const sql = getSql();
    if (!sql) return;
    await sql`INSERT INTO customers (id, name, phone, email, address, total_spent, orders_count, first_visit, last_visit, notes)
      VALUES (${c.id}, ${c.name}, ${c.phone || ''}, ${c.email ?? null}, ${c.address ?? null},
       ${c.totalSpent || 0}, ${c.ordersCount || 0}, ${c.firstVisit}, ${c.lastVisit}, ${c.notes ?? null})
      ON CONFLICT (id) DO NOTHING`;
  }

  private async saveCustomer(c: Customer): Promise<void> {
    const sql = getSql();
    if (!sql) return;
    await sql`UPDATE customers SET
      name = ${c.name}, phone = ${c.phone || ''}, email = ${c.email ?? null}, address = ${c.address ?? null},
      total_spent = ${c.totalSpent || 0}, orders_count = ${c.ordersCount || 0},
      first_visit = ${c.firstVisit}, last_visit = ${c.lastVisit}, notes = ${c.notes ?? null}
      WHERE id = ${c.id}`;
  }

  private async insertItem(orderId: string, it: any, position: number): Promise<void> {
    const sql = getSql();
    if (!sql) return;
    await sql`INSERT INTO order_items
      (order_id, position, product_id, product_name, price, cost_price, quantity, length, width, area, subtotal, note)
      VALUES (${orderId}, ${position}, ${it.productId ?? null}, ${it.productName}, ${it.price},
       ${it.costPrice ?? null}, ${it.quantity}, ${it.length ?? null}, ${it.width ?? null},
       ${it.area ?? null}, ${it.subtotal}, ${it.note ?? null})`;
  }

  // Simpan order + itemnya. Mengembalikan false kalau order sudah ada.
  private async insertOrder(o: Order): Promise<boolean> {
    const sql = getSql();
    if (!sql) return false;
    const r = await sql`INSERT INTO orders
      (id, invoice_number, customer_id, customer_name, customer_phone, subtotal, discount, tax, total,
       payment_method, payment_status, cash_given, cash_change, notes, created_at)
      VALUES (${o.id}, ${o.invoiceNumber}, ${o.customerId ?? null}, ${o.customerName}, ${o.customerPhone ?? null},
       ${o.subtotal}, ${o.discount || 0}, ${o.tax || 0}, ${o.total}, ${o.paymentMethod},
       ${o.paymentStatus || 'lunas'}, ${o.cashGiven ?? null}, ${o.cashChange ?? null}, ${o.notes ?? null},
       ${o.createdAt})
      ON CONFLICT (id) DO NOTHING RETURNING id`;
    if (r.length === 0) return false;
    await Promise.all(o.items.map((it, i) => this.insertItem(o.id, it, i)));
    return true;
  }

  // -------------------------
  // Products
  // -------------------------
  public async getProducts(): Promise<Product[]> {
    try {
      const sql = await this.db();
      if (sql) {
        const r = await sql`SELECT * FROM products ORDER BY seq ASC`;
        return r.map(toProduct);
      }
    } catch (e: any) {
      console.warn('Neon getProducts error, using local fallback:', e.message);
    }
    return [...this.localData.products];
  }

  public async getProductById(id: string): Promise<Product | undefined> {
    try {
      const sql = await this.db();
      if (sql) {
        const r = await sql`SELECT * FROM products WHERE id = ${id}`;
        if (r[0]) return toProduct(r[0]);
      }
    } catch (e: any) {
      console.warn('Neon getProductById error, using local fallback:', e.message);
    }
    return this.localData.products.find(p => p.id === id);
  }

  public async createProduct(product: Omit<Product, 'id'> & { id?: string }): Promise<Product> {
    const newProduct: Product = {
      ...product,
      id: product.id || `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      isActive: product.isActive !== undefined ? product.isActive : true,
    };
    this.localData.products.push(newProduct);
    this.saveLocalData();

    try {
      const sql = await this.db();
      if (sql) {
        await this.insertProduct(newProduct);
      }
    } catch (e: any) {
      console.warn('Neon createProduct error:', e.message);
    }
    return newProduct;
  }

  public async updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
    const idx = this.localData.products.findIndex(p => p.id === id);
    let updatedProduct: Product | null = null;
    if (idx !== -1) {
      this.localData.products[idx] = { ...this.localData.products[idx], ...updates, id };
      updatedProduct = this.localData.products[idx];
      this.saveLocalData();
    }

    try {
      const sql = await this.db();
      if (sql) {
        const current = await this.getProductById(id);
        if (current) {
          const next = { ...current, ...updates, id };
          await this.saveProduct(next);
          return next;
        }
      }
    } catch (e: any) {
      console.warn('Neon updateProduct error:', e.message);
    }
    return updatedProduct;
  }

  public async deleteProduct(id: string): Promise<boolean> {
    const prevLen = this.localData.products.length;
    this.localData.products = this.localData.products.filter(p => p.id !== id);
    if (this.localData.products.length !== prevLen) {
      this.saveLocalData();
    }

    try {
      const sql = await this.db();
      if (sql) {
        const r = await sql`DELETE FROM products WHERE id = ${id} RETURNING id`;
        return r.length > 0;
      }
    } catch (e: any) {
      console.warn('Neon deleteProduct error:', e.message);
    }
    return this.localData.products.length !== prevLen;
  }

  // -------------------------
  // Customers (Automatic CRM)
  // -------------------------
  public async getCustomers(): Promise<Customer[]> {
    try {
      const sql = await this.db();
      if (sql) {
        const r = await sql`SELECT * FROM customers ORDER BY seq DESC`;
        return r.map(toCustomer);
      }
    } catch (e: any) {
      console.warn('Neon getCustomers error, using local fallback:', e.message);
    }
    return [...this.localData.customers];
  }

  public async getCustomerById(id: string): Promise<Customer | undefined> {
    try {
      const sql = await this.db();
      if (sql) {
        const r = await sql`SELECT * FROM customers WHERE id = ${id}`;
        if (r[0]) return toCustomer(r[0]);
      }
    } catch (e: any) {
      console.warn('Neon getCustomerById error, using local fallback:', e.message);
    }
    return this.localData.customers.find(c => c.id === id);
  }

  public async createCustomer(cust: Omit<Customer, 'id'> & { id?: string }): Promise<Customer> {
    const newCust: Customer = {
      ...cust,
      id: cust.id || `cust-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      firstVisit: cust.firstVisit || new Date().toISOString(),
      lastVisit: cust.lastVisit || new Date().toISOString(),
      totalSpent: cust.totalSpent || 0,
      ordersCount: cust.ordersCount || 0,
    };
    this.localData.customers.unshift(newCust);
    this.saveLocalData();

    try {
      const sql = await this.db();
      if (sql) {
        await this.insertCustomer(newCust);
      }
    } catch (e: any) {
      console.warn('Neon createCustomer error:', e.message);
    }
    return newCust;
  }

  public async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | null> {
    const idx = this.localData.customers.findIndex(c => c.id === id);
    let updatedCust: Customer | null = null;
    if (idx !== -1) {
      this.localData.customers[idx] = { ...this.localData.customers[idx], ...updates, id };
      updatedCust = this.localData.customers[idx];
      this.saveLocalData();
    }

    try {
      const sql = await this.db();
      if (sql) {
        const current = await this.getCustomerById(id);
        if (current) {
          const next = { ...current, ...updates, id };
          await this.saveCustomer(next);
          return next;
        }
      }
    } catch (e: any) {
      console.warn('Neon updateCustomer error:', e.message);
    }
    return updatedCust;
  }

  public async recordCustomerFromOrder(name: string, phone: string, total: number): Promise<Customer> {
    const cleanPhone = phone.replace(/[^0-9+]/g, '').trim();
    const cleanName = name.trim() || 'Pelanggan Umum';
    const nowIso = new Date().toISOString();

    let existingLocal = this.localData.customers.find(c => {
      const cp = (c.phone || '').replace(/[^0-9+]/g, '').trim();
      if (cleanPhone && cp && cp === cleanPhone) return true;
      if (cleanName !== 'Pelanggan Umum' && c.name.toLowerCase() === cleanName.toLowerCase()) return true;
      return false;
    });

    if (existingLocal) {
      existingLocal.totalSpent += total;
      existingLocal.ordersCount += 1;
      existingLocal.lastVisit = nowIso;
      if (cleanName !== 'Pelanggan Umum' && (!existingLocal.name || existingLocal.name === 'Pelanggan Umum')) {
        existingLocal.name = cleanName;
      }
      if (cleanPhone && !existingLocal.phone) existingLocal.phone = cleanPhone;
      this.saveLocalData();
    } else {
      existingLocal = {
        id: `cust-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: cleanName,
        phone: cleanPhone || '',
        totalSpent: total,
        ordersCount: 1,
        firstVisit: nowIso,
        lastVisit: nowIso,
        notes: 'Pencatatan otomatis dari pesanan kasir',
      };
      this.localData.customers.unshift(existingLocal);
      this.saveLocalData();
    }

    try {
      const sql = await this.db();
      if (sql) {
        let found: any;
        if (cleanPhone) {
          const r = await sql`SELECT * FROM customers
            WHERE regexp_replace(COALESCE(phone, ''), '[^0-9+]', '', 'g') = ${cleanPhone}
            ORDER BY seq ASC LIMIT 1`;
          found = r[0];
        }
        if (!found && cleanName !== 'Pelanggan Umum') {
          const r = await sql`SELECT * FROM customers WHERE LOWER(name) = LOWER(${cleanName}) ORDER BY seq ASC LIMIT 1`;
          found = r[0];
        }

        if (found) {
          const existing = toCustomer(found);
          existing.totalSpent += total;
          existing.ordersCount += 1;
          existing.lastVisit = nowIso;
          if (cleanName !== 'Pelanggan Umum' && (!existing.name || existing.name === 'Pelanggan Umum')) {
            existing.name = cleanName;
          }
          if (cleanPhone && !existing.phone) existing.phone = cleanPhone;
          await this.saveCustomer(existing);
          return existing;
        } else {
          await this.insertCustomer(existingLocal);
        }
      }
    } catch (e: any) {
      console.warn('Neon recordCustomerFromOrder error:', e.message);
    }

    return existingLocal;
  }

  // -------------------------
  // Orders
  // -------------------------
  public async getOrders(): Promise<Order[]> {
    try {
      const sql = await this.db();
      if (sql) {
        const orders = await sql`SELECT * FROM orders ORDER BY seq DESC`;
        const items = await sql`SELECT * FROM order_items ORDER BY position ASC, id ASC`;
        const byOrder = new Map<string, any[]>();
        for (const it of items) {
          const list = byOrder.get(it.order_id) || [];
          list.push(it);
          byOrder.set(it.order_id, list);
        }
        return orders.map((o: any) => toOrder(o, byOrder.get(o.id) || []));
      }
    } catch (e: any) {
      console.warn('Neon getOrders error, using local fallback:', e.message);
    }
    return [...this.localData.orders];
  }

  public async getOrderById(id: string): Promise<Order | undefined> {
    try {
      const sql = await this.db();
      if (sql) {
        const o = await sql`SELECT * FROM orders WHERE id = ${id}`;
        if (o[0]) {
          const items = await sql`SELECT * FROM order_items WHERE order_id = ${id} ORDER BY position ASC, id ASC`;
          return toOrder(o[0], items);
        }
      }
    } catch (e: any) {
      console.warn('Neon getOrderById error, using local fallback:', e.message);
    }
    return this.localData.orders.find(o => o.id === id);
  }

  public async createOrder(orderInput: Order): Promise<{ order: Order; customer: Customer }> {
    // 1. Catat customer otomatis
    const customer = await this.recordCustomerFromOrder(
      orderInput.customerName,
      orderInput.customerPhone || '',
      orderInput.total
    );

    // 2. Potong stok lokal
    for (const item of orderInput.items) {
      const prod = this.localData.products.find(p => p.id === item.productId);
      if (prod) {
        prod.stock = Math.max(0, prod.stock - item.quantity);
      }
    }

    // 3. Simpan order lokal
    const finalizedOrder: Order = {
      ...orderInput,
      customerId: customer.id,
      createdAt: orderInput.createdAt || new Date().toISOString(),
    };
    this.localData.orders.unshift(finalizedOrder);
    this.saveLocalData();

    // 4. Update Neon jika aktif
    try {
      const sql = await this.db();
      if (sql) {
        await Promise.all(
          orderInput.items.map(item =>
            sql`UPDATE products SET stock = GREATEST(0, stock - ${item.quantity}) WHERE id = ${item.productId}`
          )
        );
        await this.insertOrder(finalizedOrder);
      }
    } catch (e: any) {
      console.warn('Neon createOrder error:', e.message);
    }

    return { order: finalizedOrder, customer };
  }

  public async updateOrder(
    id: string,
    updates: Partial<
      Pick<Order, 'customerName' | 'customerPhone' | 'paymentMethod' | 'items' | 'discount' | 'tax' | 'notes'>
    >
  ): Promise<Order | null> {
    const current = this.localData.orders.find(o => o.id === id);
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

      // Kembalikan stok lama & kurangi stok baru
      for (const it of current.items) {
        const prod = this.localData.products.find(p => p.id === it.productId);
        if (prod) prod.stock += it.quantity;
      }
      for (const it of updates.items) {
        const prod = this.localData.products.find(p => p.id === it.productId);
        if (prod) prod.stock = Math.max(0, prod.stock - it.quantity);
      }

      next.items = updates.items.map(it => ({
        ...it,
        subtotal:
          (Number(it.price) || 0) *
          (Number(it.quantity) || 0) *
          (it.area ? Number(it.area) : 1),
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
    if (diff !== 0 && current.customerId) {
      const cust = this.localData.customers.find(c => c.id === current.customerId);
      if (cust) {
        cust.totalSpent = Math.max(0, cust.totalSpent + diff);
      }
    }

    const oIdx = this.localData.orders.findIndex(o => o.id === id);
    if (oIdx !== -1) {
      this.localData.orders[oIdx] = next;
    }
    this.saveLocalData();

    try {
      const sql = await this.db();
      if (sql) {
        if (updates.items !== undefined) {
          const delta = new Map<string, number>();
          for (const it of current.items) {
            delta.set(it.productId, (delta.get(it.productId) || 0) + it.quantity);
          }
          for (const it of updates.items) {
            delta.set(it.productId, (delta.get(it.productId) || 0) - it.quantity);
          }
          await Promise.all(
            [...delta.entries()]
              .filter(([, d]) => d !== 0)
              .map(([productId, d]) =>
                sql`UPDATE products SET stock = GREATEST(0, stock + ${d}) WHERE id = ${productId}`
              )
          );
          await sql`DELETE FROM order_items WHERE order_id = ${id}`;
          await Promise.all(next.items.map((it, i) => this.insertItem(id, it, i)));
        }

        if (diff !== 0 && current.customerId) {
          await sql`UPDATE customers SET total_spent = GREATEST(0, total_spent + ${diff}) WHERE id = ${current.customerId}`;
        }

        await sql`UPDATE orders SET
          customer_name = ${next.customerName}, customer_phone = ${next.customerPhone ?? null},
          subtotal = ${next.subtotal}, discount = ${next.discount || 0}, tax = ${next.tax || 0},
          total = ${next.total}, payment_method = ${next.paymentMethod},
          cash_change = ${next.cashChange ?? null}, notes = ${next.notes ?? null}
          WHERE id = ${id}`;
      }
    } catch (e: any) {
      console.warn('Neon updateOrder error:', e.message);
    }

    return next;
  }

  public async deleteOrder(id: string): Promise<boolean> {
    const prevLen = this.localData.orders.length;
    this.localData.orders = this.localData.orders.filter(o => o.id !== id);
    if (this.localData.orders.length !== prevLen) {
      this.saveLocalData();
    }

    try {
      const sql = await this.db();
      if (sql) {
        const r = await sql`DELETE FROM orders WHERE id = ${id} RETURNING id`;
        return r.length > 0;
      }
    } catch (e: any) {
      console.warn('Neon deleteOrder error:', e.message);
    }
    return this.localData.orders.length !== prevLen;
  }

  // -------------------------
  // Settings
  // -------------------------
  public async getSettings(): Promise<StoreSettings> {
    try {
      const sql = await this.db();
      if (sql) {
        const r = await sql`SELECT * FROM store_settings WHERE id = 1`;
        if (r[0]) return toSettings(r[0]);
      }
    } catch (e: any) {
      console.warn('Neon getSettings error, using local fallback:', e.message);
    }
    return { ...this.localData.settings, neonDatabaseUrl: '' };
  }

  public async updateSettings(settings: Partial<StoreSettings>): Promise<StoreSettings> {
    const { neonDatabaseUrl, ...safe } = settings;
    const current = { ...this.localData.settings };
    const next: StoreSettings = { ...current, ...safe, neonDatabaseUrl: '' };
    this.localData.settings = next;
    this.saveLocalData();

    try {
      const sql = await this.db();
      if (sql) {
        await this.saveSettings(next);
      }
    } catch (e: any) {
      console.warn('Neon updateSettings error:', e.message);
    }
    return next;
  }
  // -------------------------
  // Neon PostgreSQL Integration
  // -------------------------
  public async testNeonConnection(connectionString: string): Promise<{ success: boolean; message: string; timestamp?: string }> {
    try {
      if (!connectionString.trim()) {
        return { success: false, message: 'Connection string Neon tidak boleh kosong.' };
      }
      const sql = neon(connectionString);
      const rows = await sql`SELECT NOW() as current_time, version() as pg_version;`;
      return {
        success: true,
        message: 'Koneksi ke Neon PostgreSQL Berhasil!',
        timestamp: rows[0]?.current_time?.toString(),
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Gagal tersambung ke Neon PostgreSQL. Periksa URL koneksi Anda.',
      };
    }
  }

  public async syncToNeon(connectionString: string): Promise<{ success: boolean; message: string; rowsAffected?: number }> {
    try {
      const sql = neon(connectionString);
      const allProducts = await this.getProducts();
      const allCustomers = await this.getCustomers();

      // Create tables in Neon
      await sql`
        CREATE TABLE IF NOT EXISTS products (
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
        );
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS customers (
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
        );
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS orders (
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
        );
      `;

      // Upsert products to Neon
      for (const p of allProducts) {
        await sql`
          INSERT INTO products (id, name, category, price, cost_price, stock, unit, sku, description, is_active)
          VALUES (${p.id}, ${p.name}, ${p.category}, ${p.price}, ${p.costPrice || 0}, ${p.stock}, ${p.unit}, ${p.sku || ''}, ${p.description || ''}, ${p.isActive})
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            price = EXCLUDED.price,
            stock = EXCLUDED.stock;
        `;
      }

      // Upsert customers to Neon
      for (const c of allCustomers) {
        await sql`
          INSERT INTO customers (id, name, phone, email, address, total_spent, orders_count, notes)
          VALUES (${c.id}, ${c.name}, ${c.phone || ''}, ${c.email || ''}, ${c.address || ''}, ${c.totalSpent}, ${c.ordersCount}, ${c.notes || ''})
          ON CONFLICT (id) DO UPDATE SET
            total_spent = EXCLUDED.total_spent,
            orders_count = EXCLUDED.orders_count;
        `;
      }

      return {
        success: true,
        message: 'Seluruh data produk dan customer berhasil disinkronkan ke Neon PostgreSQL!',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Gagal sinkronisasi data ke Neon PostgreSQL.',
      };
    }
  }

  public async importBackup(backupData: {
    store?: Partial<StoreSettings>;
    products?: Product[];
    customers?: Customer[];
    orders?: Order[];
  }): Promise<{ success: boolean; message: string; counts: { products: number; customers: number; orders: number } }> {
    if (backupData.store) {
      await this.updateSettings(backupData.store);
    }

    if (Array.isArray(backupData.products)) {
      this.localData.products = backupData.products;
    }
    if (Array.isArray(backupData.customers)) {
      this.localData.customers = backupData.customers;
    }
    if (Array.isArray(backupData.orders)) {
      this.localData.orders = backupData.orders;
    }
    this.saveLocalData();

    try {
      const sql = await this.db();
      if (sql) {
        if (Array.isArray(backupData.products) && backupData.products.length > 0) {
          for (const p of backupData.products) {
            await sql`INSERT INTO products (id, name, category, price, cost_price, stock, unit, image_url, images, sku, description, is_active)
              VALUES (${p.id}, ${p.name}, ${p.category}, ${p.price}, ${p.costPrice || 0}, ${p.stock}, ${p.unit || 'pcs'},
               ${p.imageUrl ?? null}, ${JSON.stringify(imagesOf(p))}::jsonb, ${p.sku ?? null}, ${p.description ?? null}, ${p.isActive !== false})
              ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name, category = EXCLUDED.category, price = EXCLUDED.price,
                cost_price = EXCLUDED.cost_price, stock = EXCLUDED.stock, unit = EXCLUDED.unit,
                image_url = EXCLUDED.image_url, images = EXCLUDED.images, sku = EXCLUDED.sku,
                description = EXCLUDED.description, is_active = EXCLUDED.is_active`;
          }
        }
        if (Array.isArray(backupData.customers) && backupData.customers.length > 0) {
          for (const c of backupData.customers) {
            await this.saveCustomer(c);
          }
        }
        if (Array.isArray(backupData.orders) && backupData.orders.length > 0) {
          for (const o of backupData.orders) {
            await this.insertOrder(o);
          }
        }
      }
    } catch (e: any) {
      console.warn('Neon importBackup error:', e.message);
    }

    return {
      success: true,
      message: 'Database berhasil dipulihkan dari file cadangan!',
      counts: {
        products: this.localData.products.length,
        customers: this.localData.customers.length,
        orders: this.localData.orders.length,
      },
    };
  }
}

export const serverDb = new ServerDatabase();
