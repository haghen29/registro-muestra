-- Actualiza una base de la versión 4 (sin perder registros).
-- Antes el DNI era único: no podía haber dos registros con el mismo DNI.
-- Ahora lo único es DNI + nombre + apellido:
--   - mismo DNI, nombre y apellido  -> es la misma persona (se le muestra su entrada)
--   - mismo DNI con otro nombre      -> se guarda como otra persona
-- La comparación ignora mayúsculas y tildes (colación utf8mb4_unicode_ci):
-- "José Pérez" y "jose perez" cuentan como la misma persona.
-- Ejecutar como root:  source C:/ruta/al/proyecto/migracion-v5.sql

USE muestra_tec4;

ALTER TABLE visitantes
  DROP INDEX IF EXISTS uq_dni,
  ADD UNIQUE KEY IF NOT EXISTS uq_persona (dni, nombre, apellido),
  ADD KEY IF NOT EXISTS idx_dni (dni);
