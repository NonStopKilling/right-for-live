param(
    [string]$OutputDir = "_qrfy-deploy"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$appRoot = Join-Path $root "qrfy-app"
$outputRoot = Join-Path $root $OutputDir
$packageRoot = Join-Path $outputRoot "qrfy-app"

# Carpetas y archivos que se incluyen en el deploy a producción
$directoriesToCopy = @(
    "app",
    "bootstrap",
    "config",
    "database",
    "public",
    "resources",
    "routes",
    "storage"
)

$filesToCopy = @(
    "artisan",
    "composer.json",
    "composer.lock",
    ".env.example",
    ".htaccess"
)

# Validar que exista la carpeta de app y todas las subcarpetas necesarias
if (-not (Test-Path -LiteralPath $appRoot)) {
    throw "No existe la carpeta de app: $appRoot"
}

foreach ($dir in $directoriesToCopy) {
    $dirPath = Join-Path $appRoot $dir
    if (-not (Test-Path -LiteralPath $dirPath)) {
        throw "No existe la carpeta esperada: $dirPath"
    }
}

# Limpiar y crear carpeta de salida
if (Test-Path -LiteralPath $outputRoot) {
    Remove-Item -LiteralPath $outputRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $packageRoot -Force | Out-Null
Write-Output "[1/4] Carpeta de salida creada"

# Copiar carpetas completas
foreach ($dir in $directoriesToCopy) {
    $source = Join-Path $appRoot $dir
    $destination = Join-Path $packageRoot $dir
    Copy-Item -LiteralPath $source -Destination $destination -Recurse -Force
    Write-Output "  ✓ Copiada: $dir"
}
Write-Output "[2/4] Carpetas copiadas"

# Copiar archivos individuales
foreach ($file in $filesToCopy) {
    $source = Join-Path $appRoot $file
    if (Test-Path -LiteralPath $source) {
        $destination = Join-Path $packageRoot $file
        Copy-Item -LiteralPath $source -Destination $destination -Force
        Write-Output "  ✓ Copiado: $file"
    }
}
Write-Output "[3/4] Archivos copiados"

# Crear archivo de instrucciones
$instructions = @"
═══════════════════════════════════════════════════════════════════════
  QRFY - PAQUETE DE DESPLIEGUE A cPanel
═══════════════════════════════════════════════════════════════════════

CONTENIDO DEL PAQUETE
────────────────────────────────────────────────────────────────────────
Este paquete contiene todo lo necesario para desplegar QRFY en cPanel:

  Carpetas incluidas:
    • app           → Lógica de la aplicación (Controllers, Models)
    • bootstrap     → Inicialización de Laravel
    • config        → Configuración de la aplicación
    • database      → Migraciones y seeders
    • public        → Assets públicos y build compilado
    • resources     → Vistas y archivos de recursos
    • routes        → Definición de rutas
    • storage       → Archivos de aplicación (logs, cache)

  Archivos incluidos:
    • composer.json / composer.lock   → Dependencias PHP
    • .env.example                    → Plantilla de variables de entorno
    • artisan                         → CLI de Laravel
    • .htaccess                       → Configuración de Apache

NO incluido (ya debe existir o se descarga):
    • vendor/                → Se instala con composer install
    • node_modules/         → Se instala con npm install
    • .env                  → Usa .env.example como referencia
    • .git/                 → Historial de versiones
    • tests/                → Tests unitarios

════════════════════════════════════════════════════════════════════════
INSTRUCCIONES DE DESPLIEGUE
════════════════════════════════════════════════════════════════════════

1. SUBIR A cPanel (File Manager)
   ──────────────────────────────────────────────────────────────────
   • Entra a cPanel → File Manager
   • Navega a: /home/tu_usuario/
   • Sube la carpeta 'qrfy-app' (o extrae el ZIP si descargaste desde aquí)
   
   El resultado debe ser:
     /home/tu_usuario/qrfy-app/app
     /home/tu_usuario/qrfy-app/bootstrap
     /home/tu_usuario/qrfy-app/public
     ...

2. CREAR BASE DE DATOS (cPanel)
   ──────────────────────────────────────────────────────────────────
   • Ve a MySQL Database Wizard
   • Crea base de datos: ejemplo 'usuario_qrfy'
   • Crea usuario: ejemplo 'usuario_qrfy_user'
   • Asigna todos los permisos al usuario

3. CONFIGURAR .env (File Manager o SSH)
   ──────────────────────────────────────────────────────────────────
   • Copia o renombra .env.example a .env
   • Edita estos valores:

     APP_ENV=production
     APP_DEBUG=false
     APP_URL=https://tu-dominio.cl

     DB_HOST=localhost
     DB_DATABASE=usuario_qrfy
     DB_USERNAME=usuario_qrfy_user
     DB_PASSWORD=TU_PASSWORD_AQUI

   • Genera APP_KEY localmente con: php artisan key:generate --show

4. INSTALAR DEPENDENCIAS (SSH - RECOMENDADO)
   ──────────────────────────────────────────────────────────────────
   Si tienes acceso SSH en cPanel Terminal:

   cd /home/tu_usuario/qrfy-app

   # Instalar dependencias PHP (sin dev)
   composer install --no-dev --optimize-autoloader

   # Si npm/node no está disponible en servidor:
   # Compila assets localmente y sube el contenido de public/build

   # Si npm/node sí está disponible:
   npm install
   npm run build

   # Generar APP_KEY
   php artisan key:generate

   # Correr migraciones
   php artisan migrate --force

   # Cachear configuración
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache

   # Ajustar permisos
   chmod -R 775 storage bootstrap/cache

   # Enlazar carpeta public para archivos
   php artisan storage:link

5. CONFIGURAR DOMINIO (cPanel)
   ──────────────────────────────────────────────────────────────────
   • Ve a Addon Domains o Domains
   • Apunta el dominio a: /home/tu_usuario/qrfy-app/public

   Si NO PUEDES cambiar el document root:
     • Crea una carpeta public_html si no existe
     • Copia el contenido de qrfy-app/public/ a public_html/
     • Edita public_html/index.php:
       require __DIR__.'/../qrfy-app/vendor/autoload.php';
       \$app = require_once __DIR__.'/../qrfy-app/bootstrap/app.php';

════════════════════════════════════════════════════════════════════════
RESUMEN DE PASOS MÍNIMOS (Si tienes SSH)
════════════════════════════════════════════════════════════════════════

1. Sube qrfy-app a /home/tu_usuario/
2. Crea BD: 'usuario_qrfy' y usuario 'usuario_qrfy_user'
3. Configura .env
4. Ejecuta:
   
   cd /home/tu_usuario/qrfy-app
   composer install --no-dev --optimize-autoloader
   npm install && npm run build  (o sube build/ compilado localmente)
   php artisan key:generate
   php artisan migrate --force
   php artisan config:cache && php artisan route:cache
   chmod -R 775 storage bootstrap/cache

5. Apunta dominio a /home/tu_usuario/qrfy-app/public

════════════════════════════════════════════════════════════════════════
USUARIOS POR DEFECTO
════════════════════════════════════════════════════════════════════════

Se crean automáticamente al ejecutar php artisan migrate --force:

  Admin:
    Email:    admin@qrfy.local
    Password: Admin1234!
    Rol:      admin

  Técnico 1:
    Email:    contacto@gfyservicios.cl
    Password: Tecnico1234!
    Rol:      tecnico

  Técnico 2:
    Email:    tecnico2@qrfy.local
    Password: Tecnico1234!
    Rol:      tecnico

════════════════════════════════════════════════════════════════════════
TROUBLESHOOTING
════════════════════════════════════════════════════════════════════════

❌ Error: "No 'Access-Control-Allow-Origin' header"
   → Build/vendor no se subieron correctamente
   → Verifica que public/build/ esté completo
   → Recorre: php artisan config:clear && php artisan cache:clear

❌ Error: "Call to undefined function"
   → Falta vendor/
   → Ejecuta: composer install --no-dev

❌ Error: "Production mode" o assets no cargan
   → Genera cache: php artisan config:cache && php artisan route:cache
   → Limpia cache: php artisan cache:clear && php artisan view:clear

❌ Permisos: "Permission denied" en storage
   → Ejecuta: chmod -R 775 storage bootstrap/cache

════════════════════════════════════════════════════════════════════════
CONTACTO Y SOPORTE
════════════════════════════════════════════════════════════════════════

Para más detalles, revisa: DEPLOY_CPANEL.md en la raíz del proyecto.

"@

Set-Content -LiteralPath (Join-Path $outputRoot "INSTRUCCIONES.txt") -Value $instructions -Encoding UTF8
Write-Output "[4/4] Instrucciones creadas"

# Crear ZIP del paquete
$zipPath = Join-Path $root "$OutputDir.zip"
if (Test-Path -LiteralPath $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
}

Compress-Archive -LiteralPath $packageRoot -DestinationPath $zipPath -CompressionLevel Optimal
Write-Output ""
Write-Output "════════════════════════════════════════════════════════════════════════"
Write-Output "✓ PAQUETE CREADO EXITOSAMENTE"
Write-Output "════════════════════════════════════════════════════════════════════════"
Write-Output ""
Write-Output " Carpeta de despliegue:"
Write-Output "   $outputRoot"
Write-Output ""
Write-Output " Archivo comprimido:"
Write-Output "   $zipPath"
Write-Output ""
Write-Output " Instrucciones:"
Write-Output "   $outputRoot\INSTRUCCIONES.txt"
Write-Output ""
Write-Output "OPCIONES DE SUBIDA:"
Write-Output "  1. Subir carpeta qrfy-app por File Manager de cPanel"
Write-Output "  2. Descargar $OutputDir.zip y extraerlo en cPanel"
Write-Output ""
Write-Output "════════════════════════════════════════════════════════════════════════"
