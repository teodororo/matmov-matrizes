"""Treina o mini-reconhecedor de dígitos (regressão logística = uma matriz W 10x64)
e exporta src/model.js e tests/pipeline_vectors.json.

Uso:  python3 tools/train_digits.py
Dados: conjunto "Optical Recognition of Handwritten Digits" (UCI; Alpaydin & Kaynak), via scikit-learn.
"""
import json, os, warnings
import numpy as np
from sklearn.datasets import load_digits
from sklearn.linear_model import LogisticRegression
from digit_synth import make_sample_adaptive, skeleton, jitter, strokes_to_grid_adaptive

warnings.filterwarnings("ignore")
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

d = load_digits()
X = d.data.astype(np.float64)
y = d.target
test_mask = np.arange(len(X)) % 4 == 0          # mesmo critério usado no site
Xtr, ytr, Xte, yte = X[~test_mask], y[~test_mask], X[test_mask], y[test_mask]


def synth_set(n_per, seed, **kw):
    rng = np.random.default_rng(seed)
    xs, ys = [], []
    for c in range(10):
        for _ in range(n_per):
            xs.append(make_sample_adaptive(c, rng, **kw).reshape(-1))
            ys.append(c)
    return np.array(xs, dtype=np.float64), np.array(ys)


print("gerando dígitos desenhados...")
S1, s1 = synth_set(200, 17)
S2, s2 = synth_set(200, 18, noise=0.04, rot=20, shear=0.35, sx=(0.6, 1.3))
Xa = np.vstack([Xtr, S1, S2]); ya = np.concatenate([ytr, s1, s2])

print("treinando...")
model = LogisticRegression(C=1.0, max_iter=4000).fit(Xa / 16.0, ya)
W = np.round(model.coef_, 3)
b = np.round(model.intercept_, 3)


def predict(x):
    z = (x / 16.0) @ W.T + b
    return z.argmax(axis=1)


acc_real = float((predict(Xte) == yte).mean())
Xh, yh = synth_set(100, 999, noise=0.04, rot=20, shear=0.35, sx=(0.6, 1.3))
acc_hard = float((predict(Xh) == yh).mean())
print(f"acerto nos dígitos reais de teste: {acc_real:.3f}   em desenhos simulados: {acc_hard:.3f}")

# exemplos reais (do conjunto de teste) que o modelo acerta: 3 por dígito; e 2 que ele erra
rng = np.random.default_rng(4)
pred_te = predict(Xte)
examples = []
for c in range(10):
    ok = np.where((yte == c) & (pred_te == c))[0]
    pick = rng.choice(ok, size=3, replace=False)
    for i in pick:
        examples.append({"d": int(c), "x": [int(v) for v in Xte[i]]})
wrong = np.where(pred_te != yte)[0]
hard = []
for i in rng.choice(wrong, size=min(3, len(wrong)), replace=False):
    hard.append({"d": int(yte[i]), "p": int(pred_te[i]), "x": [int(v) for v in Xte[i]]})

out = {
    "W": W.tolist(), "b": b.tolist(),
    "examples": examples, "hard": hard,
    "accReal": round(acc_real, 3), "accDrawn": round(acc_hard, 3),
    "nReal": int(len(Xtr)), "nSynth": int(len(S1) + len(S2)), "nTest": int(len(Xte)),
}
js = "/* Gerado por tools/train_digits.py - não editar à mão. */\nwindow.DIGITS_MODEL = " + json.dumps(out, separators=(",", ":")) + ";\n"
open(os.path.join(ROOT, "src", "model.js"), "w").write(js)
print("src/model.js:", len(js), "bytes")

# vetores de teste para conferir o pipeline em JavaScript
vrng = np.random.default_rng(2026)
vectors = []
for c in list(range(10)) + [1, 7, 4]:
    st = jitter(skeleton(c, vrng), vrng)
    pix = [(s * 190 + 33).round(2) for s in st]            # coordenadas parecidas com as de um canvas 256x256
    bmp, g, S = strokes_to_grid_adaptive(pix, target=310)
    vectors.append({"digit": c, "strokes": [p.tolist() for p in pix], "grid": g.tolist(), "S": S, "ink": int(bmp.sum())})
json.dump(vectors, open(os.path.join(ROOT, "tests", "pipeline_vectors.json"), "w"))
print("tests/pipeline_vectors.json:", len(vectors), "vetores")
