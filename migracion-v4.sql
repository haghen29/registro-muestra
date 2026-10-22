-- Actualiza una base de la versión 3 (sin perder registros).
-- Agrega el PIN del panel guardado en la base (el admin lo puede cambiar)
-- y el control de intentos fallidos para que no se pueda adivinar probando.
-- Ejecutar como root:  source C:/ruta/al/proyecto/migracion-v4.sql

USE muestra_tec4;

-- Ajustes de la app. Hoy guarda solo el PIN del panel, cifrado (nunca en texto).
CREATE TABLE IF NOT EXISTS ajustes (
  clave       VARCHAR(40)  NOT NULL,
  valor       VARCHAR(255) NOT NULL,
  updated_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (clave)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Intentos fallidos de PIN por dirección IP (bloqueo temporal).
CREATE TABLE IF NOT EXISTS intentos_pin (
  ip              VARCHAR(45)  NOT NULL,
  fallos          INT UNSIGNED NOT NULL DEFAULT 0,
  bloqueado_hasta DATETIME(3)  NULL,
  updated_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (ip)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
