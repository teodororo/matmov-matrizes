/* Testes da lógica pura. Uso: node tests/logic.test.js */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const L = require('../src/js/logic.js');
const { Mx } = L;

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ok  ' + name); }
  catch (e) { failed++; console.log('  FALHOU  ' + name + '\n        ' + (e && e.message)); }
}
const load = (f) => { const ctx = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8'), ctx); return JSON.parse(JSON.stringify(ctx.window)); };

console.log('Matrizes e transformações');
const A = [[1, 2, 3], [4, 5, 6]];
test('transposta de uma 2x3', () => assert.deepStrictEqual(Mx.transpose(A), [[1, 4], [2, 5], [3, 6]]));
test('giro 90° horário', () => assert.deepStrictEqual(Mx.rotCW(A), [[4, 1], [5, 2], [6, 3]]));
test('giro 90° anti-horário', () => assert.deepStrictEqual(Mx.rotCCW(A), [[3, 6], [2, 5], [1, 4]]));
test('espelhos e giro 180', () => {
  assert.deepStrictEqual(Mx.flipH(A), [[3, 2, 1], [6, 5, 4]]);
  assert.deepStrictEqual(Mx.flipV(A), [[4, 5, 6], [1, 2, 3]]);
  assert.deepStrictEqual(Mx.rot180(A), [[6, 5, 4], [3, 2, 1]]);
});
test('espelho na diagonal secundária', () => assert.deepStrictEqual(Mx.antiTranspose(A), [[6, 3], [5, 2], [4, 1]]));
test('(Aᵀ)ᵀ = A e quatro giros = identidade', () => {
  assert.deepStrictEqual(Mx.transpose(Mx.transpose(A)), A);
  let r = A; for (let i = 0; i < 4; i++) r = Mx.rotCW(r);
  assert.deepStrictEqual(r, A);
});
test('a[i][j] de A vai para a[j][i] de Aᵀ', () => {
  const T = Mx.transpose(A);
  for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) assert.strictEqual(A[i][j], T[j][i]);
});

console.log('Pergunta da transposta');
const art = load('art.js').ART;
test('todas as imagens geram alternativas diferentes, com uma única correta', () => {
  for (const e of art.bits) {
    const m = L.bitsFromRows(e.rows);
    for (let seed = 1; seed <= 25; seed++) {
      const opts = L.buildTransposeQuestion(m, L.mulberry32(seed));
      assert.strictEqual(opts.length, 5, e.id);
      assert.strictEqual(opts.filter((o) => o.correct).length, 1);
      assert.strictEqual(new Set(opts.map((o) => Mx.key(o.matrix))).size, 5, 'alternativas repetidas em ' + e.id);
      assert.ok(Mx.equals(opts.find((o) => o.correct).matrix, Mx.transpose(m)));
      assert.ok(opts.some((o) => o.id === 'rotCW') && opts.some((o) => o.id === 'rotCCW'));
    }
  }
});
test('a posição da resposta certa varia', () => {
  const m = L.bitsFromRows(art.bits[0].rows);
  const pos = new Set();
  for (let s = 1; s <= 40; s++) pos.add(L.buildTransposeQuestion(m, L.mulberry32(s)).findIndex((o) => o.correct));
  assert.ok(pos.size >= 4, 'posições: ' + [...pos]);
});
test('imagem simétrica não gera alternativas repetidas', () => {
  const sym = [[1, 0, 1], [1, 0, 1], [1, 0, 1]];
  const opts = L.buildTransposeQuestion(sym, L.mulberry32(3));
  assert.strictEqual(new Set(opts.map((o) => Mx.key(o.matrix))).size, opts.length);
});

console.log('Xadrez');
test('tabuleiro inicial: 8x8, material igual e rei no lugar certo', () => {
  assert.strictEqual(L.CHESS_START.length, 8);
  assert.ok(L.CHESS_START.every((r) => r.length === 8));
  assert.strictEqual(L.material(L.CHESS_START), 0);
  assert.strictEqual(L.CHESS_START[7][4], 6);
  assert.strictEqual(L.CHESS_START[0][4], -6);
  assert.strictEqual(L.squareName(6, 4), 'e2');
  assert.strictEqual(L.squareName(0, 0), 'a8');
});
test('mover e capturar peças muda só duas casas e o material', () => {
  const b1 = L.movePiece(L.CHESS_START, [6, 4], [4, 4]);
  assert.strictEqual(b1[6][4], 0);
  assert.strictEqual(b1[4][4], 1);
  assert.strictEqual(L.CHESS_START[6][4], 1);            // o original não foi alterado
  const b2 = L.movePiece(b1, [1, 3], [4, 4]);            // peão preto captura o branco
  assert.strictEqual(L.material(b2), -1);
  const diff = b1.reduce((n, r, i) => n + r.filter((v, j) => v !== L.CHESS_START[i][j]).length, 0);
  assert.strictEqual(diff, 2);
});
test('multiplicar por −1 troca as cores; a transposta é uma involução', () => {
  const neg = Mx.map(L.CHESS_START, (v) => (v === 0 ? 0 : -v));
  assert.strictEqual(L.material(neg), 0);
  assert.strictEqual(neg[0][0], 4);
  assert.deepStrictEqual(Mx.transpose(Mx.transpose(L.CHESS_START)), L.CHESS_START);
});

