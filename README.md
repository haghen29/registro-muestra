# Registro de visitantes · Muestra Educativa E.E.S.T. N°4 Berazategui

> **Versión para la Técnica: `v1.0-colegio`.** Es la versión que se instala en el servidor de la escuela para la Muestra Educativa. Está hecha en **PHP + MariaDB**, así que corre en cualquier servidor con Apache y PHP (como XAMPP). Código: https://github.com/haghen29/registro-muestra (etiqueta `v1.0-colegio`).

## Sobre este proyecto

### El problema
La E.E.S.T. N°4 de Berazategui organiza una Muestra Educativa abierta a la comunidad. En la entrada se forma fila: hay que anotar a cada visitante, saber a qué alumno viene a ver y controlar que nadie entre dos veces. Hacerlo en papel es lento y propenso a errores, sobre todo en los momentos de más gente.

### La solución
Una aplicación web que digitaliza todo el ingreso:

- **El visitante se registra solo.** Escanea un código QR con su celular, completa un formulario corto (nombre, apellido, DNI y a qué alumno viene a ver, con su año y división) y recibe una pantalla de confirmación para mostrar en la puerta. No tiene que instalar nada. Si desde el mismo celular registra a sus acompañantes, la pantalla muestra todas las entradas, una por card deslizable.
- **La recepción ve todo en tiempo real.** Los alumnos a cargo de la puerta usan un panel desde una tablet, un celular o una notebook. Cada registro nuevo aparece al instante, se encuentra en segundos por apellido o DNI, y con un toque se marca que la persona ya ingresó. Si dos recepcionistas trabajan a la vez, ven lo mismo y se evita que alguien entre dos veces.
- **Los datos quedan ordenados.** El sistema agrupa a los familiares por alumno y por curso, y detecta inconsistencias: personas anotadas dos veces, nombres de alumnos escritos de distintas formas o registros de broma. La recepción las corrige o las une sin perder información, y cualquier cambio se puede deshacer.

### Por qué está pensada así
- **Primero el celular:** casi todos los visitantes llegan con uno, así que el formulario está diseñado para pantallas chicas.
- **Pensada para usarse al aire libre:** colores de alto contraste y botones grandes, para leer bien con sol y operar rápido.
- **Sin fricción para el visitante:** el registro lleva menos de un minuto. Solo se rechazan los datos claramente falsos (nombres con números o de famosos). El resto de los controles funciona en segundo plano: marca lo sospechoso para que la recepción lo revise, sin bloquear a nadie.

### Qué incluye esta versión
- Formulario público con QR y pantalla verde de confirmación, con todas las entradas registradas desde ese celular.
- Panel de recepción en vivo con PIN cambiable: búsqueda, marcar ingreso, editar y eliminar.
- Año y división del alumno, y pestaña **Alumnos** con una pestaña por curso que muestra el grupo de personas que vino a ver a cada alumno.
- Pestaña **Inconsistencias**: repetidos, mismo DNI con otro nombre, alumnos escritos distinto y registros sospechosos, con fusiones, historial y deshacer.
- Bloqueo de nombres con números o símbolos y de nombres de famosos.
- Cartel del QR para imprimir, con el logo de la Técnica.

### Tecnología (resumen)
HTML, CSS y JavaScript en el navegador; **PHP** en el servidor (Apache); base de datos **MariaDB**. Funciona en cualquier navegador y no necesita que nadie instale una app.

---

## Cómo funciona

| Dirección | Para quién | Qué hace |
|---|---|---|
| https://muestra.tec4.ar | Visitante | Formulario: nombre, apellido, DNI y si viene a ver a un alumno |
| https://muestra.tec4.ar/admin | Recepcionistas | Panel en vivo con PIN |
| https://muestra.tec4.ar/qr | Organización | Cartel A4 para imprimir con el QR, que apunta a https://muestra.tec4.ar |

