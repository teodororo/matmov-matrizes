/* ==========================================================
   Lógica pura (sem DOM): usada pelo site e pelos testes em Node.
   ========================================================== */
(function (root) {
  'use strict';

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, rnd = Math.random) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ---------- matrizes ---------- */
  const Mx = {
    make(r, c, f = 0) {
      const m = [];
      for (let i = 0; i < r; i++) {
        const row = [];
        for (let j = 0; j < c; j++) row.push(typeof f === 'function' ? f(i, j) : f);
        m.push(row);
      }
      return m;
    },
    clone: (m) => m.map((r) => r.slice()),
    rows: (m) => m.length,
    cols: (m) => (m.length ? m[0].length : 0),
    map: (m, fn) => m.map((r, i) => r.map((v, j) => fn(v, i, j))),
    zip: (a, b, fn) => a.map((r, i) => r.map((v, j) => fn(v, b[i][j], i, j))),
    transpose: (m) => m[0].map((_, j) => m.map((r) => r[j])),
    flipH: (m) => m.map((r) => r.slice().reverse()),
    flipV: (m) => m.slice().reverse().map((r) => r.slice()),
    equals: (a, b) => a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j])),
    key: (m) => m.map((r) => r.join(',')).join('/'),
    sum: (m) => m.reduce((s, r) => s + r.reduce((x, y) => x + y, 0), 0),
  };
  Mx.mean = (m) => Mx.sum(m) / (Mx.rows(m) * Mx.cols(m));
  Mx.rot180 = (m) => Mx.flipV(Mx.flipH(m));
  Mx.rotCW = (m) => Mx.flipH(Mx.transpose(m));
  Mx.rotCCW = (m) => Mx.flipV(Mx.transpose(m));
  Mx.antiTranspose = (m) => Mx.rot180(Mx.transpose(m));

  /* ---------- Seção 1: transposta e as alternativas da pergunta ---------- */
  const TRANSFORMS = {
    transpose: { name: 'Transposta', fn: Mx.transpose,
      why: 'Cada linha da imagem original virou uma coluna.' },
    identity: { name: 'A imagem original', fn: Mx.clone,
      why: 'Essa é a própria imagem original, sem nenhuma transformação.' },
    flipH: { name: 'Espelho horizontal', fn: Mx.flipH,
      why: 'É o espelho horizontal: cada linha foi escrita de trás para frente. A transposta não inverte as linhas, ela as transforma em colunas.' },
    flipV: { name: 'Espelho vertical', fn: Mx.flipV,
      why: 'É o espelho vertical: a ordem das linhas foi invertida (a última virou a primeira). Na transposta, as linhas viram colunas.' },
    rot180: { name: 'Giro de 180°', fn: Mx.rot180,
      why: 'É um giro de 180° (a imagem de cabeça para baixo). Os pixels mudam de lugar, mas linhas continuam sendo linhas.' },
    rotCW: { name: 'Giro de 90° para a direita', fn: Mx.rotCW,
      why: 'É um giro de 90° no sentido horário. Parece com a transposta, mas não é: a transposta é um espelho na diagonal, não um giro.' },
    rotCCW: { name: 'Giro de 90° para a esquerda', fn: Mx.rotCCW,
      why: 'É um giro de 90° no sentido anti-horário. Parece com a transposta, mas não é: a transposta é um espelho na diagonal, não um giro.' },
    antiTranspose: { name: 'Espelho na outra diagonal', fn: Mx.antiTranspose,
      why: 'É o espelho na outra diagonal (do canto superior direito ao inferior esquerdo). A transposta usa a diagonal principal, do canto superior esquerdo ao inferior direito.' },
  };

  /** Monta as alternativas: a transposta + até (n-1) transformações parecidas, todas diferentes entre si. */
  function buildTransposeQuestion(A, rnd = Math.random, n = 5) {
    const correct = Mx.transpose(A);
    const seen = new Set([Mx.key(correct)]);
    const opts = [];
    const order = ['rotCW', 'rotCCW'].concat(shuffle(['flipH', 'flipV', 'rot180', 'antiTranspose', 'identity'], rnd));
    for (const id of order) {
      if (opts.length >= n - 1) break;
      const m = TRANSFORMS[id].fn(A);
      const k = Mx.key(m);
      if (seen.has(k)) continue;
      seen.add(k);
      opts.push({ id, matrix: m, correct: false, name: TRANSFORMS[id].name, why: TRANSFORMS[id].why });
    }
    opts.push({ id: 'transpose', matrix: correct, correct: true, name: TRANSFORMS.transpose.name, why: TRANSFORMS.transpose.why });
    return shuffle(opts, rnd);
  }

  /* ---------- imagens: texto -> matriz ---------- */
  function bitsFromRows(rows) { return rows.map((r) => [...r].map((c) => (c === '1' ? 1 : 0))); }
  function rgbFromArt(entry) {
    const px = entry.rows.map((r) => [...r].map((ch) => entry.pal[ch]));
    return {
      R: px.map((r) => r.map((c) => c[0])),
      G: px.map((r) => r.map((c) => c[1])),
      B: px.map((r) => r.map((c) => c[2])),
    };
  }
  const CHANNELS = ['R', 'G', 'B'];
  function cloneRGB(rgb) { return { R: Mx.clone(rgb.R), G: Mx.clone(rgb.G), B: Mx.clone(rgb.B) }; }

  /* ---------- Seção 2: soma de um número nas matrizes de cor ---------- */
  function addToChannels(rgb, k, use) {
    const out = {}, hi = {}, lo = {};
    for (const c of CHANNELS) {
      const add = use[c] ? k : 0;
      out[c] = Mx.map(rgb[c], (v) => clamp(v + add, 0, 255));
      hi[c] = Mx.map(rgb[c], (v) => (v + add > 255 ? 1 : 0));
      lo[c] = Mx.map(rgb[c], (v) => (v + add < 0 ? 1 : 0));
    }
    return { out, hi, lo };
  }
  function meanLevel(rgb) {
    const n = Mx.rows(rgb.R) * Mx.cols(rgb.R);
    return (Mx.sum(rgb.R) + Mx.sum(rgb.G) + Mx.sum(rgb.B)) / (3 * n);
  }

  /** Soma k aos canais escolhidos de uma imagem RGBA (o Uint8ClampedArray já corta em 0 e 255). */
  function addRGBA(src, k, use) {
    const out = new Uint8ClampedArray(src.length);
    for (let p = 0; p < src.length; p += 4) {
      out[p] = src[p] + (use.R ? k : 0);
      out[p + 1] = src[p + 1] + (use.G ? k : 0);
      out[p + 2] = src[p + 2] + (use.B ? k : 0);
      out[p + 3] = src[p + 3];
    }
    return out;
  }

  /* ---------- Seção 3: negativo ---------- */
  const negative = (m, max = 255) => Mx.map(m, (v) => max - v);
  function invertRGBA(src, use) {
    const out = new Uint8ClampedArray(src.length);
    for (let p = 0; p < src.length; p += 4) {
      out[p] = use.R ? 255 - src[p] : src[p];
      out[p + 1] = use.G ? 255 - src[p + 1] : src[p + 1];
      out[p + 2] = use.B ? 255 - src[p + 2] : src[p + 2];
      out[p + 3] = src[p + 3];
    }
    return out;
  }

  /* ---------- Seção 4: filtros 3 x 3 ---------- */
  const KERNELS = [
    { id: 'identidade', name: 'Identidade', k: [[0, 0, 0], [0, 1, 0], [0, 0, 0]], div: 1, off: 0, gray: false,
      desc: 'Cada pixel só olha para si mesmo, então nada muda.' },
    { id: 'desfoque', name: 'Desfoque', k: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], div: 9, off: 0, gray: false,
      desc: 'Cada pixel vira a média dele com os 8 vizinhos, e a imagem borra.' },
    { id: 'gauss', name: 'Desfoque suave', k: [[1, 2, 1], [2, 4, 2], [1, 2, 1]], div: 16, off: 0, gray: false,
      desc: 'Média em que o pixel do centro pesa mais que os vizinhos.' },
    { id: 'nitidez', name: 'Nitidez', k: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]], div: 1, off: 0, gray: false,
      desc: 'Reforça o pixel e desconta os vizinhos, então os detalhes ficam mais marcados.' },
    { id: 'bordas', name: 'Bordas', k: [[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]], div: 1, off: 0, gray: true,
      desc: 'Os números somam 0: onde a imagem é lisa o resultado é preto, e onde algo muda aparece uma linha.' },
    { id: 'sobelx', name: 'Bordas verticais', k: [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], div: 1, off: 128, gray: true,
      desc: 'Compara a direita com a esquerda e destaca linhas verticais (o 128 final deixa o fundo cinza).' },
    { id: 'sobely', name: 'Bordas horizontais', k: [[-1, -2, -1], [0, 0, 0], [1, 2, 1]], div: 1, off: 128, gray: true,
      desc: 'Compara embaixo com em cima e destaca linhas horizontais.' },
    { id: 'relevo', name: 'Relevo', k: [[-2, -1, 0], [-1, 1, 1], [0, 1, 2]], div: 1, off: 0, gray: false,
      desc: 'Parece uma luz vinda de um canto: a imagem ganha volume.' },
    { id: 'movimento', name: 'Movimento', k: [[0, 0, 0], [1, 1, 1], [0, 0, 0]], div: 3, off: 0, gray: false,
      desc: 'Média só na horizontal, como numa foto tirada com a câmera se mexendo.' },
    { id: 'claro', name: 'Clarear', k: [[0, 0, 0], [0, 1.5, 0], [0, 0, 0]], div: 1, off: 0, gray: false,
      desc: 'Multiplica cada pixel por 1,5.' },
    { id: 'negativo', name: 'Negativo', k: [[0, 0, 0], [0, -1, 0], [0, 0, 0]], div: 1, off: 255, gray: false,
      desc: 'Centro −1 e soma 255: é o negativo da seção 3, escrito como filtro.' },
  ];
  function findKernel(k, div, off) {
    return KERNELS.find((p) => p.div === div && p.off === off && p.k.every((r, i) => r.every((v, j) => v === k[i][j])));
  }

  function neighborhood(g, i, j) {
    const m = g.length, n = g[0].length;
    const out = [];
    for (let a = -1; a <= 1; a++) {
      const row = [];
      for (let b = -1; b <= 1; b++) row.push(g[clamp(i + a, 0, m - 1)][clamp(j + b, 0, n - 1)]);
      out.push(row);
    }
    return out;
  }
  function applyKernel(N, K, div = 1, off = 0) {
    let s = 0;
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) s += N[a][b] * K[a][b];
    const raw = s / div + off;
    return { sum: s, raw, value: clamp(Math.round(raw), 0, 255) };
  }
  function convolveGrid(g, K, div = 1, off = 0) {
    return Mx.make(g.length, g[0].length, (i, j) => applyKernel(neighborhood(g, i, j), K, div, off).value);
  }
  function grayRGBA(src) {
    const out = new Uint8ClampedArray(src.length);
    for (let p = 0; p < src.length; p += 4) {
      const l = Math.round(0.299 * src[p] + 0.587 * src[p + 1] + 0.114 * src[p + 2]);
      out[p] = out[p + 1] = out[p + 2] = l;
      out[p + 3] = 255;
    }
    return out;
  }
  function convolveRGBA(src, w, h, K, div = 1, off = 0, gray = false) {
    const s = gray ? grayRGBA(src) : src;
    const out = new Uint8ClampedArray(w * h * 4);
    const k = [K[0][0], K[0][1], K[0][2], K[1][0], K[1][1], K[1][2], K[2][0], K[2][1], K[2][2]];
    for (let y = 0; y < h; y++) {
      const ya = (y > 0 ? y - 1 : 0) * w, yb = y * w, yc = (y < h - 1 ? y + 1 : h - 1) * w;
      for (let x = 0; x < w; x++) {
        const xa = x > 0 ? x - 1 : 0, xc = x < w - 1 ? x + 1 : w - 1;
        const i0 = (ya + xa) * 4, i1 = (ya + x) * 4, i2 = (ya + xc) * 4;
        const i3 = (yb + xa) * 4, i4 = (yb + x) * 4, i5 = (yb + xc) * 4;
        const i6 = (yc + xa) * 4, i7 = (yc + x) * 4, i8 = (yc + xc) * 4;
        const o = (yb + x) * 4;
        for (let c = 0; c < 3; c++) {
          const v = k[0] * s[i0 + c] + k[1] * s[i1 + c] + k[2] * s[i2 + c]
                  + k[3] * s[i3 + c] + k[4] * s[i4 + c] + k[5] * s[i5 + c]
                  + k[6] * s[i6 + c] + k[7] * s[i7 + c] + k[8] * s[i8 + c];
          out[o + c] = clamp(Math.round(v / div + off), 0, 255);
        }
        out[o + 3] = 255;
      }
    }
    return out;
  }

  /* ---------- Seção 5: xadrez ---------- */
  const CHESS_START = [
    [-4, -2, -3, -5, -6, -3, -2, -4],
    [-1, -1, -1, -1, -1, -1, -1, -1],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [4, 2, 3, 5, 6, 3, 2, 4],
  ];
  const PIECE_NAMES = { 1: 'peão', 2: 'cavalo', 3: 'bispo', 4: 'torre', 5: 'dama', 6: 'rei' };
  const PIECE_VALUE = { 1: 1, 2: 3, 3: 3, 4: 5, 5: 9, 6: 0 };
  function material(board) {
    let s = 0;
    for (const row of board) for (const v of row) if (v) s += Math.sign(v) * PIECE_VALUE[Math.abs(v)];
    return s;
  }
  const squareName = (i, j) => 'abcdefgh'[j] + (8 - i);
  function movePiece(board, from, to) {
    const b = Mx.clone(board);
    b[to[0]][to[1]] = b[from[0]][from[1]];
    b[from[0]][from[1]] = 0;
    return b;
  }

  /* ---------- Seção 5: do desenho à matriz 8 x 8 e ao dígito ---------- */
  const STROKE = { SIZE: 32, TARGET_INK: 310, SMIN: 2.8, SMAX: 10, ITERS: 5 };

  function normalizeStrokes(strokes, S, size = STROKE.SIZE) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const st of strokes) for (const p of st) {
      if (p[0] < minX) minX = p[0];
      if (p[0] > maxX) maxX = p[0];
      if (p[1] < minY) minY = p[1];
      if (p[1] > maxY) maxY = p[1];
    }
    const w = maxX - minX, h = maxY - minY;
    const scale = (size - S) / Math.max(h, w, 1e-6);
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    return strokes.map((st) => st.map((p) => [(p[0] - cx) * scale + size / 2, (p[1] - cy) * scale + size / 2]));
  }

  function rasterStrokes(strokes, S, size = STROKE.SIZE) {
    const segs = [];
    for (const st of strokes) {
      if (st.length === 1) segs.push(st[0][0], st[0][1], st[0][0], st[0][1]);
      for (let i = 0; i + 1 < st.length; i++) segs.push(st[i][0], st[i][1], st[i + 1][0], st[i + 1][1]);
    }
    const nseg = segs.length / 4, half = S / 2;
    const out = new Uint8Array(size * size);
    for (let y = 0; y < size; y++) {
      const py = y + 0.5;
      for (let x = 0; x < size; x++) {
        const px = x + 0.5;
        for (let s = 0; s < nseg; s++) {
          const o = s * 4;
          const ax = segs[o], ay = segs[o + 1];
          const abx = segs[o + 2] - ax, aby = segs[o + 3] - ay;
          let l2 = abx * abx + aby * aby;
          if (l2 === 0) l2 = 1e-9;
          let t = ((px - ax) * abx + (py - ay) * aby) / l2;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const qx = ax + t * abx - px, qy = ay + t * aby - py;
          if (Math.sqrt(qx * qx + qy * qy) <= half) { out[y * size + x] = 1; break; }
        }
      }
    }
    return out;
  }

  function blocksToGrid(bitmap, size = STROKE.SIZE) {
    const n = size / 4;
    return Mx.make(n, n, (by, bx) => {
      let s = 0;
      for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 4; dx++) s += bitmap[(by * 4 + dy) * size + bx * 4 + dx];
      return s;
    });
  }

  /**
   * Traços (listas de pontos [x, y]) -> imagem 32x32 normalizada -> matriz 8x8 (0..16).
   * Mesmo método usado para treinar o modelo (tools/digit_synth.py).
   */
  function strokesToGrid(strokes, opts = {}) {
    const { size, TARGET_INK, SMIN, SMAX, ITERS } = Object.assign({}, STROKE, opts);
    const pts = strokes.filter((s) => s.length);
    if (!pts.length) return { empty: true, bitmap: new Uint8Array(size * size), grid: Mx.make(size / 4, size / 4, 0), S: 0, ink: 0 };
    let S = 4.0;
    for (let it = 0; it < ITERS; it++) {
      const ink = Math.max(rasterStrokes(normalizeStrokes(pts, S, size), S, size).reduce((a, b) => a + b, 0), 1);
      S = clamp(S * Math.pow(TARGET_INK / ink, 0.85), SMIN, SMAX);
    }
    const bitmap = rasterStrokes(normalizeStrokes(pts, S, size), S, size);
    return { empty: false, bitmap, grid: blocksToGrid(bitmap, size), S, ink: bitmap.reduce((a, b) => a + b, 0) };
  }

  function softmax(z) {
    const m = Math.max(...z);
    const e = z.map((v) => Math.exp(v - m));
    const s = e.reduce((a, b) => a + b, 0);
    return e.map((v) => v / s);
  }
  const flatten = (m) => [].concat(...m);

  /** Nota de cada dígito: s = W · x + b, com x = pixels (0..16) divididos por 16. */
  function digitScores(model, x) {
    const v = Array.isArray(x[0]) ? flatten(x) : x;
    return model.W.map((row, d) => {
      let s = model.b[d];
      for (let k = 0; k < 64; k++) s += row[k] * (v[k] / 16);
      return s;
    });
  }
  function predictDigit(model, x) {
    const scores = digitScores(model, x);
    const probs = softmax(scores);
    let best = 0;
    for (let d = 1; d < 10; d++) if (scores[d] > scores[best]) best = d;
    return { scores, probs, best };
  }
  function digitContribution(model, d, x) {
    const v = Array.isArray(x[0]) ? flatten(x) : x;
    return Mx.make(8, 8, (i, j) => model.W[d][i * 8 + j] * (v[i * 8 + j] / 16));
  }

  const Logic = {
    clamp, mulberry32, shuffle, Mx,
    TRANSFORMS, buildTransposeQuestion,
    bitsFromRows, rgbFromArt, CHANNELS, cloneRGB,
    addToChannels, addRGBA, meanLevel,
    negative, invertRGBA,
    KERNELS, findKernel, neighborhood, applyKernel, convolveGrid, convolveRGBA, grayRGBA,
    CHESS_START, PIECE_NAMES, PIECE_VALUE, material, squareName, movePiece,
    STROKE, normalizeStrokes, rasterStrokes, strokesToGrid, blocksToGrid,
    softmax, digitScores, predictDigit, digitContribution,
  };
  root.Logic = Logic;
  if (typeof module !== 'undefined' && module.exports) module.exports = Logic;
})(typeof window !== 'undefined' ? window : globalThis);
