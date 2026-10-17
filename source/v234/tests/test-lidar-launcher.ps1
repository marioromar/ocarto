# Windows PowerShell 5.1 real-launch smoke test. No browser session required.
$ErrorActionPreference = "Stop"
$env:OCARTO_HEADLESS="1"
$script = Join-Path $PSScriptRoot "..\..\..\servidor-ocarto.ps1"
if (!(Test-Path $script)) { throw "Local Ocarto server script missing" }
$out = Join-Path $env:TEMP "ocarto-server-out.log"
$err = Join-Path $env:TEMP "ocarto-server-err.log"
$proc = Start-Process -FilePath "powershell.exe" -ArgumentList @(
  "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $script
) -PassThru -WindowStyle Hidden -RedirectStandardOutput $out -RedirectStandardError $err
try {
    $ok=$false
    for($i=0;$i -lt 25;$i++){
        Start-Sleep -Milliseconds 500
        try {
            $page=Invoke-WebRequest -Uri "http://127.0.0.1:8787/" -UseBasicParsing -TimeoutSec 2
            if($page.StatusCode -eq 200 -and $page.Content -match "Ocarto"){$ok=$true;break}
        } catch {
            if($proc.HasExited){break}
        }
    }
    if(!$ok) {
      $message=if(Test-Path $err){Get-Content $err -Raw}else{"No stderr"}
      throw "Failed to start Ocarto PowerShell server: $message"
    }
    $reuseOut = Join-Path $env:TEMP "ocarto-server-reuse-out.log"
    $reuseErr = Join-Path $env:TEMP "ocarto-server-reuse-err.log"
    $reuseProc = Start-Process -FilePath "powershell.exe" -ArgumentList @(
      "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $script
    ) -PassThru -Wait -WindowStyle Hidden -RedirectStandardOutput $reuseOut -RedirectStandardError $reuseErr
    if($reuseProc.ExitCode -ne 0) {
      $message=if(Test-Path $reuseErr){Get-Content $reuseErr -Raw}else{"No stderr"}
      throw "The second launcher did not reuse the active Ocarto server: $message"
    }
    foreach($file in @("source/v234/lidar-worker.js",
      "source/v234/vendor/laz-perf.js","source/v234/vendor/laz-perf.wasm")){
        $req=Invoke-WebRequest -Uri "http://127.0.0.1:8787/$file" -UseBasicParsing -TimeoutSec 10
        if($req.StatusCode -ne 200){throw "$file HTTP $($req.StatusCode)"}
    }
    $wasm=Invoke-WebRequest -Uri "http://127.0.0.1:8787/source/v234/vendor/laz-perf.wasm" -UseBasicParsing
    if($wasm.Headers["Content-Type"] -ne "application/wasm"){throw "Wrong WebAssembly MIME type"}
    try{
      Invoke-WebRequest -Uri "http://127.0.0.1:8787/no-existe.js" -UseBasicParsing | Out-Null
      throw "Server returned HTTP 200 for missing files"
    }catch [System.Net.WebException] {
      if($_.Exception.Response.StatusCode -ne [System.Net.HttpStatusCode]::NotFound){throw}
    }
    Write-Host "PASS: real Windows server, editor, LiDAR worker and offline LAZ JS/WASM"
}finally{
    if(!$proc.HasExited){Stop-Process -Id $proc.Id -Force}
}
