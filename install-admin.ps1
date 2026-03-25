$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "-> $Message" -ForegroundColor Yellow
}

function Write-Ok {
    param([string]$Message)
    Write-Host "OK $Message" -ForegroundColor Green
}

function Fail {
    param([string]$Message)
    Write-Host "ERROR $Message" -ForegroundColor Red
    exit 1
}

function Require-Command {
    param(
        [string]$Command,
        [string]$Label
    )

    if (-not (Get-Command $Command -ErrorAction SilentlyContinue)) {
        Fail "$Label is not installed"
    }
}

function Run-OrFail {
    param(
        [string]$Label,
        [string]$LogFile,
        [scriptblock]$Command
    )

    & $Command *> $LogFile
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR $Label failed" -ForegroundColor Red
        Write-Host "  Log: $LogFile"
        Write-Host ""
        if (Test-Path $LogFile) {
            Get-Content -Path $LogFile -Tail 20 | ForEach-Object { Write-Host $_ }
        }
        exit 1
    }
}

function Copy-LocalSource {
    param(
        [string]$SourceDir,
        [string]$DestinationDir
    )

    if (-not (Test-Path $SourceDir)) {
        Fail "A1ZAP_INSTALL_SOURCE_DIR does not exist: $SourceDir"
    }

    New-Item -ItemType Directory -Path $DestinationDir -Force | Out-Null
    Get-ChildItem -LiteralPath $SourceDir -Force |
        Where-Object { $_.Name -ne ".git" -and $_.Name -ne "node_modules" } |
        Copy-Item -Destination $DestinationDir -Recurse -Force
}

function Download-Repo {
    param(
        [string]$InstallDir
    )

    if ($env:A1ZAP_INSTALL_SOURCE_DIR) {
        Copy-LocalSource -SourceDir $env:A1ZAP_INSTALL_SOURCE_DIR -DestinationDir $InstallDir
        return
    }

    $repoUrl = "https://github.com/a1baseai/a1zap-miniapp-editor.git"
    $zipUrl = "https://github.com/a1baseai/a1zap-miniapp-editor/archive/main.zip"

    if (Get-Command git -ErrorAction SilentlyContinue) {
        try {
            & git clone --depth 1 $repoUrl $InstallDir 2>$null
            if ($LASTEXITCODE -eq 0) {
                return
            }
        } catch {
        }

        Write-Step "Git clone failed, falling back to direct download..."
        if (Test-Path $InstallDir) {
            Remove-Item -Path $InstallDir -Recurse -Force
        }
    }

    $tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("a1zap-admin-install-" + [guid]::NewGuid().ToString("N"))
    $zipPath = Join-Path $tempRoot "a1zap-miniapp-editor.zip"

    New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath
    Expand-Archive -LiteralPath $zipPath -DestinationPath $tempRoot -Force
    Move-Item -Path (Join-Path $tempRoot "a1zap-miniapp-editor-main") -Destination $InstallDir
    Remove-Item -Path $tempRoot -Recurse -Force
}

Write-Host ""
Write-Host "==============================================="
Write-Host "     A1Zap MiniApp Admin CLI - Windows Installer"
Write-Host "==============================================="
Write-Host ""

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Fail "Node.js is not installed. Install Node.js 18 or newer from https://nodejs.org and run this script again."
}

$nodeVersion = (& node -v).Trim()
$nodeMajor = [int](($nodeVersion -replace "^v", "").Split(".")[0])
if ($nodeMajor -lt 18) {
    Fail "Node.js 18+ is required (you have $nodeVersion)"
}

Write-Ok "Node.js $nodeVersion detected"
Require-Command -Command "npm" -Label "npm"

$homeDir = [Environment]::GetFolderPath("UserProfile")
$installRoot = Join-Path $homeDir ".a1zap-admin"
$installDir = Join-Path $installRoot "cli"
$binDir = Join-Path $installRoot "bin"
$shimPath = Join-Path $binDir "a1zap-admin.cmd"

if (Test-Path $installDir) {
    Write-Step "Removing previous installation..."
    Remove-Item -Path $installDir -Recurse -Force
}

Write-Step "Downloading A1Zap Admin CLI..."
New-Item -ItemType Directory -Path $installRoot -Force | Out-Null
Download-Repo -InstallDir $installDir
Write-Ok "Downloaded"

Write-Step "Installing dependencies..."
Push-Location $installDir
$installLog = Join-Path ([System.IO.Path]::GetTempPath()) ("a1zap-admin-install-" + [guid]::NewGuid().ToString("N") + ".log")
if (Test-Path (Join-Path $installDir "package-lock.json")) {
    Run-OrFail -Label "Dependency installation" -LogFile $installLog -Command { npm ci --silent }
} else {
    Run-OrFail -Label "Dependency installation" -LogFile $installLog -Command { npm install --silent }
}
Write-Ok "Dependencies installed"

if ((Test-Path (Join-Path $installDir "tsconfig.json")) -and -not (Test-Path (Join-Path $installDir "dist"))) {
    Write-Step "Building..."
    $buildLog = Join-Path ([System.IO.Path]::GetTempPath()) ("a1zap-admin-build-" + [guid]::NewGuid().ToString("N") + ".log")
    Run-OrFail -Label "Build" -LogFile $buildLog -Command { npm run build --silent }
    Write-Ok "Built"
}
Pop-Location

if (-not (Test-Path (Join-Path $installDir "bin\a1zap-admin.js")) -or -not (Test-Path (Join-Path $installDir "dist\admin-cli.js"))) {
    Fail "Installation is incomplete. Expected CLI files were not created."
}

New-Item -ItemType Directory -Path $binDir -Force | Out-Null
$shimContents = "@echo off`r`nnode `"%~dp0..\cli\bin\a1zap-admin.js`" %*`r`n"
Set-Content -Path $shimPath -Value $shimContents -Encoding ASCII
Write-Ok "CLI installed"

$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$userPathEntries = @()
if (-not [string]::IsNullOrWhiteSpace($userPath)) {
    $userPathEntries = $userPath.Split(";") | Where-Object { $_ }
}

if ($userPathEntries -notcontains $binDir) {
    $newUserPath = if ([string]::IsNullOrWhiteSpace($userPath)) { $binDir } else { "$binDir;$userPath" }
    [Environment]::SetEnvironmentVariable("Path", $newUserPath, "User")
    if (($env:Path.Split(";") | Where-Object { $_ }) -notcontains $binDir) {
        $env:Path = "$binDir;$env:Path"
    }
    Write-Ok "Added $binDir to your user PATH"
}

Write-Host ""
Write-Host "===============================================" -ForegroundColor Green
Write-Host "     OK Installation complete!" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Next steps:"
Write-Host ""
Write-Host "  1. Restart your terminal"
Write-Host ""
Write-Host "  2. Configure your API key:"
Write-Host '     a1zap-admin config "your-api-key"'
Write-Host ""
Write-Host "  3. List your apps:"
Write-Host "     a1zap-admin list"
Write-Host ""
Write-Host "  You can also run the CLI right now with:"
Write-Host "     $shimPath"
Write-Host ""
