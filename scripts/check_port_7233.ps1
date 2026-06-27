$ErrorActionPreference = 'Stop'
$c = Get-NetTCPConnection -LocalPort 7233 -ErrorAction SilentlyContinue
if ($null -ne $c) {
  $c | Select-Object LocalAddress,LocalPort,State,OwningProcess | Format-Table -AutoSize
  foreach ($x in $c) {
    $p = Get-Process -Id $x.OwningProcess -ErrorAction SilentlyContinue
    if ($p) { $p | Select-Object Id,ProcessName,Path | Format-Table -AutoSize }
  }
} else {
  Write-Output 'No listener on port 7233'
}
