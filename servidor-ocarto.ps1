# Ocarto local static server; Windows PowerShell 5.1; loopback only.
$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath($PSScriptRoot)
$rootPrefix = $root.TrimEnd('\') + '\'
$port = 8787
$server = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
try {
    $server.Start()
    Write-Host "OCARTO - servidor local (solo este ordenador)" -ForegroundColor Green
    Write-Host "Editor: http://127.0.0.1:$port/"
    Write-Host "Deja esta ventana abierta para utilizar LiDAR. Ctrl+C para cerrar."
    Start-Process "http://127.0.0.1:$port/"
    while ($true) {
        $client = $server.AcceptTcpClient()
        try {
            $client.ReceiveTimeout = 15000
            $client.SendTimeout = 15000
            $stream = $client.GetStream()
            $reader = [System.IO.StreamReader]::new($stream, [Text.Encoding]::ASCII, $false, 1024, $true)
            $line = $reader.ReadLine()
            $lines = 0
            while (($header = $reader.ReadLine()) -ne $null -and $header.Length -gt 0 -and $lines -lt 60) {
                $lines++
            }
            $status = '200 OK'
            $type = 'text/plain; charset=utf-8'
            $bytes = [Text.Encoding]::UTF8.GetBytes('Not found')
            if ($line -match '^GET\s+([^\s]+)\s+HTTP/1\.[01]$') {
                $uri = [Uri]::UnescapeDataString(($matches[1] -split '\?')[0])
                if ($uri -eq '/') { $uri = '/index.html' }
                $path = [IO.Path]::GetFullPath((Join-Path $root $uri.TrimStart('/').Replace('/','\')))
                if (!$path.StartsWith($rootPrefix, [StringComparison]::OrdinalIgnoreCase)) {
                    $status = '403 Forbidden'
                    $bytes = [Text.Encoding]::UTF8.GetBytes('Forbidden')
                } elseif ([IO.File]::Exists($path)) {
                    switch ([IO.Path]::GetExtension($path).ToLowerInvariant()) {
                        '.html' { $type='text/html; charset=utf-8' }
                        '.js'   { $type='text/javascript; charset=utf-8' }
                        '.css'  { $type='text/css; charset=utf-8' }
                        '.wasm' { $type='application/wasm' }
                        '.json' { $type='application/json; charset=utf-8' }
                        '.svg'  { $type='image/svg+xml' }
                        '.png'  { $type='image/png' }
                        '.ico'  { $type='image/x-icon' }
                        '.zip'  { $type='application/zip' }
                        default { $type='application/octet-stream' }
                    }
                    $bytes = [IO.File]::ReadAllBytes($path)
                } else {
                    $status = '404 Not Found'
                }
            } else {
                $status = '405 Method Not Allowed'
            }
            $crlf = [string][char]13 + [char]10
            $response = "HTTP/1.1 $status" + $crlf +
                "Content-Type: $type" + $crlf +
                "Content-Length: $($bytes.Length)" + $crlf +
                "Cache-Control: no-cache" + $crlf +
                "X-Content-Type-Options: nosniff" + $crlf +
                "Connection: close" + $crlf + $crlf
            $head = [Text.Encoding]::ASCII.GetBytes($response)
            $stream.Write($head, 0, $head.Length)
            $stream.Write($bytes, 0, $bytes.Length)
        } catch {
            Write-Warning ('Peticion web fallida: ' + $_.Exception.Message)
        } finally {
            $client.Close()
        }
    }
} finally {
    $server.Stop()
}