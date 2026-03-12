import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireSubscription } from '../middleware/subscription';
import { copyFileToPublic } from '../utils/sync-uploads';
import { uploadToCloudinary } from '../utils/cloudinary-upload';

const router = express.Router();

router.use(authenticateToken);
router.use(requireSubscription);

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(uploadDir, file.fieldname);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'), // 5MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = {
      'logo': ['image/png', 'image/svg+xml', 'image/jpeg', 'image/webp'],
      'item-image': ['image/png', 'image/jpeg', 'image/webp'],
      'illustration': ['image/svg+xml', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
      'icon': ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
    };

    const fieldTypes = allowedTypes[file.fieldname as keyof typeof allowedTypes];
    if (fieldTypes && fieldTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type for ${file.fieldname}. Allowed: ${fieldTypes?.join(', ')}`));
    }
  },
});

// Upload logo
router.post('/logo', upload.single('logo'), async (req: AuthRequest, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    // Upload to Cloudinary (with retry logic built-in)
    const cloudinaryUrl = await uploadToCloudinary(req.file.path, 'menu-logos');
    
    // Clean up local file after successful Cloudinary upload
    fs.unlinkSync(req.file.path);

    res.json({
      url: cloudinaryUrl,
      filename: req.file.filename,
    });
  } catch (error: any) {
    console.error('Logo upload error after retries:', error);
    // Fallback to local storage if Cloudinary fails after retries
    copyFileToPublic('logo', req.file.filename);
    res.json({
      url: `/uploads/logo/${req.file.filename}`,
      filename: req.file.filename,
    });
  }
});

// Upload item image
router.post('/item-image', upload.single('image'), async (req: AuthRequest, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    // Upload to Cloudinary (with retry logic built-in)
    const cloudinaryUrl = await uploadToCloudinary(req.file.path, 'menu-items');
    
    // Clean up local file after successful Cloudinary upload
    fs.unlinkSync(req.file.path);

    res.json({
      url: cloudinaryUrl,
      filename: req.file.filename,
    });
  } catch (error: any) {
    console.error('Item image upload error after retries:', error);
    // Fallback to local storage if Cloudinary fails after retries
    copyFileToPublic('item-image', req.file.filename);
    res.json({
      url: `/uploads/item-image/${req.file.filename}`,
      filename: req.file.filename,
    });
  }
});

// Upload illustration
router.post('/illustration', upload.single('illustration'), async (req: AuthRequest, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    // Upload to Cloudinary (with retry logic built-in)
    const cloudinaryUrl = await uploadToCloudinary(req.file.path, 'menu-illustrations');
    
    // Clean up local file after successful Cloudinary upload
    fs.unlinkSync(req.file.path);

    res.json({
      url: cloudinaryUrl,
      filename: req.file.filename,
    });
  } catch (error: any) {
    console.error('Illustration upload error after retries:', error);
    // Fallback to local storage if Cloudinary fails after retries
    copyFileToPublic('illustration', req.file.filename);
    res.json({
      url: `/uploads/illustration/${req.file.filename}`,
      filename: req.file.filename,
    });
  }
});

// Upload allergen icon
router.post('/allergen-icon', upload.single('icon'), async (req: AuthRequest, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    // Upload to Cloudinary (with retry logic built-in)
    const cloudinaryUrl = await uploadToCloudinary(req.file.path, 'allergen-icons');
    
    // Clean up local file after successful Cloudinary upload
    fs.unlinkSync(req.file.path);

    res.json({
      url: cloudinaryUrl,
      filename: req.file.filename,
    });
  } catch (error: any) {
    console.error('Allergen icon upload error after retries:', error);
    // Fallback to local storage if Cloudinary fails after retries
    copyFileToPublic('icon', req.file.filename);
    res.json({
      url: `/uploads/icon/${req.file.filename}`,
      filename: req.file.filename,
    });
  }
});

export default router;

