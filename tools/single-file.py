#!/usr/bin/env python3
"""Gera a versão de arquivo único do LuminSDK.

Pega no index.html do site e "cola" dentro dele o CSS, os scripts e o ícone,
produzindo um único .html que funciona sozinho em qualquer lugar
(CodePen, Gist, uma pasta qualquer, até anexo de e-mail).

Uso:
    python3 tools/single-file.py              # gera single/index.html
    python3 tools/single-file.py --out /tmp/x.html
    python3 tools/single-file.py --root . --quiet

Sem dependências: só a biblioteca padrão.
"""

from __future__ import annotations

import argparse
import base64
import re
import sys
from pathlib import Path

BANNER = """<!--
  LuminSDK — versão de arquivo único (HTML + CSS + JS juntos).

  Gerado automaticamente por tools/single-file.py a partir do site oficial.
  Não edite este arquivo à mão: rode o gerador de novo depois de mexer no site.

  Código-fonte: https://github.com/SuckingUpToesSry/LuminSDK
  Licença: MIT · criado por Ryan Smith
-->"""

# arquivos que entram no HTML, na ordem em que aparecem no index.html
STYLES = ["assets/css/styles.css"]
SCRIPTS = [
    "assets/js/library.js",
    "assets/js/settings.js",
    "assets/js/progress.js",
    "assets/js/site.js",
    "assets/js/atmosphere.js",
    "assets/js/bonus.js",
]

# tags de <head> que não fazem sentido num arquivo solto (apontariam para 404)
DROP_TAGS = [
    r'[ \t]*<link rel="manifest"[^>]*>\r?\n',
    r'[ \t]*<link rel="apple-touch-icon"[^>]*>\r?\n',
]

SW_GUARD_FROM = "    if (!('serviceWorker' in navigator)) return;"
SW_GUARD_TO = "    if (window.__LUMIN_SINGLE__ || !('serviceWorker' in navigator)) return;"


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def inline_css(html: str, root: Path) -> tuple[str, list[str]]:
    inlined: list[str] = []

    def repl(match: re.Match[str]) -> str:
        href = match.group(1)
        path = root / href.split("?")[0]
        if not href.startswith("assets/") or not path.is_file():
            return match.group(0)
        css = read_text(path).strip("\n")
        inlined.append(href)
        return f"  <!-- {href} -->\n  <style>\n{css}\n  </style>"

    html = re.sub(
        r'[ \t]*<link rel="stylesheet" href="([^"]+)">',
        repl,
        html,
    )
    return html, inlined


def inline_scripts(html: str, root: Path) -> tuple[str, list[str]]:
    inlined: list[str] = []
    blocks: list[str] = []

    for rel in SCRIPTS:
        path = root / rel
        if not path.is_file():
            raise SystemExit(f"erro: {rel} não encontrado")
        code = read_text(path).strip("\n")
        if "</script" in code.lower():
            raise SystemExit(f"erro: {rel} contém a string </script e não pode ser embutido")
        code = code.replace(SW_GUARD_FROM, SW_GUARD_TO)
        inlined.append(rel)
        blocks.append(f"/* ==================== {rel} ==================== */\n{code}")

    # remove as tags <script src="assets/js/..."> (mantém o SDK externo)
    pattern = re.compile(r'[ \t]*<script src="(assets/js/[^"?]+)(?:\?[^"]*)?"[^>]*></script>\r?\n')

    def repl(match: re.Match[str]) -> str:
        # o bloco único entra no lugar do primeiro script local
        if not blocks:
            return ""
        joined = "\n\n".join(blocks) + "\n"
        blocks.clear()
        return (
            "  <!-- CSS e JS do site embutidos por tools/single-file.py -->\n"
            "  <script>\n"
            "  window.__LUMIN_SINGLE__ = true;\n"
            f"{joined}"
            "  </script>\n"
        )

    html, count = pattern.subn(repl, html)
    if count == 0:
        raise SystemExit("erro: nenhuma tag <script src=\"assets/js/...\"> encontrada no index.html")
    return html, inlined


def inline_icon(html: str, root: Path) -> tuple[str, bool]:
    icon = root / "assets/img/favicon.svg"
    if not icon.is_file():
        return html, False
    data = base64.b64encode(icon.read_bytes()).decode("ascii")
    uri = f"data:image/svg+xml;base64,{data}"
    html = re.sub(
        r'<link rel="icon" href="[^"]*"',
        f'<link rel="icon" href="{uri}"',
        html,
    )
    html = re.sub(
        r'<link rel="mask-icon" href="[^"]*"',
        f'<link rel="mask-icon" href="{uri}"',
        html,
    )
    return html, True


def build(root: Path) -> tuple[str, dict[str, object]]:
    index = root / "index.html"
    if not index.is_file():
        raise SystemExit(f"erro: {index} não encontrado (rode dentro do repositório do site)")

    html = read_text(index)
    html, css_files = inline_css(html, root)
    html, js_files = inline_scripts(html, root)

    for pattern in DROP_TAGS:
        html = re.sub(pattern, "", html)

    html, icon_ok = inline_icon(html, root)

    # arquivo solto não tem a pasta gn/ ao lado: aponta para a versão publicada */
    html = html.replace('href="gn/index.html"', 'href="https://suckinguptoessry.github.io/LuminSDK/gn/"')

    html = html.replace("<!DOCTYPE html>", "<!DOCTYPE html>\n" + BANNER, 1)
    html = html.replace(
        '<meta name="author" content="Ryan Smith">',
        '<meta name="author" content="Ryan Smith">\n'
        '  <meta name="generator" content="tools/single-file.py">',
        1,
    )

    info = {"css": css_files, "js": js_files, "icon": icon_ok}
    return html, info


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Gera a versão de arquivo único do LuminSDK.")
    parser.add_argument("--root", default=".", help="raiz do site (padrão: pasta atual)")
    parser.add_argument("--out", default="single/index.html", help="arquivo de saída")
    parser.add_argument("--quiet", action="store_true", help="não imprime o resumo")
    args = parser.parse_args(argv)

    root = Path(args.root).resolve()
    html, info = build(root)

    out = Path(args.out)
    if not out.is_absolute():
        out = root / out
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")

    if not args.quiet:
        size = out.stat().st_size
        print(f"arquivo único gerado: {out}")
        print(f"  tamanho: {size / 1024:.0f} KB · {html.count(chr(10)) + 1} linhas")
        print(f"  CSS embutido: {', '.join(info['css']) or 'nenhum'}")
        print(f"  JS embutido: {', '.join(info['js'])}")
        print(f"  ícone embutido: {'sim' if info['icon'] else 'não'}")
        print("  externo: apenas o script do LuminSDK (CDN) e as fontes do Google")
    return 0


if __name__ == "__main__":
    sys.exit(main())
