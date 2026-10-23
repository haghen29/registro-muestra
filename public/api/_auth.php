<?php
// PIN del panel de recepción.
//
// - El PIN se guarda en la tabla `ajustes` cifrado con password_hash (bcrypt, con sal):
//   en la base nunca queda en texto. Si todavía no hay ninguno, vale ADMIN_PIN de la
//   configuración (_config.php / _config.local.php, 1111). El admin lo cambia desde el panel.
//   Se guarda con la clave 'admin_pin_php' (la versión anterior en Node usaba 'admin_pin',
//   con otro cifrado; esa fila, si existe, se ignora).
// - Solo números, de 4 a 8 cifras. Cualquier otra cosa se rechaza.
// - Después de MAX_FALLOS intentos fallidos desde la misma IP, esa IP queda
//   bloqueada BLOQUEO_SEG segundos, así no se puede adivinar probando todos.
require_once __DIR__ . '/_db.php';
require_once __DIR__ . '/_validar.php';

const CLAVE_PIN = 'admin_pin_php';
const MAX_FALLOS = 5;
const BLOQUEO_SEG = 120;
const VENTANA_MIN = 10; // los fallos se cuentan dentro de esta ventana

function esPinValido($pin)
{
    return is_string($pin) && preg_match('/^\d{4,8}$/', $pin) === 1;
}

// Costo 8: suficiente para un PIN y liviano, porque el panel consulta cada 2 segundos
function cifrarPin($pin)
{
    return password_hash($pin, PASSWORD_BCRYPT, ['cost' => 8]);
}

// Lee el PIN cifrado; la primera vez guarda el inicial de la configuración.
function pinGuardado()
{
    $v = q('SELECT valor FROM ajustes WHERE clave = ?', [CLAVE_PIN])->fetchColumn();
    if ($v !== false) return $v;
    $inicial = esPinValido(ADMIN_PIN) ? ADMIN_PIN : '1111';
    q('INSERT IGNORE INTO ajustes (clave, valor) VALUES (?, ?)', [CLAVE_PIN, cifrarPin($inicial)]);
    return q('SELECT valor FROM ajustes WHERE clave = ?', [CLAVE_PIN])->fetchColumn();
}

function pinCorrecto($pin)
{
    return esPinValido($pin) && password_verify($pin, pinGuardado());
}

// REMOTE_ADDR es la IP que ve el servidor. No se usa X-Forwarded-For porque el cliente la puede inventar.
function ipCliente()
{
    return substr((string) ($_SERVER['REMOTE_ADDR'] ?? 'desconocida'), 0, 45);
}

function registrarFallo($ip)
{
    // MariaDB/MySQL aplican las asignaciones en orden: bloqueado_hasta ya ve el nuevo valor de fallos
    q(
        'INSERT INTO intentos_pin (ip, fallos, bloqueado_hasta) VALUES (?, 1, NULL)
         ON DUPLICATE KEY UPDATE
           fallos = IF(updated_at < NOW(3) - INTERVAL ' . VENTANA_MIN . ' MINUTE, 1, fallos + 1),
           bloqueado_hasta = IF(fallos >= ' . MAX_FALLOS . ', NOW(3) + INTERVAL ' . BLOQUEO_SEG . ' SECOND, NULL)',
        [$ip]
    );
}

// Corta el pedido si el PIN del header x-admin-pin no es el correcto.
function requireAdmin()
{
    $ip = ipCliente();
    try {
        $bloq = q(
            'SELECT fallos, CEIL(TIMESTAMPDIFF(MICROSECOND, NOW(3), bloqueado_hasta) / 1000000) AS seg FROM intentos_pin WHERE ip = ?',
            [$ip]
        )->fetch();
        if ($bloq && (int) $bloq['seg'] > 0) {
            header('Retry-After: ' . (int) $bloq['seg']);
            responder(429, ['error' => 'Demasiados intentos con PIN incorrecto. Esperá ' . (int) ceil($bloq['seg'] / 60) . ' minuto(s) y probá de nuevo.']);
        }
        if (!pinCorrecto($_SERVER['HTTP_X_ADMIN_PIN'] ?? null)) {
            registrarFallo($ip);
            responder(401, ['error' => 'PIN incorrecto.']);
        }
        if ($bloq && (int) $bloq['fallos'] > 0) {
            q('UPDATE intentos_pin SET fallos = 0, bloqueado_hasta = NULL WHERE ip = ?', [$ip]);
        }
    } catch (PDOException $e) {
        error_log('auth: ' . $e->getMessage());
        responder(500, ['error' => 'No se pudo verificar el PIN.']);
    }
}

// Corta el pedido si el método HTTP no es el esperado.
function soloMetodo($metodo)
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') === $metodo) return;
    header('Allow: ' . $metodo);
    responder(405, ['error' => 'Método no permitido.']);
}
