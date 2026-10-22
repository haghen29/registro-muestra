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
const { transaccion, leerVisitante } = require('./_db');
const { requireAdmin, soloMetodo } = require('./_auth');
const { limpiar, norm, errorNombre, idDe } = require('./_validar');
const { analizar } = require('./_troll');

const COLS = 'id, nombre, apellido, dni, con_alumno, alumno_nombre, curso, division, parentesco, alerta, ingresado, ingreso_at, eliminado';

async function fusionarVisitantes(db, b) {
  const aId = idDe(b.principalId);
  const bId = idDe(b.otroId);
  const el = b.elegir && typeof b.elegir === 'object' ? b.elegir : {};
  if (!aId || !bId || aId === bId) {
    throw Object.assign(new Error('Elegí dos registros distintos.'), { http: 400 });
  }
  for (const k of ['nombre', 'apellido', 'dni', 'visita']) {
    if (el[k] !== 'a' && el[k] !== 'b') throw Object.assign(new Error('Falta elegir qué dato queda.'), { http: 400 });
  }

  const [rows] = await db.execute(`SELECT ${COLS} FROM visitantes WHERE id IN (?, ?) FOR UPDATE`, [aId, bId]);
  const A = rows.find((r) => Number(r.id) === aId);
  const B = rows.find((r) => Number(r.id) === bId);
  if (!A || !B || Number(A.eliminado) || Number(B.eliminado)) {
    throw Object.assign(new Error('Uno de los registros ya no existe. Actualizá el panel.'), { http: 409 });
  }

  const de = (k) => (el[k] === 'a' ? A : B);
  const visita = de('visita');
  const final = {
    nombre: de('nombre').nombre,
    apellido: de('apellido').apellido,
    dni: de('dni').dni,
    con_alumno: visita.con_alumno,
    alumno_nombre: visita.alumno_nombre,
    curso: visita.curso,
    division: visita.division,
    parentesco: visita.parentesco,
  };
  const ingresos = [A, B].filter((r) => Number(r.ingresado));
  const ingresoAt = ingresos.map((r) => r.ingreso_at).filter(Boolean).sort()[0] || null;
  const alerta = analizar({ ...final, alumno: final.alumno_nombre });

  // 1) Liberar el DNI del registro que se oculta (el DNI es único)
  await db.execute(
    'UPDATE visitantes SET eliminado = 1, fusionado_en = ?, dni = ? WHERE id = ?',
    [aId, `F${bId}`, bId]
  );
  // 2) Guardar los datos elegidos en el registro principal
  await db.execute(
    `UPDATE visitantes
        SET nombre = ?, apellido = ?, dni = ?, con_alumno = ?, alumno_nombre = ?, curso = ?, division = ?,
            parentesco = ?, alerta = ?, ingresado = ?, ingreso_at = ?
      WHERE id = ?`,
    [final.nombre, final.apellido, final.dni, final.con_alumno, final.alumno_nombre, final.curso, final.division,
     final.parentesco, alerta, ingresos.length ? 1 : 0, ingresoAt, aId]
  );

  const resumen = `Visitantes: ${A.apellido}, ${A.nombre} (#${aId}) + ${B.apellido}, ${B.nombre} (#${bId}) → ${final.apellido}, ${final.nombre}`;
  const [f] = await db.execute(
    'INSERT INTO fusiones (tipo, resumen, datos) VALUES (?, ?, ?)',
    ['visitante', resumen.slice(0, 255), JSON.stringify({
      principalId: aId, otroId: bId, antes: { a: A, b: B },
      despues: { ingresado: ingresos.length ? 1 : 0, ingreso_at: ingresoAt },
    })]
  );
  return { fusionId: f.insertId, resumen, visitante: await leerVisitante(db, aId) };
}

async function fusionarAlumnos(db, b) {
  // Los nombres a unir solo se usan para buscar (comparados normalizados); el final se guarda y se valida
  const lista = Array.isArray(b.nombres) ? b.nombres.slice(0, 50) : [];
  const nombres = [...new Set(lista.map((n) => limpiar(n, 120)).filter(Boolean))];
  const nombreFinal = limpiar(b.nombreFinal, 120);
  if (nombres.length < 2) throw Object.assign(new Error('Elegí al menos dos alumnos para fusionar.'), { http: 400 });
  if (nombreFinal.length < 2) throw Object.assign(new Error('Escribí cómo se llama el alumno.'), { http: 400 });
  const errFinal = errorNombre(nombreFinal, { campo: 'El nombre del alumno' });
  if (errFinal) throw Object.assign(new Error(errFinal), { http: 400 });

  const claves = new Set(nombres.map(norm));
  const [rows] = await db.query(
    'SELECT id, alumno_nombre FROM visitantes WHERE eliminado = 0 AND con_alumno = 1 FOR UPDATE'
  );
  const afectados = rows.filter((r) => claves.has(norm(r.alumno_nombre)));
  if (!afectados.length) throw Object.assign(new Error('No hay familiares con esos alumnos. Actualizá el panel.'), { http: 409 });

  // Registrar los alias (cómo lo escribieron) para agrupar registros futuros
  const claveFinal = norm(nombreFinal);
  const aliasAntes = [];
  for (const clave of new Set([...claves, claveFinal])) {
    const [[prev]] = await db.execute('SELECT alias_norm, nombre, fusion_id, activo FROM alumno_alias WHERE alias_norm = ?', [clave]);
    aliasAntes.push({ clave, prev: prev || null });
  }

  const resumen = `Alumno: ${nombres.join(' + ')} → ${nombreFinal} (${afectados.length} familiar${afectados.length === 1 ? '' : 'es'})`;
  const [f] = await db.execute(
    'INSERT INTO fusiones (tipo, resumen, datos) VALUES (?, ?, ?)',
    ['alumno', resumen.slice(0, 255), JSON.stringify({
      nombreFinal,
      familiares: afectados.map((r) => ({ id: Number(r.id), alumno: r.alumno_nombre })),
      aliasAntes,
    })]
  );

  for (const r of afectados) {
    await db.execute('UPDATE visitantes SET alumno_nombre = ? WHERE id = ?', [nombreFinal, r.id]);
  }
  for (const { clave } of aliasAntes) {
    await db.execute(
      `INSERT INTO alumno_alias (alias_norm, nombre, fusion_id, activo) VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), fusion_id = VALUES(fusion_id), activo = 1`,
      [clave, nombreFinal, f.insertId]
    );
  }
  return { fusionId: f.insertId, resumen, familiares: afectados.length };
}

module.exports = async (req, res) => {
  if (!soloMetodo(req, res, 'POST')) return;
  if (!(await requireAdmin(req, res))) return;

  const b = req.body || {};
  try {
    const r = await transaccion((db) =>
      b.tipo === 'visitante' ? fusionarVisitantes(db, b)
      : b.tipo === 'alumno' ? fusionarAlumnos(db, b)
      : Promise.reject(Object.assign(new Error('Tipo de fusión inválido.'), { http: 400 }))
    );
    return res.status(200).json({ ok: true, ...r });
  } catch (e) {
    if (e.http) return res.status(e.http).json({ error: e.message });
    console.error('fusionar', e);
    return res.status(500).json({ error: 'No se pudo fusionar. No se cambió nada.' });
  }
};
