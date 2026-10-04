import {
  pgTable, varchar, text, numeric, integer, boolean, timestamp, bigserial, jsonb,
} from 'drizzle-orm/pg-core';

// Struktur ini SAMA PERSIS dengan tabel yang sudah ada di Neon kamu.

export const storeSettings = pgTable('store_settings', {
  id: integer('id').primaryKey(),
  storeName: varchar('store_name', { length: 255 }).notNull(),
  tagline: varchar('tagline', { length: 255 }),
  address: text('address'),
  phone: varchar('phone', { length: 50 }),
  receiptFooter: text('receipt_footer'),
  paperWidth: varchar('paper_width', { length: 10 }).default('58mm'),
  taxPercent: numeric('tax_percent', { precision: 5, scale: 2 }).default('0'),
  enableTax: boolean('enable_tax').default(false),
  currency: varchar('currency', { length: 10 }).default('IDR'),
  qrisCodeText: text('qris_code_text'),
  qrisImageUrl: text('qris_image_url'),
  cloudinaryCloudName: varchar('cloudinary_cloud_name', { length: 255 }),
  cloudinaryUploadPreset: varchar('cloudinary_upload_preset', { length: 255 }),
  theme: varchar('theme', { length: 10 }).default('light'),
  adminPin: varchar('admin_pin', { length: 20 }).default('1234'),
});

export const products = pgTable('products', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  price: numeric('price', { precision: 12, scale: 2 }).notNull(),
  costPrice: numeric('cost_price', { precision: 12, scale: 2 }).default('0'),
  stock: integer('stock').notNull().default(0),
  unit: varchar('unit', { length: 30 }).default('pcs'),
  imageUrl: text('image_url'),
  sku: varchar('sku', { length: 100 }),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  seq: bigserial('seq', { mode: 'number' }),
  images: jsonb('images').$type<string[]>().default([]),
});

export const customers = pgTable('customers', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  address: text('address'),
  totalSpent: numeric('total_spent', { precision: 14, scale: 2 }).default('0'),
  ordersCount: integer('orders_count').default(0),
  firstVisit: timestamp('first_visit', { withTimezone: true }).defaultNow(),
  lastVisit: timestamp('last_visit', { withTimezone: true }).defaultNow(),
  notes: text('notes'),
  seq: bigserial('seq', { mode: 'number' }),
});

export const orders = pgTable('orders', {
  id: varchar('id', { length: 64 }).primaryKey(),
  invoiceNumber: varchar('invoice_number', { length: 100 }).notNull().unique(),
  customerId: varchar('customer_id', { length: 64 }),
  customerName: varchar('customer_name', { length: 255 }).notNull(),
  customerPhone: varchar('customer_phone', { length: 50 }),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
  discount: numeric('discount', { precision: 12, scale: 2 }).default('0'),
  tax: numeric('tax', { precision: 12, scale: 2 }).default('0'),
  total: numeric('total', { precision: 12, scale: 2 }).notNull(),
  paymentMethod: varchar('payment_method', { length: 50 }).notNull(),
  paymentStatus: varchar('payment_status', { length: 50 }).default('lunas'),
  cashGiven: numeric('cash_given', { precision: 12, scale: 2 }),
  cashChange: numeric('cash_change', { precision: 12, scale: 2 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  seq: bigserial('seq', { mode: 'number' }),
});

export const orderItems = pgTable('order_items', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  orderId: varchar('order_id', { length: 64 })
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  position: integer('position').notNull().default(0),
  productId: varchar('product_id', { length: 64 }),
  productName: varchar('product_name', { length: 255 }).notNull(),
  price: numeric('price', { precision: 12, scale: 2 }).notNull(),
  costPrice: numeric('cost_price', { precision: 12, scale: 2 }),
  quantity: numeric('quantity', { precision: 12, scale: 2 }).notNull(),
  length: numeric('length', { precision: 12, scale: 3 }),
  width: numeric('width', { precision: 12, scale: 3 }),
  area: numeric('area', { precision: 12, scale: 3 }),
  subtotal: numeric('subtotal', { precision: 14, scale: 2 }).notNull(),
  note: text('note'),
});