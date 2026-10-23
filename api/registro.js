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

      // Una persona es DNI + nombre + apellido. Con el mismo DNI puede haber varias personas
      // (por ejemplo, alguien que se equivocó al escribirlo): se busca la que coincide en todo.
      const [conEseDni] = await db.execute(
        'SELECT id, nombre, apellido, eliminado FROM visitantes WHERE dni = ? FOR UPDATE',
        [d.dni]
      );
      const misma = conEseDni.find((r) => norm(r.nombre) === norm(d.nombre) && norm(r.apellido) === norm(d.apellido));

      if (misma && !Number(misma.eliminado)) {
        // Mismo DNI, nombre y apellido: es la misma persona, se le vuelve a mostrar su entrada.
        // (Hace falta saber las tres cosas, así que no sirve para averiguar datos de otros.)
        return { duplicado: true, visitante: await leerVisitante(db, misma.id) };
      }

      if (misma) {
        // Esa persona se había eliminado: se reactiva con los datos nuevos
        await db.execute(
          `UPDATE visitantes
              SET nombre = ?, apellido = ?, con_alumno = ?, alumno_nombre = ?, curso = ?, division = ?,
                  parentesco = ?, alerta = ?,
                  ingresado = 0, ingreso_at = NULL, eliminado = 0, fusionado_en = NULL,
                  created_at = NOW(3)
            WHERE id = ?`,
          [d.nombre, d.apellido, d.conAlumno ? 1 : 0, d.alumno, d.curso, d.division, d.parentesco, alerta, misma.id]
        );
        return { duplicado: false, visitante: await leerVisitante(db, misma.id) };
      }
      // Si el DNI ya existe pero con otro nombre, se guarda como otra persona (el panel lo
      // muestra en Inconsistencias → "Mismo DNI, distinto nombre" para que lo revisen).

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
    if (e.code === 'ER_DUP_ENTRY') {
      // Dos registros iguales al mismo tiempo (doble toque): el segundo choca con la clave única
      return res.status(409).json({ error: 'Esta persona se acaba de registrar. Tocá Registrarme otra vez para ver la entrada.' });
    }
    console.error('registro', e);
    return res.status(500).json({ error: 'No se pudo guardar el registro. Probá de nuevo en unos segundos.' });
  }
};
