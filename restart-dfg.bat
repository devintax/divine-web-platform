@echo off
REM ============================================================
REM  Divine Financial Group — Full Stack Restart
REM  Starts: Docker (InsForge + Temporal) -> Next.js -> Worker -> ngrok
REM  Each service launches in its own console window so logs stay visible.
REM ============================================================

setlocal
set ROOT=%~dp0
cd /d "%ROOT%"

echo.
echo ============================================
echo   Divine Financial Group - Restart Script
echo ============================================
echo.

REM --- 1. Stop any stale processes -----------------------------
echo [1/6] Stopping stale node and ngrok processes...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM ngrok.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM --- 2. Verify Docker is running -----------------------------
echo [2/6] Checking Docker Desktop...
docker info >nul 2>&1
if errorlevel 1 (
    echo   ERROR: Docker Desktop is not running. Please start it and re-run this script.
    pause
    exit /b 1
)
echo   OK Docker is running.

REM --- 3. Start InsForge containers ----------------------------
echo [3/6] Ensuring InsForge backend is up using stable production compose...
pushd "%ROOT%..\insforge-backend" >nul 2>&1
if errorlevel 1 (
    echo   ERROR: ..\insforge-backend not found. Cannot start InsForge.
    pause
    exit /b 1
)

docker compose -f docker-compose.prod.yml up -d --no-build
if errorlevel 1 (
    echo   Production image missing or stale. Building InsForge image...
    docker compose -f docker-compose.prod.yml up -d --build
    if errorlevel 1 (
        popd
        echo   ERROR: InsForge production compose failed.
        pause
        exit /b 1
    )
)

docker update --restart unless-stopped insforge-backend-postgres-1 insforge-backend-postgrest-1 insforge-backend-deno-1 insforge-backend-insforge-1 >nul 2>&1
popd

REM Verify InsForge health
echo   Waiting for InsForge API at http://127.0.0.1:7130/api/health...
set /a insforge_tries=0
:wait_insforge
timeout /t 2 /nobreak >nul
curl -s -o nul http://127.0.0.1:7130/api/health
if not errorlevel 1 goto insforge_ready
set /a insforge_tries+=1
if %insforge_tries% LSS 30 goto wait_insforge
echo   ERROR: InsForge API did not become healthy in 60s.
docker logs --tail 40 insforge-backend-insforge-1
pause
exit /b 1
:insforge_ready
curl -s -o nul -w "   InsForge health check: %%{http_code}\n" http://127.0.0.1:7130/api/health

REM --- 4. Verify Temporal is running ---------------------------
echo [4/6] Checking Temporal server (localhost:7233)...
curl -s -o nul -w "   Temporal Web UI: %%{http_code}\n" http://127.0.0.1:8080
echo   (If Temporal is not running, start it manually: temporal server start-dev)

REM --- 5. Launch Next.js dev server in a new window ------------
echo [5/6] Starting Next.js dev server...
start "DFG Next.js" cmd /k "cd /d %ROOT% && set NODE_ENV=development && npm run dev"

REM Wait for Next.js to be ready
echo   Waiting for Next.js to compile (up to 30s)...
set /a tries=0
:wait_next
timeout /t 2 /nobreak >nul
curl -s -o nul -w "" http://localhost:3000
if not errorlevel 1 goto next_ready
set /a tries+=1
if %tries% LSS 15 goto wait_next
echo   WARNING: Next.js did not respond in 30s. Continuing anyway.
:next_ready
echo   Next.js is ready at http://localhost:3000

REM --- 6. Launch Temporal worker in a new window ---------------
echo [6/6] Starting Temporal worker and ngrok tunnel...
start "DFG Temporal Worker" cmd /k "cd /d %ROOT% && set TEMPORAL_ADDRESS=localhost:7233 && set TEMPORAL_NAMESPACE=default && set NEXT_PUBLIC_INSFORGE_URL=http://127.0.0.1:7130 && npx tsx --tsconfig temporal/tsconfig.json temporal/src/worker.ts"

REM Launch ngrok tunnel in a new window
start "DFG ngrok" cmd /k "ngrok http 3000 --hostname=gusty-sip-cradling.ngrok-free.dev"

echo.
echo ============================================
echo   All services launched!
echo ============================================
echo.
echo   Local:    http://localhost:3000
echo   Public:   https://gusty-sip-cradling.ngrok-free.dev
echo   InsForge: http://127.0.0.1:7130
echo   Temporal: http://127.0.0.1:8080
echo.
echo   Each service runs in its own window. Close them to stop.
echo.
endlocal
