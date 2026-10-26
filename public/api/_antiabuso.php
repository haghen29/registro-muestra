<?php
// Defensas del formulario público contra registros masivos (scripts, bots).
//
// Están pensadas para no demorar a la gente real:
// - Campo trampa: un campo oculto ("web") que una persona nunca ve ni completa. Si viene con
//   algo, es un bot: se le contesta como si se hubiera registrado, pero no se guarda nada.
// - Tiempo de llenado: el formulario manda cuántos ms pasaron desde que se abrió ("t"). Si es
//   menos de TIEMPO_MIN_MS, o no viene, se registra igual pero queda "A revisar" (el autocompletar
//   del celular puede llenar todo muy rápido, así que no se bloquea).
// - Límite por IP: LIMITE_MINUTO registros por minuto y LIMITE_HORA por hora. Es alto a propósito,
//   porque en la muestra mucha gente comparte el Wi-Fi de la escuela (misma IP pública).
// Si el control falla (por ejemplo, falta la tabla), el registro pasa igual: la seguridad nunca
// deja a nadie afuera en la puerta. El error queda en el log del servidor.
require_once __DIR__ . '/_auth.php';

const LIMITE_MINUTO = 60;
const LIMITE_HORA = 600;
const TIEMPO_MIN_MS = 2000;

// true si el campo trampa vino completado
function esBot($b)
{
    $web = $b['web'] ?? '';
    return !is_string($web) || $web !== '';
}

// Motivo para "A revisar" si el envío fue demasiado rápido o no vino del formulario, o null
function motivoTiempo($b)
{
    $t = $b['t'] ?? null;
    if (!is_int($t)) return 'Enviado sin usar el formulario';
    if ($t < TIEMPO_MIN_MS) return 'Formulario completado en menos de 2 segundos';
    return null;
}

// Cuenta este pedido para la IP y responde 429 si pasó el límite. Una sola consulta de escritura
// más una lectura, en la misma conexión que después usa el registro.
function controlarLimite()
{
    $ip = ipCliente();
    try {
        // Las asignaciones se aplican en orden: cada contador se reinicia mirando el inicio
        // de su ventana ANTES de que se actualice en la línea siguiente.
        q(
            'INSERT INTO limite_registro (ip, min_inicio, min_n, hora_inicio, hora_n) VALUES (?, NOW(), 1, NOW(), 1)
             ON DUPLICATE KEY UPDATE
               min_n = IF(min_inicio <= NOW() - INTERVAL 1 MINUTE, 1, min_n + 1),
               min_inicio = IF(min_inicio <= NOW() - INTERVAL 1 MINUTE, NOW(), min_inicio),
               hora_n = IF(hora_inicio <= NOW() - INTERVAL 1 HOUR, 1, hora_n + 1),
               hora_inicio = IF(hora_inicio <= NOW() - INTERVAL 1 HOUR, NOW(), hora_inicio)',
            [$ip]
        );
        $c = q(
            'SELECT min_n, hora_n,
                    TIMESTAMPDIFF(SECOND, NOW(), min_inicio + INTERVAL 1 MINUTE) AS seg_min,
                    TIMESTAMPDIFF(SECOND, NOW(), hora_inicio + INTERVAL 1 HOUR) AS seg_hora
               FROM limite_registro WHERE ip = ?',
            [$ip]
        )->fetch();
    } catch (PDOException $e) {
        error_log('antiabuso: ' . $e->getMessage());
        return;
    }
    if (!$c) return;
    $seg = null;
    if ((int) $c['hora_n'] > LIMITE_HORA) $seg = max(1, (int) $c['seg_hora']);
    elseif ((int) $c['min_n'] > LIMITE_MINUTO) $seg = max(1, (int) $c['seg_min']);
    if ($seg === null) return;
    header('Retry-After: ' . $seg);
    responder(429, ['error' => 'Hay demasiados registros seguidos desde esta conexión. Esperá un minuto y tocá Registrarme otra vez.']);
}
