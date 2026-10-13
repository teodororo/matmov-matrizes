/* ==========================================================
   Peças de interface: helpers de DOM, grade (imagem/matriz), ligação entre grades,
   caixa de matriz com rótulos e componente de pergunta.
   ========================================================== */
(function (root) {
  'use strict';
  const { clamp } = root.Logic;

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  function append(el, children) {
    for (const c of children.flat(Infinity)) {
      if (c == null || c === false) continue;
      el.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
  }
  function h(tag, props, ...children) {
    const el = document.createElement(tag);
    if (props) {
      for (const k of Object.keys(props)) {
        const v = props[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'style' && typeof v === 'object') {
          for (const s of Object.keys(v)) { if (s.startsWith('--')) el.style.setProperty(s, v[s]); else el.style[s] = v[s]; }
        }
        else if (k === 'dataset') Object.assign(el.dataset, v);
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'text') el.textContent = v;
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (v === true) el.setAttribute(k, '');
        else if (k in el && !k.includes('-') && k !== 'role' && k !== 'list' && k !== 'form') { try { el[k] = v; } catch (e) { el.setAttribute(k, v); } }
        else el.setAttribute(k, v);
      }
    }
    append(el, children);
    return el;
  }

  const fmt = (n, d = 2) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: d });
  const rgb = (r, g, b) => `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
  const gray = (v) => rgb(v, v, v);
  const luma = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
  const textOn = (r, g, b) => (luma(r, g, b) > 125 ? '#12205a' : '#ffffff');
  /** Tamanho de célula (px) para caber `cols` colunas na largura de `el`. */
  function cellFor(el, cols, o = {}) {
    const { max = 36, min = 16, extra = 52 } = o;
    const w = (el && el.clientWidth) || 360;
    return Math.max(min, Math.min(max, Math.floor((w - extra) / cols)));
  }
  const rowHue = (i, n) => `hsl(${Math.round((i * 360) / n + 8)}, 88%, 52%)`;

  /* ---------- grade ---------- */
  function Grid(opts) {
    const o = Object.assign({ rows: 8, cols: 8, kind: 'matrix', cell: 28, input: false, editable: false, aria: '', maxlen: 3, min: 0, max: 255, inputmode: 'numeric' }, opts);
    const gridEl = h('div', {
      class: `mxgrid ${o.kind}${o.digits ? ' digits' : ''}${o.lines ? ' lines' : ''}${o.editable ? ' editable' : ''}`,
      style: { '--rows': o.rows, '--cols': o.cols, '--cell': o.cell + 'px' },
      role: o.editable ? 'grid' : 'group',
      'aria-label': o.aria || null,
    });
    const cells = [];
    for (let i = 0; i < o.rows; i++) {
      const row = [];
      for (let j = 0; j < o.cols; j++) {
        let v = null;
        if (o.kind === 'matrix' || o.digits) {
          v = o.input
            ? h('input', { class: 'v', type: 'text', inputmode: o.inputmode, maxlength: o.maxlen, autocomplete: 'off', spellcheck: false, 'aria-label': `linha ${i + 1}, coluna ${j + 1}` })
            : h('span', { class: 'v' });
        }
        const c = h('div', { class: 'c', dataset: { i, j }, role: o.editable ? 'gridcell' : null, tabindex: o.editable && !o.input ? (i === 0 && j === 0 ? 0 : -1) : null }, v);
        c._v = v;
        gridEl.append(c);
        row.push(c);
      }
      cells.push(row);
    }

    let hoverFn = o.onHover || null;
    const cellOf = (el) => {
      const c = el && el.closest ? el.closest('.c') : null;
      if (!c || !gridEl.contains(c)) return null;
      return { i: +c.dataset.i, j: +c.dataset.j, el: c };
    };

    // clique e arraste (pintar vários pixels)
    let dragging = false, last = '';
    if (o.onClick || o.onDrag) {
      gridEl.addEventListener('pointerdown', (ev) => {
        if (ev.target.closest && ev.target.closest('input')) return;
        const c = cellOf(ev.target);
        if (!c || c.el.classList.contains('fixed')) return;
        ev.preventDefault();
        dragging = true; last = c.i + ',' + c.j;
        try { gridEl.setPointerCapture(ev.pointerId); } catch (e) { /* ok */ }
        if (o.onClick) o.onClick(c.i, c.j, ev);
      });
      gridEl.addEventListener('pointermove', (ev) => {
        if (!dragging) return;
        const c = cellOf(document.elementFromPoint(ev.clientX, ev.clientY));
        if (!c || c.el.classList.contains('fixed')) return;
        const k = c.i + ',' + c.j;
        if (k === last) return;
        last = k;
        (o.onDrag || o.onClick)(c.i, c.j, ev);
      });
      const end = () => { dragging = false; last = ''; };
      gridEl.addEventListener('pointerup', end);
      gridEl.addEventListener('pointercancel', end);
      gridEl.addEventListener('lostpointercapture', end);
    }

    // passar o mouse / foco do teclado
    gridEl.addEventListener('pointerover', (ev) => {
      if (dragging) return;
      const c = cellOf(ev.target);
      if (c && hoverFn) hoverFn(c.i, c.j);
    });
    gridEl.addEventListener('pointerleave', () => { if (hoverFn) hoverFn(null); });
    gridEl.addEventListener('focusin', (ev) => {
      const c = cellOf(ev.target);
      if (!c) return;
      if (o.editable && !o.input) {
        cells.forEach((r) => r.forEach((x) => x.setAttribute('tabindex', x === c.el ? '0' : '-1')));
      }
      if (hoverFn) hoverFn(c.i, c.j);
    });
    gridEl.addEventListener('focusout', () => { if (hoverFn) hoverFn(null); });

    // teclado: setas movem o foco; espaço/enter pintam
    if (o.editable && !o.input) {
      gridEl.addEventListener('keydown', (ev) => {
        const c = cellOf(ev.target);
        if (!c) return;
        let { i, j } = c;
        if (ev.key === 'ArrowRight') j++;
        else if (ev.key === 'ArrowLeft') j--;
        else if (ev.key === 'ArrowDown') i++;
        else if (ev.key === 'ArrowUp') i--;
        else if (ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); if (o.onClick) o.onClick(i, j, ev); return; }
        else return;
        ev.preventDefault();
        const t = cells[clamp(i, 0, o.rows - 1)][clamp(j, 0, o.cols - 1)];
        t.focus();
      });
    }

    // células editáveis por número (0 a 255)
    if (o.input) {
      gridEl.addEventListener('input', (ev) => {
        const inp = ev.target;
        if (!inp.matches || !inp.matches('input.v')) return;
        const c = cellOf(inp);
        if (c && o.onInput) o.onInput(c.i, c.j, inp.value, inp);
      });
      const selectAll = (inp) => { try { inp.select(); inp.setSelectionRange(0, inp.value.length); } catch (e) { /* ok */ } };
      // campo cheio e com o cursor solto (nada selecionado): o próximo dígito começa um número novo,
      // em vez de ser recusado pelo limite de caracteres
      const fullAndCollapsed = (inp) => inp.selectionStart === inp.selectionEnd && inp.value.length >= o.maxlen;
      gridEl.addEventListener('keydown', (ev) => {
        const inp = ev.target;
        if (!inp.matches || !inp.matches('input.v')) return;
        if (/^[0-9]$/.test(ev.key) && !ev.ctrlKey && !ev.metaKey && !ev.altKey && fullAndCollapsed(inp)) { selectAll(inp); return; }
        const up = ev.key === 'ArrowUp', down = ev.key === 'ArrowDown';
        if (!up && !down) return;
        ev.preventDefault();
        const c = cellOf(inp);
        const cur = parseInt(inp.value, 10) || 0;
        const nv = clamp(cur + (up ? 1 : -1) * (ev.shiftKey ? 10 : 1), o.min, o.max);
        inp.value = String(nv);
        if (c && o.onInput) o.onInput(c.i, c.j, String(nv), inp);
      });
      // teclados virtuais (celular) nem sempre mandam a tecla certa no keydown
      gridEl.addEventListener('beforeinput', (ev) => {
        const inp = ev.target;
        if (!inp.matches || !inp.matches('input.v')) return;
        if (ev.inputType === 'insertText' && /^[0-9]$/.test(ev.data || '') && fullAndCollapsed(inp)) selectAll(inp);
      });
      // clicar ou tocar num campo seleciona o número inteiro; o que for digitado o substitui
      let fresh = null;
      gridEl.addEventListener('pointerdown', (ev) => {
        const inp = ev.target;
        fresh = inp.matches && inp.matches('input.v') && document.activeElement !== inp ? inp : null;
      });
      gridEl.addEventListener('click', (ev) => {
        if (fresh && ev.target === fresh) selectAll(fresh);
        fresh = null;
      });
      gridEl.addEventListener('focusin', (ev) => {
        const inp = ev.target;
        if (!inp.matches || !inp.matches('input.v')) return;
        const v0 = inp.value;
        selectAll(inp); // foco pelo teclado (Tab ou setas)
        // foco pelo mouse: o clique põe o cursor depois; seleciona de novo no quadro seguinte,
        // a menos que a pessoa já tenha começado a digitar
        requestAnimationFrame(() => { if (document.activeElement === inp && inp.value === v0) selectAll(inp); });
      });
      gridEl.addEventListener('focusout', (ev) => {
        const inp = ev.target;
        if (!inp.matches || !inp.matches('input.v')) return;
        const c = cellOf(inp);
        if (c && o.onCommit) o.onCommit(c.i, c.j, inp);
      });
    }

    const api = {
      root: gridEl, rows: o.rows, cols: o.cols, cells, opts: o,
      cell: (i, j) => cells[i][j],
      setHover(fn) { hoverFn = fn; },
      clear(cls) { gridEl.querySelectorAll('.' + cls).forEach((e) => e.classList.remove(cls)); },
      setClass(i, j, cls, on = true) { if (cells[i] && cells[i][j]) cells[i][j].classList.toggle(cls, on); },
      paint(fn, popt = {}) {
        for (let i = 0; i < o.rows; i++) {
          for (let j = 0; j < o.cols; j++) {
            const p = fn(i, j) || {};
            const c = cells[i][j];
            c.style.background = p.bg || '';
            c.style.color = p.fg || '';
            if (c._v) {
              const t = p.text == null ? '' : String(p.text);
              if (o.input) { if (popt.force || document.activeElement !== c._v) { if (c._v.value !== t) c._v.value = t; } }
              else if (c._v.textContent !== t) c._v.textContent = t;
            }
            if (p.tint !== undefined) { c.classList.toggle('tint', !!p.tint); if (p.tint) c.style.setProperty('--tint', p.tint); }
            if (p.cls) for (const k of Object.keys(p.cls)) c.classList.toggle(k, !!p.cls[k]);
          }
        }
      },
    };
    return api;
  }

  /** Teclas 0 e 1 preenchem a célula em foco e andam para a próxima (grades de zeros e uns). */
  function bindDigitKeys(grid, set) {
    grid.root.addEventListener('keydown', (ev) => {
      if (ev.key !== '0' && ev.key !== '1') return;
      const c = ev.target.closest && ev.target.closest('.c');
      if (!c) return;
      ev.preventDefault();
      const i = +c.dataset.i, j = +c.dataset.j;
      set(i, j, +ev.key);
      let ni = i, nj = j + 1;
      if (nj >= grid.cols) { nj = 0; ni = Math.min(i + 1, grid.rows - 1); }
      grid.cell(ni, nj).focus();
    });
  }

  /* ---------- caixa com título e rótulos de linhas/colunas ---------- */
  function matrixBox(grid, o = {}) {
    const isImg = grid.opts.kind === 'image';
    const box = h('figure', {
      class: 'mbox' + (isImg ? ' is-image' : '') + (grid.opts.lines ? ' lines' : '') + (o.className ? ' ' + o.className : ''),
      style: { '--cols': grid.cols, '--rows': grid.rows, '--cell': grid.opts.cell + 'px' },
    });
    if (o.title) {
      box.append(h('figcaption', { class: 'mcap' }, o.title, o.dims === false ? null : h('span', { class: 'dim' }, `${grid.rows} × ${grid.cols}`)));
    }
    const wrap = h('div', { class: 'mlab-wrap' });
    const rowBtns = [], colBtns = [];
    if (o.rowLabels) {
      const rl = h('div', { class: 'rowlabs' });
      for (let i = 0; i < grid.rows; i++) {
        const b = o.onRowLabel
          ? h('button', { type: 'button', class: 'mlab', 'aria-pressed': 'false', 'aria-label': `linha ${i + 1}`, onclick: () => o.onRowLabel(i) }, String(i + 1))
          : h('span', { class: 'mlab' }, String(i + 1));
        rowBtns.push(b); rl.append(b);
      }
      wrap.append(rl);
    }
    if (o.colLabels) {
      const cl = h('div', { class: 'collabs' });
      for (let j = 0; j < grid.cols; j++) {
        const b = o.onColLabel
          ? h('button', { type: 'button', class: 'mlab', 'aria-pressed': 'false', 'aria-label': `coluna ${j + 1}`, onclick: () => o.onColLabel(j) }, String(j + 1))
          : h('span', { class: 'mlab' }, String(j + 1));
        colBtns.push(b); cl.append(b);
      }
      wrap.append(cl);
    }
    wrap.append(h('div', { class: 'mslot' }, grid.root));
    box.append(wrap);
    return {
      root: box, rowBtns, colBtns,
      pressRow(i) { rowBtns.forEach((b, k) => b.setAttribute && b.setAttribute('aria-pressed', String(k === i))); },
      pressCol(j) { colBtns.forEach((b, k) => b.setAttribute && b.setAttribute('aria-pressed', String(k === j))); },
    };
  }

  /* ---------- ligar grades: passar o mouse numa célula destaca a mesma posição nas outras ---------- */
  function linkViews(views, onChange) {
    const set = (pos) => {
      views.forEach((v) => v.g.clear('hl'));
      if (pos) {
        views.forEach((v) => {
          const [i, j] = v.tr ? [pos[1], pos[0]] : pos;
          if (i >= 0 && j >= 0 && i < v.g.rows && j < v.g.cols) v.g.cell(i, j).classList.add('hl');
        });
      }
      if (onChange) onChange(pos);
    };
    views.forEach((v) => v.g.setHover((i, j) => set(i == null ? null : v.tr ? [j, i] : [i, j])));
    return { set };
  }

  /* ---------- pergunta com alternativas ---------- */
  const msg = (v) => (typeof v === 'function' ? v() : v);
  function Quiz(o) {
    const root = h('section', { class: 'quiz' + (o.list ? ' list' : ''), 'aria-label': 'Pergunta' });
    let options = [], btns = [], solved = false, revealed = false;
    const q = h('h3', { class: 'q' }, o.question);
    const sub = o.sub ? h('p', { class: 'q-sub' }, o.sub) : null;
    const ctx = h('div', { class: 'q-ctx' });
    const optsEl = h('div', { class: 'opts', role: 'group', 'aria-label': 'Alternativas' });
    const fb = h('div', { class: 'fb', role: 'status', 'aria-live': 'polite' });
    const bReveal = h('button', { type: 'button', class: 'btn sm', onclick: () => reveal() }, 'Mostrar a resposta');
    const bNew = o.onNew ? h('button', { type: 'button', class: 'btn sm', onclick: () => o.onNew() }, o.newLabel || 'Outra pergunta') : null;
    const actions = h('div', { class: 'quiz-actions' }, bReveal, bNew);
    root.append(q, sub, ctx, optsEl, fb, actions);
    if (o.optw) root.style.setProperty('--optw', o.optw + 'px');

    const setFb = (kind, lead, text) => {
      fb.className = 'fb ' + (kind || '');
      fb.replaceChildren();
      if (lead) fb.append(h('b', null, lead));
      if (text != null) fb.append(text.nodeType ? text : document.createTextNode(text));
    };
    const showNames = () => btns.forEach((b, i) => {
      const nm = b.querySelector('.opt-name');
      if (nm) nm.hidden = false;
      if (options[i].correct && !b.classList.contains('wrong')) b.classList.add('correct');
    });
    function choose(idx) {
      const op = options[idx], b = btns[idx];
      b.setAttribute('aria-pressed', 'true');
      if (op.correct) {
        b.classList.remove('wrong'); b.classList.add('correct');
        solved = true;
        setFb('ok', 'Isso mesmo! ', msg(op.okMsg || op.why) || '');
        showNames();
      } else {
        b.classList.add('wrong');
        setFb('bad', 'Ainda não. ', msg(op.why) || 'Tente outra alternativa.');
        const nm = b.querySelector('.opt-name');
        if (nm) nm.hidden = false;
      }
      if (o.onChoose) o.onChoose(op, idx);
    }
    function reveal() {
      const idx = options.findIndex((x) => x.correct);
      if (idx < 0) return;
      revealed = true;
      btns.forEach((b) => b.classList.remove('wrong'));
      btns[idx].classList.add('correct');
      setFb('ok', 'Resposta: ', msg(options[idx].okMsg || options[idx].why) || '');
      showNames();
    }
    function setOptions(opts, ctxNode) {
      options = opts; solved = false; revealed = false;
      ctx.replaceChildren(); if (ctxNode) { ctx.append(ctxNode); ctx.hidden = false; } else ctx.hidden = true;
      optsEl.replaceChildren();
      btns = opts.map((op, i) => {
        const k = h('span', { class: 'opt-k', 'aria-hidden': 'true' }, 'abcdefgh'[i]);
        const body = h('div', { class: 'opt-body' }, op.content, op.name ? h('span', { class: 'opt-name', hidden: true }, op.name) : null);
        const b = h('button', { type: 'button', class: 'opt' + (op.vis ? ' vis' : ' list-item'), 'aria-pressed': 'false', 'aria-label': op.label || null, onclick: () => choose(i) }, k, body);
        optsEl.append(b);
        return b;
      });
      setFb('', null, o.hint || 'Escolha uma alternativa. Se errar, leia o motivo e tente outra.');
    }
    return {
      root, setOptions, reveal,
      setQuestion(t) { q.textContent = t; },
      setSub(t) { if (sub) sub.textContent = t; },
      get solved() { return solved; },
    };
  }

  root.UI = { $, $$, h, Grid, matrixBox, linkViews, Quiz, bindDigitKeys, fmt, rgb, gray, luma, textOn, rowHue, cellFor };
})(window);
