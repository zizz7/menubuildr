import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  // Try parent directory
  const parentEnvPath = path.join(__dirname, '../../.env');
  if (fs.existsSync(parentEnvPath)) {
    dotenv.config({ path: parentEnvPath });
  }
}

const execAsync = promisify(exec);

async function backupDatabase() {
  try {
    // Get database URL from environment
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not found in environment variables');
    }

    // Parse database URL to extract connection details
    const url = new URL(databaseUrl);
    const username = url.username || 'postgres';
    const password = url.password || '';
    const host = url.hostname || 'localhost';
    const port = url.port || '5432';
    const database = url.pathname.slice(1).split('?')[0] || 'menu_management';

    console.log('Database Connection Details:');
    console.log(`  Username: ${username}`);
    console.log(`  Password: ${password || '(empty)'}`);
    console.log(`  Host: ${host}`);
    console.log(`  Port: ${port}`);
    console.log(`  Database: ${database}`);
    console.log('');

    // Create backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupDir = path.join(__dirname, '../../..');
    const backupFile = path.join(backupDir, `database_backup_${timestamp}.sql`);
    const backupFileDump = path.join(backupDir, `database_backup_${timestamp}.dump`);

    console.log('Attempting to create backup...');

    // Try to find pg_dump in common locations
    const possiblePaths = [
      'pg_dump', // In PATH
      'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe',
      'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe',
      'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe',
      'C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe',
      'C:\\Program Files\\PostgreSQL\\14\\bin\\pg_dump.exe',
      'C:\\Program Files\\PostgreSQL\\13\\bin\\pg_dump.exe',
      'C:\\Program Files\\PostgreSQL\\12\\bin\\pg_dump.exe',
    ];

    let pgDumpPath = null;
    for (const possiblePath of possiblePaths) {
      try {
        if (possiblePath === 'pg_dump') {
          // Check if it's in PATH
          await execAsync('where pg_dump');
          pgDumpPath = 'pg_dump';
          break;
        } else if (fs.existsSync(possiblePath)) {
          pgDumpPath = possiblePath;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!pgDumpPath) {
      throw new Error(
        'pg_dump not found. Please ensure PostgreSQL is installed and pg_dump is in your PATH, ' +
        'or install PostgreSQL from https://www.postgresql.org/download/windows/'
      );
    }

    console.log(`Using pg_dump at: ${pgDumpPath}`);

    // Set password as environment variable
    const env = { ...process.env, PGPASSWORD: password };

    // Create backup using pg_dump (custom format - compressed)
    const dumpCommand = `"${pgDumpPath}" -U ${username} -h ${host} -p ${port} -d ${database} -F c -f "${backupFileDump}"`;
    
    console.log('Creating compressed backup (custom format)...');
    const { stdout, stderr } = await execAsync(dumpCommand, { env });
    
    if (stderr && !stderr.includes('WARNING')) {
      console.warn('Warnings:', stderr);
    }

    if (fs.existsSync(backupFileDump)) {
      const stats = fs.statSync(backupFileDump);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log('');
      console.log('✅ Backup created successfully!');
      console.log('');
      console.log('📁 Backup File Location:');
      console.log(`   ${backupFileDump}`);
      console.log('');
      console.log(`📊 File Size: ${fileSizeMB} MB`);
      console.log('');
      console.log('📋 Database Connection Details (for restore):');
      console.log(`   Username: ${username}`);
      console.log(`   Password: ${password || '(empty)'}`);
      console.log(`   Database: ${database}`);
      console.log('');
      console.log('To restore on new PC:');
      console.log(`   pg_restore -U ${username} -d ${database} "${backupFileDump}"`);
      
      return backupFileDump;
    } else {
      throw new Error('Backup file was not created');
    }
  } catch (error: any) {
    console.error('❌ Backup failed:', error.message);
    if (error.message.includes('pg_dump not found')) {
      console.error('');
      console.error('Please install PostgreSQL or add pg_dump to your PATH.');
      console.error('Download from: https://www.postgresql.org/download/windows/');
    }
    throw error;
  }
}

// Run backup
if (require.main === module) {
  backupDatabase()
    .then((backupPath) => {
      console.log('');
      console.log('✨ Backup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('');
      console.error('❌ Backup failed:', error);
      process.exit(1);
    });
}

export { backupDatabase };

