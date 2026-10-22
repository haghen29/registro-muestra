// PIN del panel de recepción.
//
// - El PIN se guarda en la tabla `ajustes` cifrado con scrypt (sal aleatoria):
//   en la base nunca queda en texto. Si todavía no hay ninguno, vale el de
//   ADMIN_PIN o, si no está configurado, 1111. El admin lo cambia desde el panel.
// - Solo números, de 4 a 8 cifras. Cualquier otra cosa se rechaza sin consultar nada.
// - Después de MAX_FALLOS intentos fallidos desde la misma IP, esa IP queda
//   bloqueada BLOQUEO_SEG segundos, así no se puede adivinar probando todos.
const crypto = require('crypto');
const { getPool } = require('./_db');

const PIN_INICIAL = process.env.ADMIN_PIN || '1111';
const FORMATO_PIN = /^\d{4,8}$/;
const MAX_FALLOS = 5;
const BLOQUEO_SEG = 120;
const VENTANA_MIN = 10; // los fallos se cuentan dentro de esta ventana

const esPinValido = (pin) => typeof pin === 'string' && FORMATO_PIN.test(pin);

function cifrar(pin, sal = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(pin, sal, 32).toString('hex');
  return `scrypt$${sal}$${hash}`;
}

function coincide(pin, guardado) {
  const [tipo, sal, hash] = String(guardado).split('$');
  if (tipo !== 'scrypt' || !sal || !hash) return false;
  const a = Buffer.from(cifrar(pin, sal).split('$')[2], 'hex');
  const b = Buffer.from(hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Lee el PIN cifrado; la primera vez guarda el inicial.
async function pinGuardado(db) {
  const [[fila]] = await db.query("SELECT valor FROM ajustes WHERE clave = 'admin_pin'");
  if (fila) return fila.valor;
  await db.execute("INSERT IGNORE INTO ajustes (clave, valor) VALUES ('admin_pin', ?)", [cifrar(PIN_INICIAL)]);
  const [[nueva]] = await db.query("SELECT valor FROM ajustes WHERE clave = 'admin_pin'");
  return nueva.valor;
}

// Evita recalcular scrypt en cada consulta del panel (cada 2 s):
// recuerda qué PIN (como hash SHA-256, no en texto) coincidió con qué valor guardado.
const cache = (global._tec4PinCache ||= new Map());
function verificar(pin, guardado) {
  const clave = `${guardado}|${crypto.createHash('sha256').update(pin).digest('hex')}`;
  if (cache.has(clave)) return cache.get(clave);
  const ok = coincide(pin, guardado);
  if (cache.size > 50) cache.clear();
  cache.set(clave, ok);
  return ok;
}

// IP del cliente para el bloqueo. En Vercel, x-vercel-forwarded-for y x-forwarded-for
// los escribe la plataforma (pisa lo que mande el cliente), así que no se pueden falsificar
// para esquivar el bloqueo. En la compu (vercel dev) sí se podrían: es solo para probar.
function ipDe(req) {
  const h = req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || '';
  const fwd = String(h).split(',')[0].trim();
  return (fwd || req.socket?.remoteAddress || 'desconocida').slice(0, 45);
}

async function registrarFallo(db, ip) {
  // MariaDB aplica las asignaciones en orden: bloqueado_hasta ya ve el nuevo valor de fallos
  await db.execute(
    `INSERT INTO intentos_pin (ip, fallos, bloqueado_hasta) VALUES (?, 1, NULL)
     ON DUPLICATE KEY UPDATE
       fallos = IF(updated_at < NOW(3) - INTERVAL ${VENTANA_MIN} MINUTE, 1, fallos + 1),
       bloqueado_hasta = IF(fallos >= ${MAX_FALLOS}, NOW(3) + INTERVAL ${BLOQUEO_SEG} SECOND, NULL)`,
    [ip]
  );
}

// Devuelve true si el PIN del header es correcto. Si no, responde el error y devuelve false.
async function requireAdmin(req, res) {
  const db = getPool();
  const ip = ipDe(req);
  try {
    const [[bloq]] = await db.execute(
      'SELECT fallos, CEIL(TIMESTAMPDIFF(MICROSECOND, NOW(3), bloqueado_hasta) / 1000000) AS seg FROM intentos_pin WHERE ip = ?',
      [ip]
    );
    if (bloq && Number(bloq.seg) > 0) {
      res.setHeader('Retry-After', String(bloq.seg));
      res.status(429).json({ error: `Demasiados intentos con PIN incorrecto. Esperá ${Math.ceil(bloq.seg / 60)} minuto(s) y probá de nuevo.` });
      return false;
    }

    const pin = req.headers['x-admin-pin'];
    if (!esPinValido(pin) || !verificar(pin, await pinGuardado(db))) {
      await registrarFallo(db, ip);
      res.status(401).json({ error: 'PIN incorrecto.' });
      return false;
    }
    if (bloq && Number(bloq.fallos) > 0) {
      await db.execute('UPDATE intentos_pin SET fallos = 0, bloqueado_hasta = NULL WHERE ip = ?', [ip]);
    }
    return true;
  } catch (e) {
    console.error('auth', e);
    res.status(500).json({ error: 'No se pudo verificar el PIN.' });
    return false;
  }
}

// Lee el cuerpo JSON del pedido sin romperse: si no es JSON válido o no es un objeto
// ({...}), responde 400 y devuelve null. (Leer req.body con JSON roto lanza un error.)
function leerJson(req, res) {
  let b;
  try { b = req.body; } catch { b = undefined; }
  if (b && typeof b === 'object' && !Array.isArray(b)) return b;
  res.status(400).json({ error: 'El pedido tiene que ser un objeto JSON válido.' });
  return null;
}

// Corta el pedido si el método HTTP no es el esperado.
function soloMetodo(req, res, metodo) {
  if (req.method === metodo) return true;
  res.setHeader('Allow', metodo);
  res.status(405).json({ error: 'Método no permitido.' });
  return false;
}

module.exports = { requireAdmin, soloMetodo, leerJson, esPinValido, cifrar, coincide, pinGuardado };
