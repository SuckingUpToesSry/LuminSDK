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

- 🎮 **Catálogo completo** — mais de 1.100 jogos servidos pelo LuminSDK, em grade densa de até **9 colunas**.
- ❤️ **Favoritos** — salve jogos com um clique no coração; eles ficam guardados no seu navegador.
- 🕘 **Continuar jogando** — histórico dos últimos jogos abertos, com um toque para voltar.
- 🎛️ **Grade sob medida** — sliders de **colunas** e **linhas** + botões de **tamanho do card** (P/M/G): escolha exatamente quantos jogos quer ver (a paginação se ajusta sozinha).
- 🖌️ **Cor por jogo** — cada jogo pode ter sua própria cor (borda, capa e destaque), salva no navegador.
- ⚙️ **Configurações** — desligue partículas, fundo que segue o mouse, cursor personalizado, animações, desfoques e efeitos de hover; há detecção automática e modos **leve** / **completo**.
- 📦 **Backup** — exporte e importe favoritos, histórico, cores e grade em um JSON.
- 🎨 **Paleta de cores** — 12 cores prontas + seletor livre e matiz: o site inteiro (botões, brilhos, partículas e cursor) muda na hora e fica salvo.
- ✨ **Atmosfera viva** — partículas em canvas na cor escolhida, fundo que segue o mouse em parallax e cursor personalizado.
- 🔗 **Links compartilháveis** — busca, categoria, página e favoritos ficam na URL (`?q=`, `?cat=`, `?page=`, `?favoritos=1`).
- 🛟 **Resiliente** — tenta de novo automaticamente, avisa quando você está offline e oferece modo demonstração (`?demo`).
- 🔎 **Busca com debounce** — resultados enquanto você digita, com estado vazio inteligente.
- 🏷️ **Categorias dinâmicas** — carregadas do próprio SDK, em chips responsivos.
- 🔀 **Jogo aleatório** — botão para quem não quer escolher.
- 🖥️ **Player próprio** — tela cheia, reiniciar, abrir em outra aba e carregamento com skeleton.
- 🌗 **Tema claro e escuro** — preferência salva em `localStorage`, com respeito a `prefers-reduced-motion`.
- ⚡ **Zero dependências** — sem framework, sem bundler; só `index.html`, um CSS e dois scripts.
- ♿ **Acessível** — navegação por teclado, foco visível, `aria-live` nos resultados e textos alternativos.
- 📲 **Instalável (PWA)** — manifest, ícones e service worker: dá para instalar como app e abrir offline a casca do site.
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

### Exportar para outro repositório (pacote portátil)

Para levar o site inteiro para outro repositório — com **links, autor, nome e CDN já ajustados** —
use o empacotador:

```bash
# 1. edite os seus dados
#    (projectName, author, repoUrl, siteUrl, basePath, sdkUrl)
nano tools/package.config.json

# 2. gere a pasta + zip
./tools/package.sh            # ou: python3 tools/package.py

# resultado:
#   export/luminsdk-portable/       → conteúdo pronto para colar no outro repositório
#   export/luminsdk-portable.zip    → mesma coisa compactada
```

O script copia apenas o necessário, reescreve os links do projeto e ainda gera:

| Arquivo | O que faz |
|---|---|
| `README.md` | guia de instalação e personalização do pacote |
| `LICENSE` | MIT preservando o crédito original **e** o novo mantenedor |
| `manifest.webmanifest` | nome, `id` e `start_url` com o seu `basePath` |
| `robots.txt` / `sitemap.xml` | apontando para o seu `siteUrl` |
| `.nojekyll` | evita o processamento do Jekyll no GitHub Pages |
| `.gitignore` / `.editorconfig` | higiene do repositório novo |
| `PORTABLE-NOTE.txt` | resumo da origem do pacote |

Opções:

```bash
python3 tools/package.py --out ../meu-export     # outra pasta de saída
python3 tools/package.py --no-zip                # só a pasta
python3 tools/package.py --config meu.json       # outro arquivo de configuração
```

O pacote é **estático e independente**: não importa `tools/`, não tem dependências e funciona em
qualquer hospedagem. Só lembre de manter o `LICENSE` com o crédito de Ryan Smith.

### Versão de arquivo único (um HTML só)

Precisa do site inteiro num **único arquivo** — para colar num Gist, no CodePen, mandar por
e-mail ou publicar sem pasta nenhuma? O gerador junta HTML, CSS, JS e o ícone num só arquivo:

```bash
python3 tools/single-file.py             # gera single/index.html (~230 KB)
python3 tools/single-file.py --out /tmp/luminsdk.html
```

O resultado abre direto no navegador, sem servidor e sem build. O único item externo é o
script do LuminSDK no CDN (as fontes do Google são opcionais e têm fallback).

> **Sobre o Pastebin:** o raw do Pastebin é entregue como `text/plain`, então o navegador
> mostra o código em vez da página. Para ter uma URL que realmente abre o site, use Gist +
> `raw.githack.com`, CodePen, JSFiddle ou o próprio GitHub Pages.

