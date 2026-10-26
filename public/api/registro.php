<?php
// POST /api/registro  ->  registra un visitante desde el formulario público
require_once __DIR__ . '/_auth.php';
require_once __DIR__ . '/_troll.php';
require_once __DIR__ . '/_antiabuso.php';

soloMetodo('POST');

$b = cuerpo();
controlarLimite();
// Bot que completó el campo trampa: se le contesta como si se hubiera registrado, sin guardar nada
if (esBot($b)) responder(201, ['ok' => true, 'duplicado' => false, 'visitante' => null]);

list($d, $errores) = validarVisitante($b);
if ($errores) {
    $resp = ['error' => 'Revisá los datos marcados.', 'errores' => $errores];
    // Si quiso anotarse con nombre de jugador de Racing, el formulario muestra un segundo la pantalla roja
    if (esRacing(($d['nombre'] ?? '') . ' ' . ($d['apellido'] ?? ''))) $resp['racing'] = true;
    responder(400, $resp);
}

try {
    $resultado = transaccion(function () use ($d, $b) {
        // Si el alumno ya fue fusionado con otro nombre, usar el nombre unificado
        if ($d['conAlumno']) {
            $al = q('SELECT nombre FROM alumno_alias WHERE alias_norm = ? AND activo = 1', [norm($d['alumno'])])->fetch();
            if ($al) $d['alumno'] = $al['nombre'];
        }
        $alerta = analizar($d);
        // Enviado demasiado rápido o sin el formulario: entra igual, pero queda "A revisar"
        $tiempo = strtolower(DETECTOR_TROLL) === 'off' ? null : motivoTiempo($b);
        if ($tiempo) $alerta = mb_substr($alerta ? "$alerta; $tiempo" : $tiempo, 0, 160);

        // Una persona es DNI + nombre + apellido. Con el mismo DNI puede haber varias personas
        // (por ejemplo, alguien que se equivocó al escribirlo): se busca la que coincide en todo.
        $ex = null;
        foreach (q('SELECT id, nombre, apellido, eliminado FROM visitantes WHERE dni = ? FOR UPDATE', [$d['dni']])->fetchAll() as $r) {
            if (norm($r['nombre']) === norm($d['nombre']) && norm($r['apellido']) === norm($d['apellido'])) { $ex = $r; break; }
        }

        if ($ex && !(int) $ex['eliminado']) {
            // Mismo DNI, nombre y apellido: es la misma persona, se le vuelve a mostrar su entrada.
            // (Hace falta saber las tres cosas, así que no sirve para averiguar datos de otros.)
            return ['duplicado' => true, 'visitante' => leerVisitante($ex['id'])];
        }

        if ($ex) {
            // Esa persona se había eliminado: se reactiva con los datos nuevos
            q(
                'UPDATE visitantes
                    SET nombre = ?, apellido = ?, con_alumno = ?, alumno_nombre = ?, curso = ?, division = ?,
                        parentesco = ?, alerta = ?,
                        ingresado = 0, ingreso_at = NULL, eliminado = 0, fusionado_en = NULL,
                        created_at = NOW(3)
                  WHERE id = ?',
                [$d['nombre'], $d['apellido'], $d['conAlumno'] ? 1 : 0, $d['alumno'], $d['curso'], $d['division'],
                 $d['parentesco'], $alerta, $ex['id']]
            );
            return ['duplicado' => false, 'visitante' => leerVisitante($ex['id'])];
        }
        // Si el DNI ya existe pero con otro nombre, se guarda como otra persona (el panel lo
        // muestra en Inconsistencias → "Mismo DNI, distinto nombre" para que lo revisen).

        q(
            'INSERT INTO visitantes (nombre, apellido, dni, con_alumno, alumno_nombre, curso, division, parentesco, alerta)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [$d['nombre'], $d['apellido'], $d['dni'], $d['conAlumno'] ? 1 : 0, $d['alumno'], $d['curso'], $d['division'],
             $d['parentesco'], $alerta]
        );
        return ['duplicado' => false, 'visitante' => leerVisitante((int) db()->lastInsertId())];
    });

    // Al visitante no le mostramos la marca del detector
    $visitante = $resultado['visitante'];
    unset($visitante['alerta'], $visitante['eliminado'], $visitante['fusionadoEn']);
    $resp = ['ok' => true, 'duplicado' => $resultado['duplicado'], 'visitante' => $visitante];
    // Si el nombre es de un jugador de Racing, el formulario muestra un segundo la pantalla roja
    if (esRacing($d['nombre'] . ' ' . $d['apellido'])) $resp['racing'] = true;
    responder($resultado['duplicado'] ? 200 : 201, $resp);
} catch (Throwable $e) {
    // Dos registros iguales al mismo tiempo (doble toque): el segundo choca con la clave única
    if (esDuplicado($e)) responder(409, ['error' => 'Esta persona se acaba de registrar. Tocá Registrarme otra vez para ver la entrada.']);
    error_log('registro: ' . $e->getMessage());
    responder(500, ['error' => 'No se pudo guardar el registro. Probá de nuevo en unos segundos.']);
}
