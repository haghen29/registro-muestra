// Conexión compartida a MariaDB. Vercel reutiliza el proceso entre
// invocaciones "calientes", así que guardamos el pool en global.
const mysql = require('mysql2/promise');

function getPool() {
  if (!global._tec4Pool) {
    global._tec4Pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 3,
      maxIdle: 3,
      idleTimeout: 30000,
      dateStrings: true,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
    });
  }
  return global._tec4Pool;
}

// Ejecuta fn(conn) dentro de una transacción: si algo falla, no se guarda nada.
async function transaccion(fn) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const r = await fn(conn);
    await conn.commit();
    return r;
  } catch (e) {
    await conn.rollback().catch(() => {});
    throw e;
  } finally {
    conn.release();
  }
}

const SELECT_VISITANTE = `
  SELECT id, nombre, apellido, dni, con_alumno, alumno_nombre, curso, division, parentesco, alerta,
         ingresado, eliminado, fusionado_en,
         FLOOR(UNIX_TIMESTAMP(created_at) * 1000) AS created_ms,
         FLOOR(UNIX_TIMESTAMP(ingreso_at) * 1000) AS ingreso_ms
  FROM visitantes`;

function toVisitante(r) {
  return {
    id: Number(r.id),
    nombre: r.nombre,
    apellido: r.apellido,
    dni: r.dni,
    conAlumno: Boolean(Number(r.con_alumno)),
    alumno: r.alumno_nombre || null,
    curso: r.curso == null ? null : Number(r.curso),
    division: r.division == null ? null : Number(r.division),
    parentesco: r.parentesco || null,
    alerta: r.alerta || null,
    ingresado: Boolean(Number(r.ingresado)),
    eliminado: Boolean(Number(r.eliminado)),
    fusionadoEn: r.fusionado_en == null ? null : Number(r.fusionado_en),
    createdMs: r.created_ms == null ? null : Number(r.created_ms),
    ingresoMs: r.ingreso_ms == null ? null : Number(r.ingreso_ms),
  };
}

async function leerVisitante(db, id) {
  const [rows] = await db.execute(`${SELECT_VISITANTE} WHERE id = ?`, [id]);
  return rows.length ? toVisitante(rows[0]) : null;
}

module.exports = { getPool, transaccion, SELECT_VISITANTE, toVisitante, leerVisitante };
