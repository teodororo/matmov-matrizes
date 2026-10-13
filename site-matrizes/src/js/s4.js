/* ==========================================================
   Seção 4: filtros (matriz 3 x 3 que desliza pela imagem)
   ========================================================== */
(function (root) {
  'use strict';
  const { $, h, Grid, matrixBox, linkViews, Quiz, cellFor, rgb, gray, textOn } = root.UI;
  const L = root.Logic;
  const { Mx, clamp, shuffle, mulberry32, KERNELS, findKernel, neighborhood, applyKernel, convolveGrid, convolveRGBA } = L;

  const nf = (v) => String(Math.round(v * 100) / 100).replace('.', ',');
  const parseNum = (t) => {
    const s = String(t).replace('−', '-').replace(',', '.').trim();
    if (s === '' || s === '-' || s === '.' || s === '-.') return NaN;
    return parseFloat(s);
  };
  const mono = (t) => h('span', { class: 'mono' }, String(t));
  const op = (t) => h('div', { class: 'op', 'aria-hidden': 'true' }, t);
  const kColor = (v) => (v < 0 ? '#c92a2a' : v === 0 ? '#8d97bb' : '#12205a');
  const GR = (v) => ({ bg: gray(v), fg: textOn(v, v, v), text: v });
  const sumK = (K) => K.reduce((s, r) => s + r.reduce((a, b) => a + b, 0), 0);
  const byId = (id) => KERNELS.find((k) => k.id === id);
  const SHIFT_RIGHT = { k: [[0, 0, 0], [1, 0, 0], [0, 0, 0]], div: 1, off: 0, gray: false };

  /* imagem de teste (fixa) usada para conferir os desafios */
  const TEST = (() => { const r = mulberry32(11); return Mx.make(8, 8, () => 30 + Math.floor(r() * 190)); })();
  const CHALLENGES = [
    { id: 'dir', title: 'Deslocar a imagem 1 pixel para a direita',
      hint: 'Só um dos 9 números deve valer 1, e todos os outros 0. Pergunte-se: de qual vizinho o pixel precisa copiar o valor para a imagem andar para a direita?',
      sol: SHIFT_RIGHT, expected: (g) => g.map((r, i) => r.map((v, j) => g[i][Math.max(j - 1, 0)])) },
    { id: 'baixo', title: 'Deslocar a imagem 1 pixel para baixo',
      hint: 'É parecido com o desafio anterior, mas o 1 fica em cima ou embaixo do centro. De qual vizinho o pixel precisa copiar o valor?',
      sol: { k: [[0, 1, 0], [0, 0, 0], [0, 0, 0]], div: 1, off: 0, gray: false }, expected: (g) => g.map((r, i) => r.map((v, j) => g[Math.max(i - 1, 0)][j])) },
    { id: 'escuro', title: 'Escurecer: cada pixel passa a valer a metade',
      hint: 'Só o centro conta. Ele pode valer 0,5, ou você pode usar 1 no centro e divisor 2.',
      sol: { k: [[0, 0, 0], [0, 0.5, 0], [0, 0, 0]], div: 1, off: 0, gray: false }, expected: (g) => g.map((r) => r.map((v) => Math.round(v / 2))) },
    { id: 'neg', title: 'Fazer o negativo (255 − pixel)',
      hint: 'É o negativo da seção 3, escrito como filtro: o centro vale −1 e o deslocamento é 255.',
      sol: { k: [[0, 0, 0], [0, -1, 0], [0, 0, 0]], div: 1, off: 255, gray: false }, expected: (g) => g.map((r) => r.map((v) => 255 - v)) },
  ];
  function passes(ch, st) {
    const out = convolveGrid(TEST, st.k, st.div, st.off), exp = ch.expected(TEST);
    return out.every((r, i) => r.every((v, j) => Math.abs(v - exp[i][j]) <= 1));
  }

  const RECIPES = [
    { goal: 'Copiar sem mudar', rule: 'Um 1 no centro e 0 em todo o resto.', k: byId('identidade') },
    { goal: 'Borrar', rule: 'Números iguais em todas as posições e divisor igual à soma deles. Cada pixel vira a média da vizinhança.', k: byId('desfoque') },
    { goal: 'Clarear ou escurecer', rule: 'Só o centro conta. Valendo mais que 1, clareia; entre 0 e 1, escurece.', k: byId('claro') },
    { goal: 'Deixar mais nítida', rule: 'Centro grande e vizinhos negativos, de modo que a soma dê 1. O pixel é reforçado e os vizinhos descontados.', k: byId('nitidez') },
    { goal: 'Mostrar as bordas', rule: 'Números positivos e negativos que somam 0. Onde a imagem é lisa dá 0 (preto); onde muda, aparece uma linha.', k: byId('bordas') },
    { goal: 'Deslocar a imagem', rule: 'Um único 1 fora do centro: o pixel copia o valor de um vizinho.', k: Object.assign({ name: 'Deslocar' }, SHIFT_RIGHT) },
    { goal: 'Fazer o negativo', rule: 'Centro −1 e deslocamento 255, como na seção 3.', k: byId('negativo') },
  ];

  function init(panel) {
    const inspHost = $('#s4-inspector', panel), chalHost = $('#s4-challenges', panel);
    const photoHost = $('#s4-photo', panel), rcpHost = $('#s4-recipes', panel), quizHost = $('#s4-quiz', panel);
    const IN_ARTS = [{ id: 'quadrado', name: 'Quadrado', m: root.ART.quadrado }].concat(root.ART.grays);
    const d0 = byId('desfoque');

    const st = {
      k: Mx.clone(d0.k), div: d0.div, off: d0.off, gray: d0.gray, preset: d0.id,
      inId: IN_ARTS[0].id, inOrig: null, inp: null, sel: [3, 3],
      renders: [],
    };
    const renderAll = () => st.renders.forEach((f) => f());
    const loadIn = (id) => { st.inId = id; st.inOrig = Mx.clone((IN_ARTS.find((a) => a.id === id) || IN_ARTS[0]).m); st.inp = Mx.clone(st.inOrig); st.sel = [3, 3]; };
    loadIn(st.inId);

    function setKernel(p) {
      if (p.k) st.k = Mx.clone(p.k);
      if ('div' in p) st.div = p.div;
      if ('off' in p) st.off = p.off;
      if ('gray' in p) st.gray = p.gray;
      const f = findKernel(st.k, st.div, st.off);
      st.preset = f ? f.id : null;
      renderAll();
    }

    /* ---------- editor do filtro: lista, divisor, deslocamento e a matriz K ---------- */
    function KernelEditor(o) {
      const cell = o.cell || 46;
      const sel = h('select', { class: 'sel', 'aria-label': 'Escolher um filtro pronto', onchange: (ev) => {
        const p = byId(ev.target.value);
        if (p) setKernel({ k: p.k, div: p.div, off: p.off, gray: p.gray });
      } }, KERNELS.map((k) => h('option', { value: k.id }, k.name)), h('option', { value: 'custom' }, 'Personalizado'));
      const grid = Grid({
        rows: 3, cols: 3, kind: 'matrix', input: true, cell, inputmode: 'text', maxlen: 5, min: -99, max: 99,
        aria: 'Filtro, matriz 3 por 3. Digite números (pode ser negativo ou decimal).',
        onInput: (i, j, txt, inp) => {
          const clean = txt.replace('−', '-').replace(/[^0-9,.\-]/g, '');
          if (clean !== txt) inp.value = clean;
          const v = parseNum(clean);
          if (isNaN(v)) return;
          const k = Mx.clone(st.k); k[i][j] = clamp(v, -99, 99);
          setKernel({ k });
        },
        onCommit: () => render(true),
      });
      const kbox = matrixBox(grid, { title: h('span', null, 'Filtro ', h('i', null, 'K')), dims: false });
      const divIn = h('input', { type: 'text', inputmode: 'text', class: 'num', 'aria-label': 'Divisor',
        oninput: (ev) => { const v = parseNum(ev.target.value); if (!isNaN(v) && v !== 0) setKernel({ div: v }); },
        onblur: () => render(true) });
      const offIn = h('input', { type: 'text', inputmode: 'text', class: 'num', 'aria-label': 'Deslocamento',
        oninput: (ev) => { const v = parseNum(ev.target.value); if (!isNaN(v)) setKernel({ off: v }); },
        onblur: () => render(true) });
      const grayCk = o.gray ? h('input', { type: 'checkbox', onchange: (ev) => setKernel({ gray: ev.target.checked }) }) : null;
      const bar = h('div', { class: 'lab-bar' },
        o.noSelect ? null : h('label', { class: 'field' }, 'Filtro:', sel),
        h('label', { class: 'field' }, 'Divisor:', divIn),
        h('label', { class: 'field' }, 'Deslocamento:', offIn),
        grayCk ? h('label', { class: 'check' }, grayCk, 'Converter para tons de cinza') : null);
      const desc = h('p', { class: 'infoline kdesc', 'aria-live': 'polite' });
      function note() {
        const s = sumK(st.k), r = s / st.div, off = st.off;
        if (Math.abs(r - 1) < 1e-9) return 'A soma dos números do filtro, dividida pelo divisor, dá 1: o brilho médio da imagem não muda.';
        if (Math.abs(r) < 1e-9) return off ? `A soma dos números do filtro é 0: onde a imagem é lisa, o resultado é ${nf(off)}, e só as mudanças aparecem.` : 'A soma dos números do filtro é 0: onde a imagem é lisa, o resultado é 0 (preto), e só as mudanças aparecem.';
        if (r > 1) return `A soma dos números do filtro, dividida pelo divisor, dá ${nf(r)}, maior que 1: a imagem fica mais clara.`;
        if (r > 0) return `A soma dos números do filtro, dividida pelo divisor, dá ${nf(r)}, entre 0 e 1: a imagem fica mais escura.`;
        return `A soma dos números do filtro, dividida pelo divisor, dá ${nf(r)}, que é negativo: os tons ficam invertidos.`;
      }
      function render(force) {
        grid.paint((i, j) => ({ bg: '#ffffff', fg: kColor(st.k[i][j]), text: nf(st.k[i][j]) }), { force: force === true });
        sel.value = st.preset || 'custom';
        if (force === true || document.activeElement !== divIn) divIn.value = nf(st.div);
        if (force === true || document.activeElement !== offIn) offIn.value = nf(st.off);
        if (grayCk) grayCk.checked = st.gray;
        const p = st.preset ? byId(st.preset) : null;
        desc.replaceChildren(h('b', null, p ? p.name + ': ' : 'Filtro personalizado: '), p ? p.desc + ' ' : 'Você montou os seus próprios números. ', note());
      }
      return { bar, kbox, grid, desc, render, sel };
    }

    /* ============ 4.1  inspetor de um pixel ============ */
    function buildInspector() {
      const hadFocus = inspHost.contains(document.activeElement) && document.activeElement.tagName === 'SELECT';
      inspHost.replaceChildren();
      st.renders = st.renders.filter((f) => !f.insp);
      const n = 8;
      const cell = cellFor(inspHost, n * 2, { max: 30, min: 18, extra: 130 });
      const calcCell = cellFor(inspHost, 9, { max: 46, min: 28, extra: 130 });

      const gIn = Grid({
        rows: n, cols: n, kind: 'matrix', input: true, cell, aria: 'Imagem de entrada, 8 por 8. Passe o mouse num pixel para ver o cálculo. Digite números de 0 a 255 para mudar.',
        onInput: (i, j, txt, inp) => {
          const clean = txt.replace(/\D/g, '').slice(0, 3);
          if (clean !== txt) inp.value = clean;
          if (clean === '') return;
          const v = clamp(parseInt(clean, 10), 0, 255);
          if (st.inp[i][j] !== v) { st.inp[i][j] = v; renderAll(); }
        },
        onCommit: () => render(true),
      });
      const gOut = Grid({ rows: n, cols: n, kind: 'matrix', cell, aria: 'Imagem de saída, depois do filtro' });
      const select = (i, j) => { if (i == null) return; if (st.sel[0] === i && st.sel[1] === j) return; st.sel = [i, j]; render(); };
      gIn.setHover(select); gOut.setHover(select);

      const bIn = matrixBox(gIn, { title: 'Entrada', dims: false });
      const bOut = matrixBox(gOut, { title: 'Saída', dims: false });
      const arrow = h('div', { class: 'op', 'aria-hidden': 'true', html: '<svg viewBox="0 0 44 20" width="44" height="20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10h36M30 3l9 7-9 7"/></svg>' });

      // cálculo do pixel escolhido
      const gN = Grid({ rows: 3, cols: 3, kind: 'matrix', cell: calcCell, aria: 'Os 9 pixels da vizinhança' });
      const gP = Grid({ rows: 3, cols: 3, kind: 'matrix', cell: calcCell, aria: 'Produtos: cada pixel vezes o número do filtro' });
      const ed = KernelEditor({ cell: calcCell, gray: false });
      ed.grid.root.classList.add('k-calc');
      const bN = matrixBox(gN, { title: 'Vizinhança', dims: false });
      const bP = matrixBox(gP, { title: 'Produtos', dims: false });
      linkViews([gN, ed.grid, gP].map((g) => ({ g })), null);
      const result = h('div', { class: 'receipt', 'aria-live': 'polite' });

      const sel = h('select', { class: 'sel', 'aria-label': 'Escolher a imagem de entrada', onchange: (ev) => { loadIn(ev.target.value); buildInspector(); renderAll(); } },
        IN_ARTS.map((a) => h('option', { value: a.id, selected: a.id === st.inId }, a.name)));
      const bReset = h('button', { type: 'button', class: 'btn', onclick: () => { st.inp = Mx.clone(st.inOrig); renderAll(); render(true); } }, 'Voltar à imagem original');

      const render = (force) => {
        const out = convolveGrid(st.inp, st.k, st.div, st.off);
        const [ci, cj] = st.sel;
        gIn.paint((i, j) => {
          const near = Math.abs(i - ci) <= 1 && Math.abs(j - cj) <= 1;
          return Object.assign(GR(st.inp[i][j]), { cls: { win: near && !(i === ci && j === cj), 'win-c': i === ci && j === cj } });
        }, { force: force === true });
        gOut.paint((i, j) => Object.assign(GR(out[i][j]), { cls: { pin: i === ci && j === cj } }));
        const N = neighborhood(st.inp, ci, cj);
        gN.paint((a, b) => GR(N[a][b]));
        const P = N.map((r, a) => r.map((v, b) => v * st.k[a][b]));
        gP.paint((a, b) => ({ bg: '#ffffff', fg: kColor(P[a][b]), text: nf(P[a][b]) }));
        ed.render(force);
        const r = applyKernel(N, st.k, st.div, st.off);
        const expr = [nf(r.sum)];
        if (st.div !== 1) expr.push(' ÷ ' + nf(st.div));
        if (st.off !== 0) expr.push(' + ' + nf(st.off));
        const lines = [
          h('p', null, 'Soma dos 9 produtos: ', mono(nf(r.sum))),
        ];
        if (st.div !== 1 || st.off !== 0) lines.push(h('p', null, 'Com o divisor e o deslocamento: ', mono(expr.join('') + ' = ' + nf(r.raw))));
        if (r.raw < 0) lines.push(h('p', null, 'Valores abaixo de 0 viram 0.'));
        else if (r.raw > 255) lines.push(h('p', null, 'Valores acima de 255 viram 255.'));
        lines.push(h('p', { class: 'big' }, 'Novo valor do pixel (linha ', h('b', null, String(ci + 1)), ', coluna ', h('b', null, String(cj + 1)), '): ', h('b', { class: 'mono' }, String(r.value))));
        result.replaceChildren(...lines);
      };
      render.insp = true;
      st.renders.push(render);

      inspHost.append(h('div', { class: 'lab' },
        h('div', { class: 'lab-bar' }, h('label', { class: 'field' }, 'Imagem de entrada:', sel), bReset),
        ed.bar, ed.desc,
        h('div', { class: 'stage' }, bIn.root, arrow, bOut.root),
        h('h4', null, 'O cálculo do pixel marcado'),
        h('div', { class: 'eq left' }, bN.root, op('×'), ed.kbox.root, op('='), bP.root),
        result));
      render(true);
      if (hadFocus) sel.focus();
    }

    /* ============ desafios ============ */
    function buildChallenges() {
      chalHost.replaceChildren();
      st.renders = st.renders.filter((f) => !f.chal);
      const items = CHALLENGES.map((c) => {
        const status = h('span', { class: 'chal-status', role: 'status', 'aria-live': 'polite' });
        const hint = h('p', { class: 'chal-hint', hidden: true }, c.hint);
        const bHint = h('button', { type: 'button', class: 'btn sm', 'aria-expanded': 'false', onclick: () => { hint.hidden = !hint.hidden; bHint.setAttribute('aria-expanded', String(!hint.hidden)); } }, 'Dica');
        const bSol = h('button', { type: 'button', class: 'btn sm', onclick: () => setKernel(c.sol) }, 'Mostrar a resposta');
        const row = h('li', { class: 'chal' },
          h('span', { class: 'chal-mark', 'aria-hidden': 'true' }),
          h('div', { class: 'chal-body' }, h('b', null, c.title), ' ', status, h('div', { class: 'row tight' }, bHint, bSol), hint));
        return { c, row, status };
      });
      const render = () => {
        items.forEach(({ c, row, status }) => {
          const ok = passes(c, st);
          row.classList.toggle('done', ok);
          status.textContent = ok ? 'Conseguiu!' : '';
        });
      };
      render.chal = true;
      st.renders.push(render);
      chalHost.append(h('ol', { class: 'chal-list' }, items.map((x) => x.row)));
      render();
    }

    /* ============ 4.2  foto ============ */
    let picker = null, photoCmp = null;
    function buildPhoto() {
      if (picker) picker.destroy();
      photoHost.replaceChildren();
      st.renders = st.renders.filter((f) => !f.ph);
      const pk = picker = root.Images.picker();
      const cmp = photoCmp = root.UI.Compare({ beforeLabel: 'Original', afterLabel: 'Filtrada', beforeAlt: 'Foto original', afterAlt: 'Foto com o filtro' });
      const ed = KernelEditor({ cell: 46, gray: true, noSelect: true });
      const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Filtros prontos' }, KERNELS.map((k) => h('button', {
        type: 'button', class: 'btn sm', 'aria-pressed': 'false', dataset: { id: k.id }, onclick: () => setKernel({ k: k.k, div: k.div, off: k.off, gray: k.gray }),
      }, k.name)));
      const count = h('p', { class: 'small muted' });
      let lastSrc = null;
      const render = (force) => {
        const src = root.Images.current();
        if (src !== lastSrc) { lastSrc = src; cmp.setBefore(src); }
        const out = convolveRGBA(src.data, src.width, src.height, st.k, st.div, st.off, st.gray);
        cmp.setAfter(root.Images.toImageData(out, src.width, src.height));
        chips.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === st.preset)));
        ed.render(force);
        const npx = src.width * src.height;
        count.textContent = `Esta imagem tem ${src.width} × ${src.height} = ${npx.toLocaleString('pt-BR')} pixels. Para filtrá-la, o computador repetiu o cálculo do pixel marcado (9 multiplicações e uma soma) uma vez para cada pixel e cada canal de cor: ${(npx * 3).toLocaleString('pt-BR')} vezes.`;
      };
      render.ph = true;
      st.renders.push(render);
      photoHost.append(h('div', { class: 'lab' },
        h('div', { class: 'lab-bar' }, pk.root),
        h('div', { class: 'stage' },
          h('div', { class: 'photo' }, cmp.root, count),
          h('div', { class: 'kside' }, h('b', null, 'Filtros prontos'), chips, ed.bar, ed.kbox.root, ed.desc))));
      render(true);
    }
    root.Images.onChange(() => { if (photoCmp) st.renders.filter((f) => f.ph).forEach((f) => f()); });

    /* ============ receitas ============ */
    function buildRecipes() {
      rcpHost.replaceChildren();
      const cards = RECIPES.map((r) => {
        const g = Grid({ rows: 3, cols: 3, kind: 'matrix', cell: 30, aria: 'Exemplo de filtro: ' + r.goal });
        g.paint((i, j) => ({ bg: '#ffffff', fg: kColor(r.k.k[i][j]), text: nf(r.k.k[i][j]) }));
        const extra = [];
        if (r.k.div !== 1) extra.push('÷ ' + nf(r.k.div));
        if (r.k.off !== 0) extra.push('+ ' + nf(r.k.off));
        return h('article', { class: 'rcp' },
          h('h5', null, r.goal),
          h('p', null, r.rule),
          h('div', { class: 'rcp-k' }, matrixBox(g, { dims: false }).root, extra.length ? h('span', { class: 'mono rcp-x' }, extra.join('  ')) : null),
          h('button', { type: 'button', class: 'btn sm', onclick: () => setKernel({ k: r.k.k, div: r.k.div, off: r.k.off, gray: !!r.k.gray }) }, 'Testar este filtro'));
      });
      rcpHost.append(h('div', { class: 'rcp-grid' }, cards));
    }

    /* ============ pergunta ============ */
    const effectPair = (k) => {
      const src = root.Images.thumb(root.Images.current(), 150);
      const out = root.Images.toImageData(convolveRGBA(src.data, src.width, src.height, k.k, k.div, k.off, !!k.gray), src.width, src.height);
      return h('span', { class: 'mini-pair' },
        h('figure', { class: 'mini' }, root.Images.canvasOf(src, 'thumb'), h('figcaption', null, 'antes')),
        h('figure', { class: 'mini' }, root.Images.canvasOf(out, 'thumb'), h('figcaption', null, 'depois')));
    };
    const kopt = (k) => {
      const g = Grid({ rows: 3, cols: 3, kind: 'matrix', cell: 30, aria: 'Filtro' });
      g.paint((i, j) => ({ bg: '#ffffff', fg: kColor(k.k[i][j]), text: nf(k.k[i][j]) }));
      const extra = [];
      if (k.div !== 1) extra.push('÷ ' + nf(k.div));
      if (k.off !== 0) extra.push('+ ' + nf(k.off));
      return h('div', { class: 'kopt' }, matrixBox(g, { dims: false }).root, extra.length ? h('span', { class: 'mono rcp-x' }, extra.join('  ')) : null);
    };
    const custom = (k, div = 1, off = 0) => ({ k, div, off, gray: false });
    const DOUBLE = custom([[0, 0, 0], [0, 2, 0], [0, 0, 0]]);
    const QS = [
      { q: 'Qual destes filtros deixa a imagem borrada (desfocada)?', sub: 'Pense em fazer uma média dos pixels vizinhos.', right: 'desfoque',
        wrong: ['nitidez', 'bordas', 'identidade', 'claro'],
        why: {
          desfoque: 'Todos os números são iguais e o divisor é a soma deles (9): cada pixel vira a média da vizinhança. Misturar o pixel com os vizinhos é o que borra.',
          nitidez: 'Esse tem números negativos ao redor do centro. Ele reforça o pixel e desconta os vizinhos, então a imagem fica mais nítida, não borrada.',
          bordas: 'Esse tem números que somam 0. Ele deixa só os contornos e escurece o resto, em vez de borrar.',
          identidade: 'Só o centro vale 1 e o resto é 0: cada pixel olha só para si mesmo e nada muda.',
          claro: 'Só o centro conta (valendo 1,5). Ele multiplica cada pixel por 1,5 e clareia, sem misturar com os vizinhos.',
        } },
      { q: 'Qual destes filtros deixa quase tudo preto e mostra só os contornos da imagem?', sub: 'Repare nos números que somam 0.', right: 'bordas',
        wrong: ['desfoque', 'nitidez', 'identidade', 'claro'],
        why: {
          bordas: 'Os números somam 0 (oito −1 e um 8). Onde os pixels vizinhos são iguais, as contas se cancelam e dá 0 (preto). Só onde a imagem muda de repente sobra um valor diferente de zero.',
          desfoque: 'Esse faz a média dos vizinhos e borra a imagem. Os números somam 9, mas dividindo por 9 o brilho se mantém.',
          nitidez: 'Esse realça os detalhes, mas a soma dos números é 1, então a imagem continua inteira e visível, só com contornos mais marcados.',
          identidade: 'Só o centro vale 1: a imagem fica igual.',
          claro: 'Só o centro conta (valendo 1,5): a imagem fica mais clara, com todos os detalhes.',
        } },
      { q: 'Qual destes filtros não muda a imagem em nada?', sub: 'Qual deles faz cada pixel olhar só para si mesmo e copiar o próprio valor?', right: 'identidade',
        wrong: ['desfoque', 'claro', 'negativo', 'bordas'],
        why: {
          identidade: 'Só o centro vale 1 e o resto é 0. Cada pixel novo é 1 vezes ele mesmo mais zeros: a imagem fica igual.',
          desfoque: 'Esse mistura cada pixel com os 8 vizinhos, então borra.',
          claro: 'Esse multiplica cada pixel por 1,5 e clareia a imagem.',
          negativo: 'Esse tem −1 no centro e soma 255: cada pixel vira 255 menos ele mesmo, o negativo.',
          bordas: 'Esse deixa só os contornos e escurece o resto.',
        } },
    ];
    const quiz = Quiz({ question: QS[0].q, sub: QS[0].sub, optw: 160, newLabel: 'Outra pergunta', onNew: () => { qi = (qi + 1) % (QS.length + 1); setQ(); } });
    let qi = 0;
    function setQ() {
      if (qi < QS.length) {
        const q = QS[qi];
        quiz.setQuestion(q.q); quiz.setSub(q.sub);
        quiz.root.classList.remove('list');
        const ids = [q.right].concat(q.wrong);
        quiz.setOptions(shuffle(ids).map((id) => {
          const k = byId(id);
          return { correct: id === q.right, vis: true, name: k.name, content: kopt(k), label: 'Filtro ' + k.name.toLowerCase(), why: () => h('span', null, q.why[id], effectPair(k)) };
        }));
      } else {
        // pergunta de raciocínio: o que faz um filtro com só o centro valendo 2?
        quiz.setQuestion('Um filtro tem 0 em todas as posições, menos no centro, que vale 2 (divisor 1, deslocamento 0). O que ele faz com a imagem?');
        quiz.setSub('Faça a conta de um pixel: o resultado é 2 vezes o valor dele.');
        quiz.root.classList.add('list');
        const O = [
          { t: 'Deixa a imagem mais clara: cada pixel passa a valer o dobro (até o limite de 255).', ok: true, why: () => h('span', null, 'Só o centro conta e ele multiplica o pixel por 2. Valores que passam de 255 ficam em 255.', effectPair(DOUBLE)) },
          { t: 'Borra a imagem.', why: 'Para borrar, os vizinhos precisam entrar na conta. Aqui eles são multiplicados por 0 e não contam.' },
          { t: 'Destaca as bordas.', why: 'Para destacar bordas, os números precisam somar 0 e ter positivos e negativos. Aqui só existe um 2.' },
          { t: 'Não muda nada.', why: 'Não mudaria se o centro valesse 1. Valendo 2, cada pixel dobra.' },
          { t: 'Faz o negativo da imagem.', why: 'O negativo precisa de um número negativo no centro e de um deslocamento de 255.' },
        ];
        quiz.setOptions(shuffle(O).map((o) => ({ correct: !!o.ok, content: o.t, why: o.why })));
      }
    }
    setQ();
    quizHost.append(quiz.root);

    /* ---------- montagem ---------- */
    function rebuild() { buildInspector(); buildChallenges(); buildPhoto(); renderAll(); }
    buildRecipes();
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
    // a miniatura das respostas usa a foto escolhida; nada a atualizar até a próxima escolha
  }

  root.Sections = root.Sections || {};
  root.Sections.s4 = { init };
})(window);
