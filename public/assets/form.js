(() => {
  const $ = (s) => document.querySelector(s);
  const form = $('#form');
  const viewForm = $('#view-form');
  const viewPass = $('#view-pass');
  const alumnoBox = $('#alumno-box');
  const submitBtn = $('#submit');
  const formError = $('#form-error');
  // Pases de todas las personas registradas desde este celular (solo en el navegador, no en el servidor)
  const STORAGE_KEY = 'tec4_muestra_pases';
  const STORAGE_VIEJO = 'tec4_muestra_registro'; // versión anterior: guardaba un solo pase
  const VIGENCIA_MS = 12 * 60 * 60 * 1000;       // la lista dura 12 h desde el último registro
  const MAX_PASES = 4; // máximo de personas que un mismo celular puede registrar
  // DNI que tenga sentido para alguien que vive en Argentina (lo mismo revisa el servidor)
  const DNI_MIN = 2000000, DNI_MAX_ARG = 64999999, DNI_EXTRANJERO = 90000000;
  const dniPlausible = (n) => n >= DNI_MIN && !(n > DNI_MAX_ARG && n < DNI_EXTRANJERO);

  // Guiño a la rivalidad: si alguien se anota con nombre de jugador de Racing, la pantalla
  // parpadea en rojo un segundo antes de mostrar el aviso de que no puede registrarse.
  function flashRacing() {
    const d = document.createElement('div');
    d.className = 'flash-racing';
    d.textContent = 'Racing no 🔴';
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 1300);
  }

  // Logos: si no cargan, se quitan en lugar de mostrar el ícono de imagen rota
  document.querySelectorAll('img[data-opcional]').forEach((img) => {
    const quitar = () => img.remove();
    if (img.complete && !img.naturalWidth) quitar();
    else img.addEventListener('error', quitar);
  });

  /* ---------- Título tipo máquina de escribir (como el sitio de la escuela) ---------- */
  const typed = $('#typed');
  const texto = 'Muestra educativa';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    typed.textContent = texto;
  } else {
    let i = 0;
    const tick = () => {
      typed.textContent = texto.slice(0, ++i);
      if (i < texto.length) setTimeout(tick, 70);
    };
    setTimeout(tick, 250);
  }

  /* ---------- Mostrar campos del alumno ---------- */
  const actualizarAlumno = () => {
    const si = form.conAlumno.value === 'si';
    alumnoBox.hidden = !si;
    form.alumno.required = si;
    form.curso.required = si;
    form.division.required = si;
    form.parentesco.required = si;
    if (si) form.alumno.focus({ preventScroll: true });
  };
  form.addEventListener('change', (e) => {
    if (e.target.name === 'conAlumno') { limpiarError('conAlumno'); actualizarAlumno(); }
  });

  // DNI: solo números
  form.dni.addEventListener('input', () => {
    const limpio = form.dni.value.replace(/\D/g, '');
    if (limpio !== form.dni.value) form.dni.value = limpio;
  });

  // Nombres: solo letras (con tildes, ñ y ü) y espacios. Números y símbolos no se pueden escribir.
  // El servidor vuelve a revisar lo mismo, por si alguien manda datos sin usar este formulario.
  const NO_LETRA = /[^A-Za-zÀ-ÖØ-öø-ÿ ]/g;
  const SOLO_LETRAS = /^[A-Za-zÀ-ÖØ-öø-ÿ]+( [A-Za-zÀ-ÖØ-öø-ÿ]+)*$/;
  for (const campo of [form.nombre, form.apellido, form.alumno]) {
    campo.addEventListener('input', () => {
      const limpio = campo.value.normalize('NFC').replace(NO_LETRA, '').replace(/ {2,}/g, ' ').replace(/^ /, '');
      if (limpio !== campo.value) campo.value = limpio;
    });
  }

  form.addEventListener('input', (e) => limpiarError(e.target.name));

  /* ---------- Errores ---------- */
  function limpiarError(nombre) {
    const field = form.querySelector(`[data-field="${nombre}"]`);
    if (!field) return;
    field.classList.remove('has-error');
    field.querySelector('.field-error')?.remove();
  }
  function mostrarErrores(errores) {
    form.querySelectorAll('.field.has-error').forEach((f) => f.classList.remove('has-error'));
    form.querySelectorAll('.field-error').forEach((p) => p.remove());
    let primero = null;
    for (const [nombre, msg] of Object.entries(errores)) {
      const field = form.querySelector(`[data-field="${nombre}"]`);
      if (!field) continue;
      field.classList.add('has-error');
      const p = document.createElement('p');
      p.className = 'field-error';
      p.textContent = msg;
      field.appendChild(p);
      primero ||= field;
    }
    if (primero) {
      primero.scrollIntoView({ behavior: 'smooth', block: 'center' });
      primero.querySelector('input, select')?.focus({ preventScroll: true });
    }
  }

  function validar(d) {
    const e = {};
    if (d.nombre.length < 2) e.nombre = 'Escribí tu nombre.';
    else if (!SOLO_LETRAS.test(d.nombre)) e.nombre = 'El nombre solo puede tener letras y espacios.';
    if (d.apellido.length < 2) e.apellido = 'Escribí tu apellido.';
    else if (!SOLO_LETRAS.test(d.apellido)) e.apellido = 'El apellido solo puede tener letras y espacios.';
    if (!/^\d{7,8}$/.test(d.dni)) e.dni = 'El DNI tiene que tener 7 u 8 números.';
    else if (!dniPlausible(Number(d.dni))) e.dni = 'Revisá el DNI: ese número no corresponde a un documento válido.';
    if (d.conAlumno === null) e.conAlumno = 'Elegí Sí o No.';
    if (d.conAlumno) {
      if (d.alumno.length < 2) e.alumno = 'Escribí el nombre del alumno.';
      else if (!SOLO_LETRAS.test(d.alumno)) e.alumno = 'El nombre del alumno solo puede tener letras y espacios.';
      if (!d.curso) e.curso = 'Elegí el año.';
      if (!d.division) e.division = 'Elegí la división.';
      if (!d.parentesco) e.parentesco = 'Elegí el parentesco.';
    }
    return e;
  }

  /* ---------- Envío ---------- */
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    formError.hidden = true;

    const valor = form.conAlumno.value;
    const datos = {
      nombre: form.nombre.value.trim(),
      apellido: form.apellido.value.trim(),
      dni: form.dni.value.replace(/\D/g, ''),
      conAlumno: valor === 'si' ? true : valor === 'no' ? false : null,
      alumno: form.alumno.value.trim(),
      curso: Number(form.curso.value) || null,
      division: Number(form.division.value) || null,
      parentesco: form.parentesco.value,
    };

    const errores = validar(datos);
    if (Object.keys(errores).length) return mostrarErrores(errores);

    submitBtn.disabled = true;
    submitBtn.querySelector('span').textContent = 'Registrando…';
    try {
      const r = await fetch('api/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
      const data = await r.json().catch(() => null);
      // Si la respuesta no llegó entera (señal débil, servidor lento), el registro puede haberse
      // guardado igual. Volver a tocar Registrarme es seguro: con los mismos datos muestra esa entrada.
      if (!data || (r.ok && !data.visitante)) throw new Error('sin-respuesta');
      if (!r.ok) {
        if (data.racing) flashRacing(); // quiso anotarse con nombre de jugador de Racing
        if (data.errores) mostrarErrores(data.errores);
        throw new Error(data.error || 'No se pudo registrar.');
      }
      if (data.racing) flashRacing(); // se anotó con nombre de jugador de Racing: flash rojo y después su pase
      agregarPase({ ...data.visitante, duplicado: data.duplicado });
    } catch (err) {
      const cortado = err.message === 'sin-respuesta' || err instanceof TypeError; // TypeError = fetch sin respuesta
      formError.textContent = !navigator.onLine
        ? 'No hay conexión a internet. Revisá los datos móviles o el Wi-Fi y tocá Registrarme otra vez.'
        : cortado
          ? 'No llegó la confirmación del servidor. Tocá Registrarme otra vez: si ya quedaste registrado, vas a ver tu entrada (no se duplica).'
          : err.message;
      formError.hidden = false;
      formError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } finally {
      submitBtn.disabled = false;
      submitBtn.querySelector('span').textContent = 'Registrarme';
    }
  });

  /* ---------- Pases guardados en este celular ---------- */
  // { pases: [...], actual: índice que se está mirando, actualizado: ms del último registro, pista: ya se mostró la animación }
  let lista = { pases: [], actual: 0, actualizado: 0, pista: false };

  // Solo los datos que muestra el pase. Lo que venga de localStorage se revisa: alguien pudo haberlo tocado.
  function limpiarPase(v) {
    if (!v || typeof v !== 'object' || !Number.isInteger(v.id) || typeof v.nombre !== 'string' || typeof v.dni !== 'string') return null;
    const txt = (x) => (typeof x === 'string' ? x.slice(0, 120) : null);
    const num = (x) => (Number.isInteger(x) ? x : null);
    return {
      id: v.id, nombre: txt(v.nombre), apellido: txt(v.apellido) || '', dni: v.dni.replace(/\D/g, '').slice(0, 8),
      conAlumno: v.conAlumno === true, alumno: txt(v.alumno), curso: num(v.curso), division: num(v.division),
      parentesco: txt(v.parentesco), createdMs: num(v.createdMs), duplicado: v.duplicado === true,
    };
  }

  function guardar() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(lista)); } catch {}
  }

  function cargar() {
    try {
      const g = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (g && Array.isArray(g.pases) && Date.now() - g.actualizado < VIGENCIA_MS) {
        const pases = g.pases.map(limpiarPase).filter(Boolean).slice(-MAX_PASES);
        if (pases.length) {
          lista = { pases, actual: Math.min(Math.max(0, g.actual | 0), pases.length - 1), actualizado: g.actualizado, pista: g.pista === true };
          return;
        }
      }
      // El pase que haya dejado la versión anterior (uno solo) pasa a ser el primero de la lista
      const viejo = JSON.parse(localStorage.getItem(STORAGE_VIEJO) || 'null');
      localStorage.removeItem(STORAGE_VIEJO);
      const p = limpiarPase(viejo);
      if (p && Date.now() - viejo.guardado < VIGENCIA_MS) {
        lista = { pases: [p], actual: 0, actualizado: viejo.guardado, pista: false };
        guardar();
      } else if (g) {
        localStorage.removeItem(STORAGE_KEY); // vencida
      }
    } catch {}
  }

  function agregarPase(v) {
    const p = limpiarPase(v);
    if (!p) return;
    // Si ese registro ya estaba en la lista (misma persona: mismo DNI, nombre y apellido), se
    // actualiza en su lugar. Mismo DNI con otro nombre es otra persona y se agrega aparte.
    const i = lista.pases.findIndex((x) => x.id === p.id);
    let aviso = '';
    if (i >= 0) {
      lista.pases[i] = p;
      lista.actual = i;
    } else {
      lista.pases.push(p);
      if (lista.pases.length > MAX_PASES) lista.pases.shift();
      lista.actual = lista.pases.length - 1;
      if (lista.pases.length > 1) aviso = `${primerNombre(p)} agregado · ya son ${lista.pases.length}.`;
    }
    lista.actualizado = Date.now();
    guardar();
    mostrarPases({ aviso });
  }

  /* ---------- Pantalla verde ---------- */
  const fmtDni = (dni) => Number(dni).toLocaleString('es-AR');
  const fmtHora = (ms) => new Date(ms).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const primerNombre = (v) => v.nombre.split(' ')[0];
  const sinMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const track = $('#pass-track');
  let avisoTimer;

  function el(tag, cls, texto) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (texto != null) n.textContent = texto;
    return n;
  }

  // Nombre corto para los chips; si dos se llaman igual, se agrega la inicial del apellido
  function nombresCortos() {
    const nombres = lista.pases.map(primerNombre);
    return lista.pases.map((v, i) =>
      nombres.filter((n) => n === nombres[i]).length > 1 && v.apellido ? `${nombres[i]} ${v.apellido[0]}.` : nombres[i]);
  }

  function tarjeta(v, i, n) {
    const t = el('article', 'pass-ticket');
    t.setAttribute('role', 'group');
    t.setAttribute('aria-roledescription', 'pase');
    t.setAttribute('aria-label', n > 1 ? `Persona ${i + 1} de ${n}: ${v.nombre} ${v.apellido}` : `${v.nombre} ${v.apellido}`);
    if (n > 1) t.append(el('span', 'pass-badge', `${i + 1} de ${n}`));
    if (v.duplicado) t.append(el('p', 'pass-dup', 'Este DNI ya estaba registrado. Estos son los datos.'));
    t.append(el('p', 'pass-name', `${v.nombre} ${v.apellido}`));
    const curso = v.curso && v.division ? ` (${v.curso}° ${v.division}ª)` : '';
    const dl = el('dl', 'pass-grid');
    const dato = (dt, dd, cls) => {
      const d = el('div', cls);
      d.append(el('dt', null, dt), el('dd', dt === 'Visita' ? null : 'pass-num', dd));
      dl.append(d);
    };
    dato('DNI', fmtDni(v.dni));
    dato('Registro', `#${String(v.id).padStart(4, '0')}`);
    dato('Visita', v.conAlumno ? `${v.parentesco} de ${v.alumno}${curso}` : 'Invitado general / Sin alumno', 'wide');
    dato('Hora', v.createdMs ? fmtHora(v.createdMs) : '');
    t.append(dl);
    if (n > 1) {
      const q = el('button', 'pass-quitar', 'Quitar de este celular');
      q.type = 'button';
      q.dataset.quitar = String(i);
      t.append(q);
    }
    return t;
  }

  function mostrarPases({ aviso = '' } = {}) {
    const n = lista.pases.length;
    if (!n) return mostrarFormulario();
    const varios = n > 1;

    // Con varias personas: "3" grande al lado de la tilde y "personas registradas" al costado
    $('#pass-count').textContent = String(n);
    $('#pass-count').hidden = !varios;
    $('.pass-head').classList.toggle('varios', varios);
    $('#pass-title').textContent = varios ? 'personas registradas' : 'Registrado';
    $('#pass-title').setAttribute('aria-label', varios ? `${n} personas registradas` : 'Registrado');
    $('#pass-sub').textContent = varios ? 'Mostrá cada pase en la puerta.' : 'Mostrá esta pantalla en la puerta.';

    track.classList.toggle('varios', varios);
    track.replaceChildren(...lista.pases.map((v, i) => tarjeta(v, i, n)));
    if (varios) {
      track.setAttribute('role', 'region');
      track.setAttribute('aria-roledescription', 'carrusel');
      track.setAttribute('aria-label', 'Pases de las personas registradas. Deslizá para ver cada uno.');
      track.tabIndex = 0;
    } else {
      ['role', 'aria-roledescription', 'aria-label'].forEach((a) => track.removeAttribute(a));
      track.tabIndex = -1;
    }

    const cortos = nombresCortos();
    $('#pass-chips').replaceChildren(...cortos.map((nombre, i) => {
      const c = el('button', 'pass-chip', nombre);
      c.type = 'button';
      c.setAttribute('role', 'tab');
      c.dataset.ir = String(i);
      return c;
    }));
    $('#pass-dots').replaceChildren(...lista.pases.map(() => el('span')));
    $('#pass-chips').hidden = !varios;
    $('#pass-nav').hidden = !varios;

    const lleno = n >= MAX_PASES;
    $('#otra').disabled = lleno;
    $('#pass-limite').hidden = !lleno;
    $('#pass-limite').textContent = `Ya hay ${MAX_PASES} personas en este celular. Para registrar a más, usá otro celular.`;
    $('#pass-reset').hidden = !varios;

    const a = $('#pass-aviso');
    clearTimeout(avisoTimer);
    a.textContent = aviso;
    a.hidden = !aviso;
    if (aviso) avisoTimer = setTimeout(() => (a.hidden = true), 6000);

    viewForm.hidden = true;
    viewPass.hidden = false;
    document.querySelector('meta[name="theme-color"]').content = '#14773f';
    window.scrollTo(0, 0);

    // Ir al pase actual sin animación y actualizar chips, puntos y textos
    requestAnimationFrame(() => {
      irA(lista.actual, false);
      marcar(lista.actual);
      if (varios && !lista.pista && !sinMovimiento) insinuar();
    });
  }

  function irA(i, suave = true) {
    const card = track.children[i];
    if (!card) return;
    track.scrollTo({ left: card.offsetLeft - track.firstElementChild.offsetLeft, behavior: suave && !sinMovimiento ? 'smooth' : 'auto' });
  }

  // Actualiza todo lo que indica en qué persona estás
  function marcar(i) {
    const n = lista.pases.length;
    if (i !== lista.actual) { lista.actual = i; guardar(); }
    $('#pass-chips').querySelectorAll('.pass-chip').forEach((c, k) => {
      c.setAttribute('aria-selected', String(k === i));
      if (k === i) c.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
    $('#pass-dots').querySelectorAll('span').forEach((d, k) => d.classList.toggle('on', k === i));
    $('#pass-prev').disabled = i === 0;
    $('#pass-next').disabled = i === n - 1;

    if (n > 1) {
      const v = lista.pases[i];
      $('#pass-live').textContent = `Persona ${i + 1} de ${n}: ${v.nombre} ${v.apellido}`;
    }
  }

  // La primera vez que hay varios pases, la card se corre un poco y vuelve: muestra que se puede deslizar
  function insinuar() {
    lista.pista = true;
    guardar();
    const desde = track.scrollLeft;
    const hacia = lista.actual < lista.pases.length - 1 ? desde + 60 : desde - 60;
    setTimeout(() => {
      track.scrollTo({ left: hacia, behavior: 'smooth' });
      setTimeout(() => track.scrollTo({ left: desde, behavior: 'smooth' }), 450);
    }, 700);
  }

  // Al deslizar con el dedo: detectar qué card quedó a la vista
  let scrollTimer;
  track.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      const base = track.firstElementChild?.offsetLeft || 0;
      let mejor = 0;
      [...track.children].forEach((c, k) => {
        if (Math.abs(c.offsetLeft - base - track.scrollLeft) < Math.abs(track.children[mejor].offsetLeft - base - track.scrollLeft)) mejor = k;
      });
      if (lista.pases.length > 1) marcar(mejor);
    }, 80);
  }, { passive: true });

  $('#pass-prev').addEventListener('click', () => irA(lista.actual - 1));
  $('#pass-next').addEventListener('click', () => irA(lista.actual + 1));
  $('#pass-chips').addEventListener('click', (e) => {
    const c = e.target.closest('[data-ir]');
    if (c) irA(Number(c.dataset.ir));
  });
  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); irA(Math.min(lista.actual + 1, lista.pases.length - 1)); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); irA(Math.max(lista.actual - 1, 0)); }
  });

  track.addEventListener('click', (e) => {
    const q = e.target.closest('[data-quitar]');
    if (!q) return;
    const i = Number(q.dataset.quitar);
    const v = lista.pases[i];
    if (!v || !confirm(`¿Quitar a ${v.nombre} ${v.apellido} de este celular?\n\nEl registro sigue anotado en la muestra; solo deja de verse acá.`)) return;
    lista.pases.splice(i, 1);
    lista.actual = Math.min(i, lista.pases.length - 1);
    guardar();
    mostrarPases();
  });

  $('#pass-reset').addEventListener('click', () => {
    const n = lista.pases.length;
    if (!confirm(`¿Borrar los ${n} pases de este celular?\n\nLos registros siguen anotados en la muestra; solo dejan de verse acá.`)) return;
    lista = { pases: [], actual: 0, actualizado: 0, pista: false };
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    mostrarFormulario();
  });

  /* ---------- Volver al formulario ---------- */
  function mostrarFormulario() {
    form.reset();
    actualizarAlumno();
    const n = lista.pases.length;
    $('#volver-pases').hidden = !n;
    $('#volver-pases-txt').textContent = n === 1 ? 'Ver mi pase' : `Ver los ${n} pases de este celular`;
    viewPass.hidden = true;
    viewForm.hidden = false;
    document.querySelector('meta[name="theme-color"]').content = '#0f2d52';
    window.scrollTo(0, 0);
    if (n) form.nombre.focus({ preventScroll: true });
  }

  $('#otra').addEventListener('click', mostrarFormulario);
  $('#volver-pases').addEventListener('click', () => mostrarPases());

  // Si recargan la página, los pases siguen visibles
  cargar();
  if (lista.pases.length) mostrarPases();
})();
