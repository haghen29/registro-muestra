-- Base de datos de la Muestra Educativa - E.E.S.T. N°4 Berazategui
-- Instalación desde cero. Si ya tenías la base creada, no ejecutes este archivo:
-- usá migracion-v2.sql (si es de la versión 1) y después migracion-v3.sql.

CREATE DATABASE IF NOT EXISTS muestra_tec4
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE muestra_tec4;

CREATE TABLE IF NOT EXISTS visitantes (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre        VARCHAR(80)  NOT NULL,
  apellido      VARCHAR(80)  NOT NULL,
  dni           VARCHAR(12)  NOT NULL,
  con_alumno    TINYINT(1)   NOT NULL DEFAULT 0,
  alumno_nombre VARCHAR(120) NULL,
  curso         TINYINT UNSIGNED NULL,      -- año del alumno (1 a 7)
  division      TINYINT UNSIGNED NULL,      -- división del alumno
  parentesco   VARCHAR(30)  NULL,
  alerta        VARCHAR(160) NULL,          -- motivos del detector de registros sospechosos
  ingresado     TINYINT(1)   NOT NULL DEFAULT 0,
  ingreso_at    DATETIME(3)  NULL,
  eliminado     TINYINT(1)   NOT NULL DEFAULT 0,  -- borrado lógico (se puede recuperar)
  fusionado_en  INT UNSIGNED NULL,          -- si se fusionó, id del registro que quedó
  created_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_dni (dni),
  KEY idx_apellido (apellido),
  KEY idx_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Historial de fusiones (guarda el estado anterior para poder deshacer)
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

-- Otras formas de escribir a un alumno ya fusionado ("tomi fernandez" -> "Tomás Fernández").
-- Los registros nuevos con un alias quedan agrupados solos.
CREATE TABLE IF NOT EXISTS alumno_alias (
  alias_norm VARCHAR(120) NOT NULL,
  nombre     VARCHAR(120) NOT NULL,
  fusion_id  INT UNSIGNED NOT NULL,
  activo     TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (alias_norm)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Usuario de la app con permisos mínimos (no puede borrar nada).
-- En tu PC (XAMPP) usá 'localhost'; en un servidor al que entra Vercel, usá '%'.
-- CREATE USER 'muestra_user'@'localhost' IDENTIFIED BY 'test1234';
-- GRANT SELECT, INSERT, UPDATE ON muestra_tec4.* TO 'muestra_user'@'localhost';
-- FLUSH PRIVILEGES;
