# Registro de visitantes · Muestra Educativa E.E.S.T. N°4 Berazategui

Aplicación web para registrar a los visitantes de la Muestra Educativa y controlar el ingreso en la puerta.

> Hay una **versión simple** en la carpeta `registro-muestra-tec4-simple`: la misma app sin el módulo de inconsistencias (no detecta repetidos ni registros sospechosos, no fusiona). Usa la misma base de datos y corre en el puerto 3001.
>
> Hay una **versión para InfinityFree** en la carpeta `registro-muestra-tec4-infinityfree`: esta misma app con la API reescrita en PHP, para hostings que no corren Node.js. Los pasos para subirla están en su `LEEME.md`.

- El **visitante** escanea un QR, completa sus datos en el celular y muestra una pantalla verde en la entrada.
- Los **recepcionistas** ven los registros en vivo, buscan por apellido, DNI o alumno, marcan el ingreso, corrigen datos, eliminan registros y revisan las inconsistencias (repetidos y datos sospechosos).

| Ruta | Para quién | Qué hace |
|---|---|---|
| `/` | Visitante | Formulario: nombre, apellido, DNI y si viene a ver a un alumno |
| `/admin` | Recepcionistas | Panel en vivo con PIN |
| `/qr` | Organización | Cartel A4 para imprimir con el QR del formulario |

