// POST /api/checkin  { id, ingresado: true|false }
// Marca (o deshace) el ingreso. Si dos recepcionistas marcan a la misma
// persona, el segundo recibe 409 con la hora del primer ingreso.
const { getPool, leerVisitante } = require('./_db');
const { requireAdmin, soloMetodo, leerJson } = require('./_auth');
const { idDe } = require('./_validar');

module.exports = async (req, res) => {
  if (!soloMetodo(req, res, 'POST')) return;
  if (!(await requireAdmin(req, res))) return;
  const b = leerJson(req, res);
  if (!b) return;

  const id = idDe(b.id);
  const ingresado = b.ingresado;
  if (!id) return res.status(400).json({ error: 'Falta el id del visitante.' });
  if (typeof ingresado !== 'boolean') return res.status(400).json({ error: 'Falta indicar si ingresó (true o false).' });

  try {
    const pool = getPool();
    const [r] = await pool.execute(
      `UPDATE visitantes
          SET ingresado = ?, ingreso_at = ${ingresado ? 'NOW(3)' : 'NULL'}
        WHERE id = ? AND eliminado = 0 AND ingresado <> ?`,
      [ingresado ? 1 : 0, id, ingresado ? 1 : 0]
    );
    const visitante = await leerVisitante(pool, id);
    if (!visitante || visitante.eliminado) {
      return res.status(404).json({ error: 'Ese registro ya no existe (lo eliminaron o lo fusionaron).' });
    }
    if (r.affectedRows === 0) {
      return res.status(409).json({
        ok: false,
        visitante,
        error: ingresado ? 'Esta persona ya tenía el ingreso marcado.' : 'El ingreso ya estaba sin marcar.',
      });
    }
    return res.status(200).json({ ok: true, visitante });
  } catch (e) {
    console.error('checkin', e);
    return res.status(500).json({ error: 'No se pudo actualizar el ingreso.' });
  }
};
