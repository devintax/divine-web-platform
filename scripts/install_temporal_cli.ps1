$ErrorActionPreference = 'Stop'
$rel = Invoke-RestMethod -UseBasicParsing -Uri 'https://api.github.com/repos/temporalio/cli/releases/latest'
$asset = $rel.assets | Where-Object { $_.name -match 'windows' } | Select-Object -First 1
if ($null -eq $asset) { Write-Error 'No windows asset found in latest release'; exit 2 }
$tmp = Join-Path $env:TEMP 'temporal_cli_asset.zip'
Write-Output "Downloading $($asset.browser_download_url) to $tmp"
Invoke-WebRequest -UseBasicParsing -Uri $asset.browser_download_url -OutFile $tmp
$dest = Join-Path $env:USERPROFILE 'bin'
if (-not (Test-Path $dest)) { New-Item -ItemType Directory -Path $dest | Out-Null }
$assetName = $asset.name
Write-Output "Extracting $assetName to $dest"
if ($assetName -like '*.zip') {
    Expand-Archive -Path $tmp -DestinationPath $dest -Force
} elseif ($assetName -like '*.tar.gz' -or $assetName -like '*.tgz') {
    # Use tar (available on modern Windows) to extract tar.gz
    tar -xzf $tmp -C $dest
} else {
    try {
        Expand-Archive -Path $tmp -DestinationPath $dest -Force
    } catch {
        Write-Error "Unknown archive format: $assetName"
        exit 4
    }
}
$exe = Get-ChildItem -Path $dest -Recurse -Filter 'temporal*.exe' | Select-Object -First 1
if ($null -ne $exe) {
    Move-Item -Path $exe.FullName -Destination (Join-Path $dest 'temporal.exe') -Force
    Write-Output "Installed temporal to: " (Join-Path $dest 'temporal.exe')
} else {
    Write-Error 'temporal.exe not found after extraction'
    exit 3
}
$ver = & (Join-Path $dest 'temporal.exe') --version
Write-Output "temporal version: $ver" 
