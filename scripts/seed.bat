@echo off
chcp 65001 > nul
echo.
echo ================================================
echo  リスケるGG テストデータ投入スクリプト
echo ================================================
echo.

REM Node.js の存在確認
where node > nul 2>&1
if %errorlevel% neq 0 (
  echo [エラー] Node.js が見つかりません。
  echo Node.js 18 以上をインストールしてください。
  echo https://nodejs.org/
  pause
  exit /b 1
)

REM Docker の存在確認
where docker > nul 2>&1
if %errorlevel% neq 0 (
  echo [エラー] Docker が見つかりません。
  echo Docker Desktop をインストールして起動してください。
  echo https://www.docker.com/products/docker-desktop/
  pause
  exit /b 1
)

REM Firebase Emulator (Firestore) の起動確認
echo Firebase Emulator の起動を確認中...
curl -s -o nul -w "%%{http_code}" http://localhost:8080 2>nul | find "200" > nul
if %errorlevel% neq 0 (
  echo [エラー] Firebase Emulator が起動していません。
  echo 先に以下のコマンドでコンテナを起動してください:
  echo   docker compose up -d
  echo.
  echo コンテナの起動には 1〜2 分かかる場合があります。
  pause
  exit /b 1
)
echo   OK - Emulator が起動しています。
echo.

REM スクリプトのディレクトリをプロジェクトルートに移動
cd /d "%~dp0.."

REM シードスクリプトの実行
echo テストデータを投入中...
echo.
node scripts/seed.mjs
if %errorlevel% neq 0 (
  echo.
  echo [エラー] テストデータの投入に失敗しました。
  echo エミュレーターが正常に起動しているか確認してください。
  pause
  exit /b 1
)

echo.
echo ================================================
echo  投入完了！
echo  アプリ:           http://localhost:3000
echo  Emulator UI:      http://localhost:4000
echo ================================================
echo.
pause
