# Install PostgreSQL and Deploy Application
Write-Host "=== PostgreSQL Setup and Deployment ===" -ForegroundColor Cyan
Write-Host ""

# Check if PostgreSQL is installed
$pgPath = "C:\Program Files\PostgreSQL"
$pgInstalled = Test-Path $pgPath

if (-not $pgInstalled) {
    Write-Host "PostgreSQL is not installed." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Cyan
    Write-Host "1. Install PostgreSQL manually:" -ForegroundColor White
    Write-Host "   - Download: https://www.postgresql.org/download/windows/" -ForegroundColor Gray
    Write-Host "   - Or use: winget install PostgreSQL.PostgreSQL" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Use Docker (if you have Docker installed):" -ForegroundColor White
    Write-Host "   docker run --name postgres-menu -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=menu_management -p 5432:5432 -d postgres" -ForegroundColor Gray
    Write-Host ""
    
    $choice = Read-Host "Do you want to try installing via winget? (y/n)"
    if ($choice -eq "y") {
        Write-Host "Attempting to install PostgreSQL via winget..." -ForegroundColor Yellow
        winget install PostgreSQL.PostgreSQL --accept-package-agreements --accept-source-agreements
        if ($LASTEXITCODE -eq 0) {
            Write-Host "PostgreSQL installed! Please restart this script after installation completes." -ForegroundColor Green
            exit 0
        } else {
            Write-Host "Winget installation failed. Please install PostgreSQL manually." -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "Please install PostgreSQL manually and run this script again." -ForegroundColor Yellow
        exit 1
    }
}

# Find PostgreSQL service
Write-Host "Looking for PostgreSQL services..." -ForegroundColor Yellow
$pgServices = Get-Service | Where-Object {
    $_.Name -like "*postgres*" -or $_.DisplayName -like "*PostgreSQL*"
}

if ($pgServices) {
    Write-Host "Found PostgreSQL services:" -ForegroundColor Green
    $pgServices | ForEach-Object {
        Write-Host "  - $($_.Name): $($_.Status)" -ForegroundColor White
    }
    
    # Try to start stopped services
    $stopped = $pgServices | Where-Object {$_.Status -ne "Running"}
    if ($stopped) {
        Write-Host ""
        Write-Host "Starting PostgreSQL services..." -ForegroundColor Yellow
        foreach ($service in $stopped) {
            try {
                Start-Service $service.Name -ErrorAction Stop
                Write-Host "  ✓ Started $($service.Name)" -ForegroundColor Green
                Start-Sleep -Seconds 2
            } catch {
                Write-Host "  ✗ Failed to start $($service.Name): $_" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "All PostgreSQL services are running!" -ForegroundColor Green
    }
} else {
    Write-Host "⚠ No PostgreSQL services found." -ForegroundColor Red
    Write-Host "Please ensure PostgreSQL is installed and configured." -ForegroundColor Yellow
    exit 1
}

# Wait a moment for services to fully start
Start-Sleep -Seconds 3

# Check if we can connect
Write-Host ""
Write-Host "Testing PostgreSQL connection..." -ForegroundColor Yellow
$env:PGPASSWORD = "postgres"
$testConnection = & "C:\Program Files\PostgreSQL\*\bin\psql.exe" -U postgres -h localhost -c "SELECT version();" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ PostgreSQL is accessible!" -ForegroundColor Green
} else {
    Write-Host "⚠ Could not connect to PostgreSQL." -ForegroundColor Yellow
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "  1. PostgreSQL is running" -ForegroundColor White
    Write-Host "  2. Password in server/.env matches your PostgreSQL password" -ForegroundColor White
    Write-Host "  3. Port 5432 is not blocked" -ForegroundColor White
}

# Continue with deployment
Write-Host ""
Write-Host "=== Setting up Database ===" -ForegroundColor Cyan
Set-Location "C:\Users\Nazween\Videos\CCMMenu\server"

# Update .env if needed
Write-Host "Checking database configuration..." -ForegroundColor Yellow
$envContent = Get-Content .env -Raw
if ($envContent -notmatch "DATABASE_URL.*postgres") {
    Write-Host "⚠ Please update server/.env with your PostgreSQL password!" -ForegroundColor Yellow
    Write-Host "  DATABASE_URL=`"postgresql://postgres:YOUR_PASSWORD@localhost:5432/menu_management?schema=public`"" -ForegroundColor White
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 1
    }
}

Write-Host "Pushing database schema..." -ForegroundColor Yellow
npm run db:push
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠ Database setup failed!" -ForegroundColor Red
    Write-Host "Please check your DATABASE_URL in server/.env" -ForegroundColor Yellow
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
Write-Host "Starting backend and frontend servers..." -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host "Backend: http://localhost:5000" -ForegroundColor Green
Write-Host ""
Write-Host "Login: admin@example.com / admin123" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop servers" -ForegroundColor Gray
Write-Host ""

# Start both servers
npm run dev

