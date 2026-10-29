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
- 🔎 **Debounced search** with smart empty states.
- 🏷️ **Dynamic categories** pulled straight from the SDK.
- 🔀 **Random picker** — button or press `R`.
- 🖥️ **Custom player** — fullscreen, restart, `Esc` to close, skeleton loading.
- 🌗 **Light & dark themes**, saved in `localStorage`, honoring `prefers-reduced-motion`.
- ⚡ **Zero dependencies** — no framework, no bundler.
- ♿ **Accessible** — keyboard support, visible focus, `aria-live` updates.
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

---

## Project structure

```text
LuminSDK/
├── index.html                  # Hero, project info and the game library
├── 404.html                    # Custom error page
├── assets/
│   ├── css/styles.css          # Design tokens, themes and components
│   ├── js/library.js           # Game UI on top of the LuminSDK headless API
│   ├── js/site.js              # Theme, animations, shortcuts, copy button
│   └── img/                    # Logo and social banner
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
| Games per page and columns | `layoutInfo()` in `assets/js/library.js` (columns × rows) |
| Max categories shown | `CONFIG.maxCategories` in `assets/js/library.js` |
| Default theme | `applyTheme()` in `assets/js/site.js` |

Add `?demo` to the URL to preview the interface with placeholder cards while offline.

| Shortcut | Action |
|---|---|
| `/` | Focus search |
| `R` | Play a random game |
| `Esc` | Close the game / clear search |

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
