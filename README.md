<!-- clawde-ascii -->
~~~text
  CCCC  L       A    W       W  DDDD   EEEEE
 C      L      A A   W       W  D   D  E
 C      L     AAAAA  W   W   W  D   D  EEEE
 C      L     A   A   W W W W   D   D  E
  CCCC  LLLLL A   A    W   W    DDDD   EEEEE

          Tu IA local · Proyecto de estudio
~~~

# Clawde

Proyecto personal de IA local para estudio y experimentación.
No está destinado al uso profesional ni a entornos de producción.

La interfaz utiliza Open WebUI personalizada. El nombre Clawde no implica
que el proyecto utilice modelos de Claude.

## Funcionalidades integradas

- Chat local y análisis de imágenes con Ollama.
- Consulta de documentos mediante Knowledge de Open WebUI.
- Búsqueda web mediante SearXNG.
- Ejecución de comandos mediante Open Terminal.
- Generación de imágenes mediante ComfyUI Desktop.
- Conversación por voz.
- Personalización visual con CSS y logo.

Las integraciones requieren configuración adicional en Open WebUI.

## Arquitectura

| Servicio | Desde Windows | Desde Docker |
|---|---|---|
| Open WebUI | http://localhost:3001 | http://webui:8080 |
| Ollama | No publicado | http://ollama:11434 |
| SearXNG | No publicado | http://searxng:8080 |
| Open Terminal | No publicado | http://open-terminal:8000 |
| ComfyUI Desktop | http://localhost:8188 | http://host.docker.internal:8188 |

ComfyUI Desktop corre en Windows y debe estar iniciado.
Su acceso desde Docker debe comprobarse en cada instalación.
Dentro de un contenedor, localhost se refiere a ese mismo contenedor.

## Entorno de referencia

- Windows, PowerShell, Docker Desktop con contenedores Linux y WSL2.
- GPU NVIDIA RTX 5070 Ti Laptop, aproximadamente 12 GB de VRAM.
- Aproximadamente 32 GB de RAM.
- Carpeta principal: C:\AI\claude-casero.

El consumo de recursos depende del modelo, contexto y workflow.

## Modelos utilizados

- qwen3:8b: chat y pruebas de herramientas.
- qwen3-vl:8b: análisis de imágenes.
- deepseek-r1:8b: pruebas de razonamiento.

Los modelos no están incluidos en GitHub.
El contexto general de Ollama es de 8192 tokens.
Se comprobó qwen3-vl:8b con 16384 tokens mediante un ajuste en Open WebUI.

## Archivos del repositorio

- .env.example: plantilla sin claves reales.
- searxng/settings.example.yml: plantilla de búsqueda.
- scripts/Preparar.ps1: preparación del entorno.
- compose.yaml: servicios principales y volúmenes.
- compose.override.yaml: servicios adicionales y personalización.
- personalizacion/: CSS y logo.
- workspace/sitios/clawde/: sitio informativo.
- .github/workflows/: despliegue en Azure, si está presente.
- .gitignore: archivos permitidos y exclusiones.

## Instalación y preparación

Requisitos previos: Git, Docker Desktop iniciado con contenedores Linux,
WSL2 y GPU NVIDIA compatible con la configuración del proyecto.

Para una instalación nueva:

```powershell
git clone https://github.com/pamunoz-des/clawde.git C:\AI\clawde
Set-Location C:\AI\clawde
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\Preparar.ps1
```

Si el repositorio es privado, se requiere una cuenta con permisos de acceso.

El script Preparar.ps1:

- Comprueba los archivos requeridos y la disponibilidad de Docker y Compose.
- Crea las carpetas necesarias.
- Genera .env con claves aleatorias diferentes para Open WebUI y Open Terminal.
- Genera searxng/settings.yml desde la plantilla con una clave aleatoria nueva.
- Conserva las configuraciones existentes.
- Valida Compose sin iniciar contenedores ni descargar modelos.

No publicar los archivos generados: contienen claves privadas.

### Validación realizada

El 5 de octubre de 2026 se comprobó la preparación desde un clon nuevo
en el mismo equipo:

