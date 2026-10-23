<?php
// Datos del servidor del colegio.
// 1. Copiá este archivo con el nombre _config.local.php (en esta misma carpeta).
// 2. Completá los valores. Solo hace falta poner los que cambian respecto de _config.php.
// _config.local.php no se sube a GitHub y el .htaccess impide abrirlo desde el navegador.

return [
    'DB_HOST' => 'localhost',               // o la IP/nombre del servidor de MariaDB
    'DB_PORT' => 3306,
    'DB_USER' => 'muestra_user',
    'DB_PASSWORD' => 'una-contraseña-larga-y-segura',
    'DB_NAME' => 'muestra_tec4',
    'ADMIN_PIN' => '1111',                  // PIN inicial; cambialo desde el panel antes del evento
];
