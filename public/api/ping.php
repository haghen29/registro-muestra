<?php
// Pedido liviano para "despertar" el servidor y la base cuando se abre el formulario.
// Así la demora del primer registro (hosting gratis que arranca lento) ocurre mientras
// la persona completa sus datos, y el registro en sí sale rápido. No guarda nada.
// "base" dice si se pudo conectar a la base: sirve para ver desde el navegador si la
// configuración (_config.php) está bien. El detalle del error queda solo en el log del servidor.
require_once __DIR__ . '/_db.php';
$base = true;
try {
    db()->query('SELECT 1');
} catch (Throwable $e) {
    // Si la base no responde, igual contestamos: es solo un calentamiento.
    $base = false;
    error_log('ping: ' . $e->getMessage());
}
responder(200, ['ok' => true, 'base' => $base]);
