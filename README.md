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

## Jogos cujo CDN exibe o código HTML

O helper de abertura reconhece arquivos `.html`/`.htm` de CDNs de arquivos públicos (jsDelivr, raw GitHub e mirrors conhecidos). Esses arquivos podem vir como `text/plain`/`nosniff`: navegar diretamente para eles exibia o código em vez do jogo.

Agora o HTML é buscado com limite de tamanho/tempo e fallback público compatível; o iframe em **about:blank** o renderiza como documento HTML. A base de recursos existente é preservada (inclusive quando aparece antes de `<head>`, como no **Assessment Examination**); quando não existe, é criada a partir da URL original. Scripts e assets relativos não apontam para o LuminSDK.

O HTML de terceiros usa sandbox de origem opaca, sem acesso ao DOM/armazenamento do portal. Páginas comuns continuam com iframe por URL e seus bloqueios originais. Falhas mostram **Tentar novamente**, sem exibir silenciosamente o arquivo bruto. Jogos que dependem de armazenamento de origem, isolamento especial, serviços externos ou assets indisponíveis ainda podem ter limitações. Baixar o HTML não baixa o pacote completo: no Examination, o PCK indicado pelo arquivo tem cerca de 158 MB e é carregado à parte.

Regressão opcional: `node tests/raw-game.browser.cjs` (mesmas dependências Chromium dos outros smokes). Valida HTML servido como texto, execução de scripts, base anterior ao head, assets relativos, isolamento, fallback e erro/retry com engine/assets simulados; não certifica uma partida completa.

## Abertura de links e downloads

Todo destino HTTP(S) acionado pela interface do portal — jogos, Sites, Navegador, provedores, LuminOS, créditos e documentação — abre em uma **nova aba `about:blank` com iframe**. As abas internas e âncoras continuam sendo navegação local. Downloads explícitos (HTML/JSON/blob) continuam sendo downloads, não páginas. Clique comum, Ctrl/Cmd+clique e botão do meio nos links são tratados; pop-up bloqueado gera aviso, **nunca** redireciona o portal ou abre o destino diretamente.

O navegador não permite interceptar links *dentro de iframes de outra origem*, nem comandos do menu de contexto do próprio navegador. CSP, X-Frame-Options, autenticação e bloqueios de rede continuam valendo; `about:blank` não os remove.

Na M. G. S., os **cinco links originais ficam visíveis e copiáveis**, mesmo se o índice falhar. Baixar HTML tenta primeiro o endereço original; arquivos jsDelivr/GitHub compatíveis têm uma segunda tentativa pela API pública raw do GitHub, sem credenciais. Há limite de 50 MB, timeout de 25 s e botão Cancelar. Se falhar, aparecem links para abrir o arquivo e os portais originais. A API pública também tem limites de requisição.

Não é possível extrair instaladores privados ou transformar serviços de IA em aplicativos offline sem um arquivo público fornecido pelo autor. Para esses casos, use os controles das fontes originais. Créditos a WebSight/P2P e às bibliotecas foram mantidos.

## M. G. S. — Multiple Games Sources

A aba **M. G. S.** combina um índice pesquisável de **630 URLs únicas** com a abertura do **portal original completo WebSight / P2P**, preservando os cinco endereços Apps Script fornecidos. Eles apresentam a mesma coleção: não multiplicamos a contagem por cinco.

- Busca sem acentos, filtro por biblioteca, A–Z/Z–A, favoritos locais e paginação de 60 cards.
- Jogos e fontes originais em iframe isolado na nova aba `about:blank`, pelo mesmo helper do catálogo.
- **Baixar HTML** obtém o documento original quando a fonte permite CORS, até 50 MB e com limite de 25 segundos. Não é um pacote offline: imagens, scripts e outros assets podem exigir internet. Não há download automático nem execução de launchers no computador.
- IA, Minecraft/Launcher e downloads dinâmicos ficam nos **menus do portal original em about:blank**, quando disponíveis ali. Não são implementações nativas nem serviços operados pelo LuminSDK; login, CSP, cookies de terceiros e disponibilidade continuam dependentes da fonte. `about:blank` não remove esses limites.
- O índice é **parcial**. Não afirmamos ter extraído todos os jogos ou validado cada jogo/serviço. O botão do portal completo continua disponível mesmo se a leitura do índice falhar.
- Créditos visíveis a **WebSight / P2P**, **Onex558 / Uranium**, Noah’s Hub, UGS e autores dos jogos. A licença MIT deste projeto não transfere direitos sobre conteúdo externo.

`assets/data/mgs.json` registra snapshot, commit de origem e manifestos. A importação lê apenas metadados literais públicos; nunca executa o JS upstream nem redistribui os jogos. Para atualizar:

```sh
npm install --prefix .tmp/mgs-parser --no-save --package-lock=false acorn
node tools/mgs-index.cjs --fetch
node --test tests/*.test.cjs
```

O smoke test opcional `node tests/mgs.browser.cjs` usa as mesmas dependências Chromium documentadas em `tests/transitions.browser.cjs`, com fontes externas simuladas. Ele valida a integração, **não** a disponibilidade real dos serviços externos. O arquivo único em `single/` continua apenas com o catálogo Lumin.

## Recursos

- 🎮 **Catálogo completo** — mais de 1.100 jogos servidos pelo LuminSDK, em grade densa de até **9 colunas**.
- ❤️ **Favoritos** — salve jogos com um clique no coração; eles ficam guardados no seu navegador.
- 🕘 **Continuar jogando** — histórico dos últimos jogos abertos, com um toque para voltar.
- 🎛️ **Grade sob medida** — sliders de **colunas** e **linhas** + botões de **tamanho do card** (P/M/G): escolha exatamente quantos jogos quer ver (a paginação se ajusta sozinha).
- 🖌️ **Cor por jogo** — cada jogo pode ter sua própria cor (borda, capa e destaque), salva no navegador.
- 🎛️ **Personalização (21 opções)** — tema, 16 cores prontas, fonte, cantos, densidade, velocidade das animações e 17 interruptores de efeitos (partículas, parallax, cursor, desfoques, hover, Y2K, cromado, vidro, neon, glow, estrelas, bolhas, grade, ruído e scanlines). Há detecção automática, modos **leve** / **completo** e uma **sugestão personalizada** montada a partir do seu aparelho e do seu histórico.
- ✦ **Para você** — trilho de recomendações montado a partir das categorias que você mais joga e dos favoritos; dá para trocar a seleção ou esconder por hoje.
- 🎯 **Desafios do dia** — três metas sorteadas pelo dia (partidas, minutos, variedade, categoria e sessão da noite), com progresso, sequência de dias e aviso ao concluir.
- 🏆 **Conquistas** — 17 medalhas locais (primeira partida, maratonas, sequências de dias, madrugada, favoritos…) com aviso na tela e progresso salvo no navegador.
- 📊 **Estatísticas do jogador** — partidas, tempo total, jogos diferentes, sequência de dias, últimos 7 dias em gráfico, categorias favoritas e os jogos mais jogados.
- ✨ **Visual Y2K** — títulos cromados, botões de vidro, bolhas subindo, campo de estrelas, scanlines e cantos de bolha — cada efeito pode ser desligado individualmente.
- 📦 **Backup** — exporte e importe favoritos, histórico, cores e grade em um JSON.
- 🎁 **Bônus** — central de ferramentas: testador de controle (pensado para o controle e o navegador do Xbox), monitor de conexão e gerenciador de cache.
- 🎨 **Paleta de cores** — 12 cores prontas + seletor livre e matiz: o site inteiro (botões, brilhos, partículas e cursor) muda na hora e fica salvo.
- ✨ **Atmosfera viva** — partículas em canvas na cor escolhida (com halo, cintilância e brilho que segue o mouse), fundo em parallax e cursor personalizado com anel luminoso. Vêm ligados por padrão — inclusive com "reduzir movimento" no sistema, que desliga a animação mas mantém os pontos reagindo ao mouse.
- 🔗 **Um endereço só** — `…/LuminSDK/` e nada mais: busca, categoria, página, favoritos e jogo aberto não mexem na URL.
- 🛟 **Resiliente** — tenta de novo automaticamente, avisa quando você está offline e oferece modo demonstração (`?demo`).
- 🔎 **Busca com debounce** — resultados enquanto você digita, com estado vazio inteligente.
- 🏷️ **Categorias dinâmicas** — carregadas do próprio SDK, em chips responsivos.
- 🔀 **Jogo aleatório** — botão para quem não quer escolher.
- 🖥️ **Player próprio** — tela cheia, reiniciar, abrir em outra aba e carregamento com skeleton.
- 🌗 **Tema claro e escuro** — preferência salva em `localStorage`, com respeito a `prefers-reduced-motion`.
- ⚡ **Zero dependências** — sem framework, sem bundler; só `index.html`, um CSS e dois scripts.
- ♿ **Acessível** — navegação por teclado, foco visível, `aria-live` nos resultados e textos alternativos.
- 📦 **Aba Single** — gera e baixa **o site inteiro num arquivo `.html`** (com as nove abas dentro), na hora, no seu navegador.
- 📲 **Instalável (PWA)** — manifest, ícones e service worker: dá para instalar como app e abrir offline a casca do site.
- 🛟 **À prova de falhas** — se a interface própria não carregar, o site cai automaticamente
  para a interface original do LuminSDK; se nada carregar, há um modo demonstração (`?demo`).

