<?php
// GET  /api/fusiones             -> historial (últimas 100)
// POST /api/fusiones { deshacer } -> deshace una fusión y deja todo como estaba
require_once __DIR__ . '/_auth.php';

function deshacerVisitante($d)
{
    $aId = (int) $d['principalId'];
    $bId = (int) $d['otroId'];
    $antes = $d['antes'];
    $A = $B = null;
    foreach (q('SELECT id, eliminado, fusionado_en, dni, ingresado, ingreso_at FROM visitantes WHERE id IN (?, ?) FOR UPDATE', [$aId, $bId])->fetchAll() as $r) {
        if ((int) $r['id'] === $aId) $A = $r;
        if ((int) $r['id'] === $bId) $B = $r;
    }
    if (!$A || (int) $A['eliminado']) throw new HttpError(409, 'El registro que quedó de la fusión fue eliminado. No se puede deshacer.');
    if (!$B || (int) $B['fusionado_en'] !== $aId) throw new HttpError(409, 'El registro unido ya cambió. No se puede deshacer.');

    // El principal recupera sus datos originales. El ingreso también, salvo que
    // un recepcionista lo haya cambiado a mano después de la fusión.
    $a = $antes['a'];
    $despues = $d['despues'] ?? null;
    $tocadoDespues = $despues && (
        (int) $A['ingresado'] !== (int) $despues['ingresado'] ||
        (string) $A['ingreso_at'] !== (string) $despues['ingreso_at']
    );
    $ing = $tocadoDespues ? [$A['ingresado'], $A['ingreso_at']] : [$a['ingresado'], $a['ingreso_at']];
    q(
        'UPDATE visitantes
            SET nombre = ?, apellido = ?, dni = ?, con_alumno = ?, alumno_nombre = ?, curso = ?, division = ?,
                parentesco = ?, alerta = ?, ingresado = ?, ingreso_at = ?
          WHERE id = ?',
        // Las fusiones hechas antes de agregar curso y división no los guardaron
        [$a['nombre'], $a['apellido'], $a['dni'], $a['con_alumno'], $a['alumno_nombre'], $a['curso'] ?? null, $a['division'] ?? null,
         $a['parentesco'], $a['alerta'],
         $ing[0], $ing[1], $aId]
    );
    $bb = $antes['b'];
    q(
        'UPDATE visitantes
            SET nombre = ?, apellido = ?, dni = ?, con_alumno = ?, alumno_nombre = ?, curso = ?, division = ?,
                parentesco = ?, alerta = ?, ingresado = ?, ingreso_at = ?, eliminado = 0, fusionado_en = NULL
          WHERE id = ?',
        [$bb['nombre'], $bb['apellido'], $bb['dni'], $bb['con_alumno'], $bb['alumno_nombre'], $bb['curso'] ?? null, $bb['division'] ?? null,
         $bb['parentesco'], $bb['alerta'],
         $bb['ingresado'], $bb['ingreso_at'], $bId]
    );
}

function deshacerAlumno($d, $fusionId)
{
    $restaurados = 0;
    foreach ($d['familiares'] as $f) {
        // Solo si nadie lo cambió después de la fusión
        $restaurados += q(
            'UPDATE visitantes SET alumno_nombre = ? WHERE id = ? AND alumno_nombre = ?',
            [$f['alumno'], $f['id'], $d['nombreFinal']]
        )->rowCount();
    }
    foreach ($d['aliasAntes'] as $a) {
        $prev = $a['prev'];
        if ($prev) {
            q(
                'UPDATE alumno_alias SET nombre = ?, fusion_id = ?, activo = ? WHERE alias_norm = ? AND fusion_id = ?',
                [$prev['nombre'], $prev['fusion_id'], $prev['activo'], $a['clave'], $fusionId]
            );
        } else {
            q('UPDATE alumno_alias SET activo = 0 WHERE alias_norm = ? AND fusion_id = ?', [$a['clave'], $fusionId]);
        }
    }
    return $restaurados;
}

requireAdmin();
$metodo = $_SERVER['REQUEST_METHOD'] ?? '';

if ($metodo === 'GET') {
    try {
        $rows = db()->query(
            'SELECT id, tipo, resumen,
                    FLOOR(UNIX_TIMESTAMP(creada_at) * 1000) AS creada_ms,
                    FLOOR(UNIX_TIMESTAMP(deshecha_at) * 1000) AS deshecha_ms
               FROM fusiones ORDER BY id DESC LIMIT 100'
        )->fetchAll();
        responder(200, ['fusiones' => array_map(function ($r) {
            return [
                'id' => (int) $r['id'], 'tipo' => $r['tipo'], 'resumen' => $r['resumen'],
                'creadaMs' => (int) $r['creada_ms'], 'deshechaMs' => $r['deshecha_ms'] === null ? null : (int) $r['deshecha_ms'],
            ];
        }, $rows)]);
    } catch (Throwable $e) {
        error_log('fusiones: ' . $e->getMessage());
        responder(500, ['error' => 'No se pudo leer el historial.']);
    }
}

if ($metodo !== 'POST') {
    header('Allow: GET, POST');
    responder(405, ['error' => 'Método no permitido.']);
}

$id = idDe(cuerpo()['deshacer'] ?? null);
if (!$id) responder(400, ['error' => 'Falta la fusión a deshacer.']);

try {
    $r = transaccion(function () use ($id) {
        $f = q('SELECT id, tipo, datos, deshecha_at FROM fusiones WHERE id = ? FOR UPDATE', [$id])->fetch();
        if (!$f) throw new HttpError(404, 'Esa fusión no existe.');
        if ($f['deshecha_at']) throw new HttpError(409, 'Esa fusión ya estaba deshecha.');
        $datos = json_decode($f['datos'], true);
        if ($f['tipo'] === 'visitante') {
            deshacerVisitante($datos);
            $detalle = 'Los dos registros volvieron a estar separados.';
        } else {
            $n = deshacerAlumno($datos, $id);
            $detalle = "$n familiar" . ($n === 1 ? '' : 'es') . ' volvi' . ($n === 1 ? 'ó' : 'eron') . ' a su alumno original.';
        }
        q('UPDATE fusiones SET deshecha_at = NOW(3) WHERE id = ?', [$id]);
        return ['detalle' => $detalle];
    });
    responder(200, array_merge(['ok' => true], $r));
} catch (HttpError $e) {
    responder($e->http, ['error' => $e->getMessage()]);
} catch (Throwable $e) {
    if (esDuplicado($e)) responder(409, ['error' => 'No se puede deshacer: uno de los DNI originales ya lo usa otro registro.']);
    error_log('deshacer: ' . $e->getMessage());
    responder(500, ['error' => 'No se pudo deshacer. No se cambió nada.']);
}
