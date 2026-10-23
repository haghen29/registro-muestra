<?php
// Configuración. Es lo único que hay que editar antes de subir a InfinityFree.
//
// Se elige sola según dónde corre: en tu compu (localhost) usa la MariaDB de XAMPP;
// en cualquier otro dominio usa los datos de InfinityFree.
// Los datos de InfinityFree están en el panel: Accounts → tu cuenta → MySQL Databases.

$esLocal = in_array($_SERVER['SERVER_NAME'] ?? '', ['localhost', '127.0.0.1', '::1'], true);

if ($esLocal) {
    define('DB_HOST', '127.0.0.1');
    define('DB_PORT', 3306);
    define('DB_USER', 'muestra_user');
    define('DB_PASSWORD', 'test1234');
    define('DB_NAME', 'muestra_tec4');
    define('ADMIN_PIN', '1111');                 // PIN inicial (solo números, 4 a 8). Después se cambia desde el panel
} else {
    define('DB_HOST', 'sqlXXX.infinityfree.com');   // "MySQL Host Name"
    define('DB_PORT', 3306);
    define('DB_USER', 'if0_XXXXXXXX');              // "MySQL User Name"
    define('DB_PASSWORD', 'CAMBIAR');               // la contraseña de la cuenta (vPanel)
    define('DB_NAME', 'if0_XXXXXXXX_muestra');      // "MySQL DB Name"
    define('ADMIN_PIN', '1111');                 // PIN inicial (solo números, 4 a 8). Después se cambia desde el panel
}

// Detector de registros sospechosos: 'on' u 'off'
define('DETECTOR_TROLL', 'on');
