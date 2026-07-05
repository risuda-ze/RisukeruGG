$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "================================================"
Write-Host " RisukeruGG Discord招待 一時データ クリーンアップ"
Write-Host "================================================"
Write-Host ""

function Fail([string]$message) {
    Write-Host "[ERROR] $message" -ForegroundColor Red
    exit 1
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Fail "Node.js が見つかりません。Node.js 20+ をインストールしてください。"
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$serviceAccountPath = Join-Path $projectRoot "service-account.json"

if (-not $env:FIREBASE_SERVICE_ACCOUNT_KEY) {
    if (-not (Test-Path $serviceAccountPath)) {
        Fail ("FIREBASE_SERVICE_ACCOUNT_KEY が未設定で、$serviceAccountPath も見つかりません。" +
              "Firebase Console > プロジェクトの設定 > サービスアカウント で発行したJSONを" +
              "service-account.json としてプロジェクト直下に置くか、環境変数を設定してください。")
    }
    $env:FIREBASE_SERVICE_ACCOUNT_KEY = Get-Content $serviceAccountPath -Raw
}

$accountInfo = $env:FIREBASE_SERVICE_ACCOUNT_KEY | ConvertFrom-Json
Write-Host "対象プロジェクト     : $($accountInfo.project_id)"
Write-Host "サービスアカウント   : $($accountInfo.client_email)"
Write-Host ""
Write-Host "上記のプロジェクトで間違いないか必ず確認してください。" -ForegroundColor Yellow
Write-Host ""

$projectRootBackup = $PWD
Set-Location $projectRoot

try {
    Write-Host "--- dry-run 実行中（まだ何も削除しません） ---" -ForegroundColor Yellow
    & node scripts/cleanup-discord-invite-temp.mjs
    if ($LASTEXITCODE -ne 0) {
        Fail "dry-run に失敗しました。上記のエラーを確認してください。"
    }

    Write-Host ""
    $answer = Read-Host "上記の内容をFirestoreから削除しますか？ 適用する場合は「apply」と入力してください"
    if ($answer -ne 'apply') {
        Write-Host "適用をキャンセルしました。何も変更していません。" -ForegroundColor Cyan
        exit 0
    }

    Write-Host ""
    Write-Host "--- 適用実行中 ---" -ForegroundColor Yellow
    & node scripts/cleanup-discord-invite-temp.mjs --apply
    if ($LASTEXITCODE -ne 0) {
        Fail "適用に失敗しました。"
    }

    Write-Host ""
    Write-Host "================================================" -ForegroundColor Green
    Write-Host " クリーンアップ完了" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Green
} finally {
    Set-Location $projectRootBackup
}
