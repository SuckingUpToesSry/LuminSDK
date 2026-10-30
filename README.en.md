<div align="center">

<img src="assets/img/banner.jpg" alt="LuminSDK — 1,100+ browser games" width="100%">

# LuminSDK

**1,100+ games you can play right in your browser. No downloads. No sign-up. No installs.**

[![License](https://img.shields.io/badge/license-MIT-8b5cf6?style=flat-square)](LICENSE)
[![Games](https://img.shields.io/badge/games-1%2C100%2B-22d3ee?style=flat-square)](https://suckinguptoessry.github.io/LuminSDK/)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-online-34d399?style=flat-square)](https://suckinguptoessry.github.io/LuminSDK/)
[![PRs](https://img.shields.io/badge/PRs-welcome-f472b6?style=flat-square)](CONTRIBUTING.md)
[![Open Source](https://img.shields.io/badge/open--source-yes-6366f1?style=flat-square)](LICENSE)

[🌐 Live site](https://suckinguptoessry.github.io/LuminSDK/) ·
[🐛 Issues](https://github.com/SuckingUpToesSry/LuminSDK/issues) ·
[📚 LuminSDK docs](https://docs.luminsdk.com/) ·
[🇧🇷 Versão em português](README.md)

</div>

---

## About

LuminSDK is an **open-source browser game portal**. It loads a catalog of 1,100+ games through the
[LuminSDK](https://docs.luminsdk.com/) and renders them with a custom interface built from scratch:
instant search, category filters, sorting, a random picker, pagination and a fullscreen game player.

Open the page and play — no account, no download, no installation.

| | |
|---|---|
| **Live site** | https://suckinguptoessry.github.io/LuminSDK/ |
| **Author** | Ryan Smith |
| **License** | MIT |
| **Stack** | Plain HTML, CSS and JavaScript (no build step, no dependencies) |
| **Catalog** | LuminSDK (`cdn.jsdelivr.net/gh/luminsdk/script@latest`) |

> This project does **not** host or redistribute games. It is a client for the public LuminSDK API;
> every game belongs to its respective authors.

---

## Features

- 🎮 **Full catalog** — 1,100+ games served by LuminSDK in a dense grid of up to **9 columns**.
- ❤️ **Favorites** — save games with one click; they stay in your browser.
- 🕘 **Continue playing** — a short history of recently opened games.
- 🎛️ **Custom grid** — **columns** and **rows** sliders plus **card size** (S/M/L); pagination recalculates itself.
- 🖌️ **Per-game colors** — each game can have its own accent color, saved locally.
- ⚙️ **Settings** — turn off particles, follow-the-pointer background, custom cursor, animations, blurs and hover effects; automatic device detection plus **light** and **full** presets.
- 📦 **Backup** — export/import favorites, history, colors and grid as JSON.
- 🎁 **Bonus** — a tools hub: gamepad tester (built for the Xbox controller and browser), connection monitor and cache manager.
- 🎨 **Color palette** — 12 presets plus a free color picker and hue slider: the whole site (buttons, glows, particles, cursor) recolors instantly and is saved.
- ✨ **Living atmosphere** — canvas particles in the chosen color, a background that follows the pointer and a custom cursor.
- 🔗 **Shareable links** — search, category, page and favorites live in the URL.
- 🔎 **Debounced search** with smart empty states.
- 🏷️ **Dynamic categories** pulled straight from the SDK.
- 🔀 **Random picker** — button for when you can't decide.
- 🖥️ **Custom player** — fullscreen, restart, open in a new tab and skeleton loading.
- 🌗 **Light & dark themes**, saved in `localStorage`, honoring `prefers-reduced-motion`.
- ⚡ **Zero dependencies** — no framework, no bundler.
- ♿ **Accessible** — keyboard support, visible focus, `aria-live` updates.
- 📲 **Installable (PWA)** — manifest, icons and a service worker for offline app-shell.
- 🛟 **Resilient** — falls back to the SDK's built-in UI if the custom one fails,
  and ships a demo mode (`?demo`) for offline layout work.

---

## Run it locally

```bash
git clone https://github.com/SuckingUpToesSry/LuminSDK.git
cd LuminSDK

python3 -m http.server 8080
# or: npx serve .
```

Then open `http://localhost:8080`.

### Use it as a starting point

1. **Fork** the repository.
2. Edit the copy, colors and branding in `index.html` and `assets/css/styles.css`.
3. Enable **GitHub Pages** under *Settings → Pages → Deploy from a branch → `main` / root*.
4. Ship it — there is no build step.

### Export to another repository (portable package)

```bash
# 1. fill in your project data
nano tools/package.config.json   # projectName, author, repoUrl, siteUrl, basePath, sdkUrl

# 2. build the folder + zip
./tools/package.sh               # or: python3 tools/package.py
```

Output:

- `export/luminsdk-portable/` — drop-in contents for the new repository
- `export/luminsdk-portable.zip` — the same package, zipped

The packager copies only what the site needs, rewrites every project link, and generates a
`README.md`, a `LICENSE` that preserves the original credit **and** the new maintainer, a manifest
with your `basePath`, `robots.txt`/`sitemap.xml` for your `siteUrl`, `.nojekyll`, `.gitignore` and
`.editorconfig`. Flags: `--out`, `--no-zip`, `--config`.

### Single-file version (one HTML file)

Need the whole site in **one file** — to paste into a Gist, CodePen, an email, or any host
without folders? The generator inlines HTML, CSS, JS and the icon:

```bash
python3 tools/single-file.py             # writes single/index.html (~230 KB)
python3 tools/single-file.py --out /tmp/luminsdk.html
```

It opens straight in a browser: no server, no build. The only external piece is the LuminSDK
script from the CDN (Google Fonts are optional and fall back gracefully).

> **About Pastebin:** Pastebin raw is served as `text/plain`, so the browser shows the code
> instead of the page. To get a URL that actually renders, use a Gist plus `raw.githack.com`,
> CodePen, JSFiddle, or GitHub Pages.

The generated copy lives in [`single/`](single/) →
`https://suckinguptoessry.github.io/LuminSDK/single/`.

---

## Project structure

```text
LuminSDK/
├── index.html                  # Hero, project info and the game library
├── 404.html                    # Custom error page
├── assets/
│   ├── css/styles.css          # Design tokens, themes and components
│   ├── js/library.js           # Game UI, favorites, history and per-game colors
│   ├── js/settings.js          # Preferences and performance profiles
│   ├── js/site.js              # Theme, animations, PWA, copy button
│   ├── js/atmosphere.js        # Palette, particles, parallax, custom cursor
│   ├── js/bonus.js             # Bonus hub: gamepad tester, network and cache
│   └── img/                    # Logo, PWA icons and social banner
├── manifest.webmanifest
├── sw.js                       # Service worker (offline app shell)
├── single/                     # Single-file build (generated by tools/single-file.py)
├── tools/                      # Portable packager + single-file generator
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

---

## How the integration works

The site runs the SDK in **headless mode** — LuminSDK provides the data and the game URLs,
this project provides the interface:

```html
<script src="https://cdn.jsdelivr.net/gh/luminsdk/script@latest/lumin.min.js"></script>
<script>
  await Lumin.init({ headless: true });

  const { games, total, pages } = await Lumin.getGames({ page: 1, limit: 24, q: 'puzzle' });

  const cover = await Lumin.getImageUrl(games[0].image_token);

  const { url } = await Lumin.getGameUrl(games[0].id);
  iframe.src = url;
</script>
```

| Method | Used for |
|---|---|
| `Lumin.init({ headless: true })` | Connect without rendering the default UI |
| `Lumin.getGames({ page, limit, q })` | Paginated grid and search |
| `Lumin.getRandomGames(n)` | “Random” button |
| `Lumin.getCategories()` | Category chips and counter |
| `Lumin.getImageUrl(token)` | Lazy-loaded game covers |
| `Lumin.getGameUrl(id)` | Custom fullscreen player |
| `Lumin.loadGame(id)` | Fallback player |

Full API reference: **[docs.luminsdk.com](https://docs.luminsdk.com/)**.

---

## Customization

```css
html[data-theme="dark"] {
  --violet: #8b5cf6;   /* primary accent */
  --cyan:   #22d3ee;   /* gradients and glows */
  --bg:     #07070c;   /* background */
  --text:   #f4f4fa;   /* text */
}
```

| Change | Where |
|---|---|
| Copy, links and branding | `index.html` |
| Colors, fonts, radii | `:root` in `assets/css/styles.css` |
| Games per page and columns | `layoutInfo()` in `assets/js/library.js` (or the on-page sliders) |
| Card sizes (S/M/L) | `CONFIG.cardSizes` in `assets/js/library.js` |
| Device detection | `detectDevice()` in `assets/js/settings.js` |
| Performance presets | `PRESETS` in `assets/js/settings.js` |
| Default accent color | `--accent` in `:root` (`assets/css/styles.css`) |
| Quick palette presets | `PRESETS` in `assets/js/atmosphere.js` |
| Max categories shown | `CONFIG.maxCategories` in `assets/js/library.js` |
| Default theme | `applyTheme()` in `assets/js/site.js` |

Add `?demo` to the URL to preview the interface with placeholder cards while offline.

There are **no keyboard shortcuts** in the site — no `F` (fullscreen), `R` (random), `/` or
`Ctrl`+`K` (search), `?` (settings). Everything lives in the UI buttons so no key is stolen from
the game. With the player open, every key (WASD, arrows, space, Enter, F, numbers…) goes to the game.

The game runs in a cross-origin `<iframe>`, so the player focuses it as soon as it loads (and retries
a few times), restores focus when the tab/window becomes active again and never uses a modal
`<dialog>` — some browsers never give keyboard focus to an iframe inside a modal dialog. Games that
run inside another iframe and block focus on click can be opened with **Open in a new tab**.

---

### Bonus tools

The **Bonus** button in the header opens a small toolbox that runs entirely in the browser:

- **Gamepad tester** — live view of every button, trigger and stick (Gamepad API via polling),
  with an adjustable dead zone, raw readout and a rumble test when the controller and browser
  support it. Built with the **Xbox Edge browser** in mind: no Web Bluetooth, WebUSB, Keyboard Lock
  or experimental APIs.
- **Connection monitor** — online/offline state, network type, estimated speed and latency when the
  browser exposes them, plus a real latency test against the site itself.
- **Cache manager** — storage used, stored caches, service worker state, an update check and a safe
  clear-and-reload action.

The panel only lists what already works. The next tools — achievements, player statistics, daily
challenges, collections, recommendations, quick launch, game layout, immersive mode and full backup —
ship in upcoming updates.

---

## Accessibility & performance

- Semantic landmarks, `aria-live` status and result announcements, plus a skip link.
- Fully keyboard navigable with visible `:focus-visible` styles.
- Covers loaded via `IntersectionObserver`, only when near the viewport.
- No framework and no bundler; Google Fonts has a system-font fallback.
- Honors `prefers-reduced-motion` and ships native light/dark themes.

---

## Contributing

Issues and pull requests are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

1. Open an issue describing the bug or idea.
2. Fork the repo and create a branch (`feat/my-improvement`).
3. Open a pull request explaining the change (screenshots help).
4. Keep it dependency-free and keep the UI copy in Portuguese.

---

## License

Released under the **MIT License**. Use it, copy it, change it, ship it — keep the copyright notice.
See [LICENSE](LICENSE).

```text
MIT License · Copyright (c) 2026 Ryan Smith
```

---

## Credits

- **Ryan Smith** — creator and maintainer.
- **[LuminSDK](https://docs.luminsdk.com/)** — game catalog, API and game hosting.
- **Typefaces** — [Inter](https://rsms.me/inter/) and [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk).
- **All games and their artwork belong to their respective authors.**

<div align="center">

Made with 💜 by **Ryan Smith**

</div>
