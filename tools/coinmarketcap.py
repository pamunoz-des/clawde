Set-Location C:\AI\claude-casero

& {
    $ErrorActionPreference = "Stop"
    $codigo = Get-Clipboard -Raw

    if ($codigo -notmatch 'class Tools' -or
        $codigo -notmatch 'async def consultar_btc_ada') {
        throw "Copia primero el código completo de la herramienta."
    }

    if ($codigo -notmatch 'default=""') {
        throw "Verifica que API_KEY tenga default vacío, sin tu clave."
    }

    $carpeta = Join-Path $PWD "tools"
    New-Item -ItemType Directory -Path $carpeta -Force | Out-Null

    $archivo = Join-Path $carpeta "coinmarketcap.py"

    if (Test-Path $archivo) {
        Copy-Item $archivo "$archivo.bak-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    }

    $utf8 = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText($archivo, $codigo, $utf8)

    $ignore = Join-Path $PWD ".gitignore"
    $texto = Get-Content $ignore -Raw

    foreach ($regla in @(
        "!/tools/"
        "/tools/*"
        "!/tools/coinmarketcap.py"
    )) {
        if (($texto -split '\r?\n') -notcontains $regla) {
            $texto = $texto.TrimEnd() + "`r`n" + $regla + "`r`n"
        }
    }

    [System.IO.File]::WriteAllText($ignore, $texto, $utf8)

    git add -- .gitignore tools/coinmarketcap.py
    if ($LASTEXITCODE -ne 0) { throw "Falló git add." }

    git --no-pager diff --cached --stat
}