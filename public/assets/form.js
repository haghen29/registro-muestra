(() => {
  const $ = (s) => document.querySelector(s);
  const form = $('#form');
  const viewForm = $('#view-form');
  const viewPass = $('#view-pass');
  const alumnoBox = $('#alumno-box');
  const submitBtn = $('#submit');
  const formError = $('#form-error');
  const STORAGE_KEY = 'tec4_muestra_registro';
  const VIGENCIA_MS = 12 * 60 * 60 * 1000; // el pase se mantiene 12 h en este celular

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

  // Nombres: no se pueden escribir números
  for (const campo of [form.nombre, form.apellido, form.alumno]) {
    campo.addEventListener('input', () => {
      const limpio = campo.value.replace(/\d/g, '');
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
    else if (/\d/.test(d.nombre)) e.nombre = 'El nombre no puede tener números.';
    if (d.apellido.length < 2) e.apellido = 'Escribí tu apellido.';
    else if (/\d/.test(d.apellido)) e.apellido = 'El apellido no puede tener números.';
    if (!/^\d{7,8}$/.test(d.dni)) e.dni = 'El DNI tiene que tener 7 u 8 números.';
    if (d.conAlumno === null) e.conAlumno = 'Elegí Sí o No.';
    if (d.conAlumno) {
      if (d.alumno.length < 2) e.alumno = 'Escribí el nombre del alumno.';
      else if (/\d/.test(d.alumno)) e.alumno = 'El nombre del alumno no puede tener números.';
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
      const r = await fetch('/api/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (data.errores) mostrarErrores(data.errores);
        throw new Error(data.error || 'No se pudo registrar.');
      }
      const pase = { ...data.visitante, duplicado: data.duplicado, guardado: Date.now() };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pase)); } catch {}
      mostrarPase(pase);
    } catch (err) {
      formError.textContent = navigator.onLine
        ? err.message
        : 'No hay conexión a internet. Revisá los datos móviles o el Wi-Fi y tocá Registrarme otra vez.';
      formError.hidden = false;
      formError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } finally {
      submitBtn.disabled = false;
      submitBtn.querySelector('span').textContent = 'Registrarme';
    }
  });

  /* ---------- Pase ---------- */
  const fmtDni = (dni) => Number(dni).toLocaleString('es-AR');
  const fmtHora = (ms) => new Date(ms).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

  function mostrarPase(v) {
    $('#pass-name').textContent = `${v.nombre} ${v.apellido}`;
    $('#pass-dni').textContent = fmtDni(v.dni);
    $('#pass-id').textContent = `#${String(v.id).padStart(4, '0')}`;
    const curso = v.curso ? ` (${v.curso}° ${v.division}ª)` : '';
    $('#pass-tipo').textContent = v.conAlumno ? `${v.parentesco} de ${v.alumno}${curso}` : 'Invitado general';
    $('#pass-hora').textContent = v.createdMs ? fmtHora(v.createdMs) : '';
    $('#pass-dup').hidden = !v.duplicado;
    viewForm.hidden = true;
    viewPass.hidden = false;
    document.querySelector('meta[name="theme-color"]').content = '#14773f';
    window.scrollTo(0, 0);
  }

  $('#otra').addEventListener('click', () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    form.reset();
    actualizarAlumno();
    viewPass.hidden = true;
    viewForm.hidden = false;
    document.querySelector('meta[name="theme-color"]').content = '#0f2d52';
    window.scrollTo(0, 0);
    form.nombre.focus();
  });

  // Si recargan la página, el pase sigue visible
  try {
    const guardado = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (guardado && Date.now() - guardado.guardado < VIGENCIA_MS) mostrarPase(guardado);
  } catch {}
})();
