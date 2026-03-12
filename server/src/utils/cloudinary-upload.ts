import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dso9iaztv',
  api_key: process.env.CLOUDINARY_API_KEY || '591231746157358',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'NPlnwQ-bqniLh7Uq44D0qAuesVU',
});

/**
 * Upload image to Cloudinary with retry logic
 * @param imagePath - Path to the image file
 * @param folder - Optional folder name in Cloudinary
 * @param retryCount - Current retry attempt (internal use)
 * @param maxRetries - Maximum number of retries (default: 2)
 * @returns Promise with Cloudinary image URL
 */
export async function uploadToCloudinary(
  imagePath: string,
  folder?: string,
  retryCount: number = 0,
  maxRetries: number = 2
): Promise<string> {
  try {
    if (!fs.existsSync(imagePath)) {
      throw new Error(`File not found: ${imagePath}`);
    }

    // Determine folder based on file type if not provided
    if (!folder) {
      const fileName = path.basename(imagePath);
      if (fileName.includes('logo') || imagePath.includes('logo')) {
        folder = 'menu-logos';
      } else if (fileName.includes('illustration') || imagePath.includes('illustration')) {
        folder = 'menu-illustrations';
      } else if (fileName.includes('icon') || imagePath.includes('icon')) {
        folder = 'allergen-icons';
      } else {
        folder = 'menu-items';
      }
    }

    // Get file extension to determine resource type
    const fileExtension = path.extname(imagePath).toLowerCase();
    const isSvg = fileExtension === '.svg';

    // Upload options
    const uploadOptions: any = {
      folder: folder,
      use_filename: false,
      unique_filename: true,
      overwrite: false,
    };

    // For SVG files, specify resource_type
    if (isSvg) {
      uploadOptions.resource_type = 'image';
      uploadOptions.format = 'svg';
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(imagePath, uploadOptions);

    if (result && result.secure_url) {
      return result.secure_url;
    } else {
      throw new Error('Cloudinary upload failed: No URL returned');
    }
  } catch (error: any) {
    // Retry on error if we haven't exceeded max retries
    if (retryCount < maxRetries) {
      const waitTime = 1000 * (retryCount + 1); // 1s, 2s
      console.warn(`Cloudinary upload failed (attempt ${retryCount + 1}/${maxRetries + 1}), retrying in ${waitTime}ms...`, error.message);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return uploadToCloudinary(imagePath, folder, retryCount + 1, maxRetries);
    }
    
    // Max retries exceeded, throw error
    console.error(`Cloudinary upload error after ${maxRetries + 1} attempts:`, error);
    throw new Error(`Failed to upload to Cloudinary after ${maxRetries + 1} attempts: ${error.message}`);
  }
}

/**
 * Upload image buffer to Cloudinary
 * @param imageBuffer - Image as buffer
 * @param folder - Optional folder name in Cloudinary
 * @param retryCount - Current retry attempt (internal use)
 * @param maxRetries - Maximum number of retries
 * @returns Promise with Cloudinary image URL
 */
export async function uploadBufferToCloudinary(
  imageBuffer: Buffer,
  folder?: string,
  retryCount: number = 0,
  maxRetries: number = 3
): Promise<string> {
  try {
    // Convert buffer to data URI
    const base64Image = imageBuffer.toString('base64');
    const dataUri = `data:image/jpeg;base64,${base64Image}`;

    // Determine folder if not provided
    if (!folder) {
      folder = 'menu-items';
    }

    // Upload options
    const uploadOptions: any = {
      folder: folder,
      use_filename: false,
      unique_filename: true,
      overwrite: false,
    };

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataUri, uploadOptions);

    if (result && result.secure_url) {
      return result.secure_url;
    } else {
      throw new Error('Cloudinary upload failed: No URL returned');
    }
  } catch (error: any) {
    // Retry on error if we haven't exceeded max retries
    if (retryCount < maxRetries) {
      const waitTime = 1000 * (retryCount + 1); // 1s, 2s, 3s
      console.warn(`Cloudinary upload failed (attempt ${retryCount + 1}/${maxRetries}), retrying in ${waitTime}ms...`, error.message);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return uploadBufferToCloudinary(imageBuffer, folder, retryCount + 1, maxRetries);
    }
    
    // Max retries exceeded, throw error
    console.error('Cloudinary upload error after retries:', error);
    throw new Error(`Failed to upload to Cloudinary after ${maxRetries} attempts: ${error.message}`);
  }
}

