import fs from 'fs';
import path from 'path';

/**
 * Syncs uploads from server/uploads to dashboard/public/uploads
 * This ensures that uploaded files are accessible to the Next.js frontend
 * which serves static files from the public directory
 */
export function syncUploadsToPublic(): void {
  try {
    const serverUploadsDir = path.join(__dirname, '../../uploads');
    const publicUploadsDir = path.join(__dirname, '../../../dashboard/public/uploads');

    // Ensure public uploads directory exists
    if (!fs.existsSync(publicUploadsDir)) {
      fs.mkdirSync(publicUploadsDir, { recursive: true });
    }

    // Check if server uploads directory exists
    if (!fs.existsSync(serverUploadsDir)) {
      console.log('Server uploads directory does not exist, skipping sync');
      return;
    }

    // Get all subdirectories in server/uploads
    const subdirs = fs.readdirSync(serverUploadsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    // Sync each subdirectory
    for (const subdir of subdirs) {
      const sourceDir = path.join(serverUploadsDir, subdir);
      const targetDir = path.join(publicUploadsDir, subdir);

      // Ensure target directory exists
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Get all files in source directory
      const files = fs.readdirSync(sourceDir, { withFileTypes: true })
        .filter(dirent => dirent.isFile())
        .map(dirent => dirent.name);

      // Copy each file if it doesn't exist or is newer
      for (const file of files) {
        const sourceFile = path.join(sourceDir, file);
        const targetFile = path.join(targetDir, file);

        let shouldCopy = false;
        if (!fs.existsSync(targetFile)) {
          shouldCopy = true;
        } else {
          // Copy if source is newer
          const sourceStats = fs.statSync(sourceFile);
          const targetStats = fs.statSync(targetFile);
          if (sourceStats.mtime > targetStats.mtime) {
            shouldCopy = true;
          }
        }

        if (shouldCopy) {
          fs.copyFileSync(sourceFile, targetFile);
          console.log(`Synced: ${subdir}/${file}`);
        }
      }
    }

    console.log('Uploads sync completed');
  } catch (error) {
    console.error('Error syncing uploads to public directory:', error);
  }
}

/**
 * Copies a single file from server/uploads to dashboard/public/uploads
 */
export function copyFileToPublic(
  fieldname: string,
  filename: string
): void {
  try {
    const sourceFile = path.join(__dirname, '../../uploads', fieldname, filename);
    const targetDir = path.join(__dirname, '../../../dashboard/public/uploads', fieldname);
    const targetFile = path.join(targetDir, filename);

    // Ensure target directory exists
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Copy file
    if (fs.existsSync(sourceFile)) {
      fs.copyFileSync(sourceFile, targetFile);
      console.log(`Copied to public: ${fieldname}/${filename}`);
    } else {
      console.warn(`Source file not found: ${sourceFile}`);
    }
  } catch (error) {
    console.error(`Error copying file ${fieldname}/${filename} to public:`, error);
  }
}

