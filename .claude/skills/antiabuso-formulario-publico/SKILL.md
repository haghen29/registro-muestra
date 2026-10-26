---
name: antiabuso-formulario-publico
description: Defensas contra abuso de formularios públicos sin login (registro por QR en eventos): registros masivos por script, bots, spam, registros de broma y agotamiento del hosting. Usar al diseñar o revisar un endpoint público de alta, cuando aparecen registros falsos en cantidad, o al preparar la app para un evento con mucha gente en el mismo Wi-Fi.
---

# Antiabuso en el formulario público

Actuás como ingeniero de seguridad que equilibra **bloquear abusos** con **no frenar a la fila de la puerta**. En un evento escolar muchas personas comparten el Wi-Fi (misma IP pública), así que cualquier límite por IP tiene que ser generoso.

## Capas, de la más liviana a la más pesada

1. **Validación estricta en el servidor** (ya existente): tipos, largos, solo letras, DNI numérico, listas cerradas, famosos bloqueados.
2. **Campo trampa (honeypot):** un input oculto con CSS (`name="sitio_web"`, `tabindex="-1"`, `autocomplete="off"`). Si llega con contenido, se responde como si todo saliera bien pero no se guarda. Frena la mayoría de los bots simples sin molestar a nadie.
3. **Tiempo mínimo de llenado:** el formulario manda el momento en que se abrió; si se envió en menos de 2 o 3 segundos, es un script. Responder igual que el honeypot.
4. **Límite de registros por IP:** por ejemplo, 30 por minuto y 300 por hora por IP (alto por el Wi-Fi compartido). Al pasarse: `429` con un mensaje claro ("Muchos registros seguidos, esperá un minuto"). Guardar contadores en una tabla (`intentos_registro`) con ventana deslizante, igual que el bloqueo del PIN.
5. **Límite global:** si en un minuto entran más registros que la capacidad real de la puerta (por ejemplo, 200), marcar los siguientes como "A revisar" en vez de rechazarlos.
6. **CAPTCHA solo como último recurso** y solo si los ataques siguen: complica a gente mayor y a quien no ve bien. Si hace falta, uno sin desafío visible (Cloudflare Turnstile) y solo después de superar un límite.
7. **Monitoreo durante el evento:** el contador del panel muestra registros por minuto; si se dispara, la recepción avisa.

## Reglas
- Nunca revelar por qué se bloqueó (no ayudar al atacante a ajustar el script).
- Los rechazos por abuso no deben borrar ni modificar registros existentes.
- El reintento legítimo (misma persona, mismos datos) tiene que seguir funcionando: devuelve su entrada sin duplicar.
- Todo límite se prueba con varias pestañas/dispositivos simulando la puerta.

## Cómo probar
- Script que manda 100 registros distintos seguidos desde una IP → a partir del límite, `429`.
- Formulario con el honeypot lleno → responde 201 pero no aparece en el panel.
- Registro enviado a los 0,5 s de abrir → igual que el honeypot.
- 20 celulares reales en el mismo Wi-Fi registrándose a la vez → todos pasan.
