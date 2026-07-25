# Deploy en producción con cPanel

Este proyecto es una aplicación Laravel ubicada en `qrfy-app`.

## Requisitos mínimos del hosting

- **PHP 8.3** o superior
- **MySQL 5.7+** o MariaDB
- **Composer** (para instalar dependencias PHP)
- **Node.js y npm** (solo si compilas assets en el servidor; opcional si compilas localmente)
- **SSH** (recomendado) o File Manager para subir archivos

## Opción 1: Deploy automático (RECOMENDADO)

### Generar paquete de despliegue

Desde tu máquina Windows, ejecuta el script PowerShell:

```powershell
.\preparar-parche-qrfy.ps1
```

Esto genera:

- **Carpeta `_qrfy-deploy/qrfy-app`** → Estructura lista para subir por File Manager
- **Archivo `_qrfy-deploy.zip`** → Comprimido para descargar y subir a cPanel
- **Archivo `INSTRUCCIONES.txt`** → Guía completa de despliegue incluida en la carpeta

Luego sigue las instrucciones en `INSTRUCCIONES.txt` (dentro de la carpeta generada).

---

## Opción 2: Deploy manual con SSH

Si prefieres hacerlo manualmente o entiendes mejor step-by-step:

Requisitos del hosting:

- PHP 8.3 o superior.
- MySQL o MariaDB.
- Composer.
- Node.js y npm solo si vas a compilar assets en el servidor.
- Dominio apuntando idealmente a `qrfy-app/public`.

### Variables de entorno

En cPanel crea una base de datos MySQL, un usuario y asignale permisos completos.

Ejemplo de `.env` para producción:

```env
APP_NAME=QRFY
APP_ENV=production
APP_KEY=base64:TU_KEY_AQUI
APP_DEBUG=false
APP_URL=https://tudominio.cl

LOG_CHANNEL=stack
LOG_LEVEL=error

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=usuario_qrfy_db
DB_USERNAME=usuario_qrfy_user
DB_PASSWORD=TU_PASSWORD

BROADCAST_CONNECTION=log
CACHE_STORE=file
FILESYSTEM_DISK=public
QUEUE_CONNECTION=sync
SESSION_DRIVER=file
SESSION_LIFETIME=60
```

Para generar una `APP_KEY` localmente:

```bash
cd qrfy-app
php artisan key:generate --show
```

### Deploy con SSH

Este es el método recomendado.

La configuracion ideal es que el dominio apunte a:

```text
/home/gysrvmin/qrfy-app/public
```

Reemplaza:

- `USUARIO` por tu usuario real de cPanel.
- `URL_DE_TU_REPO` por la URL del repositorio.
- `tudominio.cl` por el dominio real.

#### Primera instalación con SSH

```bash
cd /home/gysrvmin

git clone URL_DE_TU_REPO qrfy-app
cd qrfy-app

cp .env.example .env
nano .env

composer install --no-dev --optimize-autoloader

npm install
npm run build

php artisan key:generate
php artisan migrate --force

php artisan config:cache
php artisan route:cache
php artisan view:cache

php artisan storage:link

chmod -R 775 storage bootstrap/cache
```

#### Actualizar una instalación existente con SSH

```bash
cd /home/gysrvmin/qrfy-app

git pull

composer install --no-dev --optimize-autoloader

npm install
npm run build

php artisan migrate --force

php artisan config:clear
php artisan cache:clear
php artisan view:clear
php artisan route:clear

php artisan config:cache
php artisan route:cache
php artisan view:cache

chmod -R 775 storage bootstrap/cache
```

### Deploy con SSH sin cambiar el document root

Usa este metodo si cPanel no permite apuntar el dominio directamente a `qrfy-app/public`.

Estructura esperada:

```text
/home/gysrvmin/qrfy-app
/home/gysrvmin/public_html
```

Instala o actualiza la app:

```bash
cd /home/gysrvmin

git clone URL_DE_TU_REPO qrfy-app
cd qrfy-app

cp .env.example .env
nano .env

composer install --no-dev --optimize-autoloader

npm install
npm run build

php artisan key:generate
php artisan migrate --force

php artisan config:cache
php artisan route:cache
php artisan view:cache

chmod -R 775 storage bootstrap/cache
```

Copia el contenido de `public` hacia `public_html`:

```bash
cd /home/gysrvmin

rm -rf public_html/*
cp -R qrfy-app/public/* public_html/
cp qrfy-app/public/.htaccess public_html/.htaccess
```

Edita este archivo:

