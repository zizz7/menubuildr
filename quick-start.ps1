# Quick Start Script for Localhost Deployment
Write-Host "=== Quick Start - Menu Management System ===" -ForegroundColor Cyan
Write-Host ""

# Check PostgreSQL
Write-Host "Checking PostgreSQL..." -ForegroundColor Yellow
$pgServices = Get-Service | Where-Object {$_.Name -like "*postgres*"}
if ($pgServices) {
    Write-Host "PostgreSQL services found:" -ForegroundColor Green
    $pgServices | ForEach-Object { Write-Host "  - $($_.Name): $($_.Status)" -ForegroundColor White }
    
    $stopped = $pgServices | Where-Object {$_.Status -ne "Running"}
    if ($stopped) {
        Write-Host ""
        Write-Host "Some PostgreSQL services are stopped. Starting..." -ForegroundColor Yellow
        $stopped | ForEach-Object {
            try {
                Start-Service $_.Name
                Write-Host "  ✓ Started $($_.Name)" -ForegroundColor Green
            } catch {
                Write-Host "  ✗ Failed to start $($_.Name)" -ForegroundColor Red
            }
        }
    }
} else {
    Write-Host "⚠ PostgreSQL not found. Please install PostgreSQL first." -ForegroundColor Red
    Write-Host "  Download from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "=== Database Setup ===" -ForegroundColor Cyan
Write-Host "Make sure you've updated server/.env with your PostgreSQL credentials!" -ForegroundColor Yellow
Write-Host ""
$continue = Read-Host "Continue with database setup? (y/n)"
if ($continue -ne "y") {
    Write-Host "Exiting. Please update server/.env first." -ForegroundColor Yellow
    exit 0
}

Set-Location server

Write-Host "Pushing database schema..." -ForegroundColor Yellow
npm run db:push
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "⚠ Database setup failed!" -ForegroundColor Red
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "  1. PostgreSQL is running" -ForegroundColor White
    Write-Host "  2. DATABASE_URL in server/.env is correct" -ForegroundColor White
    Write-Host "  3. Database 'menu_management' exists or can be created" -ForegroundColor White
    Set-Location ..
    exit 1
}

Write-Host "Seeding database..." -ForegroundColor Yellow
npm run db:seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠ Seeding failed, but continuing..." -ForegroundColor Yellow
}

Set-Location ..

Write-Host ""
Write-Host "=== Starting Servers ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting both servers..." -ForegroundColor Yellow
Write-Host "Frontend will be at: http://localhost:3000" -ForegroundColor Green
Write-Host "Backend will be at: http://localhost:5000" -ForegroundColor Green
Write-Host ""
Write-Host "Login: admin@example.com / admin123" -ForegroundColor Cyan
Write-Host ""

# Start both servers
npm run dev

