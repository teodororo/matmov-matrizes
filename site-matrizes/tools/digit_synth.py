"""Geração de dígitos desenhados (traços) para treinar o mini-reconhecedor.

Os traços são normalizados do mesmo jeito que o site faz no navegador:
bounding box -> altura 32 px, espessura ajustada para ~310 pixels acesos,
32x32 -> blocos 4x4 -> matriz 8x8 com valores de 0 a 16.
"""
import numpy as np

S_DEFAULT = 3.6

def arc(cx, cy, rx, ry, a0, a1, n=28):
    t = np.radians(np.linspace(a0, a1, n))
    return np.stack([cx + rx*np.cos(t), cy + ry*np.sin(t)], axis=1)

def skeleton(d, rng):
    r = lambda a=0.04: rng.normal(0, a)
    if d == 0:
        s = -90 + rng.uniform(-25, 25)
        return [arc(0.5, 0.5, 0.36+r(), 0.5, s, s + 360 + rng.uniform(-10, 30))]
    if d == 1:
        x0 = 0.5 + r(0.06); x1 = 0.5 + r(0.06)
        strokes = [np.array([[x0, 0.0], [x1, 1.0]])]
        if rng.random() < 0.8:
            strokes.append(np.array([[x0 - 0.28 + r(), 0.22 + r()], [x0, 0.0]]))
        if rng.random() < 0.25:
            strokes.append(np.array([[x1 - 0.3, 1.0], [x1 + 0.3, 1.0]]))
        return strokes
    if d == 2:
        top = arc(0.5, 0.28, 0.38, 0.28 + r(0.03), 180 + rng.uniform(-15, 10), 400 + rng.uniform(-20, 20))
        return [np.vstack([top, [[0.1 + r(), 1.0]], [[0.93 + r(0.03), 1.0]]])]
    if d == 3:
        up = arc(0.45, 0.26, 0.33, 0.26, 200 + rng.uniform(-15, 15), 450)
        lo = arc(0.45, 0.74, 0.38 + r(0.03), 0.26, 270, 520 + rng.uniform(-15, 15))
        return [np.vstack([up, lo])]
    if d == 4:
        a = np.array([[0.72 + r(), 0.0], [0.08 + r(), 0.68 + r()], [0.95, 0.68 + r()]])
        b = np.array([[0.7 + r(), 0.15 + r(0.08)], [0.7 + r(), 1.0]])
        if rng.random() < 0.3:  # open top 4
            a = np.array([[0.2 + r(), 0.0], [0.08, 0.68], [0.95, 0.68]])
            b = np.array([[0.75, 0.0], [0.72, 1.0]])
        return [a, b]
    if d == 5:
        bowl = arc(0.48, 0.70, 0.38, 0.3, 250 + rng.uniform(-15, 15), 510 + rng.uniform(-10, 20))
        head = np.array([[0.85 + r(), 0.02], [0.25 + r(), 0.02], [0.2 + r(), 0.46]])
        return [np.vstack([head, bowl])]
    if d == 6:
        tail = np.array([[0.8 + r(), 0.02], [0.55, 0.12], [0.3 + r(), 0.4], [0.15 + r(), 0.7]])
        bowl = arc(0.5, 0.7, 0.36, 0.3, 180, 540 + rng.uniform(-10, 20))
        return [np.vstack([tail, bowl])]
    if d == 7:
        s = [np.array([[0.08 + r(), 0.02], [0.92 + r(), 0.02], [0.42 + r(), 1.0]])]
        if rng.random() < 0.25:
            s.append(np.array([[0.3, 0.5], [0.72, 0.5]]))
        return s
    if d == 8:
        l1 = arc(0.5, 0.26, 0.28, 0.24, 90, 450)
        l2 = arc(0.5, 0.74, 0.33, 0.26, 270, 630)
        if rng.random() < 0.5:
            return [np.vstack([l1, l2])]
        return [l1, l2]
    if d == 9:
        loop = arc(0.5, 0.28, 0.32, 0.26, 0, 360)
        tail = np.array([[0.82 + r(), 0.28], [0.74 + r(), 0.65], [0.55 + r(), 1.0]])
        return [loop, tail]

