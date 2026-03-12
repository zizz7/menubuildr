import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Ensure env vars are loaded even when this module is imported before `server.ts`
dotenv.config();

// Local dev fallback: Prisma requires DATABASE_URL at client initialization time.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:admin@localhost:5432/menu_management?schema=public';
  // Avoid printing secrets; just warn that default is used.
  // eslint-disable-next-line no-console
  console.warn('[prisma] DATABASE_URL missing; using local default.');
}

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;

