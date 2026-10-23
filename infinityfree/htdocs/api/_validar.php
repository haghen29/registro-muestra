<?php
// Validación compartida entre el formulario público y la edición del panel.
// Mismas reglas que api/_validar.js de la versión pro.
//
// Regla general: lo que no cumple el formato se RECHAZA (400), no se "arregla".
// - Nombres (visitante y alumno): solo letras (con tildes, ñ y ü) y espacios.
//   Nada de números, signos, comillas, <, >, ;, emojis ni otros alfabetos.
// - DNI: solo números (se aceptan puntos o espacios de separación: 30.123.456).
// - Todo lo demás llega de listas cerradas (parentesco, año, división, Sí/No).
// Además, la base se consulta siempre con parámetros (?), nunca pegando texto al SQL,
// y el navegador muestra los datos con textContent, nunca como HTML.
require_once __DIR__ . '/_famosos.php';

const PARENTESCOS = ['Padre', 'Madre', 'Hermano/a', 'Abuelo/a', 'Tío/a', 'Amigo/a', 'Otro'];
// Años y divisiones de la escuela. Si cambian, actualizar también los <select> de index.html y admin.html.
const CURSO_MAX = 7;
const DIVISION_MAX = 6;

// Letras latinas (incluye á é í ó ú ñ ü ç à ...) y espacios simples entre palabras
const SOLO_LETRAS = '/^[A-Za-zÀ-ÖØ-öø-ÿ]+( [A-Za-zÀ-ÖØ-öø-ÿ]+)*$/u';

function texto($v)
{
    return is_scalar($v) ? (string) $v : '';
}

// Junta espacios repetidos y recorta. Si no es texto (número, array, objeto), devuelve ''.
function limpiar($v, $max)
{
    if (!is_string($v) || !mb_check_encoding($v, 'UTF-8')) return '';
    if (class_exists('Normalizer')) $v = Normalizer::normalize($v, Normalizer::FORM_C) ?: $v;
    return mb_substr(trim(preg_replace('/\s+/u', ' ', $v)), 0, $max);
}

// Texto normalizado para comparar nombres: sin tildes, minúsculas, sin símbolos.
// (Sin depender de la extensión intl, que no siempre está en el hosting.)
function norm($s)
{
    static $tildes = [
        'á' => 'a', 'à' => 'a', 'ä' => 'a', 'â' => 'a', 'ã' => 'a', 'Á' => 'a', 'À' => 'a', 'Ä' => 'a', 'Â' => 'a', 'Ã' => 'a',
        'é' => 'e', 'è' => 'e', 'ë' => 'e', 'ê' => 'e', 'É' => 'e', 'È' => 'e', 'Ë' => 'e', 'Ê' => 'e',
        'í' => 'i', 'ì' => 'i', 'ï' => 'i', 'î' => 'i', 'Í' => 'i', 'Ì' => 'i', 'Ï' => 'i', 'Î' => 'i',
        'ó' => 'o', 'ò' => 'o', 'ö' => 'o', 'ô' => 'o', 'õ' => 'o', 'Ó' => 'o', 'Ò' => 'o', 'Ö' => 'o', 'Ô' => 'o', 'Õ' => 'o',
        'ú' => 'u', 'ù' => 'u', 'ü' => 'u', 'û' => 'u', 'Ú' => 'u', 'Ù' => 'u', 'Ü' => 'u', 'Û' => 'u',
        'ñ' => 'n', 'Ñ' => 'n', 'ç' => 'c', 'Ç' => 'c', 'ý' => 'y', 'ÿ' => 'y', 'Ý' => 'y',
    ];
    $s = strtolower(strtr(texto($s), $tildes));
    $s = preg_replace('/[^a-z0-9 ]/', ' ', $s);
    return trim(preg_replace('/\s+/', ' ', $s));
}

// Revisa un nombre. Devuelve el mensaje de error, o null si está bien.
function errorNombre($valor, $max = 80, $campo = 'El nombre')
{
    if (mb_strlen($valor) < 2) return null; // el "falta escribirlo" lo maneja quien llama
    if (mb_strlen($valor) > $max) return "$campo es demasiado largo (máximo $max letras).";
    if (preg_match('/\d/', $valor)) return "$campo no puede tener números.";
    if (!preg_match(SOLO_LETRAS, $valor)) return "$campo solo puede tener letras y espacios.";
    return null;
}

