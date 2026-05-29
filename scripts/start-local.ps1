$ErrorActionPreference = "Stop"

# Local geliştirme stack'ini başlat (hot-reload aktif)
# Kullanım: .\scripts\start-local.ps1
# Tunnel dahil: .\scripts\start-local-full.ps1

$RootPath = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$ComposeArgs = @(
    "--env-file", ".env.local",
    "-f", "docker-compose.local.yml",
    "-f", "docker-compose.dev.yml"
)

Push-Location $RootPath
try {
    Write-Host "Starting local development stack (hot-reload)..." -ForegroundColor Cyan
    docker compose @ComposeArgs up -d --build

    Write-Host ""
    Write-Host "Stack is running!" -ForegroundColor Green
    Write-Host "  Frontend : http://localhost:3000"
    Write-Host "  Backend  : http://localhost:8000"
    Write-Host "  MailHog  : http://localhost:8025"
    Write-Host "  Swagger  : http://localhost:8000/docs"
    Write-Host ""
    Write-Host "Logs: docker compose --env-file .env.local -f docker-compose.local.yml -f docker-compose.dev.yml logs -f"
} finally {
    Pop-Location
}