- Se generaron .env y searxng/settings.yml.
- Docker Compose validó la configuración.
- Git ignoró ambos archivos privados y quedó sin cambios pendientes.
- No se iniciaron servicios.

Esta prueba confirma la preparación del entorno, no una instalación completa
ni la recuperación del sistema en otro equipo.

### Arranque de una instalación nueva

Solo si no existe otra instalación con el mismo nombre de proyecto y puerto:

```powershell
docker compose up -d
docker compose ps
```

La interfaz local utiliza http://localhost:3001.

El archivo Compose fija el nombre de proyecto claude-casero.
Para una instalación de prueba paralela deben cambiarse el nombre de proyecto
y el puerto antes de iniciar servicios.

### Configuración pendiente después del arranque

- Descargar los modelos de Ollama.
- Crear la cuenta inicial de Open WebUI.
- Configurar la búsqueda mediante http://searxng:8080/search?q=<query>&format=json.
- Configurar Open Terminal en http://open-terminal:8000 usando la clave local.
- Configurar Knowledge y conversación por voz.
- Preparar ComfyUI Desktop, sus modelos, workflows y conexión.

Las instrucciones detalladas y los workflows todavía deben incorporarse.
El repositorio no incluye conversaciones, documentos, modelos ni datos de
una instalación existente.

## Operación

Ejecutar desde C:\AI\claude-casero:

    docker compose config --quiet
    docker compose up -d
    docker compose ps
    docker compose exec ollama ollama ps
    docker compose logs --tail 50 webui

Para descargar modelos:

    docker compose exec ollama ollama pull qwen3:8b
    docker compose exec ollama ollama pull qwen3-vl:8b
    docker compose exec ollama ollama pull deepseek-r1:8b

Consultar ollama ps no carga un modelo.
Una lista vacía indica que no hay modelos cargados en ese momento.

## Workspace

Carpeta compartida:

- Windows: C:\AI\claude-casero\workspace
- Open Terminal: /home/user

La configuración actual no monta todo el disco C:.
La autenticación de GitHub CLI en Windows no configura automáticamente
GitHub dentro de Open Terminal.

## Persistencia y respaldos

- ollama-data conserva los datos de Ollama.
- webui-data conserva los datos y ajustes de Open WebUI.
- workspace, searxng y personalizacion utilizan carpetas de Windows.
- Los nombres reales de los volúmenes llevan el prefijo del proyecto Compose.

El paquete v4 fue restaurado y probado en este mismo equipo.
No está incluido en GitHub y es anterior a DeepSeek y a cambios recientes del sitio.

Los respaldos del proyecto Docker no incluyen automáticamente la instalación,
custom nodes ni los modelos de ComfyUI Desktop.
También debe comprobarse la inclusión de sus archivos generados.

No se comprobó recuperación de todo el sistema en otro equipo.

No utilizar docker compose down -v como operación rutinaria:
elimina los volúmenes y sus datos.

GitHub no reemplaza un respaldo de los datos.

## Secretos y privacidad

No publicar .env, claves API, tokens, bases de datos de Open WebUI,
conversaciones, documentos privados ni respaldos sensibles.

La búsqueda web y otras conexiones externas requieren Internet;
el proyecto no funciona completamente desconectado para todas sus funciones.

## Sitio informativo

- https://www.clawde.cl
- https://github.com/pamunoz-des/clawde

El sitio se despliega mediante GitHub Actions en Azure Static Web Apps.
Presenta el proyecto; no publica los servicios locales de IA.
El botón Abrir Clawde apunta a localhost:3001 en el equipo del visitante.

## Pendientes

- Validar el arranque de una instalación nueva y documentar las integraciones.
- Respaldo actualizado y respaldo separado de ComfyUI.
- Programación autónoma y verificación de archivos generados.
- Panel de archivos y entregables.
- Mejoras de voz en ambientes ruidosos y medición de latencia.
- Edición de imágenes, resolución y selección de workflows.
- Memoria entre conversaciones y automatizaciones.
- GitHub desde el chat.
- Integración con PolyTalk, actualmente independiente.
- Laboratorio de operaciones local.
- Beta de escritorio para Windows.

## Beta de escritorio

La preparación de Electron quedó incompleta por un problema de acceso a npm.
Todavía no existe un ejecutable .exe validado.