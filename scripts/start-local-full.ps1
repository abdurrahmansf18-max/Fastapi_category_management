$ErrorActionPreference = "Stop"

# Local geliştirme stack'ini Cloudflare tunnel ile başlat
# Kullanım: .\scripts\start-local-full.ps1

$RootPath = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$ComposeArgs = @(
    "--env-file", ".env.local",
    "-f", "docker-compose.local.yml",
    "-f", "docker-compose.dev.yml",
    "-f", "docker-compose.tunnel.yml"
)

Push-Location $RootPath
try {
    Write-Host "Starting local development stack (hot-reload + tunnel)..." -ForegroundColor Cyan
    docker compose @ComposeArgs up -d --build

    # Tunnel URL'sini bul
    $TunnelUrl = $null
    for ($Attempt = 1; $Attempt -le 15; $Attempt++) {
        $Logs = docker compose @ComposeArgs logs --tail=120 cloudflared 2>$null
        $Matches = [regex]::Matches(($Logs -join "`n"), "https://[a-z0-9-]+\.trycloudflare\.com")
        if ($Matches.Count -gt 0) {
            $TunnelUrl = $Matches[$Matches.Count - 1].Value
            break
        }
        Start-Sleep -Seconds 2
    }

    Write-Host ""
    Write-Host "Stack is running!" -ForegroundColor Green
    Write-Host "  Frontend : http://localhost:3000"
    Write-Host "  Backend  : http://localhost:8000"
    Write-Host "  MailHog  : http://localhost:8025"
    Write-Host "  Swagger  : http://localhost:8000/docs"
    if ($TunnelUrl) {
        Write-Host "  Tunnel   : $TunnelUrl" -ForegroundColor Yellow
    } else {
        Write-Host "  Tunnel   : Starting... (check logs)" -ForegroundColor DarkYellow
    }
    Write-Host ""
    Write-Host "Logs: docker compose --env-file .env.local -f docker-compose.local.yml -f docker-compose.dev.yml -f docker-compose.tunnel.yml logs -f"
} finally {
    Pop-Location
}
