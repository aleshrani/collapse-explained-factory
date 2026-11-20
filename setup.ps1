# Collapse Explained - one-time setup of the unattended production PC (Windows 10/11, NVIDIA GPU).
# Run from the repo root:  powershell -ExecutionPolicy Bypass -File .\setup.ps1
# Safe to run again: every step skips what is already done.
# Installs only from official sources (winget, GitHub releases of the model authors, ollama.com)
# and checks the SHA-256 of every downloaded voice model.

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$env:GIT_TERMINAL_PROMPT = "0"
Start-Transcript -Path (Join-Path $Root "setup.log") -Append | Out-Null
# Keep big data on the drive of this folder (e.g. D:), not on C: - caches, temp files, Ollama models.
$Cache = Join-Path $Root ".cache"
New-Item -ItemType Directory -Force $Cache | Out-Null
$env:npm_config_cache = Join-Path $Cache "npm"
$env:PIP_CACHE_DIR = Join-Path $Cache "pip"
$OllamaModels = Join-Path (Split-Path $Root -Parent) "CollapseExplained-ollama"

function Step($msg) { Write-Host ""; Write-Host "=== $msg" -ForegroundColor Cyan }
function Refresh-Path {
    $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
}
function Have($cmd) { [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }
# Run a native command without PowerShell 5.1 turning its stderr into an error; returns the exit code.
function Run($line) { cmd /c $line | Out-Host; return $LASTEXITCODE }
function Winget($id, $extra = "") {
    $code = Run "winget install --id $id --exact --silent --accept-package-agreements --accept-source-agreements $extra"
    # 0 = installed, 0x8A15002B / 0x8A150061 = already installed / no newer version
    if ($code -ne 0 -and $code -ne -1978335189 -and $code -ne -1978335135) { throw "winget install $id failed (exit $code)" }
    Refresh-Path
}

try {
# 0. Checks ------------------------------------------------------------------
Step "Checks"
if (-not (Have "winget")) { throw "winget is missing. Install 'App Installer' from Microsoft Store, then run this again." }
$drive = (Get-Item $Root).PSDrive
$freeGB = [math]::Round($drive.Free / 1GB)
Write-Host "Free space on $($drive.Name): $freeGB GB (needs about 50 GB)"
if ($freeGB -lt 50) { throw "Not enough free disk space (need ~50 GB)." }
if ((Run "git -C `"$Root`" ls-remote origin HEAD >nul 2>nul") -ne 0) { throw "GitHub access does not work (git ls-remote). Log in to GitHub when git asks, then run again." }

# 1. Programs ---------------------------------------------------------------
Step "Programs (winget)"
if (-not (Have "node"))   { Winget "OpenJS.NodeJS.LTS" }
if ((Run "py -3.14 --version >nul 2>nul") -ne 0) { Winget "Python.Python.3.14" }
if (-not (Have "ffmpeg")) { Winget "Gyan.FFmpeg" }
if (-not (Have "ollama")) { Winget "Ollama.Ollama" }
if (-not (Have "gh"))     { Winget "GitHub.cli" }
function Find-Chrome {
    foreach ($p in "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
                   "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
                   "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe") { if (Test-Path $p) { return $p } }
    return $null
}
$chrome = Find-Chrome
if (-not $chrome) { Winget "Google.Chrome"; $chrome = Find-Chrome }
foreach ($c in "node", "npm", "ffmpeg", "ollama", "gh") {
    if (-not (Have $c)) { throw "$c is still not on PATH. Close this window, open a new PowerShell and run setup.ps1 again." }
}
if ((Run "py -3.14 --version >nul 2>nul") -ne 0) { throw "Python 3.14 not found. Open a new PowerShell and run setup.ps1 again." }
if (-not $chrome) { throw "Google Chrome not found after install. Install Chrome manually, then run setup.ps1 again." }
# The render scripts read CHROME_PATH (user variable, so the factory sees it at every logon).
[Environment]::SetEnvironmentVariable("CHROME_PATH", $chrome, "User")
$env:CHROME_PATH = $chrome
Write-Host "Chrome: $chrome"

# 1b. GitHub login (once): status and finished videos go to the PRIVATE repo -----
Step "GitHub login (once)"
$Private = "aleshrani/collapse-explained"
if ((Run "gh auth status >nul 2>nul") -ne 0) {
    Write-Host "A browser window opens: log in to GitHub as aleshrani and confirm the code shown here." -ForegroundColor Yellow
    & gh auth login --hostname github.com --git-protocol https --web
    if ($LASTEXITCODE) { throw "GitHub login failed" }
}
Run "gh auth setup-git" | Out-Null
if ((Run "gh repo view $Private --json name >nul 2>nul") -ne 0) { throw "This GitHub login cannot see $Private (status and videos go there). Log in as the owner and run again." }

# 2. Engine (Remotion + three.js) -------------------------------------------
Step "Engine packages (npm ci)"
$marker = Join-Path $Root "engine\node_modules\.ci-ok"
if (-not (Test-Path $marker)) {
    if ((Run "cd /d `"$Root\engine`" && npm ci") -ne 0) { throw "npm ci failed" }
    Set-Content $marker (Get-Date -Format s)
} else { Write-Host "OK  node_modules present" }

# 3. Voice (Kokoro + Parakeet) ------------------------------------------------
Step "Voice environment (Python venv)"
$venvPy = Join-Path $Root "voice\.venv\Scripts\python.exe"
if (-not (Test-Path $venvPy)) {
    if ((Run "py -3.14 -m venv `"$Root\voice\.venv`"") -ne 0) { throw "Could not create the Python 3.14 venv" }
}
Run "`"$venvPy`" -m pip install --upgrade pip" | Out-Null
if ((Run "`"$venvPy`" -m pip install -r `"$Root\voice\requirements.txt`"") -ne 0) { throw "pip install failed" }

Step "Voice models (download + SHA-256 check)"
$models = Join-Path $Root "voice\models"
New-Item -ItemType Directory -Force $models | Out-Null
function Get-Verified($url, $dest, $sha) {
    if ((Test-Path $dest) -and ((Get-FileHash $dest -Algorithm SHA256).Hash -eq $sha)) { Write-Host "OK  $(Split-Path $dest -Leaf)"; return }
    Write-Host "Downloading $(Split-Path $dest -Leaf) ..."
    if ((Run "curl.exe -L --fail -o `"$dest`" $url") -ne 0) { throw "Download failed: $url" }
    if ((Get-FileHash $dest -Algorithm SHA256).Hash -ne $sha) { Remove-Item $dest; throw "Checksum mismatch for $dest" }
}
$kok = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0"
Get-Verified "$kok/kokoro-v1.0.onnx" (Join-Path $models "kokoro-v1.0.onnx") "7D5DF8ECF7D4B1878015A32686053FD0EEBE2BC377234608764CC0EF3636A6C5"
Get-Verified "$kok/voices-v1.0.bin"  (Join-Path $models "voices-v1.0.bin")  "BCA610B8308E8D99F32E6FE4197E7EC01679264EFED0CAC9140FE9C29F1FBF7D"

$pkName = "sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8"
$pkDir = Join-Path $models $pkName
$pkFiles = @{
    "encoder.int8.onnx" = "92A10BD9C23936EA0566C29F963BC57C2A5DF4261B6A8921C39ABEA66557CA8B";
    "decoder.int8.onnx" = "4D097BAE3BAC5C96018D5293BA39F1B657296102B142AFFDA40378F38B020F41";
    "joiner.int8.onnx"  = "77A29F3E5AC7D37074E0AF465391B80F314015D5B97F0F90C6C7767F1D56F428";
    "tokens.txt"        = "EC182B70DD42113AFF6C5372C75CAC58C952443EB22322F57BBD7F53977D497D"
}
function Test-Parakeet {
    foreach ($f in $pkFiles.Keys) {
        $p = Join-Path $pkDir $f
        if (-not (Test-Path $p)) { return $false }
        if ((Get-FileHash $p -Algorithm SHA256).Hash -ne $pkFiles[$f]) { return $false }
    }
    return $true
}
if (Test-Parakeet) { Write-Host "OK  $pkName" }
else {
    $tar = Join-Path $Cache "$pkName.tar.bz2"
    try {
        Write-Host "Downloading $pkName (~650 MB) ..."
        if ((Run "curl.exe -L --fail -o `"$tar`" https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/$pkName.tar.bz2") -ne 0) { throw "Parakeet download failed" }
        if ((Run "tar.exe -xjf `"$tar`" -C `"$models`"") -ne 0) { throw "Parakeet unpack failed" }
    } finally { Remove-Item $tar -ErrorAction SilentlyContinue }
    if (-not (Test-Parakeet)) { throw "Parakeet files do not match the expected checksums" }
}

# 4. Local LLM ----------------------------------------------------------------
Step "Ollama models (stored in $OllamaModels)"
if ([Environment]::GetEnvironmentVariable("OLLAMA_MODELS", "User") -ne $OllamaModels) {
    New-Item -ItemType Directory -Force $OllamaModels | Out-Null
    [Environment]::SetEnvironmentVariable("OLLAMA_MODELS", $OllamaModels, "User")
    # Ollama must restart to see the new folder; models already downloaded to C: are moved, not downloaded again.
    Get-Process "ollama app", "ollama" -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep 2
    $old = Join-Path $env:USERPROFILE ".ollama\models"
    if (Test-Path (Join-Path $old "blobs")) { Run "robocopy `"$old`" `"$OllamaModels`" /E /MOVE /NFL /NDL /NJH /NJS /R:2 /W:2" | Out-Null }
}
$env:OLLAMA_MODELS = $OllamaModels
$up = $false
for ($i = 0; $i -lt 60; $i++) {
    try { Invoke-RestMethod "http://127.0.0.1:11434/api/tags" -TimeoutSec 2 | Out-Null; $up = $true; break } catch { }
    if ($i -eq 0) { $app = Join-Path $env:LOCALAPPDATA "Programs\Ollama\ollama app.exe"; if (Test-Path $app) { Start-Process $app } }
    if ($i -eq 30) { Start-Process "ollama" -ArgumentList "serve" -WindowStyle Hidden }
    Start-Sleep 2
}
if (-not $up) { throw "Ollama server did not start" }
if ((Run "ollama pull qwen2.5-coder:7b") -ne 0)  { throw "ollama pull qwen2.5-coder:7b failed" }    # shot plans
if ((Run "ollama pull qwen2.5-coder:14b") -ne 0) { throw "ollama pull qwen2.5-coder:14b failed" }   # 3D environment test

# 5. Smoke test -----------------------------------------------------------------
Step "Smoke test: 60 s proof of episode 1 (can take an hour)"
$t = Get-Date
$code = Run "cd /d `"$Root\engine`" && node scripts/make-episode.mjs 01-dubai-world-islands --proof"
$min = [math]::Round(((Get-Date) - $t).TotalMinutes, 1)
if ($code -ne 0) { throw "Smoke test FAILED after $min min - see episodes\01-dubai-world-islands\build.log. Factory NOT started." }
Write-Host "Proof rendered in $min min -> episodes\01-dubai-world-islands\proof-v2\episode.mp4" -ForegroundColor Green
Add-Content (Join-Path $Root "factory.log") "$(Get-Date -Format s) SETUP smoke test (60 s proof) rendered in $min min" -Encoding UTF8

# 6. Unattended mode ------------------------------------------------------------
Step "Unattended mode"
Run "git -C `"$Root`" config user.name factory-pc" | Out-Null          # neutral identity for status commits
Run "git -C `"$Root`" config user.email factory-pc@localhost" | Out-Null
Run "powercfg /change standby-timeout-ac 0" | Out-Null                    # never sleep on mains power
Run "powercfg /change hibernate-timeout-ac 0" | Out-Null
$psArgs = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$Root\factory.ps1`" -Watch"
Remove-Item (Join-Path ([Environment]::GetFolderPath("Startup")) "CollapseExplainedFactory.lnk") -ErrorAction SilentlyContinue
try {
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $psArgs -WorkingDirectory $Root
    $trigger = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
    $settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 5) -MultipleInstances IgnoreNew -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    Register-ScheduledTask -TaskName "CollapseExplainedFactory" -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
    Write-Host "Scheduled task CollapseExplainedFactory registered (starts at logon, restarts if it stops)."
} catch {
    # Fallback without admin rights: Unicode-safe shortcut in the Startup folder.
    $lnk = Join-Path ([Environment]::GetFolderPath("Startup")) "CollapseExplainedFactory.lnk"
    $sh = (New-Object -ComObject WScript.Shell).CreateShortcut($lnk)
    $sh.TargetPath = "powershell.exe"; $sh.Arguments = $psArgs; $sh.WorkingDirectory = $Root; $sh.WindowStyle = 7
    $sh.Save()
    Write-Host "Startup shortcut created (task registration needed admin: $($_.Exception.Message))."
}
Start-Process powershell -ArgumentList $psArgs -WindowStyle Hidden
Write-Host ""
Write-Host "Factory started. Keep this Windows account logged in (or enable auto-login). You can close this window." -ForegroundColor Green
}
catch {
    Write-Host ""
    Write-Host "SETUP STOPPED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Fix the problem and run setup.ps1 again (finished steps are skipped)." -ForegroundColor Red
}
finally { Stop-Transcript | Out-Null }
