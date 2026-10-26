---
name: seguridad-base-mariadb
description: Seguridad de la base MariaDB/MySQL de una app de registro de visitantes con datos personales (DNI, nombres de menores). Usar al crear usuarios o permisos, escribir migraciones, configurar el servidor de base, hacer o restaurar backups, borrar datos después de un evento, o revisar consultas SQL.
---

# Seguridad de la base de datos (MariaDB)

Actuás como DBA con foco en seguridad y privacidad.

## Reglas

1. **Mínimo privilegio.** La app usa un usuario propio (`muestra_user`) con solo `SELECT, INSERT, UPDATE` sobre su base. Nunca `root`, nunca `ALL PRIVILEGES`, nunca `GRANT OPTION`. Las migraciones las corre un administrador como root.
2. **Host acotado.** El usuario se crea para `'localhost'` si la app y la base están en el mismo servidor. Si no, para la IP concreta del servidor web, nunca `'%'` salvo que no haya alternativa.
3. **Sin acceso desde internet.** `bind-address = 127.0.0.1` (o la IP interna) y el puerto 3306 cerrado en el firewall.
4. **Contraseñas fuertes** (16+ caracteres) y fuera del repositorio (`_config.local.php` o variables de entorno).
5. **Consultas con parámetros siempre** (PDO `prepare` + `?`, `ATTR_EMULATE_PREPARES = false`). Si algo variable va en el SQL (nombre de columna, intervalo), sale de una constante del código.
6. **Restricciones en la base, no solo en el código:** claves únicas (`uq_persona (dni, nombre, apellido)`), `NOT NULL`, tamaños de columna acotados, colación `utf8mb4_unicode_ci`.
7. **Transacciones** para operaciones de varios pasos (fusiones, registros), así no quedan datos a medias.
8. **Borrado lógico** (`eliminado = 1`) para poder auditar y recuperar; el borrado definitivo es una tarea aparte, al terminar el evento.

## Backups
- Antes y después del evento: `mysqldump --single-transaction muestra_tec4 > backup.sql`.
- Guardarlos cifrados (por ejemplo, zip con contraseña o `gpg`) y fuera de la carpeta web.
- Probar que se pueden restaurar.
- Borrarlos cuando ya no hagan falta (ver protección de datos).

## Después del evento
- Exportar lo que se necesite (estadísticas sin DNI).
- Vaciar las tablas con datos personales (`visitantes`, `fusiones`, `alumno_alias`) o anonimizar (`UPDATE visitantes SET dni = NULL, nombre = 'Anónimo'...`).
- Cambiar o bloquear la contraseña de `muestra_user` si la app queda fuera de uso.

## Cómo revisar
1. `SHOW GRANTS FOR 'muestra_user'@'localhost';` → solo SELECT, INSERT, UPDATE.
2. `SELECT user, host FROM mysql.user;` → nada con `'%'` innecesario ni usuarios sin contraseña.
3. Desde otra máquina, `nc -zv servidor 3306` → tiene que estar cerrado.
4. Buscar en el código `query(` / `exec(` con variables concatenadas.
