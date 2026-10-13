/* ==========================================================
   Abertura: a palavra MATRIZ desenhada com pixels. Cada quadradinho é um número (0 ou 1).
   ========================================================== */
(function (root) {
  'use strict';
  const GLYPHS = {
    M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
    A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
    T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
    R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
    I: ['111', '010', '010', '010', '010', '010', '111'],
    Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  };
  const WORD = 'MATRIZ';

  function wordRows() {
    const rows = ['', '', '', '', '', '', ''];
    [...WORD].forEach((ch, k) => {
      const g = GLYPHS[ch];
      for (let r = 0; r < 7; r++) rows[r] += (k ? '0' : '') + g[r];
    });
    return rows;
  }

  function init() {
    const host = document.getElementById('hero-bits');
    if (!host) return;
    const rows = wordRows();
    const cols = rows[0].length;
    host.style.setProperty('--cols', cols);
    const cells = [];
    rows.forEach((r, i) => {
      [...r].forEach((ch, j) => {
        const el = document.createElement('div');
        el.className = 'bit' + (ch === '1' ? ' on' : '');
        el.style.setProperty('--col', j);
        el.textContent = ch;
        el.dataset.o = ch;
        host.append(el);
        cells.push(el);
      });
    });

    const set = (el, on) => {
      el.classList.toggle('on', on);
      el.textContent = on ? '1' : '0';
    };
    let mode = null;
    const under = (ev) => {
      const t = document.elementFromPoint(ev.clientX, ev.clientY);
      return t && t.classList && t.classList.contains('bit') && host.contains(t) ? t : null;
    };
    host.addEventListener('pointerdown', (ev) => {
      const el = ev.target.classList && ev.target.classList.contains('bit') ? ev.target : null;
      if (!el) return;
      ev.preventDefault();
      host.classList.remove('intro');
      mode = !el.classList.contains('on');
      set(el, mode);
      try { host.setPointerCapture(ev.pointerId); } catch (e) { /* ok */ }
    });
    host.addEventListener('pointermove', (ev) => {
      if (mode === null) return;
      const el = under(ev);
      if (el) set(el, mode);
    });
    const end = () => { mode = null; };
    host.addEventListener('pointerup', end);
    host.addEventListener('pointercancel', end);
    host.addEventListener('lostpointercapture', end);

    const reset = document.getElementById('hero-reset');
    if (reset) {
      reset.addEventListener('click', () => {
        cells.forEach((el) => set(el, el.dataset.o === '1'));
      });
    }
  }

  root.Hero = { init, wordRows };
})(window);
