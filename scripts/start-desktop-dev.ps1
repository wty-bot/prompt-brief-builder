$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

$env:ELECTRON_RUN_AS_NODE = $null
$env:ELECTRON_ENABLE_LOGGING = "1"
Remove-Item -LiteralPath (Join-Path $ProjectRoot "dist-electron\package.json") -Force -ErrorAction SilentlyContinue
npm.cmd run dev:desktop