**Tecnologías:** HTML, CSS y JavaScript puro · funciones serverless en Node.js (Vercel) · MariaDB. No usa PHP. Ver [Cómo está hecho](#10-cómo-está-hecho).

---

## Índice

1. [Requisitos](#1-requisitos)
2. [Instalación en Windows con XAMPP](#2-instalación-en-windows-con-xampp)
3. [Actualizar una base creada con la versión anterior](#3-actualizar-una-base-creada-con-la-versión-anterior)
4. [Cómo se usa el panel](#4-cómo-se-usa-el-panel)
5. [Detector de registros sospechosos](#5-detector-de-registros-sospechosos)
6. [Publicar en Vercel](#6-publicar-en-vercel)
7. [El día de la muestra](#7-el-día-de-la-muestra)
8. [Comandos SQL útiles](#8-comandos-sql-útiles)
9. [Problemas comunes](#9-problemas-comunes)
10. [Cómo está hecho](#10-cómo-está-hecho): tecnologías, diferencia con PHP y phpMyAdmin, archivos

---

## 1. Requisitos

| Programa | Para qué | Dónde se consigue |
|---|---|---|
| XAMPP | Trae MariaDB (en el panel figura como "MySQL") | apachefriends.org |
| Node.js 18 o superior | Correr la API | nodejs.org (versión LTS) |
| Git | Subir el código a GitHub | git-scm.com |
| Cuenta de Vercel | Publicar la app | vercel.com (entrás con GitHub) |

No hace falta phpMyAdmin: todo se hace desde la consola (ver [la diferencia con phpMyAdmin](#103-diferencia-con-php-y-phpmyadmin)).

---

## 2. Instalación en Windows con XAMPP

En los comandos, cambiá `C:\xampp` por la carpeta donde instalaste XAMPP (por ejemplo `C:\Users\ASUS\Prog\Xampp`) y la ruta del proyecto por la tuya.

### 2.1 Arrancar MariaDB

Abrí el **XAMPP Control Panel** y tocá **Start** en la fila **MySQL**. Tiene que quedar en verde. Apache no hace falta.

### 2.2 Crear la base de datos

Abrí una terminal (PowerShell o CMD) y entrá a la consola de MariaDB como root:

```powershell
cd C:\xampp\mysql\bin
.\mysql.exe -u root
```

En XAMPP, root no tiene contraseña por defecto. Si te la pide, agregá `-p`.

Dentro de la consola (`MariaDB [(none)]>`), ejecutá el script. Usá barras `/` en la ruta:

```sql
source C:/Users/ASUS/Prog/Xampp/htdocs/registro-muestra-tec4/schema.sql
```

Crea la base `muestra_tec4` con tres tablas: `visitantes`, `fusiones` y `alumno_alias`.

### 2.3 Crear el usuario de la app

En la misma consola:

```sql
CREATE USER 'muestra_user'@'localhost' IDENTIFIED BY 'test1234';
GRANT SELECT, INSERT, UPDATE ON muestra_tec4.* TO 'muestra_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

La app nunca borra filas (los registros eliminados se ocultan), así que no necesita permiso `DELETE`.

Si te dice `ERROR 1396 ... CREATE USER failed`, el usuario ya existía. Ejecutá solo el `GRANT` y el `FLUSH`.

### 2.4 Verificar

```powershell
.\mysql.exe -u muestra_user -ptest1234 -e "SHOW TABLES FROM muestra_tec4;"
```

Tienen que aparecer las tres tablas.

### 2.5 Configurar las variables de entorno

En la carpeta del proyecto, copiá `.env.example` como `.env`. Para XAMPP queda así:

```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=muestra_user
DB_PASSWORD=test1234
DB_NAME=muestra_tec4
DB_SSL=false
ADMIN_PIN=4444
DETECTOR_TROLL=on
```

El `.env` no se sube a GitHub (está en `.gitignore`).

### 2.6 Instalar y correr

Desde la carpeta del proyecto, en la terminal de VS Code:

```powershell
npm install
npm i -g vercel
vercel dev
```

La primera vez, `vercel dev` te pide iniciar sesión y te hace unas preguntas:

| Pregunta | Respuesta |
|---|---|
| Which project? | **Create a new project** |
| Project name | `registro-muestra-tec4` |
| In which directory is your code located? | `./` |
| Want to modify these settings? | `N` |

Cuando diga `Ready! Available at http://localhost:3000`, abrí:

- http://localhost:3000 → formulario
- http://localhost:3000/admin → panel (PIN del `.env`)
- http://localhost:3000/qr → cartel

Para cortar el servidor: `Ctrl + C`. Mientras probás, MySQL tiene que estar en verde en XAMPP.

---

## 3. Actualizar una base creada con la versión anterior

Si ya habías ejecutado el `schema.sql` de la primera versión, **no lo vuelvas a ejecutar**: usá la migración, que agrega lo nuevo sin borrar registros.

```powershell
cd C:\xampp\mysql\bin
.\mysql.exe -u root
```

```sql
source C:/Users/ASUS/Prog/Xampp/htdocs/registro-muestra-tec4/migracion-v2.sql
```

Agrega las columnas `alerta`, `eliminado` y `fusionado_en`, crea las tablas `fusiones` y `alumno_alias` y le da al usuario `muestra_user@localhost` permisos sobre toda la base. Se puede ejecutar más de una vez sin problema.

Después (o si tu base ya era de la versión 2), ejecutá también:

```sql
source C:/Users/ASUS/Prog/Xampp/htdocs/registro-muestra-tec4/migracion-v3.sql
```

Agrega las columnas `curso` y `division` (año y división del alumno al que vienen a ver). Los registros viejos quedan sin curso hasta que alguien los edite.

---

## 4. Cómo se usa el panel

### Contadores y filtros

Arriba hay cuatro contadores que también funcionan como filtros: **Registrados**, **Por ingresar**, **Ingresaron** y **A revisar** (registros que marcó el detector). El buscador encuentra por apellido, nombre, DNI o nombre del alumno.

El panel consulta la base cada 2 segundos. Si dos recepcionistas trabajan a la vez, los cambios de uno aparecen en el otro.

### Marcar ingreso

Tocá **Marcar ingreso**. Si otro recepcionista ya lo había marcado, aparece un aviso con la hora del primer ingreso. **Deshacer** lo vuelve a "por ingresar".

### Editar o eliminar un registro

Tocá el lápiz al lado de cada registro:

- **Guardar cambios:** corrige nombre, apellido, DNI o a quién viene a ver. Si el DNI nuevo ya lo tiene otra persona, te avisa y te sugiere fusionarlos desde **Inconsistencias**. Si cambiás "¿Viene a ver a un alumno?" a **No**, el alumno y el parentesco que había escrito quedan guardados: si fue sin querer, volvés a tocar **Sí** y reaparecen.
- **Eliminar:** lo saca del panel en todos los dispositivos. Queda guardado en la base: si la persona se vuelve a registrar con el mismo DNI, el registro reaparece con los datos nuevos. Ver también [cómo recuperar uno a mano](#8-comandos-sql-útiles).

### Pestaña Inconsistencias

Todo lo que puede estar repetido o mal cargado aparece en la pestaña **Inconsistencias** (el número en la pestaña dice cuántos casos hay), agrupado por tipo:

| Tipo | Qué detecta |
|---|---|
| Mismo nombre y apellido | Dos registros con el mismo nombre completo y distinto DNI |
| Nombre casi igual | El nombre completo cambia en una sola letra (error de tipeo) |
| DNI casi igual | Mismo apellido y el DNI cambia en un solo número |
| Alumno escrito distinto | Distintos familiares escribieron al mismo alumno de otra forma |
| A revisar | Registros marcados por el [detector](#5-detector-de-registros-sospechosos) |

Desde ahí también están **Fusionar visitantes a mano**, **Fusionar alumnos a mano** y el **Historial**.

### Fusionar visitantes repetidos

Sirve cuando la misma persona quedó registrada dos veces (por ejemplo, con un número del DNI mal tipeado).

1. En **Inconsistencias**, buscá el par en alguno de los tres primeros tipos. Si el panel no lo detectó, usá **Fusionar visitantes a mano** y elegí los dos registros.
2. Tocá **Comparar**. Aparecen los dos registros fila por fila: **tocá el dato correcto de cada fila** (nombre, apellido, DNI y a quién viene a ver).
3. **Cambiar cuál queda** elige qué número de registro se conserva.
4. Tocá **Fusionar**. Queda un solo registro con los datos elegidos. Si cualquiera de los dos ya había ingresado, el resultado figura como ingresado.

Si no eran la misma persona, tocá **No es la misma** y esa sugerencia deja de aparecer en ese dispositivo.

### Fusionar alumnos repetidos

Cada familiar escribe el nombre del alumno a mano, así que el mismo chico puede aparecer como "Tomás Fernández", "Tomas Fernandez" y "tomi fernandez".

1. La pestaña **Alumnos** muestra el grupo de personas que vino a ver a cada alumno (parentesco, DNI y si ya ingresaron), separado por curso. Arriba hay un filtro para ver un solo curso. Desde la lista de visitantes, tocar "Madre de Tomás…" lleva directo al grupo de ese alumno. Las mayúsculas y las tildes se ignoran solas.
2. Los posibles repetidos aparecen en **Inconsistencias → Alumno escrito distinto**. Tocá **Revisar**, o usá **Fusionar alumnos a mano** y marcá los que son el mismo.
3. Elegí cómo se escribe bien el nombre (o escribilo en **Otro**). Abajo ves la lista de **familiares que lo van a acompañar** después de fusionar.
4. Tocá **Fusionar alumnos**. Todos esos familiares quedan agrupados bajo el mismo alumno.

Después de fusionar, si alguien nuevo escribe cualquiera de esas formas ("tomi fernandez"), su registro se agrupa solo con el nombre correcto.

### Deshacer una fusión

Si fusionaste algo que no correspondía:

- Justo después, el aviso de abajo tiene un botón **Deshacer** (dura unos segundos).
- En cualquier momento: botón de **historial** (reloj, arriba a la derecha, o **Historial** en Inconsistencias) → **Deshacer** en la fusión que quieras.

Al deshacer, todo vuelve a como estaba: los dos registros se separan con sus datos originales, o los familiares vuelven al nombre de alumno que habían escrito. Si un recepcionista marcó el ingreso después de la fusión, ese ingreso se respeta.

---

## 5. Detector de registros sospechosos

### Lo que no se deja registrar

El formulario rechaza directamente (con un mensaje en el campo) estos casos:

- **Números en el nombre, el apellido o el nombre del alumno.** En el celular ni siquiera se pueden escribir.
- **Nombres de famosos**, argentinos e internacionales: deportistas, músicos, actores, políticos, streamers y personajes ("Lionel Messi", "Taylor Swift", "Bob Esponja"…), también en el nombre del alumno. La lista está en `api/_famosos.js`. Se detecta aunque cambien el orden o agreguen segundos nombres ("Messi Lionel Andrés").
- Si viene a ver a un alumno, **falta el año o la división**.

Para no dejar afuera a familias reales, la lista no tiene nombres comunes ("Enzo Fernández", "Julián Álvarez") ni apellidos sueltos ("Messi", "Maradona"). Si aun así una persona de verdad se llama igual que un famoso, el recepcionista puede corregir su registro desde el lápiz del panel, que sí lo permite.

### Lo que se marca para revisar

El archivo `api/_troll.js` revisa cada registro y marca los sospechosos como **A revisar**. Detecta:

- Nombres de chiste ("Armando Esteban Quito", "Elsa Pato"…).
- Palabras inapropiadas.
- Datos de prueba o tecleado al azar ("test", "asdf", "jajaja", "qwerty").
- Números o símbolos raros en el nombre, letras repetidas ("aaaa"), palabras sin vocales.
- Nombre y apellido iguales.
- DNI con todos los números iguales (`11111111`), en escalera (`12345678`, o 5 seguidos como `40123456`) o que empieza con 0.
- DNI de relleno: muchos números repetidos (`11101111`), un patrón que se repite (`12121212`, `45674567`) o de a pares (`11223344`).
- DNI con números de chiste u ofensivos (`666` al principio o al final, `6969`, `42069`, `1488`, `1312`, `8008`/`58008`/`80085`).
- DNI en un rango que todavía no se emitió (70.000.000 a 89.999.999).

**No bloquea a nadie.** Al visitante le aparece la pantalla verde normal (así no sabe que lo marcaron) y en el panel el registro sale con borde naranja y la etiqueta **A revisar**. También aparece en **Inconsistencias → A revisar**. El recepcionista le pide el DNI en la puerta y, si los datos son reales, toca **Los datos están bien** (ahí o desde el lápiz). Se decidió no bloquear porque hay apellidos reales que parecen chiste, y un rechazo automático dejaría afuera a una familia de verdad.

**Agregar casos:** sumá palabras a las listas `NOMBRES_CHISTE`, `PALABRAS` o `BROMA` de `api/_troll.js` (en minúsculas y sin tildes). Para números del DNI, usá `NUMEROS_FEOS` (de 4 cifras o más; los más cortos marcarían a mucha gente real). Si se empiezan a emitir DNIs de 70 millones, ajustá `DNI_SIN_EMITIR`.

**Apagarlo:** poné `DETECTOR_TROLL=off` en el `.env` (o en las variables de Vercel).

---

## 6. Publicar en Vercel

### 6.1 La base tiene que estar en internet

La MariaDB de XAMPP está en tu PC y **Vercel no puede conectarse a ella**. Para la versión publicada, la base tiene que estar en un servidor accesible desde afuera. Opciones:

- **Servidor de la escuela (tec4.ar):** instalar MariaDB, ejecutar `schema.sql`, crear el usuario con host `'%'` en lugar de `'localhost'`, cambiar `bind-address` a `0.0.0.0` en la configuración de MariaDB y abrir el puerto 3306 en el firewall (pfSense).
- **Base gratuita en la nube** (Aiven, Railway, etc.): crear una base MySQL, ejecutar `schema.sql` desde HeidiSQL, DBeaver o la consola, y usar `DB_SSL=true` si el proveedor lo pide.

Con la base remota, el usuario se crea así:

```sql
CREATE USER 'muestra_user'@'%' IDENTIFIED BY 'UnaContraseñaLarga-Y-Segura';
GRANT SELECT, INSERT, UPDATE ON muestra_tec4.* TO 'muestra_user'@'%';
FLUSH PRIVILEGES;
```

Nunca uses `root` en Vercel.

### 6.2 Subir el código a GitHub

En github.com creá un repositorio **privado** llamado `registro-muestra-tec4` (sin README). Después, en la carpeta del proyecto:

```powershell
git init
git add .
git commit -m "Registro muestra educativa"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/registro-muestra-tec4.git
git push -u origin main
```

### 6.3 Crear el proyecto en Vercel

1. En vercel.com → **Add New → Project** → importá el repositorio.
2. **Framework Preset:** `Other`. No toques Build Command ni Output Directory.
3. En **Environment Variables**, cargá:

| Nombre | Valor |
|---|---|
| `DB_HOST` | IP o dominio de la base remota |
| `DB_PORT` | `3306` (o el que te dé el proveedor) |
| `DB_USER` | `muestra_user` |
| `DB_PASSWORD` | la contraseña del usuario |
| `DB_NAME` | `muestra_tec4` |
| `DB_SSL` | `false` o `true` según el proveedor |
| `ADMIN_PIN` | el PIN para los recepcionistas |
| `DETECTOR_TROLL` | `on` |

4. **Deploy.** Si después cambiás una variable, hacé **Redeploy** para que la tome.

Si ya habías vinculado el proyecto con `vercel dev`, vas a ver el proyecto creado en Vercel: entrá, conectalo a GitHub en **Settings → Git** y cargá las variables.

---

## 7. El día de la muestra

1. Abrí `https://TU-PROYECTO.vercel.app/qr`, revisá que la URL sea la correcta y tocá **Imprimir cartel**.
2. Borrá los registros de prueba (ver [comandos SQL](#8-comandos-sql-útiles)).
3. Pasale a cada recepcionista la dirección de `/admin` y el PIN. El PIN queda guardado mientras la pestaña esté abierta.
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
| `".\mysql.exe" no se reconoce…` | No estás en la carpeta `bin` | `cd C:\xampp\mysql\bin` (o usá la ruta completa) |
| `MySQL server has gone away` / `Can't connect (10061)` | MariaDB se detuvo | Fijate que MySQL esté en verde en XAMPP; mirá el botón **Logs** de esa fila |
| `ERROR 1396 CREATE USER failed` | El usuario ya existe | No pasa nada: ejecutá solo el `GRANT` |
| `Access denied for user 'muestra_user'` | Contraseña distinta a la del `.env`, o falta el `GRANT` | Revisá `DB_PASSWORD` y repetí el `GRANT` como root |
| El formulario dice "No se pudo guardar el registro" | La API no llega a la base | Revisá el `.env` (local) o las variables y los **Logs** del proyecto en Vercel |
| En el panel: "No se pudo fusionar" o error al abrir el historial | Falta la migración o los permisos sobre las tablas nuevas | Ejecutá `migracion-v2.sql` como root |
| `PIN incorrecto` | El PIN no coincide con `ADMIN_PIN` | Revisá el `.env`; en Vercel, Redeploy después de cambiarlo |
| `vercel dev` falla mencionando **esbuild** | npm no ejecutó un script de instalación | `npm approve-scripts esbuild`, después `npm i -g vercel` y otra vez `vercel dev` |
| Los íconos se ven como palabras (`edit`, `search`) | Sin internet para cargar la fuente de íconos | Se arregla solo con conexión; no afecta el funcionamiento |

---

## 10. Cómo está hecho

La app tiene tres partes que se hablan entre sí:

```
 Navegador (celular o PC)          Servidor (Node.js)                 Base de datos
┌──────────────────────┐  fetch   ┌───────────────────────┐   SQL   ┌──────────────┐
│ Frontend             │ ───────► │ API  /api/...         │ ──────► │ MariaDB      │
│ HTML + CSS + JS      │ ◄─────── │ (funciones de Vercel) │ ◄────── │ muestra_tec4 │
└──────────────────────┘   JSON   └───────────────────────┘         └──────────────┘
```

1. El **frontend** es la parte que se ve: el formulario, el panel y el cartel del QR. Se descarga una sola vez y después no se recarga la página.
2. Cuando hace falta guardar o leer algo, el JavaScript del navegador le pide los datos a la **API** con `fetch`, por ejemplo `POST /api/registro`.
3. La **API** valida los datos, revisa el PIN cuando es del panel, consulta o modifica la **base** y responde en **JSON**, un texto con los datos que el navegador usa para actualizar la pantalla.

### 10.1 Tecnologías

| Tecnología | Dónde se usa | Qué es y para qué está |
|---|---|---|
| **HTML** | `public/*.html` | La estructura de cada pantalla: campos, botones, ventanas. |
| **CSS** | `public/assets/*.css` | El diseño: colores, tamaños y cómo se acomoda en el celular. Sin frameworks como Bootstrap ni Tailwind. |
| **JavaScript (en el navegador)** | `public/assets/*.js` | Le da vida a las pantallas: valida el formulario, arma la lista del panel, busca, filtra, detecta repetidos y habla con la API. Es JavaScript "puro" (*vanilla*): sin React, Vue ni jQuery. |
| **Google Fonts** | `<link>` en los HTML | La tipografía **Archivo** y los íconos **Material Symbols** (los íconos son una fuente de letras). |
| **qrcode.js** | `qr.html` | Librería chica que dibuja el código QR del cartel. Se carga desde cdnjs. |
| **localStorage / sessionStorage** | `form.js`, `admin.js` | Memoria del navegador. El celular del visitante guarda su pase verde para volver a mostrarlo si cierra la página. El panel guarda el PIN mientras la pestaña está abierta y los pares marcados como "No es la misma". |
| **Node.js** | `api/*.js` | JavaScript que corre en el servidor en lugar del navegador. Es el lenguaje del backend (versión 18 o más). |
| **Funciones serverless de Vercel** | `api/*.js`, `vercel.json` | Cada archivo de `api/` es un *endpoint* independiente: `api/registro.js` responde en `/api/registro`. No hay un servidor prendido todo el tiempo: Vercel ejecuta la función cuando llega un pedido. En la compu, `vercel dev` simula lo mismo. |
| **mysql2** | `api/_db.js` | La única dependencia de npm. Es el "driver" que conecta Node.js con MariaDB/MySQL. Usa consultas con `?` (preparadas) para que nadie pueda inyectar SQL desde el formulario. |
| **MariaDB** (MySQL) | `schema.sql` | La base de datos. En la compu es la que trae XAMPP; publicada, una base en internet. Usa **transacciones** para que una fusión o un registro se guarde completo o no se guarde nada. |
| **Variables de entorno** | `.env` | Datos que no van en el código: contraseña de la base, PIN y si el detector está prendido. |

### 10.2 Cómo se actualiza el panel en vivo

El panel le pregunta a la API cada 2 segundos *"¿qué cambió desde la última vez?"* (`GET /api/visitantes?since=...`). La API devuelve solo los registros nuevos o modificados, así que aunque haya muchos recepcionistas, cada consulta es chica. Cuando la pestaña queda en segundo plano, deja de preguntar.

Los repetidos, los "alumno escrito distinto" y la lista de alumnos se calculan en el navegador de cada recepcionista, con los registros que ya tiene cargados. No hay que pedírselos a la base.

### 10.3 Diferencia con PHP y phpMyAdmin

En XAMPP lo más común es hacer las páginas en **PHP**: Apache recibe el pedido, ejecuta el `.php`, este consulta MySQL y devuelve **una página HTML entera ya armada**. Cada clic (guardar, buscar, filtrar) recarga la página completa.

Esta app **no usa PHP ni Apache**. Aunque la carpeta esté en `htdocs`, de XAMPP solo usa **MariaDB**.

| | App típica en PHP (XAMPP) | Esta app |
|---|---|---|
| Lenguaje del servidor | PHP | JavaScript (Node.js) |
| Quién atiende los pedidos | Apache (tiene que estar en verde) | `vercel dev` en la compu, Vercel publicada |
| Qué devuelve el servidor | Páginas HTML armadas | Solo datos (JSON); la pantalla la arma el navegador |
| Al guardar o buscar | Se recarga la página | Se actualiza solo lo que cambió, sin recargar |
| Ver cambios de otros | Hay que tocar F5 | Aparecen solos cada 2 segundos |
| Dónde se publica | Un hosting con PHP | Vercel (gratis), más una base en internet |
| Lenguajes a manejar | PHP + HTML + JS | Uno solo: JavaScript, en el navegador y en el servidor |

**phpMyAdmin es otra cosa:** no es parte de una app, es una **herramienta para administrar la base** desde el navegador (ver tablas, editar filas a mano, correr SQL). Viene con XAMPP y está hecha en PHP, por eso necesita Apache.

- **La app** es lo que usan visitantes y recepcionistas. Hay PIN, validaciones, detector, historial y deshacer, y nadie ve datos que no le corresponden.
- **phpMyAdmin** es para quien administra la base. Ve y puede cambiar todo, sin validaciones ni historial.

Esta app no lo necesita: la base se crea y se consulta desde la consola (secciones [2](#2-instalación-en-windows-con-xampp) y [8](#8-comandos-sql-útiles)). Si querés mirar los datos con una interfaz gráfica, podés prender Apache y entrar a `http://localhost/phpmyadmin`: vas a ver la misma base `muestra_tec4` que usa la app. Evitá editar filas a mano ahí, porque te salteás las validaciones y el historial de fusiones. Para corregir, usá el panel.

### 10.4 Archivos

#### Frontend (lo que corre en el navegador): `public/`

```
public/
  index.html         Formulario del visitante y pantalla verde (pase de entrada)
  admin.html         Panel de recepción: lista, alumnos, inconsistencias y ventanas (editar, fusionar, historial)
  qr.html            Cartel A4 con el QR que apunta al formulario
  assets/
    styles.css       Estilos generales y del formulario
    admin.css        Estilos del panel
    form.js          Lógica del formulario: valida, envía a /api/registro y guarda el pase en el celular
    admin.js         Lógica del panel: PIN, actualización cada 2 s, búsqueda, filtros, detección
                     de repetidos y alumnos parecidos, edición, fusiones e historial
```

#### Backend general (piezas internas de la API): `api/_*.js`

Los archivos que empiezan con `_` no son endpoints: Vercel no los publica y solo los usan los otros archivos de `api/`.

```
api/
  _db.js             Conexión a MariaDB (pool de conexiones), transacciones y lectura de un visitante
  _auth.js           Revisa el PIN del header x-admin-pin y el método HTTP (GET/POST)
  _validar.js        Valida y limpia los datos del visitante (sirve al formulario y a la edición)
  _troll.js          Detector de registros sospechosos (ver sección 5)
  _famosos.js        Lista de famosos con los que no se puede registrar nadie (ver sección 5)
```

#### API (endpoints): `api/*.js`

| Archivo | Ruta | Quién lo usa | Qué hace |
|---|---|---|---|
| `registro.js` | `POST /api/registro` | Formulario público | Crea el registro, o reactiva uno eliminado con el mismo DNI. Une el nombre del alumno si ya fue fusionado y pasa el detector. |
| `visitantes.js` | `GET /api/visitantes` | Panel | Lista completa, o solo los cambios con `?since=`. |
| `checkin.js` | `POST /api/checkin` | Panel | Marca o deshace el ingreso. Avisa si otro recepcionista ya lo había marcado. |
| `editar.js` | `POST /api/editar` | Panel | Corrige datos o quita la marca "A revisar". |
| `eliminar.js` | `POST /api/eliminar` | Panel | Oculta un registro. No lo borra de la base. |
| `fusionar.js` | `POST /api/fusionar` | Panel | Fusiona dos visitantes, o varias formas de escribir un alumno, y guarda el estado anterior. |
| `fusiones.js` | `GET/POST /api/fusiones` | Panel | Historial de fusiones y deshacer. |

Todos los endpoints del panel exigen el PIN. El formulario público solo puede crear registros.

#### Base de datos y configuración

```
schema.sql           Crea la base desde cero: tablas visitantes, fusiones y alumno_alias
migracion-v2.sql     Actualiza una base de la versión 1 sin borrar registros
migracion-v3.sql     Agrega curso y división del alumno
.env / .env.example  Variables de entorno (el .env real no se sube a GitHub)
vercel.json          Configuración de Vercel: carpeta public, URLs sin .html, sin caché en /api
package.json         Nombre del proyecto, versión de Node y la dependencia mysql2
```
