"""Define as imagens pixeladas do site, confere simetrias e gera src/art.js (+ pré-visualização PNG)."""
import json, os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

# ---------- preto e branco (# = 1 = branco, . = 0 = preto) ----------
BITS = [
 ("casa", "Casinha", [
  ". . . . . # . .",
  ". . . . . # . .",
  ". . # # # # . .",
  ". # # # # # # .",
  "# # # # # # # #",
  ". # # # # # # .",
  ". # . . # . # .",
  ". # . . # # # ."]),
 ("letraF", "Letra F", [
  "# # # # # # # .",
  "# # # # # # # .",
  "# # . . . . . .",
  "# # . . . . . .",
  "# # # # # . . .",
  "# # # # # . . .",
  "# # . . . . . .",
  "# # . . . . . ."]),
 ("cursor", "Cursor do mouse", [
  "# . . . . . . .",
  "# # . . . . . .",
  "# # # . . . . .",
  "# # # # . . . .",
  "# # # # # . . .",
  "# # # . . . . .",
  "# . # # . . . .",
  ". . # # . . . ."]),
 ("carinha", "Carinha piscando", [
  ". . # # # # . .",
  ". # # # # # # .",
  "# # . # # . . #",
  "# # # # # # # #",
  "# # . # # . # #",
  "# # # . . # # #",
  ". # # # # # # .",
  ". . # # # # . ."]),
 ("letraR", "Letra R (7 × 5)", [
  "# # # # .",
  "# . . . #",
  "# . . . #",
  "# # # # .",
  "# . # . .",
  "# . . # .",
  "# . . . #"]),
]

# ---------- coloridas (paleta de caracteres -> RGB) ----------
COLORS = [
 ("arco", "Arco-íris", {
   "S": (90, 150, 250), "R": (240, 50, 60), "Y": (255, 214, 40), "G": (50, 190, 90), "W": (255, 255, 255)},
  ["S S S S S S S S",
   "S S R R R R S S",
   "S R Y Y Y Y R S",
   "R Y G G G G Y R",
   "R Y G S S G Y R",
   "R Y G S S G Y R",
   "W W G S S G W W",
   "W W W S S W W W"]),
 ("morango", "Morango", {
   ".": (60, 64, 120), "G": (50, 190, 90), "R": (230, 40, 60), "Y": (255, 224, 90), "W": (255, 190, 200)},
  [". . G G G G . .",
   ". G . G G . G .",
   ". R R R R R R .",
   "R R Y R R Y R R",
   "R W R R Y R R R",
   ". R R Y R R Y .",
   ". . R R R Y . .",
   ". . . R R . . ."]),
 ("sol", "Pôr do sol", {
   "1": (40, 30, 100), "2": (110, 50, 140), "3": (235, 100, 90), "4": (255, 165, 70), "Y": (255, 224, 80),
   "a": (24, 64, 150), "b": (16, 48, 120), "c": (12, 36, 96), "O": (255, 150, 60)},
  ["1 1 1 1 1 1 1 1",
   "2 2 2 2 2 2 2 2",
   "3 3 3 Y Y 3 3 3",
   "4 4 Y Y Y Y 4 4",
   "a a a Y Y a a a",
   "b b O O O b b b",
   "c c c O c c c c",
   "c c c c c c c c"]),
]

# ---------- tons de cinza (caractere -> 0..255) ----------
GRAYS = [
 ("lua", "Lua", {".": 20, "a": 235, "b": 170, "s": 205},
  [". . . a a a . s",
   ". . a a b . . .",
   ". a a b . . . .",
   ". a a b . . . s",
   ". a a b . . . .",
   ". a a a b . . .",
   ". . a a a b . .",
   "s . . a a a . ."]),
 ("carinha", "Carinha", {".": 30, "f": 215, "e": 45, "c": 150},
  [". . f f f f . .",
   ". f f f f f f .",
   "f f e f f e f f",
   "f f e f f e f f",
   "f c f f f f c f",
   "f f e f f e f f",
   ". f f e e f f .",
   ". . f f f f . ."]),
 ("degrade", "Degradê", None, "gradient"),
]

