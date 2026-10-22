-- Actualiza una base de la versión 2 (sin perder registros).
-- Agrega el curso y la división del alumno al que vienen a ver.
-- Ejecutar como root:  source C:/ruta/al/proyecto/migracion-v3.sql
-- Si la base es de la versión 1, ejecutá antes migracion-v2.sql.

USE muestra_tec4;

ALTER TABLE visitantes
  ADD COLUMN IF NOT EXISTS curso    TINYINT UNSIGNED NULL AFTER alumno_nombre,
  ADD COLUMN IF NOT EXISTS division TINYINT UNSIGNED NULL AFTER curso;
