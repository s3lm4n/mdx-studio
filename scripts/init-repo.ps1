$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw "Git is required but was not found on PATH."
}

if (-not (Test-Path -LiteralPath (Join-Path $repoRoot ".git"))) {
    git init -b main
}
else {
    Write-Host "Git repository already initialized."
}

git add .

$name = git config user.name
$email = git config user.email

if ([string]::IsNullOrWhiteSpace($name) -or [string]::IsNullOrWhiteSpace($email)) {
    Write-Host ""
    Write-Host "Files were staged, but no commit was created because Git user.name/user.email is not configured."
    Write-Host "Configure your own Git identity, then run:"
    Write-Host '  git commit -m "chore: bootstrap MDX Studio repository"'
    exit 0
}

if (-not (git diff --cached --quiet)) {
    git commit -m "chore: bootstrap MDX Studio repository"
} else {
    Write-Host "No staged changes to commit."
}

Write-Host ""
Write-Host "Repository ready on branch: $(git branch --show-current)"