console.log('Cores, soma e negativo');
test('soma limita em 0 e 255 e marca saturação', () => {
  const rgb = { R: [[250, 10]], G: [[0, 255]], B: [[100, 100]] };
  const r = L.addToChannels(rgb, 20, { R: true, G: true, B: false });
  assert.deepStrictEqual(r.out.R, [[255, 30]]);
  assert.deepStrictEqual(r.out.G, [[20, 255]]);
  assert.deepStrictEqual(r.out.B, [[100, 100]]);
  assert.deepStrictEqual(r.hi.R, [[1, 0]]);
  assert.deepStrictEqual(r.hi.G, [[0, 1]]);
  const d = L.addToChannels(rgb, -30, { R: true, G: true, B: true });
  assert.deepStrictEqual(d.out.R, [[220, 0]]);
  assert.deepStrictEqual(d.lo.R, [[0, 1]]);
});
test('addRGBA soma só nos canais escolhidos, corta em 0 e 255 e preserva o alfa', () => {
  const src = new Uint8ClampedArray([250, 10, 100, 200,   0, 255, 5, 255]);
  const up = L.addRGBA(src, 20, { R: true, G: true, B: false });
  assert.deepStrictEqual(Array.from(up), [255, 30, 100, 200,   20, 255, 5, 255]);
  const down = L.addRGBA(src, -30, { R: true, G: true, B: true });
  assert.deepStrictEqual(Array.from(down), [220, 0, 70, 200,   0, 225, 0, 255]);
});
test('somar o mesmo número nos três canais aumenta o brilho médio', () => {
  const rgb = L.rgbFromArt(art.colors[0]);
  const a = L.meanLevel(rgb), b = L.meanLevel(L.addToChannels(rgb, 40, { R: true, G: true, B: true }).out);
  assert.ok(b > a);
});
test('R + G + B reconstrói a imagem (amarelo = vermelho + verde)', () => {
  const e = art.colors[0];
  const rgb = L.rgbFromArt(e);
  const yellow = e.pal.Y;
  const i = e.rows.findIndex((r) => r.includes('Y')), j = e.rows[i].indexOf('Y');
  assert.deepStrictEqual([rgb.R[i][j], rgb.G[i][j], rgb.B[i][j]], yellow);
});
test('negativo duas vezes volta ao original', () => {
  const m = art.grays[0].m;
  assert.deepStrictEqual(L.negative(L.negative(m)), m);
  assert.strictEqual(L.negative([[0, 255, 80]])[0].join(), '255,0,175');
});
test('negativo RGBA por canal', () => {
  const src = new Uint8ClampedArray([10, 20, 30, 255]);
  assert.deepStrictEqual([...L.invertRGBA(src, { R: true, G: false, B: true })], [245, 20, 225, 255]);
});

console.log('Filtros');
const flat = Mx.make(6, 7, 100);
const byId = (id) => L.KERNELS.find((k) => k.id === id);
test('identidade não muda a imagem', () => {
  const g = art.quadrado, k = byId('identidade');
  assert.deepStrictEqual(L.convolveGrid(g, k.k, k.div, k.off), g);
});
test('desfoque mantém imagem uniforme e bordas dão zero', () => {
  const d = byId('desfoque'), b = byId('bordas');
  assert.deepStrictEqual(L.convolveGrid(flat, d.k, d.div, d.off), flat);
  assert.ok(L.convolveGrid(flat, b.k, b.div, b.off).every((r) => r.every((v) => v === 0)));
});
test('bordas destacam o contorno do quadrado', () => {
  const b = byId('bordas');
  const out = L.convolveGrid(art.quadrado, b.k, b.div, b.off);
  assert.ok(out[3][3] > 100 || out[2][2] > 100);       // canto/contorno interno acende
  assert.strictEqual(out[4][4], 0 + out[4][4]);        // só confere que roda
  assert.strictEqual(out[0][0], 0);
});
test('negativo como filtro (centro -1 e soma 255)', () => {
  const k = byId('negativo');
  assert.deepStrictEqual(L.convolveGrid([[0, 100, 255]], k.k, k.div, k.off), [[255, 155, 0]]);
});
test('nitidez e desfoque somam 1 (preservam o brilho)', () => {
  for (const id of ['identidade', 'desfoque', 'gauss', 'nitidez', 'relevo', 'movimento']) {
    const k = byId(id);
    assert.ok(Math.abs(Mx.sum(k.k) / k.div - 1) < 1e-9, id);
  }
  for (const id of ['bordas', 'sobelx', 'sobely']) assert.strictEqual(Mx.sum(byId(id).k), 0, id);
});
test('convolveRGBA concorda com convolveGrid em cinza', () => {
  const g = Mx.make(5, 6, (i, j) => (i * 37 + j * 91) % 256);
  const w = 6, h = 5, src = new Uint8ClampedArray(w * h * 4);
  g.forEach((row, i) => row.forEach((v, j) => { const p = (i * w + j) * 4; src[p] = src[p + 1] = src[p + 2] = v; src[p + 3] = 255; }));
  for (const k of L.KERNELS) {
    const a = L.convolveGrid(g, k.k, k.div, k.off);
    const out = L.convolveRGBA(src, w, h, k.k, k.div, k.off, false);
    for (let i = 0; i < h; i++) for (let j = 0; j < w; j++) for (let c = 0; c < 3; c++) assert.strictEqual(out[(i * w + j) * 4 + c], a[i][j], k.id);
  }
});
test('findKernel reconhece os predefinidos', () => {
  assert.strictEqual(L.findKernel([[1, 1, 1], [1, 1, 1], [1, 1, 1]], 9, 0).id, 'desfoque');
  assert.strictEqual(L.findKernel([[1, 1, 1], [1, 1, 1], [1, 1, 2]], 9, 0), undefined);
});

