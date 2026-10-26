---
name: seguridad-servidor-apache-php
description: Endurecimiento de un servidor Apache + PHP donde se publica una app web escolar (registro de visitantes, paneles con PIN). Usar cuando se instala, configura o revisa el servidor (tec4.ar, XAMPP, VPS), se toca .htaccess, php.ini, permisos de carpetas, HTTPS o cabeceras; cuando aparecen 403/404/500 raros; o antes de publicar una versión.
---

# Seguridad del servidor Apache + PHP

Actuás como administrador de sistemas con foco en seguridad. El objetivo es que el servidor no exponga nada más que lo que la app necesita.

## Qué revisar siempre

### Carpeta web
- El `DocumentRoot` apunta **solo** a `public/`. Nada de `schema.sql`, migraciones, README, `.git` ni backups dentro de la carpeta web.
- `AllowOverride All` (o las reglas del `.htaccess` copiadas al VirtualHost) para que funcionen las rutas y los bloqueos.
- `Options -Indexes`: nunca listar carpetas.
- Los archivos internos (`_config.php`, `_config.local.php`, `_db.php`, `_*.php`, `*.ok`) dan **403** desde el navegador. Verificarlo con `curl -I https://sitio/api/_config.php`.

### PHP
- `display_errors = Off` y `log_errors = On` en producción: los errores van al log, nunca a la pantalla (filtran rutas y consultas).
- `expose_php = Off` (no anunciar la versión).
- Versión de PHP con soporte vigente (8.1 o más).
- Extensiones mínimas: `pdo_mysql`, `mbstring`. Sin `allow_url_include`.
- `session.cookie_secure`, `session.cookie_httponly`, `session.cookie_samesite=Strict` si algún día se usan sesiones.
- `upload_max_filesize` chico (la app no recibe archivos).

### Apache
- `ServerTokens Prod` y `ServerSignature Off`.
- Módulos necesarios: `mod_rewrite`, `mod_headers`, `mod_ssl`. Deshabilitar los que no se usan (`mod_status` público, `mod_autoindex`, `mod_userdir`).
- Límite del cuerpo del pedido (`LimitRequestBody 65536`): la API solo recibe JSON chico.

### HTTPS
- Certificado (Let's Encrypt / certbot) con renovación automática.
- Redirigir todo `http://` a `https://`.
- `Strict-Transport-Security` solo cuando HTTPS ya funciona bien.

### Cabeceras (en `.htaccess` o VirtualHost)
`Content-Security-Policy` estricta (`script-src 'self'`, sin `unsafe-inline`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `Cache-Control: no-store` en `/api/`.

### Permisos de archivos (Linux)
- Dueño: un usuario de despliegue; Apache (`www-data`) solo lectura.
- Escritura solo donde la app la necesita (en esta app, la marca `_esquema-v*.ok` en `api/`; si no, crear las tablas con las migraciones y dejar todo en solo lectura).
- `_config.local.php` con permisos `640`.

### Firewall
- Abiertos solo 80 y 443. El 3306 de MariaDB **cerrado** hacia afuera.
- SSH solo con clave, sin root, idealmente desde la red de la escuela.

## Cómo revisar
1. `curl -I` a `/`, `/admin`, `/qr`, `/api/_config.php`, `/api/_db.php`, `/.git/HEAD`, `/schema.sql` → los internos tienen que dar 403/404.
2. Revisar cabeceras con `curl -I` o securityheaders.com.
3. Forzar un error (JSON roto a la API) y confirmar que la respuesta no muestra rutas ni stack trace.
4. Informar en tabla: hallazgo, riesgo, dónde, cómo se arregla.
