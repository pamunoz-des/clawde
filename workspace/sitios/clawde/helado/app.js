'use strict';

// Lee los códigos ganadores y los mensajes exclusivamente desde premios.json.
// IMPORTANTE: este sistema es una DEMOSTRACIÓN. No valida premios de forma segura.
const el = (id) => document.getElementById(id);
const dom = {
  start: el('start-btn'), stop: el('stop-btn'), retry: el('retry-btn'),
  photo: el('photo-input'), manualForm: el('manual-form'),
  manualCode: el('manual-code'), check: el('check-btn'),
  status: el('status'), result: el('result-content'),
  resultCard: el('result-card'), shell: el('camera-shell')
};

const state = {
  premios: new Map(), frases: [], loaded: false,
  scanner: null, scanning: false, busy: false,
  resultLocked: false, previousPhraseIndex: -1
};

function setStatus(message, error = false) {
  dom.status.textContent = message;
  dom.status.classList.toggle('error', error);
}

function setEnabled(enabled) {
  dom.start.disabled = !enabled;
  dom.photo.disabled = !enabled;
  dom.manualCode.disabled = !enabled;
  dom.check.disabled = !enabled;
  const label = document.querySelector('.file-btn');
  label.classList.toggle('is-disabled', !enabled);
  label.setAttribute('aria-disabled', String(!enabled));
}

async function loadPremios() {
  try {
    const response = await fetch('./premios.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.codigos) || !Array.isArray(data.mensajesSinPremio)) {
      throw new Error('Formato del JSON no válido');
    }
    const winners = new Map();
    for (const row of data.codigos) {
      if (!row || typeof row.codigo !== 'string' ||
          !row.codigo.trim() || typeof row.premio !== 'string' || !row.premio.trim()) {
        throw new Error('Cada registro requiere codigo y premio como texto');
      }
      const code = row.codigo.trim();
      if (winners.has(code)) throw new Error(`Código duplicado: ${code}`);
      winners.set(code, {
        premio: row.premio.trim(),
        descripcion: typeof row.descripcion === 'string' ? row.descripcion.trim() : ''
      });
    }
    const messages = data.mensajesSinPremio.filter(m => typeof m === 'string' && m.trim()).map(m => m.trim());
    if (!messages.length) throw new Error('Agrega al menos una frase motivadora');
    state.premios = winners;
    state.frases = messages;
    state.loaded = true;
    setEnabled(true);
    setStatus('✓ Lista de premios cargada. ¡Ya puedes participar!');
  } catch (error) {
    state.loaded = false;
    setEnabled(false);
    setStatus('No se pudo leer premios.json. Abre el sitio desde un servidor local (no haciendo doble clic en index.html).', true);
    console.error('No se pudo cargar premios.json:', error);
  }
}

function randomPhrase() {
  if (state.frases.length === 1) return state.frases[0];
  let index;
  do { index = Math.floor(Math.random() * state.frases.length); }
  while (index === state.previousPhraseIndex);
  state.previousPhraseIndex = index;
  return state.frases[index];
}

function makeNode(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = text;
  return node;
}

function displayResult(code) {
  const winner = state.premios.get(code);
  dom.result.textContent = '';
  dom.resultCard.classList.toggle('is-winner', Boolean(winner));
  dom.resultCard.classList.toggle('is-loser', !winner);
  dom.result.appendChild(makeNode('div', 'waiting-icon', winner ? '🏆' : '💛'));
  dom.result.appendChild(makeNode('div', 'result-kicker', winner ? '¡CÓDIGO PREMIADO!' : 'SIN PREMIO ESTA VEZ'));
  dom.result.appendChild(makeNode('h2', winner ? 'result-prize' : '', winner ? winner.premio : '¡La próxima puede ser tuya!'));
  dom.result.appendChild(makeNode('p', '', winner ? (winner.descripcion || '¡Felicitaciones por tu premio!') : randomPhrase()));
  dom.result.appendChild(makeNode('div', 'result-code', `Código: ${code}`));
  dom.retry.hidden = false;
  setStatus(winner ? '✓ ¡Felicitaciones! Código premiado.' : '✓ Código leído correctamente.');
}

function normalizeCode(raw) {
  // Se respeta la totalidad del código, incluidos los ceros iniciales.
  return String(raw ?? '').trim();
}

async function submitCode(raw) {
  if (!state.loaded || state.resultLocked) return;
  const code = normalizeCode(raw);
  if (!/^[a-zA-Z0-9._-]{4,64}$/.test(code)) {
    setStatus('Ingresa un código válido de 4 a 64 caracteres (letras, números, punto, guion o guion bajo).', true);
    return;
  }
  state.resultLocked = true; // Evita múltiples lecturas continuas del mismo envase.
  await stopCamera();
  dom.manualCode.value = code;
  displayResult(code);
}

