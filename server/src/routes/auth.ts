import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import rateLimit from 'express-rate-limit';
import prisma from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { addToBlocklist } from '../middleware/tokenBlocklist';
import { sendError } from '../utils/errors';
import { handleZodError } from '../utils/zod-error';
import { auditLog } from '../utils/audit-log';
import { complexPasswordSchema } from '../utils/validation';
import { z } from 'zod';

const router = express.Router();

// Safe IP extraction — req.ip can throw in test environments without a socket
function getIp(req: express.Request): string {
  try {
    return req.ip ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

// Rate limiter: max 20 attempts per 15 minutes per IP — prevents brute-force
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again in 15 minutes.' },
});

// ─── Register ─────────────────────────────────────────────────────────────────
const RegisterSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  email: z.string().email('Invalid email').trim(),
  password: complexPasswordSchema,
});

router.post('/register', authRateLimiter, async (req, res) => {
  try {
    const data = RegisterSchema.parse(req.body);

    const existing = await prisma.admin.findUnique({ where: { email: data.email } });
    if (existing) {
      return sendError(res, 409, 'Email already in use');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const admin = await prisma.admin.create({
      data: { name: data.name, email: data.email, passwordHash, subscriptionStatus: 'free' },
    });

    const jwtSecret = process.env.JWT_SECRET!;
    const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
    const jti = randomUUID();

    const token = jwt.sign({ userId: admin.id, jti }, jwtSecret, { expiresIn } as jwt.SignOptions);

    auditLog('register', admin.id, getIp(req));

    return res.status(201).json({
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        profileImageUrl: admin.profileImageUrl,
      },
    });
  } catch (error: any) {
    if (error?.name === 'ZodError' || error?.issues) {
      return handleZodError(res, error);
    }
    console.error('Register error:', error);
    return sendError(res, 500, 'Internal server error');
  }
});

// ─── Login ────────────────────────────────────────────────────────────────────
router.post('/login', authRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 400, 'Email and password required');
    }

    const admin = await prisma.admin.findUnique({ where: { email } });

    // Always run bcrypt.compare to equalize timing and prevent email enumeration
    const DUMMY_HASH = '$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZabcde';
    const isValid = await bcrypt.compare(password, admin ? admin.passwordHash : DUMMY_HASH);

    if (!admin || !isValid) {
      auditLog('login_failed', null, getIp(req), { email });
      return sendError(res, 401, 'Invalid credentials');
    }

    const jwtSecret = process.env.JWT_SECRET!;
    const expiresIn = process.env.JWT_EXPIRES_IN || '24h'; // C1.12: default 24h
    const jti = randomUUID();

    const token = jwt.sign({ userId: admin.id, jti }, jwtSecret, { expiresIn } as jwt.SignOptions);

    auditLog('login', admin.id, getIp(req));

    return res.json({
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        profileImageUrl: admin.profileImageUrl,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return sendError(res, 500, 'Internal server error', process.env.NODE_ENV === 'development' ? error.message : undefined);
  }
});

// ─── Get current admin ────────────────────────────────────────────────────────
router.get('/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const admin = await prisma.admin.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        name: true,
        profileImageUrl: true,
        subscriptionStatus: true,
        subscriptionPlan: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        createdAt: true,
      },
    });

    if (!admin) {
      return sendError(res, 404, 'Admin not found');
    }

    const { stripeCustomerId, stripeSubscriptionId, ...safeAdmin } = admin;

    return res.json({
      ...safeAdmin,
      hasStripeCustomer: !!stripeCustomerId,
      hasSubscription: !!stripeSubscriptionId,
    });
  } catch (error) {
    console.error('Get admin error:', error);
    return sendError(res, 500, 'Internal server error');
  }
});

