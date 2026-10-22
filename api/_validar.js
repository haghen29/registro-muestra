// Validación compartida entre el formulario público y la edición del panel.
const { FAMOSOS, UNA_PALABRA } = require('./_famosos');

const PARENTESCOS = ['Padre', 'Madre', 'Hermano/a', 'Abuelo/a', 'Tío/a', 'Amigo/a', 'Otro'];
// Años y divisiones de la escuela. Si cambian, actualizar también los <select>
// de public/index.html y public/admin.html.
const CURSO_MAX = 7;
const DIVISION_MAX = 6;

const limpiar = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

// Texto normalizado para comparar nombres: sin tildes, minúsculas, sin símbolos.
const norm = (s) =>
  String(s ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ').trim();

const famososPalabras = FAMOSOS.map((f) => f.split(' '));
const unaPalabra = new Set(UNA_PALABRA);

// true si el texto tiene todas las palabras de algún famoso (en cualquier orden)
function esFamoso(texto) {
  const palabras = new Set(norm(texto).split(' '));
  if ([...palabras].some((p) => unaPalabra.has(p))) return true;
  return famososPalabras.some((f) => f.every((p) => palabras.has(p)));
}

const entero = (v, max) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= max ? n : null;
};

// permitirFamosos: el panel puede guardar a una persona real que se llama igual que un famoso
function validarVisitante(b = {}, { permitirFamosos = false } = {}) {
  const conAlumno = b.conAlumno === true;
  const datos = {
    nombre: limpiar(b.nombre, 80),
    apellido: limpiar(b.apellido, 80),
    dni: String(b.dni ?? '').replace(/\D/g, ''),
    conAlumno,
    alumno: conAlumno ? limpiar(b.alumno, 120) : null,
    curso: conAlumno ? entero(b.curso, CURSO_MAX) : null,
    division: conAlumno ? entero(b.division, DIVISION_MAX) : null,
    parentesco: conAlumno ? limpiar(b.parentesco, 30) : null,
  };
  const errores = {};
  if (datos.nombre.length < 2) errores.nombre = 'Escribí el nombre.';
  else if (/\d/.test(datos.nombre)) errores.nombre = 'El nombre no puede tener números.';
  if (datos.apellido.length < 2) errores.apellido = 'Escribí el apellido.';
  else if (/\d/.test(datos.apellido)) errores.apellido = 'El apellido no puede tener números.';
  if (!errores.nombre && !errores.apellido && !permitirFamosos && esFamoso(`${datos.nombre} ${datos.apellido}`)) {
    errores.nombre = 'Ese nombre es de una persona famosa. Escribí tu nombre real.';
  }
  if (!/^\d{7,8}$/.test(datos.dni)) errores.dni = 'El DNI tiene que tener 7 u 8 números.';
  if (b.conAlumno !== true && b.conAlumno !== false) errores.conAlumno = 'Elegí Sí o No.';
  if (conAlumno) {
    if (!datos.alumno || datos.alumno.length < 2) errores.alumno = 'Escribí el nombre del alumno.';
    else if (/\d/.test(datos.alumno)) errores.alumno = 'El nombre del alumno no puede tener números.';
    else if (!permitirFamosos && esFamoso(datos.alumno)) errores.alumno = 'Ese nombre es de una persona famosa. Escribí el nombre real del alumno.';
    if (!datos.curso) errores.curso = 'Elegí el año.';
    if (!datos.division) errores.division = 'Elegí la división.';
    if (!PARENTESCOS.includes(datos.parentesco)) errores.parentesco = 'Elegí el parentesco.';
  }
  return { datos, errores, ok: Object.keys(errores).length === 0 };
}

module.exports = { PARENTESCOS, CURSO_MAX, DIVISION_MAX, limpiar, norm, esFamoso, validarVisitante };
