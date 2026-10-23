# Registro de visitantes · versión para InfinityFree (PHP)

Es la **versión pro** (`registro-muestra-tec4`, etiqueta `v1.0-colegio`), con todas sus funciones: curso y división del alumno, pestañas por curso, detector de sospechosos, bloqueo de famosos, validación estricta de los datos, inconsistencias, fusiones, historial, PIN cambiable con bloqueo por intentos y cabeceras de seguridad. Está preparada para subir a **InfinityFree**, que no corre Node.js.

> **Actualizar un sitio que ya estaba subido:** subí todo el contenido de `htdocs/` de nuevo, reemplazando lo que hay (ver 2.5). **No hace falta tocar la base:** la primera vez que alguien entra, la API agrega sola las columnas y tablas nuevas. Después entrá al panel con el PIN **1111** y cambialo desde la llave.

| Parte | Versión pro (Vercel) | Esta versión (InfinityFree) |
|---|---|---|
| Frontend (HTML, CSS, JS) | `public/` | `htdocs/`, igual. Solo cambian las rutas a relativas (`api/...` en lugar de `/api/...`) |
| API | Node.js (`api/*.js`) | **PHP** (`htdocs/api/*.php`), con la misma lógica y las mismas respuestas |
| Rutas `/admin`, `/qr`, `/api/...` | `vercel.json` | `htdocs/.htaccess` |
| Configuración | `.env` | `htdocs/api/_config.php` |
| Base de datos | MariaDB | MariaDB, con las mismas tablas. Se crean y actualizan solas (`asegurarEsquema` en `api/_db.php`) |
| PIN del panel | Cifrado con scrypt | Cifrado con `password_hash` (bcrypt), en la clave `admin_pin_php` de la tabla `ajustes` |
| Cabeceras de seguridad | `vercel.json` | `htdocs/.htaccess` |

> Esta carpeta es una copia. Si después cambiás algo en la versión pro, hay que pasarlo acá también.
>
> **En GitHub**, `htdocs/api/_config.php` tiene valores de ejemplo (`CAMBIAR`). Completá el bloque de InfinityFree con tus datos (paso 2.4) en tu copia local y **no lo subas al repositorio**.

---

## 1. Probarla en tu compu (XAMPP)

1. En el XAMPP Control Panel, poné en verde **Apache** y **MySQL**.
2. Abrí:
   - http://localhost/registro-muestra-tec4-infinityfree/htdocs/ → formulario
   - http://localhost/registro-muestra-tec4-infinityfree/htdocs/admin → panel (PIN inicial `1111`)
   - http://localhost/registro-muestra-tec4-infinityfree/htdocs/qr → cartel

En localhost usa la base `muestra_tec4` de XAMPP, **la misma que la versión pro**: los registros se ven en las dos. `_config.php` detecta solo si está en tu compu o en InfinityFree.

---

## 2. Subirla a InfinityFree

### 2.1 Crear la cuenta y el sitio

1. Entrá a **infinityfree.com**, creá la cuenta y tocá **Create Account** para crear un sitio (hosting account).
2. Elegí un subdominio gratis, por ejemplo `muestra-tec4.infinityfreeapp.com`.
3. Esperá a que la cuenta quede **Active**. Puede tardar unos minutos.

### 2.2 Crear la base de datos

1. En el panel de la cuenta: **MySQL Databases** → creá una base con nombre `muestra`.
2. Anotá los datos que aparecen en esa pantalla:

| Dato en InfinityFree | Ejemplo | Va en `_config.php` como |
|---|---|---|
| MySQL Host Name | `sql123.infinityfree.com` | `DB_HOST` |
| MySQL User Name | `if0_37000000` | `DB_USER` |
| MySQL DB Name | `if0_37000000_muestra` | `DB_NAME` |
| Password | la de la cuenta de hosting (**Account Details → Show password**) | `DB_PASSWORD` |

El host **no** es `localhost`: es el `sqlXXX.infinityfree.com` que te muestre.

