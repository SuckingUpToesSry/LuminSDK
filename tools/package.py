#!/usr/bin/env python3
"""
LuminSDK — empacotador portátil
==============================

Copia o site para uma pasta independente, reescreve os links/dados do projeto
(URL do repositório, site publicado, caminho base, autor e CDN do catálogo)
e gera um .zip pronto para colar em outro repositório.

Uso:
    python3 tools/package.py                 # usa tools/package.config.json
    python3 tools/package.py --out ..        # muda a pasta de saída
    python3 tools/package.py --no-zip        # só a pasta, sem compactar
    python3 tools/package.py --config x.json # outro arquivo de configuração

Autor: Ryan Smith · Licença MIT
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import shutil
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TOOLS = ROOT / "tools"

# Arquivos e pastas que entram no pacote (caminhos relativos à raiz do projeto)
INCLUDE_FILES = [
    "index.html",
    "404.html",
    "manifest.webmanifest",
    "sw.js",
    "robots.txt",
    "sitemap.xml",
    "CONTRIBUTING.md",
]
INCLUDE_DIRS = ["assets"]

# Extensões tratadas como texto (recebem as substituições)
TEXT_SUFFIXES = {
    ".html", ".htm", ".js", ".mjs", ".css", ".json", ".webmanifest",
    ".md", ".txt", ".xml", ".svg", ".yml", ".yaml",
}
TEXT_NAMES = {"LICENSE", ".nojekyll", ".gitignore", ".editorconfig"}

# Valores originais deste repositório → o que será substituído
DEFAULTS = {
    "author": "Ryan Smith",
    "repoUrl": "https://github.com/SuckingUpToesSry/LuminSDK",
    "siteUrl": "https://suckinguptoessry.github.io/LuminSDK/",
    "basePath": "/LuminSDK/",
    "sdkUrl": "https://cdn.jsdelivr.net/gh/luminsdk/script@latest/lumin.min.js",
    "projectName": "LuminSDK",
}

IGNORE_DIRS = {"node_modules", ".git", "export", "dist", "tools", "__pycache__"}
IGNORE_FILES = {".DS_Store", "Thumbs.db"}


# --------------------------------------------------------------------------- #
# utilidades
# --------------------------------------------------------------------------- #
def slugify(value: str) -> str:
    value = re.sub(r"[^\w\s-]", "", value, flags=re.UNICODE).strip().lower()
    return re.sub(r"[\s_-]+", "-", value) or "site"


def normalize_base(path: str) -> str:
    """Garante base começando e terminando com '/'."""
    path = (path or "/").strip()
    if not path.startswith("/"):
        path = "/" + path
    if not path.endswith("/"):
        path += "/"
    return path


def load_config(path: Path) -> dict:
    if not path.exists():
        print(f"[aviso] configuração não encontrada ({path}); usando os padrões do projeto.")
        config = dict(DEFAULTS)
    else:
        config = json.loads(path.read_text(encoding="utf-8"))

    merged = dict(DEFAULTS)
    merged.update({k: v for k, v in config.items() if v not in (None, "")})
    merged["basePath"] = normalize_base(merged.get("basePath", "/"))
    merged["packageName"] = config.get("packageName") or f"{slugify(merged['projectName'])}-portable"
    merged["language"] = config.get("language") or "pt-BR"
    return merged


def build_replacements(config: dict) -> list[tuple[str, str]]:
    """Pares (antigo, novo), do mais específico para o mais genérico."""
    pairs: list[tuple[str, str]] = []

    site_old = DEFAULTS["siteUrl"]
    site_new = config["siteUrl"]
    if site_new != site_old:
        pairs.append((site_old, site_new))

    repo_old = DEFAULTS["repoUrl"]
    repo_new = config["repoUrl"]
    if repo_new != repo_old:
        pairs.append((repo_old, repo_new))

    sdk_old = DEFAULTS["sdkUrl"]
    sdk_new = config["sdkUrl"]
    if sdk_new != sdk_old:
        pairs.append((sdk_old, sdk_new))

    base_old = DEFAULTS["basePath"]
    base_new = config["basePath"]
    if base_new != base_old:
        pairs.append((base_old, base_new))

    if config["author"] != DEFAULTS["author"]:
        pairs.append((DEFAULTS["author"], config["author"]))

    return pairs


def should_include(path: Path) -> bool:
    if path.name in IGNORE_FILES:
        return False
    return not any(part in IGNORE_DIRS for part in path.parts)


def copy_file(src: Path, dst: Path, replacements: list[tuple[str, str]]) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)

    if src.suffix.lower() in TEXT_SUFFIXES or src.name in TEXT_NAMES:
        text = src.read_text(encoding="utf-8")
        for old, new in replacements:
            text = text.replace(old, new)
        dst.write_text(text, encoding="utf-8")
    else:
        shutil.copy2(src, dst)


def iter_sources() -> list[Path]:
    files: list[Path] = []

    for name in INCLUDE_FILES:
        candidate = ROOT / name
        if candidate.exists() and candidate.is_file():
            files.append(candidate)

    for folder in INCLUDE_DIRS:
        base = ROOT / folder
        if not base.exists():
            continue
        for path in sorted(base.rglob("*")):
            if path.is_file() and should_include(path):
                files.append(path)

    if not files:
        sys.exit("Nada para empacotar — verifique se você está na raiz do projeto.")

    return files


# --------------------------------------------------------------------------- #
# documentos gerados
# --------------------------------------------------------------------------- #
def readme_text(config: dict, when: str) -> str:
    project = config["projectName"]
    author = config["author"]
    repo = config["repoUrl"]
    site = config["siteUrl"]
    base = config["basePath"]
    sdk = config["sdkUrl"]

    return f"""<div align="center">

