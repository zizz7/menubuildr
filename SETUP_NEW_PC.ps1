# CCMMenu Setup Script for New PC
# This script will install dependencies, restore database, and start servers
#
# Usage:
#   .\SETUP_NEW_PC.ps1
#   .\SETUP_NEW_PC.ps1 -DatabaseUser "postgres" -DatabasePassword "your_password"
#
# Note: If you get an execution policy error, run:
#   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

param(
    [string]$DatabaseUser = "postgres",
    [string]$DatabasePassword = "admin",
    [string]$DatabaseName = "menu_management",
    [string]$DatabaseHost = "localhost",
    [string]$DatabasePort = "5432"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CCMMenu Setup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get the script directory (where this script is located)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "Working directory: $ScriptDir" -ForegroundColor Gray
Write-Host ""

# Step 1: Check Prerequisites
Write-Host "Step 1: Checking Prerequisites..." -ForegroundColor Yellow
Write-Host ""

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Gray
try {
    $nodeVersion = node --version
    Write-Host "  ✓ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Node.js not found!" -ForegroundColor Red
    Write-Host "  Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check npm
Write-Host "Checking npm..." -ForegroundColor Gray
try {
    $npmVersion = npm --version
    Write-Host "  ✓ npm found: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ npm not found!" -ForegroundColor Red
    exit 1
}

# Check PostgreSQL
Write-Host "Checking PostgreSQL..." -ForegroundColor Gray
$pgDumpPath = $null
$pgRestorePath = $null
$psqlPath = $null

# Try to find PostgreSQL tools
$possiblePaths = @(
    "C:\Program Files\PostgreSQL\18\bin",
    "C:\Program Files\PostgreSQL\17\bin",
    "C:\Program Files\PostgreSQL\16\bin",
    "C:\Program Files\PostgreSQL\15\bin",
    "C:\Program Files\PostgreSQL\14\bin"
)

foreach ($pgPath in $possiblePaths) {
    if (Test-Path "$pgPath\pg_dump.exe") {
        $pgDumpPath = "$pgPath\pg_dump.exe"
        $pgRestorePath = "$pgPath\pg_restore.exe"
        $psqlPath = "$pgPath\psql.exe"
        Write-Host "  ✓ PostgreSQL found at: $pgPath" -ForegroundColor Green
        break
    }
}

if (-not $pgDumpPath) {
    # Try to find in PATH
    try {
        $whereResult = where.exe pg_dump 2>&1
        if ($LASTEXITCODE -eq 0) {
            $pgDumpPath = "pg_dump"
            $pgRestorePath = "pg_restore"
            $psqlPath = "psql"
            Write-Host "  ✓ PostgreSQL tools found in PATH" -ForegroundColor Green
        } else {
            throw "Not found"
        }
    } catch {
        Write-Host "  ✗ PostgreSQL not found!" -ForegroundColor Red
        Write-Host "  Please install PostgreSQL from https://www.postgresql.org/download/windows/" -ForegroundColor Red
        Write-Host "  Or add PostgreSQL bin directory to your PATH" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# Step 2: Check for backup file
Write-Host "Step 2: Checking for database backup..." -ForegroundColor Yellow
Write-Host ""

$backupFile = Get-ChildItem -Path $ScriptDir -Filter "database_backup_*.dump" | Sort-Object LastWriteTime -Descending | Select-Object -First 1

if (-not $backupFile) {
    Write-Host "  ✗ Database backup file not found!" -ForegroundColor Red
    Write-Host "  Expected file: database_backup_*.dump in $ScriptDir" -ForegroundColor Red
    exit 1
}

Write-Host "  ✓ Found backup file: $($backupFile.Name)" -ForegroundColor Green
Write-Host "  File size: $([math]::Round($backupFile.Length / 1MB, 2)) MB" -ForegroundColor Gray
Write-Host ""

# Step 3: Install Dependencies
Write-Host "Step 3: Installing Dependencies..." -ForegroundColor Yellow
Write-Host ""

# Root dependencies
Write-Host "Installing root dependencies..." -ForegroundColor Gray
if (Test-Path "package.json") {
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ✗ Failed to install root dependencies" -ForegroundColor Red
        exit 1
    }
    Write-Host "  ✓ Root dependencies installed" -ForegroundColor Green
} else {
    Write-Host "  ⚠ No root package.json found, skipping..." -ForegroundColor Yellow
}

# Dashboard dependencies
Write-Host "Installing dashboard dependencies..." -ForegroundColor Gray
if (Test-Path "dashboard\package.json") {
    Set-Location "dashboard"
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ✗ Failed to install dashboard dependencies" -ForegroundColor Red
        exit 1
    }
    Write-Host "  ✓ Dashboard dependencies installed" -ForegroundColor Green
    Set-Location $ScriptDir
} else {
    Write-Host "  ✗ dashboard\package.json not found!" -ForegroundColor Red
    exit 1
}

# Server dependencies
Write-Host "Installing server dependencies..." -ForegroundColor Gray
if (Test-Path "server\package.json") {
    Set-Location "server"
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ✗ Failed to install server dependencies" -ForegroundColor Red
        exit 1
    }
    Write-Host "  ✓ Server dependencies installed" -ForegroundColor Green
    Set-Location $ScriptDir
} else {
    Write-Host "  ✗ server\package.json not found!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 4: Setup Database
Write-Host "Step 4: Setting up Database..." -ForegroundColor Yellow
Write-Host ""

# Check if database exists
Write-Host "Checking if database exists..." -ForegroundColor Gray
$env:PGPASSWORD = $DatabasePassword
$checkDbQuery = "SELECT 1 FROM pg_database WHERE datname='$DatabaseName'"
$dbExists = & $psqlPath -U $DatabaseUser -h $DatabaseHost -p $DatabasePort -t -c $checkDbQuery 2>&1

if ($dbExists -match "1") {
    Write-Host "  ⚠ Database '$DatabaseName' already exists" -ForegroundColor Yellow
    $overwrite = Read-Host "  Do you want to drop and recreate it? (y/N)"
    if ($overwrite -eq "y" -or $overwrite -eq "Y") {
        Write-Host "  Dropping existing database..." -ForegroundColor Gray
        & $psqlPath -U $DatabaseUser -h $DatabaseHost -p $DatabasePort -c "DROP DATABASE IF EXISTS $DatabaseName;" 2>&1 | Out-Null
        Write-Host "  ✓ Database dropped" -ForegroundColor Green
    } else {
        Write-Host "  Skipping database creation, using existing database..." -ForegroundColor Yellow
        $skipDbCreation = $true
    }
}

if (-not $skipDbCreation) {
    # Create database
    Write-Host "Creating database '$DatabaseName'..." -ForegroundColor Gray
    $createDbResult = & $psqlPath -U $DatabaseUser -h $DatabaseHost -p $DatabasePort -c "CREATE DATABASE $DatabaseName;" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Database created" -ForegroundColor Green
    } else {
        if ($createDbResult -match "already exists") {
            Write-Host "  ⚠ Database already exists, continuing..." -ForegroundColor Yellow
        } else {
            Write-Host "  ✗ Failed to create database: $createDbResult" -ForegroundColor Red
            exit 1
        }
    }
}

# Restore database
Write-Host "Restoring database from backup..." -ForegroundColor Gray
$restoreResult = & $pgRestorePath -U $DatabaseUser -h $DatabaseHost -p $DatabasePort -d $DatabaseName -v "$($backupFile.FullName)" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Database restored successfully" -ForegroundColor Green
} else {
    Write-Host "  ✗ Database restore failed!" -ForegroundColor Red
    Write-Host "  Error: $restoreResult" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 5: Setup Environment Variables
Write-Host "Step 5: Setting up Environment Variables..." -ForegroundColor Yellow
Write-Host ""

# Check if .env exists in server folder
if (-not (Test-Path "server\.env")) {
    Write-Host "Creating server\.env file..." -ForegroundColor Gray
    
    $databaseUrl = "postgresql://${DatabaseUser}:${DatabasePassword}@${DatabaseHost}:${DatabasePort}/${DatabaseName}?schema=public"
    
    $envContent = @"
DATABASE_URL="$databaseUrl"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"
PORT=5000
FRONTEND_URL="http://localhost:3000"
CLOUDINARY_CLOUD_NAME="dso9iaztv"
CLOUDINARY_API_KEY="591231746157358"
CLOUDINARY_API_SECRET="NPlnwQ-bqniLh7Uq44D0qAuesVU"
MAX_FILE_SIZE="5242880"
"@
    
    $envContent | Out-File -FilePath "server\.env" -Encoding UTF8
    Write-Host "  ✓ Created server\.env file" -ForegroundColor Green
} else {
    Write-Host "  ⚠ server\.env already exists, skipping..." -ForegroundColor Yellow
    Write-Host "  Please verify DATABASE_URL is correct: postgresql://${DatabaseUser}:${DatabasePassword}@${DatabaseHost}:${DatabasePort}/${DatabaseName}?schema=public" -ForegroundColor Gray
}

# Check if .env.local exists in dashboard folder
if (-not (Test-Path "dashboard\.env.local")) {
    Write-Host "Creating dashboard\.env.local file..." -ForegroundColor Gray
    
    $dashboardEnvContent = @"
NEXT_PUBLIC_API_URL="http://localhost:5000/api"
"@
    
    $dashboardEnvContent | Out-File -FilePath "dashboard\.env.local" -Encoding UTF8
    Write-Host "  ✓ Created dashboard\.env.local file" -ForegroundColor Green
} else {
    Write-Host "  ⚠ dashboard\.env.local already exists, skipping..." -ForegroundColor Yellow
}

Write-Host ""

# Step 6: Generate Prisma Client
Write-Host "Step 6: Generating Prisma Client..." -ForegroundColor Yellow
Write-Host ""

Set-Location "server"
npm run db:generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Failed to generate Prisma client" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Prisma client generated" -ForegroundColor Green
Set-Location $ScriptDir

Write-Host ""

# Step 7: Start Servers
Write-Host "Step 7: Starting Servers..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Starting backend server (port 5000)..." -ForegroundColor Gray
Write-Host "Starting frontend server (port 3000)..." -ForegroundColor Gray
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Servers are starting in separate windows..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Access the application at:" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "  Backend API: http://localhost:5000" -ForegroundColor White
Write-Host ""
Write-Host "Default login credentials:" -ForegroundColor Cyan
Write-Host "  Email: admin@example.com" -ForegroundColor White
Write-Host "  Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C in each window to stop the servers" -ForegroundColor Gray
Write-Host ""

# Start backend server in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ScriptDir\server'; npm run dev"

# Wait a bit for backend to start
Start-Sleep -Seconds 3

# Start frontend server in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ScriptDir\dashboard'; npm run dev"

Write-Host "Both servers are starting in separate PowerShell windows." -ForegroundColor Green
Write-Host "This window will remain open. You can close it after verifying servers are running." -ForegroundColor Gray
Write-Host ""

