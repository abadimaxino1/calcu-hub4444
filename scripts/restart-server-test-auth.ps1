Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $repoRoot

$env:CALCU_BASE_URL = 'http://localhost:4000'

if (-not $env:CALCU_ADMIN_COOKIE) {
    Write-Error 'CALCU_ADMIN_COOKIE is required'
    exit 1
}

# Kill port 4000
npm run kill:4000

$logDir = Join-Path $repoRoot "scripts/logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$outLog = Join-Path $logDir "server-$ts.out.log"
$errLog = Join-Path $logDir "server-$ts.err.log"

Write-Host "Starting server (logs: $outLog)..."
$proc = Start-Process npm.cmd -ArgumentList 'run start:server' -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput $outLog -RedirectStandardError $errLog

Write-Host "Waiting for server health... 0/30"
$lastErr = $null

for($i=0; $i -lt 30; $i++) {
    if (($i + 1) % 5 -eq 0) {
        Write-Host ("Waiting for server health... " + ($i+1) + "/30")
    }
    if($proc.HasExited) {
        Write-Host "Server process exited with code: $($proc.ExitCode)" -ForegroundColor Red
        if (Test-Path $errLog) {
            Write-Host "Last 20 lines of stderr:" -ForegroundColor Yellow
            Get-Content $errLog -Tail 20 | ForEach-Object { Write-Host $_ }
        }
        throw "Server process exited unexpectedly. Check logs: $errLog"
    }
    Start-Sleep 1
    $ready = $false
    try {
        Invoke-RestMethod http://localhost:4000/api/health -ErrorAction Stop | Out-Null
        $ready = $true
        $lastErr = $null
    } catch {
        $lastErr = $_.Exception.Message
    }

    if($ready) {
        Write-Host 'Server healthy, running smoke tests...'
        # Do NOT clear cookie
        npm run test:smoke
        exit $LASTEXITCODE
    }
}

if ($lastErr) { throw "Timeout waiting for http://localhost:4000/api/health. Last error: $lastErr" }
else { throw "Timeout waiting for http://localhost:4000/api/health" }
