<?php
// POST /api/pin  { actual, nuevo }
// Cambia el PIN del panel. Hace falta el PIN actual (en el header y en el cuerpo).
// Después del cambio, los demás dispositivos tienen que entrar con el PIN nuevo.
require_once __DIR__ . '/_auth.php';

soloMetodo('POST');
requireAdmin();

$b = cuerpo();
$actual = $b['actual'] ?? null;
$nuevo = $b['nuevo'] ?? null;
if (!esPinValido($nuevo)) {
    responder(400, ['error' => 'El PIN nuevo tiene que tener entre 4 y 8 números, sin letras, espacios ni símbolos.', 'errores' => ['nuevo' => 'Solo números, de 4 a 8 cifras.']]);
}
if ($nuevo === $actual) {
    responder(400, ['error' => 'El PIN nuevo tiene que ser distinto del actual.', 'errores' => ['nuevo' => 'Tiene que ser distinto del actual.']]);
}

try {
    if (!pinCorrecto($actual)) {
        responder(400, ['error' => 'El PIN actual no es correcto.', 'errores' => ['actual' => 'No es el PIN actual.']]);
    }
    q('UPDATE ajustes SET valor = ? WHERE clave = ?', [cifrarPin($nuevo), CLAVE_PIN]);
    responder(200, ['ok' => true]);
} catch (Throwable $e) {
    error_log('pin: ' . $e->getMessage());
    responder(500, ['error' => 'No se pudo cambiar el PIN.']);
}
