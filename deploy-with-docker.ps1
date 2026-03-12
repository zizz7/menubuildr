# Deploy with Docker PostgreSQL
Write-Host "=== Deploying Menu Management System with Docker ===" -ForegroundColor Cyan
Write-Host ""

# Check if Docker Desktop is running
Write-Host "Checking Docker Desktop..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "✓ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "⚠ Docker Desktop is not running!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please:" -ForegroundColor Yellow
    Write-Host "1. Start Docker Desktop" -ForegroundColor White
    Write-Host "2. Wait for it to fully start" -ForegroundColor White
    Write-Host "3. Run this script again" -ForegroundColor White
    Write-Host ""
    Write-Host "Or press any key to try starting PostgreSQL container anyway..." -ForegroundColor Cyan
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

# Check if container already exists
Write-Host ""
Write-Host "Checking for existing PostgreSQL container..." -ForegroundColor Yellow
$existing = docker ps -a --filter "name=postgres-menu" --format "{{.Names}}" 2>&1

if ($existing -match "postgres-menu") {
    Write-Host "Found existing container. Checking status..." -ForegroundColor Yellow
    $status = docker ps --filter "name=postgres-menu" --format "{{.Status}}" 2>&1
    
    if ($status -match "Up") {
        Write-Host "✓ PostgreSQL container is already running" -ForegroundColor Green
    } else {
        Write-Host "Starting existing container..." -ForegroundColor Yellow
        docker start postgres-menu
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Container started" -ForegroundColor Green
        } else {
            Write-Host "✗ Failed to start container" -ForegroundColor Red
            exit 1
        }
    }
} else {
    Write-Host "Creating new PostgreSQL container..." -ForegroundColor Yellow
    docker run --name postgres-menu `
        -e POSTGRES_PASSWORD=postgres `
        -e POSTGRES_DB=menu_management `
        -p 5432:5432 `
        -d postgres:15
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ PostgreSQL container created and started" -ForegroundColor Green
        Write-Host "Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
    } else {
        Write-Host "✗ Failed to create container" -ForegroundColor Red
        exit 1
    }
}

# Wait for PostgreSQL to be ready
Write-Host "Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0
$ready = $false

while ($attempt -lt $maxAttempts -and -not $ready) {
    try {
        $result = docker exec postgres-menu pg_isready -U postgres 2>&1
        if ($result -match "accepting connections") {
            $ready = $true
            Write-Host "✓ PostgreSQL is ready!" -ForegroundColor Green
        }
    } catch {
        # Continue waiting
    }
    
    if (-not $ready) {
        $attempt++
        Start-Sleep -Seconds 1
        Write-Host "." -NoNewline -ForegroundColor Gray
    }
}

if (-not $ready) {
    Write-Host ""
    Write-Host "⚠ PostgreSQL may not be ready yet, but continuing..." -ForegroundColor Yellow
}

# Setup database
Write-Host ""
Write-Host "=== Setting up Database ===" -ForegroundColor Cyan
Set-Location "C:\Users\Nazween\Videos\CCMMenu\server"

# Ensure .env has correct Docker PostgreSQL settings
$envFile = ".env"
$envContent = Get-Content $envFile -Raw -ErrorAction SilentlyContinue

if ($envContent -notmatch "postgresql://postgres:postgres@localhost:5432") {
    Write-Host "Updating .env with Docker PostgreSQL settings..." -ForegroundColor Yellow
    $newEnv = @"
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
"@
    $newEnv | Out-File -FilePath $envFile -Encoding utf8
    Write-Host "✓ Updated server/.env" -ForegroundColor Green
}

Write-Host "Pushing database schema..." -ForegroundColor Yellow
npm run db:push
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠ Database push failed. Retrying in 3 seconds..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    npm run db:push
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Database setup failed!" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
}

Write-Host "Seeding database..." -ForegroundColor Yellow
npm run db:seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠ Seeding failed, but continuing..." -ForegroundColor Yellow
}

Set-Location ..

Write-Host ""
Write-Host "=== Starting Application Servers ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "✓ Database setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Starting servers..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host "Backend:  http://localhost:5000" -ForegroundColor Green
Write-Host ""
Write-Host "Login credentials:" -ForegroundColor Cyan
Write-Host "  Email:    admin@example.com" -ForegroundColor White
Write-Host "  Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop servers" -ForegroundColor Gray
Write-Host ""

# Start both servers
npm run dev

