$ErrorActionPreference = "Stop"
cd "C:\Users\abdul\calcu-hub"

# Kill anything already on 4000 to avoid false starts
Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

$serverOut = Join-Path $PWD "scripts\server.out.txt"
$serverErr = Join-Path $PWD "scripts\server.err.txt"

"Starting server..." | Out-Host
$serverProcess = Start-Process -FilePath "node" `
  -ArgumentList "server/index.cjs" `
  -WorkingDirectory $PWD `
  -PassThru `
  -RedirectStandardOutput $serverOut `
  -RedirectStandardError $serverErr `
  -WindowStyle Hidden

# Wait until server responds (max 30s)
$ready = $false
for ($i=0; $i -lt 30; $i++) {
  if ($serverProcess.HasExited) { break }
  try {
    Invoke-RestMethod -Uri "http://localhost:4000/api/calculators/public" -TimeoutSec 2 | Out-Null
    $ready = $true
    break
  } catch { Start-Sleep -Seconds 1 }
}

if (-not $ready) {
  "Server did not become ready. Logs:" | Out-Host
  Get-Content $serverOut -Tail 80 -ErrorAction SilentlyContinue | Out-Host
  Get-Content $serverErr -Tail 80 -ErrorAction SilentlyContinue | Out-Host
  if (-not $serverProcess.HasExited) { Stop-Process -Id $serverProcess.Id -Force }
  throw "Server not ready on localhost:4000"
}

"Server is ready. Logging in..." | Out-Host

# Use environment variable for password if available, fallback to default for local dev
$adminPassword = if ($env:CALCU_ADMIN_PASSWORD) { $env:CALCU_ADMIN_PASSWORD } else { "ChangeThisPassword123!" }
$body = @{ email = "admin@calcuhub.com"; password = $adminPassword } | ConvertTo-Json
$resp = Invoke-WebRequest -Uri "http://localhost:4000/api/auth/login" -Method Post -ContentType "application/json" -Body $body -SessionVariable s -UseBasicParsing

$cookieHeader = ($s.Cookies.GetCookies("http://localhost:4000") | ForEach-Object { "$($_.Name)=$($_.Value)" }) -join "; "
if ([string]::IsNullOrWhiteSpace($cookieHeader)) { throw "Login returned no cookies. Check credentials/auth flow." }

$env:CALCU_ADMIN_COOKIE = $cookieHeader

"Running smoke tests..." | Out-Host
node .\scripts\test-admin-ops.cjs

"Stopping server..." | Out-Host
if (-not $serverProcess.HasExited) { Stop-Process -Id $serverProcess.Id -Force }
