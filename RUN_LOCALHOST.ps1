# Complete Localhost Setup and Run Script
# This script rebuilds, checks for bugs, and starts both servers

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Menu Management System" -ForegroundColor Cyan
Write-Host "  Complete Rebuild & Start" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to find available port
function Find-AvailablePort {
    param([int]$StartPort)
    $port = $StartPort
    while ($true) {
        $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if (-not $connection) {
            return $port
        }
        $port++
        if ($port -gt $StartPort + 10) {
            return $StartPort
        }
    }
}

# Step 1: Clean previous builds
Write-Host "Step 1: Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path "server\dist") {
    Remove-Item -Recurse -Force "server\dist"
    Write-Host "  ✓ Cleaned server build" -ForegroundColor Green
}
if (Test-Path "dashboard\.next") {
    Remove-Item -Recurse -Force "dashboard\.next"
    Write-Host "  ✓ Cleaned dashboard build" -ForegroundColor Green
}
Write-Host ""

# Step 2: Check and install dependencies
Write-Host "Step 2: Checking dependencies..." -ForegroundColor Yellow
Set-Location "server"
if (-not (Test-Path "node_modules")) {
    Write-Host "  Installing server dependencies..." -ForegroundColor Gray
    npm install --silent
}
Set-Location "..\dashboard"
if (-not (Test-Path "node_modules")) {
    Write-Host "  Installing dashboard dependencies..." -ForegroundColor Gray
    npm install --silent
}
Set-Location ".."
Write-Host "  ✓ Dependencies ready" -ForegroundColor Green
Write-Host ""

# Step 3: Rebuild backend
Write-Host "Step 3: Rebuilding backend..." -ForegroundColor Yellow
Set-Location "server"
$buildOutput = npm run build 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Backend build successful" -ForegroundColor Green
} else {
    Write-Host "  ❌ Backend build failed!" -ForegroundColor Red
    $buildOutput | Select-Object -First 10
    Set-Location ".."
    exit 1
}
Set-Location ".."
Write-Host ""

# Step 4: Check ports and find available ones
Write-Host "Step 4: Checking ports..." -ForegroundColor Yellow
$port5000 = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue

if ($port5000) {
    Write-Host "  ⚠ Port 5000 is in use. Finding alternative..." -ForegroundColor Yellow
    $backendPort = Find-AvailablePort -StartPort 5001
    Write-Host "    Using port $backendPort for backend" -ForegroundColor Cyan
} else {
    $backendPort = 5000
    Write-Host "  ✓ Port 5000 available for backend" -ForegroundColor Green
}

if ($port3000) {
    Write-Host "  ⚠ Port 3000 is in use. Finding alternative..." -ForegroundColor Yellow
    $frontendPort = Find-AvailablePort -StartPort 3001
    Write-Host "    Using port $frontendPort for frontend" -ForegroundColor Cyan
} else {
    $frontendPort = 3000
    Write-Host "  ✓ Port 3000 available for frontend" -ForegroundColor Green
}
Write-Host ""

# Step 5: Update frontend .env.local with correct API URL
Write-Host "Step 5: Configuring frontend..." -ForegroundColor Yellow
$envFile = "dashboard\.env.local"
$apiUrl = "http://localhost:$backendPort/api"
if (Test-Path $envFile) {
    $content = Get-Content $envFile -Raw
    if ($content -match "NEXT_PUBLIC_API_URL=") {
        $content = $content -replace "NEXT_PUBLIC_API_URL=.*", "NEXT_PUBLIC_API_URL=$apiUrl"
        Set-Content -Path $envFile -Value $content -NoNewline
    } else {
        Add-Content -Path $envFile -Value "`nNEXT_PUBLIC_API_URL=$apiUrl"
    }
} else {
    "NEXT_PUBLIC_API_URL=$apiUrl" | Out-File -FilePath $envFile -Encoding utf8
}
Write-Host "  ✓ Frontend configured for backend on port $backendPort" -ForegroundColor Green
Write-Host ""

# Step 6: Start backend server
Write-Host "Step 6: Starting backend server on port $backendPort..." -ForegroundColor Yellow
$backendPath = Join-Path $PSScriptRoot "server"
$backendCommand = "`$env:PORT='$backendPort'; cd '$backendPath'; Write-Host 'Backend Server - Port $backendPort' -ForegroundColor Cyan; Write-Host 'API: http://localhost:$backendPort/api' -ForegroundColor Gray; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCommand -WindowStyle Normal
Start-Sleep -Seconds 3
Write-Host "  ✓ Backend server starting..." -ForegroundColor Green
Write-Host ""

# Step 7: Start frontend server
Write-Host "Step 7: Starting frontend server on port $frontendPort..." -ForegroundColor Yellow
$frontendPath = Join-Path $PSScriptRoot "dashboard"
$frontendCommand = "cd '$frontendPath'; Write-Host 'Frontend Server - Port $frontendPort' -ForegroundColor Cyan; `$env:PORT='$frontendPort'; npm run dev -- -p $frontendPort"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCommand -WindowStyle Normal
Start-Sleep -Seconds 5
Write-Host "  ✓ Frontend server starting..." -ForegroundColor Green
Write-Host ""

# Step 8: Verify servers
Write-Host "Step 8: Verifying servers..." -ForegroundColor Yellow
Write-Host ""

$backendReady = $false
$maxAttempts = 15
$attempt = 0

while (-not $backendReady -and $attempt -lt $maxAttempts) {
    $attempt++
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:$backendPort/api/health" -Method GET -TimeoutSec 2 -ErrorAction Stop
        $backendReady = $true
        Write-Host "  ✅ Backend server is running!" -ForegroundColor Green
    } catch {
        Write-Host "    Attempt $attempt/$maxAttempts - Waiting for backend..." -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
}

if (-not $backendReady) {
    Write-Host "  ⚠ Backend server may still be starting. Check the backend window." -ForegroundColor Yellow
}

$frontendReady = Get-NetTCPConnection -LocalPort $frontendPort -ErrorAction SilentlyContinue
if ($frontendReady) {
    Write-Host "  ✅ Frontend server is running!" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Frontend server may still be starting. Check the frontend window." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Access your application:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:$frontendPort" -ForegroundColor White
Write-Host "   Backend:  http://localhost:$backendPort/api" -ForegroundColor White
Write-Host ""
Write-Host "🔑 Login Credentials:" -ForegroundColor Cyan
Write-Host "   Email:    admin@example.com" -ForegroundColor White
Write-Host "   Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host "📝 Notes:" -ForegroundColor Cyan
Write-Host "   - Both servers are running in separate windows" -ForegroundColor Gray
Write-Host "   - Close those windows to stop the servers" -ForegroundColor Gray
Write-Host "   - If backend doesn't start, check database connection" -ForegroundColor Gray
Write-Host "   - Run: cd server; npm run db:push; npm run db:seed (if needed)" -ForegroundColor Gray
Write-Host ""
Write-Host "Press any key to exit (servers will keep running)..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

