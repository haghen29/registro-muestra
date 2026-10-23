<?php
// GET /api/visitantes            -> lista completa (sin eliminados)
// GET /api/visitantes?since=...  -> solo lo que cambió desde ese momento
//                                   (incluye eliminados, así el panel los quita)
// El panel consulta cada 2 s, así los registros aparecen casi al instante.
require_once __DIR__ . '/_auth.php';

soloMetodo('GET');
requireAdmin();

$since = isset($_GET['since']) && is_string($_GET['since']) ? $_GET['since'] : '';
if ($since !== '' && !preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,6})?$/', $since)) {
    responder(400, ['error' => 'Parámetro since inválido.']);
}

try {
    // Cursor con 2 s de margen para no perder escrituras simultáneas;
    // el panel descarta duplicados por id. ("cursor" es palabra reservada en MariaDB)
    $cur = db()->query("SELECT DATE_FORMAT(NOW(3) - INTERVAL 2 SECOND, '%Y-%m-%d %H:%i:%s.%f') AS cur")->fetchColumn();
    $rows = $since !== ''
        ? q(SELECT_VISITANTE . ' WHERE updated_at >= ? ORDER BY id DESC', [$since])->fetchAll()
        : db()->query(SELECT_VISITANTE . ' WHERE eliminado = 0 ORDER BY id DESC')->fetchAll();

    responder(200, ['cursor' => $cur, 'visitantes' => array_map('aVisitante', $rows)]);
} catch (Throwable $e) {
    error_log('visitantes: ' . $e->getMessage());
    responder(500, ['error' => 'No se pudo leer la base de datos.']);
}
