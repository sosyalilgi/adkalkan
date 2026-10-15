Add-Type -AssemblyName System.Drawing

$outDir = Join-Path (Get-Location) "extension\icons"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$sizes = @(16, 32, 48, 128)
$base  = 512   # draw large, downscale for smooth edges

# --- shield path (unit space 0..1) ---
function New-ShieldPath([double]$w, [double]$h) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $m = $w * 0.06                 # side margin
  $top = $h * 0.05
  $shoulder = $h * 0.30
  $tip = $h * 0.96
  $cx = $w / 2

  $p.AddLine($cx, $top, ($w - $m), $shoulder)
  $p.AddLine(($w - $m), $shoulder, ($w - $m), ($h * 0.56))
  $p.AddBezier(($w - $m), ($h * 0.56), ($w - $m), ($h * 0.80), (($cx + $w * 0.17)), ($tip - $h * 0.02), $cx, $tip)
  $p.AddBezier($cx, $tip, (($cx - $w * 0.17)), ($tip - $h * 0.02), $m, ($h * 0.80), $m, ($h * 0.56))
  $p.AddLine($m, ($h * 0.56), $m, $shoulder)
  $p.AddLine($m, $shoulder, $cx, $top)
  $p.CloseFigure()
  return ,$p   # comma stops PowerShell from unrolling the path object
}

# --- master bitmap ---
$big = New-Object System.Drawing.Bitmap($base, $base)
$g = [System.Drawing.Graphics]::FromImage($big)
$g.SmoothingMode = 'AntiAlias'
$g.InterpolationMode = 'HighQualityBicubic'
$g.PixelOffsetMode = 'HighQuality'
$g.Clear([System.Drawing.Color]::Transparent)

$shield = New-ShieldPath $base $base

# soft drop shadow (drawn with a transform instead of copying the path)
$shadowBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(45, 0, 0, 0))
$state = $g.Save()
$g.TranslateTransform(0, [float]($base * 0.012))
$g.FillPath($shadowBrush, $shield)
$g.Restore($state)

# gradient body
$grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  (New-Object System.Drawing.PointF(0, 0)),
  (New-Object System.Drawing.PointF($base, $base)),
  [System.Drawing.Color]::FromArgb(255, 42, 173, 105),
  [System.Drawing.Color]::FromArgb(255, 17, 92, 56))
$g.FillPath($grad, $shield)

# inner rim highlight
$pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(70, 255, 255, 255)), ($base * 0.018)
$g.DrawPath($pen, $shield)

# check mark
$penCheck = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), ($base * 0.085)
$penCheck.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$penCheck.EndCap   = [System.Drawing.Drawing2D.LineCap]::Round
$penCheck.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
$chk = @(
  (New-Object System.Drawing.PointF(($base * 0.285), ($base * 0.520))),
  (New-Object System.Drawing.PointF(($base * 0.440), ($base * 0.680))),
  (New-Object System.Drawing.PointF(($base * 0.730), ($base * 0.360)))
)
$g.DrawLines($penCheck, [System.Drawing.PointF[]]$chk)

$g.Dispose()

# --- downscale to every required size ---
foreach ($s in $sizes) {
  $bmp = New-Object System.Drawing.Bitmap($s, $s)
  $g2 = [System.Drawing.Graphics]::FromImage($bmp)
  $g2.SmoothingMode = 'AntiAlias'
  $g2.InterpolationMode = 'HighQualityBicubic'
  $g2.PixelOffsetMode = 'HighQuality'
  $g2.CompositingQuality = 'HighQuality'
  $g2.Clear([System.Drawing.Color]::Transparent)
  $g2.DrawImage($big, 0, 0, $s, $s)
  $g2.Dispose()
  $bmp.Save((Join-Path $outDir "icon$s.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output ("icon{0}.png  {1} KB" -f $s, [math]::Round((Get-Item (Join-Path $outDir "icon$s.png")).Length/1KB, 1))
}
$big.Dispose()
