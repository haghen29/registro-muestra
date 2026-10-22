-- Actualiza una base creada con la versión 1 (sin perder registros).
-- Agrega: edición/eliminación, detector de registros sospechosos y fusiones.
-- Ejecutar como root:  source C:/ruta/al/proyecto/migracion-v2.sql

USE muestra_tec4;

ALTER TABLE visitantes
  ADD COLUMN IF NOT EXISTS alerta       VARCHAR(160) NULL AFTER parentesco,
  ADD COLUMN IF NOT EXISTS eliminado    TINYINT(1)   NOT NULL DEFAULT 0 AFTER ingreso_at,
  ADD COLUMN IF NOT EXISTS fusionado_en INT UNSIGNED NULL AFTER eliminado;

CREATE TABLE IF NOT EXISTS fusiones (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  tipo        ENUM('visitante','alumno') NOT NULL,
  resumen     VARCHAR(255) NOT NULL,
  datos       LONGTEXT     NOT NULL,
  creada_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  deshecha_at DATETIME(3)  NULL,
  PRIMARY KEY (id),
  KEY idx_creada (creada_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS alumno_alias (
  alias_norm VARCHAR(120) NOT NULL,
  nombre     VARCHAR(120) NOT NULL,
  fusion_id  INT UNSIGNED NOT NULL,
  activo     TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (alias_norm)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- El usuario de la app ahora necesita permisos sobre las tablas nuevas.
-- Cambiá 'localhost' por '%' si la base está en un servidor al que entra Vercel.
GRANT SELECT, INSERT, UPDATE ON muestra_tec4.* TO 'muestra_user'@'localhost';
FLUSH PRIVILEGES;
