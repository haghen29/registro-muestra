(() => {
  // Dirección oficial del formulario. El panel es /admin y este cartel es /qr.
  const URL_OFICIAL = 'https://registro.weblab.tec4.ar/';

  const $ = (s) => document.querySelector(s);
  const input = $('#url');
  const error = $('#url-error');

  // Logo: si no carga, se quita en lugar de mostrar el ícono de imagen rota
  document.querySelectorAll('img[data-opcional]').forEach((img) => {
    const quitar = () => img.remove();
    if (img.complete && !img.naturalWidth) quitar();
    else img.addEventListener('error', quitar);
  });

  // Solo se aceptan direcciones web normales (https:// o http://), sin espacios ni otros esquemas
  function urlValida(texto) {
    try {
      const u = new URL(texto.trim());
      return (u.protocol === 'https:' || u.protocol === 'http:') && !/\s/.test(texto.trim()) ? u.href : null;
    } catch { return null; }
  }

  function generar() {
    const url = urlValida(input.value);
    error.hidden = Boolean(url);
    if (!url) {
      error.textContent = 'Escribí una dirección completa, por ejemplo https://muestra.tec4.ar/';
      return;
    }
    input.value = url;
    const box = $('#qr');
    box.replaceChildren();
    new QRCode(box, { text: url, width: 600, height: 600, correctLevel: QRCode.CorrectLevel.M });
    $('#url-text').textContent = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  }

  input.value = URL_OFICIAL;
  $('#gen').addEventListener('click', generar);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') generar(); });
  $('#imprimir').addEventListener('click', () => window.print());
  generar();
})();
