---
name: respuesta-a-incidentes-evento
description: Plan de respuesta a incidentes de seguridad u operación durante un evento con registro digital en la puerta (muestra escolar, feria): PIN filtrado, registros falsos masivos, caída del servidor o de la base, pérdida de conexión, datos expuestos. Usar al preparar el día del evento, al escribir el plan de contingencia, o cuando ocurre un problema en vivo.
---

# Respuesta a incidentes el día del evento

Actuás como coordinador técnico del evento. Prioridad: **que la gente pueda entrar**; después, contener y corregir.

## Antes del evento
- Responsable técnico con acceso al servidor, a la base y al panel (y un suplente).
- PIN cambiado (no 1111) y compartido solo con la recepción.
- Backup de la base hecho y probado.
- **Plan B en papel:** planilla impresa (nombre, apellido, DNI, a quién viene) y lapiceras en la puerta.
- Datos móviles como respaldo del Wi-Fi para los dispositivos de recepción.
- Teléfono del responsable técnico pegado en la mesa de recepción.

## Incidentes y qué hacer

| Incidente | Señal | Acción inmediata | Después |
|---|---|---|---|
| PIN filtrado | Alguien ajeno entra al panel o se ven cambios raros | Cambiar el PIN desde la llave del panel; avisar a la recepción | Revisar el historial de fusiones y deshacer lo indebido |
| Registros falsos en masa | El contador "Registrados" sube muy rápido; nombres raros | Seguir trabajando con **Por ingresar** y el buscador por DNI; anotar la hora | Bloquear IPs en el servidor; eliminar los falsos; activar límites |
| Se cae la base / "No se pudo guardar el registro" | Errores en el formulario y el panel | Pasar al plan B en papel; reiniciar MariaDB | Cargar a mano lo anotado en papel; revisar logs |
| Se cae el servidor web | La página no carga | Plan B en papel | Revisar Apache, espacio en disco, certificado |
| Sin internet en la puerta | El panel dice "Sin conexión" | Datos móviles en el dispositivo de recepción; si no, papel | — |
| Datos expuestos (captura del panel en redes, archivo filtrado) | Aviso de alguien | Pedir que se baje; cambiar PIN y contraseñas | Informar a la dirección de la escuela; registrar qué se expuso y a quién |
| Celular de visitante sin pase | "No llegó la confirmación" | Volver a tocar Registrarme (no duplica) o buscarlo por DNI en el panel | — |

## Registro del incidente
Anotar: hora, qué se vio, quién lo detectó, qué se hizo, cuándo se resolvió. Sirve para el informe final y para mejorar la próxima edición.

## Después del evento
- Cambiar PIN y contraseñas.
- Backup final y borrado de datos según el plazo definido (ver protección de datos).
- Reunión corta: qué falló, qué funcionó, qué cambiar.
