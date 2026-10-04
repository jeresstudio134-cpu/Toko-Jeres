import { Product, Customer, Order, StoreSettings } from '../types';

const API_BASE = '/api';

export const ApiService = {
  // Products
  async getProducts(): Promise<Product[]> {
    const res = await fetch(`${API_BASE}/products`);
    if (!res.ok) throw new Error('Failed to fetch products');
    return res.json();
  },

  async createProduct(product: Omit<Product, 'id'> & { id?: string }): Promise<Product> {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    if (!res.ok) throw new Error('Failed to create product');
    return res.json();
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update product');
    return res.json();
  },

  async deleteProduct(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete product');
    const data = await res.json();
    return data.success;
  },

  // Customers
  async getCustomers(): Promise<Customer[]> {
    const res = await fetch(`${API_BASE}/customers`);
    if (!res.ok) throw new Error('Failed to fetch customers');
    return res.json();
  },

  async createCustomer(cust: Omit<Customer, 'id'> & { id?: string }): Promise<Customer> {
    const res = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cust),
    });
    if (!res.ok) throw new Error('Failed to create customer');
    return res.json();
  },

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
    const res = await fetch(`${API_BASE}/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update customer');
    return res.json();
  },

  async deleteCustomer(id: string, adminPin: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/customers/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-pin': adminPin },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Gagal menghapus customer');
    }
    const data = await res.json();
    return data.success;
  },

  // Orders & Auto Customer Recording
  async getOrders(): Promise<Order[]> {
    const res = await fetch(`${API_BASE}/orders`);
    if (!res.ok) throw new Error('Failed to fetch orders');
    return res.json();
  },

  async createOrder(order: Order): Promise<{ order: Order; customer: Customer }> {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    if (!res.ok) throw new Error('Failed to create order');
    return res.json();
  },

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update order');
    return res.json();
  },

  async deleteOrder(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/orders/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete order');
    const data = await res.json();
    return data.success;
  },

  // Store Settings
  async getSettings(): Promise<StoreSettings> {    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async updateSettings(settings: Partial<StoreSettings>): Promise<StoreSettings> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },

  // Neon PostgreSQL Live Operations
  async testNeonConnection(url: string): Promise<{ success: boolean; message: string; timestamp?: string }> {
    const res = await fetch(`${API_BASE}/neon/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    return res.json();
  },

  async syncToNeon(url: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/neon/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    return res.json();
  },

  generateNeonPostgresSql(products: Product[], customers: Customer[]): string {
    return `-- =========================================================
-- NEON POSTGRESQL SCHEMA & SEED SCRIPT
-- Generated from KiosMinimalis Server Database
-- https://console.neon.tech
-- =========================================================

-- 1. Tabel Produk / Menu
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

-- 2. Tabel Customer (Pencatatan Otomatis)
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

-- 3. Tabel Pesanan (Orders)
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(64) PRIMARY KEY,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE SET NULL,
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

-- 4. SEED DARI DATABASE SAAT INI
-- Customers:
${customers.map(c => `INSERT INTO customers (id, name, phone, email, address, total_spent, orders_count, notes)
VALUES ('${c.id}', '${c.name.replace(/'/g, "''")}', '${c.phone || ''}', '${c.email || ''}', '${(c.address || '').replace(/'/g, "''")}', ${c.totalSpent}, ${c.ordersCount}, '${(c.notes || '').replace(/'/g, "''")}')
ON CONFLICT (id) DO UPDATE SET total_spent = EXCLUDED.total_spent, orders_count = EXCLUDED.orders_count;`).join('\n')}

-- Products:
${products.map(p => `INSERT INTO products (id, name, category, price, cost_price, stock, unit, sku, description, is_active)
VALUES ('${p.id}', '${p.name.replace(/'/g, "''")}', '${p.category}', ${p.price}, ${p.costPrice || 0}, ${p.stock}, '${p.unit}', '${p.sku || ''}', '${(p.description || '').replace(/'/g, "''")}', ${p.isActive})
ON CONFLICT (id) DO NOTHING;`).join('\n')}
`;
  },

  async importBackup(data: any): Promise<{ success: boolean; message: string; counts: { products: number; customers: number; orders: number } }> {
    const res = await fetch(`${API_BASE}/backup/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Gagal memulihkan database dari file cadangan.');
    }
    return res.json();
  },
};
