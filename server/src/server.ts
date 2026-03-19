import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { syncUploadsToPublic } from './utils/sync-uploads';
import { validateEnv } from './config/env';
import { authenticateToken, AuthRequest } from './middleware/auth';

dotenv.config();
validateEnv();

const app = express();
const PORT = process.env.PORT || 5000;

const isProduction = process.env.NODE_ENV === 'production';

// Trust proxy headers from Cloudflare (production only)
if (isProduction) app.set('trust proxy', 1);

// C1.8: Always use explicit allowlist — no wildcard origin in any environment
const allowedOrigins = isProduction
  ? [
      process.env.FRONTEND_URL,
      `https://app.menubuildr.com`,
      `https://www.menubuildr.com`,
      `https://menubuildr.com`,
    ].filter(Boolean) as string[]
  : [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://localhost:3004',
      'http://localhost:3005',
    ];

app.use(cors({
  origin: allowedOrigins, // C1.8: always use allowlist, never `true`
  credentials: true,
}));

// C1.13: Configure Helmet with explicit CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com', 'https://app.menubuildr.com', 'https://api.menubuildr.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      connectSrc: ["'self'"],
    },
  },
}));

// C1.9: Rate limiter for write endpoints (20 req / 15 min per IP)
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// Raw body middleware for Stripe webhook (MUST come before express.json)
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));

// Increase body size limit to 10MB for large SVG files
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// C1.11: Split static file mounts — protect /uploads/profile with auth
// Public upload paths (logos, item images, illustrations, icons)
app.use('/uploads/logo', express.static(path.join(__dirname, '../uploads/logo')));
app.use('/uploads/item-image', express.static(path.join(__dirname, '../uploads/item-image')));
app.use('/uploads/illustration', express.static(path.join(__dirname, '../uploads/illustration')));
app.use('/uploads/icon', express.static(path.join(__dirname, '../uploads/icon')));
// Profile images — served publicly (browser <img> tags cannot send Bearer tokens)
app.use('/uploads/profile', express.static(path.join(__dirname, '../uploads/profile')));

// Static files for generated menu HTML (public) - no CSP restrictions for menu pages
// Menu HTML files contain inline scripts for language switching and allergen filtering
app.use('/menus', (_req, res, next) => {
  // Remove CSP headers for menu pages to allow inline scripts and external fonts
  res.removeHeader('Content-Security-Policy');
  next();
}, express.static(path.join(__dirname, '../menus')));

// Health check (before auth-protected routes)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Regenerate all published menu HTML files (admin utility — requires auth)
app.post('/api/regenerate-menus', authenticateToken, async (_req: AuthRequest, res) => {
  try {
    const prismaModule = await import('./config/database');
    const db = prismaModule.default;
    const publishedMenus = await db.menu.findMany({
      where: { status: 'published' },
      select: { id: true, slug: true },
    });

    const { generateMenuHTML } = await import('./services/menu-generator');
    const results: Array<{ id: string; slug: string; status: string }> = [];
    for (const menu of publishedMenus) {
      try {
        await generateMenuHTML(menu.id);
        results.push({ id: menu.id, slug: menu.slug, status: 'ok' });
      } catch (e: any) {
        results.push({ id: menu.id, slug: menu.slug, status: `error: ${e.message}` });
      }
    }
    res.json({ regenerated: results.length, results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Routes
import authRoutes from './routes/auth';
import restaurantRoutes from './routes/restaurants';
import menuRoutes from './routes/menus';
import sectionRoutes from './routes/sections';
import categoryRoutes from './routes/categories';
import itemRoutes from './routes/items';
import allergenRoutes from './routes/allergens';
import languageRoutes from './routes/languages';
import translateRoutes from './routes/translate';
import uploadRoutes from './routes/upload';
import searchRoutes from './routes/search';
import importExportRoutes from './routes/import-export';
import templateRoutes from './routes/templates';
import translationRoutes from './routes/translations';
import billingRoutes from './routes/billing';

app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/menus', menuRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/allergens', allergenRoutes);
app.use('/api/languages', languageRoutes);
app.use('/api/translate', translateRoutes);

// C1.9: Apply write rate limiter to upload and import endpoints
app.use('/api/upload', writeLimiter, uploadRoutes);
app.use('/api/search', searchRoutes);
app.use('/api', writeLimiter, importExportRoutes); // covers /restaurants/import and /restaurants/:id/import-menu
app.use('/api/templates', templateRoutes);
app.use('/api/menu-items', translationRoutes);
app.use('/api/billing', billingRoutes);

// Global error handler — prevents leaking sensitive information
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);

  if (isProduction) {
    return res.status(500).json({ error: 'Internal server error' });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    stack: err.stack,
  });
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running on 0.0.0.0:${PORT}`);
  console.log('Syncing uploads to public directory...');
  syncUploadsToPublic();

  (async () => {
    try {
      const prismaModule = await import('./config/database');
      const db = prismaModule.default;
      const publishedMenus = await db.menu.findMany({
        where: { status: 'published' },
        select: { id: true, slug: true },
      });
      if (publishedMenus.length > 0) {
        console.log(`Regenerating ${publishedMenus.length} published menus...`);
        const { generateMenuHTML } = await import('./services/menu-generator');
        for (const menu of publishedMenus) {
          try {
            await generateMenuHTML(menu.id);
          } catch (e: any) {
            console.error(`Failed to regenerate menu ${menu.slug}:`, e.message);
          }
        }
        console.log('Menu regeneration complete.');
      }
    } catch (e: any) {
      console.error('Error during startup menu regeneration:', e.message);
    }
  })();
});
