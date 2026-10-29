# LuminSDK — versão de arquivo único

Esta pasta contém **o site inteiro em um só arquivo**: `index.html` (~230 KB) com HTML, CSS,
JavaScript e o ícone embutidos. Nada de pasta `assets/`, nada de build.

> ⚠️ **Não edite este arquivo à mão.** Ele é gerado a partir do site oficial por
> `tools/single-file.py`. Mexeu no site? Rode o gerador de novo:
>
> ```bash
> python3 tools/single-file.py
> ```

## Onde isso funciona

| Onde | Como usar |
|---|---|
| **Local** | Baixe o `index.html` e abra com duplo clique. |
| **GitHub Pages** | Já publicado em `https://suckinguptoessry.github.io/LuminSDK/single/`. |
| **GitHub Gist** | Cole como `index.html` e abra com `https://raw.githack.com/SEU_USER/GIST_ID/raw/index.html`. |
| **CodePen / JSFiddle / StackBlitz** | Cole o conteúdo inteiro no painel HTML. |
| **Qualquer hospedagem estática** | Suba o arquivo como `index.html` na raiz. |

### Pastebin

O Pastebin entrega o *raw* como `text/plain`, então o navegador **mostra o código** em vez de
renderizar a página. Ele serve para guardar e compartilhar o código — para ter uma página de
verdade, use as opções acima.

## O que continua externo

- `https://cdn.jsdelivr.net/gh/luminsdk/script@latest/lumin.min.js` — o SDK dos jogos (obrigatório).
- Fontes do Google — opcionais; se falharem, o layout cai nas fontes do sistema.

Se o SDK não carregar (CDN bloqueado, sem internet), a página mostra um aviso com botão de
tentar novamente em vez de ficar em branco.

## O que está incluído

Biblioteca paginada, busca, chips de categoria, favoritos, tamanhos de card (P/M/G),
cor por jogo, saves locais, painel de configurações com perfis de desempenho, partículas,
parallax, cursor customizado, atalhos de teclado e player em diálogo — exatamente os mesmos
recursos do site completo.

---

MIT · criado por [Ryan Smith](https://github.com/SuckingUpToesSry) · jogos por
[LuminSDK](https://docs.luminsdk.com/)