console.log('Xadrez');
test('tabuleiro inicial', () => {
  assert.strictEqual(L.material(L.CHESS_START), 0);
  assert.strictEqual(L.squareName(7, 4), 'e1');
  assert.strictEqual(L.squareName(0, 0), 'a8');
  assert.strictEqual(L.CHESS_START[7][4], 6);
  assert.strictEqual(L.CHESS_START[0][4], -6);
});
test('mover uma peça muda só dois elementos; capturar muda o material', () => {
  const b = L.movePiece(L.CHESS_START, [6, 4], [4, 4]);
  let diff = 0; b.forEach((r, i) => r.forEach((v, j) => { if (v !== L.CHESS_START[i][j]) diff++; }));
  assert.strictEqual(diff, 2);
  const c = L.movePiece(L.CHESS_START, [7, 3], [1, 3]);   // dama branca captura peão preto
  assert.strictEqual(L.material(c), 1);
});

console.log('Dígitos: pipeline do desenho e modelo');
const vectors = JSON.parse(fs.readFileSync(path.join(__dirname, 'pipeline_vectors.json'), 'utf8'));
test('o pipeline em JavaScript reproduz o do treino (Python)', () => {
  let worst = 0, nbad = 0;
  for (const v of vectors) {
    const r = L.strokesToGrid(v.strokes);
    let bad = 0;
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const d = Math.abs(r.grid[i][j] - v.grid[i][j]); worst = Math.max(worst, d); if (d) bad++; }
    nbad += bad;
    assert.ok(Math.abs(r.S - v.S) < 1e-6, `S difere: ${r.S} vs ${v.S}`);
  }
  console.log(`        células diferentes: ${nbad} de ${vectors.length * 64}, maior diferença ${worst}`);
  assert.ok(worst <= 1 && nbad <= 3);
});
test('desenho vazio devolve matriz de zeros', () => {
  const r = L.strokesToGrid([]);
  assert.ok(r.empty && Mx.sum(r.grid) === 0);
});
test('a quantidade de pixels acesos fica perto do alvo', () => {
  for (const v of vectors) { const r = L.strokesToGrid(v.strokes); assert.ok(r.ink > 220 && r.ink < 400, `tinta ${r.ink}`); }
});
const model = load('model.js').DIGITS_MODEL;
test('modelo tem W 10x64 e acerta os exemplos reais', () => {
  assert.strictEqual(model.W.length, 10); assert.ok(model.W.every((r) => r.length === 64));
  for (const e of model.examples) assert.strictEqual(L.predictDigit(model, e.x).best, e.d);
  assert.strictEqual(model.examples.length, 30);
});
test('exemplos difíceis são mesmo errados e a probabilidade soma 1', () => {
  for (const e of model.hard) { const p = L.predictDigit(model, e.x); assert.notStrictEqual(p.best, e.d); assert.strictEqual(p.best, e.p); assert.ok(Math.abs(p.probs.reduce((a, b) => a + b) - 1) < 1e-9); }
});
test('reconhece dígitos desenhados (traços simulados)', () => {
  let ok = 0;
  for (const v of vectors) if (L.predictDigit(model, L.strokesToGrid(v.strokes).grid).best === v.digit) ok++;
  console.log(`        acertos: ${ok} de ${vectors.length}`);
  assert.ok(ok >= vectors.length - 2);
});
test('contribuições somam a nota (menos o viés)', () => {
  const e = model.examples[7], d = 3;
  const c = Mx.sum(L.digitContribution(model, d, e.x));
  assert.ok(Math.abs(c + model.b[d] - L.digitScores(model, e.x)[d]) < 1e-9);
});

console.log(`\n${passed} testes passaram, ${failed} falharam`);
process.exit(failed ? 1 : 0);
