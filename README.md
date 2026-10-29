<div align="center">

<img src="assets/img/banner.jpg" alt="LuminSDK — mais de 1.100 jogos no navegador" width="100%">

# LuminSDK

**Mais de 1.100 jogos para jogar direto no navegador. Sem download. Sem cadastro. Sem instalação.**

[![Licença](https://img.shields.io/badge/licen%C3%A7a-MIT-8b5cf6?style=flat-square)](LICENSE)
[![Jogos](https://img.shields.io/badge/jogos-1.100%2B-22d3ee?style=flat-square)](https://suckinguptoessry.github.io/LuminSDK/)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-online-34d399?style=flat-square)](https://suckinguptoessry.github.io/LuminSDK/)
[![PRs](https://img.shields.io/badge/PRs-bem--vindos-f472b6?style=flat-square)](CONTRIBUTING.md)
[![Open Source](https://img.shields.io/badge/open--source-sim-6366f1?style=flat-square)](LICENSE)

[🌐 Site](https://suckinguptoessry.github.io/LuminSDK/) ·
[🐛 Issues](https://github.com/SuckingUpToesSry/LuminSDK/issues) ·
[📚 Documentação do LuminSDK](https://docs.luminsdk.com/) ·
[🇺🇸 English version](README.en.md)

</div>

---

## Sobre

O **LuminSDK** é um site open-source de jogos de navegador: um catálogo com mais de **1.100 jogos**
carregados pelo [LuminSDK](https://docs.luminsdk.com/) e apresentado com uma interface própria,
feita do zero para este projeto — busca instantânea, filtro por categoria, ordenação, seleção
aleatória, paginação e um player em tela cheia.

O objetivo é simples: **abrir a página e jogar**, sem contas, sem downloads e sem instalação.

| | |
|---|---|
| **Site** | https://suckinguptoessry.github.io/LuminSDK/ |
| **Autor** | Ryan Smith |
| **Licença** | MIT |
| **Tecnologias** | HTML, CSS e JavaScript puro (sem build, sem dependências) |
| **Catálogo** | LuminSDK (`cdn.jsdelivr.net/gh/luminsdk/script@latest`) |

> Este projeto **não** hospeda nem redistribui jogos. Ele é um cliente da API pública do LuminSDK;
> cada jogo pertence aos seus respectivos autores.

---

## Recursos

- 🎮 **Catálogo completo** — mais de 1.100 jogos servidos pelo LuminSDK.
- 🔎 **Busca com debounce** — resultados enquanto você digita, com estado vazio inteligente.
- 🏷️ **Categorias dinâmicas** — carregadas do próprio SDK, em chips responsivos.
- 🔀 **Jogo aleatório** — botão (ou tecla `R`) para quem não quer escolher.
- 🖥️ **Player próprio** — tela cheia, reiniciar, fechar com `Esc` e carregamento com skeleton.
- 🌗 **Tema claro e escuro** — preferência salva em `localStorage`, com respeito a `prefers-reduced-motion`.
- ⚡ **Zero dependências** — sem framework, sem bundler; só `index.html`, um CSS e dois scripts.
- ♿ **Acessível** — navegação por teclado, foco visível, `aria-live` nos resultados e textos alternativos.
- 🛟 **À prova de falhas** — se a interface própria não carregar, o site cai automaticamente
  para a interface original do LuminSDK; se nada carregar, há um modo demonstração (`?demo`).

---

## Como usar

### Jogar

Acesse **[suckinguptoessry.github.io/LuminSDK](https://suckinguptoessry.github.io/LuminSDK/)** e pronto. 🎮

### Rodar localmente

Não é preciso instalar nada — é HTML, CSS e JS estáticos.

```bash
git clone https://github.com/SuckingUpToesSry/LuminSDK.git
cd LuminSDK

# qualquer servidor estático funciona
python3 -m http.server 8080
# ou
npx serve .
```

Depois abra `http://localhost:8080`.

> Abrir o `index.html` direto pelo sistema de arquivos também funciona na maioria dos navegadores,
> mas usar um servidor local evita restrições de CORS do navegador.

### Usar como base para o seu projeto

1. Faça um **fork** do repositório.
2. Troque os textos, cores e o nome em `index.html` e `assets/css/styles.css`.
3. Ative o **GitHub Pages** em *Settings → Pages → Deploy from a branch → `main` / root*.
4. Publique — não há etapa de build.

---

## Estrutura do projeto

```text
LuminSDK/
├── index.html                  # Página única: hero, informações e biblioteca
├── 404.html                    # Página de erro personalizada
├── assets/
│   ├── css/
│   │   └── styles.css          # Design system, tema claro/escuro e componentes
│   ├── js/
│   │   ├── library.js          # Interface de jogos (API headless do LuminSDK)
│   │   └── site.js             # Tema, animações, atalhos e cópia do snippet
│   └── img/
│       ├── favicon.svg         # Marca do projeto
│       └── banner.jpg          # Imagem de divulgação (README / Open Graph)
├── CONTRIBUTING.md             # Guia de contribuição
├── LICENSE                     # MIT
└── README.md
```

---

## Como a integração funciona

O site usa o SDK em **modo headless** — o LuminSDK entrega os dados e o player, e a interface é
desenhada por este projeto:

```html
<script src="https://cdn.jsdelivr.net/gh/luminsdk/script@latest/lumin.min.js"></script>
<script>
  // 1. conecta sem renderizar a UI padrão
  await Lumin.init({ headless: true });

  // 2. busca os jogos
  const { games, total, pages } = await Lumin.getGames({ page: 1, limit: 24, q: 'puzzle' });

  // 3. resolve a capa de cada jogo
  const cover = await Lumin.getImageUrl(games[0].image_token);

  // 4. abre um jogo no player próprio
  const { url } = await Lumin.getGameUrl(games[0].id);
  iframe.src = url;
</script>
```

### Métodos usados

| Método | Para que serve neste site |
|---|---|
| `Lumin.init({ headless: true })` | Conecta ao catálogo sem renderizar a UI padrão |
| `Lumin.getGames({ page, limit, q })` | Grade paginada e busca |
| `Lumin.getRandomGames(n)` | Botão “Aleatório” |
| `Lumin.getCategories()` | Chips de categoria e contador de categorias |
| `Lumin.getImageUrl(token)` | Capas dos cards (carregadas sob demanda) |
| `Lumin.getGameUrl(id)` | URL do jogo para o player próprio |
| `Lumin.loadGame(id)` | Fallback quando o player próprio não está disponível |

> A documentação completa (configuração, eventos e todos os métodos) está em
> **[docs.luminsdk.com](https://docs.luminsdk.com/)**.

---

## Personalização

As cores e o espaçamento ficam em variáveis CSS no topo de `assets/css/styles.css`:

```css
html[data-theme="dark"] {
  --violet: #8b5cf6;   /* cor de destaque principal */
  --cyan:   #22d3ee;   /* gradientes e brilhos */
  --bg:     #07070c;   /* fundo */
  --text:   #f4f4fa;   /* texto */
}
```

Ajustes rápidos:

| O que mudar | Onde |
|---|---|
| Nome, textos e links | `index.html` |
| Cores, fontes e raios | `:root` em `assets/css/styles.css` |
| Jogos por página | `CONFIG.gamesPerPage` em `assets/js/library.js` |
| Máximo de categorias exibidas | `CONFIG.maxCategories` em `assets/js/library.js` |
| Tema inicial | `applyTheme()` em `assets/js/site.js` |

### Modo demonstração

Adicione `?demo` à URL (`.../LuminSDK/?demo`) para ver a interface com cards de exemplo, sem
depender do catálogo. Útil para desenvolver o layout offline.

### Atalhos de teclado

| Tecla | Ação |
|---|---|
| `/` | Focar a busca |
| `R` | Abrir um jogo aleatório |
| `Esc` | Fechar o jogo / limpar a busca |

---

## Acessibilidade e desempenho

- Estrutura semântica com landmarks, `aria-live` no status e nos resultados, e *skip link*.
- Navegação completa por teclado, com `:focus-visible` visível em todos os controles.
- Imagens de capa carregadas por `IntersectionObserver` (só o que está perto da tela).
- CSS e JS sem dependências: nenhum framework, nenhuma fonte bloqueante além do Google Fonts
  (com *fallback* para fontes do sistema).
- Respeito a `prefers-reduced-motion` e suporte nativo a tema claro/escuro.

---

## Contribuindo

Contribuições são muito bem-vindas! Leia o [CONTRIBUTING.md](CONTRIBUTING.md) para o passo a passo.

Resumo:

1. Abra uma **issue** descrevendo o problema ou a ideia.
2. Faça um **fork** e crie uma branch (`feat/minha-melhoria`).
3. Envie um **pull request** explicando o que mudou (prints ajudam).
4. Mantenha o código simples, sem dependências e em português nos textos da interface.

---

## Licença

Distribuído sob a licença **MIT** — use, copie, modifique e publique, mantendo o aviso de copyright.
Veja [LICENSE](LICENSE).

```text
MIT License · Copyright (c) 2026 Ryan Smith
```

---

## Créditos

- **Ryan Smith** — criação e manutenção deste site.
- **[LuminSDK](https://docs.luminsdk.com/)** — catálogo, API e player dos jogos.
- **Tipografia** — [Inter](https://rsms.me/inter/) e [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk).
- **Todos os jogos e suas artes pertencem aos seus respectivos autores.**

<div align="center">

Feito com 💜 por **Ryan Smith**

</div>
