-- Actualiza una base de la versión 5 (sin perder registros).
-- Agrega la tabla del límite de registros por IP del formulario público (antiabuso):
-- si una misma IP manda demasiados registros seguidos (un script), recibe 429.
-- Ejecutar como root:  source C:/ruta/al/proyecto/migracion-v6.sql

USE muestra_tec4;

CREATE TABLE IF NOT EXISTS limite_registro (
  ip          VARCHAR(45)  NOT NULL,
  min_inicio  DATETIME     NOT NULL,
  min_n       INT UNSIGNED NOT NULL DEFAULT 0,
  hora_inicio DATETIME     NOT NULL,
  hora_n      INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (ip)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
