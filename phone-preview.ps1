# =============================================================
# View FitJo on your PHONE (same Wi-Fi as this computer).
#
# HOW TO RUN:
#   Right-click this file  ->  "Run with PowerShell"
#   If it closes instantly, right-click -> "Run as administrator".
#   (Admin is needed the FIRST time to open the port to your Wi-Fi.)
#
# Then on your phone's browser, open the address it prints
# (e.g. http://192.168.20.83:8080). Keep this window open.
# Press Ctrl+C in the window to stop.
# =============================================================

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
$port = 8080

# Allow the port through Windows Firewall (harmless if it already exists)
try {
  New-NetFirewallRule -DisplayName "FitJo preview $port" -Direction Inbound `
    -Action Allow -Protocol TCP -LocalPort $port -ErrorAction Stop | Out-Null
} catch {}

# Find this PC's Wi-Fi / LAN address
$ip = (Get-NetIPAddress -AddressFamily IPv4 |
       Where-Object { $_.IPAddress -like '192.168.*' -or $_.IPAddress -like '10.*' -or $_.IPAddress -like '172.*' } |
       Select-Object -First 1).IPAddress
if (-not $ip) { $ip = "localhost" }

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://+:$port/")
try {
  $listener.Start()
} catch {
  Write-Host ""
  Write-Host "  Could not open the port. Please close this and RIGHT-CLICK" -ForegroundColor Yellow
  Write-Host "  the file -> 'Run as administrator', then try again." -ForegroundColor Yellow
  Write-Host ""
  Read-Host "Press Enter to close"
  exit 1
}

Write-Host ""
Write-Host "  =====================================================" -ForegroundColor Green
Write-Host "   FitJo is running!" -ForegroundColor Green
Write-Host "   On your phone (same Wi-Fi) open this in the browser:" -ForegroundColor Green
Write-Host ""
Write-Host "        http://$ip`:$port" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Keep this window open. Press Ctrl+C to stop." -ForegroundColor Green
Write-Host "  =====================================================" -ForegroundColor Green
Write-Host ""

$mime = @{
  ".html" = "text/html; charset=utf-8"; ".css" = "text/css; charset=utf-8"
  ".js" = "application/javascript; charset=utf-8"; ".json" = "application/json; charset=utf-8"
  ".png" = "image/png"; ".jpg" = "image/jpeg"; ".svg" = "image/svg+xml"
}

while ($listener.IsListening) {
  $ctx  = $listener.GetContext()
  $path = [System.Uri]::UnescapeDataString($ctx.Request.Url.LocalPath).TrimStart("/")
  if ([string]::IsNullOrEmpty($path)) { $path = "index.html" }
  $file = Join-Path $root $path
  try {
    if (Test-Path $file -PathType Leaf) {
      $bytes = [System.IO.File]::ReadAllBytes($file)
      $ext = [System.IO.Path]::GetExtension($file).ToLower()
      if ($mime.ContainsKey($ext)) { $ctx.Response.ContentType = $mime[$ext] }
      $ctx.Response.Headers.Add("Cache-Control", "no-store")
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
    }
  } catch {
    $ctx.Response.StatusCode = 500
  } finally {
    $ctx.Response.Close()
  }
}
