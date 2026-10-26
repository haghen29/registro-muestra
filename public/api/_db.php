<?php
// Conexión a MariaDB, respuestas JSON y utilidades comunes de la API.
require_once __DIR__ . '/_config.php';

// Error con código HTTP: se responde tal cual al navegador.
class HttpError extends Exception
{
    public $http;
    public function __construct($http, $mensaje)
    {
        parent::__construct($mensaje);
        $this->http = $http;
    }
}

function db()
{
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER,
            DB_PASSWORD,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_FOUND_ROWS => true,   // filas encontradas, no solo las que cambiaron
                // Si la base no responde, cortar a los 30 s con un error claro en vez de dejar el
                // pedido colgado (en un hosting gratis, los pedidos colgados se juntan y tiran 503)
                PDO::ATTR_TIMEOUT => 30, // alcanza para el arranque lento de un hosting gratis
            ]
        );
        asegurarEsquema($pdo);
    }
    return $pdo;
}

// Crea las tablas y columnas que falten, si el usuario de la base tiene permiso para
// hacerlo (CREATE y ALTER). Si no lo tiene, se usan schema.sql y las migraciones como root. Solo corre la primera vez: después deja
// el archivo _esquema-v6.ok (que no se puede abrir desde el navegador) y no vuelve a revisar.
// Para forzar que revise de nuevo, borrá ese archivo. (Si hay _esquema-v4.ok o v5.ok viejos, se pueden borrar.)
function asegurarEsquema($pdo)
{
    $marca = __DIR__ . '/_esquema-v6.ok';
    if (is_file($marca)) return;

    $tablas = [
        'visitantes' => "CREATE TABLE IF NOT EXISTS visitantes (
           id INT UNSIGNED NOT NULL AUTO_INCREMENT,
           nombre VARCHAR(80) NOT NULL, apellido VARCHAR(80) NOT NULL, dni VARCHAR(12) NOT NULL,
           con_alumno TINYINT(1) NOT NULL DEFAULT 0, alumno_nombre VARCHAR(120) NULL,
           curso TINYINT UNSIGNED NULL, division TINYINT UNSIGNED NULL, parentesco VARCHAR(30) NULL,
           alerta VARCHAR(160) NULL, ingresado TINYINT(1) NOT NULL DEFAULT 0, ingreso_at DATETIME(3) NULL,
           eliminado TINYINT(1) NOT NULL DEFAULT 0, fusionado_en INT UNSIGNED NULL,
           created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
           updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
           PRIMARY KEY (id), UNIQUE KEY uq_persona (dni, nombre, apellido), KEY idx_dni (dni),
           KEY idx_apellido (apellido), KEY idx_updated (updated_at)
         ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        'fusiones' => "CREATE TABLE IF NOT EXISTS fusiones (
           id INT UNSIGNED NOT NULL AUTO_INCREMENT, tipo ENUM('visitante','alumno') NOT NULL,
           resumen VARCHAR(255) NOT NULL, datos LONGTEXT NOT NULL,
           creada_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), deshecha_at DATETIME(3) NULL,
           PRIMARY KEY (id), KEY idx_creada (creada_at)
         ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        'alumno_alias' => "CREATE TABLE IF NOT EXISTS alumno_alias (
           alias_norm VARCHAR(120) NOT NULL, nombre VARCHAR(120) NOT NULL,
           fusion_id INT UNSIGNED NOT NULL, activo TINYINT(1) NOT NULL DEFAULT 1, PRIMARY KEY (alias_norm)
         ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        'ajustes' => "CREATE TABLE IF NOT EXISTS ajustes (
           clave VARCHAR(40) NOT NULL, valor VARCHAR(255) NOT NULL,
           updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
           PRIMARY KEY (clave)
         ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        'intentos_pin' => "CREATE TABLE IF NOT EXISTS intentos_pin (
           ip VARCHAR(45) NOT NULL, fallos INT UNSIGNED NOT NULL DEFAULT 0, bloqueado_hasta DATETIME(3) NULL,
           updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
           PRIMARY KEY (ip)
         ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        'limite_registro' => "CREATE TABLE IF NOT EXISTS limite_registro (
           ip VARCHAR(45) NOT NULL,
           min_inicio DATETIME NOT NULL, min_n INT UNSIGNED NOT NULL DEFAULT 0,
           hora_inicio DATETIME NOT NULL, hora_n INT UNSIGNED NOT NULL DEFAULT 0,
           PRIMARY KEY (ip)
         ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    ];
    // Columnas agregadas en versiones posteriores (para bases creadas antes)
    $columnas = [
        'alerta' => 'VARCHAR(160) NULL AFTER parentesco',
        'eliminado' => 'TINYINT(1) NOT NULL DEFAULT 0 AFTER ingreso_at',
        'fusionado_en' => 'INT UNSIGNED NULL AFTER eliminado',
        'curso' => 'TINYINT UNSIGNED NULL AFTER alumno_nombre',
        'division' => 'TINYINT UNSIGNED NULL AFTER curso',
    ];
    try {
        // Solo se crea lo que falta (así no hace falta permiso de CREATE si ya está todo)
        $existen = $pdo->query(
            'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()'
        )->fetchAll(PDO::FETCH_COLUMN);
        foreach ($tablas as $nombre => $sql) {
            if (!in_array($nombre, $existen, true)) $pdo->exec($sql);
        }
        $hay = $pdo->query(
            "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'visitantes'"
        )->fetchAll(PDO::FETCH_COLUMN);
        foreach ($columnas as $col => $def) {
            if (!in_array($col, $hay, true)) $pdo->exec("ALTER TABLE visitantes ADD COLUMN $col $def");
        }
        // Versión 5: una persona es DNI + nombre + apellido (antes el DNI era único).
        // Primero se agrega la clave nueva y después se saca la vieja, así nunca queda sin control.
        $indices = $pdo->query(
            "SELECT DISTINCT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'visitantes'"
        )->fetchAll(PDO::FETCH_COLUMN);
        if (!in_array('uq_persona', $indices, true)) $pdo->exec('ALTER TABLE visitantes ADD UNIQUE KEY uq_persona (dni, nombre, apellido)');
        if (!in_array('idx_dni', $indices, true)) $pdo->exec('ALTER TABLE visitantes ADD KEY idx_dni (dni)');
        if (in_array('uq_dni', $indices, true)) $pdo->exec('ALTER TABLE visitantes DROP INDEX uq_dni');
        @file_put_contents($marca, date('c') . "\n");
    } catch (PDOException $e) {
        // Si el usuario de la base no tiene permiso (por ejemplo en la compu), se sigue igual:
        // si falta algo, las consultas van a fallar con un error claro en el log.
        error_log('asegurarEsquema: ' . $e->getMessage());
    }
}

