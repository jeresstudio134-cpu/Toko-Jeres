import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import crypto from 'crypto';
import cors from 'cors';

import { serverDb } from './server/db.ts';

const app = express();

const PORT = process.env.PORT
  ? parseInt(process.env.PORT, 10)
  : 3000;

// ======================================================
// MIDDLEWARE
// ======================================================

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// ======================================================
// HELPER
// ======================================================

type Handler = (
  req: express.Request,
  res: express.Response
) => Promise<any>;

const wrap =
  (fn: Handler): express.RequestHandler =>
  async (req, res, next) => {
    try {
      await fn(req, res);
    } catch (error: any) {
      next(error);
    }
  };

// ======================================================
// CLOUDINARY
// ======================================================

function parseCloudinaryUrl(rawUrl?: string) {
  if (!rawUrl) return null;

  let clean = rawUrl.trim().replace(/^['"]|['"]$/g, '');

  clean = clean.replace(
    /^CLOUDINARY_URL\s*=\s*/i,
    ''
  );

  const match = clean.match(
    /^cloudinary:\/\/([^:]+):([^@]+)@([^/\s?]+)/
  );

  if (!match) return null;

  return {
    apiKey: match[1].replace(/[<>]/g, '').trim(),
    apiSecret: match[2].replace(/[<>]/g, '').trim(),
    cloudName: match[3].replace(/[<>]/g, '').trim(),
  };
}

// ======================================================
// HEALTH CHECK & PING
// ======================================================

app.get('/api/health', async (_req, res) => {
  const s = await serverDb.status();
  res.status(s.connected ? 200 : 503).json({
    status: s.connected ? 'ok' : 'neon-not-connected',
    ...s,
    timestamp: new Date().toISOString(),
  });
});

app.get(
  '/api/ping',
  wrap(async (_req, res) => {
    await serverDb.ping();
    res.json({ ok: true });
  })
);

// Cache status database selama 60 detik untuk mencegah overhead di setiap request
let lastDbCheckSuccessTime = 0;
const DB_CHECK_CACHE_MS = 60 * 1000;

// Di Vercel: kalau Neon tidak terhubung, tampilkan error, jangan pakai data lokal
app.use('/api', async (req, res, next) => {
  if (req.path === '/health' || req.path === '/ping' || !process.env.VERCEL) return next();
  const now = Date.now();
  if (now - lastDbCheckSuccessTime < DB_CHECK_CACHE_MS) {
    return next();
  }
  const s = await serverDb.status();
  if (!s.connected) {
    return res.status(503).json({ error: `Neon tidak terhubung: ${s.error}` });
  }
  lastDbCheckSuccessTime = now;
  next();
});

// ======================================================
// BOOTSTRAP (SINGLE FETCH INITIAL DATA)
// ======================================================

app.get(
  '/api/bootstrap',
  wrap(async (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const [products, customers, orders, settings] = await Promise.all([
      serverDb.getProducts(),
      serverDb.getCustomers(),
      serverDb.getOrders(),
      serverDb.getSettings(),
    ]);

    // Jika QRIS atau gambar disimpan sebagai base64 di response, jangan sertakan di /api/bootstrap kecuali sudah berupa URL Cloudinary
    const isUrl = (s?: string) => s && (s.startsWith('http://') || s.startsWith('https://'));
    const isBase64 = (s?: string) => s && s.startsWith('data:');

    const cleanSettings = {
      ...settings,
      qrisImageUrl: isUrl(settings.qrisImageUrl)
        ? settings.qrisImageUrl
        : isBase64(settings.qrisImageUrl)
        ? ''
        : settings.qrisImageUrl,
    };

    const cleanProducts = products.map(p => {
      const cleanImageUrl = isUrl(p.imageUrl) ? p.imageUrl : isBase64(p.imageUrl) ? undefined : p.imageUrl;
      const cleanImages = (p.images || []).filter(img => !isBase64(img));
      return {
        ...p,
        imageUrl: cleanImageUrl,
        images: cleanImages.length > 0 ? cleanImages : cleanImageUrl ? [cleanImageUrl] : [],
      };
    });

    res.json({
      products: cleanProducts,
      customers,
      orders,
      settings: cleanSettings,
    });
  })
);

// ======================================================
// CLOUDINARY UPLOAD
// ======================================================

app.post(
  '/api/upload',
  wrap(async (req, res) => {
    const { file } = req.body;

    if (!file) {
      return res.status(400).json({
        error: 'Data file gambar tidak ditemukan.',
      });
    }

    const cloudinaryUrl =
      process.env.CLOUDINARY_URL ||
      process.env.VITE_CLOUDINARY_URL;

    const creds = parseCloudinaryUrl(cloudinaryUrl);

    // ------------------------------------------
    // SIGNED UPLOAD
    // ------------------------------------------

    if (
      creds &&
      creds.apiKey &&
      creds.apiSecret &&
      creds.cloudName
    ) {
      const timestamp = Math.round(Date.now() / 1000);

      const signature = crypto
        .createHash('sha1')
        .update(
          `timestamp=${timestamp}${creds.apiSecret}`
        )
        .digest('hex');

      const cloudinaryResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${creds.cloudName}/image/upload`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            file,
            api_key: creds.apiKey,
            timestamp,
            signature,
          }),
        }
      );

      const data = await cloudinaryResponse.json();

      if (
        !cloudinaryResponse.ok ||
        !data.secure_url
      ) {
        throw new Error(
          data?.error?.message ||
            'Gagal mengunggah foto ke Cloudinary.'
        );
      }

      return res.json({
        secure_url: data.secure_url,
        url: data.url,
      });
    }

    // ------------------------------------------
    // UNSIGNED UPLOAD
    // ------------------------------------------

    const cloudName =
      process.env.CLOUDINARY_CLOUD_NAME ||
      process.env.VITE_CLOUDINARY_CLOUD_NAME;

    const uploadPreset =
      process.env.CLOUDINARY_UPLOAD_PRESET ||
      process.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (cloudName && uploadPreset) {
      const cloudinaryResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            file,
            upload_preset: uploadPreset,
          }),
        }
      );

      const data = await cloudinaryResponse.json();

      if (
        !cloudinaryResponse.ok ||
        !data.secure_url
      ) {
        throw new Error(
          data?.error?.message ||
            'Gagal mengunggah foto ke Cloudinary.'
        );
      }

      return res.json({
        secure_url: data.secure_url,
        url: data.url,
      });
    }

    return res.status(500).json({
      error:
        'CLOUDINARY_URL belum dikonfigurasi di Environment Variables.',
    });
  })
);

// ======================================================
// PRODUCTS
// ======================================================

app.get(
  '/api/products',
  wrap(async (_req, res) => {
    const products = await serverDb.getProducts();

    res.json(products);
  })
);

app.post(
  '/api/products',
  wrap(async (req, res) => {
    const product = await serverDb.createProduct(
      req.body
    );

    res.status(201).json(product);
  })
);

app.put(
  '/api/products/:id',
  wrap(async (req, res) => {
    const product = await serverDb.updateProduct(
      req.params.id,
      req.body
    );

    if (!product) {
      return res.status(404).json({
        error: 'Product not found',
      });
    }

    res.json(product);
  })
);

app.delete(
  '/api/products/:id',
  wrap(async (req, res) => {
    const success = await serverDb.deleteProduct(
      req.params.id
    );

    res.json({
      success,
    });
  })
);

// ======================================================
// CUSTOMERS
// ======================================================

app.get(
  '/api/customers',
  wrap(async (_req, res) => {
    res.json(await serverDb.getCustomers());
  })
);

app.post(
  '/api/customers',
  wrap(async (req, res) => {
    const customer =
      await serverDb.createCustomer(req.body);

    res.status(201).json(customer);
  })
);

app.put(
  '/api/customers/:id',
  wrap(async (req, res) => {
    const customer =
      await serverDb.updateCustomer(
        req.params.id,
        req.body
      );

    if (!customer) {
      return res.status(404).json({
        error: 'Customer not found',
      });
    }

    res.json(customer);
  })
);

app.delete(
  '/api/customers/:id',
  wrap(async (req, res) => {
    const pin = req.header('x-admin-pin');
    if (!(await serverDb.verifyAdminPin(pin))) {
      return res.status(403).json({
        error: 'Hanya admin yang boleh menghapus customer.',
      });
    }

    const success = await serverDb.deleteCustomer(req.params.id);

    if (!success) {
      return res.status(404).json({
        error: 'Customer not found',
      });
    }

    res.json({ success: true });
  })
);

// ======================================================
// ORDERS / INVOICE
// ======================================================

app.get(
  '/api/orders',
  wrap(async (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json(await serverDb.getOrders());
  })
);

app.post(
  '/api/orders',
  wrap(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const order =
      await serverDb.createOrder(req.body);

    res.status(201).json(order);
  })
);

app.put(
  '/api/orders/:id',
  wrap(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const {
      customerName,
      customerPhone,
      paymentMethod,
      items,
      discount,
      tax,
      notes,
    } = req.body;

    const order =
      await serverDb.updateOrder(
        req.params.id,
        {
          customerName,
          customerPhone,
          paymentMethod,
          items,
          discount,
          tax,
          notes,
        }
      );

    if (!order) {
      return res.status(404).json({
        error: 'Order not found',
      });
    }

    res.json(order);
  })
);

app.delete(
  '/api/orders/:id',
  wrap(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const success =
      await serverDb.deleteOrder(
        req.params.id
      );

    if (!success) {
      return res.status(404).json({
        error: 'Order not found',
      });
    }

    res.json({
      success: true,
    });
  })
);

// ======================================================
// SETTINGS
// ======================================================

app.get(
  '/api/settings',
  wrap(async (_req, res) => {
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    res.json(
      await serverDb.getSettings()
    );
  })
);

app.put(
  '/api/settings',
  wrap(async (req, res) => {
    res.json(
      await serverDb.updateSettings(req.body)
    );
  })
);

// ======================================================
// NEON DATABASE TEST
// ======================================================

app.post(
  '/api/neon/test',
  wrap(async (req, res) => {
    const result =
      await serverDb.testNeonConnection(
        req.body.url
      );

    res.json(result);
  })
);

app.post(
  '/api/neon/sync',
  wrap(async (req, res) => {
    const result =
      await serverDb.syncToNeon(
        req.body.url
      );

    res.json(result);
  })
);

// ======================================================
// BACKUP / RESTORE
// ======================================================

app.post(
  '/api/backup/import',
  wrap(async (req, res) => {
    const result =
      await serverDb.importBackup(
        req.body
      );

    res.json(result);
  })
);

// ======================================================
// ERROR HANDLER
// ======================================================

app.use(
  (
    error: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('[SERVER ERROR]', error);

    if (res.headersSent) {
      return;
    }

    res.status(
      error?.statusCode || 500
    ).json({
      error:
        process.env.NODE_ENV === 'development'
          ? error?.message ||
            'Internal server error'
          : 'Internal server error',
    });
  }
);

// ======================================================
// VITE DEVELOPMENT / PRODUCTION
// ======================================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const {
      createServer: createViteServer,
    } = await import('vite');

    const vite =
      await createViteServer({
        server: {
          middlewareMode: true,
        },
        appType: 'spa',
      });

    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(
      process.cwd(),
      'dist'
    );

    app.use(
      express.static(distPath)
    );

    app.get(
      '*',
      (_req, res) => {
        res.sendFile(
          path.join(
            distPath,
            'index.html'
          )
        );
      }
    );
  }

  app.listen(
    PORT,
    '0.0.0.0',
    () => {
      console.log(
        `[JERES STUDIO] Server running on http://0.0.0.0:${PORT}`
      );
    }
  );
}

// ======================================================
// LOCAL SERVER ONLY
// ======================================================

if (!process.env.VERCEL) {
  startServer();
}

export default app;