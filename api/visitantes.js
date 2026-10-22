// GET /api/visitantes            -> lista completa (sin eliminados)
// GET /api/visitantes?since=...  -> solo lo que cambió desde ese momento
//                                   (incluye eliminados, así el panel los quita)
// El panel consulta cada 2 s, así los registros aparecen casi al instante.
const { getPool, SELECT_VISITANTE, toVisitante } = require('./_db');
const { requireAdmin, soloMetodo } = require('./_auth');

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,6})?$/;

module.exports = async (req, res) => {
  if (!soloMetodo(req, res, 'GET')) return;
  if (!requireAdmin(req, res)) return;

  const since = typeof req.query.since === 'string' ? req.query.since : '';
  if (since && !FORMATO_FECHA.test(since)) {
    return res.status(400).json({ error: 'Parámetro since inválido.' });
  }

  try {
    const pool = getPool();
    // Cursor con 2 s de margen para no perder escrituras simultáneas;
    // el panel descarta duplicados por id. ("cursor" es palabra reservada en MariaDB)
    const [[{ cur }]] = await pool.query(
      `SELECT DATE_FORMAT(NOW(3) - INTERVAL 2 SECOND, '%Y-%m-%d %H:%i:%s.%f') AS cur`
    );
    const [rows] = since
      ? await pool.execute(`${SELECT_VISITANTE} WHERE updated_at >= ? ORDER BY id DESC`, [since])
      : await pool.query(`${SELECT_VISITANTE} WHERE eliminado = 0 ORDER BY id DESC`);

    return res.status(200).json({ cursor: cur, visitantes: rows.map(toVisitante) });
  } catch (e) {
    console.error('visitantes', e);
    return res.status(500).json({ error: 'No se pudo leer la base de datos.' });
  }
};
