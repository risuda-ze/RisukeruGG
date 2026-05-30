$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "================================================"
Write-Host " RisukeruGG Seed Script"
Write-Host "================================================"
Write-Host ""

function Fail([string]$message) {
    Write-Host "[ERROR] $message" -ForegroundColor Red
    exit 1
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Fail "Node.js is not installed. Please install Node.js 20+ first."
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Fail "Docker is not installed. Please install/start Docker Desktop first."
}

Write-Host "Checking Firebase Emulator (http://localhost:4000) ..."
try {
    $null = Invoke-WebRequest -Uri "http://localhost:4000" -UseBasicParsing -TimeoutSec 5
    Write-Host "  OK - Emulator is running." -ForegroundColor Green
} catch {
    Fail "Firebase Emulator is not running. Run: docker compose up -d"
}
Write-Host ""

$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot

try {
    Write-Host "Seeding test data ..."
    Write-Host ""
    & node scripts/seed.mjs
    if ($LASTEXITCODE -ne 0) {
        Fail "Seeding failed. Check emulator logs and script output."
    }
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host " Seed completed" -ForegroundColor Green
Write-Host "  App:          http://localhost:3000"
Write-Host "  Emulator UI:  http://localhost:4000"
Write-Host "================================================" -ForegroundColor Green
