<?php
// POST /api/checkin  { id, ingresado: true|false }
// Marca (o deshace) el ingreso. Si dos recepcionistas marcan a la misma
// persona, el segundo recibe 409 con la hora del primer ingreso.
require_once __DIR__ . '/_auth.php';

soloMetodo('POST');
requireAdmin();

$b = cuerpo();
$id = idDe($b['id'] ?? null);
$ingresado = $b['ingresado'] ?? null;
if (!$id) responder(400, ['error' => 'Falta el id del visitante.']);
if (!is_bool($ingresado)) responder(400, ['error' => 'Falta indicar si ingresó (true o false).']);

try {
    $r = q(
        'UPDATE visitantes
            SET ingresado = ?, ingreso_at = ' . ($ingresado ? 'NOW(3)' : 'NULL') . '
          WHERE id = ? AND eliminado = 0 AND ingresado <> ?',
        [$ingresado ? 1 : 0, $id, $ingresado ? 1 : 0]
    );
    $visitante = leerVisitante($id);
    if (!$visitante || $visitante['eliminado']) {
        responder(404, ['error' => 'Ese registro ya no existe (lo eliminaron o lo fusionaron).']);
    }
    if ($r->rowCount() === 0) {
        responder(409, [
            'ok' => false,
            'visitante' => $visitante,
            'error' => $ingresado ? 'Esta persona ya tenía el ingreso marcado.' : 'El ingreso ya estaba sin marcar.',
        ]);
    }
    responder(200, ['ok' => true, 'visitante' => $visitante]);
} catch (Throwable $e) {
    error_log('checkin: ' . $e->getMessage());
    responder(500, ['error' => 'No se pudo actualizar el ingreso.']);
}