A versão gerada fica publicada em [`single/`](single/) →
`https://suckinguptoessry.github.io/LuminSDK/single/`.

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
│   │   ├── library.js          # Interface de jogos, favoritos, histórico e cores por jogo
│   │   ├── settings.js         # Preferências e perfis de desempenho
│   │   ├── site.js             # Tema, animações, PWA e cópia do snippet
│   │   └── atmosphere.js       # Paleta, partículas, parallax e cursor
│   └── img/                    # Marca, ícones do PWA e banner social
├── single/                     # Versão de arquivo único, gerada por tools/single-file.py
├── manifest.webmanifest        # Instalação como aplicativo
├── sw.js                       # Service worker (offline da casca do site)
├── tools/
│   ├── package.py              # Empacotador portátil (pasta + zip)
│   ├── package.sh              # Atalho do empacotador
│   ├── package.config.json     # Seus dados: nome, autor, links e CDN
│   └── single-file.py          # Gera a versão de arquivo único (HTML+CSS+JS juntos)
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
| Jogos por página e colunas | `layoutInfo()` em `assets/js/library.js` (ou use os sliders do site) |
| Tamanhos de card (P/M/G) | `CONFIG.cardSizes` em `assets/js/library.js` |
| Detecção de dispositivo | `detectDevice()` em `assets/js/settings.js` |
| Presets de desempenho | `PRESETS` em `assets/js/settings.js` |
| Cor padrão do site | `--accent` em `:root` (`assets/css/styles.css`) |
| Cores da paleta rápida | `PRESETS` em `assets/js/atmosphere.js` |
| Quantidade de partículas | `resize()` em `assets/js/atmosphere.js` |
| Velocidade do fundo | `parallax()` em `assets/js/atmosphere.js` |
| Máximo de categorias exibidas | `CONFIG.maxCategories` em `assets/js/library.js` |
| Tema inicial | `applyTheme()` em `assets/js/site.js` |

### Aparência

Os controles ficam na barra acima da grade:

- **Colunas / Linhas** — definem a grade e quantos jogos aparecem por página (o botão **Auto** volta ao tamanho calculado pela tela).
- **P / M / G** — tamanho dos cards; recalcula as colunas para caber mais ou menos jogos.
- **Cor** — painel com 12 cores prontas, seletor livre e matiz. Tudo é recalculado a partir dessa cor:
  destaque, gradientes, brilhos, partículas, cursor e até o glow do fundo.

Dentro do player há ainda **cor por jogo**, **compartilhar**, **outro jogo**, **reiniciar** e **tela cheia**.

### Teclado dentro do jogo (WASD, setas, espaço)

O jogo roda em um `<iframe>` de outro domínio. Para o teclado funcionar, **o foco precisa estar dentro
do iframe** — senão as teclas vão para a página e o personagem não se mexe. O site cuida disso:

- o player **não usa `<dialog>` modal**: em Firefox, Safari e alguns Chromium o iframe dentro de um
  diálogo modal recebe cliques do mouse mas nunca ganha foco de teclado. O overlay é uma `div` comum;
- assim que o jogo carrega, o iframe recebe o foco várias vezes (0, 120, 350, 800, 1600 e 2800 ms),
  porque alguns navegadores só entregam o foco depois que o documento interno termina de montar;
- o foco volta ao jogo quando a aba/janela é reativada, quando a tela cheia muda e sempre que uma
  tecla chega à página (sinal de que o iframe perdeu o foco);
- **não existe nenhum atalho de teclado no site** — nem `/`, nem `Ctrl`+`K`, nem `R`, nem `?`, nem `F`.
  WASD, setas, espaço, Enter, números e todas as outras teclas pertencem ao jogo;
- o botão **Abrir em outra aba** cobre os jogos que rodam dentro de outro iframe e bloqueiam o foco no
  clique (aí o jogo só aceita teclado como página principal);
- se o navegador recusar o foco, aparece a dica *“Clique no jogo para o teclado funcionar”*
  (que também pode ser clicada para devolver o foco).

### O que fica no navegador

| Salvo pelo site | Detalhe |
|---|---|
| Favoritos | lista com nome, categoria e capa |
| Histórico | últimos 10 jogos abertos |
| Contagem de partidas | usada pela ordenação “Mais jogados” |
| Cores por jogo, grade, tema e paleta | preferências |
| Backup | exporta/importa tudo em JSON |

O **progresso dentro do jogo** pertence ao jogo e roda em outro domínio: por segurança, o navegador
impede que o site leia ou grave esse estado. Quem salva é o próprio jogo (muitos fazem isso
automaticamente). O site não tem — e não finge ter — acesso a isso.

### Configurações e desempenho

O botão de engrenagem (ou `?`) abre o painel:

- **Partículas**, **fundo que segue o mouse**, **cursor personalizado**, **animações**, **desfoques** e **efeitos de hover** — liga/desliga na hora.
- **Detectar automático** escolhe um perfil conforme o dispositivo (núcleos, memória, economia de dados, `prefers-reduced-motion`).
- **Modo leve** e **Tudo ligado** para trocar em um clique.
- **Meus dados**: exportar backup, importar e apagar tudo.

As partículas também se ajustam sozinhas: limite de ~40 fps, menos pontos em máquinas fracas, pausa
quando a aba fica oculta e conexões calculadas por grade espacial (sem custo quadrático).

### Links e compartilhamento

Cada jogo tem link próprio: `?jogo=<id>` abre direto o player daquele jogo (o botão de compartilhar
no player copia esse endereço). O estado da biblioteca também vai na URL: `?q=`, `?cat=`, `?page=`,
`?sort=` e `?favoritos=1`.

### Modo demonstração

Adicione `?demo` à URL (`.../LuminSDK/?demo`) para ver a interface com cards de exemplo, sem
depender do catálogo. Útil para desenvolver o layout offline.

### Atalhos de teclado

O site **não tem atalhos de teclado**. Nem `F` (tela cheia), nem `R` (jogo aleatório), nem `/` ou
`Ctrl`+`K` (busca), nem `?` (configurações). Tudo isso é feito pelos botões da interface, para que
nenhuma tecla seja roubada do jogo: com o player aberto, todas as teclas (WASD, setas, espaço,
Enter, F, números…) vão para o jogo.

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
