# Collapse Explained - unattended production loop for the factory PC.
# setup.ps1 starts this once and registers it to start at every logon.
# Each pass:
#   1. git pull (new scripts/kits written elsewhere arrive by GitHub); if this
#      file changed, the factory restarts itself with the new version,
#   2. builds every episode that has narration.md but no episode.mp4
#      (voice, timings, shot plan, render, mix, QA gate, 5 shorts) via make-episode.mjs;
#      an episode that fails 3 times is skipped until new code/scripts arrive,
#   3. one-time test (max 3 tries): can the 14B local model write a new 3D environment?,
#   4. pushes small status files (logs, QA reports, contact sheets) to the
#      branch "factory-status" so progress can be checked without touching this PC.
# Videos stay on this PC (too big for GitHub): episodes\<slug>\episode.mp4, shorts\.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\factory.ps1          # one pass
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\factory.ps1 -Watch   # loop (used at logon)
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\factory.ps1 -Only 02-caspian-sea-monster

param([switch]$Watch, [string]$Only = "", [int]$EveryMinutes = 30)

$Root = $PSScriptRoot
$Self = $MyInvocation.MyCommand.Path
$Log = Join-Path $Root "factory.log"
$StatusDir = Join-Path (Split-Path $Root -Parent) "collapse-explained-status"
$env:GIT_TERMINAL_PROMPT = "0"      # never wait for a credential prompt nobody sees
$env:GCM_INTERACTIVE = "never"
$env:PYTHONUTF8 = "1"
$Private = "aleshrani/collapse-explained"     # status + finished videos go here (code comes from the public repo)

function Say($msg) { $line = "$(Get-Date -Format s) $msg"; Write-Host $line; Add-Content -Path $Log -Value $line -Encoding UTF8 }
function Invoke-Git { & git.exe -c credential.interactive=never @args 2>&1 | ForEach-Object { "$_" } }

# Only one factory at a time (an abandoned mutex from a killed run is taken over).
$mutex = New-Object System.Threading.Mutex($false, "Global\CollapseExplainedFactory")
try { $got = $mutex.WaitOne(0) } catch [System.Threading.AbandonedMutexException] { $got = $true }
if (-not $got) { Write-Host "Factory already running."; exit }

function Restart-Self {
    Say "factory.ps1 updated - restarting"
    $mutex.ReleaseMutex()
    $args2 = "-NoProfile -ExecutionPolicy Bypass -File `"$Self`""
    if ($Watch) { $args2 += " -Watch" }
    Start-Process powershell -ArgumentList $args2 -WindowStyle Hidden
    exit
}

function Update-Repo {
    $before = (Get-FileHash $Self).Hash
    $out = Invoke-Git -C $Root pull --ff-only
    if ($LASTEXITCODE) { Say "git pull failed - building what is here: $($out | Select-Object -Last 3)" }
    elseif ((Get-FileHash $Self).Hash -ne $before) { Restart-Self }
}

function Wait-Ollama {
    for ($i = 0; $i -lt 60; $i++) {
        try { Invoke-RestMethod "http://127.0.0.1:11434/api/tags" -TimeoutSec 2 | Out-Null; return $true } catch { }
        if ($i -eq 30) { Start-Process "ollama" -ArgumentList "serve" -WindowStyle Hidden }
        Start-Sleep 2
    }
    Say "Ollama is not answering on 127.0.0.1:11434"; return $false
}

function Build-Pending {
    $free = [math]::Round((Get-Item $Root).PSDrive.Free / 1GB)
    if ($free -lt 15) { Say "Only $free GB free - not building"; return }
    if (-not (Wait-Ollama)) { return }
    $head = (Invoke-Git -C $Root rev-parse HEAD | Select-Object -First 1)
    $eps = Get-ChildItem (Join-Path $Root "episodes") -Directory | Where-Object { $_.Name -match '^\d\d-' } | Sort-Object Name
    if ($Only) { $eps = $eps | Where-Object { $_.Name -eq $Only } }
    foreach ($ep in $eps) {
        if (-not (Test-Path (Join-Path $ep.FullName "narration.md"))) { continue }
        # Only directed episodes (direction.txt, written and checked by Claude) are built; the local planner alone is not good enough yet.
        if (-not (Test-Path (Join-Path $ep.FullName "direction.txt")) -and -not $Only) { continue }
        if ((Test-Path (Join-Path $ep.FullName "episode.mp4")) -and -not $Only) { continue }
        $failFile = Join-Path $ep.FullName ".fails"
        $fails = 0
        if (Test-Path $failFile) {
            $f = (Get-Content $failFile -Raw).Trim() -split " "
            if ($f[0] -eq $head) { $fails = [int]$f[1] }
        }
        if ($fails -ge 3 -and -not $Only) { continue }
        Say "BUILD $($ep.Name)"
        $t = Get-Date
        $nodeLog = Join-Path $ep.FullName "factory-node.log"
        Push-Location (Join-Path $Root "engine")
        cmd /c "node scripts/make-episode.mjs $($ep.Name) > `"$nodeLog`" 2>&1"
        $code = $LASTEXITCODE
        Pop-Location
        $min = [math]::Round(((Get-Date) - $t).TotalMinutes, 1)
        if ($code -eq 0) { Say "OK    $($ep.Name) in $min min"; Remove-Item $failFile -ErrorAction SilentlyContinue; Send-Videos $ep.FullName $ep.Name }
        else {
            $fails++; Set-Content $failFile "$head $fails"
            Say "FAIL  $($ep.Name) after $min min (attempt $fails/3): $(Get-Content $nodeLog -Tail 2)"
        }
        Publish-Status
    }
}

