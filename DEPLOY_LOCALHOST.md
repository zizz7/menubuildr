# Deploy on Localhost - Step by Step Guide

## ✅ What's Already Done

1. ✅ Environment files created (`server/.env` and `dashboard/.env.local`)
2. ✅ Dependencies installed
3. ✅ Prisma client generated

## ⚠️ Next Steps Required

### Step 1: Start PostgreSQL Database

**Option A: Check if PostgreSQL is installed**
```powershell
# Check if PostgreSQL service is running
Get-Service -Name "*postgresql*"
```

**Option B: Start PostgreSQL Service**
```powershell
# Start PostgreSQL service (adjust service name if different)
Start-Service postgresql-x64-14
# Or
net start postgresql-x64-14
```

**Option C: Install PostgreSQL (if not installed)**
- Download from: https://www.postgresql.org/download/windows/
- Install with default settings
- Remember the password you set for the `postgres` user

### Step 2: Update Database Credentials

Edit `server/.env` and update the `DATABASE_URL` with your actual PostgreSQL credentials:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/menu_management?schema=public"
```

Replace:
- `postgres` with your PostgreSQL username (usually `postgres`)
- `YOUR_PASSWORD` with your PostgreSQL password
- `5432` with your PostgreSQL port (usually `5432`)

### Step 3: Create Database (if needed)

**Option A: Let Prisma create it (recommended)**
```powershell
cd server
npm run db:push
```

**Option B: Create manually using pgAdmin**
1. Open pgAdmin
2. Connect to your PostgreSQL server
3. Right-click "Databases" → "Create" → "Database..."
4. Name: `menu_management`
5. Click "Save"

**Option C: Create using psql**
```powershell
psql -U postgres
CREATE DATABASE menu_management;
\q
```

### Step 4: Setup Database Schema

Once PostgreSQL is running and database exists:

```powershell
cd server
npm run db:push
npm run db:seed
```

This will:
- Create all database tables
- Seed with default admin user and languages

### Step 5: Start the Servers

**Option A: Run both together (from root)**
```powershell
cd C:\Users\Nazween\Videos\CCMMenu
npm run dev
```

**Option B: Run separately (recommended)**

Terminal 1 - Backend:
```powershell
cd C:\Users\Nazween\Videos\CCMMenu\server
npm run dev
```

Terminal 2 - Frontend:
```powershell
cd C:\Users\Nazween\Videos\CCMMenu\dashboard
npm run dev
```

### Step 6: Access the Application

- **Frontend Dashboard**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/api/health

### Step 7: Login

- **Email**: `admin@example.com`
- **Password**: `admin123`

## 🔧 Troubleshooting

### PostgreSQL Not Running

**Check if PostgreSQL is installed:**
```powershell
Get-Service | Where-Object {$_.Name -like "*postgres*"}
```

**Start PostgreSQL:**
```powershell
# Find the service name first
Get-Service | Where-Object {$_.Name -like "*postgres*"}

# Then start it (replace with actual service name)
Start-Service postgresql-x64-14
```

**Or use Services app:**
1. Press `Win + R`
2. Type `services.msc`
3. Find PostgreSQL service
4. Right-click → Start

### Database Connection Error

1. Verify PostgreSQL is running
2. Check `DATABASE_URL` in `server/.env`
3. Test connection:
   ```powershell
   psql -U postgres -h localhost
   ```

### Port Already in Use

If port 5000 or 3000 is in use:

**Change backend port:**
Edit `server/.env`:
```env
PORT=5001
```

Edit `dashboard/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5001/api
```

## 📋 Quick Checklist

- [ ] PostgreSQL installed and running
- [ ] Database credentials updated in `server/.env`
- [ ] Database `menu_management` created
- [ ] Schema pushed (`npm run db:push`)
- [ ] Database seeded (`npm run db:seed`)
- [ ] Backend server running (port 5000)
- [ ] Frontend server running (port 3000)
- [ ] Can access http://localhost:3000
- [ ] Can login with admin credentials

## 🚀 After Setup

Once everything is running:

1. Login at http://localhost:3000
2. Create your first restaurant
3. Customize theme
4. Create menus
5. Add sections and items
6. Publish menu to generate HTML

Enjoy! 🎉

