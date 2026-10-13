/* ==========================================================
   Imagens de exemplo (desenhadas por código), escolha de foto própria e
   comparador "antes / depois". Nada sai do computador do aluno.
   ========================================================== */
(function (root) {
  'use strict';
  const { h } = root.UI;
  const { mulberry32 } = root.Logic;

  const W = 480, H = 320;

  /* ---------- cenas de exemplo ---------- */
  function paisagem(g, w, hh) {
    const sky = g.createLinearGradient(0, 0, 0, hh * 0.62);
    sky.addColorStop(0, '#2c5fd6'); sky.addColorStop(0.55, '#7db4f2'); sky.addColorStop(1, '#ffd9a0');
    g.fillStyle = sky; g.fillRect(0, 0, w, hh);
    // sol
    const sx = w * 0.72, sy = hh * 0.4;
    const sun = g.createRadialGradient(sx, sy, 2, sx, sy, hh * 0.24);
    sun.addColorStop(0, 'rgba(255,252,210,1)'); sun.addColorStop(0.3, 'rgba(255,226,110,1)');
    sun.addColorStop(0.31, 'rgba(255,226,110,.4)'); sun.addColorStop(1, 'rgba(255,226,110,0)');
    g.fillStyle = sun; g.fillRect(0, 0, w, hh);
    // nuvens
    g.fillStyle = 'rgba(255,255,255,.9)';
    [[80, 55, 46, 14], [118, 48, 34, 12], [60, 62, 34, 10], [300, 38, 40, 11], [335, 44, 30, 9]].forEach(([x, y, rx, ry]) => {
      g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill();
    });
    // montanhas
    g.fillStyle = '#6a63b4';
    g.beginPath(); g.moveTo(0, hh * 0.62); g.lineTo(60, hh * 0.38); g.lineTo(110, hh * 0.5); g.lineTo(170, hh * 0.3);
    g.lineTo(240, hh * 0.52); g.lineTo(300, hh * 0.42); g.lineTo(380, hh * 0.58); g.lineTo(w, hh * 0.46); g.lineTo(w, hh * 0.65); g.lineTo(0, hh * 0.65); g.fill();
    g.fillStyle = '#fff'; // neve
    g.beginPath(); g.moveTo(170, hh * 0.3); g.lineTo(150, hh * 0.375); g.lineTo(166, hh * 0.35); g.lineTo(178, hh * 0.385); g.lineTo(194, hh * 0.35); g.fill();
    // colinas
    g.fillStyle = '#2f9e57';
    g.beginPath(); g.moveTo(0, hh * 0.7); g.quadraticCurveTo(w * 0.2, hh * 0.52, w * 0.45, hh * 0.68); g.quadraticCurveTo(w * 0.7, hh * 0.78, w, hh * 0.6); g.lineTo(w, hh * 0.72); g.lineTo(0, hh * 0.72); g.fill();
    g.fillStyle = '#1f7a41';
    g.beginPath(); g.moveTo(0, hh * 0.78); g.quadraticCurveTo(w * 0.3, hh * 0.62, w * 0.6, hh * 0.78); g.lineTo(w * 0.6, hh * 0.8); g.lineTo(0, hh * 0.8); g.fill();
    // lago
    const lake = g.createLinearGradient(0, hh * 0.72, 0, hh);
    lake.addColorStop(0, '#4aa3e0'); lake.addColorStop(1, '#14498f');
    g.fillStyle = lake; g.fillRect(0, hh * 0.72, w, hh * 0.28);
    // reflexo
    g.fillStyle = 'rgba(255,226,110,.75)';
    for (let k = 0; k < 7; k++) { const y = hh * 0.74 + k * 9; const rw = 56 - k * 6; g.fillRect(sx - rw / 2, y, rw, 3); }
    // casa
    const hx = 52, hy = hh * 0.66;
    g.fillStyle = '#f4ead2'; g.fillRect(hx, hy, 46, 30);
    g.fillStyle = '#d6342e'; g.beginPath(); g.moveTo(hx - 6, hy); g.lineTo(hx + 23, hy - 22); g.lineTo(hx + 52, hy); g.fill();
    g.fillStyle = '#7b4a24'; g.fillRect(hx + 18, hy + 12, 11, 18);
    g.fillStyle = '#4aa3e0'; g.fillRect(hx + 5, hy + 8, 9, 9); g.fillRect(hx + 33, hy + 8, 9, 9);
    // árvores
    [[130, hh * 0.69, 15], [152, hh * 0.7, 11]].forEach(([x, y, r]) => {
      g.fillStyle = '#6a4325'; g.fillRect(x - 2, y, 4, 15);
      g.fillStyle = '#157a3a'; g.beginPath(); g.arc(x, y - 2, r, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#e0383e'; g.beginPath(); g.arc(x - 5, y - 4, 2.4, 0, 7); g.arc(x + 4, y + 1, 2.4, 0, 7); g.fill();
    });
  }

  function cidade(g, w, hh) {
    const rnd = mulberry32(7);
    const sky = g.createLinearGradient(0, 0, 0, hh);
    sky.addColorStop(0, '#14185a'); sky.addColorStop(0.5, '#7a3f8e'); sky.addColorStop(0.78, '#ff8a5c'); sky.addColorStop(1, '#ffd38a');
    g.fillStyle = sky; g.fillRect(0, 0, w, hh);
    // lua
    g.fillStyle = '#fff6c8'; g.beginPath(); g.arc(w * 0.18, hh * 0.2, 22, 0, 7); g.fill();
    g.fillStyle = '#e6dca8'; g.beginPath(); g.arc(w * 0.18 + 7, hh * 0.2 - 5, 5, 0, 7); g.arc(w * 0.18 - 8, hh * 0.2 + 7, 3.5, 0, 7); g.fill();
    // estrelas
    g.fillStyle = '#fff';
    for (let k = 0; k < 40; k++) g.fillRect(Math.floor(rnd() * w), Math.floor(rnd() * hh * 0.35), 2, 2);
    // prédios
    const base = hh * 0.86;
    const cols = ['#1e2350', '#28306b', '#222a5e', '#343b7a', '#191d46'];
    let x = -8, idx = 0;
    while (x < w) {
      const bw = 34 + Math.floor(rnd() * 34), bh = 70 + Math.floor(rnd() * 140);
      g.fillStyle = cols[idx++ % cols.length];
      g.fillRect(x, base - bh, bw, bh);
      for (let wy = base - bh + 8; wy < base - 10; wy += 13) {
        for (let wx = x + 6; wx < x + bw - 8; wx += 11) {
          g.fillStyle = rnd() < 0.55 ? '#ffe27a' : '#2a3070';
          g.fillRect(wx, wy, 6, 8);
        }
      }
      if (rnd() < 0.4) { g.fillStyle = '#d6342e'; g.fillRect(x + bw / 2 - 1, base - bh - 14, 2, 14); }
      x += bw + 3;
    }
    // rua
    g.fillStyle = '#23263a'; g.fillRect(0, base, w, hh - base);
    g.fillStyle = '#ffd23f';
    for (let k = 0; k < w; k += 40) g.fillRect(k + 6, base + (hh - base) / 2 - 2, 22, 4);
    g.fillStyle = '#e5383b'; g.fillRect(w * 0.55, base + 6, 38, 13); g.fillRect(w * 0.55 + 7, base + 1, 22, 9);
    g.fillStyle = '#9ad4ff'; g.fillRect(w * 0.55 + 10, base + 3, 16, 6);
    g.fillStyle = '#111'; g.beginPath(); g.arc(w * 0.55 + 9, base + 19, 4.5, 0, 7); g.arc(w * 0.55 + 30, base + 19, 4.5, 0, 7); g.fill();
  }

  function formas(g, w, hh) {
    g.fillStyle = '#f7f4ea'; g.fillRect(0, 0, w, hh);
    // tabuleiro
    for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) {
      g.fillStyle = (i + j) % 2 ? '#12205a' : '#cfd9ee';
      g.fillRect(14 + i * 18, 14 + j * 18, 18, 18);
    }
    // círculo vermelho, quadrado azul, triângulo verde
    g.fillStyle = '#e5383b'; g.beginPath(); g.arc(190, 80, 58, 0, 7); g.fill();
    g.fillStyle = '#2457f5'; g.fillRect(262, 24, 100, 100);
    g.fillStyle = '#12a150'; g.beginPath(); g.moveTo(420, 24); g.lineTo(470, 124); g.lineTo(370, 124); g.fill();
    // faixas de cor
    const cores = ['#e5383b', '#ff8a2b', '#ffd23f', '#12a150', '#2457f5', '#7b3fd6'];
    cores.forEach((c, k) => { g.fillStyle = c; g.fillRect(14 + k * 28, 150, 28, 44); });
    // degradê
    const gr = g.createLinearGradient(190, 0, 470, 0);
    gr.addColorStop(0, '#000'); gr.addColorStop(1, '#fff');
    g.fillStyle = gr; g.fillRect(190, 150, 280, 44);
    // texto e linhas
    g.fillStyle = '#12205a'; g.font = '700 64px "Atkinson", Arial, sans-serif'; g.textBaseline = 'alphabetic';
    g.fillText('ABC 123', 16, 276);
    g.strokeStyle = '#12205a'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(300, 296); g.lineTo(470, 210); g.stroke();
    g.lineWidth = 1;
    for (let k = 0; k < 8; k++) { g.beginPath(); g.moveTo(300 + k * 8, 210); g.lineTo(300 + k * 8, 300); g.stroke(); }
    g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(436, 262, 16, 0, 7); g.fill();
    g.strokeStyle = '#12205a'; g.lineWidth = 3; g.stroke();
  }

  const SAMPLES = [
    { id: 'paisagem', name: 'Paisagem', draw: paisagem },
    { id: 'cidade', name: 'Cidade à noite', draw: cidade },
    { id: 'formas', name: 'Formas e cores', draw: formas },
  ];

  function newCanvas(w, hh) {
    const c = document.createElement('canvas');
    c.width = w; c.height = hh;
    return c;
  }
  function makeSample(id) {
    const s = SAMPLES.find((x) => x.id === id) || SAMPLES[0];
    const c = newCanvas(W, H);
    const g = c.getContext('2d', { willReadFrequently: true });
    s.draw(g, W, H);
    return g.getImageData(0, 0, W, H);
  }
  function fromFile(file, maxSide = 480) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type)) { reject(new Error('Escolha um arquivo de imagem (JPG, PNG, WebP...).')); return; }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(8, Math.round(img.naturalWidth * k)), hh = Math.max(8, Math.round(img.naturalHeight * k));
        const c = newCanvas(w, hh);
        const g = c.getContext('2d', { willReadFrequently: true });
        g.drawImage(img, 0, 0, w, hh);
        URL.revokeObjectURL(url);
        try { resolve(g.getImageData(0, 0, w, hh)); } catch (e) { reject(e); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não consegui abrir essa imagem.')); };
      img.src = url;
    });
  }
  function toImageData(arr, w, hh) { return new ImageData(arr instanceof Uint8ClampedArray ? arr : new Uint8ClampedArray(arr), w, hh); }
  function draw(canvas, data) {
    if (canvas.width !== data.width || canvas.height !== data.height) { canvas.width = data.width; canvas.height = data.height; }
    canvas.getContext('2d').putImageData(data, 0, 0);
  }
  /** Reduz uma imagem para caber em (maxW x maxH): usada nas miniaturas das respostas. */
  function thumb(data, maxW = 150) {
    const k = Math.min(1, maxW / data.width);
    const w = Math.max(1, Math.round(data.width * k)), hh = Math.max(1, Math.round(data.height * k));
    const src = newCanvas(data.width, data.height);
    src.getContext('2d').putImageData(data, 0, 0);
    const dst = newCanvas(w, hh);
    const g = dst.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(src, 0, 0, w, hh);
    return g.getImageData(0, 0, w, hh);
  }
  function canvasOf(data, cls) {
    const c = newCanvas(data.width, data.height);
    c.getContext('2d').putImageData(data, 0, 0);
    if (cls) c.className = cls;
    return c;
  }

  /* ---------- foto atual (compartilhada entre as seções 2, 3 e 4) ---------- */
  const store = { cur: null, id: 'paisagem', name: 'Paisagem', subs: [] };
  function current() {
    if (!store.cur) store.cur = makeSample(store.id);
    return store.cur;
  }
  function setCurrent(data, id, name) {
    store.cur = data; store.id = id; store.name = name;
    store.subs.forEach((f) => { try { f(data, id); } catch (e) { console.error(e); } });
  }
  function onChange(fn) {
    store.subs.push(fn);
    return () => { const k = store.subs.indexOf(fn); if (k >= 0) store.subs.splice(k, 1); };
  }

  /** Seletor: exemplos desenhados por código ou foto do próprio aluno. */
  function picker() {
    const sel = h('select', { class: 'sel', 'aria-label': 'Imagem de exemplo' },
      SAMPLES.map((s) => h('option', { value: s.id }, s.name)),
      h('option', { value: 'minha', hidden: true }, 'Minha foto'));
    const status = h('span', { class: 'small muted', role: 'status', 'aria-live': 'polite' });
    const fileInput = h('input', { type: 'file', accept: 'image/*', class: 'sr-only', 'aria-label': 'Escolher uma foto do seu aparelho', tabindex: -1 });
    const btn = h('button', { type: 'button', class: 'btn sm', onclick: () => fileInput.click() }, 'Usar minha foto');
    const root = h('div', { class: 'row tight picker' },
      h('label', { class: 'field' }, 'Imagem:', sel), btn, fileInput, status);
    const sync = (data, id) => { sel.value = id; if (id !== 'minha') status.textContent = ''; };
    const off = onChange(sync);
    sel.value = store.id;
    sel.addEventListener('change', () => {
      const s = SAMPLES.find((x) => x.id === sel.value);
      setCurrent(makeSample(sel.value), sel.value, s.name);
    });
    fileInput.addEventListener('change', () => {
      const f = fileInput.files && fileInput.files[0];
      if (!f) return;
      status.textContent = 'Abrindo...';
      fromFile(f).then((d) => {
        setCurrent(d, 'minha', 'Minha foto');
        sel.value = 'minha';
        status.textContent = 'A foto fica só no seu navegador; ela não é enviada para lugar nenhum.';
      }).catch((e) => { status.textContent = e.message; }).finally(() => { fileInput.value = ''; });
    });
    return { root, select: sel, destroy: off };
  }

  /* ---------- comparador antes / depois ---------- */
  function Compare(o = {}) {
    let pos = o.pos == null ? 50 : o.pos;
    const before = h('canvas', { width: W, height: H, role: 'img', 'aria-label': o.beforeAlt || 'Imagem original' });
    const after = h('canvas', { class: 'after', width: W, height: H, role: 'img', 'aria-label': o.afterAlt || 'Imagem modificada' });
    const root = h('div', {
      class: 'cmp', tabindex: 0, role: 'slider',
      'aria-label': 'Comparador: arraste para ver antes e depois',
      'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pos,
    }, before, after,
      h('div', { class: 'handle' }), h('div', { class: 'knob', 'aria-hidden': 'true', html: '<svg viewBox="0 0 24 14" width="22" height="13" fill="currentColor"><path d="M0 7l7-6.5v13zM24 7l-7-6.5v13z"/></svg>' }),
      h('span', { class: 'tl' }, o.beforeLabel || 'Antes'), h('span', { class: 'tr' }, o.afterLabel || 'Depois'));
    const setPos = (p) => {
      pos = Math.max(0, Math.min(100, p));
      root.style.setProperty('--pos', pos + '%');
      root.setAttribute('aria-valuenow', String(Math.round(pos)));
    };
    setPos(pos);
    const fromEvent = (ev) => {
      const r = root.getBoundingClientRect();
      setPos(((ev.clientX - r.left) / r.width) * 100);
    };
    let down = false;
    root.addEventListener('pointerdown', (ev) => {
      down = true; fromEvent(ev);
      try { root.setPointerCapture(ev.pointerId); } catch (e) { /* ok */ }
    });
    root.addEventListener('pointermove', (ev) => { if (down) fromEvent(ev); });
    const up = () => { down = false; };
    root.addEventListener('pointerup', up);
    root.addEventListener('pointercancel', up);
    root.addEventListener('keydown', (ev) => {
      const step = ev.shiftKey ? 10 : 2;
      if (ev.key === 'ArrowLeft') setPos(pos - step);
      else if (ev.key === 'ArrowRight') setPos(pos + step);
      else if (ev.key === 'Home') setPos(0);
      else if (ev.key === 'End') setPos(100);
      else return;
      ev.preventDefault();
    });
    if (o.crisp) { before.classList.add('crisp'); after.classList.add('crisp'); }
    return {
      root, before, after, setPos,
      setBefore(a) { draw(before, a); },
      setAfter(b) { draw(after, b); },
      show(a, b) { draw(before, a); draw(after, b); },
    };
  }

  root.Images = { W, H, SAMPLES, makeSample, fromFile, toImageData, draw, thumb, canvasOf, newCanvas, current, setCurrent, onChange, picker };
  root.UI.Compare = Compare;
})(window);
