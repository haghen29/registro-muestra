// POST /api/eliminar  { id }
// Borrado lógico: el registro desaparece del panel en todos los dispositivos,
// pero queda en la base por si hace falta recuperarlo (ver README).
// Si la persona se vuelve a registrar con el mismo DNI, el registro se reactiva.
const { getPool } = require('./_db');
const { requireAdmin, soloMetodo, leerJson } = require('./_auth');
const { idDe } = require('./_validar');

module.exports = async (req, res) => {
  if (!soloMetodo(req, res, 'POST')) return;
  if (!(await requireAdmin(req, res))) return;
  const b = leerJson(req, res);
  if (!b) return;

  const id = idDe(b.id);
  if (!id) return res.status(400).json({ error: 'Falta el id del visitante.' });

  try {
    const [r] = await getPool().execute(
      'UPDATE visitantes SET eliminado = 1 WHERE id = ? AND eliminado = 0',
      [id]
    );
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Ese registro ya estaba eliminado.' });
    return res.status(200).json({ ok: true, id });
  } catch (e) {
    console.error('eliminar', e);
    return res.status(500).json({ error: 'No se pudo eliminar el registro.' });
  }
};
