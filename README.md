# registro-muestra
## Sobre este proyecto

### El problema
La E.E.S.T. N°4 de Berazategui organiza una Muestra Educativa abierta a la comunidad. En la entrada se forma fila: hay que anotar a cada visitante, saber a qué alumno viene a ver y controlar que nadie entre dos veces. Hacerlo en papel es lento y propenso a errores, sobre todo en los momentos de más gente.

### La solución
Una aplicación web que digitaliza todo el ingreso:

- **El visitante se registra solo.** Escanea un código QR con su celular, completa un formulario corto (nombre, apellido, DNI y a qué alumno viene a ver) y recibe una pantalla de confirmación para mostrar en la puerta. No tiene que instalar nada.
- **La recepción ve todo en tiempo real.** Los alumnos a cargo de la puerta usan un panel desde una tablet, un celular o una notebook. Cada registro nuevo aparece al instante, se encuentra en segundos por apellido o DNI, y con un toque se marca que la persona ya ingresó. Si dos recepcionistas trabajan a la vez, ven lo mismo y se evita que alguien entre dos veces.
- **Los datos quedan ordenados.** El sistema agrupa a los familiares por alumno y detecta inconsistencias: personas anotadas dos veces, nombres de alumnos escritos de distintas formas o registros de broma. La recepción las corrige o las une sin perder información, y cualquier cambio se puede deshacer.

### Por qué está pensada así
- **Primero el celular:** casi todos los visitantes llegan con uno, así que el formulario está diseñado para pantallas chicas.
- **Pensada para usarse al aire libre:** colores de alto contraste y botones grandes, para leer bien con sol y operar rápido.
- **Sin fricción para el visitante:** el registro lleva menos de un minuto, y el control de registros sospechosos funciona en segundo plano, sin bloquear a nadie.
- **Dos versiones:** una completa con el módulo de inconsistencias y una simple solo con registro y control de ingreso, según lo que necesite cada evento.

### Resultado
Un ingreso más rápido y ordenado, menos trabajo manual para los recepcionistas y un registro digital de quién asistió y a quién vino a ver, listo para consultar después del evento.

### Tecnología (resumen)
Aplicación web con HTML, CSS y JavaScript, servidor en Node.js y base de datos MariaDB. Funciona en cualquier navegador y no necesita que nadie instale una app.
