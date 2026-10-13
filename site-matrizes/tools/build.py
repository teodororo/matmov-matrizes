#!/usr/bin/env python3
"""Monta dist/index.html: um arquivo único com CSS, JavaScript e fontes embutidos.

Uso:  python3 tools/build.py
Não precisa de nenhuma biblioteca além do Python 3.
"""
import base64
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
FONTS = ROOT / "tools" / "fonts"
DIST = ROOT / "dist"

# (arquivo, família, peso, estilo)
FONT_FILES = [
    ("atkinson-hyperlegible-next-latin-400-normal.woff2", "Atkinson", 400, "normal"),
    ("atkinson-hyperlegible-next-latin-700-normal.woff2", "Atkinson", 700, "normal"),
    ("atkinson-hyperlegible-next-latin-400-italic.woff2", "Atkinson", 400, "italic"),
    ("atkinson-hyperlegible-mono-latin-500-normal.woff2", "Atkinson Mono", 500, "normal"),
    ("atkinson-hyperlegible-mono-latin-700-normal.woff2", "Atkinson Mono", 700, "normal"),
]
EXTRA_FONTS = [
    # peças de xadrez (subconjunto), se existir
    ("chess-pieces.woff2", "Pecas", 400, "normal"),
]

CSS_FILES = ["base.css", "components.css", "sections.css"]
JS_FILES = [
    "model.js", "art.js", "js/logic.js", "js/ui.js", "js/widgets.js", "js/hero.js",
    "js/s1.js", "js/s2.js", "js/s3.js", "js/s4.js", "js/s5.js", "js/main.js",
]


def font_face_css():
    out = []
    for name, fam, weight, style in FONT_FILES + EXTRA_FONTS:
        p = FONTS / name
        if not p.exists():
            if (name, fam, weight, style) in EXTRA_FONTS:
                continue
            sys.exit(f"fonte não encontrada: {p}")
        b64 = base64.b64encode(p.read_bytes()).decode("ascii")
        out.append(
            "@font-face{font-family:'%s';font-style:%s;font-weight:%d;font-display:swap;"
            "src:url(data:font/woff2;base64,%s) format('woff2');}" % (fam, style, weight, b64)
        )
    return "\n".join(out)


def read(path):
    return (SRC / path).read_text(encoding="utf-8")


def main():
    tpl = read("index.template.html")

    # seções (HTML)
    for n in range(1, 6):
        p = SRC / "html" / f"s{n}.html"
        html = p.read_text(encoding="utf-8") if p.exists() else (
            f'<section class="panel" id="secao-{n}" role="tabpanel" aria-labelledby="tab-{n}" tabindex="-1">'
            f'<div class="wrap"><article class="sheet"><h2>Seção {n}</h2><p>Em construção.</p></article></div></section>'
        )
        tpl = tpl.replace(f"<!--{{{{SECTION:{n}}}}}-->", html)

    css = "\n".join(read("css/" + f) for f in CSS_FILES)
    tpl = tpl.replace("/*{{FONTS}}*/", font_face_css()).replace("/*{{CSS}}*/", css)

    scripts = []
    for f in JS_FILES:
        p = SRC / f
        if not p.exists():
            print("aviso: arquivo ausente:", f)
            continue
        code = p.read_text(encoding="utf-8")
        if "</script" in code.lower():
            sys.exit(f"{f} contém '</script'")
        scripts.append(f"<script>\n{code}\n</script>")
    tpl = tpl.replace("<!--{{SCRIPTS}}-->", "\n".join(scripts))

    left = re.findall(r"\{\{[A-Z:0-9]+\}\}", tpl)
    if left:
        sys.exit("marcadores sem substituir: %s" % left)

    DIST.mkdir(exist_ok=True)
    out = DIST / "index.html"
    out.write_text(tpl, encoding="utf-8")
    print("ok: %s (%.0f KB)" % (out, out.stat().st_size / 1024))


if __name__ == "__main__":
    main()