---

## Uma URL só, nove abas e o LuminOS por perto

**Tudo acontece em `https://suckinguptoessry.github.io/LuminSDK/`** — nada depois da última barra.

Ao abrir, o site **já cai no portal de estudos** (o disfarce). Não existe mais tela de escolha:
quem quiser o catálogo de jogos clica (ou toca) em **Ryan Smith** no rodapé dos estudos, ou usa **Shift + D** (clássico) ou **Shift + J** (impacto).
E o disfarce é **total**: em qualquer aba — LuminSDK, GN-Math, catálogos, sites, navegador, Hub e
LuminOS — a página se chama **“StudyHub | Estudos e Quiz”** e usa o logotipo do StudyHub.
O **LuminOS** não é uma aba: ele é um **site do acervo** (`dylanmc.site`), que abre no navegador do
site como qualquer outro. A escolha de modo fica só nesta sessão (`luminsdk:v1:mode`) e a URL
continua idêntica em tudo.

### Modo Fern e atalhos de navegação

A qualquer momento, **Ctrl + Alt + F** troca o layout atual por um shell com navegação lateral; a
mesma combinação volta ao **SUTS normal**, sem trocar a rota em que você estava. O botão flutuante
**Modo Fern / SUTS normal** faz a mesma coisa, e o atalho pode ser remapeado em *Configurações →
Atalhos*. É uma camada de navegação, não uma cópia do site: **Games** reutiliza o catálogo completo,
e o menu também abre GN-Math, M. G. S., DuckMath, Astra, Minecraft Mineral, Chat, Navegador, Sites,
Estudos e Hub. O menu lateral pode ser recolhido no desktop e vira gaveta no celular.

O botão global **Estudos · Shift + F** fica visível fora da aba Lumin também. Ele entra em Estudos
sem transição e, ao pressionar **Shift + F** de novo, volta à tela/ao modo Fern anterior. Ao abrir
Estudos por outra navegação, Fern também sai para preservar o layout claro e leve.