# Finished videos -> GitHub Release "<slug>" in the private repo (files up to 2 GB; too big for git itself).
function Send-Videos($dir, $tag) {
    $files = @(Join-Path $dir "episode.mp4") + @(Get-ChildItem (Join-Path $dir "shorts") -Filter "*.mp4" -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName })
    $files = $files | Where-Object { (Test-Path $_) -and ((Get-Item $_).Length -lt 2GB) }
    if (-not $files) { return }
    $marker = Join-Path $dir ".uploaded"
    $stamp = ($files | ForEach-Object { (Get-Item $_).LastWriteTimeUtc.Ticks }) -join ","
    if ((Test-Path $marker) -and ((Get-Content $marker -Raw).Trim() -eq $stamp)) { return }
    $q = ($files | ForEach-Object { "`"$_`"" }) -join " "
    cmd /c "gh release view $tag --repo $Private >nul 2>nul"
    if ($LASTEXITCODE) { cmd /c "gh release create $tag $q --repo $Private --title $tag --notes `"factory build`" >nul 2>&1" }
    else { cmd /c "gh release upload $tag $q --repo $Private --clobber >nul 2>&1" }
    if ($LASTEXITCODE) { Say "video upload failed for $tag" } else { Set-Content $marker $stamp; Say "UPLOADED $tag ($($files.Count) videos)" }
}

function Send-Proof {
    $proof = Get-ChildItem (Join-Path $Root "episodes") -Directory | ForEach-Object { Join-Path $_.FullName "proof-v2" } | Where-Object { Test-Path (Join-Path $_ "episode.mp4") }
    foreach ($p in $proof) { Send-Videos $p ("proof-" + (Split-Path (Split-Path $p) -Leaf)) }
}

function Test-Kit14b {
    $done = Join-Path $Root "bench\kit\out\gen14b.log"
    $tries = Join-Path $Root "bench\kit\out\gen14b.tries"
    if (Test-Path $done) { return }
    $n = 0; if (Test-Path $tries) { $n = [int](Get-Content $tries) }
    if ($n -ge 3) { return }
    if (-not (Wait-Ollama)) { return }
    New-Item -ItemType Directory -Force (Join-Path $Root "bench\kit\out") | Out-Null
    Set-Content $tries ($n + 1)
    Say "KIT TEST qwen2.5-coder:14b (try $($n + 1)/3)"
    Push-Location $Root
    $env:OLLAMA_MODEL = "qwen2.5-coder:14b"; $env:KIT_OUT = "bench/kit/out/oilrig_14b.ts"
    try {
        cmd /c "py -3 -X utf8 bench/kit/gen.py > bench\kit\out\gen14b.tmp 2>&1"
        $code = $LASTEXITCODE
    } finally { Remove-Item Env:\OLLAMA_MODEL, Env:\KIT_OUT -ErrorAction SilentlyContinue; Pop-Location }
    $tmp = Join-Path $Root "bench\kit\out\gen14b.tmp"
    if ($code -eq 0) { Move-Item $tmp $done -Force }
    Say "KIT TEST exit $code"
}

$script:StatusOff = $false
function Publish-Status {
    if ($script:StatusOff) { return }
    try {
        if ((Split-Path $StatusDir -Leaf) -ne "collapse-explained-status") { Say "bad status dir $StatusDir"; return }
        if (Test-Path $StatusDir) {
            Invoke-Git -C $StatusDir rev-parse --is-inside-work-tree | Out-Null
            if ($LASTEXITCODE) { Remove-Item $StatusDir -Recurse -Force; Invoke-Git -C $Root worktree prune | Out-Null }
        }
        if (-not (Test-Path $StatusDir)) {
            Invoke-Git -C $Root worktree add --detach $StatusDir | Out-Null
            if ($LASTEXITCODE) { Say "status: worktree add failed"; return }
            Invoke-Git -C $StatusDir switch --orphan factory-status | Out-Null
            if ($LASTEXITCODE) { Say "status: switch --orphan failed"; return }
        }
        if (-not (Test-Path (Join-Path $StatusDir ".git"))) { Say "status: not a worktree"; return }
        Get-ChildItem $StatusDir -Force | Where-Object { $_.Name -ne ".git" } | Remove-Item -Recurse -Force
        if (Test-Path $Log) { Get-Content $Log -Tail 500 | Set-Content (Join-Path $StatusDir "factory.log") -Encoding UTF8 }
        $setupLog = Join-Path $Root "setup.log"
        if (Test-Path $setupLog) { Get-Content $setupLog -Tail 300 | Set-Content (Join-Path $StatusDir "setup-tail.log") -Encoding UTF8 }
        $kit = Join-Path $StatusDir "kit"; New-Item -ItemType Directory -Force $kit | Out-Null
        Copy-Item (Join-Path $Root "bench\kit\out\gen14b.*"), (Join-Path $Root "bench\kit\out\oilrig_14b.ts") $kit -ErrorAction SilentlyContinue
        foreach ($ep in Get-ChildItem (Join-Path $Root "episodes") -Directory) {
            $dst = Join-Path $StatusDir ("episodes\" + $ep.Name)
            foreach ($rel in "build.log", "factory-node.log", ".fails", "qa\report.md", "qa\gate.json", "contact.jpg", "shorts\manifest.json",
                             "proof-v2\qa\report.md", "proof-v2\qa\gate.json", "proof-v2\contact.jpg") {
                $src = Join-Path $ep.FullName $rel
                if (Test-Path $src) {
                    $to = Join-Path $dst $rel
                    New-Item -ItemType Directory -Force (Split-Path $to) | Out-Null
                    Copy-Item $src $to
                }
            }
        }
        Invoke-Git -C $StatusDir add -A | Out-Null
        Invoke-Git -C $StatusDir commit -q -m "factory status $(Get-Date -Format s)" | Out-Null
        # Disposable branch, content replaced each time: force-push is fine.
        $out = Invoke-Git -C $StatusDir push -q --force "https://github.com/$Private.git" HEAD:refs/heads/factory-status
        if ($LASTEXITCODE) { Say "status push off (GitHub login missing on this PC?): $($out | Select-Object -Last 1)"; $script:StatusOff = $true }
    } catch { Say "status error: $($_.Exception.Message)" }
}

do {
    try {
        Update-Repo
        Send-Proof
        Build-Pending
        Test-Kit14b
        Publish-Status
    } catch { Say "LOOP ERROR: $($_.Exception.Message)" }
    if ($Watch) { Start-Sleep -Seconds ($EveryMinutes * 60) }
} while ($Watch)
$mutex.ReleaseMutex()