### 2.3 Crear las tablas (opcional)

**No hace falta:** la primera vez que alguien abre el sitio, la API crea sola las cinco tablas (`visitantes`, `fusiones`, `alumno_alias`, `ajustes` e `intentos_pin`) o agrega las columnas que falten si la base es de una versión anterior. Cuando termina, deja el archivo `htdocs/api/_esquema-v4.ok` y no vuelve a revisar (si lo borrás, revisa de nuevo).

Si preferís crearlas a mano: phpMyAdmin → elegí tu base a la izquierda → **Importar** → `schema-infinityfree.sql` → **Continuar**.

### 2.4 Completar la configuración

Abrí `htdocs/api/_config.php` y completá el bloque de InfinityFree (el que está debajo de `} else {`) con los datos de 2.2:

```php
define('DB_HOST', 'sql123.infinityfree.com');
define('DB_PORT', 3306);
define('DB_USER', 'if0_37000000');
define('DB_PASSWORD', 'la-contraseña-de-la-cuenta');
define('DB_NAME', 'if0_37000000_muestra');
define('ADMIN_PIN', '1111');
```

El bloque de arriba (localhost) no lo toques. `ADMIN_PIN` es solo el PIN **inicial**: después el admin lo cambia desde la **llave** del panel y el nuevo queda guardado cifrado en la base (aunque `_config.php` siga diciendo 1111). Si se olvidan el PIN: en phpMyAdmin, pestaña **SQL**, `DELETE FROM ajustes WHERE clave = 'admin_pin_php';` y vuelve a ser el de `ADMIN_PIN`.

### 2.5 Subir los archivos

Se sube **el contenido** de la carpeta `htdocs/` a la carpeta `htdocs` del servidor. No la carpeta `htdocs` adentro de la otra.

**Opción A: administrador de archivos (más fácil)**
1. En el panel: **File Manager** → entrá a `htdocs`.
2. Borrá los archivos que trae de ejemplo (`index2.html` o parecido).
3. Subí `subir-a-infinityfree.zip` y usá **Extract** para descomprimirlo ahí, reemplazando los archivos que ya estén. Si cambiaste `_config.php` después de armar el zip, subí también ese archivo a `htdocs/api/` para reemplazarlo.
   - Si no aparece la opción de extraer, subí los archivos y las carpetas uno por uno (`index.html`, `admin.html`, `qr.html`, `.htaccess`, `assets/`, `api/`).

**Opción B: FTP con FileZilla**
1. En el panel, **FTP Details** te da el servidor (`ftpupload.net`), el usuario y la contraseña.
2. Conectate con FileZilla, entrá a `htdocs` y arrastrá todo el contenido de la carpeta `htdocs/` de acá.
3. Si FileZilla no conecta a `ftpupload.net` (pasa con algunas redes y proveedores de internet), usá la opción A.

> **Ojo con `.htaccess`:** empieza con punto y algunos programas lo esconden. Si no se sube, `/admin` y la API dan error 404.

### 2.6 Activar HTTPS (recomendado)

En el panel: **Free SSL Certificates** → pedí el certificado para tu subdominio. Cuando esté listo, entrá siempre con `https://`.

### 2.7 Probar

- `https://tu-sitio.infinityfreeapp.com/` → formulario: registrate con datos de prueba
- `https://tu-sitio.infinityfreeapp.com/admin` → panel con tu PIN: tiene que aparecer el registro
- `https://tu-sitio.infinityfreeapp.com/qr` → cartel con el QR

La primera vez que abrís el sitio, InfinityFree puede mostrar un instante una pantalla de "verificando el navegador". Es normal.

Para borrar los registros de prueba: phpMyAdmin → pestaña **SQL**:

```sql
DELETE FROM visitantes; DELETE FROM fusiones; DELETE FROM alumno_alias;
ALTER TABLE visitantes AUTO_INCREMENT = 1;
```

