<?php
// Pedido liviano para "despertar" el servidor y la base cuando se abre el formulario.
// Así la demora del primer registro (hosting gratis que arranca lento) ocurre mientras
// la persona completa sus datos, y el registro en sí sale rápido. No guarda nada.
require_once __DIR__ . '/_db.php';
try {
    db()->query('SELECT 1');
} catch (Throwable $e) {
    // Si la base no responde, igual contestamos: es solo un calentamiento.
}
responder(200, ['ok' => true]);
