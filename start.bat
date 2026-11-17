@echo off
setlocal
cd /d "%~dp0"

echo === Neural Command Center ===

where pnpm >nul 2>nul
if %errorlevel% neq 0 (
  echo pnpm wurde nicht gefunden. Installiere es mit: npm install -g pnpm
  pause
  exit /b 1
)

if not exist ".env" (
  echo Keine .env gefunden - kopiere .env.example nach .env
  copy ".env.example" ".env" >nul
  echo Bitte trage deine Schluessel in .env ein, bevor du die KI-Funktionen nutzt.
)

if not exist "node_modules" (
  echo Installiere Abhaengigkeiten ...
  call pnpm install
)

if not exist "data" mkdir "data"

echo Starte Server und Oberflaeche ...
start "Neural Command Center" cmd /k pnpm dev

timeout /t 4 >nul
start "" "http://localhost:5173"

endlocal