---

## 3. Límites de InfinityFree

- Tiene un **límite de visitas por día**. El panel consulta cada 2 segundos, así que para una demostración no hay problema. Para el día de la muestra, con varios recepcionistas durante horas, podría quedarse corto y suspender el sitio hasta el día siguiente.
- A veces es lento o se cae un rato, y no tiene soporte técnico (solo foro).
- Lo que pasa en el servidor (errores de PHP) no se ve fácil. Si algo falla, probá primero en localhost.

---

## 4. Problemas comunes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| `/admin` o `/qr` da 404 | No se subió `.htaccess` | Subilo a `htdocs/` (mostrá archivos ocultos en FileZilla: **Servidor → Forzar mostrar archivos ocultos**) |
| "No se pudo guardar el registro" / "No se pudo leer la base de datos" | Datos mal en `_config.php` | Revisá host, usuario, nombre de la base y contraseña de 2.2 |
| `PIN incorrecto` | Ya no es 1111 porque alguien lo cambió desde el panel | Preguntale al admin. Si nadie lo sabe, ver "Si se olvidan el PIN" en 2.4 |
| "Demasiados intentos con PIN incorrecto" | 5 PIN incorrectos seguidos desde esa conexión | Esperá 2 minutos |
| "No se pudo verificar el PIN" / "No se pudo guardar el registro" justo después de actualizar | La API no pudo crear las tablas nuevas | Importá `schema-infinityfree.sql` en phpMyAdmin (es seguro: no borra nada) |
| Error al importar el SQL | No elegiste la base antes de importar | En phpMyAdmin, tocá la base a la izquierda y después **Importar** |
| En localhost: "No se pudo..." | MySQL apagado en XAMPP o falta la base `muestra_tec4` | Prendé MySQL y seguí el README de la versión pro para crear la base |

---

## 5. Archivos

```
schema-infinityfree.sql   Tablas para importar en phpMyAdmin (opcional: la API las crea sola)
subir-a-infinityfree.zip  El contenido de htdocs/ comprimido, listo para subir
subir-a-infinityfree/     Igual que htdocs/ pero con _config.php de ejemplo (sin contraseñas)
htdocs/                   Lo que va en la carpeta htdocs del servidor
  .htaccess               Rutas /admin, /qr y /api/...; bloquea los archivos internos; cabeceras de seguridad (CSP, etc.)
  index.html              Formulario del visitante
  admin.html              Panel de recepción
  qr.html                 Cartel con el QR (apunta a https://muestra.tec4.ar/)
  assets/                 Estilos y JavaScript del navegador (iguales a la versión pro)
    vendor/qrcode.min.js  Librería qrcode.js 1.0.0 (MIT) que dibuja el QR
  api/
    _config.php           Datos de la base y PIN inicial (local y de InfinityFree)
    _db.php               Conexión a MariaDB (PDO), transacciones, respuestas JSON y creación de tablas
    _auth.php             PIN cifrado (bcrypt), bloqueo tras 5 fallos y método HTTP
    _validar.php          Validación estricta: solo letras en nombres, solo números en DNI, tipos y largos
    _famosos.php          Famosos con los que no se puede registrar nadie (copia de la versión pro)
    _troll.php            Detector de registros sospechosos
    pin.php               POST /api/pin          Cambiar el PIN del panel
    registro.php          POST /api/registro     Formulario público
    visitantes.php        GET  /api/visitantes   Lista en vivo (?since= para cambios)
    checkin.php           POST /api/checkin      Marcar o deshacer ingreso
    editar.php            POST /api/editar       Corregir datos o quitar aviso
    eliminar.php          POST /api/eliminar     Ocultar un registro
    fusionar.php          POST /api/fusionar     Fusionar visitantes o alumnos
    fusiones.php          GET/POST /api/fusiones Historial y deshacer
```

Los archivos que empiezan con `_` no se pueden abrir desde el navegador: el `.htaccess` los bloquea.
