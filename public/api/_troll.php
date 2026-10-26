<?php
// Detector de registros sospechosos ("troll", nombres de chiste, datos de prueba).
//
// NO bloquea a nadie: solo deja una marca "A revisar" en el panel para que el
// recepcionista pida el DNI en la puerta. Bloquear sería peligroso porque hay
// apellidos reales que parecen chiste.
//
// Para agregar casos, sumá entradas a las listas (en minúsculas y sin tildes).
// Para apagarlo: DETECTOR_TROLL = 'off' en _config.php.
require_once __DIR__ . '/_validar.php';

// Nombres completos de chiste (se buscan dentro de "nombre apellido").
// Los famosos no van acá: esos directamente no se dejan registrar (_famosos.php).
const NOMBRES_CHISTE = [
    'elba lazo', 'elba calao', 'elsa pato', 'elsa capunta', 'elena nito', 'aquiles baeza',
    'armando esteban quito', 'armando paredes', 'benito camelo', 'cosme fulanito',
    'rosa melano', 'susana oria', 'susana horia', 'dolores delano', 'lola mento',
    'aitor tilla', 'alan brito', 'zoila vaca', 'ema roides', 'mario neta',
    'carmelo coton', 'ana tomia', 'paco gerte', 'debora meltrozo', 'elmer curio',
    'joe mama', 'ben dover', 'mike hunt', 'hugh jass',
    // Apodos y memes de gente conocida: no se bloquean (podrían ser reales), se marcan "A revisar".
    'perrito fiu fiu', 'perro fiu fiu', 'fiu fiu', 'atahualpa', 'el noba', 'papu gomez',
    'el dipy', 'la tota', 'el diez', 'el mufa', 'el loco',
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

function contieneAlguno($texto, $lista)
{
    foreach ($lista as $x) if (strpos($texto, $x) !== false) return true;
    return false;
}

function revisarTexto($texto, $etiqueta, &$motivos)
{
    $crudo = texto($texto);
    $n = norm($crudo);
    if ($n === '') return;
    $palabras = explode(' ', $n);
    $junto = str_replace(' ', '', $n);

    if (preg_match('/\d/', $crudo)) $motivos[] = "$etiqueta con números";
    if (preg_match("/[^\\p{L}\\s'.\\-]/u", preg_replace('/\d/', '', $crudo))) $motivos[] = "$etiqueta con símbolos";
    if (preg_match('/(.)\1\1/', $junto)) $motivos[] = "$etiqueta con letras repetidas";
    foreach ($palabras as $p) {
        if (strlen($p) >= 4 && !preg_match('/[aeiouy]/', $p)) { $motivos[] = "$etiqueta sin vocales"; break; }
    }
    if (contieneAlguno($junto, TECLADO)) $motivos[] = "$etiqueta parece tecleado al azar";
    if (array_intersect($palabras, PALABRAS)) $motivos[] = "$etiqueta con palabra inapropiada";
    foreach ($palabras as $p) {
        if (in_array($p, BROMA, true) || preg_match('/^(ja|je|ji|ha|jsj)+$/', $p)) { $motivos[] = "$etiqueta parece de prueba"; break; }
    }
    foreach (NOMBRES_CHISTE as $c) {
        if (strpos(" $n ", " $c ") !== false) { $motivos[] = "$etiqueta de chiste"; break; }
    }
}

// Busca 5 o más cifras seguidas en escalera, para arriba o para abajo ("x12345xx").
function tieneEscalera($d)
{
    $sube = 1;
    $baja = 1;
    for ($i = 1; $i < strlen($d); $i++) {
        $dif = ord($d[$i]) - ord($d[$i - 1]);
        $sube = $dif === 1 ? $sube + 1 : 1;
        $baja = $dif === -1 ? $baja + 1 : 1;
        if ($sube >= 5 || $baja >= 5) return true;
    }
    return false;
}

function revisarDni($dni, &$motivos)
{
    $d = texto($dni);
    if ($d === '') return;
    $veces = count_chars($d, 1);

    if (preg_match('/^(\d)\1+$/', $d)) $motivos[] = 'DNI con todos los números iguales';
    elseif (max($veces) >= 6) $motivos[] = 'DNI con muchos números repetidos';
    elseif (preg_match('/^(\d{2,4})\1+$/', $d)) $motivos[] = 'DNI con un patrón repetido';
    elseif (preg_match('/^(\d)\1(\d)\2(\d)\3(\d)\4$/', $d)) $motivos[] = 'DNI con números de a pares';
    if (tieneEscalera($d)) $motivos[] = 'DNI en escalera';
    if (preg_match('/^0/', $d)) $motivos[] = 'DNI empieza con 0';
    if (contieneAlguno($d, NUMEROS_FEOS) || preg_match('/^666|666$/', $d)) $motivos[] = 'DNI con número de chiste u ofensivo';
    if (ctype_digit($d) && (int) $d >= DNI_SIN_EMITIR[0] && (int) $d <= DNI_SIN_EMITIR[1]) $motivos[] = 'DNI con un número que todavía no existe';
}

// Devuelve un texto con los motivos, o null si todo parece normal.
function analizar($v)
{
    if (strtolower(DETECTOR_TROLL) === 'off') return null;
    $motivos = [];
    $nombre = $v['nombre'] ?? '';
    $apellido = $v['apellido'] ?? '';

    revisarTexto(texto($nombre) . ' ' . texto($apellido), 'Nombre', $motivos);
    if (!empty($v['alumno'])) revisarTexto($v['alumno'], 'Alumno', $motivos);
    if (norm($nombre) !== '' && norm($nombre) === norm($apellido)) $motivos[] = 'Nombre y apellido iguales';
    revisarDni($v['dni'] ?? '', $motivos);

    if (!$motivos) return null;
    return mb_substr(implode('; ', array_values(array_unique($motivos))), 0, 160);
}
