/* ==========================================================
   Seção 2: cores = três matrizes somadas; somar um número muda a luminosidade
   ========================================================== */
(function (root) {
  'use strict';
  const { $, h, Grid, matrixBox, linkViews, Quiz, cellFor, rgb, textOn } = root.UI;
  const { Mx, clamp, shuffle, rgbFromArt, cloneRGB, addToChannels, addRGBA, meanLevel, CHANNELS } = root.Logic;

  const CH = {
    R: { name: 'vermelho', cls: 'tag-r', color: (v) => rgb(v, 0, 0), text: (v) => textOn(v, 0, 0) },
    G: { name: 'verde', cls: 'tag-g', color: (v) => rgb(0, v, 0), text: (v) => textOn(0, v, 0) },
    B: { name: 'azul', cls: 'tag-b', color: (v) => rgb(0, 0, v), text: (v) => textOn(0, 0, v) },
  };
  const BRUSHES = [
    ['Vermelho', [255, 0, 0]], ['Verde', [0, 255, 0]], ['Azul', [0, 0, 255]],
    ['Amarelo', [255, 255, 0]], ['Ciano', [0, 255, 255]], ['Magenta', [255, 0, 255]],
    ['Branco', [255, 255, 255]], ['Cinza', [128, 128, 128]], ['Preto', [0, 0, 0]], ['Laranja', [255, 128, 0]],
  ];
  const swatch = (r, g, b) => h('span', { class: 'swatch', style: { background: rgb(r, g, b) }, 'aria-hidden': 'true' });
  const pxColor = (M, i, j, use) => rgb(use.R ? M.R[i][j] : 0, use.G ? M.G[i][j] : 0, use.B ? M.B[i][j] : 0);

  function init(panel) {
    const art = root.ART.colors;
    const decHost = $('#s2-lab', panel);
    const brHost = $('#s2-bright', panel);
    const quizHost = $('#s2-quiz', panel);

    const st = {
      id: art[0].id, orig: null, rgb: null,
      use: { R: true, G: true, B: true },
      mode: 'cores', brush: [255, 0, 0],
      k: 60, kuse: { R: true, G: true, B: true }, kchan: 'R',
      renders: [],
    };
    const entryOf = (id) => art.find((a) => a.id === id) || art[0];
    const renderAll = () => st.renders.forEach((f) => f());
    function loadArt(id) {
      st.id = id; st.orig = rgbFromArt(entryOf(id)); st.rgb = cloneRGB(st.orig);
    }
    loadArt(st.id);
    const setPix = (i, j, col) => {
      st.rgb.R[i][j] = col[0]; st.rgb.G[i][j] = col[1]; st.rgb.B[i][j] = col[2];
      renderAll();
    };
    const setChan = (c, i, j, v) => { if (st.rgb[c][i][j] !== v) { st.rgb[c][i][j] = v; renderAll(); } };

    /* ============ 2.1  separar e somar os canais ============ */
    function buildDecomp() {
      decHost.replaceChildren();
      st.renders = st.renders.filter((f) => !f.dec);
      const rows = st.rgb.R.length, cols = st.rgb.R[0].length;
      const cI = cellFor(decHost, cols * 4, { max: 26, min: 12, extra: 4 * 50 + 44 });
      const cN = cellFor(decHost, cols, { max: 28, min: 20, extra: 62 });
      const gImg = {}, bImg = {}, gNum = {}, bNum = {};

      let paintCol = st.brush;
      const down = (i, j) => { paintCol = st.brush; setPix(i, j, paintCol); };
      const move = (i, j) => setPix(i, j, paintCol);
      const resAria = 'Imagem colorida: soma dos três canais. Clique ou arraste para pintar com o pincel.';

      CHANNELS.forEach((c) => {
        gImg[c] = Grid({ rows, cols, kind: 'image', lines: true, cell: cI, aria: `Canal ${CH[c].name}` });
        bImg[c] = matrixBox(gImg[c], { title: h('span', { class: CH[c].cls }, `Canal ${CH[c].name}`) });
        gNum[c] = Grid({
          rows, cols, kind: 'matrix', input: true, cell: cN, aria: `Matriz do canal ${CH[c].name}. Digite números de 0 a 255.`,
          onInput: (i, j, txt, inp) => {
            const clean = txt.replace(/\D/g, '').slice(0, 3);
            if (clean !== txt) inp.value = clean;
            if (clean === '') return;
            setChan(c, i, j, clamp(parseInt(clean, 10), 0, 255));
          },
          onCommit: () => render(true),
        });
        bNum[c] = matrixBox(gNum[c], { title: h('span', { class: CH[c].cls }, `Matriz ${c} (${CH[c].name})`) });
      });
      const gRes = Grid({ rows, cols, kind: 'image', lines: true, cell: cI, editable: true, onClick: down, onDrag: move, aria: resAria });
      const bRes = matrixBox(gRes, { title: 'Imagem colorida', dims: false });
      const gResN = Grid({ rows, cols, kind: 'image', lines: true, cell: Math.max(14, Math.round(cN * 0.62)), aria: 'Imagem colorida resultante' });
      const bResN = matrixBox(gResN, { title: 'Soma dos três', dims: false });

      const op = (t) => h('div', { class: 'op', 'aria-hidden': 'true' }, t);
      const eqImg = h('div', { class: 'eq' }, bImg.R.root, op('+'), bImg.G.root, op('+'), bImg.B.root, op('='), bRes.root);
      const eqNum = h('div', { class: 'eq' }, bNum.R.root, op('+'), bNum.G.root, op('+'), bNum.B.root, op('='), bResN.root);
      eqNum.hidden = true;

      // ----- controles
      const sel = h('select', { class: 'sel', 'aria-label': 'Escolher a imagem', onchange: (ev) => { loadArt(ev.target.value); rebuild(); } },
        art.map((a) => h('option', { value: a.id, selected: a.id === st.id }, a.name)));
      const bReset = h('button', { type: 'button', class: 'btn', onclick: () => { st.rgb = cloneRGB(st.orig); renderAll(); } }, 'Voltar à imagem original');
      const mkMode = (id, label) => h('button', { type: 'button', class: 'btn sm', 'aria-pressed': String(st.mode === id), onclick: () => setMode(id) }, label);
      const mCores = mkMode('cores', 'Cores'), mNums = mkMode('numeros', 'Números');
      const chk = CHANNELS.map((c) => h('label', { class: 'check' },
        h('input', { type: 'checkbox', checked: st.use[c], onchange: (ev) => { st.use[c] = ev.target.checked; renderAll(); } }),
        h('span', { class: CH[c].cls }, CH[c].name)));

      // pincel
      const brushBtns = BRUSHES.map(([name, col]) => h('button', {
        type: 'button', class: 'sw', title: name, 'aria-label': 'Pincel ' + name.toLowerCase(), 'aria-pressed': 'false',
        style: { background: rgb(...col) }, onclick: () => setBrush(col),
      }));
      const brushIn = CHANNELS.map((c, k) => h('input', {
        type: 'number', class: 'num sm', min: 0, max: 255, value: st.brush[k], 'aria-label': `Pincel, ${CH[c].name}, de 0 a 255`,
        oninput: (ev) => { const v = clamp(parseInt(ev.target.value, 10) || 0, 0, 255); const b = st.brush.slice(); b[k] = v; setBrush(b, true); },
      }));
      const brushNow = h('span', { class: 'swatch big', 'aria-hidden': 'true' });
      function setBrush(col, fromInput) {
        st.brush = col.slice();
        brushBtns.forEach((b, k) => b.setAttribute('aria-pressed', String(BRUSHES[k][1].every((v, q) => v === col[q]))));
        if (!fromInput) brushIn.forEach((inp, k) => { inp.value = col[k]; });
        brushNow.style.background = rgb(...col);
      }
      const brushRow = h('div', { class: 'brush', role: 'group', 'aria-label': 'Pincel' },
        h('b', null, 'Pincel:'), brushBtns,
        h('span', { class: 'brush-in' }, h('span', { class: 'tag-r' }, 'R'), brushIn[0], h('span', { class: 'tag-g' }, 'G'), brushIn[1], h('span', { class: 'tag-b' }, 'B'), brushIn[2], brushNow));
      setBrush(st.brush);

      function setMode(m) {
        st.mode = m;
        mCores.setAttribute('aria-pressed', String(m === 'cores'));
        mNums.setAttribute('aria-pressed', String(m === 'numeros'));
        eqImg.hidden = m !== 'cores'; eqNum.hidden = m !== 'numeros';
        brushRow.hidden = m !== 'cores';
        setHint(m === 'cores' ? hintImg : hintNum);
        render(true);
      }

      // ----- informação ao passar o mouse
      const info = h('p', { class: 'infoline', 'aria-live': 'polite' });
      const hintImg = 'Passe o mouse sobre a imagem colorida para ver os três números de cada pixel.';
      const hintNum = 'Digite números de 0 a 255 nas matrizes (ou use as setas para cima e para baixo). Passe o mouse para ver a soma.';
      let dflt = hintImg, hovering = false;
      const setHint = (t) => { dflt = t; if (!hovering) info.textContent = t; };
      info.textContent = dflt;
      const describe = (pos) => {
        hovering = !!pos;
        if (!pos) { info.textContent = dflt; return; }
        const [i, j] = pos;
        const v = { R: st.rgb.R[i][j], G: st.rgb.G[i][j], B: st.rgb.B[i][j] };
        const eff = (c) => (st.use[c] ? v[c] : 0);
        const part = (c) => h('span', { class: CH[c].cls }, `${CH[c].name} ${v[c]}${st.use[c] ? '' : ' (desligado)'}`);
        info.replaceChildren('Linha ', h('b', null, String(i + 1)), ', coluna ', h('b', null, String(j + 1)), ': ',
          part('R'), ' + ', part('G'), ' + ', part('B'), ' = ', swatch(eff('R'), eff('G'), eff('B')),
          h('span', { class: 'mono' }, ` (${eff('R')}, ${eff('G')}, ${eff('B')})`));
      };
      linkViews([gImg.R, gImg.G, gImg.B, gRes].map((g) => ({ g })), describe);
      linkViews([gNum.R, gNum.G, gNum.B, gResN].map((g) => ({ g })), describe);

      const render = (force) => {
        const M = st.rgb;
        CHANNELS.forEach((c) => {
          gImg[c].paint((i, j) => ({ bg: CH[c].color(M[c][i][j]) }));
          gNum[c].paint((i, j) => { const v = M[c][i][j]; return { bg: CH[c].color(v), fg: CH[c].text(v), text: v }; }, { force: force === true });
          const off = !st.use[c];
          bImg[c].root.classList.toggle('off', off); bNum[c].root.classList.toggle('off', off);
        });
        const res = (i, j) => ({ bg: pxColor(M, i, j, st.use) });
        gRes.paint(res); gResN.paint(res);
        for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
          gRes.cell(i, j).setAttribute('aria-label', `linha ${i + 1}, coluna ${j + 1}: vermelho ${M.R[i][j]}, verde ${M.G[i][j]}, azul ${M.B[i][j]}`);
        }
      };
      render.dec = true;
      st.renders.push(render);

      decHost.append(h('div', { class: 'lab' },
        h('div', { class: 'lab-bar' }, h('label', { class: 'field' }, 'Imagem:', sel), bReset,
          h('span', { class: 'seg', role: 'group', 'aria-label': 'Mostrar como' }, h('span', { class: 'seg-l' }, 'Mostrar:'), mCores, mNums)),
        h('div', { class: 'lab-bar' }, h('b', null, 'Canais somados:'), chk),
        brushRow,
        eqImg, eqNum, info));
      setMode(st.mode);
      render(true);
    }

    /* ============ 2.2  somar um número: luminosidade ============ */
    let photoCmp = null, picker = null;
    function buildBright() {
      if (picker) picker.destroy();
      brHost.replaceChildren();
      st.renders = st.renders.filter((f) => !f.br);
      const rows = st.rgb.R.length, cols = st.rgb.R[0].length;
      const cI = cellFor(brHost, cols * 2, { max: 30, min: 14, extra: 150 });
      const cN = cellFor(brHost, cols, { max: 26, min: 18, extra: 62 });

      const gO = Grid({ rows, cols, kind: 'image', lines: true, cell: cI, aria: 'Imagem original' });
      const gP = Grid({ rows, cols, kind: 'image', lines: true, cell: cI, aria: 'Imagem depois da soma' });
      const bO = matrixBox(gO, { title: 'Antes', dims: false });
      const bP = matrixBox(gP, { title: 'Depois', dims: false });
      const gM = Grid({ rows, cols, kind: 'matrix', cell: cN, aria: 'Matriz original do canal escolhido' });
      const gK = Grid({ rows, cols, kind: 'matrix', cell: cN, aria: 'Matriz com o número k em todas as posições' });
      const gS = Grid({ rows, cols, kind: 'matrix', cell: cN, aria: 'Matriz resultante, depois da soma' });
      const bM = matrixBox(gM, { title: h('span', { class: 'chan-title' }) });
      const bK = matrixBox(gK, { title: h('span', null, 'Matriz de ', h('i', null, 'k')), dims: false });
      const bS = matrixBox(gS, { title: 'Resultado', dims: false });
      const titleM = bM.root.querySelector('.chan-title');

      // controles
      const out = h('output', { class: 'kout mono', 'aria-live': 'off' });
      const slider = h('input', { type: 'range', min: -255, max: 255, step: 5, value: st.k, 'aria-label': 'Valor de k, de menos 255 a 255', oninput: (ev) => setK(+ev.target.value) });
      const numIn = h('input', { type: 'number', class: 'num', min: -255, max: 255, value: st.k, 'aria-label': 'k', oninput: (ev) => { const v = parseInt(ev.target.value, 10); if (!isNaN(v)) setK(clamp(v, -255, 255), true); } });
      function setK(v, fromNum) { st.k = v; slider.value = v; if (!fromNum) numIn.value = v; renderAll(); }
      const kuseChk = CHANNELS.map((c) => h('label', { class: 'check' },
        h('input', { type: 'checkbox', checked: st.kuse[c], onchange: (ev) => { st.kuse[c] = ev.target.checked; renderAll(); } }),
        h('span', { class: CH[c].cls }, CH[c].name)));
      const bZero = h('button', { type: 'button', class: 'btn sm', onclick: () => setK(0) }, 'Zerar');
      const chBtns = CHANNELS.map((c) => h('button', { type: 'button', class: 'btn sm', 'aria-pressed': String(st.kchan === c), onclick: () => { st.kchan = c; renderAll(); } },
        h('span', { class: CH[c].cls }, c)));
      const stat = h('p', { class: 'infoline', 'aria-live': 'polite' });
      const legend = h('p', { class: 'legend small' },
        h('span', { class: 'tri hi' }), ' passou de 255 e foi cortado em 255. ',
        h('span', { class: 'tri lo' }), ' ficou abaixo de 0 e foi cortado em 0.');

      // foto
      const pk = picker = root.Images.picker();
      photoCmp = root.UI.Compare({ beforeLabel: 'Antes', afterLabel: 'Depois', beforeAlt: 'Foto original', afterAlt: 'Foto depois de somar k' });
      const photoNote = h('p', { class: 'small muted' }, 'Arraste a barra amarela para comparar. A mesma soma é feita em cada pixel da foto, nos canais marcados.');
      let photoBefore = null;
      const drawPhoto = (force) => {
        const cur = root.Images.current();
        if (force || photoBefore !== cur) { photoBefore = cur; photoCmp.setBefore(cur); }
        photoCmp.setAfter(root.Images.toImageData(addRGBA(cur.data, st.k, st.kuse), cur.width, cur.height));
      };

      const render = () => {
        const c = st.kchan;
        const { out: O, hi, lo } = addToChannels(st.rgb, st.k, st.kuse);
        gO.paint((i, j) => ({ bg: rgb(st.rgb.R[i][j], st.rgb.G[i][j], st.rgb.B[i][j]) }));
        gP.paint((i, j) => ({ bg: rgb(O.R[i][j], O.G[i][j], O.B[i][j]) }));
        gM.paint((i, j) => { const v = st.rgb[c][i][j]; return { bg: CH[c].color(v), fg: CH[c].text(v), text: v }; });
        const kc = st.kuse[c] ? st.k : 0;
        gK.paint(() => ({ bg: '#ffffff', fg: kc < 0 ? '#c92a2a' : '#12205a', text: kc }));
        gS.paint((i, j) => {
          const v = O[c][i][j];
          return { bg: CH[c].color(v), fg: CH[c].text(v), text: v, cls: { 'sat-hi': !!hi[c][i][j], 'sat-lo': !!lo[c][i][j] } };
        });
        titleM.replaceChildren(h('span', { class: CH[c].cls }, `Canal ${CH[c].name}`));
        chBtns.forEach((b, q) => b.setAttribute('aria-pressed', String(CHANNELS[q] === c)));
        const before = meanLevel(st.rgb), after = meanLevel(O);
        out.textContent = (st.k > 0 ? '+' : '') + st.k;
        const nHi = CHANNELS.reduce((s, ch) => s + Mx.sum(hi[ch]), 0), nLo = CHANNELS.reduce((s, ch) => s + Mx.sum(lo[ch]), 0);
        let msg = `Brilho médio da imagem: ${Math.round(before)} antes e ${Math.round(after)} depois (a escala vai de 0 a 255).`;
        if (nHi) msg += ` ${nHi} números passaram de 255 e foram cortados.`;
        if (nLo) msg += ` ${nLo} números ficaram abaixo de 0 e viraram 0.`;
        if (!kuse(st)) msg = 'Todos os canais estão desligados, então nada é somado.';
        stat.textContent = msg;
        drawPhoto(false);
      };
      const kuse = (s) => s.kuse.R || s.kuse.G || s.kuse.B;
      render.br = true;
      st.renders.push(render);

      const op = (t) => h('div', { class: 'op', 'aria-hidden': 'true' }, t);
      const arrow = h('div', { class: 'op', 'aria-hidden': 'true', html: '<svg viewBox="0 0 44 20" width="44" height="20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10h36M30 3l9 7-9 7"/></svg>' });
      brHost.append(h('div', { class: 'lab' },
        h('div', { class: 'lab-bar' },
          h('label', { class: 'field k-field' }, h('span', null, 'Somar ', h('i', null, 'k'), ' = '), out), slider, numIn, bZero),
        h('div', { class: 'lab-bar' }, h('b', null, 'Somar nos canais:'), kuseChk),
        h('div', { class: 'stage' }, bO.root, h('div', { class: 'op', 'aria-hidden': 'true' }, '→'.length ? '' : ''), bP.root,
          h('div', { class: 'photo' }, h('div', { class: 'picker-wrap' }, pk.root), photoCmp.root, photoNote)),
        h('h4', null, 'Olhe os números de um canal'),
        h('div', { class: 'lab-bar' }, h('b', null, 'Canal:'), chBtns),
        h('div', { class: 'eq left' }, bM.root, op('+'), bK.root, op('='), bS.root),
        legend, stat));
      render();
      drawPhoto(true);
    }
    root.Images.onChange(() => { if (photoCmp) { try { const c = root.Images.current(); photoCmp.setBefore(c); photoCmp.setAfter(root.Images.toImageData(addRGBA(c.data, st.k, st.kuse), c.width, c.height)); } catch (e) { console.error(e); } } });

    /* ============ pergunta ============ */
    const D = 60;
    const ALL = { R: true, G: true, B: true };
    const EFFECTS = {
      all: (m) => addToChannels(m, D, ALL).out,
      red: (m) => addToChannels(m, D, { R: true, G: false, B: false }).out,
      less: (m) => addToChannels(m, -D, ALL).out,
      transp: (m) => ({ R: Mx.transpose(m.R), G: Mx.transpose(m.G), B: Mx.transpose(m.B) }),
      row: (m) => { const o = cloneRGB(m); CHANNELS.forEach((c) => { o[c][0] = o[c][0].map((v) => clamp(v + D, 0, 255)); }); return o; },
    };
    const mini = (m, label) => {
      const rows = m.R.length, cols = m.R[0].length;
      const g = Grid({ rows, cols, kind: 'image', lines: true, cell: 11, aria: label });
      g.paint((i, j) => ({ bg: rgb(m.R[i][j], m.G[i][j], m.B[i][j]) }));
      return h('figure', { class: 'mini' }, g.root, h('figcaption', null, label));
    };
    const showEffect = (key, text) => () => {
      const after = EFFECTS[key](st.rgb);
      return h('span', null, text, h('span', { class: 'mini-pair' }, mini(st.rgb, 'antes'), mini(after, 'depois')));
    };
    const OPTS = [
      { key: 'all', correct: true, text: h('span', null, 'Somar o mesmo número positivo (por exemplo, +60) aos valores das ', h('b', null, 'três'), ' matrizes: R, G e B.'),
        why: showEffect('all', 'Quando os três canais sobem juntos, cada cor fica mais clara sem mudar de tom: o cinza escuro vira cinza claro e o azul vira um azul quase branco. Se a soma passa de 255, o valor é cortado em 255. (Multiplicar por um número maior que 1 também clareia; isso volta nos filtros, na seção 4.)') },
      { key: 'red', text: 'Somar um número positivo só na matriz do vermelho.',
        why: showEffect('red', 'Isso aumenta só o canal R, então a imagem fica avermelhada em vez de mais clara.') },
      { key: 'less', text: 'Subtrair o mesmo número de todos os valores das três matrizes.',
        why: showEffect('less', 'Subtrair diminui os três canais, então a imagem fica mais escura.') },
      { key: 'transp', text: 'Trocar as linhas pelas colunas das três matrizes (calcular a transposta).',
        why: showEffect('transp', 'A transposta muda a posição dos pixels, não o brilho. A figura fica espelhada na diagonal, mas com as mesmas cores.') },
      { key: 'row', text: 'Somar um número positivo só na primeira linha de cada matriz.',
        why: showEffect('row', 'Só a primeira linha de pixels fica mais clara. Para a imagem toda clarear, a soma precisa ser feita em todas as posições.') },
    ];
    const quiz = Quiz({
      question: 'Como aumentar a luminosidade de uma imagem?',
      sub: 'Pense nas três matrizes (R, G e B). Você pode testar as ideias no laboratório acima antes de responder.',
      list: true, newLabel: 'Embaralhar alternativas',
      onNew: () => setQuiz(),
    });
    function setQuiz() {
      quiz.setOptions(shuffle(OPTS).map((o) => ({ correct: !!o.correct, content: o.text, why: o.why })));
    }
    setQuiz();
    quizHost.append(quiz.root);

    /* ---------- montagem ---------- */
    function rebuild() { buildDecomp(); buildBright(); renderAll(); }
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
  root.Sections.s2 = { init };
})(window);
