// POST /api/pin  { actual, nuevo }
// Cambia el PIN del panel. Hace falta el PIN actual (en el header y en el cuerpo).
// Después del cambio, los demás dispositivos tienen que entrar con el PIN nuevo.
const { getPool } = require('./_db');
const { requireAdmin, soloMetodo, esPinValido, cifrar, coincide, pinGuardado } = require('./_auth');

module.exports = async (req, res) => {
  if (!soloMetodo(req, res, 'POST')) return;
  if (!(await requireAdmin(req, res))) return;

  const { actual, nuevo } = req.body || {};
  if (!esPinValido(nuevo)) {
    return res.status(400).json({ error: 'El PIN nuevo tiene que tener entre 4 y 8 números, sin letras, espacios ni símbolos.', errores: { nuevo: 'Solo números, de 4 a 8 cifras.' } });
  }
  if (nuevo === actual) {
    return res.status(400).json({ error: 'El PIN nuevo tiene que ser distinto del actual.', errores: { nuevo: 'Tiene que ser distinto del actual.' } });
  }

  try {
    const db = getPool();
    if (!esPinValido(actual) || !coincide(actual, await pinGuardado(db))) {
      return res.status(400).json({ error: 'El PIN actual no es correcto.', errores: { actual: 'No es el PIN actual.' } });
    }
    await db.execute("UPDATE ajustes SET valor = ? WHERE clave = 'admin_pin'", [cifrar(nuevo)]);
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('pin', e);
    return res.status(500).json({ error: 'No se pudo cambiar el PIN.' });
  }
};
