<?php
// POST /api/fusionar
//
// Visitantes repetidos (la misma persona registrada dos veces):
//   { tipo: 'visitante', principalId, otroId,
//     elegir: { nombre: 'a'|'b', apellido: 'a'|'b', dni: 'a'|'b', visita: 'a'|'b' } }
//   Queda el registro principal con los datos elegidos; el otro se oculta
//   y queda unido al principal. Si cualquiera de los dos ya había ingresado,
//   el resultado figura como ingresado.
//
// Alumnos repetidos (el mismo alumno escrito de distintas formas):
//   { tipo: 'alumno', nombres: ['Tomi Fernandez', 'Tomás Fernández'], nombreFinal: 'Tomás Fernández' }
//   Todos los familiares de esos nombres pasan a acompañar al mismo alumno.
//   Los registros nuevos que escriban cualquiera de esos nombres se agrupan solos.
//
// Todo queda en la tabla `fusiones` y se puede deshacer desde /api/fusiones.
require_once __DIR__ . '/_auth.php';
require_once __DIR__ . '/_troll.php';

const COLS = 'id, nombre, apellido, dni, con_alumno, alumno_nombre, curso, division, parentesco, alerta, ingresado, ingreso_at, eliminado';

function fusionarVisitantes($b)
{
    $aId = idDe($b['principalId'] ?? null);
    $bId = idDe($b['otroId'] ?? null);
    $el = is_array($b['elegir'] ?? null) ? $b['elegir'] : [];
    if (!$aId || !$bId || $aId === $bId) throw new HttpError(400, 'Elegí dos registros distintos.');
    foreach (['nombre', 'apellido', 'dni', 'visita'] as $k) {
        if (($el[$k] ?? null) !== 'a' && ($el[$k] ?? null) !== 'b') throw new HttpError(400, 'Falta elegir qué dato queda.');
    }

    $A = $B = null;
    foreach (q('SELECT ' . COLS . ' FROM visitantes WHERE id IN (?, ?) FOR UPDATE', [$aId, $bId])->fetchAll() as $r) {
        if ((int) $r['id'] === $aId) $A = $r;
        if ((int) $r['id'] === $bId) $B = $r;
    }
    if (!$A || !$B || (int) $A['eliminado'] || (int) $B['eliminado']) {
        throw new HttpError(409, 'Uno de los registros ya no existe. Actualizá el panel.');
    }

    $de = function ($k) use ($el, $A, $B) { return $el[$k] === 'a' ? $A : $B; };
    $visita = $de('visita');
    $final = [
        'nombre' => $de('nombre')['nombre'],
        'apellido' => $de('apellido')['apellido'],
        'dni' => $de('dni')['dni'],
        'con_alumno' => $visita['con_alumno'],
        'alumno_nombre' => $visita['alumno_nombre'],
        'curso' => $visita['curso'],
        'division' => $visita['division'],
        'parentesco' => $visita['parentesco'],
    ];
    $ingresos = array_values(array_filter([$A, $B], function ($r) { return (int) $r['ingresado']; }));
    $fechas = array_values(array_filter(array_column($ingresos, 'ingreso_at')));
    sort($fechas);
    $ingresoAt = $fechas[0] ?? null;
    $ingresado = $ingresos ? 1 : 0;
    $alerta = analizar(array_merge($final, ['alumno' => $final['alumno_nombre']]));

    // 1) Liberar el DNI del registro que se oculta (el DNI es único)
    q('UPDATE visitantes SET eliminado = 1, fusionado_en = ?, dni = ? WHERE id = ?', [$aId, "F$bId", $bId]);
    // 2) Guardar los datos elegidos en el registro principal
    q(
        'UPDATE visitantes
            SET nombre = ?, apellido = ?, dni = ?, con_alumno = ?, alumno_nombre = ?, curso = ?, division = ?,
                parentesco = ?, alerta = ?, ingresado = ?, ingreso_at = ?
          WHERE id = ?',
        [$final['nombre'], $final['apellido'], $final['dni'], $final['con_alumno'], $final['alumno_nombre'],
         $final['curso'], $final['division'], $final['parentesco'], $alerta, $ingresado, $ingresoAt, $aId]
    );

    $resumen = "Visitantes: {$A['apellido']}, {$A['nombre']} (#$aId) + {$B['apellido']}, {$B['nombre']} (#$bId) → {$final['apellido']}, {$final['nombre']}";
    q('INSERT INTO fusiones (tipo, resumen, datos) VALUES (?, ?, ?)', [
        'visitante', mb_substr($resumen, 0, 255), json_encode([
            'principalId' => $aId, 'otroId' => $bId, 'antes' => ['a' => $A, 'b' => $B],
            'despues' => ['ingresado' => $ingresado, 'ingreso_at' => $ingresoAt],
        ], JSON_UNESCAPED_UNICODE),
    ]);
    return ['fusionId' => (int) db()->lastInsertId(), 'resumen' => $resumen, 'visitante' => leerVisitante($aId)];
}

