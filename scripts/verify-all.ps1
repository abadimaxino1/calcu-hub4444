# scripts/verify-all.ps1
$ErrorActionPreference = "Stop"

# 1) Kill port
try {
    npm run kill:4000 | Out-Null
} catch {}

# 2) Start server (background)
$serverOut = "scripts/server.out.txt"
$serverErr = "scripts/server.err.txt"
$env:PORT = "4000"
$p = Start-Process -FilePath "node" -ArgumentList "server/index.cjs" -WindowStyle Hidden `
  -RedirectStandardOutput $serverOut -RedirectStandardError $serverErr -PassThru

Start-Sleep -Seconds 2

# 3) Health check
$ok = $false
for ($i=0; $i -lt 40; $i++) {
  try {
    $r = Invoke-WebRequest -UseBasicParsing "http://localhost:4000/api/health" -TimeoutSec 2
    if ($r.StatusCode -eq 200) { $ok = $true; break }
  } catch {}
  Start-Sleep -Milliseconds 250
}
if (-not $ok) {
  Write-Host "Server failed to start. Tail errors:"
  if (Test-Path $serverErr) {
    Get-Content $serverErr -Tail 120
  }
  Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
  exit 1
}

# 4) Run suites
try {
    node scripts/verify-admin-fix.cjs
    node scripts/verify-public-release.cjs
} finally {
    # 5) Cleanup
    try {
        npm run kill:4000 | Out-Null
    } catch {}
    Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
}

Write-Host ([char]0x2705 + " verify-all passed")
