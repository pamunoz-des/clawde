$ErrorActionPreference = "Stop"
$raiz = Split-Path $PSScriptRoot -Parent

function Nueva-Clave {
    $bytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $rng.GetBytes($bytes)
        return ([BitConverter]::ToString($bytes)).Replace("-", "").ToLowerInvariant()
    }
    finally {
        $rng.Dispose()
    }
}

Push-Location $raiz
try {
    foreach ($ruta in @(
        "compose.yaml",
        "compose.override.yaml",
        ".env.example",
        "searxng\settings.example.yml",
        "personalizacion\custom.css",
        "personalizacion\logo-clawde.png"
    )) {
        if (-not (Test-Path $ruta -PathType Leaf)) {
            throw "Falta el archivo requerido: $ruta"
        }
    }

    Get-Command docker -ErrorAction Stop | Out-Null

    & docker info --format '{{.OSType}}'
    if ($LASTEXITCODE -ne 0) {
        throw "Docker no responde. Inicia Docker Desktop."
    }

    & docker compose version
    if ($LASTEXITCODE -ne 0) {
        throw "Docker Compose no está disponible."
    }

    foreach ($ruta in @("workspace", "searxng")) {
        if ((Test-Path $ruta) -and -not (Test-Path $ruta -PathType Container)) {
            throw "La ruta debe ser una carpeta: $ruta"
        }
        New-Item -ItemType Directory -Path $ruta -Force | Out-Null
    }

    $utf8 = [System.Text.UTF8Encoding]::new($false)

    if (Test-Path ".env" -PathType Leaf) {
        Write-Host ".env existente: conservado."
    }
    elseif (Test-Path ".env") {
        throw ".env existe pero no es un archivo."
    }
    else {
        $texto = Get-Content ".env.example" -Raw -Encoding UTF8
        foreach ($nombre in @("WEBUI_SECRET_KEY", "OPEN_TERMINAL_API_KEY")) {
            $patron = "(?m)^" + $nombre + "=[^\r\n]*"
            if (-not [regex]::IsMatch($texto, $patron)) {
                throw "Falta $nombre en .env.example."
            }
            $texto = [regex]::Replace(
                $texto, $patron, ($nombre + "=" + (Nueva-Clave))
            )
        }
        [System.IO.File]::WriteAllText(
            (Join-Path $raiz ".env"), $texto, $utf8
        )
        Write-Host ".env creado con claves nuevas."
    }

    if (Test-Path "searxng\settings.yml" -PathType Leaf) {
        Write-Host "Configuración existente de SearXNG: conservada."
    }
    elseif (Test-Path "searxng\settings.yml") {
        throw "settings.yml existe pero no es un archivo."
    }
    else {
        $texto = Get-Content "searxng\settings.example.yml" -Raw -Encoding UTF8
        $marcador = "REEMPLAZAR_POR_UNA_CLAVE_ALEATORIA"
        if (-not $texto.Contains($marcador)) {
            throw "Falta el marcador de clave en la plantilla de SearXNG."
        }
        $texto = $texto.Replace($marcador, (Nueva-Clave))
        [System.IO.File]::WriteAllText(
            (Join-Path $raiz "searxng\settings.yml"), $texto, $utf8
        )
        Write-Host "Configuración de SearXNG creada con clave nueva."
    }

    & docker compose config --quiet
    if ($LASTEXITCODE -ne 0) {
        throw "La configuración de Compose no es válida."
    }

    Write-Host "Preparación terminada y Compose validado."
    Write-Host "Los servicios no se han iniciado."
    Write-Host "Siguiente paso: docker compose up -d"
}
finally {
    Pop-Location
}