import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, admin.passwordHash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const jwtSecret = process.env.JWT_SECRET || 'secret';
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    
    // @ts-ignore - TypeScript has issues with jsonwebtoken types
    const token = jwt.sign(
      { userId: admin.id },
      jwtSecret,
      { expiresIn }
    );

    res.json({
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get current admin
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
      return res.status(404).json({ error: 'Admin not found' });
    }

    // Return boolean presence for Stripe IDs, not the actual values
    res.json({
      ...admin,
      hasStripeCustomer: !!admin.stripeCustomerId,
      hasSubscription: !!admin.stripeSubscriptionId,
      stripeCustomerId: undefined,
      stripeSubscriptionId: undefined,
    });
  } catch (error) {
    console.error('Get admin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout (client-side token removal, but we can add token blacklisting here if needed)
router.post('/logout', authenticateToken, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// Update profile (name, profileImageUrl)
router.put('/profile', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { name, profileImageUrl } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name.trim();
    if (profileImageUrl !== undefined) data.profileImageUrl = profileImageUrl;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const admin = await prisma.admin.update({
      where: { id: req.userId },
      data,
      select: { id: true, email: true, name: true, profileImageUrl: true },
    });

    res.json(admin);
  } catch (error: any) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
router.put('/password', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const admin = await prisma.admin.findUnique({ where: { id: req.userId } });
    if (!admin) return res.status(404).json({ error: 'Admin not found' });

    const isValid = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.admin.update({
      where: { id: req.userId },
      data: { passwordHash: hash },
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error: any) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Upload profile image
router.post('/profile-image', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const multer = (await import('multer')).default;
    const path = await import('path');
    const fs = await import('fs');

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
        const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.svg'];
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, allowed.includes(ext));
      },
    }).single('profileImage');

    upload(req as any, res as any, async (err: any) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!(req as any).file) return res.status(400).json({ error: 'No file uploaded' });

      const imageUrl = `/uploads/profile/${(req as any).file.filename}`;

      // Also copy to dashboard/public for serving
      const publicDir = path.join(process.cwd(), '../dashboard/public/uploads/profile');
      if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
      fs.copyFileSync((req as any).file.path, path.join(publicDir, (req as any).file.filename));

      const admin = await prisma.admin.update({
        where: { id: req.userId },
        data: { profileImageUrl: imageUrl },
        select: { id: true, email: true, name: true, profileImageUrl: true },
      });

      res.json(admin);
    });
  } catch (error: any) {
    console.error('Profile image upload error:', error);
    res.status(500).json({ error: 'Failed to upload profile image' });
  }
});

export default router;

