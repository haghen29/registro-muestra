const crypto = require('crypto');

// Devuelve true si el PIN del header coincide con ADMIN_PIN.
// Si no coincide, responde el error y devuelve false.
function requireAdmin(req, res) {
  const esperado = process.env.ADMIN_PIN;
  if (!esperado) {
    res.status(500).json({ error: 'Falta configurar ADMIN_PIN.' });
    return false;
  }
  const recibido = String(req.headers['x-admin-pin'] || '');
  const a = Buffer.from(recibido);
  const b = Buffer.from(esperado);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    res.status(401).json({ error: 'PIN incorrecto.' });
    return false;
  }
  return true;
}

// Corta el pedido si el método HTTP no es el esperado.
function soloMetodo(req, res, metodo) {
  if (req.method === metodo) return true;
  res.setHeader('Allow', metodo);
  res.status(405).json({ error: 'Método no permitido.' });
  return false;
}

module.exports = { requireAdmin, soloMetodo };
