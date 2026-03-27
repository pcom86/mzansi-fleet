<#
.SYNOPSIS
  Commit all changes and push to remote branch.

.PARAMETER Message
  Commit message text.

.PARAMETER Remote
  Git remote name (defaults to origin).

.PARAMETER Branch
  Git branch name (optional). If not provided, uses current branch.
#>

param (
    [Parameter(Mandatory=$true)]
    [string]$Message,

    [string]$Remote = "origin",

    [string]$Branch
)

# Find branch if not provided
if (-not $Branch) {
    $Branch = git rev-parse --abbrev-ref HEAD
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Could not detect current branch."
        exit 1
    }
}

# Skip if nothing to commit
$changed = git status --porcelain
if (-not $changed) {
    Write-Host "No changes to commit."
    exit 0
}

Write-Host "Staging all changes..."
git add -A
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "Committing with message: $Message"
git commit -m $Message
if ($LASTEXITCODE -ne 0) {
    Write-Warning "No commit created (maybe nothing to commit)."
}

Write-Host "Pushing to $Remote/$Branch"
git push $Remote $Branch
if ($LASTEXITCODE -ne 0) {
    Write-Error "Push failed."
    exit 1
}

Write-Host "Done: committed and pushed successfully."
