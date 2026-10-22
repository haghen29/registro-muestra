// Detector de registros sospechosos ("troll", nombres de chiste, datos de prueba).
//
// NO bloquea a nadie: solo deja una marca "A revisar" en el panel para que el
// recepcionista pida el DNI en la puerta. Bloquear sería peligroso porque hay
// apellidos reales que parecen chiste.
//
// Para agregar casos, sumá entradas a las listas (en minúsculas y sin tildes).
// Para apagarlo: DETECTOR_TROLL=off en las variables de entorno.
const { norm } = require('./_validar');

// Nombres completos de chiste (se buscan dentro de "nombre apellido").
// Los famosos no van acá: esos directamente no se dejan registrar (api/_famosos.js).
const NOMBRES_CHISTE = [
  'elba lazo', 'elba calao', 'elsa pato', 'elsa capunta', 'elena nito', 'aquiles baeza',
  'armando esteban quito', 'armando paredes', 'benito camelo', 'cosme fulanito',
  'rosa melano', 'susana oria', 'susana horia', 'dolores delano', 'lola mento',
  'aitor tilla', 'alan brito', 'zoila vaca', 'ema roides', 'mario neta',
  'carmelo coton', 'ana tomia', 'paco gerte', 'debora meltrozo', 'elmer curio',
  'joe mama', 'ben dover', 'mike hunt', 'hugh jass',
];

// Palabras sueltas inapropiadas (se comparan palabra por palabra).
const PALABRAS = [
  'puto', 'puta', 'pija', 'verga', 'chota', 'choto', 'garcha', 'orto', 'culo', 'ojete',
  'forro', 'forra', 'boludo', 'boluda', 'pelotudo', 'pelotuda', 'mierda', 'sorete',
  'poronga', 'trolo', 'cagon', 'pene', 'tetas', 'nazi', 'hitler',
];

// Palabras de prueba o broma.
const BROMA = [
  'test', 'prueba', 'asd', 'asdf', 'qwerty', 'xd', 'lol', 'lmao', 'nadie', 'ninguno',
  'anonimo', 'nose', 'nn', 'fulano', 'mengano', 'sutano', 'pepito', 'nombre', 'apellido',
];

const TECLADO = ['asdf', 'sdfg', 'dfgh', 'fghj', 'ghjk', 'hjkl', 'qwer', 'wert', 'erty', 'zxcv', 'xcvb', 'qaz', 'wsx'];

// Números de chiste u odio que se buscan dentro del DNI. Solo de 4 cifras o más,
// porque los más cortos (69, 420) aparecen seguido en DNIs reales.
// 1488 y 1312: símbolos neonazi / anti-policía. 8008, 58008, 80085: "BOOBS" en calculadora.
const NUMEROS_FEOS = ['1488', '1312', '6969', '42069', '69420', '8008', '58008', '80085'];

// Hoy los DNI argentinos llegan a ~60 millones y los de extranjeros usan la serie 90+.
// Entre estos dos números no hay DNIs emitidos. Ajustar si se empiezan a usar.
const DNI_SIN_EMITIR = [70000000, 89999999];

// Busca 5 o más cifras seguidas en escalera, para arriba o para abajo ("x12345xx").
function tieneEscalera(d) {
  let sube = 1, baja = 1;
  for (let i = 1; i < d.length; i++) {
    const dif = d.charCodeAt(i) - d.charCodeAt(i - 1);
    sube = dif === 1 ? sube + 1 : 1;
    baja = dif === -1 ? baja + 1 : 1;
    if (sube >= 5 || baja >= 5) return true;
  }
  return false;
}

function revisarDni(dni, motivos) {
  const d = String(dni || '');
  if (!d) return;
  const veces = {};
  for (const c of d) veces[c] = (veces[c] || 0) + 1;

  if (/^(\d)\1+$/.test(d)) motivos.add('DNI con todos los números iguales');
  else if (Math.max(...Object.values(veces)) >= 6) motivos.add('DNI con muchos números repetidos');
  else if (/^(\d{2,4})\1+$/.test(d)) motivos.add('DNI con un patrón repetido');
  else if (/^(\d)\1(\d)\2(\d)\3(\d)\4$/.test(d)) motivos.add('DNI con números de a pares');
  if (tieneEscalera(d)) motivos.add('DNI en escalera');
  if (/^0/.test(d)) motivos.add('DNI empieza con 0');
  if (NUMEROS_FEOS.some((n) => d.includes(n)) || /^666|666$/.test(d)) motivos.add('DNI con número de chiste u ofensivo');
  if (Number(d) >= DNI_SIN_EMITIR[0] && Number(d) <= DNI_SIN_EMITIR[1]) motivos.add('DNI con un número que todavía no existe');
}

function revisarTexto(texto, etiqueta, motivos) {
  const crudo = String(texto || '');
  const n = norm(crudo);
  if (!n) return;
  const palabras = n.split(' ');

  if (/\d/.test(crudo)) motivos.add(`${etiqueta} con números`);
  if (/[^\p{L}\s'.\-]/u.test(crudo.replace(/\d/g, ''))) motivos.add(`${etiqueta} con símbolos`);
  if (/(.)\1\1/.test(n.replace(/ /g, ''))) motivos.add(`${etiqueta} con letras repetidas`);
  if (palabras.some((p) => p.length >= 4 && !/[aeiouy]/.test(p))) motivos.add(`${etiqueta} sin vocales`);
  if (TECLADO.some((t) => n.replace(/ /g, '').includes(t))) motivos.add(`${etiqueta} parece tecleado al azar`);
  if (palabras.some((p) => PALABRAS.includes(p))) motivos.add(`${etiqueta} con palabra inapropiada`);
  if (palabras.some((p) => BROMA.includes(p) || /^(ja|je|ji|ha|jsj)+$/.test(p))) motivos.add(`${etiqueta} parece de prueba`);
  if (NOMBRES_CHISTE.some((c) => ` ${n} `.includes(` ${c} `))) motivos.add(`${etiqueta} de chiste`);
}

// Devuelve un texto con los motivos, o null si todo parece normal.
function analizar({ nombre, apellido, dni, alumno }) {
  if (String(process.env.DETECTOR_TROLL || 'on').toLowerCase() === 'off') return null;
  const motivos = new Set();

  revisarTexto(`${nombre} ${apellido}`, 'Nombre', motivos);
  if (alumno) revisarTexto(alumno, 'Alumno', motivos);
  if (norm(nombre) && norm(nombre) === norm(apellido)) motivos.add('Nombre y apellido iguales');

  revisarDni(dni, motivos);

  if (!motivos.size) return null;
  return [...motivos].join('; ').slice(0, 160);
}

module.exports = { analizar };
