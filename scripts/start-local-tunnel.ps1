$ErrorActionPreference = "Stop"

$RootPath = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$ComposeArgs = @(
    "--env-file", ".env.local",
    "-f", "docker-compose.local.yml",
    "-f", "docker-compose.dev.yml",
    "-f", "docker-compose.tunnel.yml"
)

Push-Location $RootPath
try {
    $FrontendContainer = docker compose @ComposeArgs ps -q frontend
    if (-not $FrontendContainer) {
        Write-Host "Frontend is not running yet; starting the local stack first."
        docker compose @ComposeArgs up -d frontend
    }

    docker compose @ComposeArgs up -d --no-deps cloudflared

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

    if ($TunnelUrl) {
        Write-Host "Cloudflare tunnel URL: $TunnelUrl"
    } else {
        Write-Host "Tunnel started, but the URL is not in the logs yet."
        Write-Host "Run: docker compose --env-file .env.local -f docker-compose.local.yml -f docker-compose.dev.yml -f docker-compose.tunnel.yml logs -f cloudflared"
    }
} finally {
    Pop-Location
}
