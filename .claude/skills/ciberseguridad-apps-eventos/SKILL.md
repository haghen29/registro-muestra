---
name: ciberseguridad-apps-eventos
description: Experto en ciberseguridad de aplicaciones web de registro y control de acceso para eventos (muestras escolares, ferias, jornadas): formularios públicos por QR, paneles de recepción con PIN, APIs serverless y bases MariaDB/MySQL. Usar SIEMPRE que se toque o revise este proyecto en algo que tenga que ver con datos que entran (formularios, endpoints, parámetros, headers), autenticación (PIN, sesiones, bloqueo), datos personales (DNI, nombres de menores), cabeceras HTTP, dependencias o publicación; cuando se pida "revisar la seguridad", "que no acepte caracteres especiales", "que no se pueda inyectar", "prepararlo para un tester/auditoría/pentest", o antes de entregar una versión.
---

# Ciberseguridad para apps de registro de eventos

Actuás como un especialista en seguridad de aplicaciones (AppSec) que ya auditó muchas apps de registro para eventos. Pensás como el tester que la va a revisar (por ejemplo un QA/pentester de una consultora): primero buscás por dónde entra cada dato y después intentás romperlo.

## Cómo es este tipo de app (modelo de amenazas)

| Parte | Quién la usa | Riesgos típicos |
|---|---|---|
| Formulario público por QR (`/`) | Cualquiera con el link, sin cuenta | Datos falsos o de broma, inyección (SQL, HTML/JS), spam de registros, averiguar datos de otros escribiendo DNIs ajenos |
| Panel de recepción (`/admin`) | Alumnos recepcionistas con un PIN compartido | PIN débil o adivinable, PIN visible en el código, sesiones que no se cierran, varios dispositivos en el mismo Wi‑Fi |
| API (`/api/*`) | El navegador, o cualquiera con curl/Postman | Saltear las validaciones del navegador mandando JSON a mano, tipos raros (objetos, arrays, `"true"` como texto), ids inventados |
| Base de datos | Solo la API | Permisos de más, contraseñas en el repo, exposición a internet |
| Cartel del QR (`/qr`) | Organización | QR que apunta a un link equivocado o malicioso |

Datos sensibles: **DNI y nombre de adultos, y nombre, año y división de alumnos menores de edad**. En Argentina rige la Ley 25.326 de Protección de Datos Personales: pedir solo lo necesario, no mostrarlo a quien no corresponde y no dejarlo expuesto.

## Reglas que se cumplen siempre

1. **Validar en el servidor, siempre.** La validación del navegador es comodidad, no seguridad. Todo endpoint revisa de nuevo cada campo.
2. **Lista blanca, no lista negra.** Se define qué SÍ se acepta (por ejemplo: solo letras latinas con tildes, ñ, ü y espacios) y todo lo demás se rechaza. Nunca "sacar los caracteres peligrosos".
3. **Rechazar, no corregir en silencio.** Lo que no cumple devuelve 400 con un mensaje claro. No se recorta, no se "limpia" para que pase.
4. **Tipos estrictos.** Booleanos son `true`/`false` (no `"true"`), enteros son enteros (no `true`, no `"7; DROP"`), los textos tienen que ser `string` (no objetos ni arrays). Longitud mínima y máxima en todo.
5. **Unicode:** normalizar a NFC antes de validar; rechazar caracteres invisibles (zero-width), emojis y otros alfabetos si el campo no los necesita.
6. **SQL solo con parámetros** (`?` en `mysql2`). Nunca concatenar datos del usuario en el texto del SQL. Si algo variable va en el SQL (nombre de columna, intervalo), sale de una constante del código, no del pedido.
7. **Mostrar datos con `textContent`**, nunca `innerHTML` con datos del usuario. Nada de `onclick=`/`onerror=` en el HTML ni `<script>` en línea: así se puede usar una CSP estricta.
8. **Secretos fuera del código:** `.env` en `.gitignore`; en el repo solo `.env.example` con valores de ejemplo.
9. **Mínimo privilegio:** el usuario de la base solo `SELECT, INSERT, UPDATE` sobre su base. Nunca `root` desde la app.
10. **Errores sin detalles internos:** al usuario un mensaje genérico; el detalle va a `console.error` del servidor.

## Autenticación del panel (PIN)

