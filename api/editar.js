// POST /api/editar
//   { id, nombre, apellido, dni, conAlumno, alumno, parentesco }  -> corrige los datos
//   { id, quitarAlerta: true }                                    -> "los datos están bien"
const { getPool, leerVisitante } = require('./_db');
const { requireAdmin, soloMetodo, leerJson } = require('./_auth');
const { validarVisitante, idDe } = require('./_validar');
const { analizar } = require('./_troll');

module.exports = async (req, res) => {
  if (!soloMetodo(req, res, 'POST')) return;
  if (!(await requireAdmin(req, res))) return;

  const b = leerJson(req, res);
  if (!b) return;
  const id = idDe(b.id);
  if (!id) return res.status(400).json({ error: 'Falta el id del visitante.' });

  const pool = getPool();
  try {
    const actual = await leerVisitante(pool, id);
    if (!actual || actual.eliminado) {
      return res.status(404).json({ error: 'Ese registro ya no existe (lo eliminaron o lo fusionaron).' });
    }

    if (b.quitarAlerta === true) {
      await pool.execute('UPDATE visitantes SET alerta = NULL WHERE id = ?', [id]);
      return res.status(200).json({ ok: true, visitante: await leerVisitante(pool, id) });
    }

    // Desde el panel se puede guardar a alguien que se llama igual que un famoso
    const { datos: d, errores, ok } = validarVisitante(b, { permitirFamosos: true });
    if (!ok) return res.status(400).json({ error: 'Revisá los datos marcados.', errores });

    // El detector se vuelve a pasar con los datos corregidos
    const alerta = analizar(d);
    // Si lo pasan a "No viene a ver a un alumno", se guarda igual el alumno, el curso y el
    // parentesco que había, por si fue un toque sin querer: al volver a "Sí" reaparecen.
    const previo = (k) => (d.conAlumno ? d[k] : actual[k]);
    await pool.execute(
      `UPDATE visitantes
          SET nombre = ?, apellido = ?, dni = ?, con_alumno = ?, alumno_nombre = ?, curso = ?, division = ?,
              parentesco = ?, alerta = ?
        WHERE id = ?`,
      [d.nombre, d.apellido, d.dni, d.conAlumno ? 1 : 0, previo('alumno'), previo('curso'), previo('division'),
       previo('parentesco'), alerta, id]
    );
    return res.status(200).json({ ok: true, visitante: await leerVisitante(pool, id) });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      // Ya hay otro registro con el mismo DNI, nombre y apellido (es la misma persona dos veces)
      const [[otro]] = await pool.execute(
        'SELECT id, eliminado FROM visitantes WHERE dni = ? AND nombre = ? AND apellido = ? AND id <> ?',
        [String(b.dni).replace(/\D/g, ''), String(b.nombre).trim(), String(b.apellido).trim(), id]
      );
      const cual = otro && !Number(otro.eliminado) ? ` (#${String(otro.id).padStart(4, '0')})` : ' (un registro eliminado)';
      return res.status(409).json({
        error: `Ya hay otro registro con ese DNI, nombre y apellido${cual}. Si es la misma persona, fusionalos desde Inconsistencias.`,
        errores: { dni: 'Ya hay otro registro igual.' },
      });
    }
    console.error('editar', e);
    return res.status(500).json({ error: 'No se pudo guardar el cambio.' });
  }
};
