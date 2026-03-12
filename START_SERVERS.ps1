# Start Both Servers Script
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting Menu Management System" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if ports are in use
Write-Host "Checking ports..." -ForegroundColor Yellow
$port5000 = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue

if ($port5000) {
    Write-Host "⚠ Port 5000 is in use. Stopping existing process..." -ForegroundColor Yellow
    $pid = $port5000.OwningProcess
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

if ($port3000) {
    Write-Host "⚠ Port 3000 is in use. Stopping existing process..." -ForegroundColor Yellow
    $pid = $port3000.OwningProcess
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# Start backend
Write-Host ""
Write-Host "Starting backend server..." -ForegroundColor Green
$backendPath = Join-Path $PSScriptRoot "server"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; Write-Host 'Backend Server - Port 5000' -ForegroundColor Cyan; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 3

# Start frontend
Write-Host "Starting frontend server..." -ForegroundColor Green
$frontendPath = Join-Path $PSScriptRoot "dashboard"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; Write-Host 'Frontend Server - Port 3000' -ForegroundColor Cyan; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 5

# Verify servers
Write-Host ""
Write-Host "Verifying servers..." -ForegroundColor Yellow

try {
    $backend = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method GET -TimeoutSec 3
    Write-Host "✅ Backend server is running!" -ForegroundColor Green
} catch {
    Write-Host "⚠ Backend server may still be starting..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Servers Started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Access the application:" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "  Backend:  http://localhost:5000" -ForegroundColor White
Write-Host ""
Write-Host "Login:" -ForegroundColor Cyan
Write-Host "  Email:    admin@example.com" -ForegroundColor White
Write-Host "  Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host "Both servers are running in separate windows." -ForegroundColor Yellow
Write-Host "Close those windows to stop the servers." -ForegroundColor Yellow
Write-Host ""

