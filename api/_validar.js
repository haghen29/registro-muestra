// Validación compartida entre el formulario público y la edición del panel.
//
// Regla general: lo que no cumple el formato se RECHAZA (400), no se "arregla".
// - Nombres (visitante y alumno): solo letras (con tildes, ñ y ü) y espacios.
//   Nada de números, signos, comillas, <, >, ;, emojis ni otros alfabetos.
// - DNI: solo números (se aceptan puntos o espacios de separación: 30.123.456).
// - Todo lo demás llega de listas cerradas (parentesco, año, división, Sí/No).
// Además, la base se consulta siempre con parámetros (?), nunca pegando texto al SQL,
// y el navegador muestra los datos con textContent, nunca como HTML.
const { FAMOSOS, UNA_PALABRA } = require('./_famosos');

const PARENTESCOS = ['Padre', 'Madre', 'Hermano/a', 'Abuelo/a', 'Tío/a', 'Amigo/a', 'Otro'];
// Años y divisiones de la escuela. Si cambian, actualizar también los <select>
// de public/index.html y public/admin.html.
const CURSO_MAX = 7;
const DIVISION_MAX = 6;

// Letras latinas (incluye á é í ó ú ñ ü ç à ...) y espacios simples entre palabras
const SOLO_LETRAS = /^[A-Za-zÀ-ÖØ-öø-ÿ]+( [A-Za-zÀ-ÖØ-öø-ÿ]+)*$/;

// Junta espacios repetidos y recorta. Si no es texto, devuelve '' (y después falla la validación).
const limpiar = (v, max) => (typeof v === 'string' ? v.normalize('NFC').replace(/\s+/g, ' ').trim().slice(0, max) : '');

// Texto normalizado para comparar nombres: sin tildes, minúsculas, sin símbolos.
const norm = (s) =>
  String(s ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ').trim();

// Revisa un nombre. Devuelve el mensaje de error, o null si está bien.
function errorNombre(valor, { min = 2, campo = 'El nombre' } = {}) {
  if (valor.length < min) return null; // el "falta escribirlo" lo maneja quien llama
  if (/\d/.test(valor)) return `${campo} no puede tener números.`;
  if (!SOLO_LETRAS.test(valor)) return `${campo} solo puede tener letras y espacios.`;
  return null;
}

const famososPalabras = FAMOSOS.map((f) => f.split(' '));
const unaPalabra = new Set(UNA_PALABRA);

// true si el texto tiene todas las palabras de algún famoso (en cualquier orden)
function esFamoso(texto) {
  const palabras = new Set(norm(texto).split(' '));
  if ([...palabras].some((p) => unaPalabra.has(p))) return true;
  return famososPalabras.some((f) => f.every((p) => palabras.has(p)));
}

// Número entero entre 1 y max, recibido como número o como texto de solo dígitos.
function enteroEn(v, max) {
  const ok = (typeof v === 'number' && Number.isInteger(v)) || (typeof v === 'string' && /^\d{1,2}$/.test(v));
  const n = ok ? Number(v) : NaN;
  return n >= 1 && n <= max ? n : null;
}

// Id de un registro: entero positivo (número o texto de solo dígitos). Si no, null.
function idDe(v) {
  const ok = (typeof v === 'number' && Number.isSafeInteger(v)) || (typeof v === 'string' && /^\d{1,10}$/.test(v));
  const n = ok ? Number(v) : NaN;
  return n > 0 && n <= 4294967295 ? n : null;
}

// permitirFamosos: el panel puede guardar a una persona real que se llama igual que un famoso
function validarVisitante(b = {}, { permitirFamosos = false } = {}) {
  const conAlumno = b.conAlumno === true;
  const dniTexto = typeof b.dni === 'string' || typeof b.dni === 'number' ? String(b.dni).trim() : '';
  const datos = {
    nombre: limpiar(b.nombre, 80),
    apellido: limpiar(b.apellido, 80),
    dni: /^[\d. ]+$/.test(dniTexto) ? dniTexto.replace(/[. ]/g, '') : '',
    conAlumno,
    alumno: conAlumno ? limpiar(b.alumno, 120) : null,
    curso: conAlumno ? enteroEn(b.curso, CURSO_MAX) : null,
    division: conAlumno ? enteroEn(b.division, DIVISION_MAX) : null,
    parentesco: conAlumno && typeof b.parentesco === 'string' ? b.parentesco : null,
  };
  const errores = {};

  if (datos.nombre.length < 2) errores.nombre = 'Escribí el nombre.';
  else if (errorNombre(datos.nombre)) errores.nombre = errorNombre(datos.nombre);
  if (datos.apellido.length < 2) errores.apellido = 'Escribí el apellido.';
  else if (errorNombre(datos.apellido, { campo: 'El apellido' })) errores.apellido = errorNombre(datos.apellido, { campo: 'El apellido' });
  if (!errores.nombre && !errores.apellido && !permitirFamosos && esFamoso(`${datos.nombre} ${datos.apellido}`)) {
    errores.nombre = 'Ese nombre es de una persona famosa. Escribí tu nombre real.';
  }

  if (!/^\d{7,8}$/.test(datos.dni)) errores.dni = 'El DNI tiene que tener 7 u 8 números, sin letras ni símbolos.';
  if (b.conAlumno !== true && b.conAlumno !== false) errores.conAlumno = 'Elegí Sí o No.';

  if (conAlumno) {
    const errAlumno = errorNombre(datos.alumno, { campo: 'El nombre del alumno' });
    if (datos.alumno.length < 2) errores.alumno = 'Escribí el nombre del alumno.';
    else if (errAlumno) errores.alumno = errAlumno;
    else if (!permitirFamosos && esFamoso(datos.alumno)) errores.alumno = 'Ese nombre es de una persona famosa. Escribí el nombre real del alumno.';
    if (!datos.curso) errores.curso = 'Elegí el año.';
    if (!datos.division) errores.division = 'Elegí la división.';
    if (!PARENTESCOS.includes(datos.parentesco)) errores.parentesco = 'Elegí el parentesco.';
  }
  return { datos, errores, ok: Object.keys(errores).length === 0 };
}

module.exports = {
  PARENTESCOS, CURSO_MAX, DIVISION_MAX, SOLO_LETRAS,
  limpiar, norm, errorNombre, esFamoso, idDe, validarVisitante,
};
