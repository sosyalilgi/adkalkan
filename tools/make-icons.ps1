Add-Type -AssemblyName System.Drawing
$sizes = @(16, 32, 48, 128)
$outDir = Join-Path (Get-Location) "extension\icons"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

foreach ($s in $sizes) {
  $bmp = New-Object System.Drawing.Bitmap($s, $s)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.TextRenderingHint = 'AntiAliasGridFit'
  $g.Clear([System.Drawing.Color]::Transparent)

  # shield path
  $w = [double]$s; $h = [double]$s
  $m = $s * 0.08
  $top = $m
  $mid = $h * 0.62
  $bottom = $h - $m
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddLine($w/2, $top, $w - $m, $top + $h*0.12)
  $path.AddLine($w - $m, $top + $h*0.12, $w - $m, $mid)
  $path.AddBezier(($w - $m), $mid, ($w - $m), ($mid + ($bottom-$mid)*0.55), ($w*0.5 + $m*1.2), $bottom, ($w/2), $bottom)
  $path.AddBezier(($w/2), $bottom, ($w*0.5 - $m*1.2), $bottom, $m, ($mid + ($bottom-$mid)*0.55), $m, $mid)
  $path.AddLine($m, $mid, $m, $top + $h*0.12)
  $path.AddLine($m, $top + $h*0.12, $w/2, $top)
  $path.CloseFigure()

  $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 26, 127, 75))
  $g.FillPath($brush, $path)

  $fontSize = [Math]::Max(8, [int]($s * 0.52))
  $font = New-Object System.Drawing.Font("Arial", $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = 'Center'
  $sf.LineAlignment = 'Center'
  $rect = New-Object System.Drawing.RectangleF(0, ($h*0.06), $w, ($h*0.86))
  $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  $g.DrawString("A", $font, $white, $rect, $sf)

  $g.Dispose()
  $bmp.Save((Join-Path $outDir "icon$s.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output "icon$s.png"
}