```text
/home/gysrvmin/public_html/index.php
```

Cambia estas lineas:

```php
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
```

por estas:

```php
require __DIR__.'/../qrfy-app/vendor/autoload.php';
$app = require_once __DIR__.'/../qrfy-app/bootstrap/app.php';
```

### Deploy sin SSH (Solo File Manager)

Usa este metodo si solo tienes acceso a cPanel, File Manager y phpMyAdmin.

### Preparar el proyecto localmente

Desde tu maquina:

```bash
cd qrfy-app

composer install --no-dev --optimize-autoloader
npm install
npm run build

php artisan key:generate --show
```

Crea o edita el archivo `.env` con los datos reales del hosting.

Luego comprime la carpeta `qrfy-app`.

Incluye estos archivos y carpetas:

```text
app
bootstrap
config
database
public
resources
routes
storage
vendor
.env
artisan
composer.json
composer.lock
```

No subas estas carpetas:

```text
node_modules
.git
tests
```

### Subir por cPanel

1. Entra a cPanel.
2. Abre MySQL Database Wizard.
3. Crea la base de datos, usuario y permisos.
4. Abre File Manager.
5. Sube el ZIP del proyecto.
6. Extraelo idealmente en:

```text
/home/gysrvmin/qrfy-app
```

Si puedes cambiar el document root del dominio, apuntalo a:

```text
/home/gysrvmin/qrfy-app/public
```

Si no puedes cambiar el document root, copia el contenido de:

```text
/home/gysrvmin/qrfy-app/public
```

hacia:

```text
/home/gysrvmin/public_html
```

Luego edita:

```text
/home/gysrvmin/public_html/index.php
```

y cambia:

```php
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
```

por:

```php
require __DIR__.'/../qrfy-app/vendor/autoload.php';
$app = require_once __DIR__.'/../qrfy-app/bootstrap/app.php';
```

## Base de datos sin SSH

Sin SSH no es comodo ejecutar:

```bash
php artisan migrate --force
```

La alternativa practica es importar un SQL desde phpMyAdmin.

En local, prepara la base:

```bash
cd qrfy-app
php artisan migrate:fresh
```

Luego exporta la base local desde phpMyAdmin y subela en cPanel usando phpMyAdmin.

## Permisos

Si cPanel permite cambiar permisos desde File Manager, verifica:

```text
storage: writable
bootstrap/cache: writable
```

Con SSH:

```bash
cd /home/gysrvmin/qrfy-app
chmod -R 775 storage bootstrap/cache
```

## Checklist final

Antes de abrir el sitio en produccion, verifica:

```text
PHP 8.3 o superior
APP_ENV=production
APP_DEBUG=false
APP_URL=https://tudominio.cl
Base de datos creada
Usuario de base de datos con permisos completos
.env con credenciales reales
vendor existe
public/build existe
storage tiene permisos de escritura
bootstrap/cache tiene permisos de escritura
Dominio apunta a qrfy-app/public o index.php fue ajustado en public_html
```

## Diagnostico de errores comunes

Si aparece error 500, revisa:

```text
qrfy-app/storage/logs/laravel.log
```

Si aparece pantalla blanca o error de clase no encontrada, revisa que exista:

```text
qrfy-app/vendor
```

Si no cargan estilos o JavaScript, revisa que exista:

```text
qrfy-app/public/build
```

Si el sitio muestra error de base de datos, revisa:

```text
DB_HOST
DB_DATABASE
DB_USERNAME
DB_PASSWORD
```

En cPanel normalmente `DB_HOST` es:

```env
DB_HOST=localhost
```

## Comandos rapidos

### Instalar desde cero con SSH

```bash
cd /home/gysrvmin
git clone URL_DE_TU_REPO qrfy-app
cd qrfy-app
cp .env.example .env
nano .env
composer install --no-dev --optimize-autoloader
npm install
npm run build
php artisan key:generate
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan storage:link
chmod -R 775 storage bootstrap/cache
```

### Actualizar con SSH

```bash
cd /home/gysrvmin/qrfy-app
git pull
composer install --no-dev --optimize-autoloader
npm install
npm run build
php artisan migrate --force
php artisan config:clear
php artisan cache:clear
php artisan view:clear
php artisan route:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
chmod -R 775 storage bootstrap/cache
```

### Publicar en public_html cuando no se puede cambiar document root

```bash
cd /home/gysrvmin
rm -rf public_html/*
cp -R qrfy-app/public/* public_html/
cp qrfy-app/public/.htaccess public_html/.htaccess
```
