import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import prisma from '../config/database';
import { auditLog } from '../utils/audit-log';

const router = express.Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

function getOAuth2Client() {
  return new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL);
}

function getIp(req: express.Request): string {
  try {
    return req.ip ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

// Step 1: Redirect to Google consent screen
router.get('/google', (_req, res) => {
  if (!GOOGLE_CLIENT_ID) {
    return res.status(503).json({ error: 'Google OAuth not configured' });
  }

  const client = getOAuth2Client();
  const authorizeUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    prompt: 'select_account',
  });

  return res.redirect(authorizeUrl);
});

// Step 2: Handle Google callback
router.get('/google/callback', async (req, res) => {
  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    return res.redirect(`${FRONTEND_URL}/login?error=google_auth_failed`);
  }

  try {
    const client = getOAuth2Client();

    // Exchange authorization code for tokens
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // Verify the ID token and get user info
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.redirect(`${FRONTEND_URL}/login?error=google_auth_failed`);
    }

    const { sub: googleId, email, name, picture } = payload;

    // Find existing user by googleId or email
    let admin = await prisma.admin.findFirst({
      where: {
        OR: [
          { googleId: googleId },
          { email: email },
        ],
      },
    });

    if (admin) {
      // Link Google account if not already linked
      if (!admin.googleId) {
        admin = await prisma.admin.update({
          where: { id: admin.id },
          data: {
            googleId: googleId,
            profileImageUrl: admin.profileImageUrl || picture || null,
          },
        });
      }
    } else {
      // Create new user — generate a random password hash (user can set password later)
      const randomPassword = randomUUID() + randomUUID();
      const passwordHash = await bcrypt.hash(randomPassword, 10);

      admin = await prisma.admin.create({
        data: {
          email: email,
          name: name || email.split('@')[0],
          passwordHash,
          googleId: googleId,
          profileImageUrl: picture || null,
        },
      });
    }

    // Issue JWT
    const jwtSecret = process.env.JWT_SECRET!;
    const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
    const jti = randomUUID();
    const token = jwt.sign({ userId: admin.id, jti }, jwtSecret, { expiresIn } as jwt.SignOptions);

    auditLog('google_login', admin.id, getIp(req));

    // Redirect to frontend with token
    return res.redirect(`${FRONTEND_URL}/auth/google/callback?token=${token}&admin=${encodeURIComponent(JSON.stringify({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      profileImageUrl: admin.profileImageUrl,
    }))}`);
  } catch (error: any) {
    console.error('Google OAuth error:', error);
    return res.redirect(`${FRONTEND_URL}/login?error=google_auth_failed`);
  }
});

export default router;
