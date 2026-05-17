[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "================================================"
Write-Host " リスケるGG テストデータ投入スクリプト"
Write-Host "================================================"
Write-Host ""

# Node.js の存在確認
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[エラー] Node.js が見つかりません。" -ForegroundColor Red
    Write-Host "Node.js 18 以上をインストールしてください。"
    Write-Host "  https://nodejs.org/"
    Read-Host "`nEnter を押して終了"
    exit 1
}

# Docker の存在確認
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "[エラー] Docker が見つかりません。" -ForegroundColor Red
    Write-Host "Docker Desktop をインストールして起動してください。"
    Write-Host "  https://www.docker.com/products/docker-desktop/"
    Read-Host "`nEnter を押して終了"
    exit 1
}

# Firebase Emulator UI (port 4000) の起動確認
Write-Host "Firebase Emulator の起動を確認中..."
try {
    $null = Invoke-WebRequest -Uri "http://localhost:4000" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "  OK - Emulator が起動しています。" -ForegroundColor Green
} catch {
    Write-Host "[エラー] Firebase Emulator が起動していません。" -ForegroundColor Red
    Write-Host "先に以下のコマンドでコンテナを起動してください:"
    Write-Host "  docker compose up -d"
    Write-Host ""
    Write-Host "コンテナの起動には 1～2 分かかる場合があります。"
    Read-Host "`nEnter を押して終了"
    exit 1
}
Write-Host ""

# プロジェクトルートへ移動
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot

try {
    # シードスクリプトの実行
    Write-Host "テストデータを投入中..."
    Write-Host ""
    node scripts/seed.mjs
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "[エラー] テストデータの投入に失敗しました。" -ForegroundColor Red
        Write-Host "エミュレーターが正常に起動しているか確認してください。"
        Read-Host "`nEnter を押して終了"
        exit 1
    }
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host " 投入完了！" -ForegroundColor Green
Write-Host "  アプリ:        http://localhost:3000"
Write-Host "  Emulator UI:   http://localhost:4000"
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Read-Host "Enter を押して終了"
