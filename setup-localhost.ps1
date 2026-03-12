# Setup script for localhost deployment
Write-Host "=== Menu Management System - Localhost Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if .env files exist
$serverEnv = "server\.env"
$dashboardEnv = "dashboard\.env.local"

if (-not (Test-Path $serverEnv)) {
    Write-Host "Creating server/.env file..." -ForegroundColor Yellow
    @"
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/menu_management?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production-min-32-characters-long"
JWT_EXPIRES_IN="7d"

# Server
PORT=5000
NODE_ENV=development

# CORS
FRONTEND_URL="http://localhost:3000"

# Translation API (optional)
TRANSLATION_API_KEY=""
TRANSLATION_API_PROVIDER="openai"

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_DIR="./uploads"
"@ | Out-File -FilePath $serverEnv -Encoding utf8
    Write-Host "✓ Created server/.env" -ForegroundColor Green
} else {
    Write-Host "✓ server/.env already exists" -ForegroundColor Green
}

if (-not (Test-Path $dashboardEnv)) {
    Write-Host "Creating dashboard/.env.local file..." -ForegroundColor Yellow
    @"
# API
NEXT_PUBLIC_API_URL=http://localhost:5000/api
"@ | Out-File -FilePath $dashboardEnv -Encoding utf8
    Write-Host "✓ Created dashboard/.env.local" -ForegroundColor Green
} else {
    Write-Host "✓ dashboard/.env.local already exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== IMPORTANT: Update Database Credentials ===" -ForegroundColor Yellow
Write-Host "Please edit server/.env and update DATABASE_URL with your PostgreSQL credentials:" -ForegroundColor Yellow
Write-Host "  DATABASE_URL=`"postgresql://USERNAME:PASSWORD@localhost:5432/menu_management?schema=public`"" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to continue with database setup..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Database setup
Write-Host ""
Write-Host "=== Setting up Database ===" -ForegroundColor Cyan
Set-Location server

Write-Host "Generating Prisma client..." -ForegroundColor Yellow
npm run db:generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error generating Prisma client!" -ForegroundColor Red
    exit 1
}

Write-Host "Pushing database schema..." -ForegroundColor Yellow
npm run db:push
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error pushing schema! Make sure PostgreSQL is running and DATABASE_URL is correct." -ForegroundColor Red
    exit 1
}

Write-Host "Seeding database..." -ForegroundColor Yellow
npm run db:seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error seeding database!" -ForegroundColor Red
    exit 1
}

Set-Location ..

Write-Host ""
Write-Host "=== Setup Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "To start the servers, run:" -ForegroundColor Cyan
Write-Host "  Terminal 1: cd server && npm run dev" -ForegroundColor White
Write-Host "  Terminal 2: cd dashboard && npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Or use: npm run dev (from root directory)" -ForegroundColor White
Write-Host ""
Write-Host "Then visit: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Login: admin@example.com / admin123" -ForegroundColor Cyan

