/* ==========================================================
   Seção 3: subtração e o negativo da imagem  (N = J - A)
   ========================================================== */
(function (root) {
  'use strict';
  const { $, h, Grid, matrixBox, linkViews, Quiz, cellFor, rgb, gray, textOn, bindDigitKeys } = root.UI;
  const { Mx, clamp, shuffle, bitsFromRows, invertRGBA, CHANNELS } = root.Logic;

  const BW = (v) => ({ bg: v ? '#ffffff' : '#000000', fg: v ? '#12205a' : '#ffffff', text: v });
  const GR = (v) => ({ bg: gray(v), fg: textOn(v, v, v), text: v });
  const CH = { R: { name: 'vermelho', cls: 'tag-r' }, G: { name: 'verde', cls: 'tag-g' }, B: { name: 'azul', cls: 'tag-b' } };
  const mono = (t) => h('span', { class: 'mono' }, String(t));
  const op = (t) => h('div', { class: 'op', 'aria-hidden': 'true' }, t);

  function init(panel) {
    const bwHost = $('#s3-bw', panel), pxHost = $('#s3-px', panel), grHost = $('#s3-gray', panel);
    const phHost = $('#s3-photo', panel), quizHost = $('#s3-quiz', panel);
    const bwArt = root.ART.bits, grArt = root.ART.grays;

    const st = {
      bwId: 'carinha', bwOrig: null, bw: null,
      grId: grArt[0].id, grOrig: null, gr: null,
      px: 60,
      use: { R: true, G: true, B: true }, twice: false,
      renders: [],
    };
    const renderAll = () => st.renders.forEach((f) => f());
    const loadBW = (id) => { st.bwId = id; st.bwOrig = bitsFromRows((bwArt.find((a) => a.id === id) || bwArt[0]).rows); st.bw = Mx.clone(st.bwOrig); };
    const loadGR = (id) => { st.grId = id; st.grOrig = Mx.clone((grArt.find((a) => a.id === id) || grArt[0]).m); st.gr = Mx.clone(st.grOrig); };
    loadBW(st.bwId); loadGR(st.grId);

    /* ============ 3.1  preto e branco: J - A = N ============ */
    function buildBW() {
      const hadFocus = bwHost.contains(document.activeElement) && document.activeElement.tagName === 'SELECT';
      bwHost.replaceChildren();
      st.renders = st.renders.filter((f) => !f.bw);
      const rows = st.bw.length, cols = st.bw[0].length;
      const cell = cellFor(bwHost, cols, { max: 30, min: 18, extra: 62 });
      let paint = 1;
      const set = (i, j, v) => { if (st.bw[i][j] !== v) { st.bw[i][j] = v; renderAll(); } };
      const down = (i, j) => { paint = 1 - st.bw[i][j]; set(i, j, paint); };
      const move = (i, j) => set(i, j, paint);

      const gJ = Grid({ rows, cols, kind: 'matrix', cell, aria: 'Matriz J, com 1 em todas as posições' });
      const gA = Grid({ rows, cols, kind: 'matrix', cell, editable: true, onClick: down, onDrag: move, aria: 'Matriz A, a imagem original. Clique ou arraste para trocar 0 e 1.' });
      const gN = Grid({ rows, cols, kind: 'matrix', cell, editable: true, onClick: down, onDrag: move, aria: 'Matriz N, o negativo. Clique para trocar o pixel correspondente de A.' });
      bindDigitKeys(gA, set);
      const bJ = matrixBox(gJ, { title: h('span', null, h('i', null, 'J'), ' (só 1)'), dims: false });
      const bA = matrixBox(gA, { title: h('span', null, h('i', null, 'A'), ' (imagem)'), dims: false });
      const bN = matrixBox(gN, { title: h('span', null, h('i', null, 'N'), ' = ', h('i', null, 'J'), ' − ', h('i', null, 'A')), dims: false });

      const sel = h('select', { class: 'sel', 'aria-label': 'Escolher o desenho', onchange: (ev) => { loadBW(ev.target.value); buildBW(); renderAll(); } },
        bwArt.map((a) => h('option', { value: a.id, selected: a.id === st.bwId }, a.name)));
      const bReset = h('button', { type: 'button', class: 'btn', onclick: () => { st.bw = Mx.clone(st.bwOrig); renderAll(); } }, 'Voltar à imagem original');
      const info = h('p', { class: 'infoline', 'aria-live': 'polite' });
      const dflt = 'Passe o mouse sobre um pixel para ver a conta dele.';
      info.textContent = dflt;
      linkViews([gJ, gA, gN].map((g) => ({ g })), (pos) => {
        if (!pos) { info.textContent = dflt; return; }
        const [i, j] = pos, a = st.bw[i][j];
        info.replaceChildren('Linha ', h('b', null, String(i + 1)), ', coluna ', h('b', null, String(j + 1)), ': ', mono(`1 − ${a} = ${1 - a}`),
          a ? ' (o pixel branco vira preto)' : ' (o pixel preto vira branco)');
      });

      const render = () => {
        gJ.paint(() => BW(1));
        gA.paint((i, j) => BW(st.bw[i][j]));
        gN.paint((i, j) => BW(1 - st.bw[i][j]));
        bReset.disabled = st.bw.every((r, i) => r.every((v, j) => v === st.bwOrig[i][j]));
      };
      render.bw = true;
      st.renders.push(render);

      bwHost.append(h('div', { class: 'lab' },
        h('div', { class: 'lab-bar' }, h('label', { class: 'field' }, 'Desenho:', sel), bReset),
        h('div', { class: 'eq' }, bJ.root, op('−'), bA.root, op('='), bN.root), info));
      render();
      if (hadFocus) sel.focus();
    }

    /* ============ 3.2a  um pixel: 255 - v ============ */
    function buildPx() {
      pxHost.replaceChildren();
      st.renders = st.renders.filter((f) => !f.px);
      const sw1 = h('div', { class: 'px-sw', role: 'img' }), sw2 = h('div', { class: 'px-sw', role: 'img' });
      const mk1 = h('i', { class: 'mk' }), mk2 = h('i', { class: 'mk' });
      const formula = h('div', { class: 'px-formula mono', 'aria-live': 'polite' });
      const slider = h('input', { type: 'range', min: 0, max: 255, step: 1, value: st.px, 'aria-label': 'Tom de cinza do pixel, de 0 a 255', oninput: (ev) => set(+ev.target.value) });
      const numIn = h('input', { type: 'number', class: 'num', min: 0, max: 255, value: st.px, 'aria-label': 'Valor do pixel',
        oninput: (ev) => { const v = parseInt(ev.target.value, 10); if (!isNaN(v)) set(clamp(v, 0, 255), true); } });
      function set(v, fromNum) { st.px = v; slider.value = v; if (!fromNum) numIn.value = v; renderAll(); }
      const render = () => {
        const v = st.px, n = 255 - v;
        const f = (el, val, label) => { el.style.background = gray(val); el.style.color = textOn(val, val, val); el.textContent = val; el.setAttribute('aria-label', `${label}: ${val}`); };
        f(sw1, v, 'Pixel original'); f(sw2, n, 'Pixel no negativo');
        mk1.style.left = (v / 255) * 100 + '%'; mk2.style.left = (v / 255) * 100 + '%';
        formula.textContent = `255 − ${v} = ${n}`;
      };
      render.px = true;
      st.renders.push(render);
      pxHost.append(h('div', { class: 'lab' },
        h('div', { class: 'lab-bar' }, h('label', { class: 'field' }, 'Valor do pixel:'), slider, numIn),
        h('div', { class: 'px-demo' },
          h('figure', { class: 'px-fig' }, sw1, h('figcaption', null, 'Original')),
          h('div', { class: 'px-mid' }, h('div', { class: 'px-formula-wrap' }, formula)),
          h('figure', { class: 'px-fig' }, sw2, h('figcaption', null, 'Negativo'))),
        h('div', { class: 'strips' },
          h('div', null, h('span', { class: 'small muted' }, 'Escala original: 0 (preto) até 255 (branco)'), h('div', { class: 'strip' }, mk1)),
          h('div', null, h('span', { class: 'small muted' }, 'Escala do negativo: 255 (branco) até 0 (preto)'), h('div', { class: 'strip rev' }, mk2)))));
      render();
    }

    /* ============ 3.2b  matriz de tons de cinza ============ */
    function buildGray() {
      const hadFocus = grHost.contains(document.activeElement) && document.activeElement.tagName === 'SELECT';
      grHost.replaceChildren();
      st.renders = st.renders.filter((f) => !f.gr);
      const rows = st.gr.length, cols = st.gr[0].length;
      const cell = cellFor(grHost, cols, { max: 28, min: 20, extra: 62 });
      const gJ = Grid({ rows, cols, kind: 'matrix', cell, aria: 'Matriz J, com 255 em todas as posições' });
      const gA = Grid({
        rows, cols, kind: 'matrix', input: true, cell, aria: 'Matriz A, tons de cinza. Digite números de 0 a 255.',
        onInput: (i, j, txt, inp) => {
          const clean = txt.replace(/\D/g, '').slice(0, 3);
          if (clean !== txt) inp.value = clean;
          if (clean === '') return;
          const v = clamp(parseInt(clean, 10), 0, 255);
          if (st.gr[i][j] !== v) { st.gr[i][j] = v; renderAll(); }
        },
        onCommit: () => render(true),
      });
      const gN = Grid({ rows, cols, kind: 'matrix', cell, aria: 'Matriz N, o negativo' });
      const bJ = matrixBox(gJ, { title: h('span', null, h('i', null, 'J'), ' (só 255)'), dims: false });
      const bA = matrixBox(gA, { title: h('span', null, h('i', null, 'A'), ' (imagem)'), dims: false });
      const bN = matrixBox(gN, { title: h('span', null, h('i', null, 'N'), ' = ', h('i', null, 'J'), ' − ', h('i', null, 'A')), dims: false });
      const sel = h('select', { class: 'sel', 'aria-label': 'Escolher a imagem', onchange: (ev) => { loadGR(ev.target.value); buildGray(); renderAll(); } },
        grArt.map((a) => h('option', { value: a.id, selected: a.id === st.grId }, a.name)));
      const bReset = h('button', { type: 'button', class: 'btn', onclick: () => { st.gr = Mx.clone(st.grOrig); renderAll(); render(true); } }, 'Voltar à imagem original');
      const info = h('p', { class: 'infoline', 'aria-live': 'polite' });
      const dflt = 'Passe o mouse sobre um pixel para ver a conta dele.';
      info.textContent = dflt;
      linkViews([gJ, gA, gN].map((g) => ({ g })), (pos) => {
        if (!pos) { info.textContent = dflt; return; }
        const [i, j] = pos, a = st.gr[i][j];
        info.replaceChildren('Linha ', h('b', null, String(i + 1)), ', coluna ', h('b', null, String(j + 1)), ': ', mono(`255 − ${a} = ${255 - a}`));
      });
      const render = (force) => {
        gJ.paint(() => GR(255));
        gA.paint((i, j) => GR(st.gr[i][j]), { force: force === true });
        gN.paint((i, j) => GR(255 - st.gr[i][j]));
        bReset.disabled = st.gr.every((r, i) => r.every((v, j) => v === st.grOrig[i][j]));
      };
      render.gr = true;
      st.renders.push(render);
      grHost.append(h('div', { class: 'lab' },
        h('div', { class: 'lab-bar' }, h('label', { class: 'field' }, 'Imagem:', sel), bReset),
        h('div', { class: 'eq' }, bJ.root, op('−'), bA.root, op('='), bN.root), info));
      render(true);
      if (hadFocus) sel.focus();
    }

    /* ============ 3.3  foto colorida ============ */
    let picker = null, photoCmp = null;
    function buildPhoto() {
      if (picker) picker.destroy();
      phHost.replaceChildren();
      st.renders = st.renders.filter((f) => !f.ph);
      const pk = picker = root.Images.picker();
      const cmp = photoCmp = root.UI.Compare({ beforeLabel: 'Original', afterLabel: 'Negativo', beforeAlt: 'Foto original', afterAlt: 'Foto em negativo' });
      const chk = CHANNELS.map((c) => h('label', { class: 'check' },
        h('input', { type: 'checkbox', checked: st.use[c], onchange: (ev) => { st.use[c] = ev.target.checked; renderAll(); } }),
        h('span', { class: CH[c].cls }, CH[c].name)));
      const ckTwice = h('input', { type: 'checkbox', checked: st.twice, onchange: (ev) => { st.twice = ev.target.checked; renderAll(); } });
      const info = h('p', { class: 'infoline', 'aria-live': 'off' });
      const dflt = 'Passe o mouse sobre a foto para ver os números de um pixel antes e depois.';
      info.textContent = dflt;

      let src = null, out = null;
      const render = () => {
        src = root.Images.current();
        let o = invertRGBA(src.data, st.use);
        if (st.twice) o = invertRGBA(o, st.use);
        out = o;
        cmp.setBefore(src);
        cmp.setAfter(root.Images.toImageData(out, src.width, src.height));
        cmp.root.querySelector('.tr').textContent = st.twice ? 'Negativo do negativo' : 'Negativo';
      };
      render.ph = true;
      st.renders.push(render);

      const probe = (ev) => {
        if (!src) return;
        const r = cmp.root.getBoundingClientRect();
        const x = clamp(Math.floor(((ev.clientX - r.left) / r.width) * src.width), 0, src.width - 1);
        const y = clamp(Math.floor(((ev.clientY - r.top) / r.height) * src.height), 0, src.height - 1);
        const p = (y * src.width + x) * 4;
        const a = [src.data[p], src.data[p + 1], src.data[p + 2]], b = [out[p], out[p + 1], out[p + 2]];
        const part = (k, c) => h('span', { class: CH[c].cls }, `${c} ${a[k]} → ${b[k]}`);
        info.replaceChildren('Pixel (', mono(`${x}, ${y}`), '): ', part(0, 'R'), '  ', part(1, 'G'), '  ', part(2, 'B'), '  ',
          h('span', { class: 'swatch', style: { background: rgb(...a) } }), ' → ', h('span', { class: 'swatch', style: { background: rgb(...b) } }));
      };
      cmp.root.addEventListener('pointermove', probe);
      cmp.root.addEventListener('pointerleave', () => { info.textContent = dflt; });

      phHost.append(h('div', { class: 'lab' },
        h('div', { class: 'lab-bar' }, pk.root),
        h('div', { class: 'lab-bar' }, h('b', null, 'Inverter os canais:'), chk, h('label', { class: 'check' }, ckTwice, 'Aplicar o negativo duas vezes')),
        h('div', { class: 'photo-wide' }, cmp.root), info));
      render();
    }
    root.Images.onChange(() => { if (photoCmp) st.renders.filter((f) => f.ph).forEach((f) => f()); });

    /* ============ pergunta ============ */
    const Q = [
      {
        q: 'Um pixel de uma imagem vale 60, numa escala de 0 a 255. Quanto ele vale no negativo da imagem?', sub: 'Lembre: N = 255 − A.', list: false,
        opts: [
          { t: mono(195), ok: true, why: '255 − 60 = 195. O pixel era escuro e vira um cinza claro.' },
          { t: mono(60), why: 'Esse seria o valor sem nenhuma alteração. O negativo precisa inverter o tom.' },
          { t: mono(315), why: 'Isso é 255 + 60. Passa do máximo (255) e nem existe como tom de cinza. A conta do negativo é 255 − 60.' },
          { t: mono('−195'), why: 'Isso é 60 − 255. A ordem da subtração está trocada, e um pixel não pode ter valor negativo. O certo é 255 − 60.' },
          { t: mono(0), why: 'O resultado só seria 0 (preto) se o pixel original valesse 255. Aqui a conta é 255 − 60.' },
        ],
      },
      {
        q: 'Qual conta, feita em todos os pixels, dá o negativo de uma imagem só de preto e branco (valores 0 e 1)?', sub: 'Pense em N = J − A, com J cheia de 1.', list: false,
        opts: [
          { t: h('span', { class: 'mono' }, '1 − pixel'), ok: true, why: 'Troca 0 por 1 e 1 por 0, que é exatamente inverter preto e branco.' },
          { t: h('span', { class: 'mono' }, 'pixel − 1'), why: 'Daria −1 (para o preto) e 0 (para o branco). Não existe pixel com valor −1.' },
          { t: h('span', { class: 'mono' }, 'pixel + 1'), why: 'Daria 1 (para o preto) e 2 (para o branco). O valor 2 não existe numa imagem de 0 e 1.' },
          { t: h('span', { class: 'mono' }, 'pixel × 0'), why: 'Multiplicar por 0 zera todos os pixels, e a imagem fica toda preta.' },
          { t: h('span', { class: 'mono' }, 'pixel × 1'), why: 'Multiplicar por 1 não muda nada: a imagem fica igual.' },
        ],
      },
      {
        q: 'O que acontece se você aplicar o negativo duas vezes seguidas na mesma imagem?', sub: 'Dica: calcule 255 − (255 − A). Você pode conferir marcando “Aplicar o negativo duas vezes” na foto acima.', list: true,
        opts: [
          { t: 'Volta a ser exatamente a imagem original.', ok: true, why: '255 − (255 − A) = A. Inverter duas vezes devolve o valor de cada pixel.' },
          { t: 'Fica toda preta.', why: 'Se isso acontecesse, todos os pixels virariam 0. Mas 255 − (255 − A) devolve A, não 0.' },
          { t: 'Fica toda branca.', why: 'Se isso acontecesse, todos os pixels virariam 255. Mas 255 − (255 − A) devolve A.' },
          { t: 'Fica igual ao negativo.', why: 'O negativo é só o primeiro passo. O segundo passo desfaz o primeiro.' },
          { t: 'Fica com o dobro de brilho.', why: 'A conta não soma nem multiplica nada: ela só inverte duas vezes, e o valor volta ao que era.' },
        ],
      },
    ];
    let qi = 0;
    const quiz = Quiz({ question: Q[0].q, sub: Q[0].sub, optw: 150, newLabel: 'Outra pergunta', onNew: () => { qi = (qi + 1) % Q.length; setQ(); } });
    function setQ() {
      const q = Q[qi];
      quiz.setQuestion(q.q); quiz.setSub(q.sub);
      quiz.root.classList.toggle('list', q.list);
      quiz.setOptions(shuffle(q.opts).map((o) => ({ correct: !!o.ok, content: o.t, why: o.why })));
    }
    setQ();
    quizHost.append(quiz.root);

    /* ---------- montagem ---------- */
    function rebuild() { buildBW(); buildPx(); buildGray(); buildPhoto(); renderAll(); }
    rebuild();
    let lastW = panel.clientWidth, timer = 0;
    window.addEventListener('resize', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (panel.hidden || Math.abs(panel.clientWidth - lastW) < 8) return;
        lastW = panel.clientWidth;
        rebuild();
      }, 180);
    });
  }

  root.Sections = root.Sections || {};
  root.Sections.s3 = { init };
})(window);
