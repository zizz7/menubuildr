import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { syncUploadsToPublic } from './utils/sync-uploads';
import { validateEnv } from './config/env';

dotenv.config();
validateEnv();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy headers from Cloudflare
app.set('trust proxy', 1);

// CORS configuration: locked down in production, permissive in development
const isProduction = process.env.NODE_ENV === 'production';
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
  origin: isProduction ? allowedOrigins : true,
  credentials: true,
}));

// Raw body middleware for Stripe webhook (MUST come before express.json)
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));

// Increase body size limit to 10MB for large SVG files
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Static files for generated menu HTML
app.use('/menus', express.static(path.join(__dirname, '../menus')));

// Health check (before auth-protected routes)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Regenerate all published menu HTML files (admin utility)
app.post('/api/regenerate-menus', async (_req, res) => {
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
app.use('/api/upload', uploadRoutes);
app.use('/api/search', searchRoutes);
app.use('/api', importExportRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/menu-items', translationRoutes);
app.use('/api/billing', billingRoutes);

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running on 0.0.0.0:${PORT}`);
  // Sync existing uploads to public directory on startup
  console.log('Syncing uploads to public directory...');
  syncUploadsToPublic();
});

