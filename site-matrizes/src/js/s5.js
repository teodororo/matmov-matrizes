/* ==========================================================
   Seção 5: história e IA
   - retina de 20 x 20 do perceptron
   - reconhecedor de dígitos (desenho -> matriz 8 x 8 -> nota de cada dígito)
   - tabuleiro de xadrez como matriz
   - tabuleiro de Go (figura) e perguntas
   ========================================================== */
(function (root) {
  'use strict';
  const { $, h, Grid, matrixBox, linkViews, Quiz, fmt } = root.UI;
  const L = root.Logic;
  const { Mx, clamp, shuffle, mulberry32 } = L;
  const MODEL = root.DIGITS_MODEL;
  const SVGNS = 'http://www.w3.org/2000/svg';
  let fitters = [];

  /* ---------- cores e pequenos auxiliares ---------- */
  const INK = [18, 32, 90], BLUE = [36, 87, 245], RED = [229, 56, 59];
  const mix = (c, t) => [0, 1, 2].map((k) => Math.round(255 + (c[k] - 255) * t));      // branco -> cor
  const rgbStr = (c) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
  const inkRGB = (x) => mix(INK, clamp(x / 16, 0, 1));
  const heatRGB = (v, max) => mix(v >= 0 ? BLUE : RED, Math.pow(clamp(Math.abs(v) / (max || 1), 0, 1), 0.8));
  const maxAbs = (arr) => arr.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1;
  const sgn = (v, d = 1) => {
    const k = Math.pow(10, d), r = Math.round(v * k) / k;
    return (r < 0 ? '−' : r > 0 ? '+' : '') + fmt(Math.abs(r), d);
  };
  const num = (v) => (v < 0 ? '−' + Math.abs(v) : String(v));
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const pctShort = (p) => (p >= 0.995 ? '>99%' : Math.round(p * 100) + '%');
  const pctWords = (p) => (p >= 0.995 ? 'mais de 99%' : Math.round(p * 100) + '%');
  const setCell = (grid, box, c) => {
    grid.root.style.setProperty('--cell', c + 'px');
    if (box) box.root.style.setProperty('--cell', c + 'px');
    grid.opts.cell = c;
  };
  const op = (t) => h('div', { class: 'op', 'aria-hidden': 'true' }, t);
  const availWidth = (el) => {
    const cs = getComputedStyle(el);
    return el.clientWidth - parseFloat(cs.paddingLeft || 0) - parseFloat(cs.paddingRight || 0);
  };
  const WMAX = MODEL.W.map(maxAbs);

  /** Desenha 64 valores (8 x 8) num canvas pequeno, ampliado sem suavizar. */
  function pixCanvas(vals, colorFn, px) {
    const c = h('canvas', { class: 'pix', width: 8, height: 8, 'aria-hidden': 'true' });
    const g = c.getContext('2d');
    const img = g.createImageData(8, 8);
    for (let k = 0; k < 64; k++) {
      const col = colorFn(vals[k]);
      img.data[k * 4] = col[0]; img.data[k * 4 + 1] = col[1]; img.data[k * 4 + 2] = col[2]; img.data[k * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    if (px) c.style.width = c.style.height = px + 'px';
    return c;
  }

  /* ============================================================
     1958: a "retina" de 20 x 20 do perceptron
     ============================================================ */
  function buildRetina(host) {
    const N = 20;
    const input = h('input', { type: 'text', class: 'num s5-char', maxlength: 4, value: 'A', autocomplete: 'off', spellcheck: false, 'aria-label': 'Digite uma letra ou um número' });
    const grid = Grid({ rows: N, cols: N, kind: 'image', cell: 9, aria: 'A letra escolhida, vista numa imagem de 20 por 20 pixels' });
    const stat = h('p', { class: 'statline', role: 'status', 'aria-live': 'polite' });
    const work = document.createElement('canvas'); work.width = work.height = 120;
    const small = document.createElement('canvas'); small.width = small.height = N;

    function rasterize(ch) {
      const g = work.getContext('2d', { willReadFrequently: true });
      g.fillStyle = '#fff'; g.fillRect(0, 0, 120, 120);
      g.fillStyle = '#000'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      g.font = '700 100px Atkinson, Arial, sans-serif';
      g.fillText(ch, 60, 92);
      const d = g.getImageData(0, 0, 120, 120).data;
      let x0 = 120, y0 = 120, x1 = -1, y1 = -1;
      for (let y = 0; y < 120; y++) {
        for (let x = 0; x < 120; x++) {
          if (d[(y * 120 + x) * 4] < 128) {
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
        }
      }
      if (x1 < 0) return null;
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1, k = 16 / Math.max(bw, bh);
      const sg = small.getContext('2d', { willReadFrequently: true });
      sg.fillStyle = '#fff'; sg.fillRect(0, 0, N, N);
      sg.imageSmoothingEnabled = true; sg.imageSmoothingQuality = 'high';
      sg.drawImage(work, x0, y0, bw, bh, (N - bw * k) / 2, (N - bh * k) / 2, bw * k, bh * k);
      const s = sg.getImageData(0, 0, N, N).data;
      return Mx.make(N, N, (i, j) => (s[(i * N + j) * 4] < 150 ? 0 : 1));
    }
    function render() {
      const ch = [...input.value.trim()][0] || '';
      const bits = ch ? rasterize(ch) : null;
      grid.paint((i, j) => ({ bg: !bits || bits[i][j] ? '#ffffff' : '#000000' }));
      if (!bits) { stat.textContent = 'Digite uma letra ou um número para ver como ele fica com 20 × 20 pixels.'; return; }
      const dark = N * N - Mx.sum(bits);
      stat.textContent = `Pixels pretos (valor 0): ${dark}. Pixels brancos (valor 1): ${N * N - dark}. São ${N * N} números ao todo.`;
    }
    input.addEventListener('input', () => {
      const cs = [...input.value];
      if (cs.length > 1) input.value = cs[cs.length - 1];     // fica só o último caractere digitado
      render();
    });
    input.addEventListener('focus', () => { try { input.select(); } catch (e) { /* ok */ } });
    host.append(h('div', { class: 'lab compact' },
      h('div', { class: 's5-retina' },
        h('figure', { class: 'mini' }, grid.root, h('figcaption', null, 'Imagem de 20 × 20 pixels')),
        h('div', { class: 'stack' },
          h('label', { class: 'field' }, 'Letra ou número:', input),
          stat))));
    render();
    // refaz o desenho quando a fonte terminar de carregar
    if (document.fonts && document.fonts.load) document.fonts.load('700 100px Atkinson').then(render, () => {});
  }

  /* ============================================================
     Anos 1990: reconhecedor de dígitos
     ============================================================ */
  function buildDigits(host) {
    const EX = MODEL.examples, HARD = MODEL.hard;
    const CV = 280;
    const st = {
      src: 'none',       // 'none' | 'draw' | 'ex'
      strokes: [],
      flat: null,        // 64 valores de 0 a 16
      bitmap: null,      // 32 x 32 (só quando é desenho)
      pred: null,
      truth: null,       // dígito verdadeiro (só nos exemplos)
      exKey: null,
      sel: null,         // molde escolhido (null = segue o vencedor)
    };
    let hoverPos = null;

    /* ---------- coluna 1: desenhar ---------- */
    const pad = h('canvas', {
      class: 's5-pad', width: CV, height: CV, role: 'img',
      'aria-label': 'Área de desenho. Desenhe um dígito de 0 a 9 com o mouse ou o dedo. Quem não puder desenhar pode usar os exemplos mais abaixo.',
    });
    const pctx = pad.getContext('2d');
    const hint = h('span', { class: 's5-padhint', 'aria-hidden': 'true' }, 'Desenhe um dígito aqui');
    const bUndo = h('button', { type: 'button', class: 'btn sm', onclick: () => undo() }, 'Desfazer traço');
    const bClear = h('button', { type: 'button', class: 'btn sm', onclick: () => clearAll() }, 'Apagar tudo');
    const colA = h('div', { class: 's5-col' },
      h('h5', { class: 's5-cap' }, h('span', { class: 's5-n', 'aria-hidden': 'true' }, '1'), 'Desenhe'),
      h('div', { class: 'pad-wrap' }, pad, hint),
      h('div', { class: 'row tight s5-padbtns' }, bUndo, bClear),
      h('p', { class: 'small muted' }, 'Não precisa centralizar nem caprichar no tamanho: o programa ajusta.'));

    /* ---------- coluna 2: o que o computador vê ---------- */
    const bm = h('canvas', { class: 'bm', width: 32, height: 32, role: 'img', 'aria-label': 'Seu desenho, reduzido para 32 por 32 pixels' });
    const bmCtx = bm.getContext('2d');
    const mark = h('span', { class: 'bm-mark', hidden: true, 'aria-hidden': 'true' });
    const bmFig = h('figure', { class: 'mini s5-bmfig' },
      h('div', { class: 'bm-wrap' }, bm, mark),
      h('figcaption', null, 'Seu desenho em 32 × 32 pixels (preto e branco)'));
    const exNote = h('p', { class: 'small muted', hidden: true }, 'Os exemplos já vêm prontos em 8 × 8 pixels.');
    const gSee = Grid({ rows: 8, cols: 8, kind: 'matrix', cell: 30, aria: 'Matriz de 8 por 8: quantos pixels têm tinta em cada bloco de 4 por 4 do desenho' });
    const seeBox = matrixBox(gSee, { title: 'Matriz x', dims: true });
    gSee.setHover((i, j) => {
      if (i == null || st.src === 'ex') { mark.hidden = true; return; }
      mark.style.left = (j * 12.5) + '%'; mark.style.top = (i * 12.5) + '%'; mark.hidden = false;
    });
    const colB = h('div', { class: 's5-col' },
      h('h5', { class: 's5-cap' }, h('span', { class: 's5-n', 'aria-hidden': 'true' }, '2'), 'O que o computador vê'),
      bmFig, exNote, seeBox.root,
      h('p', { class: 'small muted s5-seehelp' }, 'Cada bloco de 4 × 4 pixels do desenho vira um número: quantos dos 16 pixels têm tinta (de 0 a 16). Passe o mouse num número para ver o bloco.'));

    /* ---------- coluna 3: o que ele responde ---------- */
    const verdict = h('p', { class: 's5-verdict' });
    const truthEl = h('p', { class: 's5-truth', hidden: true });
    const probs = h('ol', { class: 's5-probs', 'aria-label': 'Chance de cada dígito, em porcentagem' });
    const rows = [];
    for (let d = 0; d < 10; d++) {
      const fill = h('i');
      const pct = h('span', { class: 'pct' }, '');
      const li = h('li', null, h('span', { class: 'dg' }, String(d)), h('span', { class: 'bar' }, fill), pct);
      rows.push({ li, fill, pct });
      probs.append(li);
    }
    const live = h('p', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
    const colC = h('div', { class: 's5-col s5-colc' },
      h('h5', { class: 's5-cap' }, h('span', { class: 's5-n', 'aria-hidden': 'true' }, '3'), 'O que ele responde'),
      verdict, truthEl, probs, live);

    /* ---------- como ele decide ---------- */
    const wTitle = h('span', null, 'Molde');
    const gX = Grid({ rows: 8, cols: 8, kind: 'matrix', editable: true, cell: 30, aria: 'Matriz x, 8 por 8: o que o computador viu' });
    const gW = Grid({ rows: 8, cols: 8, kind: 'matrix', editable: true, cell: 30, aria: 'Molde do dígito escolhido, 8 por 8. Azul é bom sinal, vermelho é mau sinal.' });
    const gC = Grid({ rows: 8, cols: 8, kind: 'matrix', editable: true, cell: 30, aria: 'Contribuição de cada pixel para a nota do dígito escolhido' });
    [gX, gW, gC].forEach((g) => g.root.classList.add('heat'));
    const bX = matrixBox(gX, { title: h('span', null, 'x: o que ele viu'), dims: false });
    const bW = matrixBox(gW, { title: wTitle, dims: false });
    const bC = matrixBox(gC, { title: h('span', null, 'x × molde: contribuição'), dims: false });
    const eq = h('div', { class: 'eq s5-eq' }, bX.root, op('×'), bW.root, op('='), bC.root);
    const info = h('p', { class: 'infoline s5-info' });
    const INFO0 = 'Passe o mouse (ou toque) em um quadradinho para ver a conta daquele pixel.';
    linkViews([{ g: gX }, { g: gW }, { g: gC }], (pos) => { hoverPos = pos; renderInfo(); });
    const score = h('p', { class: 's5-score', 'aria-live': 'off' });

    const molds = [];
    const moldRow = h('div', { class: 's5-molds', role: 'group', 'aria-label': 'Escolha o dígito cujo molde você quer ver' });
    for (let d = 0; d < 10; d++) {
      const b = h('button', { type: 'button', class: 'mold', 'aria-pressed': 'false', 'aria-label': 'Molde do ' + d, onclick: () => { st.sel = d; renderWhy(); renderChips(); } },
        pixCanvas(MODEL.W[d], (v) => heatRGB(v, WMAX[d]), 0), h('span', { class: 'mold-d' }, String(d)));
      molds.push(b); moldRow.append(b);
    }
    const bFollow = h('button', { type: 'button', class: 'btn sm', hidden: true, onclick: () => { st.sel = null; renderWhy(); renderChips(); } }, 'Voltar ao dígito vencedor');
    const legend = h('p', { class: 'small s5-legend' },
      h('span', { class: 'lg lg-b', 'aria-hidden': 'true' }), ' azul: se o pixel tiver tinta, é um bom sinal para esse dígito. ',
      h('span', { class: 'lg lg-r', 'aria-hidden': 'true' }), ' vermelho: se tiver tinta, é um mau sinal. Quanto mais forte a cor, mais pesa.');

    const why = h('div', { class: 's5-why' },
      h('h5', null, 'Como ele decide?'),
      h('p', null, 'Para cada dígito de 0 a 9, o programa guarda um ', h('b', null, 'molde'), ': uma matriz 8 × 8 de números que diz quais pixels ajudam e quais atrapalham aquele dígito. Os 10 moldes, empilhados, formam uma matriz ', h('b', null, 'W'), ' de 10 linhas e 64 colunas (640 números). Escolha um dígito para ver o molde dele.'),
      moldRow, h('div', { class: 'row tight' }, bFollow),
      legend, eq, info, score,
      h('div', { class: 'key s5-formula' },
        h('p', null, h('b', null, 'Em linguagem de matrizes: '), h('span', { class: 'mono' }, 'notas = W · x + b'), '. ',
          'Cada nota é uma soma de 64 produtos (pixel × número do molde) mais um número fixo do dígito, o viés ', h('span', { class: 'mono' }, 'b'), '. O computador faz isso para os 10 dígitos e responde o de maior nota. É a mesma conta de multiplicar e somar do filtro da seção 4; a diferença é que aqui os 640 números do molde foram descobertos pelo computador, treinando com exemplos.')));

    /* ---------- galeria de exemplos ---------- */
    const galBtns = {};
    const gal = h('div', { class: 's5-gal', role: 'group', 'aria-label': 'Dígitos reais de exemplo' });
    EX.forEach((ex, n) => {
      const b = h('button', { type: 'button', class: 'ex', 'aria-pressed': 'false', 'aria-label': 'Exemplo ' + (n + 1), onclick: () => loadExample(ex, 'e' + n) },
        pixCanvas(ex.x, inkRGB, 46));
      galBtns['e' + n] = b; gal.append(b);
    });
    const hardRow = h('div', { class: 's5-gal hard', role: 'group', 'aria-label': 'Dígitos reais que o reconhecedor errou' });
    HARD.forEach((ex, n) => {
      const b = h('button', { type: 'button', class: 'ex', 'aria-pressed': 'false', 'aria-label': `Exemplo em que ele erra: era ${ex.d} e ele disse ${ex.p}`, onclick: () => loadExample(ex, 'h' + n) },
        pixCanvas(ex.x, inkRGB, 46), h('span', { class: 'ex-l' }, `era ${ex.d}, ele diz ${ex.p}`));
      galBtns['h' + n] = b; hardRow.append(b);
    });

    const acc = fmt(MODEL.accReal * 100, 1), accD = fmt(MODEL.accDrawn * 100, 0);
    const lab = h('div', { class: 'lab s5-lab' },
      h('div', { class: 'stage s5-stage' }, colA, colB, colC),
      why,
      h('h5', null, 'Teste com dígitos de verdade'),
      h('p', null, 'Estes são dígitos reais do conjunto de dados. Clique em um para o computador tentar ler.'),
      gal,
      h('h5', null, 'Onde ele erra'),
      h('p', null, 'Estes três dígitos reais o reconhecedor leu errado. Você consegue ler? Às vezes até uma pessoa tem dúvida.'),
      hardRow,
      h('div', { class: 'note s5-stats' },
        h('p', null, h('b', null, 'Quão bom ele é? '), `Em ${fmt(MODEL.nTest)} dígitos reais que ele nunca tinha visto, acertou ${acc}% (cerca de 4 erros a cada 100). Em desenhos feitos por programa, a taxa é parecida (${accD}%). Com o seu traço de verdade, no mouse ou no dedo, ele pode errar mais, porque só conheceu alguns tipos de traço. Por isso os sistemas reais são treinados com milhares ou milhões de exemplos variados.`),
        h('p', null, `Este reconhecedor aprendeu com ${fmt(MODEL.nReal)} dígitos reais e ${fmt(MODEL.nSynth)} desenhados por programa.`)));
    host.append(lab);

    /* ---------- cálculo ---------- */
    function compute() {
      if (st.src === 'draw') {
        const r = L.strokesToGrid(st.strokes);
        if (r.empty) { st.flat = null; st.bitmap = null; st.pred = null; return; }
        st.bitmap = r.bitmap; st.flat = [].concat(...r.grid);
      }
      st.pred = st.flat ? L.predictDigit(MODEL, st.flat) : null;
    }
    const curD = () => (st.sel != null ? st.sel : (st.pred ? st.pred.best : 0));

    function verdictInfo() {
      const p = st.pred;
      if (!p) return null;
      const order = p.probs.map((v, d) => ({ v, d })).sort((a, b) => b.v - a.v);
      return { sure: order[0].v >= 0.5, a: order[0], b: order[1], pa: pctWords(order[0].v), pb: pctWords(order[1].v) };
    }
    const big = (d) => h('span', { class: 'vbig' }, String(d));

    /* ---------- desenho do quadro ---------- */
    function redrawPad() {
      pctx.clearRect(0, 0, CV, CV);
      pctx.lineCap = 'round'; pctx.lineJoin = 'round';
      pctx.strokeStyle = pctx.fillStyle = '#12205a'; pctx.lineWidth = 18;
      for (const s of st.strokes) {
        if (s.length === 1) { pctx.beginPath(); pctx.arc(s[0][0], s[0][1], 9, 0, Math.PI * 2); pctx.fill(); continue; }
        pctx.beginPath(); pctx.moveTo(s[0][0], s[0][1]);
        for (let k = 1; k < s.length; k++) pctx.lineTo(s[k][0], s[k][1]);
        pctx.stroke();
      }
      hint.hidden = st.strokes.length > 0;
    }

    /* ---------- partes da tela ---------- */
    function renderSee() {
      const showBm = st.src !== 'ex';
      bmFig.hidden = !showBm; exNote.hidden = showBm;
      if (showBm) {
        const img = bmCtx.createImageData(32, 32);
        for (let k = 0; k < 1024; k++) {
          const on = st.bitmap ? st.bitmap[k] : 0;
          img.data[k * 4] = on ? INK[0] : 255; img.data[k * 4 + 1] = on ? INK[1] : 255; img.data[k * 4 + 2] = on ? INK[2] : 255; img.data[k * 4 + 3] = 255;
        }
        bmCtx.putImageData(img, 0, 0);
      }
      gSee.paint((i, j) => {
        if (!st.flat) return { bg: '#ffffff', text: '' };
        const v = st.flat[i * 8 + j];
        return { bg: rgbStr(inkRGB(v)), fg: v / 16 > 0.5 ? '#ffffff' : (v === 0 ? '#8d97bb' : '#12205a'), text: v };
      });
    }

    function renderResult() {
      const p = st.pred, vi = verdictInfo();
      rows.forEach((r, d) => {
        const pr = p ? p.probs[d] : 0;
        r.fill.style.setProperty('--w', (pr * 100).toFixed(1) + '%');
        r.pct.textContent = p ? pctShort(pr) : '';
        r.li.classList.toggle('best', !!p && d === p.best);
      });
      verdict.replaceChildren();
      if (!vi) {
        verdict.append(h('span', { class: 'muted' }, 'Desenhe um dígito ou clique em um exemplo, e eu tento adivinhar qual é.'));
      } else if (vi.sure) {
        verdict.append('Eu acho que é um ', big(vi.a.d), `. Tenho ${vi.pa} de certeza.`);
      } else {
        verdict.append('Não tenho certeza. Meu palpite é o ', big(vi.a.d), ` (${vi.pa}), mas pode ser o `, h('b', null, String(vi.b.d)), ` (${vi.pb}).`);
      }
      if (st.truth != null && vi) {
        const ok = vi.a.d === st.truth;
        truthEl.hidden = false;
        truthEl.className = 's5-truth ' + (ok ? 'ok' : 'bad');
        truthEl.textContent = ok ? `Era mesmo um ${st.truth}: ele acertou.` : `Na verdade, esse dígito era um ${st.truth}: ele errou.`;
      } else {
        truthEl.hidden = true; truthEl.textContent = '';
      }
    }

    function renderChips() {
      const d = curD();
      molds.forEach((b, k) => b.setAttribute('aria-pressed', String(k === d)));
      bFollow.hidden = st.sel == null;
    }

    function renderInfo() {
      if (!hoverPos || !st.flat) { info.textContent = INFO0; return; }
      const [i, j] = hoverPos, k = i * 8 + j, d = curD();
      const v = st.flat[k], w = MODEL.W[d][k];
      info.replaceChildren(h('b', null, `Linha ${i + 1}, coluna ${j + 1}: `),
        `pixel ${v} (${v} ÷ 16 = ${fmt(v / 16, 2)}) × molde ${sgn(w, 2)} = ${sgn((v / 16) * w, 2)}`);
    }

    function renderWhy() {
      const d = curD(), w = MODEL.W[d], mw = WMAX[d], x = st.flat;
      wTitle.textContent = `Molde do ${d} (linha ${d + 1} de W)`;
      gX.paint((i, j) => {
        if (!x) return { bg: '#ffffff', text: '' };
        const v = x[i * 8 + j];
        return { bg: rgbStr(inkRGB(v)), fg: v / 16 > 0.5 ? '#ffffff' : (v === 0 ? '#8d97bb' : '#12205a'), text: v };
      });
      gW.paint((i, j) => ({ bg: rgbStr(heatRGB(w[i * 8 + j], mw)), text: '' }));
      gC.paint((i, j) => ({ bg: x ? rgbStr(heatRGB((w[i * 8 + j] * x[i * 8 + j]) / 16, mw)) : '#ffffff', text: '' }));
      score.replaceChildren();
      if (!x) {
        score.append('Desenhe um dígito (ou clique em um exemplo) para ver a contribuição de cada pixel.');
      } else {
        let sum = 0;
        for (let k = 0; k < 64; k++) sum += (w[k] * x[k]) / 16;
        const sc = st.pred.scores, best = st.pred.best;
        score.append(
          'Somando as 64 contribuições, dá ', h('b', null, sgn(sum)), '. Somando o número fixo do ', String(d), ' (o viés, ', sgn(MODEL.b[d]), '), a ',
          h('b', null, `nota do ${d} é ${sgn(sc[d])}`), '. ',
          d === best
            ? `É a maior nota entre os 10 dígitos, por isso a resposta do computador é ${d}.`
            : `A maior nota é a do ${best} (${sgn(sc[best])}), por isso a resposta do computador é ${best}, e não ${d}.`);
      }
      renderInfo();
    }

    function renderGal() {
      Object.keys(galBtns).forEach((k) => galBtns[k].setAttribute('aria-pressed', String(k === st.exKey)));
    }

    function render() {
      compute();
      renderSee(); renderResult(); renderChips(); renderWhy(); renderGal();
      bUndo.disabled = !(st.src === 'draw' && st.strokes.length);
      bClear.disabled = st.src === 'none' || (st.src === 'draw' && !st.strokes.length);
    }

    function announce() {
      const vi = verdictInfo();
      let t = !vi ? 'Sem desenho.' : vi.sure ? `Eu acho que é um ${vi.a.d}. Tenho ${vi.pa} de certeza.` : `Não tenho certeza. Meu palpite é o ${vi.a.d}, com ${vi.pa}, mas pode ser o ${vi.b.d}.`;
      if (vi && st.truth != null) t += vi.a.d === st.truth ? ` Era mesmo um ${st.truth}.` : ` Na verdade era um ${st.truth}.`;
      live.textContent = t;
    }

    /* ---------- ações ---------- */
    let timer = 0;
    const schedule = () => { if (!timer) timer = setTimeout(() => { timer = 0; render(); }, 70); };
    const flush = () => { clearTimeout(timer); timer = 0; render(); };
    function undo() {
      if (st.src !== 'draw' || !st.strokes.length) return;
      st.strokes.pop(); redrawPad(); flush(); announce();
    }
    function clearAll() {
      st.src = 'draw'; st.strokes = []; st.truth = null; st.exKey = null; st.flat = null; st.bitmap = null; st.pred = null;
      redrawPad(); flush(); announce();
    }
    function loadExample(item, key) {
      st.src = 'ex'; st.strokes = []; st.exKey = key; st.truth = item.d; st.flat = item.x.slice(); st.bitmap = null;
      redrawPad(); flush(); announce();
    }

    /* ---------- eventos do quadro ---------- */
    let cur = null;
    const pt = (ev) => {
      const r = pad.getBoundingClientRect();
      return [(ev.clientX - r.left) * (CV / r.width), (ev.clientY - r.top) * (CV / r.height)];
    };
    pad.addEventListener('pointerdown', (ev) => {
      if (ev.pointerType === 'mouse' && ev.button !== 0) return;
      ev.preventDefault();
      try { pad.setPointerCapture(ev.pointerId); } catch (e) { /* ok */ }
      if (st.src !== 'draw') { st.src = 'draw'; st.strokes = []; st.truth = null; st.exKey = null; }
      cur = [pt(ev)];
      st.strokes.push(cur);
      redrawPad(); schedule();
    });
    pad.addEventListener('pointermove', (ev) => {
      if (!cur) return;
      const p = pt(ev), q = cur[cur.length - 1];
      if (Math.hypot(p[0] - q[0], p[1] - q[1]) < 2) return;
      cur.push(p); redrawPad(); schedule();
    });
    const endStroke = () => { if (!cur) return; cur = null; flush(); announce(); };
    pad.addEventListener('pointerup', endStroke);
    pad.addEventListener('pointercancel', endStroke);
    pad.addEventListener('lostpointercapture', endStroke);

    /* ---------- tamanhos ---------- */
    function fit() {
      const avail = availWidth(lab);
      setCell(gSee, seeBox, clamp(Math.floor((Math.min(avail, 300) - 44) / 8), 22, 30));
      const c3 = Math.floor((avail - 2 * 64 - 3 * 44) / 24);
      const three = c3 >= 24;
      const c2 = three ? Math.min(c3, 32) : clamp(Math.floor((avail - 44) / 8), 22, 32);
      setCell(gX, bX, c2); setCell(gW, bW, c2); setCell(gC, bC, c2);
      eq.classList.toggle('stack', !three);
    }

    /* ---------- começa com um exemplo já carregado ---------- */
    let first = EX.findIndex((ex) => {
      if (ex.d !== 7) return false;
      const p = L.predictDigit(MODEL, ex.x);
      return p.best === ex.d && p.probs[p.best] > 0.8;
    });
    if (first < 0) first = EX.findIndex((ex) => L.predictDigit(MODEL, ex.x).best === ex.d);
    redrawPad();
    if (first >= 0) { st.src = 'ex'; st.exKey = 'e' + first; st.truth = EX[first].d; st.flat = EX[first].x.slice(); }
    fit();
    render();
    return { fit };
  }

  /* ============================================================
     1997: o tabuleiro de xadrez como matriz
     ============================================================ */
  function buildChess(host) {
    const PIECE = { 1: '♟', 2: '♞', 3: '♝', 4: '♜', 5: '♛', 6: '♚' };
    const NAME = L.PIECE_NAMES, FEM = { 4: true, 5: true };
    const who = (v) => (v === 0 ? 'casa vazia' : `${NAME[Math.abs(v)]} ${v > 0 ? (FEM[v] ? 'branca' : 'branco') : (FEM[-v] ? 'preta' : 'preto')}`);
    const sq = (i, j) => L.squareName(i, j);
    const SQ = ['#eaf0ff', '#8fa3da'];
    const START_MSG = 'Clique numa peça e depois na casa de destino. Valem todos os movimentos: o site não confere as regras do xadrez.';
    const INFO0 = 'Passe o mouse (ou toque) numa casa: a mesma posição se acende no tabuleiro e na matriz.';

    let board = Mx.clone(L.CHESS_START), hist = [], sel = null, last = null;
    const isSel = (i, j) => !!sel && sel[0] === i && sel[1] === j;
    const isLast = (i, j) => !!last && ((last[0][0] === i && last[0][1] === j) || (last[1][0] === i && last[1][1] === j));

    const gB = Grid({
      rows: 8, cols: 8, kind: 'board', digits: true, editable: true, cell: 48,
      aria: 'Tabuleiro de xadrez. Use as setas para andar pelas casas e Enter para pegar ou soltar uma peça.',
      onClick: (i, j) => click(i, j), onDrag: () => {},
    });
    const gM = Grid({
      rows: 8, cols: 8, kind: 'matrix', editable: true, cell: 38,
      aria: 'Matriz 8 por 8 do tabuleiro: cada número é uma peça. Enter pega ou solta uma peça.',
      onClick: (i, j) => click(i, j), onDrag: () => {},
    });
    const bB = matrixBox(gB, { title: 'O tabuleiro', dims: false });
    const bM = matrixBox(gM, { title: 'A matriz do tabuleiro', dims: true });
    const msg = h('p', { class: 'infoline s5-msg', role: 'status', 'aria-live': 'polite' }, START_MSG);
    const info = h('p', { class: 'infoline s5-info' }, INFO0);
    linkViews([{ g: gB }, { g: gM }], (pos) => {
      if (!pos) { info.textContent = INFO0; return; }
      const [i, j] = pos, v = board[i][j];
      info.replaceChildren(h('b', null, `Casa ${sq(i, j)}: `), `linha ${i + 1}, coluna ${j + 1} da matriz. Valor ${num(v)} (${who(v)}).`);
    });

    const legendItems = [1, 2, 3, 4, 5, 6].map((v) => h('span', { class: 'lgp' }, h('span', { class: 'pc', 'aria-hidden': 'true' }, PIECE[v] + '︎'), ` ${v} ${NAME[v]}`));
    const legend = h('div', null,
      h('p', { class: 's5-pieces' }, h('b', null, 'Código das peças: '), legendItems),
      h('p', { class: 'small muted s5-codehelp' }, 'Números positivos são peças brancas, números negativos são peças pretas, e 0 é casa vazia.'));

    const bBack = h('button', { type: 'button', class: 'btn sm', onclick: () => undo() }, 'Desfazer jogada');
    const bReset = h('button', { type: 'button', class: 'btn sm', onclick: () => reset() }, 'Posição inicial');
    const bNeg = h('button', { type: 'button', class: 'btn sm', onclick: () => transform('neg') }, 'Multiplicar a matriz por −1');
    const bTr = h('button', { type: 'button', class: 'btn sm', onclick: () => transform('tr') }, 'Fazer a transposta');

    const matBarW = h('i', { class: 'w' }), matBarB = h('i', { class: 'b' });
    const matTxt = h('p', { class: 's5-mattxt', 'aria-live': 'polite' });
    const mat = h('div', { class: 's5-mat' },
      h('h5', null, 'A conta do Deep Blue, em miniatura'),
      h('p', null, 'O Deep Blue dava uma nota a cada posição, com muitos critérios escritos por especialistas. O mais simples é o ', h('b', null, 'material'), ': peão vale 1, cavalo e bispo 3, torre 5 e dama 9 (o rei não entra na conta). Some as peças brancas, subtraia as pretas e você tem a nota da posição. Ele repetia contas assim para milhões de posições por segundo.'),
      h('div', { class: 's5-matbar', 'aria-hidden': 'true' }, matBarW, matBarB), matTxt);

    const lab = h('div', { class: 'lab s5-chesslab' },
      legend,
      h('div', { class: 'stage s5-chessstage' }, bB.root, bM.root),
      msg, info,
      h('div', { class: 'row tight s5-chessbtns' }, bBack, bReset, bNeg, bTr),
      mat);
    host.append(lab);

    function materialSplit(b) {
      let w = 0, k = 0;
      for (const r of b) for (const v of r) { if (v > 0) w += L.PIECE_VALUE[v]; else if (v < 0) k += L.PIECE_VALUE[-v]; }
      return { w, b: k };
    }

    function paintAll() {
      gB.paint((i, j) => {
        const v = board[i][j];
        return { bg: SQ[(i + j) % 2], text: v ? PIECE[Math.abs(v)] + '︎' : '', cls: { wp: v > 0, bp: v < 0, pin: isSel(i, j), last: isLast(i, j) } };
      });
      gM.paint((i, j) => {
        const v = board[i][j];
        return { bg: v > 0 ? '#fff4bd' : v < 0 ? '#12205a' : '#ffffff', fg: v < 0 ? '#ffffff' : v > 0 ? '#12205a' : '#a7b1d3', text: num(v), cls: { pin: isSel(i, j), last: isLast(i, j) } };
      });
      const m = materialSplit(board), tot = m.w + m.b, diff = m.w - m.b;
      matBarW.style.width = (tot ? (m.w / tot) * 100 : 50) + '%';
      matBarB.style.width = (tot ? (m.b / tot) * 100 : 50) + '%';
      matTxt.replaceChildren(`Material das brancas: ${m.w}. Material das pretas: ${m.b}. `,
        h('b', null, diff === 0 ? 'Nota da posição: 0 (equilíbrio).' : `Nota da posição: ${diff > 0 ? '+' : '−'}${Math.abs(diff)} (vantagem das ${diff > 0 ? 'brancas' : 'pretas'}).`));
      bBack.disabled = !hist.length;
    }
    const say = (t) => { msg.textContent = t; };

    function click(i, j) {
      const v = board[i][j];
      if (sel) {
        const s = board[sel[0]][sel[1]];
        if (sel[0] === i && sel[1] === j) { sel = null; say('Seleção cancelada. ' + START_MSG); }
        else if (v !== 0 && Math.sign(v) === Math.sign(s)) { sel = [i, j]; say(`${cap(who(v))} em ${sq(i, j)}. Clique na casa de destino.`); }
        else move(sel, [i, j]);
      } else if (v === 0) {
        say(`A casa ${sq(i, j)} está vazia (valor 0). Clique numa peça para pegá-la.`);
      } else {
        sel = [i, j];
        say(`${cap(who(v))} em ${sq(i, j)} selecionado. Clique na casa de destino.`);
      }
      paintAll();
    }
    function move(from, to) {
      const p = board[from[0]][from[1]], taken = board[to[0]][to[1]];
      hist.push({ board: Mx.clone(board), last });
      board = L.movePiece(board, from, to); last = [from, to]; sel = null;
      say(`Jogada ${sq(from[0], from[1])} para ${sq(to[0], to[1])}: dois números da matriz mudaram. Na linha ${from[0] + 1}, coluna ${from[1] + 1}, o valor passou de ${num(p)} para 0. Na linha ${to[0] + 1}, coluna ${to[1] + 1}, passou de ${num(taken)} para ${num(p)}.` +
        (taken ? ` A peça que estava ali (${who(taken)}) saiu do jogo.` : ''));
    }
    function undo() {
      const s = hist.pop();
      if (!s) return;
      board = s.board; last = s.last; sel = null;
      say('Jogada desfeita.'); paintAll();
    }
    function reset() {
      board = Mx.clone(L.CHESS_START); hist = []; sel = null; last = null;
      say('Posição inicial. ' + START_MSG); paintAll();
    }
    function transform(kind) {
      hist.push({ board: Mx.clone(board), last });
      sel = null; last = null;
      if (kind === 'neg') {
        board = Mx.map(board, (v) => (v === 0 ? 0 : -v));
        say('Multiplicar a matriz por −1 troca o sinal de todos os números: as peças brancas viraram pretas, e as pretas viraram brancas, nas mesmas casas.');
      } else {
        board = Mx.transpose(board);
        say('A transposta troca linhas por colunas: o que estava na linha 1 foi para a coluna 1, e assim por diante. O tabuleiro fica espelhado na diagonal.');
      }
      paintAll();
    }

    function fit() {
      const avail = availWidth(lab);
      const s = Math.floor((avail - 74) / 8);        // cb + cm
      let cb, cm;
      if (s >= 56) { cb = Math.min(52, Math.round(s * 0.56)); cm = Math.min(40, s - cb); }
      else { cb = clamp(Math.floor((avail - 4) / 8), 30, 52); cm = clamp(Math.floor((avail - 38) / 8), 24, 40); }
      setCell(gB, bB, cb); setCell(gM, bM, cm);
    }
    fit();
    paintAll();
    return { fit };
  }

  /* ============================================================
     2016: o tabuleiro de Go (figura)
     ============================================================ */
  function buildGo(host) {
    const N = 19, S = 20, P = 14, W = P * 2 + S * (N - 1);
    const el = (tag, attrs) => {
      const e = document.createElementNS(SVGNS, tag);
      for (const k of Object.keys(attrs)) e.setAttribute(k, attrs[k]);
      return e;
    };
    const svg = el('svg', { viewBox: `0 0 ${W} ${W}`, class: 's5-go', role: 'img', 'aria-label': 'Um tabuleiro de Go com 19 linhas e 19 colunas e algumas pedras pretas e brancas' });
    svg.append(el('rect', { x: 0, y: 0, width: W, height: W, rx: 8, fill: '#ffe9a6' }));
    for (let k = 0; k < N; k++) {
      const p = P + k * S;
      svg.append(el('line', { x1: P, y1: p, x2: W - P, y2: p, stroke: '#12205a', 'stroke-width': 1 }));
      svg.append(el('line', { x1: p, y1: P, x2: p, y2: W - P, stroke: '#12205a', 'stroke-width': 1 }));
    }
    [3, 9, 15].forEach((a) => [3, 9, 15].forEach((b) => svg.append(el('circle', { cx: P + a * S, cy: P + b * S, r: 2.6, fill: '#12205a' }))));
    const rnd = mulberry32(19), used = new Set();
    let blacks = 0, whites = 0;
    for (let n = 0, tries = 0; n < 44 && tries < 400; tries++) {
      const i = Math.floor(rnd() * N), j = Math.floor(rnd() * N), key = i * N + j;
      if (used.has(key)) continue;
      used.add(key);
      const black = n % 2 === 0;
      if (black) blacks++; else whites++;
      svg.append(el('circle', { cx: P + j * S, cy: P + i * S, r: 8.6, fill: black ? '#12205a' : '#ffffff', stroke: '#12205a', 'stroke-width': 1.4 }));
      n++;
    }
    host.append(h('figure', { class: 'mini s5-gofig' }, svg,
      h('figcaption', null, `Tabuleiro de Go: 19 × 19 = 361 casas. Também é uma matriz: 0 para casa vazia, 1 para pedra preta e −1 para pedra branca. (Posição de exemplo, com ${blacks} pedras pretas e ${whites} brancas.)`)));
  }

  /* ============================================================
     Perguntas
     ============================================================ */
  function buildQuiz(host) {
    const QS = [
      { q: 'O que existe por dentro de uma IA como as de hoje?',
        sub: 'Pense no que o nosso reconhecedor de dígitos tinha por dentro.',
        o: [
          { t: 'Matrizes enormes de números, ajustados com exemplos, nas quais o computador multiplica e soma.', ok: true, why: 'Foi assim no nosso reconhecedor (uma matriz de 640 números) e é assim nos modelos gigantes, só que com bilhões de números.' },
          { t: 'Uma lista de regras do tipo “se tem duas voltas, é um 8”, escritas por programadores.', why: 'Era assim nos primeiros programas. As IAs de hoje, em vez de regras escritas à mão, têm números ajustados com exemplos.' },
          { t: 'Um banco de dados com todas as respostas prontas, que o computador só procura.', why: 'Não é uma lista de respostas prontas. O computador faz contas com matrizes e produz a resposta na hora.' },
          { t: 'Um pequeno cérebro biológico.', why: 'É só matemática: números em matrizes, multiplicações e somas, rodando em um computador comum.' },
        ] },
      { q: 'Uma imagem da MNIST tem 28 × 28 pixels, em tons de cinza. Quantos números o computador recebe para cada imagem?',
        sub: 'Uma matriz guarda um número em cada posição.',
        o: [
          { t: '784 números.', ok: true, why: '28 linhas vezes 28 colunas dão 784 posições, e cada uma guarda um número.' },
          { t: '56 números.', why: '28 + 28 = 56 contaria só uma linha e uma coluna. A matriz tem um número em cada posição, então a conta é 28 × 28.' },
          { t: '28 números.', why: '28 é só o tamanho de um lado da imagem. A matriz tem 28 linhas, cada uma com 28 números.' },
          { t: '2.352 números.', why: '28 × 28 × 3 = 2.352 seria o tamanho de uma imagem colorida (3 canais, como na seção 2). A MNIST é em tons de cinza, com um canal só.' },
        ] },
      { q: 'Neste tabuleiro, qual peça tem o valor −5 na matriz?',
        sub: 'Código: 1 peão, 2 cavalo, 3 bispo, 4 torre, 5 dama, 6 rei. Números negativos são peças pretas.',
        o: [
          { t: 'A dama preta.', ok: true, why: 'O 5 indica a dama e o sinal negativo indica que ela é preta.' },
          { t: 'A dama branca.', why: 'A dama é o 5, mas as brancas têm números positivos. A dama branca vale 5, não −5.' },
          { t: 'A torre preta.', why: 'A torre é o 4. A torre preta vale −4.' },
          { t: 'O rei preto.', why: 'O rei é o 6. O rei preto vale −6.' },
        ] },
      { q: 'O que as redes como a LeNet-5 têm em comum com os filtros da seção 4, e qual é a grande diferença?',
        o: [
          { t: 'Os dois multiplicam números de uma matriz pelos pixels e somam. Na rede, os números do filtro foram descobertos pelo computador, treinando com exemplos.', ok: true, why: 'É a mesma conta de multiplicar e somar. A diferença está em quem escolhe os números: no filtro da seção 4, uma pessoa; na rede, o treino.' },
          { t: 'Os dois têm números escolhidos por programadores. A rede só usa filtros maiores.', why: 'A diferença não é o tamanho. Na rede, o próprio computador descobre os números do filtro ao treinar com muitos exemplos.' },
          { t: 'A rede não usa matrizes, só regras escritas em palavras.', why: 'Redes neurais são feitas de matrizes de números e de contas com elas.' },
          { t: 'Os filtros da seção 4 aprendem sozinhos, e a rede foi escrita à mão.', why: 'É o contrário: os filtros da seção 4 foram escolhidos por pessoas, e os da rede foram aprendidos.' },
        ] },
      { q: 'Qual é a principal diferença entre o Deep Blue (1997) e o nosso reconhecedor de dígitos?',
        o: [
          { t: 'No Deep Blue, pessoas escreveram as regras que avaliam as posições. No reconhecedor, os números do molde foram ajustados com exemplos.', ok: true, why: 'O Deep Blue se apoiava em regras escritas por especialistas e em muita velocidade. O reconhecedor aprendeu seus números sozinho.' },
          { t: 'O Deep Blue usava matrizes e o reconhecedor não.', why: 'Os dois usam matrizes: o tabuleiro é uma matriz 8 × 8, e o reconhecedor guarda seus moldes numa matriz de 10 × 64.' },
          { t: 'O Deep Blue aprendeu jogando contra si mesmo.', why: 'Isso é do AlphaGo, em 2016. O Deep Blue seguia regras escritas por pessoas.' },
          { t: 'O reconhecedor foi escrito à mão, e o Deep Blue aprendeu sozinho.', why: 'É o contrário: o reconhecedor aprendeu com exemplos, e o Deep Blue seguia regras escritas por pessoas.' },
        ] },
      { q: 'Em 1950, Alan Turing propôs o jogo da imitação, hoje chamado de Teste de Turing. Como ele funciona?',
        o: [
          { t: 'Uma pessoa conversa por escrito com alguém que não vê. Se não conseguir dizer se é uma pessoa ou uma máquina, a máquina passou no teste.', ok: true, why: 'Em vez de perguntar se a máquina “pensa”, o teste observa se ela consegue conversar sem ser descoberta.' },
          { t: 'Um computador precisa vencer um campeão mundial de xadrez.', why: 'Isso aconteceu em 1997, com o Deep Blue, e não é o teste de Turing.' },
          { t: 'Um computador precisa ler 100 dígitos escritos à mão sem errar nenhum.', why: 'Ler dígitos foi o desafio dos anos 1990, não o teste de Turing.' },
          { t: 'Uma máquina precisa resolver contas de matrizes mais rápido que uma pessoa.', why: 'O teste não mede velocidade de cálculo, e sim se a conversa da máquina parece a de uma pessoa.' },
        ] },
      { q: 'Uma foto colorida de 224 × 224 pixels, como as usadas na AlexNet, entra no computador como quantas matrizes, e com quantos números no total?',
        sub: 'Lembre dos canais de cor da seção 2.',
        o: [
          { t: '3 matrizes de 224 × 224, com 150.528 números no total.', ok: true, why: 'Uma matriz para cada canal (R, G e B): 224 × 224 × 3 = 150.528.' },
          { t: '1 matriz de 224 × 224, com 50.176 números.', why: 'Isso vale para uma imagem em tons de cinza. A foto colorida tem três canais, então são três matrizes.' },
          { t: '3 matrizes de 3 × 3, com 27 números no total.', why: '3 × 3 é o tamanho de um filtro, não da foto. Cada matriz da foto tem 224 linhas e 224 colunas.' },
          { t: '224 matrizes de 3 × 3.', why: 'A foto tem 3 canais de cor, cada um é uma matriz de 224 × 224.' },
        ] },
    ];
    let qi = 0;
    const quiz = Quiz({ question: '', sub: ' ', list: true, newLabel: 'Outra pergunta', onNew: () => { qi = (qi + 1) % QS.length; setQ(); } });
    function setQ() {
      const q = QS[qi];
      quiz.setQuestion(q.q); quiz.setSub(q.sub || 'Escolha a melhor alternativa.');
      quiz.setOptions(shuffle(q.o).map((o) => ({ correct: !!o.ok, content: o.t, why: o.why })));
    }
    setQ();
    host.append(quiz.root);
  }

  /* ============================================================ */
  function init(panel) {
    fitters = [];
    const run = (sel, fn) => {
      const host = $(sel, panel);
      if (!host) return;
      try {
        const r = fn(host);
        if (r && r.fit) fitters.push(r.fit);
      } catch (err) {
        console.error('Seção 5 (' + sel + ')', err);
        host.append(h('div', { class: 'note', role: 'alert' },
          h('p', null, h('b', null, 'Esta atividade não carregou. '), 'Recarregue a página (F5). Detalhe técnico: ' + (err && err.message ? err.message : err))));
      }
    };
    run('#s5-retina', buildRetina);
    run('#s5-digits', buildDigits);
    run('#s5-chess', buildChess);
    run('#s5-go', buildGo);
    run('#s5-quiz', buildQuiz);

    let lastW = panel.clientWidth, timer = 0;
    window.addEventListener('resize', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (panel.hidden || Math.abs(panel.clientWidth - lastW) < 8) return;
        lastW = panel.clientWidth;
        fitters.forEach((f) => f());
      }, 150);
    });
  }

  root.Sections = root.Sections || {};
  root.Sections.s5 = { init, onShow() { fitters.forEach((f) => f()); } };
})(window);