O assistente é de navegação por comandos, **não um modelo de IA**; nenhum prompt sai do navegador.
Não integrei `lucideon.top`: não encontrei API pública documentada para modelos e uma análise de
segurança lista o domínio entre os que recomenda bloquear na cobertura de uma campanha do Lucide
Proxy ([relatório JFrog](https://research.jfrog.com/post/lucide-proxy-npm-malware-campaign/)). Não é
seguro mandar conversas para lá. **Ultraviolet** também aparece como não configurado: requer arquivos
do cliente e um servidor Bare compatível; GitHub Pages não hospeda esse backend. O Navegador integrado
segue disponível para endereços que aceitam abertura direta.

| Modo | O que é |
|---|---|
| **OS** | O **LuminOS**: área de trabalho escura com papel de parede, dock, janelas que arrastam, minimizam e maximizam, atalhos na mesa e apps de verdade (Central, Perfil, Jogos, Laboratório, Estúdio, Arcade, Cofre, Comunidade, Filmes, Navegador, Sites, Chat, Notas, Calculadora, Ajustes e Sobre). |
| **Normal** | O site como sempre foi: catálogo de jogos, abas na lateral e o portal de estudos. |
Trocar de aba, buscar, filtrar favoritos, abrir as configurações, jogar, abrir os estudos, nada disso
mexe no endereço: sem `/gn/`, sem `/sites/`, sem `#/algo`, sem `?cat=`. Se você copiar a URL no meio
de um jogo, ela continua sendo só `…/LuminSDK/`.

Como isso funciona (`assets/js/app.js`):

- cada aba é um bloco `.app-view` dentro do **mesmo** `index.html`;
- o clique numa aba (ou atalho) só troca qual bloco aparece — `history` nunca é tocado;
- a aba escolhida fica em `sessionStorage` (`luminsdk:v1:start`), então recarregar a página mantém a
  aba em que você estava, ainda com a mesma URL;
- CSS e JS de cada aba são baixados **na primeira vez** que ela abre, e só a folha da aba ativa fica
  ligada (a dos estudos é clara e não vaza para o resto).

São **nove abas** na barra da esquerda, cada uma no seu papel:

As abas ficam numa **gaveta no topo**, organizadas em quatro grupos (Catálogos · Ferramentas · Jogo · Extra).
A gaveta puxa e empurra: o botão **guardar**, embaixo das abas, tira todas da tela com uma animação
subindo; a alça no topo (**⇩ abas**) traz de volta — dá para clicar ou **arrastar** nos dois sentidos.
O estado fica salvo no navegador, e cada aba ativa rola sozinha para o centro da barra.

| Grupo | Aba | O que é |
|---|---|---|
| Catálogos | **Lumin** | O catálogo principal, servido pela API do LuminSDK — como sempre foi. |
| | **GN-Math** | Biblioteca paralela com o acervo público do GN-Math: visual, ajustes, cursor, favoritos e histórico próprios. |
| | **DuckMath** | Catálogo do DuckMath **aqui dentro**: os 8 endereços da coleção, com filtro por tipo, busca e modo minimal. |
| | **Astra** | Mesma coisa com os 25 endereços da coleção Astra. |
| Ferramentas | **Sites** | As 82 coleções que abrem **dentro** do LuminSDK, num visualizador próprio. |
| | **Nav** | O **navegador** do site: barra de endereço, home com o acervo e aba limpa. |
| | **Estudos** | O StudyDesk: portal de estudos (matérias, recursos, planejador, teste rápido e FAQ). Serve de **disfarce** e de ferramenta de estudo. É a aba que abre por padrão. |
| Jogo | **Minecraft** | Abre o **Minecraft Mineral** (Java Edition no navegador, servido pelo Mantle) numa **aba de verdade** do navegador — e mostra ao vivo o peso desta aba, porque o alvo é o Edge do Xbox Series S. |
| | **Single** | Baixa **o site inteiro num arquivo `.html` só**, gerado na hora no seu navegador — com as nove abas funcionando dentro dele. |

### Catálogos de provedor (abas DuckMath e Astra)

As duas abas não jogam você para fora do site: elas montam o **próprio catálogo** com os endereços
daquela coleção em `assets/data/sites.json` (`assets/js/provider.js`).

- filtros por tipo — **Tudo, Jogos, Ports, Servidores, Cloud gaming, Visuais, Estudos** — com a
  contagem em cada chip; filtro sem nenhum item simplesmente não aparece;
- campo de busca por nome, endereço ou coleção;
- botão **Tudo / Minimal** para alternar entre grade de capas e lista compacta;
- ao clicar num item, ele abre em um iframe numa nova aba **about:blank**. O catálogo permanece aberto.

O tipo de cada item vem de um classificador por palavra-chave (nome, endereço e coleção), então pode
haver um ou outro jogo caindo em “Jogos” por padrão — é aproximado, não uma curadoria manual.

### Navegador (aba Nav)

A barra de endereço, coleções e histórico permanecem no portal. Todo endereço abre em uma nova aba **about:blank com iframe**, sem navegar a aba atual. Bloqueio de pop-up pede nova tentativa manual; CSP, login e filtros externos continuam valendo.

As pastas `gn/`, `sites/` e `study/` continuam existindo apenas como **atalhos de compatibilidade**:
quem tiver o endereço antigo salvo é levado de volta para `…/LuminSDK/` já na aba certa.

### LuminOS (modo OS)

O modo OS é uma área de trabalho de verdade dentro da mesma página:

- **janelas** arrastáveis, com minimizar, maximizar, fechar, encaixar nas laterais e posição/tamanho
  lembrados por app (no celular abrem em tela cheia);
- **dock** com dezesseis apps (em duas linhas no celular, nunca escondidos atrás de rolagem) e **atalhos** na mesa;
- **Central**: busca global (apps, jogos, sites, notas e ajuda), lançador de apps com categorias,
  fixados e mais
  usados, gerenciador de janelas (encaixar nas laterais, centralizar, cascata, fechar todas), diagnóstico
  do navegador classificado em **compatível / limitado / indisponível / não testado**, áreas de
  trabalho e janelas (focar, encaixar, mover de área), monitor de
  desempenho medido na hora (FPS, tarefas longas, memória quando exposta), mapa de armazenamento e cache
  com confirmação, ajuda interna e a página de versão;
- **papéis de parede** (aurora, meia-noite, floresta, papel) e **cor de destaque** salvos em
  `luminsdk:v1:os`;
- **controle e teclado**: com um gamepad conectado, o direcional anda pelos controles da janela ativa,
  **A** ativa e **B** fecha a janela (desligado dentro do player, onde o controle é do jogo);
- **quatro áreas de trabalho**: cada janela vive numa área (`Alt`+`1`…`4` ou o botão *Área N* no topo),
  com contagem por área, mudança de área da janela ativa e tudo salvo em `luminsdk:v1:os:ws`;
- **alternador de janelas**: `Alt`+`` ` `` percorre as janelas da área com um HUD clicável;
- **dock configurável**: ordem, apps fora do dock e auto-hide no botão *Ajustar*, salvos em
  `luminsdk:v1:os:dock`, com “restaurar padrão”;
- **atalhos remapeáveis** em *Ajustes → Atalhos internos* (conflito é recusado, `Esc` cancela, nada é
  capturado dentro de campos de texto), salvos em `luminsdk:v1:os:keys`;
- **Jogos**: os **853** títulos do acervo GN-Math (sincronizado em 08/11) **+ a variante `Granny 1 (Xbox)`**, com capa (quatro espelhos e monograma se falhar) e
  player embutido com volta ao acervo, recarregar e abrir em outra aba;
- **Navegador**: barra de endereço, home com as coleções principais e aviso honesto quando o site
  recusa ser embutido;
- **Sites**: as coleções em lista pesquisável, **dobráveis** e com **checagem de links** (abrem no Navegador);
- **Perfil**: XP, nível, conquistas, desafios diários, coleções, resenhas e retrospectiva, tudo em
  `luminsdk:player:v1` (veja `assets/js/player.js`);
- **Laboratório**: testa controle (analógicos, gatilhos, vibração), mapeia teclado e mouse, mede latência
  de entrada e faz o diagnóstico do navegador (tela, FPS, armazenamento, bateria, recursos);
- **Estúdio**: papel de parede, cor de destaque (inclusive personalizada), densidade, tipografia e os
  modos **Lite**, **Imersivo**, **sem animação** e **alto contraste**, além da **paleta de comandos**
  (`Ctrl/⌘ + K`) e da **central de avisos**;
- **avisos por categoria** no Estúdio: conquistas/XP e sistema podem ser desligados separadamente e
  categoria desligada não é gravada;
- **Arcade**: alvo rápido, roleta de jogo, desafio diário, bichinho virtual, quiz, soundboard com WebAudio
  (nada de arquivo de áudio), cronômetro, conversor de unidades e curiosidades;
- **Cofre**: backup completo em `.json` (exportar/importar), códigos por app (`LUM-PREF-…`, `LUM-PLAY-…`,
  `LUM-PET-…`), mapa de ocupação do armazenamento e o cantinho do desenvolvedor (novidades, status dos
  assets, registro de erros da sessão, preferências cruas e playground);
- **Comunidade**: coleções por código (`LUM-COLL-…`), pacotes prontos, recomendações que rodam na sua
  máquina e wishlist compartilhável — **sem** login, nuvem ou perfil público inventado;
- **Notas** (salvas no navegador), **Calculadora**, **Ajustes** e **Sobre**;
- o **chat** e a **presença** são os mesmos do resto do site.

Essas ferramentas também existem **fora do OS**: a aba **Hub** (no rail, ao lado de Sites, Nav e
Estudos) monta Central, Perfil, Laboratório, Estúdio, Arcade, Cofre e Comunidade numa moldura escura, sem
janelas nem dock — é o mesmo código (`assets/js/hub.js` chama o `render()` de cada app). A cor de
destaque, a densidade e a tipografia escolhidas no Estúdio aparecem aqui também; papel de parede e
modo imersivo continuam sendo só do desktop.

### Presença ao vivo e chat global

Duas peças flutuantes acompanham o site — e somem nos estudos, na tela de entrada e **enquanto um
jogo está aberto**, voltando quando ele fecha:

- **Contador de pessoas** no canto (`1 pessoa online`): cada aba anuncia presença a cada 15 s e o
  número conta quem apareceu nos últimos 75 s.
- **Chat global**: sem cadastro — a pessoa digita um nome e já fala. A lista guarda **100 mensagens**
  no navegador (`luminsdk:v1:chat`): quando a 101ª chega, a mais antiga sai, uma de cada vez. A
  conversa tenta viajar entre visitantes pelo relé público do `ntfy.sh`; se o relé não responder, o
  chat continua funcionando entre as abas do mesmo navegador (`BroadcastChannel`) e o painel avisa
  **“modo local”** — nunca finge que enviou.

> O site é estático (GitHub Pages), então **não existe servidor de banco de dados**: as mensagens
> ficam no navegador de quem lê e, quando o relé público está disponível, chegam a quem estiver online.
> O limite de 100 vale para essa lista.

### Aba Sites (site dentro de site)

#### Checar links (o que dá para testar de verdade)

O chip **Checar links** testa cada endereço **no seu navegador** — é o único lugar de onde dá para
alcançar esses hosts. O que ele consegue ver é *alcance*: endereço que não responde (DNS quebrado,
conexão recusada, tempo esgotado) fica marcado e **sai da lista**; o relatório diz quantos foram e
oferece **copiar a lista** (para colar aqui e remover do `sites.json` de vez) e **limpar marcações**.
O chip **mostrar os quebrados** revela os marcados, riscados e com a etiqueta *fora do ar*.

Limite honesto: o navegador não deixa ler o status de outro domínio, então **página que responde
404 continua parecendo viva** — só o que não responde é detectado. As marcações ficam no
`localStorage` (`luminsdk:v1:dead`) e podem ser refeitas a qualquer momento.


A aba Sites reúne **82 coleções / 797 links** já limpos, incluindo os espelhos novos
(Sumi, Strawberri, StudyHub, FLVER, TungTung, SolaraOS, Rook, Glim, Steobrrii, Kite e o bloco
*Other Links*: VOYA, Interstellar, DODGE, LUNAR, UTOPIA, TRIPLE T HD, SPACE, CINERA, AURORA…), sem duplicatas e com o nome certo em cada
um: **Jogos** (Eaglercraft, Frogies Arcade, GTA V Port, Subway Surfers, Super Mario 64), **Pacotes**
(Flight Academy com 34 subdomínios, C00lKid, Bagatz) e **Estudo** (Revault, Fern, Solara, Astra,
Aether, Opium, Galaxy, Duck Math, GN-Math, LuminalOS, N7x, Study do Petezah, CatClass/cat4z, Bull 33, Bonus, Aurora,
DogeUB, Tung Tung, Velara, Selenite, Cherri, Voya, Xylora, Interstellar, Utopia, Rook, Kite, mais os
espelhos agrupados por domínio: `tribeoftwo.com`, `streetdirectory.sg`, `solidaritysafaris.com`,
`rusticrivergear.com`, `nextcomm.com.ar`, `amazonaws.com`, `govt.hu`, `lirr.space` e outros).
Cada coleção tem uma **imagem própria**: arte local para LuminSDK, Links, LuminalOS, N7x, Aurora,
Solara, Galaxy V7, Revault e Petezah; logo oficial para Astra, Duck Math, Opium, Fern, Cherri e as
que já tinham — e, se a imagem não carregar, o monograma colorido assume.

Cada coleção é uma linha fechada — logo (ou monograma colorido), nome, quantidade de links e
categoria. Ao abrir, os links aparecem em grade compacta: clicar abre o site no iframe de uma **nova aba about:blank**, assim como o botão `↗`. Há busca instantânea (nome e endereço) e filtros **Tudo / Jogos /
Pacotes / Estudo** — tudo sem mexer na URL (o estado fica só na memória).

As linhas só são construídas quando a coleção abre. A aba original permanece no catálogo.

Arte da aba: `assets/img/sites-hero.jpg` (1440 px) e `sites-hero-sm.jpg` (760 px, telas pequenas).

### Aba limpa: quando o site recusa abrir aqui dentro

Muitos desses endereços enviam `X-Frame-Options`/`Content-Security-Policy` e **recusam** ser
embutidos — o iframe fica em branco e não existe código no LuminSDK capaz de contornar isso (é o
navegador obedecendo o site hospedado).

Todos os sites agora abrem sempre no iframe da nova aba `about:blank`. O botão de modo apenas indica essa política; não há fallback que navegue diretamente para o destino. Bloqueios de iframe continuam valendo e a política não os remove.

Para adicionar, renomear ou remover links, edite **`assets/data/sites.json`** — é a única fonte de
dados da aba e não precisa de build:

```json
{ "v": 2, "families": [
  { "id": "solara", "name": "Solara", "cat": "estudo", "logo": "https://…/logo.png",
    "sites": [ { "name": "solara", "url": "https://solara.polimont.com.br/" } ] }
] }
```

`cat` aceita `jogos`, `pacotes` ou `estudo`. `logo` é opcional (sem logo, a coleção ganha um monograma
com cor derivada do nome). Crédito aos links originais: **ByePassHub** (GitHub), citado no rodapé da aba.

### Aba Estudos (StudyDesk) e o disfarce

A aba Estudos é uma página **clara, de escola**, isolada do resto do site: matérias, recursos
com busca e filtro, planejador de tarefas com barra de progresso, **cronômetro de foco** (25/10/5
min), **teste rápido** de 5 perguntas com correção na hora e uma seção de **FAQ** com seis perguntas.
Nada ali puxa jogos — é só estudo mesmo, e funciona como ferramenta de verdade.

O layout segue uma grade só: cabeçalho fixo com navegação, capa com busca e um cartão de números,
seis matérias em cartões iguais (cada uma com os seus temas e um botão que já filtra o acervo),
biblioteca de recursos em lista, planejador em duas colunas com o cronômetro num cartão escuro,
teste rápido, dúvidas em duas colunas e um rodapé curto. Sem barras laterais, sem blocos soltos.

**Por padrão, o site abre nos estudos.** Uma página inicial diferente só é usada quando escolhida
explicitamente em Meu espaço (a URL continua idêntica); histórico de jogos não escolhe uma página por você. O catálogo de jogos aparece quando a pessoa:

- clica (ou toca) em **Ryan Smith** no rodapé do StudyDesk — no celular também, o botão está sempre
  aceso e clicável, ou
- aperta **`Shift` + `D`** ou **`Shift` + `J`**, os atalhos independentes que alterna entre os estudos e o site em
  qualquer aba (`Alt` + `S` foi removido).

### GN-Math: todos os servidores e o teto de 1 GB

**Granny 1 aparece duas vezes**, de propósito: `Granny 1` é o port normal do GN-Math, do jeito que a
fonte entrega, e `Granny 1 (Xbox)` é a variante com a etiqueta *Modo Xbox*, que abre avisando quando a
aba já está gasta (o teto de ~1 GB é da janela inteira). As duas abrem o mesmo arquivo com os mesmos
quatro servidores — se uma não servir, a outra está ali do lado.

Cada jogo do GN-Math tem **quatro espelhos** (jsDelivr, GitHub cru, githack, statically). A aba do jogo
abre no primeiro e mostra **Servidor 1 · 2 · 3 · 4** no canto — dá para trocar de espelho sem sair do
jogo, em vez de descobrir na tentativa e erro.

Memória também é tratada de frente, porque a aba do jogo nasce do mesmo processo desta página e o
teto do navegador é de ~1 GB (`SBOX_FATAL_MEMORY_EXCEEDED` quando estoura):

- antes de abrir um jogo, as **capas já decodificadas** e a **grade inteira do catálogo** saem do
  documento, e a **animação de fundo** pausa; voltando para a aba, tudo volta (a grade é redesenhada na
  mesma rolagem e as capas recarregam sob demanda);
- o HTML do jogo **não é mais reescrito**: a `<base>` fica no documento da aba e o `srcdoc` herda a base
  do pai (é o que a especificação define), então o jogo vai para o iframe como veio — **uma** cópia em
  vez das cinco de antes (blob → texto → texto com base → atributo → árvore do `DOMParser`). Era isso
  que fazia portes grandes como o **Granny 1** travarem por volta dos 500 MB e morrerem com
  `SBOX_FATAL_MEMORY_EXCEEDED`;
- acima de **160 MB** o arquivo é recusado com mensagem clara, em vez de derrubar a aba inteira.

**Onde o Granny 1 estourava de verdade.** O HTML dele tem 3,5 KB: o peso está no `.data` do Unity,
baixado em **29 partes** de ~20 MB (567 MB no total). O carregador original baixava as 29 em paralelo
com `Promise.all`, segurava todos os buffers, copiava tudo de novo para um `Uint8Array` e ainda criava
o `Blob` — mais de **1,2 GB de pico** para entregar um arquivo de 567 MB. Era por isso que a aba morria
por volta dos 540 MB baixados, com a tela ainda dizendo `LOADING...`.

**O que não cabe não cabe.** O pacote do Granny 1 é `UnityWebData1.0` **não comprimido**, e dentro
dele o arquivo `data.unity3d` sozinho tem **551,73 MB**. O UnityLoader 2019 precisa do pacote inteiro
na memória JS (XHR `arraybuffer`) **e** de uma cópia igual dentro do heap do WASM (MEMFS): dá
**~1,2 GB só para montar**, antes de o jogo começar. Numa janela de ~1 GB ele morre logo depois do
download — com download rápido e sem erro de rede, o que parecia "carregou e travou".

Por isso a aba do jogo **mede o pacote antes de baixar**: se o carregador declara 300 MB ou mais
(`mbTotal`), ela mostra o tamanho, o pico estimado e três saídas — *Abrir num navegador (PC)*,
*Continuar mesmo assim* e o próximo servidor — em vez de gastar 567 MB para morrer no fim. Trocar de
servidor não resolve esse caso: o limite é memória, não rede.

A montagem agora é **sequencial, parte por parte**, cada uma indo direto para um `Blob` (blob grande o
Chromium guarda em disco, não no heap). O pico cai de "uma cópia do jogo inteiro" para "uma parte":
o download consegue terminar numa janela apertada. A troca é cirúrgica — só acontece quando o HTML tem
exatamente esse padrão (`mergeFiles(getParts("…", 1, 29), "…")`), e o resto do carregador (UnityLoader,
override de XHR, barra de progresso) fica intacto.

### Aba Single — o site inteiro num arquivo só

A aba **Single** (ao lado de Estudos, no rail) baixa **um único `.html`** com o site inteiro dentro:

- **gerado na hora, no seu navegador** — nada de build, nada de servidor: o módulo lê o
  `index.html`, as 15 folhas, os 32 scripts, os dois JSON de dados (`sites.json` e
  `gnmath-games.json`) e as imagens, e embute tudo no arquivo;
- **nunca fica velho**: o que sai é exatamente o site que está no ar naquele momento (é o oposto do
  antigo `single/index.html`, que só trazia o catálogo e precisava ser regerado à mão);
- **as nove abas continuam lá** — rail, Lumin, GN-Math, DuckMath, Astra, Sites, Nav, Estudos, Hub e
  LuminOS. Cada módulo de aba viaja como texto inerte (`<script type="application/x-lumin-module">`)
  e só roda quando a aba abre, igual ao site normal;
- **dados e imagens resolvidos na memória** — os JSON são servidos por um `fetch` embutido e as
  imagens que o JS monta depois (galerias do tema, logos das coleções) são trocadas pelo `data:` na
  hora, por um `MutationObserver`;
- **duas opções**: com imagens o arquivo fica em torno de **4 MB**; sem imagens, perto de **1,5 MB**
  (a arte do tema Astolfo e as capas locais ficam de fora).

Como isso funciona por dentro (`assets/js/single.js` + `assets/js/app.js`):

- o arquivo gerado liga `window.__LUMIN_SINGLE__` e `window.__LUMIN_BUNDLE__`;
- `app.js` já tinha um caminho para arquivo único; com o bundle ele passa a ligar a folha da aba
  (`<style data-href>`, desligada por padrão para o CSS claro dos estudos não vazar) e a injetar o
  script daquela aba a partir do texto embutido;
- `?view=estudo` (ou qualquer aba) continua funcionando dentro do arquivo baixado.

Limite honesto: o arquivo **precisa ser gerado a partir do site publicado** — aberto por `file://`,
o navegador bloqueia a leitura dos arquivos. E, dentro do pacote, o catálogo (CDN do LuminSDK), as
capas do `jsdelivr` e o chat (`ntfy.sh`) continuam precisando de internet.

#### O HTML pronto (`DRAG-INTO-BROWSER.svg.html`)

Logo abaixo do cartão fica o **arquivo pronto**: o `assets/files/DRAG-INTO-BROWSER.svg.html`, salvo
**como veio**, byte por byte. É um SVG com HTML dentro, no formato "arraste para o navegador" — baixe e
arraste o arquivo para uma aba do navegador. Ele **não** passa pelo gerador acima: não é o site
embrulhado, é o original.

- **Ctrl + AltGr + P** baixa esse mesmo arquivo de qualquer tela (a combinação aparece em
  *Ajustes → Atalhos*, onde dá para remapear ou voltar ao padrão);
- **com um jogo aberto o atalho não faz nada** — no player, GN-Math, Sites, DuckMath/Astra ou no
  LuminOS jogando, as teclas são do jogo e o download fica quieto;
- no arquivo único gerado pela aba, o atalho continua funcionando: o gerador embute esses mesmos
  16 KB como `data:` e o link é trocado na hora (`window.__LUMIN_RAW__`).

### Disfarce total (sem trava de troca de janela)

O título e o ícone da aba **não são mais os do LuminSDK** em nenhum momento, nem depois de abrir o
catálogo: em toda aba do site a página se chama **“StudyHub | Estudos e Quiz”** e mostra o
`studyhub.svg`. O título é reescrito na hora se algum módulo tentar trocá-lo (o navegador interno, por
exemplo), então o nome real não aparece nem no histórico da janela.

**Não existe mais trava de troca de janela.** Trocar de aba, dar **Alt + Tab**, sair do app ou
bloquear o celular **não** muda a tela e **não** desliga o crédito “Ryan Smith”: o botão do rodapé
continua aceso e clicável em qualquer aparelho. Era essa trava que, no celular, disparava a cada troca
de app (`visibilitychange`) e deixava o crédito apagado e sem ação.

- **`Ctrl` + `AltGr` + `H`** (o AltGr do Windows chega como Ctrl+Alt) mostra o título e o ícone reais;
  é opcional e só serve para quem quiser ver o nome verdadeiro da página.
- O disfarce (título/ícone do StudyHub) continua valendo em todas as abas do site.
- A chave antiga da trava (`luminsdk:v1:shield`) é apagada na inicialização.

| Ação | O que acontece |
|---|---|
| abrir `…/LuminSDK/` | cai nos estudos |
| **`Shift` + `D`** | alterna estudos ⇄ site com a animação clássica |
| **`Shift` + `J`** | alterna estudos ⇄ site com a seleção aplicada no Astolfo; espaço-tempo no minimalista |
| Aba **Estudos** na barra da esquerda | abre os estudos |
| clicar/tocar em **Ryan Smith** no rodapé dos estudos | abre a escolha Normal / OS (desktop e celular) |
| aba **Lumin** na barra da esquerda | abre o LuminSDK |
| **Alt + Tab** / **Windows + Tab** / trocar de app | nada muda: a tela continua onde está |
| **`Ctrl` + `AltGr` + `H`** | mostra o título e o ícone reais e abre o catálogo |

A URL **nunca** muda ao trocar de aba. Endereços antigos (`/gn/`, `/sites/`, `/study/`) continuam
funcionando: eles redirecionam para `?view=…`, o app abre a aba pedida e limpa a barra de endereço na
mesma hora — reabrir o site depois cai, de novo, nos estudos.

O título/ícone e os atalhos vivem em `assets/js/app.js` (o mesmo arquivo que
troca de aba); a saída por clique fica em `assets/js/study.js` e o menu Normal/OS em `assets/js/lcore.js`. A versão de arquivo único (`single/index.html`) **não**
tem estudos — é sempre o catálogo de jogos. Cada arquivo é independente: nada do StudyDesk vaza para
o visual escuro do LuminSDK.

### Tema Astolfo: quatro fundos

O tema tem **quatro papéis de parede**, todos na mesma paleta e com o retrato na direita (o véu escuro
cobre a esquerda, onde fica o conteúdo): **Retrato** (o original), **Varanda ao luar**, **Jardim de
cerejeiras** e **Biblioteca à noite**. A escolha é sorteada na primeira visita, fica salva em
`localStorage` e o botão **Trocar fundo**, no cartão do tema, passa para o próximo. O CSS guarda as
quatro numa variável (`--ast-wall`) e o JS só troca o atributo `data-ast-wall` do `<html>`.

Os três fundos novos foram **gerados com IA** no estilo do original — as quatro ilustrações humanas
(MIT) do cartão e da galeria continuam como estavam, e nenhuma delas virou imagem gerada. No arquivo
único as quatro apontam para a arte leve embutida (o build não carrega 4 fundos em base64).

### Transições: minimalista e Astolfo

**Minimalista:** toda navegação animada usa somente o espaço-tempo original, com relógio e anéis,
**sem shake ou impacto**. Escolher outro estilo guarda a preferência para o Astolfo, sem injetar
esse efeito no minimalista. A chave geral e a opção Sem efeito continuam permitindo desativar animações.

**Astolfo:** a opção aplicada em **Personalizar → Transições** vale para **cliques, prévia e Shift + J**.
Não há mais um Impacto fixo escondido no atalho. Opções: Clássica, Impacto, **Cinema**, **Prisma**,
Suave, Deslizar e Sem efeito. Cinema e Prisma são cortes contínuos de 900 ms, sem strobe ou shake.
Shift + D continua sendo o atalho do espaço-tempo original.

- A escolha é salva imediatamente (`luminsdk:transition:v1`); não é preciso apertar Testar para aplicar.
- Modo leve e microanimações da interface não encurtam as transições.
- No Impacto, o coração só aparece durante o blackout com Astolfo. Flash e tremor são ajustáveis
  separadamente em Meu espaço. A preferência de movimento reduzido do sistema nunca é ignorada.
- Teclas em campos editáveis e durante jogos são protegidas. Trocas rápidas cancelam a camada anterior.
- Ryan Smith continua discreto e abre a escolha Normal / OS. Cloak, iframe dos jogos e cursor não mudam.

### Meu espaço: visual, conforto e uso pessoal

A terceira aba de Personalizar e o painel do catálogo oferecem **17 preferências locais**:

- Apelido e nota fixada, usados como texto seguro no painel; não criam conta nem perfil público.
- Direção visual Astolfo **Edit** (tipografia editorial, gradientes e cartões com profundidade),
  **Glass** ou **Clean/original**. O minimalista não recebe a camada cinematográfica.
- Texto padrão/110%/120%, alto contraste, conteúdo confortável/amplo, capas e modo foco sem chat flutuante.
- Página inicial explícita: Estudos (padrão), Catálogo, LuminOS ou Hub. Escolhas de modo da sessão OS continuam válidas.
- Relógio 12/24 h, painel opcional, barra de meta, meta de 30/60/120 min, contador pausável e lembretes
  opcionais a cada 20/40/60 min ativos. Conta apenas o portal visível, não abas externas. Não fecha jogos.
- Acesso rápido pesquisável por **Ctrl/Cmd + K** ou botão, sem capturar atalhos em jogos/campos editáveis.
- Exportação JSON e reset **só** do perfil/contador. Favoritos, dados dos jogos e estudos são preservados.

Preferências em `luminsdk:personal:v1`; contador do dia em `luminsdk:session:v1`. O módulo não envia
esses dados a servidor. Limpar o armazenamento do navegador os remove. Código em `personal.js` e
`personal.css`, também embutido na versão única. Isso não substitui contas online de serviços externos.

### Estudos ampliados: aprender, praticar e revisar

O StudyHub inclui **650 questões únicas com respostas explicadas**, **30 resumos** e **30 cartões**,
com matemática, português, ciências, história, geografia e vida prática. As questões adicionais
incluem exercícios numéricos calculados localmente e perguntas conceituais; não dependem de IA ou API.

- **Resumos:** conceito, exemplo resolvido e erro comum, com busca sem acentos, filtro por matéria,
  favoritos e marcação de leitura.
- **Cartões:** pense antes de virar; marque “já sei” ou “preciso revisar” e filtre os pendentes.
- **Oficina:** exercícios numéricos com resposta digitada, dicas graduais e resolução; guia de ajuda
  para contas, interpretação, memória, organização e preparação para provas.
- **Quiz:** treino com explicação imediata, simulado com correção apenas no fim e desafio diário
  com seleção estável de 10 questões por dia/filtro. Rodadas podem ter 10, 20, 40 ou 60 perguntas.
- **Progresso:** resumos, cartões, oficina e últimas 30 rodadas ficam neste navegador, sem cadastro.
  O botão de reset dos estudos não apaga o planejador nem dados dos jogos.
- Dados e UI: `study-questions.js`, `study-content.js`, `study.js` e `study-plus.js`.

### Abertura em about:blank (o site dentro de um iframe)

**Nada abre sozinho.** O portal não migra mais por conta própria: ao carregar, aparece um botão branco no
**canto inferior direito — “Abrir em About:Blank”** — que fica **5 segundos** na tela e some. Só se
você tocar nele o site vai para uma aba em branco (com o portal num iframe em tela inteira) e a aba
original é mandada para **`https://www.google.com/`**, com a aba nova tentando fechar a original após
`CONFIG.CLOSE_DELAY` (1 segundo).

- **A vida do botão** é `CONFIG.BUTTON_MS` (5000 ms). Depois disso ele sai com transição e não volta
  sozinho; `LuminCloak.show()` traz de novo e `LuminCloak.hide()` tira na hora.
- **Restrições do navegador:** pop-ups podem exigir um gesto e uma aba aberta pela barra de endereço
  pode recusar o fechamento. Nesse caso, a aba original permanece no Google; não há como forçar isso.
- **Pop-up barrado:** a página não sai do lugar e o próprio botão explica — *“Pop-up barrado — permita
  pop-ups e toque de novo”* — em vez de sumir sem deixar rastro.
- **Sem recursão:** dentro do iframe (`self !== top`), o módulo não abre outra cópia do portal.
- **Jogos em outra aba:** os botões dos players Lumin, GN-Math, LuminOS e DuckMath/Astra também
  abrem uma aba `about:blank`, mas com **o jogo** no iframe. O portal permanece aberto.
  A URL do SDK pode ser resolvida depois do clique sem perder a aba já reservada.
- **Limites dos jogos:** `about:blank` não remove bloqueios de incorporação (CSP/X-Frame-Options).
  Alguns jogos, como YouTube Playables, podem não funcionar nesse modo.
- **Cache:** as versões dos assets e do service worker são atualizadas junto com a publicação;
  `app.js` recarrega uma vez quando detecta uma versão diferente na sessão.
- **Diagnóstico:** `?cloak=0` desliga a migração do portal. `window.LuminCloak.state()` consulta o
  estado e `window.LuminCloak.open()` permite tentar novamente.
- **Arquivo único:** `single/index.html` não migra o portal, mas inclui o helper dos jogos para
  manter o comportamento de abrir jogos em iframe dentro de `about:blank`.

A aba **GN-Math** é uma página separada, não um tema, mas organizada como a biblioteca do LuminSDK:
cabeçalho com busca, filtros em chips, ordenação, grade responsiva de capas quadradas com nome
legível (nada de texto miúdo sobre imagem grande), favorito, “continuar jogando” e um player que abre
o jogo em about:blank — abrir um jogo não mexe na URL da aba original. O visual é próprio: fundo de grafite com grade,
cursor desenhado e painel de ajustes só dela (cor de destaque, fundo, cursor, densidade, efeitos,
movimento).
As preferências ficam em `gnmath:v1:*`, separadas de `luminsdk:v1:*` — mudar uma aba não mexe na outra.

Os jogos do GN-Math são carregados do CDN público do projeto (`freebuisness/html`), com as capas de
`freebuisness/covers`. Para atualizar a lista:

```bash
python3 tools/gnmath-sync.py          # baixa o zones.json e regrava assets/data/gnmath-games.json
```

Cada jogo abre pelo endereço público em um iframe na nova aba **about:blank**, renderizando HTML de CDNs de arquivos quando necessário. A aba original permanece no catálogo. Essa política também vale para Lumin e LuminOS; o SDK tem sua URL resolvida depois de reservar a aba durante o clique. Capas continuam com fallback de monograma.

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
python3 tools/single-file.py             # gera single/index.html (~380 KB)
python3 tools/single-file.py --out /tmp/luminsdk.html
```

O resultado abre direto no navegador, sem servidor e sem build. O único item externo é o
script do LuminSDK no CDN (as fontes do Google são opcionais e têm fallback).

O arquivo único traz **só a aba Lumin** (o catálogo): a tela de entrada, o LuminOS, o rail de abas,
o chat e as views GN-Math/Sites/Estudos/Nav ficam de fora, porque dependem de CSS e JS carregados
por aba. Assim nada quebra e nenhuma aba fica sem estilo.

> **Sobre o Pastebin:** o raw do Pastebin é entregue como `text/plain`, então o navegador
> mostra o código em vez da página. Para ter uma URL que realmente abre o site, use Gist +
> `raw.githack.com`, CodePen, JSFiddle ou o próprio GitHub Pages.

A versão gerada fica publicada em [`single/`](single/) →
`https://suckinguptoessry.github.io/LuminSDK/single/`.

---

## Estrutura do projeto

```text
LuminSDK/
├── index.html                  # O SITE INTEIRO: todas as abas em uma página só
├── 404.html                    # Página de erro personalizada
├── assets/
│   ├── css/
│   │   └── styles.css          # Design system, tema claro/escuro e componentes
│   ├── js/
│   │   ├── library.js          # Interface de jogos, favoritos, histórico e cores por jogo
│   │   ├── settings.js         # Personalização (21 opções), perfis e sugestão
│   │   ├── progress.js         # Estatísticas do jogador e conquistas
│   │   ├── site.js             # Tema, animações, PWA e cópia do snippet
│   │   ├── cloak.js            # Abre o portal em about:blank (site dentro de um iframe)
│   │   ├── anim.js             # Animação de troca de aba (tempo/relógio), editável no CONFIG
│   │   ├── atmosphere.js       # Paleta, partículas, parallax e cursor
│   │   ├── bonus.js            # Central de bônus: controle, rede, cache, estatísticas e conquistas
│   │   ├── app.js              # Aba única: rotas por sessionStorage, carrega cada aba sob demanda
│   │   ├── os.js               # LuminOS: janelas, dock e apps (jogos, navegador, sites, notas…)
│   │   ├── player.js           # LuminPlayer: XP, conquistas, coleções e sessões
│   │   ├── profile.js          # App Perfil (hub do jogador)
│   │   ├── lab.js              # App Laboratório (controle, teclado/mouse, latência, diagnóstico)
│   │   ├── studio.js           # App Estúdio (tema, modos, paleta Ctrl+K, avisos)
│   │   ├── arcade.js           # App Arcade (alvo, bichinho, quiz, sons, cronômetro, conversor)
│   │   ├── vault.js            # App Cofre (backup, códigos, dados e área do desenvolvedor)
│   │   ├── community.js        # App Comunidade (coleções por código, recomendações, wishlist)
│   │   ├── central.js          # App Central (busca, janelas, diagnóstico, desempenho, dados, ajuda)
│   │   ├── hub.js              # Aba Hub: monta os apps do OS dentro do site normal
│   │   ├── social.js           # Presença, chat global e canal de comandos (painel)
│   │   ├── browser.js          # Navegador: barra de endereço, home e aba limpa
│   │   ├── provider.js         # Catálogos DuckMath/Astra: filtros, busca, minimal e player
│   │   ├── gnmath.js           # Aba GN-Math (catálogo + player, com espelhos de CDN)
│   │   ├── sites.js            # Aba Sites (coleções + visualizador + aba limpa)
│   │   ├── single.js           # Aba Single (monta o site inteiro num .html e baixa)
│   │   ├── keybinds.js         # Atalhos remapeáveis (Fern Ctrl+Alt+F, Estudos Shift+F)
│   │   ├── fern.js             # Shell lateral Fern + assistente local (sem backend de IA)
│   │   └── study.js            # Aba Estudos (busca, planejador, cronômetro, teste rápido)
│   ├── css/app.css             # Casca do app de aba única (mostra/esconde a view)
│   ├── css/fern.css            # Shell lateral, assistente local e layout responsivo
│   ├── css/anim.css            # Funil, anéis de relógio, ponteiro e grade da animação de aba
│   ├── css/hub.css             # Aba Hub: moldura, chips e palco dos apps do OS
│   ├── css/provider.css        # Catálogos DuckMath/Astra: chips, grade, lista minimal e player
│   ├── css/single.css          # Aba Single: cartão do download, progresso e passos
│   ├── data/
│   │   └── sites.json          # Dados da aba Sites: 67 coleções / 749 links
│   └── img/                    # Marca, ícones do PWA, banner social e arte da aba Sites
├── gn/ · sites/ · study/       # Atalhos antigos: redirecionam para a URL única
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

### Jogos de outros sites (Endereços próprios)

Alguns títulos não rodam no player do LuminSDK e sim num site externo. Esses casos ficam em
`CONFIG.customSources`, no topo de `assets/js/library.js`:

```js
customSources: [
  {
    id: 'selenite/undertale',
    name: 'undertale',
    url: 'https://toby.booksforschool.online/index.html#z4x',
    label: 'Toby Web'
  }
]
```

O jogo é reconhecido pelo `id` do catálogo, pelo **nome exato** e, por fim, pelo nome sem os
sufixos entre parênteses/colchetes (`Undertale (PC)` → `undertale`). `Undertale Yellow` e
`Friday Night Funkin vs Undertale` têm nomes diferentes e continuam abrindo no player normal.

O **Undertale** tem uma regra a mais: se o catálogo entregar um endereço do GN-Math
(`gn-math.github.io`) para ele, o `library.js` troca pelo endereço do Toby antes de montar o iframe —
o jogo nunca abre no GN-Math, sempre no nosso player com o site do Toby dentro. Ao abrir um desses
títulos, o cabeçalho do player mostra um selo (ex.: “Toby Web”) com o domínio de destino na dica de
tela; se a página não carregar no iframe, o botão “abrir em outra aba” resolve.

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
| Sugestão personalizada | `buildSuggestion()` em `assets/js/settings.js` |
| Conquistas e metas | `ACHIEVEMENTS` em `assets/js/progress.js` |
| Desafios diários | `dailyChallenges()` em `assets/js/progress.js` |
| Recomendações | `preferredCategories()` em `assets/js/library.js` |
| Cor padrão do site | `--accent` em `:root` (`assets/css/styles.css`) |
| Tema Astolfo (cores, estampas, cada aba) | `assets/css/astolfo.css` |
| Atalho e estado do tema Astolfo | `assets/js/astolfo.js` (`LuminAstolfo`) |
| Vento do papel de parede (Astolfo) | `@keyframes ast-wind` / `ast-wind-dust` em `assets/css/astolfo.css` |
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

### Bônus (ferramentas extras)

O botão **Bônus**, no cabeçalho, abre uma central de ferramentas que rodam 100% no navegador:

- **Testador de controle** — mostra em tempo real cada botão, gatilho e analógico do controle
  conectado (Gamepad API por *polling*), com zona morta ajustável, leitura bruta e teste de vibração
  quando o controle e o navegador oferecem suporte. Feito pensando no **navegador do Xbox (Edge)**:
  nada de Web Bluetooth, WebUSB, Keyboard Lock ou APIs experimentais.
- **Monitor de conexão** — estado online/offline, tipo de rede, velocidade e latência estimadas
  (quando o navegador informa) e um teste de latência real contra o próprio site.
- **Gerenciador de cache** — espaço usado, caches guardados, estado do service worker, botão para
  procurar atualização e limpeza segura (com recarga).
- **Desafios do dia** — três metas que mudam à meia-noite, com barra de progresso e a sequência de
  dias em que você fechou as três.
- **Estatísticas** — partidas, tempo total, jogos e categorias, sequência de dias, gráfico dos
  últimos 7 dias, mais jogados e um botão para zerar tudo.
- **Conquistas** — 17 medalhas com progresso, desbloqueio automático e um *toast* quando cai
  alguma (as secretas só revelam a dica depois de conquistadas).

O painel lista só o que já funciona. A próxima leva — coleções, início rápido, layout dos jogos,
modo imersivo e backup completo — entra nas próximas atualizações.

### O que fica no navegador

| Salvo pelo site | Detalhe |
|---|---|
| Favoritos | lista com nome, categoria e capa |
| Histórico | últimos 10 jogos abertos |
| Contagem de partidas | usada pela ordenação “Mais jogados” |
| Cores por jogo, grade, tema e paleta | preferências |
| Personalização (`luminsdk-settings`) | 21 opções de aparência e desempenho |
| Estatísticas, conquistas e desafios (`luminsdk:progress:v1`) | partidas, tempo, dias, categorias, medalhas e metas do dia |
| Recomendações ocultas (`luminsdk:v1:reco-hidden`) | lembra que você escondeu o trilho hoje |
| Backup | exporta/importa tudo em JSON |

O **progresso dentro do jogo** pertence ao jogo e roda em outro domínio: por segurança, o navegador
impede que o site leia ou grave esse estado. Quem salva é o próprio jogo (muitos fazem isso
automaticamente). O site não tem — e não finge ter — acesso a isso.

### Personalização e desempenho

O botão de engrenagem abre o painel **Personalizar**, com **21 opções**:

- **Sugestão para você** — o site lê o aparelho (núcleos, memória, economia de dados, tela pequena,
  `prefers-reduced-motion`) e o seu histórico local (partidas, jogos diferentes, sequência de dias) e
  propõe uma combinação com os motivos listados. Um clique aplica; outro ignora.
- **Tema e cor** — claro/escuro e 16 cores prontas (incluindo quatro Y2K: cromado, cyber, aqua e
  bubblegum); a cor recalcula destaque, gradientes, brilhos, partículas e cursor.
- **Estilo** — fonte (Inter, Grotesk ou Mono), cantos (retos, suaves ou bolha), densidade
  (confortável/compacta) e velocidade das animações (lentas/normais/rápidas).
- **Estilo Y2K** — pacote completo ou efeito por efeito: títulos cromados, botões de vidro, cantos de
  bolha, neon, glow, estrelas, bolhas e scanlines.
- **Desempenho** — partículas, parallax, cursor, animações, desfoques, hover, grade e ruído;
  **Detectar automático**, **Modo leve** e **Tudo ligado** em um clique.
- **Meus dados** — exportar backup, importar e apagar tudo, com o resumo do que está guardado.
- **Estilo especial — Astolfo** — tema completo (SFW) para o site inteiro, ligado no fim do painel ou
  com **Ctrl + AltGr + Y**; a mesma combinação devolve o estilo minimalista.

As escolhas são aplicadas antes da página pintar (sem piscar) e ficam em `luminsdk-settings`.

As partículas também se ajustam sozinhas: limite de ~40 fps, menos pontos em máquinas fracas, pausa
quando a aba fica oculta e conexões calculadas por grade espacial (sem custo quadrático).

Efeitos e cursor ficam **ligados por padrão** em qualquer aparelho: quem quiser desliga no painel, um
por um. Com `prefers-reduced-motion`, o site para de animar sozinho mas continua respondendo ao
mouse (brilho, laços e cursor), sem transições. Preferências antigas (formato anterior) são
descartadas na primeira carga para ninguém ficar com efeitos desligados sem saber.

### Links e compartilhamento

O endereço do site é **um só** (`…/LuminSDK/`): busca, filtro, página, favoritos e jogo aberto **não**
vão para a URL. O botão **compartilhar** do player copia o endereço do site — quem abrir cai na mesma
porta de entrada (os estudos) e pode jogar pelo catálogo.

### Modo demonstração

Adicione `?demo` à URL (`.../LuminSDK/?demo`) para ver a interface com cards de exemplo, sem
depender do catálogo. Útil para desenvolver o layout offline.

### Tema Astolfo (opcional, SFW)

Uma camada de personalidade que veste **todas as abas** com a paleta do Astolfo — rosa, preto e um
branco quente — sem mudar o padrão de quem não liga:

- **Como ligar:** fim do painel **Personalizar** (Configurações → *Estilo especial*) ou o atalho
  **`Ctrl` + `AltGr` + `Y`** (no Windows/Linux o AltGr chega como Ctrl+Alt; no Mac use
  `Control` + `Option` + `Y`). A mesma combinação desliga e devolve o minimalista.
- **Fica salvo** em `luminsdk:astolfo` (`on`/`off`), então a escolha sobrevive a recarregar a página.
- **O que muda:** faixa de bandeirinhas no cabeçalho, marca com laço, barra lateral preta de borda rosa,
  botões/chips/foco/seleção em rosa, cartões com moldura rosa, estudos em rosa-papel, catálogo e GN-Math
  em rosa-noite, navegador com borda listrada, rolagem rosa, estrelinhas no fundo e uma comemoração
  rápida ao ligar/desligar. O seletor de cores da paleta continua salvo e volta a valer quando o tema é
  desligado.
- **Preview sem ligar:** botão **Ver como fica** no cartão do tema abre um visualizador com a arte, as
  cores e a lista do que muda. O CSS inteiro está em `assets/css/astolfo.css` (só age com
  `html[data-skin="astolfo"]`) e o motor em `assets/js/astolfo.js`
  (`window.LuminAstolfo.{on,off,toggle,state}`).
- **SFW:** só cores, tipografia, laço, estrela, xadrez e listras. Nada de conteúdo adulto.
- **Arte 100% humana, nenhuma imagem de IA:** quatro ilustrações recortadas de projetos **MIT** do
  GitHub — [Doki Theme](https://github.com/doki-theme/doki-theme-web),
  [astolfo-dex](https://github.com/DarkCh4osss/astolfo-dex) e
  [Hyprland-dotfiles-astolfo](https://github.com/jujuffm/Hyprland-dotfiles-astolfo) — mais laço,
  estrela, coração, xadrez e listras desenhados em SVG no próprio projeto. Créditos, licença e como
  pedir remoção estão em `assets/img/astolfo/CREDITS.md`.
- **Galeria:** o botão **Ver como fica** mostra a arte grande e quatro miniaturas (close-up, dia a dia,
  roxo e cavaleiro); dá para trocar a arte grande por ali, e **tocar no avatar do cartão** passa para a
  próxima. A última escolhida fica salva.
- **Papel de parede (onde fica):** `assets/img/astolfo/astolfo-wall-1920.jpg` — e a versão de celular,
  `astolfo-wall-1280.jpg`. A regra está em `assets/css/astolfo.css`, no seletor
  `html[data-skin="astolfo"] body::before` (camada fixa atrás de tudo, com véu de degradê; mais forte à
  esquerda, onde fica o texto). No painel **Estilo especial** tem uma miniatura da imagem: tocar nela
  abre a arte inteira e mostra o caminho do arquivo.
- **Animação de troca de aba no clima do tema:** a clássica mantém relógio e anéis em rosa/lilás; o impacto mantém preto sólido e flash branco. Movimento reduzido e conforto visual continuam disponíveis.
- **Aba de estudos:** o tema cobre os componentes do StudyDesk (busca, campos, hover de matéria/tarefa,
  opções do quiz, painel "nesta semana", barras de progresso, botão do CTA e o cronômetro, que sai do
  azul-marinho para ameixa com barras rosa). Verde de acerto e vermelho de erro ficam intactos.

### Perfil: nome e foto

No **Perfil** (app do LuminOS) o cabeçalho tem três botões: **Mudar nome**, **Mudar foto** e
**Avatar de cor**. A foto escolhida é recortada em quadrado, reduzida para 256 px e guardada no
`localStorage` junto do resto do perfil (nada sai do navegador); imagens acima de 8 MB são recusadas
antes do recorte, e o resultado é limitado a ~700 KB para caber na cota. **Avatar de cor** volta para o
mosaico de iniciais (8 variações).

### Atalhos de teclado

O site **não tem atalhos de teclado de navegação**: nem `F` (tela cheia), nem `R` (jogo aleatório),
nem `/` ou `Ctrl`+`K` (busca), nem `?` (configurações). Tudo isso é feito pelos botões da interface,
para que nenhuma tecla seja roubada do jogo: com o player aberto, todas as teclas (WASD, setas,
espaço, Enter, F, números…) vão para o jogo.

Existem só **quatro combinações**, todas opcionais e remapeáveis em *Ajustes → Atalhos*:

| Atalho | O que faz | Com jogo aberto |
| --- | --- | --- |
| `Ctrl` + `AltGr` + `Y` | liga/desliga o tema Astolfo | vale (é só visual, não rouba tecla do jogo) |
| `Ctrl` + `AltGr` + `H` | sai do disfarce (título e ícone reais) | vale |
| `Ctrl` + `AltGr` + `P` | baixa o `DRAG-INTO-BROWSER.svg.html` | **não faz nada** |
| `Shift` + `D` | alterna estudos ⇄ site | não faz nada |

A exceção do `AltGr` é de propósito: no teclado ABNT2, `AltGr` já é `Ctrl`+`Alt`, então a combinação
funciona tanto com `AltGr` quanto com `Ctrl` + `Alt` comuns.

---

## Acessibilidade e desempenho

- Estrutura semântica com landmarks, `aria-live` no status e nos resultados, e *skip link*.
- Navegação completa por teclado, com `:focus-visible` visível em todos os controles.
- Imagens de capa carregadas por `IntersectionObserver` (só o que está perto da tela).
- CSS e JS sem dependências: nenhum framework, nenhuma fonte bloqueante além do Google Fonts
  (com *fallback* para fontes do sistema).
- Respeito a `prefers-reduced-motion` e suporte nativo a tema claro/escuro.

### Leveza (mesmo visual, menos trabalho)

Nada aqui mudou a aparência: as otimizações foram feitas por baixo do capô.

| O que | Antes | Depois |
|---|---|---|
| Ícones do PWA e da marca | 292 KB | **87 KB** (PNG em 256 cores, erro médio ~2/255) |
| Primeira visita (HTML + CSS + JS + imagens) | ~647 KB | **~446 KB** |
| Pré-cache do service worker | ~700 KB baixados no `install` | **~330 KB** (só a casca essencial; o resto entra on-demand) |

- **Cards reaproveitados:** busca, filtro e paginação não reconstroem mais a grade inteira — os cards
  que continuam na lista são os mesmos nós do DOM, então não há nova requisição de capa nem “piscada”.
- **Cursor:** o laço de animação só roda enquanto o anel ainda está alcançando o ponteiro (parado,
  zero frames).
- **Partículas:** pausam automaticamente enquanto um jogo está aberto — a CPU fica com o jogo.
- **Player:** o desfoque de tela cheia é desligado durante o jogo, que é justamente quando a GPU é
  mais necessária.
- **Abaixo da dobra:** FAQ, open-source e rodapé usam `content-visibility: auto`, então não são
  medidos nem desenhados antes de chegarem perto da tela.

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
