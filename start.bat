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

rem Chrome/Edge im App-Modus oeffnen (keine Adressleiste/Tabs, wirkt wie eine
rem eigene Anwendung) statt im normalen Browser. Eigenes --user-data-dir,
rem damit Fenstergroesse/-position gemerkt werden, ohne das normale
rem Browserprofil (Logins, Verlauf) anzufassen. Faellt auf den
rem Standardbrowser zurueck, wenn weder Chrome noch Edge gefunden wird.
set "APP_URL=http://localhost:5173"
set "APP_PROFILE=%~dp0data\browser-profile"
set "CHROME_EXE="

if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME_EXE=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined CHROME_EXE if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME_EXE=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined CHROME_EXE if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "CHROME_EXE=%LocalAppData%\Google\Chrome\Application\chrome.exe"
if not defined CHROME_EXE if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "CHROME_EXE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not defined CHROME_EXE if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "CHROME_EXE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"

if defined CHROME_EXE (
  start "" "%CHROME_EXE%" --app=%APP_URL% --user-data-dir="%APP_PROFILE%" --window-size=1440,900
) else (
  start "" "%APP_URL%"
)

endlocal
