$ErrorActionPreference = 'Stop'

$projectRoot = "C:\Users\vgbewonyo\Documents\DevOps\dfg-web-platform"
$insforgeUrl = "https://insforge.dfgworld.net"
$temporalNamespace = "default"
$ngrokPort = 3000

Write-Host "====================================" -ForegroundColor DarkBlue
Write-Host "  DIVINE FINANCIAL GROUP - STARTUP  " -ForegroundColor White
Write-Host "====================================" -ForegroundColor DarkBlue
Write-Host ""

# --- 1. Docker Desktop check ---
Write-Host "[1/6] Checking Docker Desktop..." -ForegroundColor Cyan
try {
    docker info > $null 2>&1
    Write-Host "Docker Desktop is running." -ForegroundColor Green
} catch {
    Write-Host "ERROR: Docker Desktop is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

# --- 2. Remote InsForge ---
Write-Host "[2/6] Checking LAN-hosted InsForge..." -ForegroundColor Cyan
$insforgeHealth = $null
$retries = 0
while (-not $insforgeHealth -and $retries -lt 30) {
    Start-Sleep -Seconds 2
    try { $insforgeHealth = Invoke-WebRequest -Uri "$insforgeUrl/api/health" -TimeoutSec 5 } catch {}
    $retries++
}
if ($insforgeHealth -and $insforgeHealth.StatusCode -eq 200) {
    Write-Host "InsForge is healthy at $insforgeUrl/api/health" -ForegroundColor Green
} else {
    Write-Host "ERROR: Remote InsForge health check failed at $insforgeUrl/api/health." -ForegroundColor Red
    exit 1
}

# --- 3. Temporal Server ---
Write-Host "[3/6] Checking Temporal Server..." -ForegroundColor Cyan
$temporalContainers = docker ps -q -f name="temporal-server"
if (-not $temporalContainers) {
    Write-Host "WARNING: Temporal containers are not running. Please start them:" -ForegroundColor Yellow
    Write-Host "  docker compose -f temporal-server/docker-compose.yml up -d" -ForegroundColor Yellow
} else {
    Write-Host "Temporal server is running." -ForegroundColor Green
}

# --- 4. Next.js Frontend ---
Write-Host "[4/6] Starting Next.js Frontend..." -ForegroundColor Cyan
Set-Location $projectRoot
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '[NEXT.JS] Starting...' -ForegroundColor Blue; cd `"$projectRoot`"; npm run dev" -WindowStyle Normal

# --- 5. Temporal Worker ---
Write-Host "[5/6] Starting Temporal Worker..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '[TEMPORAL WORKER] Starting...' -ForegroundColor Green; cd `"$projectRoot`"; `$env:TEMPORAL_ADDRESS='localhost:7233'; `$env:TEMPORAL_NAMESPACE='$temporalNamespace'; npx tsx --tsconfig temporal/tsconfig.json temporal/src/worker.ts" -WindowStyle Normal

# --- 6. ngrok ---
Write-Host "[6/6] Starting ngrok tunnel..." -ForegroundColor Cyan
$ngrokProcess = Start-Process ngrok -ArgumentList "http", "$ngrokPort" -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 3
try {
    $tunnels = (Invoke-WebRequest -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 5).Content | ConvertFrom-Json
    $publicUrl = $tunnels.tunnels[0].public_url
    Write-Host ""
    Write-Host "  ngrok public URL: $publicUrl" -ForegroundColor Magenta
} catch {
    Write-Host "ngrok is running. Get URL with:" -ForegroundColor Yellow
    Write-Host "  (Invoke-WebRequest http://127.0.0.1:4040/api/tunnels).Content | ConvertFrom-Json | Select-Object -ExpandProperty tunnels | Select-Object public_url" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "====================================" -ForegroundColor DarkBlue
Write-Host "  ALL SERVICES STARTED             " -ForegroundColor White
Write-Host "====================================" -ForegroundColor DarkBlue
Write-Host ""
Write-Host "  Frontend:     http://localhost:$ngrokPort" -ForegroundColor Blue
if ($publicUrl) { Write-Host "  Public URL:   $publicUrl" -ForegroundColor Magenta }
Write-Host "  InsForge:     $insforgeUrl" -ForegroundColor Blue
Write-Host "  Temporal:     localhost:7233" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to stop all servers..." -ForegroundColor Yellow
[void][Console]::ReadKey($true)

# Cleanup
Write-Host "Shutting down all processes..." -ForegroundColor Red
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "ngrok" -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "Done." -ForegroundColor Green
