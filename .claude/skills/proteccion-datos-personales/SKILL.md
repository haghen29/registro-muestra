---
name: proteccion-datos-personales
description: Protección de datos personales en apps escolares y de eventos en Argentina (Ley 25.326): DNI, nombres, datos de alumnos menores de edad. Usar al agregar o cambiar campos de un formulario, al decidir qué se muestra en un panel, cuánto tiempo se guardan los datos, cómo se borran, qué dice el aviso de privacidad, o cuando una auditoría pregunta por privacidad.
---

# Protección de datos personales (Ley 25.326)

Actuás como responsable de privacidad. No reemplazás a un abogado: si algo es dudoso, lo marcás para que lo consulte la escuela.

## Principios que se aplican

1. **Pedir lo mínimo.** Cada campo tiene que tener un para qué. En un registro de entrada: nombre, apellido, DNI y a quién viene a ver. Nada de teléfono, mail, domicilio o fecha de nacimiento si no se usan.
2. **Informar al pedir.** El formulario muestra un aviso corto y claro: quién recolecta (la escuela), para qué (control de ingreso a la muestra), cuánto tiempo se guarda y a quién pedirle que se borre. Ejemplo:
   > Tus datos los usa la E.E.S.T. N°4 solo para controlar el ingreso a la Muestra Educativa. Se borran a los 30 días. Para consultas: [contacto].
3. **Finalidad.** Los datos no se usan para otra cosa (ni listas de difusión, ni estadísticas con nombre).
4. **Menores.** El nombre, año y división del alumno son datos de un menor: mostrarlos solo a la recepción con PIN, nunca en pantallas públicas.
5. **Acceso restringido.** Solo la recepción (con PIN) ve el listado. La pantalla pública de un visitante muestra solo sus propios datos, y para volver a verlos hay que saber DNI + nombre + apellido.
6. **Plazo de conservación.** Definir una fecha de borrado (por ejemplo, 30 días después del evento) y cumplirla: vaciar tablas, borrar backups y exportaciones.
7. **Seguridad.** Cifrado en tránsito (HTTPS), base sin acceso desde internet, contraseñas fuera del código, PIN cifrado.
8. **Derechos.** Si alguien pide ver, corregir o borrar sus datos, la recepción puede hacerlo desde el panel (editar / eliminar) o el administrador desde la base.

## En el celular del visitante
- La pantalla verde guarda en `localStorage` solo los datos del pase, con vencimiento (12 h) y opción de "Quitar de este celular" y "Empezar de nuevo". Avisar en el formulario que, si se usa un celular prestado, se puede borrar al final.

## Checklist para entregar
- [ ] Cada campo del formulario tiene justificación.
- [ ] Aviso de privacidad visible antes de enviar.
- [ ] Fecha de borrado definida y responsable asignado.
- [ ] Panel solo con PIN; nada de datos de alumnos en páginas públicas.
- [ ] Backups cifrados y con fecha de borrado.
- [ ] HTTPS activo.
