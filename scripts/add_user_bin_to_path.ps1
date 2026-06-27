$ErrorActionPreference = 'Stop'
$p = [Environment]::GetEnvironmentVariable('PATH', 'User')
$add = Join-Path $env:USERPROFILE 'bin'
if (-not $p -or $p.IndexOf($add, [System.StringComparison]::OrdinalIgnoreCase) -eq -1) {
  if ($p) { $new = $p + ';' + $add } else { $new = $add }
  [Environment]::SetEnvironmentVariable('PATH', $new, 'User')
  Write-Output "Added $add to user PATH"
} else {
  Write-Output "$add already in user PATH"
}
Write-Output "USER PATH:"
[Environment]::GetEnvironmentVariable('PATH', 'User')
