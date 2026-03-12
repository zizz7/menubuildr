# Simple Deployment Script
Write-Host "=== Menu Management System - Simple Deployment ===" -ForegroundColor Cyan
Write-Host ""

# Check Docker
Write-Host "Checking Docker..." -ForegroundColor Yellow
$dockerCheck = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker Desktop is not running!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please:" -ForegroundColor Yellow
    Write-Host "1. Start Docker Desktop" -ForegroundColor White
    Write-Host "2. Wait for it to fully start (30-60 seconds)" -ForegroundColor White
    Write-Host "3. Run this script again" -ForegroundColor White
    Write-Host ""
    Write-Host "Or press any key to try starting Docker Desktop..." -ForegroundColor Cyan
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    
    $dockerPath = "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerPath) {
        Start-Process $dockerPath
        Write-Host "Docker Desktop starting. Please wait 30-60 seconds and run this script again." -ForegroundColor Yellow
    }
    exit 1
}

Write-Host "Docker is running!" -ForegroundColor Green
Write-Host ""

# Check if container exists
Write-Host "Checking PostgreSQL container..." -ForegroundColor Yellow
$exists = docker ps -a --filter "name=postgres-menu" --format "{{.Names}}" 2>&1

if ($exists -match "postgres-menu") {
    $running = docker ps --filter "name=postgres-menu" --format "{{.Names}}" 2>&1
    if ($running -match "postgres-menu") {
        Write-Host "PostgreSQL container is running" -ForegroundColor Green
    } else {
        Write-Host "Starting existing container..." -ForegroundColor Yellow
        docker start postgres-menu
        Start-Sleep -Seconds 5
    }
} else {
    Write-Host "Creating PostgreSQL container..." -ForegroundColor Yellow
    docker run --name postgres-menu -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=menu_management -p 5432:5432 -d postgres:15
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Container created. Waiting 10 seconds..." -ForegroundColor Green
        Start-Sleep -Seconds 10
    } else {
        Write-Host "Failed to create container!" -ForegroundColor Red
        exit 1
    }
}

# Setup database
Write-Host ""
Write-Host "Setting up database..." -ForegroundColor Cyan
Set-Location "C:\Users\Nazween\Videos\CCMMenu\server"

# Ensure .env is correct
$envContent = @'
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/menu_management?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-in-production-min-32-characters-long"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV=development
FRONTEND_URL="http://localhost:3000"
TRANSLATION_API_KEY=""
TRANSLATION_API_PROVIDER="openai"
MAX_FILE_SIZE=5242880
UPLOAD_DIR="./uploads"
'@
$envContent | Out-File -FilePath ".env" -Encoding utf8 -Force

Write-Host "Pushing database schema..." -ForegroundColor Yellow
npm run db:push
if ($LASTEXITCODE -ne 0) {
    Write-Host "Retrying in 5 seconds..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    npm run db:push
}

Write-Host "Seeding database..." -ForegroundColor Yellow
npm run db:seed

Set-Location ..

# Start servers
Write-Host ""
Write-Host "=== Starting Servers ===" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Backend:  http://localhost:5000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Login: admin@example.com / admin123" -ForegroundColor Yellow
Write-Host ""

npm run dev

