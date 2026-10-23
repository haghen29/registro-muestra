<?php
// POST /api/eliminar  { id }
// Borrado lógico: el registro desaparece del panel en todos los dispositivos,
// pero queda en la base por si hace falta recuperarlo (ver LEEME).
// Si la persona se vuelve a registrar con el mismo DNI, el registro se reactiva.
require_once __DIR__ . '/_auth.php';

soloMetodo('POST');
requireAdmin();

$id = idDe(cuerpo()['id'] ?? null);
if (!$id) responder(400, ['error' => 'Falta el id del visitante.']);

try {
    $r = q('UPDATE visitantes SET eliminado = 1 WHERE id = ? AND eliminado = 0', [$id]);
    if ($r->rowCount() === 0) responder(404, ['error' => 'Ese registro ya estaba eliminado.']);
    responder(200, ['ok' => true, 'id' => $id]);
} catch (Throwable $e) {
    error_log('eliminar: ' . $e->getMessage());
    responder(500, ['error' => 'No se pudo eliminar el registro.']);
}
