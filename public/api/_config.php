<?php
// Configuración de la app.
//
// Este archivo trae los valores para probar en la compu con XAMPP y NO tiene
// contraseñas reales. Los datos del servidor del colegio van en _config.local.php
// (copiá _config.local.example.php con ese nombre y completalo). Ese archivo no se
// sube a GitHub (.gitignore) ni se puede abrir desde el navegador (.htaccess).
//
// También se pueden pasar como variables de entorno del servidor (DB_HOST, DB_PASSWORD, etc.),
// que tienen prioridad sobre los dos archivos.

$cfg = [
    'DB_HOST' => '127.0.0.1',
    'DB_PORT' => 3306,
    'DB_USER' => 'muestra_user',
    'DB_PASSWORD' => 'test1234',     // la de XAMPP del README; en el servidor va otra
    'DB_NAME' => 'muestra_tec4',
    'ADMIN_PIN' => '1111',           // PIN inicial (solo números, 4 a 8). Después se cambia desde el panel
    'DETECTOR_TROLL' => 'on',        // detector de registros sospechosos: 'on' u 'off'
];

$local = __DIR__ . '/_config.local.php';
if (is_file($local)) {
    $extra = require $local;
    if (is_array($extra)) $cfg = array_merge($cfg, array_intersect_key($extra, $cfg));
}

foreach ($cfg as $clave => $valor) {
    $env = getenv($clave);
    $valor = $env !== false && $env !== '' ? $env : $valor;
    define($clave, $clave === 'DB_PORT' ? (int) $valor : (string) $valor);
}