function ensureLibrary() {
  if (typeof window.Html5Qrcode !== 'function') {
    setStatus('No se pudo cargar el lector. Verifica tu conexión a Internet. Puedes ingresar el código manualmente.', true);
    return false;
  }
  return true;
}

function scannerInstance() {
  if (!state.scanner) {
    const formats = window.Html5QrcodeSupportedFormats;
    state.scanner = new window.Html5Qrcode('lector', {
      formatsToSupport: [formats.EAN_13, formats.EAN_8, formats.UPC_A, formats.UPC_E, formats.CODE_128],
      verbose: false
    });
  }
  return state.scanner;
}

const scanConfig = {
  fps: 10,
  qrbox: (width, height) => ({
    width: Math.max(110, Math.min(330, Math.floor(width * .82))),
    height: Math.max(65, Math.min(130, Math.floor(height * .37)))
  })
};

async function stopCamera() {
  dom.stop.hidden = true;
  if (state.scanner) {
    const instance = state.scanner;
    state.scanner = null;
    try {
      if (state.scanning) await instance.stop();
    } catch (error) {
      console.warn('Error al detener cámara:', error);
    }
    try { instance.clear(); } catch (error) { console.warn('Error limpiando lector:', error); }
  }
  state.scanning = false;
  dom.shell.classList.remove('is-running');
  dom.start.hidden = false;
  if (!state.busy) dom.start.disabled = !state.loaded;
}

async function startCamera() {
  if (!state.loaded || state.busy) return;
  if (!ensureLibrary()) return;
  if (!window.isSecureContext) {
    setStatus('La cámara requiere HTTPS o localhost. Mientras tanto, utiliza una foto o ingresa el código.', true);
    return;
  }
  state.busy = true;
  state.resultLocked = false;
  dom.start.disabled = true;
  dom.start.textContent = 'Iniciando cámara…';
  setStatus('Solicitando permiso para acceder a la cámara…');
  try {
    await stopCamera();
    const scanner = scannerInstance();
    const onDecoded = (decodedText) => {
      if (!state.resultLocked) void submitCode(decodedText);
    };
    try {
      await scanner.start({ facingMode: 'environment' }, scanConfig, onDecoded, () => {});
    } catch (firstError) {
      // Equipo sin cámara trasera: selecciona una cámara disponible.
      const cameras = await window.Html5Qrcode.getCameras();
      if (!cameras.length) throw firstError;
      await scanner.start(cameras[0].id, scanConfig, onDecoded, () => {});
    }
    state.scanning = true;
    dom.shell.classList.add('is-running');
    dom.start.hidden = true;
    dom.stop.hidden = false;
    setStatus('Cámara encendida. Acerca el código de barras al recuadro.');
  } catch (error) {
    console.error('No se pudo iniciar la cámara:', error);
    setStatus('No fue posible abrir la cámara. Revisa permisos, HTTPS y si otra aplicación la está usando.', true);
    await stopCamera();
  } finally {
    state.busy = false;
    dom.start.textContent = '◉  Activar cámara';
    dom.start.disabled = !state.loaded;
  }
}

async function scanPhoto(file) {
  if (!file || !state.loaded || state.busy) return;
  if (!file.type.startsWith('image/')) {
    setStatus('Selecciona una imagen que contenga un código de barras.', true);
    return;
  }
  if (!ensureLibrary()) return;
  state.busy = true;
  state.resultLocked = false;
  setStatus('Analizando imagen…');
  try {
    await stopCamera();
    const result = await scannerInstance().scanFile(file, true);
    await submitCode(result);
  } catch (error) {
    console.error('No se pudo leer imagen:', error);
    setStatus('No se detectó un código compatible. Prueba una foto más nítida o ingresa el número manualmente.', true);
  } finally {
    await stopCamera();
    state.busy = false;
    dom.photo.value = '';
  }
}

dom.start.addEventListener('click', () => { void startCamera(); });
dom.stop.addEventListener('click', async () => {
  if (state.busy) return;
  await stopCamera();
  setStatus('Cámara detenida. Puedes volver a escanear cuando quieras.');
});
dom.photo.addEventListener('change', () => { void scanPhoto(dom.photo.files?.[0]); });
dom.manualForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (state.resultLocked) state.resultLocked = false; // La persona puede consultar otro código manual.
  void submitCode(dom.manualCode.value);
});
dom.retry.addEventListener('click', () => {
  state.resultLocked = false;
  dom.resultCard.classList.remove('is-winner', 'is-loser');
  dom.result.textContent = '';
  dom.result.appendChild(makeNode('div', 'waiting-icon', '🎁'));
  dom.result.appendChild(makeNode('h2', '', '¡Vamos por otra sorpresa!'));
  dom.result.appendChild(makeNode('p', '', 'Escanea otro helado para descubrir qué te espera.'));
  dom.retry.hidden = true;
  dom.manualCode.value = '';
  void startCamera();
});
window.addEventListener('pagehide', () => { void stopCamera(); });
void loadPremios();
