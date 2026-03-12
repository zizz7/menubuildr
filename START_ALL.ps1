# Start All Services Script - Auto Port Detection
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting Menu Management System" -ForegroundColor Cyan
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
            Write-Host "⚠ Could not find available port near $StartPort" -ForegroundColor Yellow
            return $StartPort
        }
    }
}

# Check and free ports if needed
Write-Host "Checking ports..." -ForegroundColor Yellow
$port5000 = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue

if ($port5000) {
    Write-Host "⚠ Port 5000 is in use. Finding alternative..." -ForegroundColor Yellow
    $backendPort = Find-AvailablePort -StartPort 5001
    Write-Host "   Using port $backendPort for backend" -ForegroundColor Cyan
    $env:PORT = $backendPort
} else {
    $backendPort = 5000
    Write-Host "✅ Port 5000 is available for backend" -ForegroundColor Green
}

if ($port3000) {
    Write-Host "⚠ Port 3000 is in use. Finding alternative..." -ForegroundColor Yellow
    $frontendPort = Find-AvailablePort -StartPort 3001
    Write-Host "   Using port $frontendPort for frontend" -ForegroundColor Cyan
} else {
    $frontendPort = 3000
    Write-Host "✅ Port 3000 is available for frontend" -ForegroundColor Green
}

# Update frontend .env.local if port changed
if ($backendPort -ne 5000) {
    $envFile = "dashboard\.env.local"
    if (Test-Path $envFile) {
        $content = Get-Content $envFile -Raw
        $content = $content -replace "NEXT_PUBLIC_API_URL=.*", "NEXT_PUBLIC_API_URL=http://localhost:$backendPort/api"
        Set-Content -Path $envFile -Value $content -NoNewline
        Write-Host "✅ Updated frontend API URL to port $backendPort" -ForegroundColor Green
    } else {
        "NEXT_PUBLIC_API_URL=http://localhost:$backendPort/api" | Out-File -FilePath $envFile -Encoding utf8
        Write-Host "✅ Created frontend .env.local with port $backendPort" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Starting servers..." -ForegroundColor Green
Write-Host ""

# Start backend
Write-Host "Starting backend server on port $backendPort..." -ForegroundColor Cyan
$backendPath = Join-Path $PSScriptRoot "server"
$backendScript = @"
`$env:PORT = '$backendPort'
cd '$backendPath'
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  Backend Server' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host 'Port: $backendPort' -ForegroundColor Green
Write-Host 'API: http://localhost:$backendPort/api' -ForegroundColor Cyan
Write-Host 'Health: http://localhost:$backendPort/api/health' -ForegroundColor Gray
Write-Host ''
npm run dev
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendScript -WindowStyle Normal

Start-Sleep -Seconds 3

# Start frontend
Write-Host "Starting frontend server on port $frontendPort..." -ForegroundColor Cyan
$frontendPath = Join-Path $PSScriptRoot "dashboard"
$frontendScript = @"
cd '$frontendPath'
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  Frontend Server' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host 'Port: $frontendPort' -ForegroundColor Green
Write-Host 'URL: http://localhost:$frontendPort' -ForegroundColor Cyan
Write-Host ''
`$env:PORT = '$frontendPort'
npm run dev -- -p $frontendPort
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendScript -WindowStyle Normal

Start-Sleep -Seconds 5

# Verify servers
Write-Host ""
Write-Host "Verifying servers..." -ForegroundColor Yellow
Write-Host ""

$backendReady = $false
$maxAttempts = 10
$attempt = 0

while (-not $backendReady -and $attempt -lt $maxAttempts) {
    $attempt++
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:$backendPort/api/health" -Method GET -TimeoutSec 2 -ErrorAction Stop
        $backendReady = $true
        Write-Host "✅ Backend server is running on port $backendPort!" -ForegroundColor Green
    } catch {
        Write-Host "   Attempt $attempt/$maxAttempts - Waiting for backend..." -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
}

if (-not $backendReady) {
    Write-Host "⚠ Backend server may still be starting. Check the backend window." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Servers Started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Access the application:" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:$frontendPort" -ForegroundColor White
Write-Host "  Backend:  http://localhost:$backendPort" -ForegroundColor White
Write-Host "  API:      http://localhost:$backendPort/api" -ForegroundColor White
Write-Host ""
Write-Host "Login Credentials:" -ForegroundColor Cyan
Write-Host "  Email:    admin@example.com" -ForegroundColor White
Write-Host "  Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host "Both servers are running in separate windows." -ForegroundColor Yellow
Write-Host "Close those windows to stop the servers." -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to exit this script (servers will keep running)..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

