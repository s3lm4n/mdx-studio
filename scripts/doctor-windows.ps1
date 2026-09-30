$ErrorActionPreference = "Stop"

Write-Host "MDX Studio - Windows development doctor"
Write-Host ""

function Show-CommandVersion {
    param(
        [Parameter(Mandatory=$true)][string]$Name,
        [Parameter(Mandatory=$true)][string[]]$Args
    )

    $cmd = Get-Command $Name -ErrorAction SilentlyContinue
    if (-not $cmd) {
        Write-Host ("[MISSING] {0}" -f $Name)
        return
    }

    try {
        $output = & $Name @Args 2>&1 | Select-Object -First 1
        Write-Host ("[OK]      {0}: {1}" -f $Name, $output)
    }
    catch {
        Write-Host ("[FOUND]   {0}: version check failed: {1}" -f $Name, $_.Exception.Message)
    }
}

Show-CommandVersion -Name "git"   -Args @("--version")
Show-CommandVersion -Name "node"  -Args @("--version")
Show-CommandVersion -Name "pnpm"  -Args @("--version")
Show-CommandVersion -Name "rustc" -Args @("--version")
Show-CommandVersion -Name "cargo" -Args @("--version")

Write-Host ""
$wsl = Get-Command wsl.exe -ErrorAction SilentlyContinue
if (-not $wsl) {
    Write-Host "[MISSING] wsl.exe"
} else {
    Write-Host "[OK]      wsl.exe"
    Write-Host ""
    Write-Host "WSL distributions:"
    & wsl.exe --list --verbose
}

Write-Host ""
Write-Host "This script installs or modifies nothing."
