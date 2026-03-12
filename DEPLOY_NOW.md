# 🚀 Quick Deployment Instructions

## Current Status
- ✅ Environment files created
- ✅ Dependencies installed  
- ✅ Prisma client generated
- ⚠️ **Docker Desktop needs to be started**

## Step-by-Step Deployment

### 1. Start Docker Desktop

**Option A: Start Manually**
- Open Docker Desktop from Start Menu
- Wait until it shows "Docker Desktop is running" (30-60 seconds)

**Option B: Start via Command**
```powershell
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
# Wait 30-60 seconds
```

### 2. Run These Commands

Once Docker Desktop is running, execute these commands in PowerShell:

```powershell
# Navigate to project
cd C:\Users\Nazween\Videos\CCMMenu

# Start PostgreSQL in Docker
docker run --name postgres-menu -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=menu_management -p 5432:5432 -d postgres:15

# Wait 10 seconds for PostgreSQL to start
Start-Sleep -Seconds 10

# Setup database
cd server
npm run db:push
npm run db:seed
cd ..

# Start servers
npm run dev
```

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000
- **Login**: admin@example.com / admin123

## Alternative: If Docker Fails

If you prefer to install PostgreSQL directly:

1. **Download PostgreSQL**: https://www.postgresql.org/download/windows/
2. **Install** with default settings
3. **Update** `server/.env` with your PostgreSQL password:
   ```env
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/menu_management?schema=public"
   ```
4. **Run**:
   ```powershell
   cd server
   npm run db:push
   npm run db:seed
   cd ..
   npm run dev
   ```

## Quick Commands Summary

```powershell
# 1. Start Docker Desktop (wait 30-60 seconds)

# 2. Run these:
cd C:\Users\Nazween\Videos\CCMMenu
docker run --name postgres-menu -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=menu_management -p 5432:5432 -d postgres:15
Start-Sleep -Seconds 10
cd server
npm run db:push
npm run db:seed
cd ..
npm run dev
```

That's it! 🎉

