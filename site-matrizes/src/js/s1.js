/* ==========================================================
   Seção 1: pixels em preto e branco, matriz e transposta
   ========================================================== */
(function (root) {
  'use strict';
  const { $, h, Grid, matrixBox, linkViews, Quiz, cellFor, bindDigitKeys } = root.UI;
  const { Mx, bitsFromRows, buildTransposeQuestion } = root.Logic;

  const BW = (v) => ({ bg: v ? '#ffffff' : '#000000', fg: v ? '#12205a' : '#ffffff', text: v });
  const subIJ = (i, j) => h('span', { html: `<i>a</i><sub>${i},${j}</sub>` });

  function init(panel) {
    const art = root.ART.bits;
    const labHost = $('#s1-lab', panel);
    const numHost = $('#s1-num', panel);
    const trHost = $('#s1-transp', panel);
    const pgHost = $('#s1-playground', panel);
    const quizHost = $('#s1-quiz', panel);

    /* ---------- estado compartilhado: a imagem A ---------- */
    const st = { id: art[0].id, orig: null, A: null, renders: [] };
    const entryOf = (id) => art.find((a) => a.id === id) || art[0];
    const renderAll = () => st.renders.forEach((f) => f());
    const setPixel = (i, j, v) => {
      if (st.A[i][j] === v) return;
      st.A[i][j] = v;
      renderAll();
    };
    let pg = null; // estado independente do playground de transposições repetidas
    function loadArt(id) {
      st.id = id;
      st.orig = bitsFromRows(entryOf(id).rows);
      st.A = Mx.clone(st.orig);
      pg = null;
    }
    loadArt(st.id);

    /* ---------- 1.1 laboratório: imagem e matriz lado a lado ---------- */
    function buildLab() {
      const hadFocus = labHost.contains(document.activeElement) && document.activeElement.tagName === 'SELECT';
      labHost.replaceChildren();
      st.renders = st.renders.filter((f) => !f.lab);
      const rows = st.A.length, cols = st.A[0].length;
      const cell = cellFor(labHost, cols, { max: 38, extra: 60 });
      let paint = 1;
      const down = (i, j) => { paint = 1 - st.A[i][j]; setPixel(i, j, paint); };
      const move = (i, j) => setPixel(i, j, paint);

      const gi = Grid({ rows, cols, kind: 'image', lines: true, cell, editable: true, onClick: down, onDrag: move, aria: 'Imagem em preto e branco. Clique ou arraste para trocar a cor dos pixels.' });
      const gm = Grid({ rows, cols, kind: 'matrix', cell, editable: true, onClick: down, onDrag: move, aria: 'Matriz de zeros e uns. Clique ou arraste para trocar os valores.' });
      bindDigitKeys(gi, setPixel); bindDigitKeys(gm, setPixel);
      const bi = matrixBox(gi, { title: 'Imagem', rowLabels: true, colLabels: true });
      const bm = matrixBox(gm, { title: 'Matriz A', rowLabels: true, colLabels: true });

      const sel = h('select', { class: 'sel', 'aria-label': 'Escolher o desenho', onchange: (ev) => { loadArt(ev.target.value); rebuildAll(); } },
        art.map((a) => h('option', { value: a.id, selected: a.id === st.id }, a.name)));
      const bReset = h('button', { type: 'button', class: 'btn', onclick: () => { st.A = Mx.clone(st.orig); renderAll(); } }, 'Voltar à imagem original');
      const bBlack = h('button', { type: 'button', class: 'btn', onclick: () => { st.A = Mx.make(rows, cols, 0); renderAll(); } }, 'Deixar tudo preto');
      const stat = h('span', { class: 'small muted', 'aria-live': 'polite' });
      const info = h('p', { class: 'infoline', 'aria-live': 'polite' });
      const dflt = 'Passe o mouse (ou use as setas) sobre um pixel para ver o número dele.';
      info.textContent = dflt;

      linkViews([{ g: gi }, { g: gm }], (pos) => {
        if (!pos) { info.textContent = dflt; return; }
        const [i, j] = pos, v = st.A[i][j];
        info.replaceChildren('Linha ', h('b', null, String(i + 1)), ', coluna ', h('b', null, String(j + 1)), ': ',
          subIJ(i + 1, j + 1), ' = ', h('b', { class: 'mono' }, String(v)), v ? ' (pixel branco)' : ' (pixel preto)');
      });

      const render = () => {
        const aria = (i, j) => `linha ${i + 1}, coluna ${j + 1}: ${st.A[i][j] ? 'branco, 1' : 'preto, 0'}`;
        gi.paint((i, j) => BW(st.A[i][j]));
        gm.paint((i, j) => BW(st.A[i][j]));
        for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
          gi.cell(i, j).setAttribute('aria-label', aria(i, j));
          gm.cell(i, j).setAttribute('aria-label', aria(i, j));
        }
        let changed = 0, white = 0;
        for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
          if (st.A[i][j] !== st.orig[i][j]) changed++;
          white += st.A[i][j];
        }
        bReset.disabled = changed === 0;
        stat.textContent = `Pixels brancos: ${white}. Pixels pretos: ${rows * cols - white}. Pixels que você mudou: ${changed}.`;
      };
      render.lab = true;
      st.renders.push(render);

      labHost.append(
        h('div', { class: 'lab' },
          h('div', { class: 'lab-bar' }, h('label', { class: 'field' }, 'Desenho:', sel), bReset, bBlack),
          h('div', { class: 'stage' }, bi.root, bm.root),
          info, h('p', { class: 'statline' }, stat)));
      render();
      if (hadFocus) sel.focus();
    }

    /* ---------- 1.2 transposta: A e A^T lado a lado ---------- */
    function pairView(host, o) {
      // o.get(): matriz atual; o.paint(v): estilo da célula; o.editable; o.rowButtons
      host.replaceChildren();
      const M = o.get();
      const rows = M.length, cols = M[0].length;
      const T = Mx.transpose(M);
      const cell = cellFor(host, rows + cols, { max: o.cell || 36, min: 20, extra: 130 });
      const down = o.editable ? (i, j) => { o.paintVal = 1 - o.get()[i][j]; o.set(i, j, o.paintVal); } : null;
      const move = o.editable ? (i, j) => o.set(i, j, o.paintVal) : null;
      const gA = Grid({ rows, cols, kind: 'matrix', cell, editable: !!o.editable, onClick: down, onDrag: move, aria: o.ariaA });
      const gT = Grid({ rows: cols, cols: rows, kind: 'matrix', cell, aria: o.ariaT });
      let selRow = null;
      const press = (i) => { selRow = selRow === i ? null : i; if (o.onSelect) o.onSelect(selRow); renderHL(); };
      const bA = matrixBox(gA, { title: h('span', { html: '<i>A</i>' }), rowLabels: true, colLabels: true, onRowLabel: o.rowButtons ? press : null });
      const bT = matrixBox(gT, { title: h('span', { html: '<i>A</i><sup>T</sup>' }), rowLabels: true, colLabels: true, onColLabel: o.rowButtons ? press : null });
      const arrow = h('div', { class: 'op', 'aria-hidden': 'true', style: { alignSelf: 'center' } }, '⇄');
      linkViews([{ g: gA }, { g: gT, tr: true }], null);
      if (o.editable) bindDigitKeys(gA, (i, j, v) => o.set(i, j, v));

      const renderHL = () => {
        gA.clear('pin'); gT.clear('pin'); gA.clear('win'); gT.clear('win');
        if (selRow !== null) {
          for (let j = 0; j < cols; j++) gA.cell(selRow, j).classList.add('pin');
          for (let j = 0; j < cols; j++) gT.cell(j, selRow).classList.add('pin');
        }
        if (o.diag && o.diag()) {
          for (let k = 0; k < Math.min(rows, cols); k++) { gA.cell(k, k).classList.add('win'); gT.cell(k, k).classList.add('win'); }
        }
        bA.pressRow(selRow === null ? -1 : selRow);
        bT.pressCol(selRow === null ? -1 : selRow);
      };
      const render = () => {
        const A = o.get(), Tt = Mx.transpose(A);
        gA.paint((i, j) => o.paint(A[i][j])); gT.paint((i, j) => o.paint(Tt[i][j]));
        renderHL();
        if (o.after) o.after(A);
      };
      host.append(h('div', { class: 'eq left' }, bA.root, arrow, bT.root));
      return { render, step() { press(selRow === null ? 0 : (selRow + 1) % rows); }, clear() { selRow = null; renderHL(); } };
    }

    // exemplo com números quaisquer (2 x 3)
    function buildNumbers() {
      const N = [[1, 2, 3], [4, 5, 6]];
      const v = pairView(numHost, {
        get: () => N, set: () => {}, paint: (x) => ({ bg: '#ffffff', text: x }),
        ariaA: 'Matriz A de 2 linhas e 3 colunas', ariaT: 'Matriz transposta de A, com 3 linhas e 2 colunas', rowButtons: true, cell: 44,
      });
      v.render();
    }

    // a imagem do aluno
    let trView = null, diagOn = false, selInfo = null;
    function buildTransp() {
      trHost.replaceChildren();
      st.renders = st.renders.filter((f) => !f.tr);
      const box = h('div', { class: 'lab' });
      const bar = h('div', { class: 'lab-bar' });
      const diagCk = h('input', { type: 'checkbox', checked: diagOn, onchange: (ev) => { diagOn = ev.target.checked; trView.render(); } });
      const bStep = h('button', { type: 'button', class: 'btn', onclick: () => trView.step() }, 'Próxima linha');
      const bClear = h('button', { type: 'button', class: 'btn', onclick: () => trView.clear() }, 'Limpar destaque');
      bar.append(bStep, bClear, h('label', { class: 'check' }, diagCk, 'Mostrar a diagonal'));
      const stage = h('div');
      selInfo = h('p', { class: 'infoline', 'aria-live': 'polite' },
        'Clique no número de uma linha de A (à esquerda da matriz) para ver onde ela vai parar na transposta.');
      box.append(bar, stage, selInfo);
      trHost.append(box);
      trView = pairView(stage, {
        get: () => st.A, set: setPixel, editable: true, rowButtons: true, diag: () => diagOn,
        paint: BW, ariaA: 'Matriz A, editável', ariaT: 'Transposta de A',
        onSelect: (r) => {
          selInfo.textContent = r === null
            ? 'Clique no número de uma linha de A (à esquerda da matriz) para ver onde ela vai parar na transposta.'
            : `A linha ${r + 1} de A virou a coluna ${r + 1} de A transposta.`;
        },
      });
      const render = () => { trView.render(); };
      render.tr = true;
      st.renders.push(render);
      render();
    }

    /* ---------- 1.3 playground: transpor várias vezes seguidas ---------- */
    function buildPlayground() {
      pgHost.replaceChildren();
      st.renders = st.renders.filter((f) => !f.pg);
      if (!pg) pg = { base: Mx.clone(st.A), M: Mx.clone(st.A), count: 0 };

      const matStage = h('div', { class: 'stage' });
      const chip = h('span', { class: 'status', role: 'status', 'aria-live': 'polite' });
      const bTranspose = h('button', { type: 'button', class: 'btn primary', onclick: () => { pg.M = Mx.transpose(pg.M); pg.count++; render(); } }, 'Transpor de novo');
      const bReset = h('button', { type: 'button', class: 'btn', onclick: () => { pg.M = Mx.clone(pg.base); pg.count = 0; render(); } }, 'Voltar ao início');

      // a matriz é reconstruída a cada transposição porque, se não for quadrada, linhas e colunas trocam de tamanho
      const renderMatrix = () => {
        matStage.replaceChildren();
        const rows = pg.M.length, cols = pg.M[0].length;
        const cell = cellFor(pgHost, Math.max(rows, cols), { max: 38, extra: 60 });
        const setCell = (i, j, v) => {
          if (pg.M[i][j] === v) return;
          pg.M[i][j] = v;
          pg.base = Mx.clone(pg.M);
          pg.count = 0;
          render();
        };
        let paint = 1;
        const down = (i, j) => { paint = 1 - pg.M[i][j]; setCell(i, j, paint); };
        const move = (i, j) => setCell(i, j, paint);
        const g = Grid({ rows, cols, kind: 'matrix', cell, editable: true, onClick: down, onDrag: move, aria: 'Matriz que você pode editar e transpor repetidamente.' });
        g.paint((i, j) => BW(pg.M[i][j]));
        bindDigitKeys(g, setCell);
        const box = matrixBox(g, { title: 'Matriz', rowLabels: true, colLabels: true });
        matStage.append(box.root);
      };

      const render = () => {
        renderMatrix();
        bReset.disabled = pg.count === 0;
        chip.className = 'status';
        if (pg.count === 0) {
          chip.textContent = 'Ainda não transpôs nenhuma vez.';
        } else if (pg.count % 2 === 0) {
          chip.classList.add('done');
          chip.textContent = `Transpôs ${pg.count} vezes: como é um número par, voltou a ser exatamente a matriz do início!`;
        } else {
          chip.textContent = `Transpôs ${pg.count} ${pg.count === 1 ? 'vez' : 'vezes'}: como é um número ímpar, essa é a transposta da matriz do início.`;
        }
      };
      render.pg = true;
      st.renders.push(render);

      pgHost.append(h('div', { class: 'lab' },
        h('div', { class: 'lab-bar' }, bTranspose, bReset),
        matStage,
        chip));
      render();
    }

    /* ---------- pergunta ---------- */
    const order = ['letraF', 'cursor', 'letraR', 'carinha', 'casa'];
    let qIdx = 0, qCustom = false;
    const quiz = Quiz({
      question: 'Qual das seguintes representações dessa imagem corresponde à transposta da imagem?',
      sub: 'Dica: a primeira linha da imagem original precisa virar a primeira coluna da resposta.',
      optw: 236,
      newLabel: 'Outra imagem',
      onNew: () => { qIdx = (qIdx + 1) % order.length; qCustom = false; makeQuestion(bitsFromRows(entryOf(order[qIdx]).rows), entryOf(order[qIdx]).name); },
    });
    const ckNums = h('input', { type: 'checkbox', onchange: (ev) => quiz.root.classList.toggle('show-nums', ev.target.checked) });
    const bMine = h('button', { type: 'button', class: 'btn sm', onclick: () => { qCustom = true; makeQuestion(Mx.clone(st.A), 'a sua imagem editada'); } }, 'Usar a imagem que editei');
    quiz.root.querySelector('.quiz-actions').append(bMine);
    quiz.root.insertBefore(h('div', { class: 'quiz-tools' }, h('label', { class: 'check' }, ckNums, 'Mostrar os números nas alternativas')), quiz.root.querySelector('.q-ctx'));

    const pix = (m, cell, nums) => {
      const g = Grid({ rows: m.length, cols: m[0].length, kind: 'image', digits: true, lines: true, cell });
      g.paint((i, j) => BW(m[i][j]));
      if (nums) g.root.classList.add('nums');
      return g;
    };
    function makeQuestion(A, label) {
      const opts = buildTransposeQuestion(A, Math.random, 6);
      const ctxBox = matrixBox(pix(A, 26, true), { title: h('span', null, 'Imagem original ', h('i', null, 'A')), rowLabels: false });
      if (opts.length < 4) {
        quiz.setOptions([], h('div', { class: 'note' }, h('p', null, 'Essa imagem é simétrica demais: várias transformações dão o mesmo resultado, e não dá para montar alternativas diferentes. Mude alguns pixels lá em cima (ou escolha outra imagem) e tente de novo.')));
        return;
      }
      quiz.setOptions(opts.map((o) => ({
        correct: o.correct, name: o.name, why: o.why, vis: true,
        label: `Alternativa com imagem de ${o.matrix.length} linhas e ${o.matrix[0].length} colunas`,
        content: h('div', { class: 'optpix' }, pix(o.matrix, 22, false).root),
      })), ctxBox.root);
    }

    /* ---------- montagem ---------- */
    function rebuildAll() {
      buildLab(); buildTransp(); buildPlayground();
      st.renders.forEach((f) => f());
    }
    buildNumbers();
    rebuildAll();
    makeQuestion(bitsFromRows(entryOf(order[0]).rows), entryOf(order[0]).name);
    quizHost.append(quiz.root);

    // refaz o tamanho das células quando a janela muda de largura
    let lastW = panel.clientWidth, timer = 0;
    window.addEventListener('resize', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (panel.hidden || Math.abs(panel.clientWidth - lastW) < 8) return;
        lastW = panel.clientWidth;
        buildNumbers(); rebuildAll();
      }, 180);
    });
  }

  root.Sections = root.Sections || {};
  root.Sections.s1 = { init };
})(window);
