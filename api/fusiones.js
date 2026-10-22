// GET  /api/fusiones             -> historial (últimas 100)
// POST /api/fusiones { deshacer } -> deshace una fusión y deja todo como estaba
const { getPool, transaccion } = require('./_db');
const { requireAdmin } = require('./_auth');
const { idDe } = require('./_validar');

const err = (http, msg) => Object.assign(new Error(msg), { http });

async function deshacerVisitante(db, d) {
  const { principalId: aId, otroId: bId, antes } = d;
  const [rows] = await db.execute(
    'SELECT id, eliminado, fusionado_en, dni, ingresado, ingreso_at FROM visitantes WHERE id IN (?, ?) FOR UPDATE',
    [aId, bId]
  );
  const A = rows.find((r) => Number(r.id) === aId);
  const B = rows.find((r) => Number(r.id) === bId);
  if (!A || Number(A.eliminado)) throw err(409, 'El registro que quedó de la fusión fue eliminado. No se puede deshacer.');
  if (!B || Number(B.fusionado_en) !== aId) throw err(409, 'El registro unido ya cambió. No se puede deshacer.');

  // El principal recupera sus datos originales. El ingreso también, salvo que
  // un recepcionista lo haya cambiado a mano después de la fusión.
  const a = antes.a;
  const tocadoDespues = d.despues && (
    Number(A.ingresado) !== Number(d.despues.ingresado) ||
    String(A.ingreso_at || '') !== String(d.despues.ingreso_at || '')
  );
  const ing = tocadoDespues ? [A.ingresado, A.ingreso_at] : [a.ingresado, a.ingreso_at];
  // Las fusiones hechas antes de la versión 3 no guardaron curso ni división
  await db.execute(
    `UPDATE visitantes
        SET nombre = ?, apellido = ?, dni = ?, con_alumno = ?, alumno_nombre = ?, curso = ?, division = ?,
            parentesco = ?, alerta = ?, ingresado = ?, ingreso_at = ?
      WHERE id = ?`,
    [a.nombre, a.apellido, a.dni, a.con_alumno, a.alumno_nombre, a.curso ?? null, a.division ?? null,
     a.parentesco, a.alerta, ...ing, aId]
  );
  const bb = antes.b;
  await db.execute(
    `UPDATE visitantes
        SET nombre = ?, apellido = ?, dni = ?, con_alumno = ?, alumno_nombre = ?, curso = ?, division = ?,
            parentesco = ?, alerta = ?, ingresado = ?, ingreso_at = ?, eliminado = 0, fusionado_en = NULL
      WHERE id = ?`,
    [bb.nombre, bb.apellido, bb.dni, bb.con_alumno, bb.alumno_nombre, bb.curso ?? null, bb.division ?? null,
     bb.parentesco, bb.alerta, bb.ingresado, bb.ingreso_at, bId]
  );
}

async function deshacerAlumno(db, d, fusionId) {
  let restaurados = 0;
  for (const f of d.familiares) {
    // Solo si nadie lo cambió después de la fusión
    const [r] = await db.execute(
      'UPDATE visitantes SET alumno_nombre = ? WHERE id = ? AND alumno_nombre = ?',
      [f.alumno, f.id, d.nombreFinal]
    );
    restaurados += r.affectedRows;
  }
  for (const { clave, prev } of d.aliasAntes) {
    if (prev) {
      await db.execute(
        'UPDATE alumno_alias SET nombre = ?, fusion_id = ?, activo = ? WHERE alias_norm = ? AND fusion_id = ?',
        [prev.nombre, prev.fusion_id, prev.activo, clave, fusionId]
      );
    } else {
      await db.execute('UPDATE alumno_alias SET activo = 0 WHERE alias_norm = ? AND fusion_id = ?', [clave, fusionId]);
    }
  }
  return restaurados;
}

module.exports = async (req, res) => {
  if (!(await requireAdmin(req, res))) return;

  if (req.method === 'GET') {
    try {
      const [rows] = await getPool().query(
        `SELECT id, tipo, resumen,
                FLOOR(UNIX_TIMESTAMP(creada_at) * 1000) AS creada_ms,
                FLOOR(UNIX_TIMESTAMP(deshecha_at) * 1000) AS deshecha_ms
           FROM fusiones ORDER BY id DESC LIMIT 100`
      );
      return res.status(200).json({
        fusiones: rows.map((r) => ({
          id: Number(r.id), tipo: r.tipo, resumen: r.resumen,
          creadaMs: Number(r.creada_ms), deshechaMs: r.deshecha_ms == null ? null : Number(r.deshecha_ms),
        })),
      });
    } catch (e) {
      console.error('fusiones', e);
      return res.status(500).json({ error: 'No se pudo leer el historial.' });
    }
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Método no permitido.' });
  }

  const id = idDe(req.body?.deshacer);
  if (!id) return res.status(400).json({ error: 'Falta la fusión a deshacer.' });

  try {
    const r = await transaccion(async (db) => {
      const [[f]] = await db.execute('SELECT id, tipo, datos, deshecha_at FROM fusiones WHERE id = ? FOR UPDATE', [id]);
      if (!f) throw err(404, 'Esa fusión no existe.');
      if (f.deshecha_at) throw err(409, 'Esa fusión ya estaba deshecha.');
      const datos = JSON.parse(f.datos);
      let detalle = '';
      if (f.tipo === 'visitante') {
        await deshacerVisitante(db, datos);
        detalle = 'Los dos registros volvieron a estar separados.';
      } else {
        const n = await deshacerAlumno(db, datos, id);
        detalle = `${n} familiar${n === 1 ? '' : 'es'} volvi${n === 1 ? 'ó' : 'eron'} a su alumno original.`;
      }
      await db.execute('UPDATE fusiones SET deshecha_at = NOW(3) WHERE id = ?', [id]);
      return { detalle };
    });
    return res.status(200).json({ ok: true, ...r });
  } catch (e) {
    if (e.http) return res.status(e.http).json({ error: e.message });
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'No se puede deshacer: uno de los DNI originales ya lo usa otro registro.' });
    }
    console.error('deshacer', e);
    return res.status(500).json({ error: 'No se pudo deshacer. No se cambió nada.' });
  }
};
