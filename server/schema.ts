**File: `server/db/schema.ts`**

```ts
import {
  pgTable,
  varchar,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
  serial,
} from "drizzle-orm/pg-core";

// PRODUK
export const products = pgTable("products", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  price: numeric("price", {
    precision: 12,
    scale: 2,
    mode: "number",
  }).notNull(),
  costPrice: numeric("cost_price", {
    precision: 12,
    scale: 2,
    mode: "number",
  }).default(0),
  stock: integer("stock").notNull().default(0),
  unit: varchar("unit", { length: 30 }).default("pcs"),
  imageUrl: text("image_url"),
  images: jsonb("images").$type<string[]>().default([]),
  sku: varchar("sku", { length: 100 }),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", {
    withTimezone: true,
  }).defaultNow(),
});

// PELANGGAN
export const customers = pgTable("customers", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  totalSpent: numeric("total_spent", {
    precision: 14,
    scale: 2,
    mode: "number",
  }).default(0),
  ordersCount: integer("orders_count").default(0),
  firstVisit: timestamp("first_visit", {
    withTimezone: true,
  }).defaultNow(),
  lastVisit: timestamp("last_visit", {
    withTimezone: true,
  }).defaultNow(),
  notes: text("notes"),
});

// PESANAN / INVOICE
export const orders = pgTable("orders", {
  id: varchar("id", { length: 64 }).primaryKey(),
  invoiceNumber: varchar("invoice_number", {
    length: 100,
  }).notNull().unique(),
  customerId: varchar("customer_id").references(
    () => customers.id,
    { onDelete: "set null" }
  ),
  customerName: varchar("customer_name", {
    length: 255,
  }).notNull(),
  customerPhone: varchar("customer_phone", {
    length: 50,
  }),
  subtotal: numeric("subtotal", {
    precision: 12,
    scale: 2,
    mode: "number",
  }).notNull(),
  discount: numeric("discount", {
    precision: 12,
    scale: 2,
    mode: "number",
  }).notNull().default(0),
  tax: numeric("tax", {
    precision: 12,
    scale: 2,
    mode: "number",
  }).notNull().default(0),
  total: numeric("total", {
    precision: 12,
    scale: 2,
    mode: "number",
  }).notNull(),
  paymentMethod: varchar("payment_method", {
    length: 50,
  }).notNull(),
  paymentStatus: varchar("payment_status", {
    length: 50,
  }).notNull().default("lunas"),
  cashGiven: numeric("cash_given", {
    precision: 12,
    scale: 2,
    mode: "number",
  }),
  cashChange: numeric("cash_change", {
    precision: 12,
    scale: 2,
    mode: "number",
  }),
  notes: text("notes"),
  createdAt: timestamp("created_at", {
    withTimezone: true,
  }).defaultNow(),
});

// DETAIL ITEM PESANAN
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: varchar("order_id", { length: 64 })
    .notNull()
    .references(() => orders.id, {
      onDelete: "cascade",
    }),
  productId: varchar("product_id", { length: 64 }),
  productName: varchar("product_name", {
    length: 255,
  }).notNull(),
  price: numeric("price", {
    precision: 12,
    scale: 2,
    mode: "number",
  }).notNull(),
  costPrice: numeric("cost_price", {
    precision: 12,
    scale: 2,
    mode: "number",
  }).default(0),
  quantity: integer("quantity").notNull(),
  subtotal: numeric("subtotal", {
    precision: 12,
    scale: 2,
    mode: "number",
  }).notNull(),
  note: text("note"),
  length: numeric("length", {
    precision: 12,
    scale: 3,
    mode: "number",
  }),
  width: numeric("width", {
    precision: 12,
    scale: 3,
    mode: "number",
  }),
  area: numeric("area", {
    precision: 14,
    scale: 4,
    mode: "number",
  }),
  dimensionUnit: varchar("dimension_unit", {
    length: 10,
  }),
});

// PENGATURAN TOKO
export const storeSettings = pgTable("store_settings", {
  id: integer("id").primaryKey().default(1),
  storeName: varchar("store_name", {
    length: 255,
  }).notNull(),
  tagline: text("tagline").notNull().default(""),
  address: text("address").notNull().default(""),
  phone: varchar("phone", { length: 50 }).notNull().default(""),
  receiptFooter: text("receipt_footer").notNull().default(""),
  paperWidth: varchar("paper_width", {
    length: 10,
  }).notNull().default("58mm"),
  taxPercent: numeric("tax_percent", {
    precision: 5,
    scale: 2,
    mode: "number",
  }).notNull().default(0),
  enableTax: boolean("enable_tax").notNull().default(false),
  currency: varchar("currency", {
    length: 10,
  }).notNull().default("IDR"),
  qrisCodeText: text("qris_code_text"),
  qrisImageUrl: text("qris_image_url"),
  cloudinaryCloudName: varchar("cloudinary_cloud_name", {
    length: 255,
  }),
  cloudinaryUploadPreset: varchar("cloudinary_upload_preset", {
    length: 255,
  }),
  theme: varchar("theme", { length: 20 }).default("light"),
  adminPin: varchar("admin_pin", { length: 255 }),
});
```
