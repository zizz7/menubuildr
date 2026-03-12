# CCMMenu Setup Instructions for New PC

## Quick Setup

1. **Extract the zip file** to your desired location (e.g., `C:\Projects\CCMMenu`)

2. **If you get an execution policy error**, run this first:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

3. **Run the setup script**:
   ```powershell
   .\SETUP_NEW_PC.ps1
   ```
   
   Or with custom database credentials:
   ```powershell
   .\SETUP_NEW_PC.ps1 -DatabaseUser "postgres" -DatabasePassword "your_password"
   ```

4. **The script will automatically**:
   - Check for prerequisites (Node.js, npm, PostgreSQL)
   - Install all dependencies
   - Create and restore the database
   - Generate Prisma client
   - Start both frontend and backend servers

## Prerequisites

Before running the script, ensure you have:

1. **Node.js 18+** installed
   - Download from: https://nodejs.org/
   - Verify: `node --version`

2. **PostgreSQL** installed
   - Download from: https://www.postgresql.org/download/windows/
   - Default installation path: `C:\Program Files\PostgreSQL\18\bin`
   - The script will try to find it automatically

3. **PostgreSQL Service Running**
   - Make sure PostgreSQL service is running
   - Default port: 5432

## Database Configuration

The script uses these default values:
- **Username**: `postgres`
- **Password**: `admin`
- **Database**: `menu_management`
- **Host**: `localhost`
- **Port**: `5432`

If your PostgreSQL setup is different, you can pass parameters:

```powershell
.\SETUP_NEW_PC.ps1 -DatabaseUser "your_user" -DatabasePassword "your_password"
```

## What the Script Does

1. ✅ Checks prerequisites (Node.js, npm, PostgreSQL)
2. ✅ Finds the database backup file (`database_backup_*.dump`)
3. ✅ Installs dependencies:
   - Root dependencies
   - Dashboard dependencies
   - Server dependencies
4. ✅ Creates database (if it doesn't exist)
5. ✅ Restores database from backup
6. ✅ Creates `.env` files with correct configuration
7. ✅ Generates Prisma client
8. ✅ Starts backend server (port 5000)
9. ✅ Starts frontend server (port 3000)

## After Setup

Once the script completes:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

### Default Login Credentials:
- **Email**: `admin@example.com`
- **Password**: `admin123`

⚠️ **Change these credentials in production!**

## Troubleshooting

### PostgreSQL Not Found
- Make sure PostgreSQL is installed
- Add PostgreSQL bin directory to your PATH, or
- Install PostgreSQL in the default location: `C:\Program Files\PostgreSQL\18\`

### Database Connection Error
- Verify PostgreSQL service is running
- Check username and password in the script parameters
- Ensure database port (default 5432) is correct

### Port Already in Use
- Stop any existing servers on ports 3000 or 5000
- Or change ports in `.env` files

### Dependencies Installation Failed
- Check your internet connection
- Try running `npm install` manually in each folder

## Manual Steps (if script fails)

If the script fails, you can do these steps manually:

1. **Install dependencies**:
   ```powershell
   npm install
   cd dashboard && npm install && cd ..
   cd server && npm install && cd ..
   ```

2. **Create database**:
   ```powershell
   psql -U postgres
   CREATE DATABASE menu_management;
   \q
   ```

3. **Restore database**:
   ```powershell
   $env:PGPASSWORD='admin'
   pg_restore -U postgres -d menu_management -v "database_backup_2025-11-08T10-29-10.dump"
   ```

4. **Create .env files** (see script output for contents)

5. **Generate Prisma client**:
   ```powershell
   cd server
   npm run db:generate
   ```

6. **Start servers**:
   ```powershell
   # Terminal 1 - Backend
   cd server
   npm run dev

   # Terminal 2 - Frontend
   cd dashboard
   npm run dev
   ```

## Files Included in Backup

- ✅ All source code
- ✅ Database backup file
- ✅ Configuration files
- ✅ Prisma schema and migrations

## Files NOT Included (will be regenerated)

- ❌ `node_modules/` (installed by script)
- ❌ `dist/` folders (compiled code)
- ❌ `.env` files (created by script)
- ❌ Generated files

## Support

If you encounter issues:
1. Check the error messages in the script output
2. Verify all prerequisites are installed
3. Check PostgreSQL service is running
4. Review the manual steps above

