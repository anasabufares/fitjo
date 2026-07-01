# Tiny static file server + admin save endpoint for the FitJo prototype.
# No installation needed — uses built-in Windows .NET HttpListener.
# Run from the project root:  powershell -ExecutionPolicy Bypass -File tools/server.ps1
# Then open:
#   App    ->  http://localhost:8080
#   Admin  ->  http://localhost:8080/admin.html   (add / remove gyms; writes public/js/data.js)

$ErrorActionPreference = "Stop"
$toolsDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = Split-Path -Parent $toolsDir
$root     = Join-Path $repoRoot "public"          # <- static site lives here
$dataFile = Join-Path $root "js\data.js"           # <- the gyms file the admin edits
$backupFile = Join-Path $repoRoot "data.js.bak"    # <- kept outside public/ (not deployed)
$prefix   = "http://localhost:8080/"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Host "FitJo running at $prefix   (serving $root)"
Write-Host "  App:   $prefix"
Write-Host "  Admin: ${prefix}admin.html   (edits save straight into public/js/data.js)"
Write-Host "Press Ctrl+C to stop."

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".png"  = "image/png"; ".jpg" = "image/jpeg"; ".svg" = "image/svg+xml"
}

function Send-Text($ctx, $status, $type, $text) {
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($text)
  $ctx.Response.StatusCode = $status
  $ctx.Response.ContentType = $type
  $ctx.Response.Headers.Add("Cache-Control", "no-store")
  $ctx.Response.ContentLength64 = $bytes.Length
  $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
}

while ($listener.IsListening) {
  $ctx  = $listener.GetContext()
  $req  = $ctx.Request
  $path = [System.Uri]::UnescapeDataString($req.Url.LocalPath).TrimStart("/")

  try {
    # ---- Health check so the admin page knows the server is running ----
    if ($req.HttpMethod -eq "GET" -and $path -eq "api/ping") {
      Send-Text $ctx 200 "application/json; charset=utf-8" '{"ok":true,"server":"fitjo"}'
    }

    # ---- Admin save: overwrite the GYMS block in public/js/data.js ----
    elseif ($req.HttpMethod -eq "POST" -and $path -eq "api/save-gyms") {
      $enc = $req.ContentEncoding
      if (-not $enc) { $enc = [System.Text.Encoding]::UTF8 }
      $reader = New-Object System.IO.StreamReader($req.InputStream, $enc)
      $body = $reader.ReadToEnd(); $reader.Close()

      if (-not $body.TrimStart().StartsWith("const GYMS")) {
        Send-Text $ctx 400 "application/json; charset=utf-8" '{"ok":false,"error":"Body must be a const GYMS = [...] block."}'
      }
      else {
        $startMarker = "/* FITJO-GYMS-START */"
        $endMarker   = "/* FITJO-GYMS-END */"
        $content     = [System.IO.File]::ReadAllText($dataFile, [System.Text.Encoding]::UTF8)

        if ($content.IndexOf($startMarker) -lt 0 -or $content.IndexOf($endMarker) -lt 0) {
          Send-Text $ctx 500 "application/json; charset=utf-8" '{"ok":false,"error":"Could not find FITJO-GYMS markers in data.js."}'
        }
        else {
          # Keep a one-step-back safety copy before overwriting (outside public/).
          [System.IO.File]::Copy($dataFile, $backupFile, $true)

          $newBlock  = $startMarker + "`r`n" + $body + "`r`n" + $endMarker
          $pattern   = "(?s)" + [regex]::Escape($startMarker) + ".*?" + [regex]::Escape($endMarker)
          # Closure so the (possibly $-containing) body is inserted verbatim.
          $evaluator = [System.Text.RegularExpressions.MatchEvaluator]({ param($m) $newBlock }.GetNewClosure())
          $new       = [System.Text.RegularExpressions.Regex]::Replace($content, $pattern, $evaluator)

          $utf8 = New-Object System.Text.UTF8Encoding($false)   # no BOM
          [System.IO.File]::WriteAllText($dataFile, $new, $utf8)
          Send-Text $ctx 200 "application/json; charset=utf-8" '{"ok":true}'
        }
      }
    }

    # ---- Static files (served from public/) ----
    else {
      if ([string]::IsNullOrEmpty($path)) { $path = "index.html" }
      $file = Join-Path $root $path
      # Directory (e.g. /admin/) -> serve its index.html, like Netlify does.
      if (Test-Path $file -PathType Container) { $file = Join-Path $file "index.html" }
      if (Test-Path $file -PathType Leaf) {
        $bytes = [System.IO.File]::ReadAllBytes($file)
        $ext = [System.IO.Path]::GetExtension($file).ToLower()
        if ($mime.ContainsKey($ext)) { $ctx.Response.ContentType = $mime[$ext] }
        $ctx.Response.Headers.Add("Cache-Control", "no-store")
        $ctx.Response.ContentLength64 = $bytes.Length
        $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
      } else {
        Send-Text $ctx 404 "text/plain; charset=utf-8" "404 Not Found: $path"
      }
    }
  } catch {
    try { Send-Text $ctx 500 "text/plain; charset=utf-8" ("500: " + $_.Exception.Message) } catch {}
  } finally {
    $ctx.Response.Close()
  }
}