function fusionarAlumnos($b)
{
    // Los nombres a unir solo se usan para buscar (comparados normalizados); el final se guarda y se valida
    $lista = is_array($b['nombres'] ?? null) ? array_slice($b['nombres'], 0, 50) : [];
    $nombres = array_values(array_unique(array_filter(array_map(function ($n) { return limpiar($n, 120); }, $lista), 'strlen')));
    $nombreFinal = limpiar($b['nombreFinal'] ?? null, 1000);
    if (count($nombres) < 2) throw new HttpError(400, 'Elegí al menos dos alumnos para fusionar.');
    if (mb_strlen($nombreFinal) < 2) throw new HttpError(400, 'Escribí cómo se llama el alumno.');
    if ($err = errorNombre($nombreFinal, 120, 'El nombre del alumno')) throw new HttpError(400, $err);

    $claves = array_values(array_unique(array_map('norm', $nombres)));
    $rows = db()->query('SELECT id, alumno_nombre FROM visitantes WHERE eliminado = 0 AND con_alumno = 1 FOR UPDATE')->fetchAll();
    $afectados = array_values(array_filter($rows, function ($r) use ($claves) { return in_array(norm($r['alumno_nombre']), $claves, true); }));
    if (!$afectados) throw new HttpError(409, 'No hay familiares con esos alumnos. Actualizá el panel.');

    // Registrar los alias (cómo lo escribieron) para agrupar registros futuros
    $aliasAntes = [];
    foreach (array_values(array_unique(array_merge($claves, [norm($nombreFinal)]))) as $clave) {
        $prev = q('SELECT alias_norm, nombre, fusion_id, activo FROM alumno_alias WHERE alias_norm = ?', [$clave])->fetch();
        $aliasAntes[] = ['clave' => $clave, 'prev' => $prev ?: null];
    }

    $n = count($afectados);
    $resumen = 'Alumno: ' . implode(' + ', $nombres) . " → $nombreFinal ($n familiar" . ($n === 1 ? '' : 'es') . ')';
    q('INSERT INTO fusiones (tipo, resumen, datos) VALUES (?, ?, ?)', [
        'alumno', mb_substr($resumen, 0, 255), json_encode([
            'nombreFinal' => $nombreFinal,
            'familiares' => array_map(function ($r) { return ['id' => (int) $r['id'], 'alumno' => $r['alumno_nombre']]; }, $afectados),
            'aliasAntes' => $aliasAntes,
        ], JSON_UNESCAPED_UNICODE),
    ]);
    $fusionId = (int) db()->lastInsertId();

    foreach ($afectados as $r) {
        q('UPDATE visitantes SET alumno_nombre = ? WHERE id = ?', [$nombreFinal, $r['id']]);
    }
    foreach ($aliasAntes as $a) {
        q(
            'INSERT INTO alumno_alias (alias_norm, nombre, fusion_id, activo) VALUES (?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), fusion_id = VALUES(fusion_id), activo = 1',
            [$a['clave'], $nombreFinal, $fusionId]
        );
    }
    return ['fusionId' => $fusionId, 'resumen' => $resumen, 'familiares' => $n];
}

soloMetodo('POST');
requireAdmin();

$b = cuerpo();
try {
    $r = transaccion(function () use ($b) {
        $tipo = $b['tipo'] ?? null;
        if ($tipo === 'visitante') return fusionarVisitantes($b);
        if ($tipo === 'alumno') return fusionarAlumnos($b);
        throw new HttpError(400, 'Tipo de fusión inválido.');
    });
    responder(200, array_merge(['ok' => true], $r));
} catch (HttpError $e) {
    responder($e->http, ['error' => $e->getMessage()]);
} catch (Throwable $e) {
    error_log('fusionar: ' . $e->getMessage());
    responder(500, ['error' => 'No se pudo fusionar. No se cambió nada.']);
}
