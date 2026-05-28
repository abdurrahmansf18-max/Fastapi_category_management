$ErrorActionPreference = "Stop"

$RootPath = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path

function Assert-InRepo {
    param([string]$Path)

    $ResolvedPath = (Resolve-Path -LiteralPath $Path).Path
    if (-not $ResolvedPath.StartsWith($RootPath, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to remove path outside repository: $ResolvedPath"
    }
    return $ResolvedPath
}

function Remove-RepoPath {
    param([string]$RelativePath)

    $Path = Join-Path $RootPath $RelativePath
    if (-not (Test-Path -LiteralPath $Path)) {
        return
    }

    $SafePath = Assert-InRepo -Path $Path
    Remove-Item -LiteralPath $SafePath -Recurse -Force
    Write-Host "Removed $RelativePath"
}

$Targets = @(
    ".pytest_cache",
    "backend\.pytest_cache",
    "frontend\test-results",
    "frontend\.next-dev.log",
    "frontend\.next-dev.err.log"
)

foreach ($Target in $Targets) {
    Remove-RepoPath -RelativePath $Target
}

$PycacheDirs = @(
    Get-ChildItem -LiteralPath $RootPath -Recurse -Force -Directory -Filter "__pycache__" |
        Where-Object { $_.FullName.StartsWith($RootPath, [System.StringComparison]::OrdinalIgnoreCase) }
)

foreach ($Dir in $PycacheDirs) {
    Remove-Item -LiteralPath $Dir.FullName -Recurse -Force
    Write-Host "Removed $($Dir.FullName.Substring($RootPath.Length + 1))"
}

Write-Host "Local development artifacts cleaned."