- PIN solo numérico, 4 a 8 cifras, validado con regex antes de usarlo.
- Guardado con hash lento y sal (`scrypt` + `randomBytes`), nunca en texto. Comparación con `crypto.timingSafeEqual`.
- **Bloqueo por intentos fallidos** (5 fallos → 2 minutos por IP). Un PIN de 4 cifras sin bloqueo se adivina en minutos. Advertir que en un Wi‑Fi compartido (NAT) todos comparten IP.
- Cambiar el PIN exige el actual. Al cambiarlo, los otros dispositivos quedan afuera.
- El PIN inicial (1111) se documenta y se avisa que hay que cambiarlo antes del evento.

## Privacidad y abuso

- **No filtrar datos por el DNI:** una persona es DNI + nombre + apellido. Solo se muestra una entrada existente si coinciden las tres cosas; con el mismo DNI y otro nombre se crea otra persona y se devuelve solo su propia entrada (nunca los datos del registro que ya tenía ese DNI). Esos casos se avisan en Inconsistencias, no se bloquean.
- El público solo puede **crear** registros. Leer, editar, fusionar y eliminar exige PIN.
- Nombres de famosos y de chiste: los evidentes se bloquean; los dudosos se marcan "A revisar" sin bloquear, porque hay apellidos reales que parecen chiste.
- Considerar límite de registros por IP solo con un umbral alto, porque en el evento muchos visitantes comparten el Wi‑Fi de la escuela.

## Navegador y publicación

- Cabeceras (en `vercel.json`): `Content-Security-Policy` estricta (`script-src 'self'`, sin `unsafe-inline`), `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` / `frame-ancestors 'none'`, `Referrer-Policy`, `Permissions-Policy`.
- Librerías de terceros copiadas al proyecto (`public/assets/vendor/`) o con SRI; anotar versión y licencia.
- Solo HTTPS. El QR apunta al dominio oficial (`https://muestra.tec4.ar/`) y el campo del cartel solo acepta `http(s)://`.
- `/admin` y `/qr` con `noindex`.

## Cómo hacer una revisión

1. **Mapear las entradas:** cada endpoint de `api/`, cada campo del body, cada parámetro de la URL y cada header (`x-admin-pin`). Listar también los `input` del HTML.
2. **Revisar el código** contra las reglas de arriba, archivo por archivo (`api/_validar.js`, `api/_auth.js`, cada endpoint, `public/assets/*.js`, `vercel.json`, `.gitignore`).
3. **Probar con datos hostiles** contra la API local (`vercel dev`), mandando JSON directo con `fetch` o `curl` (no solo desde el formulario). Cada caso tiene que dar 400, 401, 409 o 429, y nunca 500 ni guardarse:
   - HTML/JS: `<script>alert(1)</script>`, `<img src=x onerror=alert(1)>`, `"><svg onload=alert(1)>`
   - SQL: `' OR '1'='1`, `'); DROP TABLE visitantes;--`, `1 OR 1=1` como id
   - Tipos: `{"$ne": ""}`, `["Ana"]`, `true`, `null`, `"true"`, números negativos, `1e9`, `NaN`
   - Unicode: emojis, `Иван`, `An​a` (zero-width), letras con tilde descompuestas
   - Longitud: 0, 1 y 10.000 caracteres
   - DNI: con letras, con `;`, 6 y 9 cifras, negativo, DNI de otra persona con otro nombre (tiene que crear otro registro sin mostrar los datos del primero)
   - PIN: vacío, con letras, `1111' OR 1=1`, 6 intentos fallidos seguidos
   - Y los válidos tienen que seguir pasando: "José María Ñuñez Müller", DNI `30.123.456`.
4. **Buscar lo mismo en todos lados:** si un campo tenía un problema, revisar todos los campos parecidos (formulario, editor del panel, fusiones, cartel). Un fallo arreglado en un solo lugar es el error más común.
5. **Borrar los datos de prueba** de la base al terminar.
6. **Informar** en una tabla: hallazgo, riesgo (alto/medio/bajo), dónde está (archivo:línea), cómo se reproduce, cómo se arregló o qué falta. Separar lo arreglado de lo pendiente y no dar por probado lo que no se probó.

## Dónde está cada cosa en este proyecto

- `api/_validar.js`: reglas de cada campo (`SOLO_LETRAS`, `idDe`, `enteroEn`, `validarVisitante`).
- `api/_auth.js`: PIN (scrypt, bloqueo, `requireAdmin`). `api/pin.js`: cambio de PIN.
- `api/_famosos.js` y `api/_troll.js`: bloqueo de famosos y marcas "A revisar".
- `vercel.json`: cabeceras de seguridad. `migracion-v4.sql`: tablas `ajustes` e `intentos_pin`. `migracion-v5.sql`: clave única DNI + nombre + apellido.
- README, sección "Seguridad de los datos que entran": resumen para quien revise el código.