// Ejecuta una consulta con parámetros y devuelve el statement.
function q($sql, $params = [])
{
    $st = db()->prepare($sql);
    $st->execute($params);
    return $st;
}

// Ejecuta $fn dentro de una transacción: si algo falla, no se guarda nada.
function transaccion($fn)
{
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $r = $fn();
        $pdo->commit();
        return $r;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

function esDuplicado($e)
{
    return $e instanceof PDOException && isset($e->errorInfo[1]) && (int) $e->errorInfo[1] === 1062;
}

function responder($status, $data)
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// Cuerpo JSON del pedido como array. Si no es un objeto JSON válido ({...}),
// responde 400: texto suelto, JSON roto o un array no se aceptan.
// Exige Content-Type: application/json (si no, 415). Así una página ajena no puede mandar
// pedidos desde el navegador de un visitante con un <form> común (text/plain o form-data).
function cuerpo()
{
    if (stripos((string) ($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json') !== 0) {
        responder(415, ['error' => 'El pedido tiene que ser JSON (Content-Type: application/json).']);
    }
    $raw = file_get_contents('php://input', false, null, 0, 65536);
    $obj = json_decode($raw === false ? '' : $raw);
    if (!($obj instanceof stdClass)) responder(400, ['error' => 'El pedido tiene que ser un objeto JSON válido.']);
    return json_decode($raw, true) ?: [];
}

const SELECT_VISITANTE = "
  SELECT id, nombre, apellido, dni, con_alumno, alumno_nombre, curso, division, parentesco, alerta,
         ingresado, eliminado, fusionado_en,
         FLOOR(UNIX_TIMESTAMP(created_at) * 1000) AS created_ms,
         FLOOR(UNIX_TIMESTAMP(ingreso_at) * 1000) AS ingreso_ms
  FROM visitantes";

function aVisitante($r)
{
    return [
        'id' => (int) $r['id'],
        'nombre' => $r['nombre'],
        'apellido' => $r['apellido'],
        'dni' => $r['dni'],
        'conAlumno' => (bool) (int) $r['con_alumno'],
        'alumno' => $r['alumno_nombre'] ?: null,
        'curso' => $r['curso'] === null ? null : (int) $r['curso'],
        'division' => $r['division'] === null ? null : (int) $r['division'],
        'parentesco' => $r['parentesco'] ?: null,
        'alerta' => $r['alerta'] ?: null,
        'ingresado' => (bool) (int) $r['ingresado'],
        'eliminado' => (bool) (int) $r['eliminado'],
        'fusionadoEn' => $r['fusionado_en'] === null ? null : (int) $r['fusionado_en'],
        'createdMs' => $r['created_ms'] === null ? null : (int) $r['created_ms'],
        'ingresoMs' => $r['ingreso_ms'] === null ? null : (int) $r['ingreso_ms'],
    ];
}

function leerVisitante($id)
{
    $r = q(SELECT_VISITANTE . ' WHERE id = ?', [$id])->fetch();
    return $r ? aVisitante($r) : null;
}
