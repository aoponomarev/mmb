# Unassign GitHub Copilot from all open issues in the current repo.
# Requires: gh CLI (https://cli.github.com/), authenticated.
# Usage: .\unassign-copilot.ps1

$ErrorActionPreference = "SilentlyContinue"
$null = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) { Write-Error "gh not authenticated. Run: gh auth login"; exit 1 }

# Copilot assignee login varies; try common values. gh fails if assignee doesn't exist.
$unassigned = 0
foreach ($login in @("copilot-swe-agent[bot]", "github-copilot", "copilot")) {
    $nums = gh issue list --state open --assignee $login --json number -q ".[].number" 2>$null
    if ($LASTEXITCODE -eq 0 -and $nums) {
        foreach ($n in ($nums -split "`n")) {
            if ($n -match '^\d+$') {
                gh issue edit $n --remove-assignee $login 2>$null
                Write-Host "Unassigned $login from #$n"
                $unassigned++
            }
        }
    }
}

if ($unassigned -eq 0) {
    Write-Host "No open issues assigned to Copilot, or assignee login differs. Manual check:"
    Write-Host "  https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner)/issues"
    Write-Host "  Filter by assignee, then Edit -> Remove Copilot from each."
} else {
    Write-Host "Done. Unassigned $unassigned issue(s)."
}