<img src="assets/img/banner.jpg" alt="{project} — jogos no navegador" width="100%">

# {project}

**Mais de 1.100 jogos para jogar direto no navegador — HTML, CSS e JavaScript puro, sem build.**

[![Licença](https://img.shields.io/badge/licen%C3%A7a-MIT-8b5cf6?style=flat-square)](LICENSE)
[![Sem dependências](https://img.shields.io/badge/depend%C3%AAncias-zero-22d3ee?style=flat-square)](.)
[![PWA](https://img.shields.io/badge/PWA-instal%C3%A1vel-34d399?style=flat-square)](manifest.webmanifest)

</div>

---

## O que é este pacote

Esta pasta é o **site completo e independente**, pronto para colar em qualquer repositório.
Nada aqui depende do repositório original: são arquivos estáticos que funcionam em qualquer
hospedagem (GitHub Pages, Netlify, Vercel, Cloudflare Pages, um servidor Apache, um bucket S3…).

| Item | Valor |
|---|---|
| Projeto | `{project}` |
| Autor | {author} |
| Repositório | {repo} |
| Site publicado | {site} |
| Caminho base | `{base}` |
| Catálogo de jogos | `LuminSDK` — `{sdk}` |
| Licença | MIT |
| Gerado em | {when} |

## Como usar em outro repositório

### Opção 1 — o repositório inteiro é o site

```bash
# copie o conteúdo desta pasta para a raiz do novo repositório
cp -r . /caminho/do/novo-repo/
cd /caminho/do/novo-repo
python3 -m http.server 8080
```

Depois ative o **GitHub Pages**: *Settings → Pages → Deploy from a branch → `main` / root*.

### Opção 2 — o site fica em uma subpasta

Mova o conteúdo para, por exemplo, `site/` e publique em `/site/`.
Nesse caso ajuste o `basePath` no seu `tools/package.config.json` antes de empacotar
(ou edite à mão os caminhos absolutos de `404.html`).

### Opção 3 — dentro de um projeto que já existe

Basta copiar `index.html`, `assets/`, `manifest.webmanifest`, `sw.js` e as imagens.
Se já existir um `index.html`, renomeie o seu e ajuste os links do menu.
Cuidado apenas com o service worker: registre-o apenas se puder publicar na raiz do site.

## O que trocar antes de publicar

1. **Links do GitHub e do site** — aparecem em `index.html` (menu, seção open-source e rodapé),
   `404.html`, `README`, `robots.txt`, `sitemap.xml` e `manifest.webmanifest`.
   O jeito fácil é regenerar o pacote com os seus dados:

   ```bash
   # no repositório original
   python3 tools/package.py --config tools/package.config.json
   ```

2. **Nome e textos** — `index.html` (hero, cards de informação, FAQ) e a marca em
   `assets/img/favicon.svg` + ícones do PWA.
3. **Cores** — todas em variáveis CSS no topo de `assets/css/styles.css`; em tempo de execução,
   o botão **Cor** do site reescreve a paleta inteira.
4. **Jogos por página e tamanho dos cards** — `CONFIG` em `assets/js/library.js`.
5. **Catálogo de jogos** — o site usa a API pública do LuminSDK (`Lumin.init`, `getGames`,
   `getImageUrl`, `getGameUrl`) em `assets/js/library.js`. Para trocar de provedor, mantenha
   essa mesma interface ou adapte as chamadas nesse arquivo.

## Estrutura

```text
.
├── index.html                  # Página única: hero, informações, biblioteca, FAQ, open-source
├── 404.html                    # Página de erro personalizada
├── assets/
│   ├── css/styles.css          # Design system, temas, componentes e modos de desempenho
│   ├── js/
│   │   ├── library.js          # Biblioteca: busca, categorias, favoritos, saves, player
│   │   ├── settings.js         # Preferências, perfis de desempenho e backup
│   │   ├── site.js             # Tema, animações, atalhos, PWA, cópia de snippet
│   │   └── atmosphere.js       # Paleta, partículas, parallax, cursor, grade
│   └── img/                    # Logo, ícones do PWA e banner social
├── manifest.webmanifest        # Instalação como aplicativo
├── sw.js                       # Service worker (casca offline)
├── robots.txt · sitemap.xml    # SEO
├── LICENSE                     # MIT — mantenha os créditos
└── .nojekyll                   # Evita o processamento do Jekyll no GitHub Pages
```

## Recursos

- Catálogo com **busca**, categorias, ordenação, paginação e **jogo aleatório**
- **Favoritos**, **histórico** (“continuar jogando”), **saves** (plays, tempo, nota, pontuação)
- **Player próprio** em tela cheia, com atalhos, retry, compartilhar e **cor por jogo**
- **Grade configurável**: colunas, linhas e tamanho dos cards (P/M/G)
- **Paleta de cores** global em tempo real (12 presets + seletor + matiz)
- **Atmosfera**: partículas em canvas, fundo com parallax e cursor personalizado
- **Configurações**: desligue partículas/parallax/cursor/animações/desfoques/hover; modos
  automático, leve e completo; backup exportar/importar; apagar dados
- **PWA** instalável com service worker
- Acessível (teclado, foco visível, `aria-live`), responsivo e sem dependências

## Atalhos

| Tecla | Ação |
|---|---|
| `/` ou `Ctrl`+`K` | Buscar |
| `R` | Jogo aleatório (ou reiniciar, com o jogo aberto) |
| `F` | Tela cheia |
| `S` | Salvar progresso |
| `N` | Outro jogo aleatório |
| `?` | Configurações |
| `Esc` | Fechar |

## Publicando

| Hospedagem | Como |
|---|---|
| **GitHub Pages** | suba os arquivos e ative em *Settings → Pages* |
| **Netlify / Vercel / Cloudflare Pages** | publique a pasta como site estático (sem comando de build) |
| **Servidor próprio** | copie para o `public_html` (não precisa de PHP, Node ou banco) |

> O service worker só funciona em **HTTPS** ou `localhost`. Em `http://` comum, o site continua
> funcionando normalmente, apenas sem o modo offline.

## O que é salvo (e o que não é)

Tudo fica no `localStorage` do visitante: tema, cor, grade, favoritos, histórico, saves e cores
por jogo. Não há servidor, conta nem coleta de dados.

O jogo roda em um `<iframe>` de outro domínio — o navegador **impede** ler ou gravar o estado
interno dele. Por isso o site guarda o que controla (histórico, tempo, anotações, pontuação);
o progresso dentro do jogo é responsabilidade do próprio jogo.

## Créditos e licença

- Código sob **MIT** — use, copie, modifique e publique mantendo o aviso de copyright.
- Criado por **{author}**. Mantenha o crédito no rodapé (e no `LICENSE`).
- Catálogo, API e player dos jogos por **[LuminSDK](https://docs.luminsdk.com/)**.
- Tipografia: Inter e Space Grotesk.
- **Todos os jogos e suas artes pertencem aos seus respectivos autores.**
"""


def write_manifest(config: dict, target: Path) -> None:
    source = target / "manifest.webmanifest"
    data = json.loads(source.read_text(encoding="utf-8"))
    base = config["basePath"]
    data["id"] = base
    data["start_url"] = "./"
    data["scope"] = "./"
    data["name"] = f"{config['projectName']} — jogos no navegador"
    data["short_name"] = config["projectName"][:12]
    data["lang"] = config["language"]
    for shortcut in data.get("shortcuts", []):
        shortcut["url"] = shortcut.get("url", "./").replace("../", "./")
    source.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_robots_and_sitemap(config: dict, target: Path) -> None:
    site = config["siteUrl"] if config["siteUrl"].endswith("/") else config["siteUrl"] + "/"
    (target / "robots.txt").write_text(
        f"User-agent: *\nAllow: /\n\nSitemap: {site}sitemap.xml\n", encoding="utf-8"
    )
    (target / "sitemap.xml").write_text(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
        "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n"
        "  <url>\n"
        f"    <loc>{site}</loc>\n"
        "    <changefreq>weekly</changefreq>\n"
        "    <priority>1.0</priority>\n"
        "  </url>\n"
        "</urlset>\n",
        encoding="utf-8",
    )


def write_license(config: dict, target: Path) -> None:
    """MIT com o crédito original preservado e espaço para o novo mantenedor."""
    year = dt.date.today().year
    original = DEFAULTS["author"]
    current = config["author"]

    if current == original:
        credits = f"Copyright (c) {year} {original}"
    else:
        credits = (
            f"Copyright (c) {year} {original} (projeto original {DEFAULTS['projectName']})\n"
            f"Copyright (c) {year} {current} (adaptações e modificações deste repositório)"
        )

    text = f"""MIT License

{credits}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
"""
    (target / "LICENSE").write_text(text, encoding="utf-8")


def write_support_files(config: dict, target: Path) -> None:
    (target / ".nojekyll").write_text("", encoding="utf-8")

    gitignore = """# Sistema operacional
.DS_Store
Thumbs.db

# Editores
.vscode/
.idea/

# Nada de dependências: este projeto é HTML, CSS e JS puros
node_modules/
package-lock.json

# Saída do empacotador
export/
dist/
"""
    (target / ".gitignore").write_text(gitignore, encoding="utf-8")

    editorconfig = """root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
indent_style = space
indent_size = 2

[*.md]
trim_trailing_whitespace = false
"""
    (target / ".editorconfig").write_text(editorconfig, encoding="utf-8")


def write_portable_note(config: dict, target: Path) -> None:
    note = f"""Pacote portátil do {config['projectName']}
Gerado por tools/package.py em {dt.date.today().isoformat()}.

- Autor: {config['author']}
- Repositório de origem: {config['repoUrl']}
- Site publicado de origem: {config['siteUrl']}
- Caminho base usado: {config['basePath']}

Como usar: copie o conteúdo desta pasta para a raiz do novo repositório
(e mantenha o LICENSE com o crédito do autor original).
"""
    (target / "PORTABLE-NOTE.txt").write_text(note, encoding="utf-8")


# --------------------------------------------------------------------------- #
# empacotamento
# --------------------------------------------------------------------------- #
def build(config: dict, out_root: Path, make_zip: bool) -> tuple[Path, Path | None]:
    replacements = build_replacements(config)
    package_dir = out_root / config["packageName"]

    if package_dir.exists():
        shutil.rmtree(package_dir)
    package_dir.mkdir(parents=True, exist_ok=True)

    files = iter_sources()
    for src in files:
        relative = src.relative_to(ROOT)
        copy_file(src, package_dir / relative, replacements)

    when = dt.date.today().strftime("%d/%m/%Y")
    (package_dir / "README.md").write_text(readme_text(config, when), encoding="utf-8")
    write_manifest(config, package_dir)
    write_robots_and_sitemap(config, package_dir)
    write_license(config, package_dir)
    write_support_files(config, package_dir)
    write_portable_note(config, package_dir)

    zip_path = None
    if make_zip:
        zip_path = out_root / f"{config['packageName']}.zip"
        if zip_path.exists():
            zip_path.unlink()
        with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
            for path in sorted(package_dir.rglob("*")):
                if path.is_file():
                    archive.write(path, path.relative_to(out_root))

    return package_dir, zip_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Gera um pacote portátil do site.")
    parser.add_argument("--config", default=str(TOOLS / "package.config.json"), help="arquivo de configuração")
    parser.add_argument("--out", default=str(ROOT / "export"), help="pasta de saída")
    parser.add_argument("--no-zip", action="store_true", help="não gerar o .zip")
    args = parser.parse_args()

    config = load_config(Path(args.config))
    out_root = Path(args.out).resolve()
    out_root.mkdir(parents=True, exist_ok=True)

    package_dir, zip_path = build(config, out_root, not args.no_zip)

    total = sum(1 for p in package_dir.rglob("*") if p.is_file())
    size = sum(p.stat().st_size for p in package_dir.rglob("*") if p.is_file())

    print(f"✓ pasta pronta: {package_dir}")
    print(f"  arquivos: {total} · tamanho: {size / 1024:.0f} KB")
    if zip_path:
        print(f"✓ zip pronto:  {zip_path} ({zip_path.stat().st_size / 1024:.0f} KB)")
    print(f"  projeto: {config['projectName']} · autor: {config['author']}")
    print(f"  repositório: {config['repoUrl']}")
    print(f"  site: {config['siteUrl']}")


if __name__ == "__main__":
    main()