# ---------- quadro de 8 x 8 para o 'pixel por pixel' dos filtros ----------
QUADRADO = [
 [20, 20, 20, 20, 20, 20, 20, 20],
 [20, 20, 20, 20, 20, 20, 20, 20],
 [20, 20, 230, 230, 230, 230, 20, 20],
 [20, 20, 230, 230, 230, 230, 20, 20],
 [20, 20, 230, 230, 230, 230, 20, 20],
 [20, 20, 230, 230, 230, 230, 20, 20],
 [20, 20, 20, 20, 20, 20, 20, 20],
 [20, 20, 20, 20, 20, 20, 20, 20]]


def parse(rows):
    return [r.split() for r in rows]


def bits_matrix(rows):
    return np.array([[1 if c == "#" else 0 for c in r] for r in parse(rows)], dtype=int)


def sym_report(m):
    forms = {
        "id": m, "flipH": m[:, ::-1], "flipV": m[::-1, :], "rot180": m[::-1, ::-1],
        "T": m.T, "antiT": m[::-1, ::-1].T, "rotCW": m.T[:, ::-1], "rotCCW": m.T[::-1, :],
    }
    keys = {k: v.tobytes() + bytes(v.shape) for k, v in forms.items()}
    same = []
    names = list(forms)
    for i, a in enumerate(names):
        for b in names[i + 1:]:
            if keys[a] == keys[b]:
                same.append((a, b))
    return same


out = {"bits": [], "colors": [], "grays": [], "quadrado": QUADRADO}
for key, name, rows in BITS:
    m = bits_matrix(rows)
    rep = sym_report(m)
    print(f"{key:10s} {m.shape}  coincidências entre transformações: {rep if rep else 'nenhuma (ok)'}")
    out["bits"].append({"id": key, "name": name, "rows": ["".join("1" if c == "#" else "0" for c in r.split()) for r in rows]})

for key, name, pal, rows in COLORS:
    for r in rows:
        for c in r.split():
            assert c in pal, (key, c)
    out["colors"].append({"id": key, "name": name, "pal": {k: list(v) for k, v in pal.items()}, "rows": ["".join(r.split()) for r in rows]})

for g in GRAYS:
    key, name = g[0], g[1]
    if g[3] == "gradient":
        m = [[round((i + j) / 14 * 255) for j in range(8)] for i in range(8)]
    else:
        pal, rows = g[2], g[3]
        m = [[pal[c] for c in r.split()] for r in rows]
    out["grays"].append({"id": key, "name": name, "m": m})

js = "/* Gerado por tools/make_art.py - não editar à mão. */\nwindow.ART = " + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n"
open(os.path.join(ROOT, "src", "art.js"), "w", encoding="utf-8").write(js)
print("src/art.js", len(js), "bytes")

# ---------- pré-visualização ----------
def tile(arr_rgb, scale=24):
    h, w, _ = arr_rgb.shape
    im = Image.fromarray(arr_rgb.astype(np.uint8)).resize((w * scale, h * scale), Image.NEAREST)
    return im

tiles = []
for e in out["bits"]:
    m = np.array([[int(c) for c in r] for r in e["rows"]])
    tiles.append(tile(np.repeat((m * 255)[:, :, None], 3, axis=2)))
for e in out["colors"]:
    m = np.array([[e["pal"][c] for c in r] for r in e["rows"]])
    tiles.append(tile(m))
for e in out["grays"]:
    m = np.array(e["m"]); tiles.append(tile(np.repeat(m[:, :, None], 3, axis=2)))
W = sum(t.width + 16 for t in tiles) + 16
H = max(t.height for t in tiles) + 32
sheet = Image.new("RGB", (W, H), (240, 244, 252))
x = 16
for t in tiles:
    sheet.paste(t, (x, 16)); x += t.width + 16
sheet.save(os.path.join(ROOT, "tools", "art_preview.png"))
print("preview", sheet.size)
