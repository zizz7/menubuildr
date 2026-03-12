import prisma from '../config/database';
import { uploadToCloudinary } from '../utils/cloudinary-upload';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

/**
 * Check if a URL is a local upload path or Imgur URL
 */
function needsMigration(url: string | null | undefined): boolean {
  if (!url || !url.trim()) return false;
  const trimmed = url.trim();
  
  // Skip if already Cloudinary URL
  if (trimmed.includes('res.cloudinary.com')) {
    return false;
  }
  
  // Check if it's a local path (starts with /uploads/ or relative path without http/https)
  // Also check if it's a localhost URL pointing to uploads
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    // Check if it's a localhost URL pointing to uploads directory
    if (trimmed.includes('localhost') && trimmed.includes('/uploads/')) {
      return true;
    }
    // Check if it's an Imgur URL
    if (trimmed.includes('imgur.com') || trimmed.includes('i.imgur.com')) {
      return true;
    }
    // Other external URLs (not Cloudinary) - skip
    return false;
  }
  
  // Relative path or absolute path starting with /uploads/
  return trimmed.startsWith('/uploads/') || (!trimmed.startsWith('/') && !trimmed.startsWith('http'));
}

/**
 * Get the full local file path from a URL
 * Handles typos in database paths (loggo -> logo, illlustration -> illustration, icoon -> icon)
 */