Ver [Cómo está hecho](#10-cómo-está-hecho).

---

## Índice

1. [Requisitos](#1-requisitos)
2. [Probarla en una compu con XAMPP](#2-probarla-en-una-compu-con-xampp)
3. [Actualizar una base creada con una versión anterior](#3-actualizar-una-base-creada-con-una-versión-anterior)
4. [Cómo se usa el panel](#4-cómo-se-usa-el-panel)
5. [Detector de registros sospechosos y seguridad](#5-detector-de-registros-sospechosos-y-seguridad)
6. [Instalarla en el servidor del colegio](#6-instalarla-en-el-servidor-del-colegio)
7. [El día de la muestra](#7-el-día-de-la-muestra)
8. [Comandos SQL útiles](#8-comandos-sql-útiles)
9. [Problemas comunes](#9-problemas-comunes)
10. [Cómo está hecho](#10-cómo-está-hecho)

---

## 1. Requisitos

| Programa | Para qué |
|---|---|
| **Apache** con `mod_rewrite` y `mod_headers` | Sirve las páginas y la API. Lo usa `public/.htaccess` |
| **PHP 7.4 o superior** con `pdo_mysql` y `mbstring` | La API (`public/api/*.php`) |
| **MariaDB** o MySQL | La base de datos |
| Git (opcional) | Bajar el código desde GitHub |

En una compu, **XAMPP** (apachefriends.org) trae todo junto.

---

## 2. Probarla en una compu con XAMPP

En los comandos, cambiá `C:\xampp` por la carpeta donde instalaste XAMPP.

### 2.1 Bajar el código

```powershell
cd C:\xampp\htdocs
git clone --branch v1.0-colegio https://github.com/haghen29/registro-muestra.git
```

Sin Git: en la página del repositorio elegí la etiqueta `v1.0-colegio`, tocá **Code → Download ZIP** y descomprimilo en `C:\xampp\htdocs\registro-muestra`.

### 2.2 Prender Apache y MySQL

En el **XAMPP Control Panel**, tocá **Start** en las filas **Apache** y **MySQL**. Las dos tienen que quedar en verde.

### 2.3 Crear la base de datos y el usuario

Abrí una terminal y entrá a la consola de MariaDB como root (en XAMPP no tiene contraseña; si te la pide, agregá `-p`):

```powershell
cd C:\xampp\mysql\bin
.\mysql.exe -u root
```

Dentro de la consola (usá barras `/` en la ruta):

```sql
source C:/xampp/htdocs/registro-muestra/schema.sql
CREATE USER 'muestra_user'@'localhost' IDENTIFIED BY 'test1234';
GRANT SELECT, INSERT, UPDATE ON muestra_tec4.* TO 'muestra_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

`schema.sql` crea la base `muestra_tec4` con cinco tablas: `visitantes`, `fusiones`, `alumno_alias`, `ajustes` e `intentos_pin`. La app nunca borra filas (los registros eliminados se ocultan), así que el usuario no necesita permiso `DELETE`. Si dice `ERROR 1396 ... CREATE USER failed`, el usuario ya existía: ejecutá solo el `GRANT` y el `FLUSH`.

### 2.4 Abrirla

`public/api/_config.php` ya trae los datos de XAMPP de arriba (`muestra_user` / `test1234`). Abrí:

- http://localhost/registro-muestra/public/ → formulario
- http://localhost/registro-muestra/public/admin → panel (PIN inicial: **1111**)
- http://localhost/registro-muestra/public/qr → cartel

---

## 3. Actualizar una base creada con una versión anterior

**En una instalación nueva, salteá esta sección:** `schema.sql` ya crea la base completa.

Si ya había una base de una versión anterior de la app, **no vuelvas a ejecutar `schema.sql`**: ejecutá como root las migraciones que falten, en orden. Agregan lo nuevo sin borrar registros y se pueden ejecutar más de una vez.

```sql
source C:/xampp/htdocs/registro-muestra/migracion-v2.sql
source C:/xampp/htdocs/registro-muestra/migracion-v3.sql
source C:/xampp/htdocs/registro-muestra/migracion-v4.sql
source C:/xampp/htdocs/registro-muestra/migracion-v5.sql
```

| Migración | Qué agrega |
|---|---|
| `migracion-v2.sql` | Columnas `alerta`, `eliminado` y `fusionado_en`; tablas `fusiones` y `alumno_alias` |
| `migracion-v3.sql` | Columnas `curso` y `division` (año y división del alumno) |
| `migracion-v4.sql` | Tablas `ajustes` (PIN cifrado) e `intentos_pin` (bloqueo por PIN incorrectos) |
| `migracion-v5.sql` | Una persona pasa a ser **DNI + nombre + apellido** (ver [Registros con el mismo DNI](#registros-con-el-mismo-dni)) |

Si el usuario de la base tiene permiso de `CREATE` y `ALTER`, la API también crea sola las tablas y columnas que falten la primera vez que se usa (`asegurarEsquema` en `public/api/_db.php`). Con los permisos mínimos de arriba no puede, por eso están las migraciones.

---

## 4. Cómo se usa el panel

### Entrar y cambiar el PIN

El PIN inicial es **1111** (el de `ADMIN_PIN` en la configuración). Es solo de números, de 4 a 8 cifras.

Para cambiarlo, tocá la **llave** arriba a la derecha del panel, escribí el PIN actual y dos veces el nuevo. El PIN nuevo queda guardado **cifrado** en la base (tabla `ajustes`), así que vale para todos los dispositivos y sigue igual aunque se reinicie el servidor. Los demás recepcionistas tienen que volver a entrar con el PIN nuevo.

- Después de **5 PIN incorrectos** seguidos desde la misma conexión, el panel queda bloqueado **2 minutos** para esa conexión. Así nadie puede adivinarlo probando todos los números.
- Ojo: si todos los recepcionistas usan el mismo Wi-Fi, comparten la conexión. Si alguien se equivoca 5 veces, el bloqueo es para todos durante esos 2 minutos.
- **Si se olvidan del PIN:** como root, ejecutá `DELETE FROM muestra_tec4.ajustes WHERE clave = 'admin_pin_php';`. El PIN vuelve a ser el de `ADMIN_PIN` (1111).

### Contadores y filtros

Arriba hay cuatro contadores que también funcionan como filtros:

- **Por ingresar** (se abre por defecto): las personas registradas que todavía no entraron, **el último registro primero**. Acá se toca **Marcar ingreso**: la persona sale de la lista y pasa a **Ingresaron**. El aviso de abajo tiene **Deshacer** por si fue sin querer.
- **Ingresaron:** las que ya entraron, con la hora.
- **Registrados:** todas juntas (Por ingresar + Ingresaron), solo para consultar: cada una muestra su estado y no hace falta marcar nada ahí.
- **A revisar:** registros que marcó el detector.

El buscador encuentra por apellido, nombre, DNI o nombre del alumno. En **Por ingresar**, si buscás a alguien que ya entró, también aparece (con "Ingresó HH:MM"), así se evita un ingreso doble.

El panel consulta la base cada 2 segundos. Si dos recepcionistas trabajan a la vez, los cambios de uno aparecen en el otro.

### Marcar ingreso

Tocá **Marcar ingreso**. Si otro recepcionista ya lo había marcado, aparece un aviso con la hora del primer ingreso. **Deshacer** lo vuelve a "por ingresar".

### Editar o eliminar un registro

Tocá el lápiz al lado de cada registro:

- **Guardar cambios:** corrige nombre, apellido, DNI o a quién viene a ver. Si con el cambio queda igual (DNI, nombre y apellido) a otro registro, te avisa y te sugiere fusionarlos desde **Inconsistencias**. Si cambiás "¿Viene a ver a un alumno?" a **No**, el alumno y el parentesco que había escrito quedan guardados: si fue sin querer, volvés a tocar **Sí** y reaparecen.
- **Eliminar:** lo saca del panel en todos los dispositivos. Queda guardado en la base: si la persona se vuelve a registrar con el mismo DNI, nombre y apellido, el registro reaparece con los datos nuevos. Ver también [cómo recuperar uno a mano](#8-comandos-sql-útiles).

### Registros con el mismo DNI

Una persona es la combinación **DNI + nombre + apellido** (sin distinguir mayúsculas ni tildes: "José Pérez" y "jose perez" son la misma).

| Se registra con... | Qué pasa |
|---|---|
| El mismo DNI, nombre y apellido que alguien ya registrado | Es la misma persona: se le muestra **su entrada** (la pantalla verde con su número de registro). No se crea otro registro. |
| El mismo DNI pero **otro** nombre o apellido | Se guarda como **otra persona**, con su propia entrada. En el panel aparece en **Inconsistencias → Mismo DNI, distinto nombre** para que la recepción lo revise. |

Para ver la entrada de alguien hay que saber su DNI, su nombre y su apellido, así que no se puede averiguar a quién pertenece un DNI probando números.

### Pestaña Inconsistencias

Todo lo que puede estar repetido o mal cargado aparece en la pestaña **Inconsistencias** (el número en la pestaña dice cuántos casos hay), agrupado por tipo:

| Tipo | Qué detecta |
|---|---|
| Mismo nombre y apellido | Dos registros con el mismo nombre completo y distinto DNI |
| Mismo DNI, distinto nombre | Dos personas registradas con el mismo DNI: puede ser un DNI mal escrito o un nombre con error |
| Nombre casi igual | El nombre completo cambia en una sola letra (error de tipeo) |
| DNI casi igual | Mismo apellido y el DNI cambia en un solo número |
| Alumno escrito distinto | Distintos familiares escribieron al mismo alumno de otra forma |
| A revisar | Registros marcados por el [detector](#5-detector-de-registros-sospechosos-y-seguridad) |

Desde ahí también están **Fusionar visitantes a mano**, **Fusionar alumnos a mano** y el **Historial**.

### Fusionar visitantes repetidos

Sirve cuando la misma persona quedó registrada dos veces (por ejemplo, con un número del DNI mal tipeado).

1. En **Inconsistencias**, buscá el par en alguno de los cuatro primeros tipos. Si el panel no lo detectó, usá **Fusionar visitantes a mano** y elegí los dos registros.
2. Tocá **Comparar**. Aparecen los dos registros fila por fila: **tocá el dato correcto de cada fila** (nombre, apellido, DNI y a quién viene a ver).
3. **Cambiar cuál queda** elige qué número de registro se conserva.
4. Tocá **Fusionar**. Queda un solo registro con los datos elegidos. Si cualquiera de los dos ya había ingresado, el resultado figura como ingresado.

Si no eran la misma persona, tocá **No es la misma** y esa sugerencia deja de aparecer en ese dispositivo.

### Fusionar alumnos repetidos

Cada familiar escribe el nombre del alumno a mano, así que el mismo chico puede aparecer como "Tomás Fernández", "Tomas Fernandez" y "tomi fernandez".

1. La pestaña **Alumnos** muestra el grupo de personas que vino a ver a cada alumno (parentesco, DNI y si ya ingresaron), separado por curso. Arriba hay una pestaña por curso ("Todos", "1° 1ª", "7° 2ª"…) con la cantidad de personas de cada uno. Desde la lista de visitantes, tocar "Madre de Tomás…" lleva directo al grupo de ese alumno. Las mayúsculas y las tildes se ignoran solas.
2. Los posibles repetidos aparecen en **Inconsistencias → Alumno escrito distinto**. Tocá **Revisar**, o usá **Fusionar alumnos a mano** y marcá los que son el mismo.
3. Elegí cómo se escribe bien el nombre (o escribilo en **Otro**). Abajo ves la lista de **familiares que lo van a acompañar** después de fusionar.
4. Tocá **Fusionar alumnos**. Todos esos familiares quedan agrupados bajo el mismo alumno.

Después de fusionar, si alguien nuevo escribe cualquiera de esas formas ("tomi fernandez"), su registro se agrupa solo con el nombre correcto.

### Deshacer una fusión

- Justo después, el aviso de abajo tiene un botón **Deshacer** (dura unos segundos).
- En cualquier momento: botón de **historial** (reloj, arriba a la derecha, o **Historial** en Inconsistencias) → **Deshacer** en la fusión que quieras.

Al deshacer, todo vuelve a como estaba: los dos registros se separan con sus datos originales, o los familiares vuelven al nombre de alumno que habían escrito. Si un recepcionista marcó el ingreso después de la fusión, ese ingreso se respeta.

---

## 5. Detector de registros sospechosos y seguridad

### Lo que no se deja registrar

El formulario rechaza directamente (con un mensaje en el campo) estos casos:

- **Números o caracteres especiales en el nombre, el apellido o el nombre del alumno.** Solo se aceptan letras (con tildes, ñ y ü) y espacios: nada de números, signos, comillas, guiones, `<`, `>`, `;`, emojis ni otros alfabetos. En el formulario ni siquiera se pueden escribir. Un apellido como "D'Alessandro" se escribe "DAlessandro" o "D Alessandro".
- **DNI con algo que no sean números** (se aceptan puntos de separación, como `30.123.456`).
- **DNI que no tenga sentido** para alguien que vive en Argentina: menos de 2.000.000 (serían personas de más de 100 años) o entre 65 y 90 millones (números todavía no emitidos). Los DNI de 90 millones en adelante se permiten: es la serie de extranjeros/residentes. Se ajusta en `DNI_MIN_VALIDO`, `DNI_MAX_ARGENTINO` y `DNI_EXTRANJERO_DESDE` de `public/api/_validar.php`.
- **Nombres de famosos**, argentinos e internacionales: deportistas, músicos, actores, políticos, streamers, personajes, el fútbol argentino actual y nombres artísticos de cine adulto. La lista está en `public/api/_famosos.php`. Se detecta aunque cambien el orden o agreguen segundos nombres ("Messi Lionel Andrés").
- **Jugadores de Racing** (históricos y actuales, lista `RACING` en `_famosos.php`): además, el formulario muestra la pantalla en rojo un segundo antes del aviso.
- Si viene a ver a un alumno, **falta el año o la división**.

Los nombres de famosos van siempre como **nombre completo** (o apodos que nadie usa como nombre real), así alguien que comparte **solo el apellido** entra sin problema: "Lucas Sosa" o "Martín Milito" pasan, aunque "Santiago Sosa" y "Diego Milito" estén bloqueados. Si una persona de verdad se llama exactamente igual que un famoso, el recepcionista la registra desde el lápiz del panel, que sí lo permite. **Importante:** a pedido de la escuela se incluyeron nombres comunes del fútbol (Enzo Fernández, Lautaro Martínez, jugadores de Racing…); si eso frena a un vecino real, se carga desde el panel.

### Lo que se marca para revisar

`public/api/_troll.php` revisa cada registro y marca los sospechosos como **A revisar**. Detecta:

- Nombres de chiste ("Armando Esteban Quito", "Elsa Pato"…).
- Palabras inapropiadas.
- Datos de prueba o tecleado al azar ("test", "asdf", "jajaja", "qwerty").
- Letras repetidas ("aaaa"), palabras sin vocales.
- Nombre y apellido iguales.
- DNI con todos los números iguales (`11111111`), en escalera (`12345678`, o 5 seguidos como `40123456`) o que empieza con 0.
- DNI de relleno: muchos números repetidos (`11101111`), un patrón que se repite (`12121212`, `45674567`) o de a pares (`11223344`).
- DNI con números de chiste u ofensivos (`666` al principio o al final, `6969`, `42069`, `1488`, `1312`, `8008`/`58008`/`80085`).
- DNI con 5 números seguidos o patrones raros (los DNI imposibles ya se rechazan directamente; ver arriba).

**No bloquea a nadie.** Al visitante le aparece la pantalla verde normal (así no sabe que lo marcaron) y en el panel el registro sale con borde naranja y la etiqueta **A revisar**. También aparece en **Inconsistencias → A revisar**. El recepcionista le pide el DNI en la puerta y, si los datos son reales, toca **Los datos están bien** (ahí o desde el lápiz).

**Agregar casos:** sumá palabras a `NOMBRES_CHISTE`, `PALABRAS` o `BROMA` en `public/api/_troll.php` (en minúsculas y sin tildes). **Apagarlo:** `DETECTOR_TROLL` en `'off'` en la configuración.

### Seguridad de los datos que entran

Todo lo que llega a la API se revisa en el servidor, aunque el formulario ya lo haya revisado (alguien podría mandar datos sin usar el formulario):

| Dato | Qué se acepta | Dónde |
|---|---|---|
| Nombre, apellido, alumno | Solo letras latinas (con tildes, ñ, ü) y espacios; 2 a 80 caracteres (120 el alumno); tiene que ser texto | `public/api/_validar.php` |
| DNI | 7 u 8 números (puntos o espacios de separación opcionales) | `public/api/_validar.php` |
| ¿Viene a ver a un alumno? | Solo `true` o `false` (no el texto `"true"`) | `public/api/_validar.php` |
| Año, división | Enteros de 1 a 7 y de 1 a 6 | `public/api/_validar.php` |
| Parentesco | Solo una de las opciones de la lista | `public/api/_validar.php` |
| Ids de registros y fusiones | Enteros positivos | `idDe` en `public/api/_validar.php` |
| PIN | 4 a 8 números; se compara cifrado | `public/api/_auth.php` |
| `?since=` del panel | Fecha con formato exacto | `public/api/visitantes.php` |
| Cuerpo del pedido | Un objeto JSON válido; si no, 400 | `cuerpo()` en `public/api/_db.php` |

Lo que no cumple se **rechaza con error 400** y no se guarda; no se "arregla" en silencio. Además:

- **Inyección SQL:** todas las consultas usan PDO con parámetros (`?`) y sin emular preparadas; ningún dato del usuario se pega al texto del SQL.
- **XSS:** el navegador muestra los datos siempre con `textContent`, nunca como HTML. No hay `onclick=`, `onerror=` ni `<script>` dentro del HTML, así la CSP puede ser estricta.
- **Largo de los textos:** si un nombre supera el máximo, se rechaza; no se recorta en silencio.
- **Privacidad del DNI:** con el mismo DNI y otro nombre se crea otra persona, que solo ve su propia entrada, nunca los datos de la otra.
- **PIN:** guardado con `password_hash` (bcrypt, con sal), nunca en texto, y con bloqueo por intentos fallidos.
- **Archivos internos:** todo lo que empieza con `_` en `public/api/` (configuración con la contraseña, conexión, validación) no se puede abrir desde el navegador: el `.htaccess` lo bloquea con 403.
- **Permisos de la base:** el usuario de la app solo tiene `SELECT`, `INSERT` y `UPDATE`.
- **Librería del QR:** `qrcode.js` 1.0.0 (licencia MIT) está copiada en `public/assets/vendor/`. No se carga código de otros sitios.
- **Cabeceras HTTP** (`public/.htaccess`): `Content-Security-Policy` (solo scripts propios), `Strict-Transport-Security` (con HTTPS), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy` y `Permissions-Policy`.

**Skill de seguridad:** en `.claude/skills/ciberseguridad-apps-eventos/` hay una skill de Claude Code con las reglas de seguridad de este tipo de apps y la lista de pruebas con datos hostiles.

---

## 6. Instalarla en el servidor del colegio

### 6.1 Copiar los archivos

Lo que va en la carpeta web del servidor (la que Apache sirve para `muestra.tec4.ar`) es **el contenido de `public/`**: `index.html`, `admin.html`, `qr.html`, `.htaccess`, `assets/` y `api/`. Lo demás (`schema.sql`, las migraciones, este README) **no** va en la carpeta web.

- Con Git en el servidor: `git clone --branch v1.0-colegio https://github.com/haghen29/registro-muestra.git` y apuntar el `DocumentRoot` del sitio a la carpeta `public`.
- Sin Git: bajar el zip de la etiqueta `v1.0-colegio` y copiar el contenido de `public/` a la carpeta web.

> **Ojo con `.htaccess`:** empieza con punto y algunos programas lo esconden. Si no se copia, `/admin`, `/qr` y la API dan error 404, y los archivos internos quedan expuestos.

En Apache tienen que estar habilitados `mod_rewrite` y `mod_headers`, y el sitio tiene que permitir `.htaccess` (`AllowOverride All` en la carpeta).

### 6.2 Crear la base

Como root en el MariaDB del servidor:

```sql
source /ruta/al/proyecto/schema.sql
CREATE USER 'muestra_user'@'localhost' IDENTIFIED BY 'UnaContraseñaLarga-Y-Segura';
GRANT SELECT, INSERT, UPDATE ON muestra_tec4.* TO 'muestra_user'@'localhost';
FLUSH PRIVILEGES;
```

Si la base ya existía de una versión anterior, en lugar de `schema.sql` ejecutá las [migraciones](#3-actualizar-una-base-creada-con-una-versión-anterior). Nunca uses `root` en la configuración de la app.

### 6.3 Configurar

En `api/` (dentro de la carpeta web), copiá `_config.local.example.php` como **`_config.local.php`** y completalo con los datos del servidor:

```php
return [
    'DB_HOST' => 'localhost',
    'DB_USER' => 'muestra_user',
    'DB_PASSWORD' => 'UnaContraseñaLarga-Y-Segura',
    'DB_NAME' => 'muestra_tec4',
    'ADMIN_PIN' => '1111',
];
```

`_config.local.php` no se sube a GitHub (está en `.gitignore`) y no se puede abrir desde el navegador. También se pueden usar variables de entorno del servidor con los mismos nombres (`DB_HOST`, `DB_PASSWORD`, etc.), que tienen prioridad.

### 6.4 Dominio y HTTPS

Quien administra el DNS de `tec4.ar` apunta `muestra.tec4.ar` al servidor, y se activa un certificado HTTPS (por ejemplo con Let's Encrypt / certbot). Probá:

- https://muestra.tec4.ar → formulario
- https://muestra.tec4.ar/admin → panel
- https://muestra.tec4.ar/qr → cartel

El QR del cartel ya viene apuntando a `https://muestra.tec4.ar/`. Si cambia la dirección, se corrige en `URL_OFICIAL` de `public/assets/qr.js` (o, por única vez, escribiéndola en el cartel y tocando **Actualizar QR**).

### 6.5 Subir cambios al repositorio

```powershell
git add -A
git commit -m "Qué cambiaste"
git push
```

---

## 7. El día de la muestra

1. Abrí https://muestra.tec4.ar/qr, revisá que abajo del QR diga `muestra.tec4.ar`, escanealo con un celular para confirmar que abre el formulario y tocá **Imprimir cartel**.
2. Borrá los registros de prueba (ver [comandos SQL](#8-comandos-sql-útiles)).
3. **Cambiá el PIN 1111** desde la llave del panel y pasale a cada recepcionista la dirección de `/admin` y el PIN nuevo. El PIN queda guardado mientras la pestaña esté abierta.
4. Probá un registro real desde un celular con datos móviles antes de abrir la puerta.

---

## 8. Comandos SQL útiles

Entrar a la consola como root (XAMPP): `cd C:\xampp\mysql\bin` y `.\mysql.exe -u root`. Después `USE muestra_tec4;`.

```sql
-- Vaciar todo para arrancar de cero (borra registros e historial)
DELETE FROM visitantes; DELETE FROM fusiones; DELETE FROM alumno_alias;
ALTER TABLE visitantes AUTO_INCREMENT = 1;

-- Ver los registros eliminados
SELECT id, apellido, nombre, dni FROM visitantes WHERE eliminado = 1 AND fusionado_en IS NULL;

-- Recuperar un registro eliminado (cambiá el 15 por el id)
UPDATE visitantes SET eliminado = 0 WHERE id = 15 AND fusionado_en IS NULL;

-- Ver los marcados por el detector
SELECT id, apellido, nombre, alerta FROM visitantes WHERE alerta IS NOT NULL AND eliminado = 0;

-- Cuántos familiares vinieron por cada alumno
SELECT alumno_nombre, COUNT(*) AS familiares, SUM(ingresado) AS ingresaron
FROM visitantes WHERE eliminado = 0 AND con_alumno = 1
GROUP BY alumno_nombre ORDER BY alumno_nombre;
```

Para separar registros fusionados no uses SQL: usá **Deshacer** en el historial del panel, que restaura todo con los datos originales.

---

## 9. Problemas comunes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| `/admin`, `/qr` o la API dan **404** | No se copió `.htaccess`, o Apache no tiene `mod_rewrite` / `AllowOverride All` | Copiá `public/.htaccess` y revisá la configuración de Apache |
| **500** en todas las páginas | `.htaccess` usa `mod_headers` y no está habilitado | Habilitá `mod_headers` (`a2enmod headers` en Linux) |
| "No se pudo guardar el registro" / "No se pudo leer la base de datos" | Datos mal en la configuración, o MariaDB apagada | Revisá `_config.local.php` (o `_config.php` en la compu) y que MySQL esté prendido |
| `Access denied for user 'muestra_user'` | Contraseña distinta, o falta el `GRANT` | Revisá `DB_PASSWORD` y repetí el `GRANT` como root |
| `ERROR 1396 CREATE USER failed` | El usuario ya existe | No pasa nada: ejecutá solo el `GRANT` |
| "No se pudo verificar el PIN" | Faltan las tablas `ajustes` / `intentos_pin` | Ejecutá `migracion-v4.sql` como root |
| "No se pudo guardar el registro" justo después de actualizar | Falta alguna migración | Ejecutá las migraciones v2 a v5 como root |
| Alguien con el mismo DNI y otro nombre no se puede registrar | Falta la migración v5 (el DNI sigue siendo único) | Ejecutá `migracion-v5.sql` como root |
| `PIN incorrecto` | Alguien lo cambió y ya no es 1111 | Preguntale al admin. Si nadie lo sabe, ver "Si se olvidan del PIN" en la sección 4 |
| "Demasiados intentos con PIN incorrecto" | 5 PIN incorrectos seguidos desde esa conexión | Esperá 2 minutos y probá con el PIN correcto |
| Los íconos se ven como palabras (`edit`, `search`) | Sin internet para cargar la fuente de íconos | Se arregla solo con conexión; no afecta el funcionamiento |

---

## 10. Cómo está hecho

```
 Navegador (celular o PC)          Servidor (Apache + PHP)            Base de datos
┌──────────────────────┐  fetch   ┌───────────────────────┐   SQL   ┌──────────────┐
│ Frontend             │ ───────► │ API  /api/...  (PHP)  │ ──────► │ MariaDB      │
│ HTML + CSS + JS      │ ◄─────── │ public/api/*.php      │ ◄────── │ muestra_tec4 │
└──────────────────────┘   JSON   └───────────────────────┘         └──────────────┘
```

1. El **frontend** es la parte que se ve: el formulario, el panel y el cartel del QR. Se descarga una sola vez y después no se recarga la página.
2. Cuando hace falta guardar o leer algo, el JavaScript del navegador le pide los datos a la **API** con `fetch`, por ejemplo `POST /api/registro`.
3. La **API** en PHP valida los datos, revisa el PIN cuando es del panel, consulta o modifica la **base** y responde en **JSON**. A diferencia de una página PHP clásica, no devuelve HTML armado: la pantalla la arma el navegador y se actualiza sin recargar.

El panel le pregunta a la API cada 2 segundos *"¿qué cambió desde la última vez?"* (`GET /api/visitantes?since=...`) y recibe solo lo nuevo. Los repetidos, los "alumno escrito distinto" y la lista de alumnos se calculan en el navegador de cada recepcionista.

La pantalla verde guarda en el celular (`localStorage`) las entradas de todas las personas que se registraron desde ahí, durante 12 horas y hasta 4 personas por celular. No se consulta al servidor para mostrarlas.

### Archivos

```
public/                  ← lo que va en la carpeta web del servidor
  .htaccess              Rutas /admin, /qr y /api/...; bloquea los archivos internos; cabeceras de seguridad
  index.html             Formulario del visitante y pantalla verde (entradas del celular)
  admin.html             Panel de recepción: lista, alumnos, inconsistencias y ventanas
  qr.html                Cartel A4 con el QR que apunta al formulario
  assets/
    styles.css, admin.css, qr.css   Estilos
    form.js              Formulario: valida, envía a api/registro y guarda las entradas en el celular
    admin.js             Panel: PIN, actualización cada 2 s, búsqueda, filtros, detección, edición, fusiones
    qr.js                Cartel: arma el QR con https://muestra.tec4.ar/ (URL_OFICIAL) e imprime
    vendor/qrcode.min.js Librería qrcode.js 1.0.0 (MIT)
    img/logo-atahualpa.png  Logo de la Agrupación Estudiantil Atahualpa Yupanqui (hoy no se muestra)
  api/
    _config.php          Configuración: valores de XAMPP; lee _config.local.php si existe
    _config.local.example.php  Modelo para los datos del servidor (copiar como _config.local.php)
    _db.php              Conexión PDO, transacciones, respuestas JSON y creación de tablas que falten
    _auth.php            PIN cifrado (bcrypt), bloqueo tras 5 fallos y método HTTP
    _validar.php         Validación estricta de los datos del visitante
    _famosos.php         Famosos con los que no se puede registrar nadie
    _troll.php           Detector de registros sospechosos
    registro.php         POST /api/registro     Formulario público
    visitantes.php       GET  /api/visitantes   Lista en vivo (?since= para cambios)
    checkin.php          POST /api/checkin      Marcar o deshacer ingreso
    editar.php           POST /api/editar       Corregir datos o quitar aviso
    eliminar.php         POST /api/eliminar     Ocultar un registro
    fusionar.php         POST /api/fusionar     Fusionar visitantes o alumnos
    fusiones.php         GET/POST /api/fusiones Historial y deshacer
    pin.php              POST /api/pin          Cambiar el PIN del panel
schema.sql               Crea la base desde cero
migracion-v2..v5.sql     Actualizan una base de una versión anterior sin borrar registros
```

Todos los endpoints del panel exigen el PIN. El formulario público solo puede crear registros.

> La versión anterior de la app tenía la API en Node.js para Vercel. Quedó guardada en la etiqueta `v1.0-node` del repositorio.
