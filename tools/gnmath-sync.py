#!/usr/bin/env python3
"""Atualiza a lista de jogos da aba GN-Math.

A lista do GN-Math é pública: fica em `zones.json`, no repositório
`freebuisness/assets`, e cada jogo aponta para um arquivo em `freebuisness/html`
(as capas vêm de `freebuisness/covers`). Este script baixa esse JSON, deixa ele
no formato enxuto que a página usa e grava em `assets/data/gnmath-games.json`.

Uso:
    python3 tools/gnmath-sync.py                 # baixa e grava
    python3 tools/gnmath-sync.py --file zones.json   # usa um arquivo local
    python3 tools/gnmath-sync.py --dry-run       # só mostra o resumo

Sem dependências: só a biblioteca padrão.
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.request
from pathlib import Path

ZONES_URL = "https://cdn.jsdelivr.net/gh/freebuisness/assets@main/zones.json"
OUT = Path(__file__).resolve().parent.parent / "assets" / "data" / "gnmath-games.json"


def fetch(url: str) -> list[dict]:
    request = urllib.request.Request(url, headers={"User-Agent": "LuminSDK-gnmath-sync"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))


def parse(source: list[dict]) -> list[dict]:
    games: list[dict] = []
    seen: set[int] = set()

    for zone in source:
        url = str(zone.get("url") or "")
        # entradas de divulgação (Discord, Twitch) apontam para fora do acervo
        if "{HTML_URL}" not in url:
            continue

        try:
            game_id = int(zone["id"])
        except (KeyError, TypeError, ValueError):
            continue
        if game_id in seen:
            continue
        seen.add(game_id)

        name = str(zone.get("name") or "").strip()
        if not name or name.startswith("[!]"):
            continue

        game = {
            "id": game_id,
            "n": name,
            "f": url.replace("{HTML_URL}", "").lstrip("/"),
            "c": str(zone.get("cover") or "").replace("{COVER_URL}", "").lstrip("/"),
        }

        author = str(zone.get("author") or "").strip()
        if author:
            game["a"] = author

        link = str(zone.get("authorLink") or "").strip()
        if link.startswith("http"):
            game["al"] = link

        tags = [tag for tag in (zone.get("special") or []) if isinstance(tag, str)]
        if tags:
            game["t"] = tags

        if zone.get("featured"):
            game["ft"] = 1

        games.append(game)

    return games


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Sincroniza a lista de jogos do GN-Math.")
    parser.add_argument("--file", help="usa um zones.json local em vez de baixar")
    parser.add_argument("--out", default=str(OUT), help="arquivo de saída")
    parser.add_argument("--dry-run", action="store_true", help="não grava nada")
    args = parser.parse_args(argv)

    try:
        source = json.loads(Path(args.file).read_text(encoding="utf-8")) if args.file else fetch(ZONES_URL)
    except Exception as error:  # noqa: BLE001 - mensagem simples para quem roda na mão
        print(f"erro ao ler a lista do GN-Math: {error}", file=sys.stderr)
        return 1

    games = parse(source)
    payload = {
        "v": 1,
        "source": "gn-math (freebuisness/assets zones.json)",
        "synced": __import__("datetime").date.today().isoformat(),
        "games": games,
    }
    text = json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n"

    print(f"{len(games)} jogos · {sum(1 for g in games if g.get('ft'))} em destaque · {len(text) // 1024} KB")
    if args.dry_run:
        return 0

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(text, encoding="utf-8")
    print(f"gravado em {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
