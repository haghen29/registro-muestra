<?php
// POST /api/editar
//   { id, nombre, apellido, dni, conAlumno, alumno, curso, division, parentesco }  -> corrige los datos
//   { id, quitarAlerta: true }                                                    -> "los datos están bien"
require_once __DIR__ . '/_auth.php';
require_once __DIR__ . '/_troll.php';

soloMetodo('POST');
requireAdmin();

$b = cuerpo();
$id = idDe($b['id'] ?? null);
if (!$id) responder(400, ['error' => 'Falta el id del visitante.']);

try {
    $actual = leerVisitante($id);
    if (!$actual || $actual['eliminado']) {
        responder(404, ['error' => 'Ese registro ya no existe (lo eliminaron o lo fusionaron).']);
    }

    if (($b['quitarAlerta'] ?? null) === true) {
        q('UPDATE visitantes SET alerta = NULL WHERE id = ?', [$id]);
        responder(200, ['ok' => true, 'visitante' => leerVisitante($id)]);
    }

    // Desde el panel se puede guardar a alguien que se llama igual que un famoso
    list($d, $errores) = validarVisitante($b, true);
    if ($errores) responder(400, ['error' => 'Revisá los datos marcados.', 'errores' => $errores]);

    // El detector se vuelve a pasar con los datos corregidos
    $alerta = analizar($d);
    // Si lo pasan a "No viene a ver a un alumno", se guarda igual el alumno, el curso y el
    // parentesco que había, por si fue un toque sin querer: al volver a "Sí" reaparecen.
    $previo = function ($k) use ($d, $actual) { return $d['conAlumno'] ? $d[$k] : $actual[$k]; };
    q(
        'UPDATE visitantes
            SET nombre = ?, apellido = ?, dni = ?, con_alumno = ?, alumno_nombre = ?, curso = ?, division = ?,
                parentesco = ?, alerta = ?
          WHERE id = ?',
        [$d['nombre'], $d['apellido'], $d['dni'], $d['conAlumno'] ? 1 : 0, $previo('alumno'), $previo('curso'),
         $previo('division'), $previo('parentesco'), $alerta, $id]
    );
    responder(200, ['ok' => true, 'visitante' => leerVisitante($id)]);
} catch (Throwable $e) {
    if (esDuplicado($e)) {
        // Ya hay otro registro con el mismo DNI, nombre y apellido (es la misma persona dos veces)
        $otro = q(
            'SELECT id, eliminado FROM visitantes WHERE dni = ? AND nombre = ? AND apellido = ? AND id <> ?',
            [$d['dni'] ?? '', $d['nombre'] ?? '', $d['apellido'] ?? '', $id]
        )->fetch();
        $cual = $otro && !(int) $otro['eliminado'] ? ' (#' . str_pad((string) $otro['id'], 4, '0', STR_PAD_LEFT) . ')' : ' (un registro eliminado)';
        responder(409, [
            'error' => "Ya hay otro registro con ese DNI, nombre y apellido$cual. Si es la misma persona, fusionalos desde Inconsistencias.",
            'errores' => ['dni' => 'Ya hay otro registro igual.'],
        ]);
    }
    error_log('editar: ' . $e->getMessage());
    responder(500, ['error' => 'No se pudo guardar el cambio.']);
}