// true si el texto tiene todas las palabras de algún famoso (en cualquier orden)
function esFamoso($texto)
{
    $palabras = array_flip(explode(' ', norm($texto)));
    foreach (UNA_PALABRA as $p) if (isset($palabras[$p])) return true;
    foreach (FAMOSOS as $f) {
        $todas = true;
        foreach (explode(' ', $f) as $p) if (!isset($palabras[$p])) { $todas = false; break; }
        if ($todas) return true;
    }
    return false;
}

// Número entero entre 1 y max, recibido como número o como texto de solo dígitos.
function enteroEn($v, $max)
{
    if (is_int($v)) $n = $v;
    elseif (is_string($v) && preg_match('/^\d{1,2}$/', $v)) $n = (int) $v;
    else return null;
    return $n >= 1 && $n <= $max ? $n : null;
}

// Id de un registro: entero positivo (número o texto de solo dígitos). Si no, null.
function idDe($v)
{
    if (is_int($v)) $n = $v;
    elseif (is_string($v) && preg_match('/^\d{1,10}$/', $v)) $n = (int) $v;
    else return null;
    return $n > 0 && $n <= 4294967295 ? $n : null;
}

// permitirFamosos: el panel puede guardar a una persona real que se llama igual que un famoso
function validarVisitante($b, $permitirFamosos = false)
{
    $conAlumno = ($b['conAlumno'] ?? null) === true;
    $dniTexto = is_string($b['dni'] ?? null) || is_int($b['dni'] ?? null) ? mb_substr(trim((string) $b['dni']), 0, 20) : '';
    $datos = [
        // Se limpian sin recortar: si son más largos que lo permitido, se rechazan (no se cortan en silencio)
        'nombre' => limpiar($b['nombre'] ?? null, 1000),
        'apellido' => limpiar($b['apellido'] ?? null, 1000),
        'dni' => preg_match('/^[\d. ]+$/', $dniTexto) ? preg_replace('/[. ]/', '', $dniTexto) : '',
        'conAlumno' => $conAlumno,
        'alumno' => $conAlumno ? limpiar($b['alumno'] ?? null, 1000) : null,
        'curso' => $conAlumno ? enteroEn($b['curso'] ?? null, CURSO_MAX) : null,
        'division' => $conAlumno ? enteroEn($b['division'] ?? null, DIVISION_MAX) : null,
        'parentesco' => $conAlumno && is_string($b['parentesco'] ?? null) ? $b['parentesco'] : null,
    ];
    $errores = [];

    if (mb_strlen($datos['nombre']) < 2) $errores['nombre'] = 'Escribí el nombre.';
    elseif ($e = errorNombre($datos['nombre'])) $errores['nombre'] = $e;
    if (mb_strlen($datos['apellido']) < 2) $errores['apellido'] = 'Escribí el apellido.';
    elseif ($e = errorNombre($datos['apellido'], 80, 'El apellido')) $errores['apellido'] = $e;
    if (!$errores && !$permitirFamosos && esFamoso($datos['nombre'] . ' ' . $datos['apellido'])) {
        $errores['nombre'] = 'Ese nombre es de una persona famosa. Escribí tu nombre real.';
    }

    if (!preg_match('/^\d{7,8}$/', $datos['dni'])) $errores['dni'] = 'El DNI tiene que tener 7 u 8 números, sin letras ni símbolos.';
    if (!is_bool($b['conAlumno'] ?? null)) $errores['conAlumno'] = 'Elegí Sí o No.';

    if ($conAlumno) {
        $errAlumno = errorNombre($datos['alumno'], 120, 'El nombre del alumno');
        if (mb_strlen($datos['alumno']) < 2) $errores['alumno'] = 'Escribí el nombre del alumno.';
        elseif ($errAlumno) $errores['alumno'] = $errAlumno;
        elseif (!$permitirFamosos && esFamoso($datos['alumno'])) $errores['alumno'] = 'Ese nombre es de una persona famosa. Escribí el nombre real del alumno.';
        if (!$datos['curso']) $errores['curso'] = 'Elegí el año.';
        if (!$datos['division']) $errores['division'] = 'Elegí la división.';
        if (!in_array($datos['parentesco'], PARENTESCOS, true)) $errores['parentesco'] = 'Elegí el parentesco.';
    }
    return [$datos, $errores];
}
