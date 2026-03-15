import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileTypeFromFile } from 'file-type';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireSubscription } from '../middleware/subscription';
import { copyFileToPublic } from '../utils/sync-uploads';
import { uploadToCloudinary } from '../utils/cloudinary-upload';
import { sanitizeSvg } from '../utils/svg-sanitize';
import { sendError } from '../utils/errors';

const router = express.Router();

router.use(authenticateToken);
router.use(requireSubscription);

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    const uploadPath = path.join(uploadDir, file.fieldname);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// Verify magic bytes — returns true for valid MIME or SVG extension fallback
export const verifyMagicBytes = async (
  filePath: string,
  allowedMimeTypes: string[]
): Promise<boolean> => {
  const type = await fileTypeFromFile(filePath);
  if (!type || !allowedMimeTypes.includes(type.mime)) {
    // SVG is XML-based; file-type may not detect it — fall back to extension check
    const isSvg = filePath.toLowerCase().endsWith('.svg');
    if (isSvg && allowedMimeTypes.includes('image/svg+xml')) {
      return true;
    }
    return false;
  }
  return true;
};

interface UploadHandlerConfig {
  fieldName: string;
  allowedMimes: string[];
  cloudinaryFolder: string;
  /** If true, SVG content will be sanitized before upload */
  sanitizeSvgContent?: boolean;
}

/**
 * Factory that creates a single parameterized upload handler.
 * Fixes C1.1 (SVG sanitization) and C1.21 (duplicate handlers).
 */
function createUploadHandler(config: UploadHandlerConfig) {
  const { fieldName, allowedMimes, cloudinaryFolder, sanitizeSvgContent = false } = config;

  const allowedTypes: Record<string, string[]> = {
    logo: ['image/png', 'image/svg+xml', 'image/jpeg', 'image/webp'],
    'item-image': ['image/png', 'image/jpeg', 'image/webp'],
    illustration: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
    icon: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
  };

  const upload = multer({
    storage,
    limits: {
      fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'), // 5MB default
    },
    fileFilter: (_req, file, cb) => {
      const fieldTypes = allowedTypes[file.fieldname as keyof typeof allowedTypes] ?? allowedMimes;
      if (fieldTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Invalid file type for ${file.fieldname}. Allowed: ${fieldTypes.join(', ')}`));
      }
    },
  }).single(fieldName === 'item-image' ? 'image' : fieldName);

  return async (req: AuthRequest, res: express.Response) => {
    upload(req as any, res as any, async (err: any) => {
      if (err) {
        return sendError(res, 400, err.message);
      }

      const file = (req as any).file;
      if (!file) {
        return sendError(res, 400, 'No file uploaded');
      }

      try {
        // Verify magic bytes
        const isValid = await verifyMagicBytes(file.path, allowedMimes);
        if (!isValid) {
          fs.unlinkSync(file.path);
          return sendError(res, 400, 'Invalid file content. Magic bytes do not match allowed image types.');
        }

        // C1.1: Sanitize SVG content before uploading
        if (sanitizeSvgContent && file.path.toLowerCase().endsWith('.svg')) {
          const raw = fs.readFileSync(file.path, 'utf-8');
          const sanitized = sanitizeSvg(raw);
          fs.writeFileSync(file.path, sanitized, 'utf-8');
        }

        // Upload to Cloudinary
        const cloudinaryUrl = await uploadToCloudinary(file.path, cloudinaryFolder);

        // Clean up local file after successful Cloudinary upload
        fs.unlinkSync(file.path);

        res.json({ url: cloudinaryUrl, filename: file.filename });
      } catch (error: any) {
        console.error(`${fieldName} upload error after retries:`, error);
        // Fallback to local storage if Cloudinary fails
        copyFileToPublic(fieldName, file.filename);
        res.json({
          url: `/uploads/${fieldName}/${file.filename}`,
          filename: file.filename,
        });
      }
    });
  };
}

// Single parameterized handler for each upload type (fixes C1.21)
router.post(
  '/logo',
  createUploadHandler({
    fieldName: 'logo',
    allowedMimes: ['image/png', 'image/svg+xml', 'image/jpeg', 'image/webp'],
    cloudinaryFolder: 'menu-logos',
    sanitizeSvgContent: true, // C1.1: sanitize SVG uploads
  })
);

router.post(
  '/item-image',
  createUploadHandler({
    fieldName: 'item-image',
    allowedMimes: ['image/png', 'image/jpeg', 'image/webp'],
    cloudinaryFolder: 'menu-items',
    sanitizeSvgContent: false,
  })
);

router.post(
  '/illustration',
  createUploadHandler({
    fieldName: 'illustration',
    allowedMimes: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
    cloudinaryFolder: 'menu-illustrations',
    sanitizeSvgContent: true, // C1.1: sanitize SVG uploads
  })
);

router.post(
  '/allergen-icon',
  createUploadHandler({
    fieldName: 'icon',
    allowedMimes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
    cloudinaryFolder: 'allergen-icons',
    sanitizeSvgContent: false,
  })
);

export default router;
