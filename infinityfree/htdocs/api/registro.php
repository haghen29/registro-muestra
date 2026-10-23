<?php
// POST /api/registro  ->  registra un visitante desde el formulario público
require_once __DIR__ . '/_auth.php';
require_once __DIR__ . '/_troll.php';

soloMetodo('POST');

list($d, $errores) = validarVisitante(cuerpo());
if ($errores) responder(400, ['error' => 'Revisá los datos marcados.', 'errores' => $errores]);

try {
    $resultado = transaccion(function () use ($d) {
        // Si el alumno ya fue fusionado con otro nombre, usar el nombre unificado
        if ($d['conAlumno']) {
            $al = q('SELECT nombre FROM alumno_alias WHERE alias_norm = ? AND activo = 1', [norm($d['alumno'])])->fetch();
            if ($al) $d['alumno'] = $al['nombre'];
        }
        $alerta = analizar($d);

        $ex = q('SELECT id, eliminado FROM visitantes WHERE dni = ? FOR UPDATE', [$d['dni']])->fetch();

        if ($ex && !(int) $ex['eliminado']) {
            // Ese DNI ya está registrado. Solo se devuelve el pase si el nombre y el apellido
            // coinciden: si no, cualquiera podría escribir un DNI ajeno y ver los datos de otra persona.
            $previo = leerVisitante($ex['id']);
            if (norm($previo['nombre']) !== norm($d['nombre']) || norm($previo['apellido']) !== norm($d['apellido'])) {
                throw new HttpError(409, 'dni-ajeno');
            }
            return ['duplicado' => true, 'visitante' => $previo];
        }

        if ($ex) {
            // Había un registro eliminado con ese DNI: lo reactivamos con los datos nuevos
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
    responder($resultado['duplicado'] ? 200 : 201, ['ok' => true, 'duplicado' => $resultado['duplicado'], 'visitante' => $visitante]);
} catch (HttpError $e) {
    responder(409, [
        'error' => 'Ese DNI ya está registrado con otro nombre. Revisá el DNI o acercate a la recepción.',
        'errores' => ['dni' => 'Este DNI ya está registrado con otro nombre.'],
    ]);
} catch (Throwable $e) {
    if (esDuplicado($e)) responder(409, ['error' => 'Ese DNI se acaba de registrar. Tocá Registrarme otra vez.']);
    error_log('registro: ' . $e->getMessage());
    responder(500, ['error' => 'No se pudo guardar el registro. Probá de nuevo en unos segundos.']);
}
