$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

$env:ELECTRON_RUN_AS_NODE = $null
$env:ELECTRON_ENABLE_LOGGING = "1"
npm.cmd run dev:desktop