// ─── Logout ───────────────────────────────────────────────────────────────────
router.post('/logout', authenticateToken, (req: AuthRequest, res) => {
  // C1.4: Add token JTI to blocklist so replayed tokens are rejected
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.decode(token) as any;
      if (decoded?.jti) {
        addToBlocklist(decoded.jti);
      }
    } catch {
      // Ignore decode errors — token already verified by authenticateToken
    }
  }

  auditLog('logout', req.userId ?? null, getIp(req));
  return res.json({ message: 'Logged out successfully' });
});

// ─── Update profile ───────────────────────────────────────────────────────────
router.put('/profile', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { name, profileImageUrl } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name.trim();
    if (profileImageUrl !== undefined) data.profileImageUrl = profileImageUrl;

    if (Object.keys(data).length === 0) {
      return sendError(res, 400, 'No fields to update');
    }

    const admin = await prisma.admin.update({
      where: { id: req.userId },
      data,
      select: { id: true, email: true, name: true, profileImageUrl: true },
    });

    return res.json(admin);
  } catch (error: any) {
    console.error('Profile update error:', error);
    return sendError(res, 500, 'Failed to update profile');
  }
});

// ─── Change password ──────────────────────────────────────────────────────────
const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: complexPasswordSchema,
});

router.put('/password', authRateLimiter, authenticateToken, async (req: AuthRequest, res) => {
  try {
    const data = ChangePasswordSchema.parse(req.body);

    const admin = await prisma.admin.findUnique({ where: { id: req.userId } });
    if (!admin) return sendError(res, 404, 'Admin not found');

    const isValid = await bcrypt.compare(data.currentPassword, admin.passwordHash);
    if (!isValid) {
      auditLog('password_change_failed', req.userId ?? null, getIp(req));
      return sendError(res, 401, 'Current password is incorrect');
    }

    const hash = await bcrypt.hash(data.newPassword, 10);
    await prisma.admin.update({ where: { id: req.userId }, data: { passwordHash: hash } });

    auditLog('password_change', req.userId ?? null, getIp(req));
    return res.json({ message: 'Password changed successfully' });
  } catch (error: any) {
    if (error?.name === 'ZodError' || error?.issues) {
      return handleZodError(res, error);
    }
    console.error('Password change error:', error);
    return sendError(res, 500, 'Failed to change password');
  }
});

// ─── Upload profile image ─────────────────────────────────────────────────────
router.post('/profile-image', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const multer = (await import('multer')).default;
    const path = await import('path');
    const fs = await import('fs');
    const { fileTypeFromFile } = await import('file-type');

    const uploadDir = path.join(process.cwd(), 'uploads', 'profile');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const storage = multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, uploadDir),
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${req.userId}${ext}`);
      },
    });

    const upload = multer({
      storage,
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (_req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, allowed.includes(ext));
      },
    }).single('profileImage');

    upload(req as any, res as any, async (err: any) => {
      if (err) return sendError(res, 400, err.message);
      const file = (req as any).file;
      if (!file) return sendError(res, 400, 'No file uploaded');

      // C1.5: Verify magic bytes — reject non-image content regardless of extension
      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
      const type = await fileTypeFromFile(file.path);
      if (!type || !allowedMimes.includes(type.mime)) {
        fs.unlinkSync(file.path);
        return sendError(res, 400, 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
      }

      // Remove old profile images with different extensions to avoid stale files
      const exts = ['.jpg', '.jpeg', '.png', '.webp'];
      for (const ext of exts) {
        const oldPath = path.join(uploadDir, `${req.userId}${ext}`);
        if (oldPath !== file.path && fs.existsSync(oldPath)) {
          try { fs.unlinkSync(oldPath); } catch { /* ignore */ }
        }
      }

      const imageUrl = `/uploads/profile/${file.filename}`;

      const admin = await prisma.admin.update({
        where: { id: req.userId },
        data: { profileImageUrl: imageUrl },
        select: { id: true, email: true, name: true, profileImageUrl: true },
      });

      return res.json(admin);
    });
  } catch (error: any) {
    console.error('Profile image upload error:', error);
    return sendError(res, 500, 'Failed to upload profile image');
  }
});

export default router;
