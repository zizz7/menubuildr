# Complete Deployment Script
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Menu Management System Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to start Docker Desktop
function Start-DockerDesktop {
    Write-Host "Attempting to start Docker Desktop..." -ForegroundColor Yellow
    $dockerPath = "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerPath) {
        Start-Process $dockerPath
        Write-Host "✓ Docker Desktop starting..." -ForegroundColor Green
        Write-Host "Waiting for Docker to be ready (this may take 30-60 seconds)..." -ForegroundColor Yellow
        $maxWait = 60
        $waited = 0
        while ($waited -lt $maxWait) {
            try {
                docker ps | Out-Null
                Write-Host "✓ Docker is ready!" -ForegroundColor Green
                return $true
            } catch {
                Start-Sleep -Seconds 2
                $waited += 2
                Write-Host "." -NoNewline -ForegroundColor Gray
            }
        }
        Write-Host ""
        Write-Host "⚠ Docker may still be starting. Continuing anyway..." -ForegroundColor Yellow
        return $false
    } else {
        Write-Host "⚠ Docker Desktop not found at expected location" -ForegroundColor Yellow
        return $false
    }
}

# Check Docker
Write-Host "Step 1: Checking Docker..." -ForegroundColor Cyan
$dockerError = $false
try {
    docker ps 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Docker is running" -ForegroundColor Green
        $dockerReady = $true
    } else {
        $dockerError = $true
    }
} catch {
    $dockerError = $true
}

if ($dockerError) {
    Write-Host "⚠ Docker is not running" -ForegroundColor Yellow
    $startDocker = Read-Host "Start Docker Desktop now? (y/n)"
    if ($startDocker -eq "y") {
        $dockerReady = Start-DockerDesktop
    } else {
        Write-Host "Please start Docker Desktop manually and run this script again." -ForegroundColor Yellow
        exit 1
    }
}

# Start PostgreSQL in Docker
Write-Host ""
Write-Host "Step 2: Setting up PostgreSQL in Docker..." -ForegroundColor Cyan

$containerExists = docker ps -a --filter "name=postgres-menu" --format "{{.Names}}" 2>&1

if ($containerExists -match "postgres-menu") {
    Write-Host "Container exists. Checking status..." -ForegroundColor Yellow
    $isRunning = docker ps --filter "name=postgres-menu" --format "{{.Names}}" 2>&1
    
    if ($isRunning -match "postgres-menu") {
        Write-Host "✓ PostgreSQL container is running" -ForegroundColor Green
    } else {
        Write-Host "Starting container..." -ForegroundColor Yellow
        docker start postgres-menu
        Start-Sleep -Seconds 3
    }
} else {
    Write-Host "Creating PostgreSQL container..." -ForegroundColor Yellow
    docker run --name postgres-menu `
        -e POSTGRES_PASSWORD=postgres `
        -e POSTGRES_DB=menu_management `
        -p 5432:5432 `
        -d postgres:15
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Container created" -ForegroundColor Green
        Write-Host "Waiting for PostgreSQL to initialize..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
    } else {
        Write-Host "✗ Failed to create container" -ForegroundColor Red
        exit 1
    }
}

# Wait for PostgreSQL to be ready
Write-Host "Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
$ready = $false
for ($i = 0; $i -lt 20; $i++) {
    try {
        $result = docker exec postgres-menu pg_isready -U postgres 2>&1
        if ($result -match "accepting connections") {
            $ready = $true
            break
        }
    } catch {}
    Start-Sleep -Seconds 1
    Write-Host "." -NoNewline -ForegroundColor Gray
}
Write-Host ""

if ($ready) {
    Write-Host "✓ PostgreSQL is ready!" -ForegroundColor Green
} else {
    Write-Host "⚠ PostgreSQL may not be fully ready, but continuing..." -ForegroundColor Yellow
}

# Setup database
Write-Host ""
Write-Host "Step 3: Setting up database..." -ForegroundColor Cyan
Set-Location "C:\Users\Nazween\Videos\CCMMenu\server"

# Update .env for Docker PostgreSQL
$envContent = @"
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
$envContent | Out-File -FilePath ".env" -Encoding utf8 -Force
Write-Host "✓ Updated server/.env" -ForegroundColor Green

Write-Host "Generating Prisma client..." -ForegroundColor Yellow
npm run db:generate | Out-Null
Write-Host "✓ Prisma client generated" -ForegroundColor Green

Write-Host "Pushing database schema..." -ForegroundColor Yellow
npm run db:push
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠ First attempt failed, retrying in 5 seconds..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    npm run db:push
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Database setup failed!" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
}
Write-Host "✓ Database schema created" -ForegroundColor Green

Write-Host "Seeding database..." -ForegroundColor Yellow
npm run db:seed
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Database seeded" -ForegroundColor Green
} else {
    Write-Host "⚠ Seeding had issues, but continuing..." -ForegroundColor Yellow
}

Set-Location ..

# Start servers
Write-Host ""
Write-Host "Step 4: Starting application servers..." -ForegroundColor Cyan
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Access the application:" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "  Backend:  http://localhost:5000" -ForegroundColor White
Write-Host ""
Write-Host "Login credentials:" -ForegroundColor Cyan
Write-Host "  Email:    admin@example.com" -ForegroundColor White
Write-Host "  Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop servers" -ForegroundColor Gray
Write-Host ""

# Start both servers
npm run dev