def jitter(strokes, rng, noise=0.025, rot=12, shear=0.2, sx=(0.7, 1.2)):
    ang = np.radians(rng.uniform(-rot, rot)); sh = rng.uniform(-shear, shear)
    ax = rng.uniform(*sx)
    c, s = np.cos(ang), np.sin(ang)
    out = []
    for st in strokes:
        p = st + rng.normal(0, noise, st.shape)
        p = p - 0.5
        p[:, 0] += sh * p[:, 1]
        p = p @ np.array([[c, s], [-s, c]])
        p[:, 0] *= ax
        out.append(p)
    return out

def seg_dist(P, A, B):
    # P: (N,2) points; A,B: (M,2) segment ends -> min distance for each P
    AB = B - A
    L2 = (AB**2).sum(1)
    L2[L2 == 0] = 1e-9
    d_all = np.full(len(P), 1e9)
    # chunk over segments
    for k in range(len(A)):
        t = np.clip(((P - A[k]) @ AB[k]) / L2[k], 0, 1)
        proj = A[k] + t[:, None] * AB[k]
        d = np.sqrt(((P - proj)**2).sum(1))
        d_all = np.minimum(d_all, d)
    return d_all

_pix = np.stack(np.meshgrid(np.arange(32) + 0.5, np.arange(32) + 0.5), axis=-1).reshape(-1, 2)  # (x,y)

def strokes_to_grid(strokes, S=S_DEFAULT, size=32):
    pts = np.vstack(strokes)
    mn, mx = pts.min(0), pts.max(0)
    w, h = mx - mn
    avail = size - S
    scale = avail / max(h, w, 1e-6)
    c = (mn + mx) / 2
    A = []; B = []
    for st in strokes:
        q = (st - c) * scale + size / 2
        if len(q) == 1:
            q = np.vstack([q, q])
        A.append(q[:-1]); B.append(q[1:])
    A = np.vstack(A); B = np.vstack(B)
    d = seg_dist(_pix, A, B)
    bmp = (d <= S / 2).reshape(size, size).astype(np.int32)
    g = bmp.reshape(8, 4, 8, 4).sum(axis=(1, 3))
    return bmp, g

def make_sample(d, rng, S_range=(3.0, 4.6), **kw):
    st = jitter(skeleton(d, rng), rng, **kw)
    S = rng.uniform(*S_range)
    return strokes_to_grid(st, S)[1]



def raster(strokes_n, S, size=32):
    A = []; B = []
    for q in strokes_n:
        if len(q) == 1:
            q = np.vstack([q, q])
        A.append(q[:-1]); B.append(q[1:])
    A = np.vstack(A); B = np.vstack(B)
    d = seg_dist(_pix, A, B)
    return (d <= S / 2).reshape(size, size).astype(np.int32)

def normalize_pts(strokes, S, size=32):
    pts = np.vstack(strokes)
    mn, mx = pts.min(0), pts.max(0)
    w, h = mx - mn
    avail = size - S
    scale = avail / max(h, w, 1e-6)
    c = (mn + mx) / 2
    return [(st - c) * scale + size / 2 for st in strokes]

def strokes_to_grid_adaptive(strokes, target=310, smin=2.8, smax=10.0, iters=5, size=32):
    S = 4.0
    for _ in range(iters):
        bmp = raster(normalize_pts(strokes, S, size), S, size)
        ink = max(int(bmp.sum()), 1)
        S = float(np.clip(S * (target / ink) ** 0.85, smin, smax))
    bmp = raster(normalize_pts(strokes, S, size), S, size)
    g = bmp.reshape(8, 4, 8, 4).sum(axis=(1, 3))
    return bmp, g, S

def make_sample_adaptive(d, rng, target=310, **kw):
    st = jitter(skeleton(d, rng), rng, **kw)
    t = target * rng.uniform(0.85, 1.15)
    return strokes_to_grid_adaptive(st, target=t)[1]
