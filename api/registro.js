// POST /api/registro  ->  registra un visitante desde el formulario público
const { transaccion, leerVisitante } = require('./_db');
const { soloMetodo, leerJson } = require('./_auth');
const { validarVisitante, norm } = require('./_validar');
const { analizar } = require('./_troll');

module.exports = async (req, res) => {
  if (!soloMetodo(req, res, 'POST')) return;
  const body = leerJson(req, res);
  if (!body) return;

  const { datos: d, errores, ok } = validarVisitante(body);
  if (!ok) return res.status(400).json({ error: 'Revisá los datos marcados.', errores });

  try {
    const resultado = await transaccion(async (db) => {
      // Si el alumno ya fue fusionado con otro nombre, usar el nombre unificado
      if (d.conAlumno) {
        const [al] = await db.execute(
          'SELECT nombre FROM alumno_alias WHERE alias_norm = ? AND activo = 1',
          [norm(d.alumno)]
        );
        if (al.length) d.alumno = al[0].nombre;
      }
      const alerta = analizar(d);

      const [ex] = await db.execute('SELECT id, eliminado FROM visitantes WHERE dni = ? FOR UPDATE', [d.dni]);

      if (ex.length && !Number(ex[0].eliminado)) {
        // Ese DNI ya está registrado. Solo se devuelve el pase si el nombre y el apellido
        // coinciden: si no, cualquiera podría escribir un DNI ajeno y ver los datos de otra persona.
        const previo = await leerVisitante(db, ex[0].id);
        const mismaPersona = norm(previo.nombre) === norm(d.nombre) && norm(previo.apellido) === norm(d.apellido);
        if (!mismaPersona) throw Object.assign(new Error('dni-ajeno'), { dniAjeno: true });
        return { duplicado: true, visitante: previo };
      }

      if (ex.length) {
        // Había un registro eliminado con ese DNI: lo reactivamos con los datos nuevos
        await db.execute(
          `UPDATE visitantes
              SET nombre = ?, apellido = ?, con_alumno = ?, alumno_nombre = ?, curso = ?, division = ?,
                  parentesco = ?, alerta = ?,
                  ingresado = 0, ingreso_at = NULL, eliminado = 0, fusionado_en = NULL,
                  created_at = NOW(3)
            WHERE id = ?`,
          [d.nombre, d.apellido, d.conAlumno ? 1 : 0, d.alumno, d.curso, d.division, d.parentesco, alerta, ex[0].id]
        );
        return { duplicado: false, visitante: await leerVisitante(db, ex[0].id) };
      }

      const [r] = await db.execute(
        `INSERT INTO visitantes (nombre, apellido, dni, con_alumno, alumno_nombre, curso, division, parentesco, alerta)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [d.nombre, d.apellido, d.dni, d.conAlumno ? 1 : 0, d.alumno, d.curso, d.division, d.parentesco, alerta]
      );
      return { duplicado: false, visitante: await leerVisitante(db, r.insertId) };
    });

    // Al visitante no le mostramos la marca del detector
    const { alerta, eliminado, fusionadoEn, ...visitante } = resultado.visitante;
    return res
      .status(resultado.duplicado ? 200 : 201)
      .json({ ok: true, duplicado: resultado.duplicado, visitante });
  } catch (e) {
    if (e.dniAjeno) {
      return res.status(409).json({
        error: 'Ese DNI ya está registrado con otro nombre. Revisá el DNI o acercate a la recepción.',
        errores: { dni: 'Este DNI ya está registrado con otro nombre.' },
      });
    }
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ese DNI se acaba de registrar. Tocá Registrarme otra vez.' });
    }
    console.error('registro', e);
    return res.status(500).json({ error: 'No se pudo guardar el registro. Probá de nuevo en unos segundos.' });
  }
};
