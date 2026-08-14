param([switch]$NoOpen)

$ErrorActionPreference = 'Stop'

$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectUrl = 'http://localhost:3000/'
$npmCommand = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source

if (-not $npmCommand) {
    Write-Host 'Node.js / npm is not installed or is not available in PATH.' -ForegroundColor Red
    exit 1
}

function Test-ProjectServer {
    try {
        $response = Invoke-WebRequest -Uri $projectUrl -UseBasicParsing -TimeoutSec 2
        return $response.StatusCode -eq 200 -and $response.Content -match '<title>منصة متابع</title>'
    } catch {
        return $false
    }
}

if (-not (Test-ProjectServer)) {
    $occupiedPort = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
    if ($occupiedPort) {
        Write-Host 'Port 3000 is being used by another application. Close it, then run this file again.' -ForegroundColor Red
        exit 1
    }

    $logPath = Join-Path $env:TEMP 'motabe-local-server.log'
    $errorLogPath = Join-Path $env:TEMP 'motabe-local-server-error.log'
    Start-Process -FilePath $npmCommand `
        -ArgumentList @('start') `
        -WorkingDirectory $projectPath `
        -WindowStyle Hidden `
        -RedirectStandardOutput $logPath `
        -RedirectStandardError $errorLogPath

    $ready = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        Start-Sleep -Milliseconds 500
        if (Test-ProjectServer) {
            $ready = $true
            break
        }
    }

    if (-not $ready) {
        Write-Host 'The local server could not start. Check:' -ForegroundColor Red
        Write-Host $errorLogPath
        exit 1
    }
}

if (-not $NoOpen) {
    Start-Process $projectUrl
}
Write-Host "Motabe is running at $projectUrl" -ForegroundColor Green