function getLocalFilePath(url: string, baseDir: string = path.join(__dirname, '../../uploads')): string {
  let cleanUrl = url.trim();
  
  // If it's a localhost URL, extract the path
  if (cleanUrl.includes('localhost') && cleanUrl.includes('/uploads/')) {
    try {
      const urlObj = new URL(cleanUrl);
      cleanUrl = urlObj.pathname;
    } catch {
      // If URL parsing fails, extract path manually
      const match = cleanUrl.match(/\/uploads\/.*/);
      if (match) cleanUrl = match[0];
    }
  }
  
  // Fix common typos in database paths first
  cleanUrl = cleanUrl
    .replace(/\/loggo\//g, '/logo/')
    .replace(/\/illlustration\//g, '/illustration/')
    .replace(/\/icoon\//g, '/icon/');
  
  // Remove leading slash if present
  if (cleanUrl.startsWith('/')) {
    cleanUrl = cleanUrl.slice(1);
  }
  
  // If the URL already starts with 'uploads/', remove it to avoid double prefix
  if (cleanUrl.startsWith('uploads/')) {
    cleanUrl = cleanUrl.replace(/^uploads\//, '');
  }
  
  // The URL should already contain the subdirectory (logo, illustration, etc.)
  // So we just join it with the base uploads directory
  return path.join(baseDir, cleanUrl);
}

/**
 * Download image from URL (for Imgur URLs)
 */
async function downloadImage(url: string): Promise<string> {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const tempPath = path.join(__dirname, '../../temp', `temp-${Date.now()}-${Math.random().toString(36).substring(7)}.${url.split('.').pop()?.split('?')[0] || 'jpg'}`);
    
    // Ensure temp directory exists
    const tempDir = path.dirname(tempPath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    fs.writeFileSync(tempPath, response.data);
    return tempPath;
  } catch (error: any) {
    throw new Error(`Failed to download image from ${url}: ${error.message}`);
  }
}

/**
 * Migrate a single image URL to Cloudinary
 */
async function migrateImageUrl(
  url: string,
  context: string,
  folder?: string
): Promise<string | null> {
  try {
    if (!needsMigration(url)) {
      console.log(`  ⏭️  Skipping (already Cloudinary or external): ${url} (${context})`);
      return null; // Already Cloudinary or external, skip
    }

    let localPath: string | null = null;
    let isTempFile = false;

    // Check if it's an Imgur URL or local path
    if (url.includes('imgur.com') || url.includes('i.imgur.com')) {
      console.log(`  📥 Downloading from Imgur: ${url} (${context})`);
      localPath = await downloadImage(url);
      isTempFile = true;
    } else {
      // Local file path
      localPath = getLocalFilePath(url);
      
      // Check if file exists
      if (!fs.existsSync(localPath)) {
        console.warn(`  ⚠️  File not found: ${localPath} (${context})`);
        return null;
      }
    }

    if (!localPath) {
      return null;
    }

    // Determine folder if not provided
    if (!folder) {
      if (url.includes('logo') || localPath.includes('logo')) {
        folder = 'menu-logos';
      } else if (url.includes('illustration') || localPath.includes('illustration')) {
        folder = 'menu-illustrations';
      } else if (url.includes('icon') || localPath.includes('icon')) {
        folder = 'allergen-icons';
      } else {
        folder = 'menu-items';
      }
    }

    console.log(`  📤 Uploading to Cloudinary: ${url} (${context})`);
    
    // Upload to Cloudinary (has built-in retry logic)
    const cloudinaryUrl = await uploadToCloudinary(localPath, folder);
    
    console.log(`  ✅ Uploaded successfully: ${cloudinaryUrl}`);
    
    // Delete local/temp file after successful upload
    try {
      if (isTempFile || fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
        console.log(`  🗑️  Deleted ${isTempFile ? 'temp' : 'local'} file: ${localPath}`);
      }
    } catch (deleteError) {
      console.warn(`  ⚠️  Failed to delete file: ${localPath}`, deleteError);
    }
    
    return cloudinaryUrl;
  } catch (error: any) {
    console.error(`  ❌ Failed to migrate ${url} (${context}):`, error.message);
    return null; // Return null on error, keep original URL
  }
}

/**
 * Main migration function
 */
async function migrateAllImages() {
  console.log('🚀 Starting image migration to Cloudinary...\n');

  let totalProcessed = 0;
  let totalMigrated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  try {
    // 1. Migrate Restaurant logos
    console.log('📋 Migrating Restaurant logos...');
    const restaurants = await prisma.restaurant.findMany({
      where: { logoUrl: { not: null } },
    });

    for (const restaurant of restaurants) {
      if (!restaurant.logoUrl) continue;
      totalProcessed++;
      
      const cloudinaryUrl = await migrateImageUrl(
        restaurant.logoUrl,
        `Restaurant: ${restaurant.name} (${restaurant.id})`,
        'menu-logos'
      );

      if (cloudinaryUrl) {
        await prisma.restaurant.update({
          where: { id: restaurant.id },
          data: { logoUrl: cloudinaryUrl },
        });
        totalMigrated++;
      } else if (needsMigration(restaurant.logoUrl)) {
        totalErrors++;
      } else {
        totalSkipped++;
      }
    }
    console.log(`✅ Completed Restaurant logos\n`);

    // 2. Migrate Section illustrations
    console.log('📋 Migrating Section illustrations...');
    const sections = await prisma.section.findMany({
      where: { illustrationUrl: { not: null } },
    });

    for (const section of sections) {
      if (!section.illustrationUrl) continue;
      totalProcessed++;
      
      const cloudinaryUrl = await migrateImageUrl(
        section.illustrationUrl,
        `Section: ${section.id}`,
        'menu-illustrations'
      );

      if (cloudinaryUrl) {
        await prisma.section.update({
          where: { id: section.id },
          data: { illustrationUrl: cloudinaryUrl },
        });
        totalMigrated++;
      } else if (needsMigration(section.illustrationUrl)) {
        totalErrors++;
      } else {
        totalSkipped++;
      }
    }
    console.log(`✅ Completed Section illustrations\n`);

    // 3. Migrate MenuItem images
    console.log('📋 Migrating MenuItem images...');
    const menuItems = await prisma.menuItem.findMany({
      where: { imageUrl: { not: null } },
    });

    for (const item of menuItems) {
      if (!item.imageUrl) continue;
      totalProcessed++;
      
      const cloudinaryUrl = await migrateImageUrl(
        item.imageUrl,
        `MenuItem: ${item.id}`,
        'menu-items'
      );

      if (cloudinaryUrl) {
        await prisma.menuItem.update({
          where: { id: item.id },
          data: { imageUrl: cloudinaryUrl },
        });
        totalMigrated++;
      } else if (needsMigration(item.imageUrl)) {
        totalErrors++;
      } else {
        totalSkipped++;
      }
    }
    console.log(`✅ Completed MenuItem images\n`);

    // 4. Migrate AllergenIcon images
    console.log('📋 Migrating AllergenIcon images...');
    const allergenIcons = await prisma.allergenIcon.findMany();

    for (const allergen of allergenIcons) {
      if (!allergen.imageUrl) continue;
      totalProcessed++;
      
      const cloudinaryUrl = await migrateImageUrl(
        allergen.imageUrl,
        `AllergenIcon: ${allergen.name} (${allergen.id})`,
        'allergen-icons'
      );

      if (cloudinaryUrl) {
        await prisma.allergenIcon.update({
          where: { id: allergen.id },
          data: { imageUrl: cloudinaryUrl },
        });
        totalMigrated++;
      } else if (needsMigration(allergen.imageUrl)) {
        totalErrors++;
      } else {
        totalSkipped++;
      }
    }
    console.log(`✅ Completed AllergenIcon images\n`);

    // 5. Migrate Menu themeSettings (JSON field with coverPhotoUrl and backgroundIllustrationUrl)
    console.log('📋 Migrating Menu themeSettings...');
    const menus = await prisma.menu.findMany({
      where: { themeSettings: { not: null } },
    });

    for (const menu of menus) {
      if (!menu.themeSettings) continue;
      
      const themeSettings = menu.themeSettings as any;
      let updated = false;
      const updatedTheme = { ...themeSettings };

      // Migrate coverPhotoUrl
      if (themeSettings.coverPhotoUrl) {
        totalProcessed++;
        const cloudinaryUrl = await migrateImageUrl(
          themeSettings.coverPhotoUrl,
          `Menu themeSettings.coverPhotoUrl: ${menu.id}`,
          'menu-illustrations'
        );

        if (cloudinaryUrl) {
          updatedTheme.coverPhotoUrl = cloudinaryUrl;
          updated = true;
          totalMigrated++;
        } else if (needsMigration(themeSettings.coverPhotoUrl)) {
          totalErrors++;
        } else {
          totalSkipped++;
        }
      }

      // Migrate backgroundIllustrationUrl
      if (themeSettings.backgroundIllustrationUrl) {
        totalProcessed++;
        const cloudinaryUrl = await migrateImageUrl(
          themeSettings.backgroundIllustrationUrl,
          `Menu themeSettings.backgroundIllustrationUrl: ${menu.id}`,
          'menu-illustrations'
        );

        if (cloudinaryUrl) {
          updatedTheme.backgroundIllustrationUrl = cloudinaryUrl;
          updated = true;
          totalMigrated++;
        } else if (needsMigration(themeSettings.backgroundIllustrationUrl)) {
          totalErrors++;
        } else {
          totalSkipped++;
        }
      }

      // Update menu if any URLs were migrated
      if (updated) {
        await prisma.menu.update({
          where: { id: menu.id },
          data: { themeSettings: updatedTheme },
        });
      }
    }
    console.log(`✅ Completed Menu themeSettings\n`);

    // 6. Migrate ThemeSettings backgroundIllustrationUrl
    console.log('📋 Migrating ThemeSettings backgroundIllustrationUrl...');
    const themeSettings = await prisma.themeSettings.findMany({
      where: { backgroundIllustrationUrl: { not: null } },
    });

    for (const theme of themeSettings) {
      if (!theme.backgroundIllustrationUrl) continue;
      totalProcessed++;
      
      const cloudinaryUrl = await migrateImageUrl(
        theme.backgroundIllustrationUrl,
        `ThemeSettings: ${theme.id}`,
        'menu-illustrations'
      );

      if (cloudinaryUrl) {
        await prisma.themeSettings.update({
          where: { id: theme.id },
          data: { backgroundIllustrationUrl: cloudinaryUrl },
        });
        totalMigrated++;
      } else if (needsMigration(theme.backgroundIllustrationUrl)) {
        totalErrors++;
      } else {
        totalSkipped++;
      }
    }
    console.log(`✅ Completed ThemeSettings\n`);

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(50));
    console.log(`Total processed: ${totalProcessed}`);
    console.log(`✅ Successfully migrated: ${totalMigrated}`);
    console.log(`⏭️  Skipped (already Cloudinary/external): ${totalSkipped}`);
    console.log(`❌ Errors: ${totalErrors}`);
    if (totalErrors > 0) {
      console.log(`\n⚠️  Note: ${totalErrors} images failed to migrate.`);
      console.log(`   You can run the script again to retry failed uploads`);
      console.log(`   (it will skip already migrated images).`);
    }
    console.log('='.repeat(50));
    console.log('\n✨ Migration completed!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
if (require.main === module) {
  migrateAllImages()
    .then(() => {
      console.log('\n✅ Migration script finished successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateAllImages };

