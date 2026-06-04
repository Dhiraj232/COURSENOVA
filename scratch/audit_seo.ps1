$publicDir = Join-Path $PSScriptRoot "..\public"
$htmlFiles = Get-ChildItem -Path $publicDir -Filter *.html

$results = foreach ($file in $htmlFiles) {
    $content = Get-Content $file.FullName -Raw
    
    $robots = "MISSING"
    if ($content -match '<meta[^>]*?name=["'']robots["''][^>]*?content=["'']([^"'']+)["'']') {
        $robots = $Matches[1]
    } elseif ($content -match '<meta[^>]*?content=["'']([^"'']+)["''][^>]*?name=["'']robots["'']') {
        $robots = $Matches[1]
    }
    
    $canonical = "MISSING"
    if ($content -match '<link[^>]*?rel=["'']canonical["''][^>]*?href=["'']([^"'']+)["'']') {
        $canonical = $Matches[1]
    } elseif ($content -match '<link[^>]*?href=["'']([^"'']+)["''][^>]*?rel=["'']canonical["'']') {
        $canonical = $Matches[1]
    }
    
    [PSCustomObject]@{
        File      = $file.Name
        Robots    = $robots
        Canonical = $canonical
    }
}

$results | Format-Table -AutoSize
