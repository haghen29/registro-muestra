(() => {
  const $ = (s) => document.querySelector(s);
  const POLL_MS = 2000;
  const PIN_KEY = 'tec4_admin_pin';
  const IGN_KEY = 'tec4_no_repetidos';

  const state = {
    pin: '',
    items: new Map(),    // id -> visitante
    cursor: null,
    filtro: 'todos',
    q: '',
    tab: 'v',
    timer: null,
    primeraCarga: true,
    nuevos: new Set(),
    enCurso: new Set(),  // ids con check-in en proceso
    sel: new Set(),      // alumnos marcados para fusionar (claves normalizadas)
    aCurso: '',          // filtro de la pestaña Alumnos ("7-2"; vacío = todos)
    aFoco: null,         // alumno a resaltar al llegar desde la lista de visitantes
    editando: null,      // id en el diálogo de edición
    elegirBase: null,    // id base al elegir con quién fusionar
    fv: null,            // { aId, bId, elegir }
    fa: null,            // { claves, variantes, familiares }
  };

  try { state.pin = sessionStorage.getItem(PIN_KEY) || ''; } catch {}

  // Logos: si no cargan, se quitan en lugar de mostrar el ícono de imagen rota
  document.querySelectorAll('img[data-opcional]').forEach((img) => {
    const quitar = () => img.remove();
    if (img.complete && !img.naturalWidth) quitar();
    else img.addEventListener('error', quitar);
  });
  // Pares marcados como "no es repetido" en este dispositivo
  let ignorados = new Set();
  try { ignorados = new Set(JSON.parse(localStorage.getItem(IGN_KEY) || '[]')); } catch {}
  const guardarIgnorados = () => { try { localStorage.setItem(IGN_KEY, JSON.stringify([...ignorados])); } catch {} };

  /* ================= Utilidades ================= */
  const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const fmtDni = (dni) => (/^\d+$/.test(dni) ? Number(dni).toLocaleString('es-AR') : dni);
  const fmtHora = (ms) => new Date(ms).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const cursoClave = (v) => (v.curso && v.division ? `${v.curso}-${v.division}` : '');
  const cursoNombre = (k) => (k ? `${k.split('-')[0]}° ${k.split('-')[1]}ª` : 'Sin curso');
  const visitaTxt = (v) => (v.conAlumno
    ? `${v.parentesco} de ${v.alumno}${cursoClave(v) ? ` · ${cursoNombre(cursoClave(v))}` : ''}`
    : 'Invitado general');
  const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;

  // Distancia de edición (cuántas letras hay que cambiar para pasar de a a b)
  function lev(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[b.length];
  }

  function el(tag, attrs = {}, ...hijos) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k.includes('-')) n.setAttribute(k, v);
      else n[k] = v;
    }
    for (const h of hijos.flat()) if (h != null && h !== false) n.append(h);
    return n;
  }
  const icon = (name) => el('i', { class: 'ms', 'aria-hidden': 'true' }, name);

  let toastTimer;
  function toast(msg, { warn = false, accion = null } = {}) {
    const t = $('#toast');
    t.replaceChildren(el('span', {}, msg));
    if (accion) {
      t.append(el('button', { type: 'button', onclick: () => { t.hidden = true; accion.fn(); } }, accion.texto));
    }
    t.classList.toggle('warn', warn);
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), accion ? 9000 : 3500);
  }

  async function api(path, opts = {}) {
    const r = await fetch(path, {
      ...opts,
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'x-admin-pin': state.pin },
    });
    const data = await r.json().catch(() => ({}));
    if (r.status === 401 || r.status === 429) {
      cerrar(r.status === 429 ? data.error : 'PIN incorrecto. Probá de nuevo.');
      const e = new Error('auth'); e.auth = true; throw e;
    }
    return { status: r.status, data };
  }
  const post = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body) });

  function errorDeRed(err) {
    if (!err.auth) toast('Sin conexión. Probá de nuevo cuando vuelva la señal.', { warn: true });
  }

  /* ================= Login ================= */
  // PIN: solo números, de 4 a 8 cifras (lo mismo exige el servidor)
  const PIN_OK = /^\d{4,8}$/;
  const soloNumeros = (input) => input.addEventListener('input', () => { input.value = input.value.replace(/\D/g, '').slice(0, 8); });
  soloNumeros($('#pin'));

  $('#login').addEventListener('submit', (e) => {
    e.preventDefault();
    const pin = $('#pin').value;
    if (!PIN_OK.test(pin)) {
      const err = $('#login-error');
      err.textContent = 'El PIN es solo de números, de 4 a 8 cifras.';
      err.hidden = false;
      return;
    }
    state.pin = pin;
    abrir();
  });

  function abrir() {
    $('#login-error').hidden = true;
    $('#login-btn').disabled = true;
    state.items.clear();
    state.cursor = null;
    state.primeraCarga = true;
    poll();
  }

  function cerrar(msg) {
    clearTimeout(state.timer);
    state.pin = '';
    try { sessionStorage.removeItem(PIN_KEY); } catch {}
    document.querySelectorAll('dialog[open]').forEach((d) => d.close());
    $('#view-panel').hidden = true;
    $('#view-login').hidden = false;
    $('#login-btn').disabled = false;
    $('#pin').value = '';
    const err = $('#login-error');
    err.textContent = msg || '';
    err.hidden = !msg;
    $('#pin').focus();
  }
  $('#logout').addEventListener('click', () => cerrar());

  /* ================= Sincronización ================= */
  function setLive(ok) {
    const l = $('#live');
    l.classList.toggle('on', ok);
    l.classList.toggle('off', !ok);
    $('#live-text').textContent = ok ? 'En vivo' : 'Sin conexión, reintentando…';
  }

  async function poll() {
    clearTimeout(state.timer);
    if (!state.pin) return;
    try {
      const qs = state.cursor ? `?since=${encodeURIComponent(state.cursor)}` : '';
      const { status, data } = await api(`/api/visitantes${qs}`);
      if (status !== 200) throw new Error(data.error || 'Error del servidor');

      if (state.primeraCarga) {
        try { sessionStorage.setItem(PIN_KEY, state.pin); } catch {}
        $('#view-login').hidden = true;
        $('#view-panel').hidden = false;
        medirTopbar();
      }

      let cambios = state.primeraCarga;
      for (const v of data.visitantes) {
        const previo = state.items.get(v.id);
        if (v.eliminado) {
          if (previo) { state.items.delete(v.id); cambios = true; }
          if (state.editando === v.id && $('#dlg-editar').open) {
            $('#dlg-editar').close();
            toast('Ese registro lo eliminaron o fusionaron desde otro dispositivo.', { warn: true });
          }
          continue;
        }
        if (!previo && !state.primeraCarga) state.nuevos.add(v.id);
        if (!previo || JSON.stringify(previo) !== JSON.stringify(v)) cambios = true;
        state.items.set(v.id, v);
      }
      state.cursor = data.cursor;
      state.primeraCarga = false;
      setLive(true);
      if (cambios) render();
    } catch (e) {
      if (e.auth) return;
      if (state.primeraCarga) {
        $('#login-btn').disabled = false;
        const err = $('#login-error');
        err.textContent = 'No se pudo conectar con el servidor. Revisá la conexión y probá de nuevo.';
        err.hidden = false;
        return;
      }
      setLive(false);
    }
    if (!document.hidden) state.timer = setTimeout(poll, POLL_MS);
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && state.pin && !state.primeraCarga) poll();
  });

  /* ================= Datos derivados ================= */
  // Alumnos: agrupa a los familiares por cómo escribieron el nombre (sin tildes ni mayúsculas)
  function grupos() {
    const m = new Map();
    for (const v of state.items.values()) {
      if (!v.conAlumno || !v.alumno) continue;
      const k = norm(v.alumno);
      if (!m.has(k)) m.set(k, { clave: k, variantes: new Map(), cursos: new Map(), familiares: [] });
      const g = m.get(k);
      g.variantes.set(v.alumno, (g.variantes.get(v.alumno) || 0) + 1);
      const c = cursoClave(v);
      if (c) g.cursos.set(c, (g.cursos.get(c) || 0) + 1);
      g.familiares.push(v);
    }
    for (const g of m.values()) {
      g.nombre = mejorVariante(g.variantes);
      // El curso que puso la mayoría de los familiares
      g.curso = [...g.cursos.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    }
    return m;
  }
  const ordenCurso = (a, b) => (!a) - (!b) || a.localeCompare(b, 'es', { numeric: true });
  // La forma más usada; si empatan, la que tiene tildes o mayúsculas
  function mejorVariante(variantes) {
    return [...variantes.entries()].sort((a, b) =>
      b[1] - a[1] ||
      (/[^\x00-\x7f]/.test(b[0]) - /[^\x00-\x7f]/.test(a[0])) ||
      ((/[A-Z]/.test(b[0]) ? 1 : 0) - (/[A-Z]/.test(a[0]) ? 1 : 0)) ||
      b[0].length - a[0].length
    )[0][0];
  }

  function alumnosParecidos(a, b) {
    const ta = a.split(' '), tb = b.split(' ');
    const sa = new Set(ta), sb = new Set(tb);
    const contenido = (x, y) => [...x].every((t) => y.has(t));
    if (contenido(sa, sb) || contenido(sb, sa)) return true;            // "tomas" / "fernandez tomas"
    const tope = Math.max(a.length, b.length) >= 10 ? 2 : 1;
    if (Math.min(a.length, b.length) >= 5 && lev(a, b) <= tope) return true; // errores de tipeo
    if (ta.length > 1 && tb.length > 1 && lev(ta.at(-1), tb.at(-1)) <= 1) {  // mismo apellido
      const p = Math.min(3, ta[0].length, tb[0].length);
      if (p >= 3 && ta[0].slice(0, p) === tb[0].slice(0, p)) return true;     // "tomi" / "tomas"
    }
    return false;
  }

  // Por qué dos visitantes parecen la misma persona: 'nombre' | 'dni' | 'casi' | null
  function tipoParecido(x, y) {
    const nx = norm(`${x.nombre} ${x.apellido}`), ny = norm(`${y.nombre} ${y.apellido}`);
    if (nx === ny) return 'nombre';
    if (lev(x.dni, y.dni) <= 1 && lev(norm(x.apellido), norm(y.apellido)) <= 1) return 'dni';
    if (Math.min(nx.length, ny.length) >= 6 && lev(nx, ny) <= 1) return 'casi';
    return null;
  }
  const visitantesParecidos = (x, y) => Boolean(tipoParecido(x, y));

  const claveIgn = (tipo, a, b) => `${tipo}:${[a, b].sort().join('||')}`;

  function sugerenciasVisitantes() {
    // Solo se comparan registros con el mismo apellido o DNI parecido (rápido aunque haya cientos)
    const baldes = new Map();
    const meter = (k, v) => { if (!baldes.has(k)) baldes.set(k, []); baldes.get(k).push(v); };
    for (const v of state.items.values()) {
      meter(`a:${norm(v.apellido)}`, v);
      meter(`d:${v.dni.slice(0, 5)}`, v);
    }
    const pares = new Map();
    for (const lista of baldes.values()) {
      for (let i = 0; i < lista.length; i++) {
        for (let j = i + 1; j < lista.length; j++) {
          const [x, y] = lista[i].id < lista[j].id ? [lista[i], lista[j]] : [lista[j], lista[i]];
          const k = claveIgn('v', String(x.id), String(y.id));
          if (pares.has(k) || ignorados.has(k)) continue;
          const tipo = tipoParecido(x, y);
          if (tipo) pares.set(k, { tipo, par: [x, y] });
        }
      }
    }
    return [...pares.entries()].map(([clave, p]) => ({ clave, ...p }));
  }

  function sugerenciasAlumnos(gs) {
    const lista = [...gs.values()];
    const out = [];
    for (let i = 0; i < lista.length; i++) {
      for (let j = i + 1; j < lista.length; j++) {
        const k = claveIgn('a', lista[i].clave, lista[j].clave);
        if (!ignorados.has(k) && alumnosParecidos(lista[i].clave, lista[j].clave)) out.push({ clave: k, par: [lista[i], lista[j]] });
      }
    }
    return out;
  }

  /* ================= Filtros, pestañas y búsqueda ================= */
  document.querySelectorAll('.stat').forEach((b) =>
    b.addEventListener('click', () => {
      state.filtro = b.dataset.filtro;
      document.querySelectorAll('.stat').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      cambiarTab('v');
    })
  );
  document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => cambiarTab(b.dataset.tab)));
  function cambiarTab(t) {
    state.tab = t;
    document.querySelectorAll('.tab').forEach((x) => x.setAttribute('aria-selected', String(x.dataset.tab === t)));
    $('#tab-v').hidden = t !== 'v';
    $('#tab-a').hidden = t !== 'a';
    $('#tab-i').hidden = t !== 'i';
    render();
  }

  $('#q').addEventListener('input', (e) => { state.q = e.target.value; render(); });

  function coincide(v) {
    const q = state.q.trim();
    if (!q) return true;
    const digitos = q.replace(/[\s.]/g, '');
    if (/^\d+$/.test(digitos)) return v.dni.includes(digitos);
    const nq = norm(q);
    return norm(`${v.nombre} ${v.apellido}`).includes(nq) || norm(v.apellido).includes(nq) || (v.conAlumno && norm(v.alumno).includes(nq));
  }

  /* ================= Render ================= */
  function render() {
    const todos = [...state.items.values()];
    const ing = todos.filter((v) => v.ingresado).length;
    $('#n-total').textContent = todos.length;
    $('#n-ing').textContent = ing;
    $('#n-pend').textContent = todos.length - ing;
    $('#n-rev').textContent = todos.filter((v) => v.alerta).length;

    const gs = grupos();
    const inc = inconsistencias(todos, gs);
    const n = inc.reduce((s, g) => s + g.items.length, 0);
    const badge = $('#badge-i');
    badge.hidden = !n;
    badge.textContent = n;

    if (state.tab === 'v') renderVisitantes(todos);
    else if (state.tab === 'a') renderAlumnos(gs);
    else renderInconsistencias(inc);
    state.nuevos.clear();
  }

  function renderVisitantes(todos) {
    const lista = todos
      .filter((v) =>
        state.filtro === 'todos' ? true
        : state.filtro === 'ingresados' ? v.ingresado
        : state.filtro === 'revisar' ? Boolean(v.alerta)
        : !v.ingresado)
      .filter(coincide)
      .sort((a, b) => b.id - a.id);

    const frag = document.createDocumentFragment();
    for (const v of lista) frag.append(fila(v));
    $('#list').replaceChildren(frag);

    const empty = $('#empty');
    empty.hidden = Boolean(lista.length);
    if (!lista.length) {
      empty.textContent = todos.length === 0
        ? 'Todavía no se registró nadie. Los registros van a aparecer acá apenas lleguen.'
        : state.q.trim()
          ? `No hay nadie con "${state.q.trim()}". Probá con el DNI o revisá cómo está escrito.`
          : state.filtro === 'revisar' ? 'No hay registros sospechosos.' : 'No hay registros en este filtro.';
    }
  }

  function fila(v) {
    const ocupado = state.enCurso.has(v.id);
    const editar = el('button', { class: 'btn-edit', type: 'button', 'data-accion': 'editar', 'data-id': v.id, 'aria-label': `Editar a ${v.nombre} ${v.apellido}`, title: 'Editar o eliminar' }, icon('edit'));
    const accion = v.ingresado
      ? el('div', { class: 'item-action is-done' },
          el('span', { class: 'done' }, icon('check_circle'), `Ingresó ${v.ingresoMs ? fmtHora(v.ingresoMs) : ''}`),
          el('button', { class: 'link-undo', type: 'button', 'data-accion': 'deshacer', 'data-id': v.id, disabled: ocupado }, 'Deshacer'),
          editar)
      : el('div', { class: 'item-action' },
          el('button', { class: 'btn btn-primary btn-check', type: 'button', 'data-accion': 'ingreso', 'data-id': v.id, disabled: ocupado },
            icon('login'), ocupado ? 'Marcando…' : 'Marcar ingreso'),
          editar);

    const clases = ['item', v.ingresado && 'ok', !v.ingresado && v.alerta && 'flag', state.nuevos.has(v.id) && 'is-new'].filter(Boolean).join(' ');
    return el('li', { class: clases },
      el('div', {},
        el('div', { class: 'item-name' }, el('b', {}, v.apellido), `, ${v.nombre}`),
        el('div', { class: 'item-meta' },
          el('span', { class: 'item-dni' }, `DNI ${fmtDni(v.dni)}`),
          v.conAlumno
            ? el('button', { class: 'tag tag-link', type: 'button', 'data-accion': 'ver-alumno', 'data-clave': norm(v.alumno), title: `Ver quiénes vinieron a ver a ${v.alumno}` }, icon('school'), visitaTxt(v))
            : el('span', { class: 'tag tag-gen' }, icon('person'), 'Invitado general'),
          v.alerta ? el('span', { class: 'tag tag-warn', title: v.alerta }, icon('flag'), 'A revisar') : null,
          v.createdMs ? el('span', {}, `Registro ${fmtHora(v.createdMs)}`) : null)),
      accion);
  }

  function renderAlumnos(gs) {
    // Una pestaña por curso (solo los que tienen a alguien), con cuántas personas vinieron
    const porCurso = new Map();
    for (const g of gs.values()) porCurso.set(g.curso, (porCurso.get(g.curso) || 0) + g.familiares.length);
    const cursos = [...porCurso.keys()].sort(ordenCurso);
    if (state.aCurso && !porCurso.has(state.aCurso)) state.aCurso = '';
    const total = [...porCurso.values()].reduce((s, n) => s + n, 0);
    const pestana = (valor, texto, n) => el('button', {
      class: 'a-tab', type: 'button', role: 'tab', 'data-curso': valor,
      'aria-selected': String(state.aCurso === valor),
    }, texto, el('span', { class: 'a-tab-n' }, n));
    $('#a-tabs').replaceChildren(pestana('', 'Todos', total),
      ...cursos.map((c) => pestana(c, cursoNombre(c), porCurso.get(c))));
    $('#a-tabs').hidden = !cursos.length;

    const q = norm(state.q);
    const lista = [...gs.values()]
      .filter((g) => !state.aCurso || g.curso === state.aCurso)
      .filter((g) => !q || g.clave.includes(q) || g.familiares.some(coincide))
      .sort((a, b) => ordenCurso(a.curso, b.curso) || a.clave.localeCompare(b.clave));

    const personas = lista.reduce((s, g) => s + g.familiares.length, 0);
    $('#a-resumen').textContent = lista.length
      ? `${plural(lista.length, 'alumno', 'alumnos')} · ${plural(personas, 'persona', 'personas')}`
      : '';

    // Una sección por curso, con las tarjetas de sus alumnos
    const secciones = new Map();
    for (const g of lista) {
      if (!secciones.has(g.curso)) secciones.set(g.curso, []);
      secciones.get(g.curso).push(g);
    }
    $('#alist').replaceChildren(...[...secciones.entries()].map(([curso, gsCurso]) => {
      const n = gsCurso.reduce((s, g) => s + g.familiares.length, 0);
      return el('section', { class: 'acurso' },
        el('h3', { class: 'acurso-title' }, icon('groups'), cursoNombre(curso),
          el('small', {}, `${plural(gsCurso.length, 'alumno', 'alumnos')} · ${plural(n, 'persona', 'personas')}`)),
        el('ul', { class: 'alist' }, gsCurso.map(tarjetaAlumno)));
    }));

    const empty = $('#empty-a');
    empty.hidden = Boolean(lista.length);
    if (!lista.length) empty.textContent = gs.size ? 'Ningún alumno coincide con la búsqueda.' : 'Todavía nadie vino a ver a un alumno.';

    if (state.aFoco) {
      const card = document.querySelector(`.acard[data-clave="${CSS.escape(state.aFoco)}"]`);
      state.aFoco = null;
      if (card) {
        card.classList.add('foco');
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => card.classList.remove('foco'), 2400);
      }
    }
  }

  function tarjetaAlumno(g) {
    const ing = g.familiares.filter((f) => f.ingresado).length;
    const otras = [...g.variantes.keys()].filter((n) => n !== g.nombre);
    const otrosCursos = [...g.cursos.keys()].filter((c) => c !== g.curso);
    return el('li', { class: 'acard', 'data-clave': g.clave },
      el('div', {},
        el('div', { class: 'acard-name' }, g.nombre),
        otras.length ? el('div', { class: 'acard-alt' }, `También escrito: ${otras.join(', ')}`) : null,
        otrosCursos.length ? el('div', { class: 'acard-alt' }, `Algunos lo anotaron en ${otrosCursos.map(cursoNombre).join(', ')}`) : null,
        el('div', { class: 'acard-stats' }, `${plural(g.familiares.length, 'persona viene', 'personas vienen')} a verlo · ${ing} ingres${ing === 1 ? 'ó' : 'aron'}`)),
      el('ul', { class: 'fam' }, [...g.familiares]
        .sort((a, b) => a.apellido.localeCompare(b.apellido))
        .map((f) => el('li', { class: f.ingresado ? 'in' : '' },
          icon(f.ingresado ? 'check_circle' : 'schedule'),
          el('span', {}, `${f.apellido}, ${f.nombre} `,
            el('small', {}, `· ${f.parentesco} · DNI ${fmtDni(f.dni)}${f.ingresado && f.ingresoMs ? ` · entró ${fmtHora(f.ingresoMs)}` : ''}`))))));
  }

  $('#a-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('.a-tab');
    if (!b) return;
    state.aCurso = b.dataset.curso;
    render();
    $('#tab-a').scrollIntoView({ block: 'start' });
  });

  /* ================= Inconsistencias ================= */
  const TIPOS_INC = [
    { k: 'nombre', icono: 'group', titulo: 'Mismo nombre y apellido', ayuda: 'Dos registros con el mismo nombre completo y distinto DNI.' },
    { k: 'casi', icono: 'spellcheck', titulo: 'Nombre casi igual', ayuda: 'El nombre completo cambia en una sola letra: puede ser un error de tipeo.' },
    { k: 'dni', icono: 'pin', titulo: 'DNI casi igual', ayuda: 'Mismo apellido y el DNI cambia en un solo número.' },
    { k: 'alumno', icono: 'school', titulo: 'Alumno escrito distinto', ayuda: 'Distintos familiares escribieron al mismo alumno de otra forma.' },
    { k: 'alerta', icono: 'flag', titulo: 'A revisar', ayuda: 'El detector marcó estos datos como sospechosos. Pedile el DNI en la puerta.' },
  ];

  function inconsistencias(todos, gs) {
    const items = Object.fromEntries(TIPOS_INC.map((t) => [t.k, []]));
    for (const s of sugerenciasVisitantes()) items[s.tipo].push(s);
    items.alumno = sugerenciasAlumnos(gs);
    items.alerta = todos.filter((v) => v.alerta).sort((a, b) => b.id - a.id);
    return TIPOS_INC.map((t) => ({ ...t, items: items[t.k] }));
  }

  const btnSmall = (texto, attrs, oscuro = false) =>
    el('button', { class: `btn ${oscuro ? 'btn-dark' : 'btn-ghost-dark'} btn-small`, type: 'button', ...attrs }, texto);

  function filaInc(t, it) {
    if (t.k === 'alerta') {
      return el('div', { class: 'sug-row' },
        el('div', { class: 'sug-names' }, `${it.apellido}, ${it.nombre}`,
          el('small', {}, `DNI ${fmtDni(it.dni)} · ${it.alerta}`)),
        el('div', { class: 'sug-btns' },
          btnSmall('Editar', { 'data-accion': 'editar', 'data-id': it.id }, true),
          btnSmall('Los datos están bien', { 'data-accion': 'quitar-alerta', 'data-id': it.id })));
    }
    if (t.k === 'alumno') {
      const [x, y] = it.par;
      return el('div', { class: 'sug-row' },
        el('div', { class: 'sug-names' }, `${x.nombre} · ${y.nombre}`,
          el('small', {}, `${plural(x.familiares.length, 'familiar', 'familiares')} / ${plural(y.familiares.length, 'familiar', 'familiares')}`)),
        el('div', { class: 'sug-btns' },
          btnSmall('Revisar', { 'data-accion': 'revisar-a', 'data-a': x.clave, 'data-b': y.clave }, true),
          btnSmall('No es el mismo', { 'data-accion': 'ignorar', 'data-clave': it.clave })));
    }
    const [x, y] = it.par;
    return el('div', { class: 'sug-row' },
      el('div', { class: 'sug-names' },
        `${x.apellido}, ${x.nombre} · ${y.apellido}, ${y.nombre}`,
        el('small', {}, `DNI ${fmtDni(x.dni)} / ${fmtDni(y.dni)}`)),
      el('div', { class: 'sug-btns' },
        btnSmall('Comparar', { 'data-accion': 'comparar', 'data-a': x.id, 'data-b': y.id }, true),
        btnSmall('No es la misma', { 'data-accion': 'ignorar', 'data-clave': it.clave })));
  }

  function renderInconsistencias(inc) {
    const q = norm(state.q);
    const pasa = (t, it) => {
      if (!state.q.trim()) return true;
      if (t.k === 'alerta') return coincide(it);
      if (t.k === 'alumno') return it.par.some((g) => g.clave.includes(q));
      return it.par.some(coincide);
    };
    const grupos = inc.map((t) => ({ ...t, items: t.items.filter((it) => pasa(t, it)) })).filter((t) => t.items.length);

    $('#inc').replaceChildren(...grupos.map((t) =>
      el('div', { class: 'sug' },
        el('p', { class: 'sug-title' }, icon(t.icono), t.titulo, el('span', { class: 'badge' }, t.items.length)),
        el('p', { class: 'sug-help' }, t.ayuda),
        t.items.map((it) => filaInc(t, it)))));

    const empty = $('#empty-i');
    empty.hidden = Boolean(grupos.length);
    if (!grupos.length) empty.textContent = state.q.trim() ? 'Ninguna inconsistencia coincide con la búsqueda.' : 'No hay inconsistencias. Todo en orden.';
  }

  /* ================= Acciones de la lista ================= */
  $('#tab-v').addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-accion]');
    if (!b) return;
    const acc = b.dataset.accion;
    if (acc === 'editar') return abrirEditor(Number(b.dataset.id));
    if (acc === 'ingreso' || acc === 'deshacer') return checkin(Number(b.dataset.id), acc === 'ingreso');
    if (acc === 'ver-alumno') {
      // Ir al grupo de ese alumno: sin búsqueda ni filtro que lo escondan
      state.aFoco = b.dataset.clave;
      state.aCurso = '';
      state.q = '';
      $('#q').value = '';
      return cambiarTab('a');
    }
  });

  $('#tab-i').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-accion]');
    if (!b) return;
    const acc = b.dataset.accion;
    if (acc === 'comparar') return abrirFusionV(Number(b.dataset.a), Number(b.dataset.b));
    if (acc === 'revisar-a') return abrirFusionA([b.dataset.a, b.dataset.b]);
    if (acc === 'editar') return abrirEditor(Number(b.dataset.id));
    if (acc === 'quitar-alerta') return quitarAlerta(Number(b.dataset.id));
    if (acc === 'ignorar') { ignorados.add(b.dataset.clave); guardarIgnorados(); render(); }
  });
  $('#inc-man-v').addEventListener('click', () => abrirElegir(null));
  $('#inc-man-a').addEventListener('click', abrirSelAlumnos);

  async function checkin(id, marcar) {
    const v = state.items.get(id);
    if (!v) return;
    if (!marcar && !confirm(`¿Deshacer el ingreso de ${v.nombre} ${v.apellido}?`)) return;
    state.enCurso.add(id);
    render();
    try {
      const { status, data } = await post('/api/checkin', { id, ingresado: marcar });
      if (data.visitante) state.items.set(id, data.visitante);
      if (status === 200) {
        toast(marcar ? `Ingreso marcado: ${v.apellido}, ${v.nombre}` : `Ingreso deshecho: ${v.apellido}, ${v.nombre}`);
      } else if (status === 409) {
        const h = data.visitante?.ingresoMs ? ` a las ${fmtHora(data.visitante.ingresoMs)}` : '';
        toast(`${data.error}${marcar ? h : ''}`, { warn: true });
      } else {
        if (status === 404) state.items.delete(id);
        toast(data.error || 'No se pudo actualizar. Probá de nuevo.', { warn: true });
      }
    } catch (err) {
      errorDeRed(err);
    } finally {
      state.enCurso.delete(id);
      render();
    }
  }

  /* ================= Diálogos: comunes ================= */
  document.querySelectorAll('[data-cerrar]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
  // Cerrar tocando afuera
  document.querySelectorAll('dialog').forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));

  function erroresEn(form, errores = {}) {
    form.querySelectorAll('.field.has-error').forEach((f) => f.classList.remove('has-error'));
    form.querySelectorAll('.field-error').forEach((p) => p.remove());
    for (const [k, msg] of Object.entries(errores)) {
      const f = form.querySelector(`[data-field="${k}"]`);
      if (!f) continue;
      f.classList.add('has-error');
      f.append(el('p', { class: 'field-error' }, msg));
    }
  }
  function mostrarError(sel, msg) {
    const p = $(sel);
    p.textContent = msg || '';
    p.hidden = !msg;
  }

  /* ================= Editar / eliminar ================= */
  const fEd = $('#f-editar');

  function abrirEditor(id) {
    const v = state.items.get(id);
    if (!v) return;
    state.editando = id;
    fEd.reset();
    erroresEn(fEd);
    mostrarError('#ed-error', '');
    $('#ed-title').textContent = `Editar registro #${String(v.id).padStart(4, '0')}`;
    fEd.nombre.value = v.nombre;
    fEd.apellido.value = v.apellido;
    fEd.dni.value = v.dni;
    fEd.conAlumno.value = v.conAlumno ? 'si' : 'no';
    fEd.alumno.value = v.alumno || '';
    fEd.curso.value = v.curso || '';
    fEd.division.value = v.division || '';
    fEd.parentesco.value = v.parentesco || '';
    mostrarAlumnoBox();
    $('#ed-alerta').hidden = !v.alerta;
    $('#ed-alerta-txt').textContent = v.alerta || '';
    $('#dlg-editar').showModal();
  }

  // Con "No", el alumno que había escrito no se borra: se avisa que queda guardado
  function mostrarAlumnoBox() {
    const si = fEd.conAlumno.value === 'si';
    const alumno = fEd.alumno.value.trim();
    $('#ed-alumno-box').hidden = !si;
    $('#ed-alumno-guardado').hidden = si || !alumno;
    const curso = fEd.curso.value && fEd.division.value ? ` · ${cursoNombre(`${fEd.curso.value}-${fEd.division.value}`)}` : '';
    $('#ed-alumno-guardado').textContent = `Queda guardado lo que había escrito (${[fEd.parentesco.value, alumno].filter(Boolean).join(' de ')}${curso}). Si fue sin querer, tocá Sí y vuelve a aparecer.`;
  }

  fEd.addEventListener('change', (e) => {
    if (e.target.name === 'conAlumno') mostrarAlumnoBox();
  });
  fEd.dni.addEventListener('input', () => { fEd.dni.value = fEd.dni.value.replace(/\D/g, ''); });
  // Nombres: solo letras (con tildes, ñ y ü) y espacios. El servidor revisa lo mismo.
  const soloLetras = (input) => input.addEventListener('input', () => {
    const limpio = input.value.normalize('NFC').replace(/[^A-Za-zÀ-ÖØ-öø-ÿ ]/g, '').replace(/ {2,}/g, ' ').replace(/^ /, '');
    if (limpio !== input.value) input.value = limpio;
  });
  [fEd.nombre, fEd.apellido, fEd.alumno, $('#fa-otro')].forEach(soloLetras);

  fEd.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = state.editando;
    const datos = {
      id,
      nombre: fEd.nombre.value.trim(),
      apellido: fEd.apellido.value.trim(),
      dni: fEd.dni.value,
      conAlumno: fEd.conAlumno.value === 'si',
      alumno: fEd.alumno.value.trim(),
      curso: Number(fEd.curso.value) || null,
      division: Number(fEd.division.value) || null,
      parentesco: fEd.parentesco.value,
    };
    const btn = $('#ed-guardar');
    btn.disabled = true;
    try {
      const { status, data } = await post('/api/editar', datos);
      if (status !== 200) {
        erroresEn(fEd, data.errores);
        mostrarError('#ed-error', data.error || 'No se pudo guardar.');
        return;
      }
      state.items.set(id, data.visitante);
      $('#dlg-editar').close();
      render();
      toast(data.visitante.alerta ? 'Cambios guardados. Sigue marcado para revisar.' : 'Cambios guardados');
    } catch (err) { errorDeRed(err); } finally { btn.disabled = false; }
  });

  async function quitarAlerta(id) {
    try {
      const { status, data } = await post('/api/editar', { id, quitarAlerta: true });
      if (status !== 200) {
        if ($('#dlg-editar').open) mostrarError('#ed-error', data.error);
        else toast(data.error || 'No se pudo quitar el aviso.', { warn: true });
        return;
      }
      state.items.set(id, data.visitante);
      if (state.editando === id) $('#ed-alerta').hidden = true;
      render();
      toast('Aviso quitado');
    } catch (err) { errorDeRed(err); }
  }
  $('#ed-quitar').addEventListener('click', () => quitarAlerta(state.editando));

  $('#ed-eliminar').addEventListener('click', async () => {
    const id = state.editando;
    const v = state.items.get(id);
    if (!v || !confirm(`¿Eliminar el registro de ${v.nombre} ${v.apellido} (DNI ${fmtDni(v.dni)})?\n\nSi la persona se vuelve a registrar con el mismo DNI, el registro vuelve.`)) return;
    try {
      const { status, data } = await post('/api/eliminar', { id });
      if (status !== 200 && status !== 404) return mostrarError('#ed-error', data.error);
      state.items.delete(id);
      $('#dlg-editar').close();
      render();
      toast(`Registro eliminado: ${v.apellido}, ${v.nombre}`);
    } catch (err) { errorDeRed(err); }
  });

  /* ================= Elegir a mano qué visitantes fusionar ================= */
  // Dos pasos: primero el registro base (id null), después con cuál se fusiona
  function abrirElegir(id) {
    const v = id == null ? null : state.items.get(id);
    if (id != null && !v) return;
    state.elegirBase = v ? id : null;
    $('#el-title').textContent = v ? '¿Con qué registro lo fusionás?' : '¿Qué registro querés fusionar?';
    $('#el-base').textContent = v
      ? `Paso 2 de 2 · Registro base: ${v.apellido}, ${v.nombre} · DNI ${fmtDni(v.dni)}`
      : 'Paso 1 de 2 · Elegí uno de los registros repetidos.';
    $('#el-q').value = '';
    renderElegir();
    if (!$('#dlg-elegir').open) $('#dlg-elegir').showModal();
    $('#el-q').focus();
  }
  function renderElegir() {
    const base = state.items.get(state.elegirBase);
    const q = $('#el-q').value.trim();
    const nq = norm(q);
    const dq = q.replace(/[\s.]/g, '');
    const lista = [...state.items.values()]
      .filter((v) => !base || v.id !== base.id)
      .filter((v) => !q || (/^\d+$/.test(dq) ? v.dni.includes(dq) : norm(`${v.nombre} ${v.apellido}`).includes(nq)))
      .map((v) => ({ v, sug: Boolean(base) && visitantesParecidos(base, v) }))
      .sort((a, b) => b.sug - a.sug || a.v.apellido.localeCompare(b.v.apellido))
      .slice(0, 60);
    $('#el-list').replaceChildren(...(lista.length ? lista.map(({ v, sug }) =>
      el('li', {}, el('button', { type: 'button', class: sug ? 'sugerido' : '', 'data-id': v.id },
        el('b', {}, v.apellido), `, ${v.nombre}`,
        el('small', {}, `${sug ? 'Parecido · ' : ''}DNI ${fmtDni(v.dni)} · ${visitaTxt(v)}`))))
      : [el('li', { class: 'empty' }, 'No hay otros registros con esa búsqueda.')]));
  }
  $('#el-q').addEventListener('input', renderElegir);
  $('#el-list').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-id]');
    if (!b) return;
    if (state.elegirBase == null) return abrirElegir(Number(b.dataset.id));
    $('#dlg-elegir').close();
    abrirFusionV(state.elegirBase, Number(b.dataset.id));
  });

  /* ================= Elegir a mano qué alumnos fusionar ================= */
  function abrirSelAlumnos() {
    state.sel.clear();
    $('#sa-q').value = '';
    renderSelAlumnos();
    $('#dlg-sel-a').showModal();
    $('#sa-q').focus();
  }
  function renderSelAlumnos() {
    const gs = grupos();
    for (const k of [...state.sel]) if (!gs.has(k)) state.sel.delete(k);
    const q = norm($('#sa-q').value);
    const lista = [...gs.values()]
      .filter((g) => !q || g.clave.includes(q) || state.sel.has(g.clave))
      .sort((a, b) => a.clave.localeCompare(b.clave));
    $('#sa-list').replaceChildren(...(lista.length ? lista.map((g) =>
      el('li', {}, el('label', { class: `pick-check${state.sel.has(g.clave) ? ' sel' : ''}` },
        el('input', { type: 'checkbox', checked: state.sel.has(g.clave), 'data-clave': g.clave }),
        el('span', {}, el('b', {}, g.nombre),
          el('small', {}, plural(g.familiares.length, 'familiar', 'familiares'))))))
      : [el('li', { class: 'empty' }, gs.size ? 'Ningún alumno coincide con la búsqueda.' : 'Todavía nadie vino a ver a un alumno.')]));
    const n = state.sel.size;
    $('#sa-ok').disabled = n < 2;
    $('#sa-ok').lastChild.textContent = n < 2 ? 'Marcá al menos dos' : `Fusionar ${n} alumnos`;
  }
  $('#sa-q').addEventListener('input', renderSelAlumnos);
  $('#sa-list').addEventListener('change', (e) => {
    const c = e.target.closest('input[data-clave]');
    if (!c) return;
    if (c.checked) state.sel.add(c.dataset.clave); else state.sel.delete(c.dataset.clave);
    renderSelAlumnos();
  });
  $('#sa-ok').addEventListener('click', () => {
    $('#dlg-sel-a').close();
    abrirFusionA([...state.sel]);
  });

  /* ================= Fusionar visitantes ================= */
  const CAMPOS_V = [
    { k: 'nombre', label: 'Nombre', val: (v) => v.nombre },
    { k: 'apellido', label: 'Apellido', val: (v) => v.apellido },
    { k: 'dni', label: 'DNI', val: (v) => fmtDni(v.dni) },
    { k: 'visita', label: 'Viene a ver', val: visitaTxt },
  ];

  function abrirFusionV(aId, bId) {
    const A = state.items.get(aId), B = state.items.get(bId);
    if (!A || !B) return toast('Uno de los registros ya no está. Actualizá la lista.', { warn: true });
    const elegir = { nombre: 'a', apellido: 'a', dni: 'a', visita: 'a' };
    if (!A.conAlumno && B.conAlumno) elegir.visita = 'b';
    state.fv = { aId, bId, elegir };
    mostrarError('#fv-error', '');
    renderFusionV();
    $('#dlg-fv').showModal();
  }

  function renderFusionV() {
    const { aId, bId, elegir } = state.fv;
    const A = state.items.get(aId), B = state.items.get(bId);
    const cab = el('div', { class: 'cmp-head' },
      el('div', { class: 'cmp-col' }, `Queda #${String(aId).padStart(4, '0')}`, el('small', {}, A.createdMs ? `Registrado ${fmtHora(A.createdMs)}` : '')),
      el('div', { class: 'cmp-col' }, `Se une #${String(bId).padStart(4, '0')}`, el('small', {}, B.createdMs ? `Registrado ${fmtHora(B.createdMs)}` : '')),
      el('button', { class: 'btn btn-ghost-dark btn-small cmp-swap', type: 'button', id: 'fv-swap' }, icon('swap_horiz'), 'Cambiar cuál queda'));

    const filas = CAMPOS_V.map(({ k, label, val }) => {
      const va = val(A), vb = val(B);
      if (va === vb) {
        return el('div', { class: 'cmp-row' }, el('p', { class: 'legend' }, label),
          el('div', { class: 'opt opt-same' }, el('span', { class: 'opt-card' }, el('span', { class: 'opt-k' }, 'Igual en los dos'), va)));
      }
      const op = (lado, texto) => el('label', { class: 'opt' },
        el('input', { type: 'radio', name: `fv-${k}`, value: lado, checked: elegir[k] === lado, 'data-campo': k }),
        el('span', { class: 'opt-card' }, el('span', { class: 'opt-k' }, `#${String(lado === 'a' ? aId : bId).padStart(4, '0')}`), texto));
      return el('fieldset', { class: 'cmp-row' }, el('legend', { class: 'legend' }, label),
        el('div', { class: 'cmp-opts' }, op('a', va), op('b', vb)));
    });
    $('#fv-cmp').replaceChildren(cab, ...filas);

    const ings = [A, B].filter((v) => v.ingresado);
    const primero = ings.map((v) => v.ingresoMs).filter(Boolean).sort((x, y) => x - y)[0];
    $('#fv-nota').textContent = ings.length
      ? `El registro que queda figura como ingresado${primero ? ` (${fmtHora(primero)})` : ''}.`
      : 'Ninguno de los dos ingresó todavía.';
    $('#fv-swap').addEventListener('click', () => {
      const s = state.fv;
      [s.aId, s.bId] = [s.bId, s.aId];
      for (const k of Object.keys(s.elegir)) s.elegir[k] = s.elegir[k] === 'a' ? 'b' : 'a';
      renderFusionV();
    });
  }
  $('#fv-cmp').addEventListener('change', (e) => {
    const r = e.target.closest('input[data-campo]');
    if (r) state.fv.elegir[r.dataset.campo] = r.value;
  });

  $('#fv-ok').addEventListener('click', async () => {
    const { aId, bId, elegir } = state.fv;
    const btn = $('#fv-ok');
    btn.disabled = true;
    try {
      const { status, data } = await post('/api/fusionar', { tipo: 'visitante', principalId: aId, otroId: bId, elegir });
      if (status !== 200) return mostrarError('#fv-error', data.error || 'No se pudo fusionar.');
      state.items.set(aId, data.visitante);
      state.items.delete(bId);
      $('#dlg-fv').close();
      render();
      toast(`Fusionados en ${data.visitante.apellido}, ${data.visitante.nombre}`, {
        accion: { texto: 'Deshacer', fn: () => deshacerFusion(data.fusionId) },
      });
    } catch (err) { errorDeRed(err); } finally { btn.disabled = false; }
  });

  /* ================= Fusionar alumnos ================= */
  function abrirFusionA(claves) {
    const gs = grupos();
    const sel = claves.map((k) => gs.get(k)).filter(Boolean);
    if (sel.length < 2) return toast('Marcá al menos dos alumnos.', { warn: true });

    const variantes = new Map();
    for (const g of sel) for (const [n, c] of g.variantes) variantes.set(n, (variantes.get(n) || 0) + c);
    const familiares = sel.flatMap((g) => g.familiares);
    state.fa = { claves, variantes, familiares };
    const elegida = mejorVariante(variantes);

    $('#fa-opts').replaceChildren(...[...variantes.entries()].map(([n, c]) =>
      el('label', { class: 'opt' },
        el('input', { type: 'radio', name: 'fa-nombre', value: n, checked: n === elegida }),
        el('span', { class: 'opt-card' }, el('span', { class: 'opt-k' }, `Así lo escribi${c === 1 ? 'ó 1 familiar' : `eron ${c} familiares`}`), n))));
    $('#fa-otro').value = '';

    $('#fa-fam').replaceChildren(...familiares
      .sort((a, b) => a.apellido.localeCompare(b.apellido))
      .map((f) => el('li', { class: f.ingresado ? 'in' : '' },
        icon(f.ingresado ? 'check_circle' : 'schedule'),
        el('span', {}, `${f.apellido}, ${f.nombre} `, el('small', {}, `· ${f.parentesco} · escribió "${f.alumno}"`)))));
    mostrarError('#fa-error', '');
    $('#dlg-fa').showModal();
  }
  $('#fa-otro').addEventListener('focus', () => { document.querySelector('input[name="fa-nombre"][value="__otro"]').checked = true; });

  $('#fa-ok').addEventListener('click', async () => {
    const elegido = document.querySelector('input[name="fa-nombre"]:checked')?.value;
    const nombreFinal = (elegido === '__otro' ? $('#fa-otro').value : elegido || '').replace(/\s+/g, ' ').trim();
    if (nombreFinal.length < 2) return mostrarError('#fa-error', 'Elegí o escribí el nombre del alumno.');
    const btn = $('#fa-ok');
    btn.disabled = true;
    try {
      const { status, data } = await post('/api/fusionar', { tipo: 'alumno', nombres: [...state.fa.variantes.keys()], nombreFinal });
      if (status !== 200) return mostrarError('#fa-error', data.error || 'No se pudo fusionar.');
      // Actualizar ya, sin esperar la próxima consulta
      for (const f of state.fa.familiares) {
        const v = state.items.get(f.id);
        if (v) state.items.set(f.id, { ...v, alumno: nombreFinal });
      }
      state.sel.clear();
      $('#dlg-fa').close();
      render();
      toast(`${plural(data.familiares, 'familiar ahora acompaña', 'familiares ahora acompañan')} a ${nombreFinal}`, {
        accion: { texto: 'Deshacer', fn: () => deshacerFusion(data.fusionId) },
      });
    } catch (err) { errorDeRed(err); } finally { btn.disabled = false; }
  });

  /* ================= Historial y deshacer ================= */
  const abrirHistorial = () => { $('#dlg-hist').showModal(); cargarHistorial(); };
  $('#btn-historial').addEventListener('click', abrirHistorial);
  $('#inc-hist').addEventListener('click', abrirHistorial);

  async function cargarHistorial() {
    const ul = $('#hi-list');
    ul.replaceChildren(el('li', {}, 'Cargando…'));
    try {
      const { status, data } = await api('/api/fusiones');
      if (status !== 200) throw new Error(data.error);
      ul.replaceChildren(...(data.fusiones.length ? data.fusiones.map((f) =>
        el('li', { class: f.deshechaMs ? 'undone' : '' },
          icon(f.tipo === 'alumno' ? 'school' : 'badge'),
          el('div', { class: 'hist-txt' }, f.resumen,
            el('small', {}, `${fmtHora(f.creadaMs)}${f.deshechaMs ? ` · deshecha a las ${fmtHora(f.deshechaMs)}` : ''}`)),
          f.deshechaMs ? null
            : el('button', { class: 'btn btn-ghost-dark btn-small', type: 'button', 'data-id': f.id }, icon('undo'), 'Deshacer')))
        : [el('li', {}, 'Todavía no se fusionó nada.')]));
    } catch (err) {
      if (!err.auth) ul.replaceChildren(el('li', {}, 'No se pudo cargar el historial. Probá de nuevo.'));
    }
  }
  $('#hi-list').addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-id]');
    if (!b) return;
    if (!confirm('¿Deshacer esta fusión? Todo vuelve a como estaba antes.')) return;
    b.disabled = true;
    await deshacerFusion(Number(b.dataset.id));
    cargarHistorial();
  });

  async function deshacerFusion(id) {
    try {
      const { status, data } = await post('/api/fusiones', { deshacer: id });
      if (status !== 200) return toast(data.error || 'No se pudo deshacer.', { warn: true });
      toast(`Fusión deshecha. ${data.detalle}`);
      poll(); // trae de vuelta los registros separados
    } catch (err) { errorDeRed(err); }
  }

  /* ================= Cambiar PIN ================= */
  const fPin = $('#f-pin');
  [fPin.actual, fPin.nuevo, fPin.repetir].forEach(soloNumeros);

  $('#btn-pin').addEventListener('click', () => {
    fPin.reset();
    erroresEn(fPin);
    mostrarError('#pin-error', '');
    $('#dlg-pin').showModal();
    fPin.actual.focus();
  });

  fPin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const actual = fPin.actual.value, nuevo = fPin.nuevo.value, repetir = fPin.repetir.value;
    const errores = {};
    if (!PIN_OK.test(actual)) errores.actual = 'Escribí el PIN actual.';
    if (!PIN_OK.test(nuevo)) errores.nuevo = 'Solo números, de 4 a 8 cifras.';
    else if (nuevo === actual) errores.nuevo = 'Tiene que ser distinto del actual.';
    if (!errores.nuevo && repetir !== nuevo) errores.repetir = 'No coincide con el PIN nuevo.';
    erroresEn(fPin, errores);
    if (Object.keys(errores).length) return mostrarError('#pin-error', '');

    const btn = $('#pin-guardar');
    btn.disabled = true;
    try {
      const { status, data } = await post('/api/pin', { actual, nuevo });
      if (status !== 200) {
        erroresEn(fPin, data.errores);
        return mostrarError('#pin-error', data.error || 'No se pudo cambiar el PIN.');
      }
      // Este dispositivo sigue adentro con el PIN nuevo
      state.pin = nuevo;
      try { sessionStorage.setItem(PIN_KEY, nuevo); } catch {}
      $('#dlg-pin').close();
      toast('PIN cambiado. Pasales el nuevo a los demás recepcionistas.');
    } catch (err) { errorDeRed(err); } finally { btn.disabled = false; }
  });

  /* ================= Barra fija ================= */
  function medirTopbar() {
    const tb = document.querySelector('.topbar');
    const set = () => document.documentElement.style.setProperty('--topbar-h', `${tb.offsetHeight}px`);
    set();
    if ('ResizeObserver' in window) new ResizeObserver(set).observe(tb);
  }

  // Si ya había PIN en esta pestaña, entrar directo
  if (state.pin) abrir();
})();
