/* =========================================================
   LuminSDK — aplicativo de URL única
   Tudo vive em UMA página: …/LuminSDK/  (nada depois da barra).

   · as "abas" (Lumin, GN-Math, Sites, Estudos) são trocadas aqui dentro,
     sem mexer no endereço — nada de /gn, /sites, #/gn, ?cat=…
   · o site abre nos estudos por padrão. Uma página inicial diferente
     só é usada quando escolhida explicitamente em Meu espaço
   · o catálogo aparece quando a pessoa clica em "Ryan Smith" no rodapé do
     portal de estudos (ou Shift + J)
   · não existe mais trava de troca de janela: sair do app (Alt+Tab, trocar
     de aba, bloquear o celular) não muda a tela nem desliga o crédito — no
     celular era isso que sumia com o botão "Ryan Smith"
   · minimalista usa espaço-tempo sem shake; no Astolfo, a seleção
     aplicada também é usada por Shift+J (assets/js/anim.js)
   · endereços antigos (/gn/, /sites/, /study/) continuam funcionando pelo
     ?view=…, e a barra de endereço é limpa logo depois
   · cada aba carrega o seu CSS e os seus scripts só na primeira visita

   Sem bibliotecas, sem build.
   Autor: Ryan Smith · Licença MIT
   ========================================================= */
(function () {
  'use strict';

  const ROUTES = {
    lumin: {
      title: 'LuminSDK — mais de 1.100 jogos no seu navegador',
      /* só o script; o CSS da animação é global (index.html) para não ser
         desligado quando a rota muda */
      css: [],
      scripts: [
        'assets/js/anim-classic.js?v=71',
        'assets/js/anim.js?v=71',
        { src: 'https://cdn.jsdelivr.net/gh/luminsdk/script@latest/lumin.min.js', attrs: { 'data-lumin-sdk': '' } },
        'assets/js/library.js?v=71',
        'assets/js/settings.js?v=71',
        'assets/js/site.js?v=71',
        'assets/js/atmosphere.js?v=71',
        'assets/js/progress.js?v=71',
        'assets/js/bonus.js?v=71'
      ]
    },
    gn: {
      title: 'GN-Math — mais de 840 jogos | LuminSDK',
      css: ['assets/css/gnmath.css?v=71'],
      scripts: ['assets/js/gnmath.js?v=71'],
      html: {
        'data-gn-accent': 'grafite',
        'data-gn-bg': 'lisa',
        'data-gn-cursor': 'personalizado',
        'data-gn-density': 'confortavel',
        'data-gn-fx': 'off',
        'data-gn-motion': 'auto'
      }
    },
    mgs: {
      title: 'M. G. S. — Multiple Games Sources | LuminSDK',
      css: ['assets/css/mgs.css?v=71'],
      scripts: ['assets/js/mgs.js?v=71']
    },
    provider: {
      title: 'Catálogo — aqui dentro | LuminSDK',
      css: ['assets/css/provider.css?v=71'],
      scripts: ['assets/js/provider.js?v=71', 'assets/js/atmosphere.js?v=71']
    },
    sites: {
      title: 'Sites — coleções que abrem aqui dentro | LuminSDK',
      css: ['assets/css/sites.css?v=71'],
      scripts: ['assets/js/sites.js?v=71', 'assets/js/atmosphere.js?v=71']
    },
    browser: {
      title: 'Navegador — abrir sites aqui dentro | LuminSDK',
      css: ['assets/css/browser.css?v=71'],
      scripts: ['assets/js/browser.js?v=71', 'assets/js/atmosphere.js?v=71']
    },
    os: {
      title: 'LuminOS — área de trabalho | LuminSDK',
      css: [],
      scripts: [
        'assets/js/player.js?v=71',
        'assets/js/os.js?v=71',
        'assets/js/profile.js?v=71',
        'assets/js/lab.js?v=71',
        'assets/js/studio.js?v=71',
        'assets/js/arcade.js?v=71',
        'assets/js/vault.js?v=71',
        'assets/js/community.js?v=71',
        'assets/js/central.js?v=71',
        'assets/js/atmosphere.js?v=71'
      ]
    },
    hub: {
      title: 'Hub — perfil, laboratório, estúdio, arcade, cofre e comunidade | LuminSDK',
      css: ['assets/css/os.css?v=71', 'assets/css/hub.css?v=71'],
      scripts: [
        'assets/js/player.js?v=71',
        'assets/js/os.js?v=71',
        'assets/js/profile.js?v=71',
        'assets/js/lab.js?v=71',
        'assets/js/studio.js?v=71',
        'assets/js/arcade.js?v=71',
        'assets/js/vault.js?v=71',
        'assets/js/community.js?v=71',
        'assets/js/central.js?v=71',
        'assets/js/hub.js?v=71'
      ]
    },
    boot: {
      title: 'LuminSDK — escolha como entrar',
      css: [],
      scripts: ['assets/js/atmosphere.js?v=71']
    },
    estudo: {
      title: 'StudyHub | Estudos e Quiz',
      css: ['assets/css/study.css?v=71'],
      scripts: ['assets/js/study-questions.js?v=71', 'assets/js/study-content.js?v=71', 'assets/js/anim-classic.js?v=71', 'assets/js/anim.js?v=71', 'assets/js/study.js?v=71', 'assets/js/study-plus.js?v=71']
    },
    single: {
      title: 'Single — baixar o site inteiro num arquivo | LuminSDK',
      css: ['assets/css/single.css?v=NN'],
      scripts: ['assets/js/single.js?v=NN', 'assets/js/atmosphere.js?v=NN']
    }
  };

  const GN_ATTRS = ['data-gn-accent', 'data-gn-bg', 'data-gn-cursor', 'data-gn-density', 'data-gn-fx', 'data-gn-motion'];
  const REVEAL = 'luminsdk:v1:reveal';
  const START = 'luminsdk:v1:start';
  const MODE = 'luminsdk:v1:mode';

  /* arquivo único: tudo já vem embutido no próprio HTML.
     · SINGLE  → é um .html solto (nada é buscado no servidor)
     · BUNDLE  → foi gerado pela aba Single: as folhas viram <style
       data-href> e cada script de aba viaja como texto inerte em
       <script data-module>, executado só quando a aba abre */
  const SINGLE = !!window.__LUMIN_SINGLE__;
  const BUNDLE = SINGLE && !!window.__LUMIN_BUNDLE__;

  const loadedCss = {};
  const loadedScripts = {};
  let current = '';

  function readMode() {
    try { return sessionStorage.getItem(MODE) || ''; } catch (error) { return ''; }
  }

  function writeMode(mode) {
    try {
      if (mode) sessionStorage.setItem(MODE, mode);
      else sessionStorage.removeItem(MODE);
    } catch (error) { /* modo privado sem storage */ }
  }

  /* endereços antigos (/gn/, /sites/, /study/) chegam com ?view= — só aí a
     aba pedida é respeitada; abrir o site normalmente cai sempre nos estudos */
  function routeFromUrl() {
    try {
      const view = new URLSearchParams(window.location.search).get('view');
      return view && ROUTES[view] ? view : '';
    } catch (error) {
      return '';
    }
  }

  function initialRoute() {
    /* arquivo único: abre no catálogo, mas respeita ?view=… (endereço
       antigo salvo, atalho, teste) */
    if (SINGLE) return (BUNDLE && routeFromUrl()) || 'lumin';

    const asked = routeFromUrl();
    if (asked) return asked;

    /* o disfarce vem SEMPRE primeiro, mesmo com histórico ou preferências
       salvas: nada de reabrir na última aba usada */
    const mode = readMode();
    if (mode === 'os') return 'os';

    const preferred = window.LuminPersonal && window.LuminPersonal.get().start;
    if (preferred && preferred !== 'estudo' && ROUTES[preferred]) return preferred;

    try {
      sessionStorage.removeItem(START);
      sessionStorage.removeItem(REVEAL);
    } catch (error) { /* modo privado sem storage */ }
    return 'estudo';
  }

  /* ---------- carregamento sob demanda ---------- */
  function loadCss(route, href) {
    if (loadedCss[href]) return loadedCss[href];

    /* arquivo único da aba Single: a folha já está no documento como
       <style data-href="…"> — só ligamos a da aba que abriu */
    if (BUNDLE) {
      const inline = document.querySelector('style[data-href="' + href + '"]');
      if (inline) {
        inline.dataset.route = route;
        inline.disabled = route !== current;
        loadedCss[href] = inline;
        return inline;
      }
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.route = route;
    link.disabled = route !== current;  /* liga só quando a aba abre */
    document.head.append(link);
    loadedCss[href] = link;
    return link;
  }

  /* só a folha da aba atual fica ativa (a dos estudos é clara e vazaria) */
  function syncCss(route) {
    Object.keys(loadedCss).forEach(function (href) {
      const link = loadedCss[href];
      if (link && link.dataset) link.disabled = link.dataset.route !== route;
    });
  }

  function loadScript(entry) {
    const src = typeof entry === 'string' ? entry : entry.src;
    const attrs = typeof entry === 'string' ? {} : entry.attrs || {};
    if (loadedScripts[src]) return loadedScripts[src];

    loadedScripts[src] = new Promise(function (resolve) {
      const script = document.createElement('script');
      script.src = src;
      script.defer = true;
      script.async = false;             /* mantém a ordem da fila */
      Object.keys(attrs).forEach(function (key) {
        script.setAttribute(key, attrs[key]);
      });
      script.addEventListener('load', function () { resolve(true); });
      script.addEventListener('error', function () {
        console.warn('[LuminSDK] não carregou:', src);
        resolve(false);
      });
      document.body.append(script);
    });
    return loadedScripts[src];
  }

  /* módulo que viaja embutido no arquivo único: o texto já está no documento
     esperando a aba abrir. Injetar como <script> executa na hora, em ordem. */
  function loadBundled(entry) {
    const src = typeof entry === 'string' ? entry : entry.src;
    if (/^https?:/i.test(src)) return loadScript(entry);

    const node = document.querySelector('script[data-module="' + src + '"]');
    if (!node) return loadScript(entry);
    if (loadedScripts[src]) return loadedScripts[src];

    loadedScripts[src] = new Promise(function (resolve) {
      try {
        const script = document.createElement('script');
        script.dataset.from = src;
        script.textContent = node.textContent;
        document.body.append(script);
        resolve(true);
      } catch (error) {
        console.warn('[LuminSDK] módulo embutido falhou:', src, error);
        resolve(false);
      }
    });
    return loadedScripts[src];
  }

  function loadRoute(route) {
    const config = ROUTES[route];
    if (SINGLE) {
      /* o arquivo único antigo (só o catálogo) já traz tudo no documento */
      if (!BUNDLE || !config) return;
      (config.css || []).forEach(function (href) { loadCss(route, href); });
      (config.scripts || []).reduce(function (chain, entry) {
        return chain.then(function () { return loadBundled(entry); });
      }, Promise.resolve());
      return;
    }
    if (!config) return;
    (config.css || []).forEach(function (href) { loadCss(route, href); });
    return (config.scripts || []).reduce(function (chain, entry) {
      return chain.then(function () { return loadScript(entry); });
    }, Promise.resolve());
  }

  /* ícone da aba: a página de estudos sempre usa o próprio logotipo */
  function syncIcon(route) {
    const link = document.querySelector('link[rel="icon"]');
    if (!link) return;
    const want = (shield.disguise || route === 'estudo') ? SHIELD_ICON : 'assets/img/favicon.svg';
    if (link.getAttribute('href') !== want) link.setAttribute('href', want);
  }

  /* ---------- disfarce permanente (SUTS) ----------------------------------
     Enquanto o disfarce está ligado — e ele nasce ligado — TODA aba do site
     se chama "StudyHub | Estudos e Quiz" e usa o logotipo do StudyHub: o
     título real não aparece no LuminSDK, no GN-Math, nos catálogos, nos
     sites, no navegador, no Hub nem no LuminOS.

     Aqui NÃO existe mais trava de troca de janela: trocar de aba, dar
     Alt+Tab ou sair do app não muda a tela nem mexe no crédito "Ryan Smith".
     No celular a troca de app dispara visibilidade o tempo todo, e era isso
     que deixava o crédito do rodapé apagado e sem ação.

     Ctrl+AltGr+H (o AltGr do Windows chega como Ctrl+Alt) mostra o título e o
     ícone reais e abre o catálogo — é só o disfarce saindo, opcional. */
  const SHIELD_TITLE = 'StudyHub | Estudos e Quiz';
  const SHIELD_ICON = 'assets/img/studyhub.svg';

  const shield = { disguise: true, observer: null };

  /* título à prova de reescrita: qualquer módulo que tente trocar o título
     (navegador interno, chamadas do app) é corrigido na hora */
  function holdShieldTitle() {
    if (shield.observer || !window.MutationObserver) return;
    const node = document.querySelector('title');
    if (!node) return;
    shield.observer = new MutationObserver(function () {
      if (shield.disguise && document.title !== SHIELD_TITLE) document.title = SHIELD_TITLE;
    });
    shield.observer.observe(node, { childList: true, characterData: true, subtree: true });
  }

  function releaseShieldTitle() {
    if (!shield.observer) return;
    shield.observer.disconnect();
    shield.observer = null;
  }

  function paintShield() {
    const config = ROUTES[current];
    if (shield.disguise) {
      if (document.title !== SHIELD_TITLE) document.title = SHIELD_TITLE;
      holdShieldTitle();
    } else {
      releaseShieldTitle();
      if (config && document.title !== config.title) document.title = config.title;
    }
    syncIcon(current);
    document.documentElement.classList.toggle('is-shield', shield.disguise);
  }

  /* Ctrl+AltGr+H: título e ícone reais voltam e o catálogo abre */
  function shieldRelease() {
    shield.disguise = false;
    paintShield();
    go('lumin', { reveal: true, force: true });
  }

  /* ---------- gaveta de abas (topo) ----------
     As abas moram numa gaveta: puxar para baixo mostra, "guardar" sobe com
     animação. O estado fica salvo e a altura é medida, não chutada — assim
     o conteúdo nunca fica escondido atrás das abas. */
  const TABS_STORE = 'luminsdk:v1:tabs';
  const TABS_PILL = 14;   /* a pílula "guardar" passa um pouco da barra */

  function tabsRoot() { return document.getElementById('tabs'); }
  function tabsAway() { return document.documentElement.classList.contains('tabs-away'); }

  function measureTabs() {
    const root = tabsRoot();
    if (!root) return;
    const bar = root.querySelector('.tabs__bar');
    const height = bar ? Math.round(bar.getBoundingClientRect().height) : 58;
    document.documentElement.style.setProperty('--tabs-h', (tabsAway() ? 0 : height + TABS_PILL) + 'px');
  }

  function paintTabs() {
    const away = tabsAway();
    ['tabs-pull', 'tabs-hide'].forEach(function (id) {
      const node = document.getElementById(id);
      if (node) node.setAttribute('aria-expanded', away ? 'false' : 'true');
    });
    measureTabs();
  }

  function setTabsAway(away, options) {
    const opts = options || {};
    document.documentElement.classList.toggle('tabs-away', !!away);
    if (!opts.silent) {
      try { localStorage.setItem(TABS_STORE, away ? 'away' : 'open'); } catch (error) { /* modo privado */ }
    }
    paintTabs();
  }

  function toggleTabs() { setTabsAway(!tabsAway()); }

  /* arrastar a alça para baixo abre; arrastar a pílula para cima fecha.
     Um clique sem arrasto também resolve (celular e teclado). */
  function dragTabs(handle, mode) {
    const root = tabsRoot();
    if (!handle || !root) return;
    let startY = 0;
    let delta = 0;
    let active = false;

    const move = function (event) {
      if (!active) return;
      delta = event.clientY - startY;
      const travel = mode === 'open' ? Math.max(0, delta) : Math.min(0, delta);
      if (Math.abs(travel) < 4) return;
      document.documentElement.classList.add('tabs-dragging');
      root.style.transform = mode === 'open'
        ? 'translateY(calc(-100% + ' + travel + 'px))'
        : 'translateY(' + travel + 'px)';
    };

    const end = function () {
      if (!active) return;
      active = false;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      root.style.transform = '';
      document.documentElement.classList.remove('tabs-dragging');
      const crossed = mode === 'open' ? delta > 34 : delta < -34;
      if (crossed) setTabsAway(mode !== 'open');
      else paintTabs();
    };

    handle.addEventListener('pointerdown', function (event) {
      if (event.button) return;
      active = true;
      startY = event.clientY;
      delta = 0;
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
    });

    handle.addEventListener('click', function () {
      if (Math.abs(delta) > 8) { delta = 0; return; }   /* foi arrasto, não clique */
      toggleTabs();
    });
  }

  function initTabs() {
    if (!tabsRoot()) return;
    let saved = '';
    try { saved = localStorage.getItem(TABS_STORE) || ''; } catch (error) { /* sem storage */ }
    document.documentElement.classList.toggle('tabs-away', saved === 'away');

    dragTabs(document.getElementById('tabs-pull'), 'open');
    dragTabs(document.getElementById('tabs-hide'), 'close');

    paintTabs();

    /* sombra da gaveta: só depois que o conteúdo sai do lugar */
    const shade = function () {
      document.documentElement.classList.toggle('tabs-scrolled', window.scrollY > 4);
    };
    window.addEventListener('scroll', shade, { passive: true });
    shade();

    window.addEventListener('resize', measureTabs);
    window.addEventListener('orientationchange', measureTabs);
    /* a fonte chega depois do primeiro paint: mede de novo quando der */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(measureTabs).catch(function () {});
    }
    setTimeout(measureTabs, 400);
  }

  /* ---------- troca de aba ---------- */
  function paintRail(route) {
    document.querySelectorAll('.tabs__tab').forEach(function (item) {
      let active = item.dataset.route === route;

      /* DuckMath e Astra dividem a rota "provider": a aba acesa é a do
         catálogo que está aberto */
      if (item.dataset.provider) {
        const openKey = (window.LuminProvider && window.LuminProvider.current)
          ? window.LuminProvider.current() : '';
        active = route === 'provider' && openKey === item.dataset.provider;
      }

      const lit = active && route !== 'boot';
      item.classList.toggle('is-active', lit);
      if (lit) {
        item.setAttribute('aria-current', 'page');
        /* a aba acesa pode estar fora da vista (barra rolável): centraliza */
        try { item.scrollIntoView({ inline: 'center', block: 'nearest' }); } catch (error) {}
      } else {
        item.removeAttribute('aria-current');
      }
    });
  }

  /* ---------- transição global: preto → flash → impacto ----------
     O módulo é global para funcionar em todas as rotas, antes e depois
     do carregamento sob demanda. Ele respeita movimento reduzido. */
  function roll(route, style) {
    if (!route) return;
    const open = function () {
      if (!window.LuminAnim) return false;
      window.LuminAnim.play(route, style);
      return true; /* desativado por preferência também é um módulo já pronto */
    };
    if (open()) return;

    let tries = 20;
    const wait = function () {
      if (open() || tries-- <= 0) return;
      window.setTimeout(wait, 100);
    };
    window.setTimeout(wait, 50);
  }

  function show(route, transition) {
    if (!ROUTES[route]) route = 'lumin';
    if (route === current) return;
    const first = !current;
    current = route;
    const config = ROUTES[route];
    const settingsDialog = document.getElementById('settings');
    if (route !== 'lumin' && settingsDialog && settingsDialog.open) {
      if (typeof settingsDialog.close === 'function') settingsDialog.close();
      else settingsDialog.removeAttribute('open');
    }

    document.body.classList.toggle('gn', route === 'gn');
    document.documentElement.setAttribute('data-view', route);
    document.documentElement.setAttribute('data-theme', 'dark');

    GN_ATTRS.forEach(function (name) {
      if (route === 'gn' && config.html && config.html[name]) {
        document.documentElement.setAttribute(name, config.html[name]);
      } else {
        document.documentElement.removeAttribute(name);
      }
    });

    const boot = document.getElementById('boot');
    if (boot) boot.hidden = route !== 'boot';
    document.body.style.overflow = route === 'boot' || route === 'os' ? 'hidden' : '';

    document.querySelectorAll('.app-view').forEach(function (view) {
      const own = view.dataset.view;
      const active = own === route;
      view.classList.toggle('is-active', active);
      if (active) view.removeAttribute('hidden');
      else view.setAttribute('hidden', '');
    });

    document.title = config.title;
    syncIcon(route);
    paintShield();
    paintRail(route);
    loadRoute(route);
    syncCss(route);                 /* liga o CSS da aba recém-criada */

    if (route === 'provider' && !(window.LuminProvider && window.LuminProvider.current && window.LuminProvider.current())) {
      openProvider(lastProvider());
    }

    if (first) {
      document.documentElement.classList.add('is-ready');
    }
    if (route !== 'boot' && route !== 'os') window.scrollTo(0, 0);

    /* a animação da aba entra por cima, já com a view pronta embaixo */
    roll(route, transition);

    try {
      window.dispatchEvent(new CustomEvent('lumin:view', { detail: { route: route } }));
    } catch (error) { /* navegador antigo sem CustomEvent */ }
  }

  /* troca de aba sem tocar na URL */
  function go(route, options) {
    const opts = options || {};
    if (!ROUTES[route]) return;
    if (route === current && !opts.force) return;

    if (route === 'os') writeMode('os');
    else if (route === 'boot') writeMode('');
    else writeMode('normal');

    try {
      if (route !== 'os' && route !== 'boot') sessionStorage.setItem(START, route);
    } catch (error) {}
    if (route === 'lumin' && opts.reveal) {
      try { sessionStorage.setItem(REVEAL, '1'); } catch (error) {}
    }
    show(route, opts.transition);
  }

  /* ---------- teclado: atalhos configuráveis (seção "Atalhos" das
     configurações, via LuminKeys). Padrões: Shift+D clássico, Shift+J seleção aplicada,
     Ctrl+AltGr+H libera o disfarce, Ctrl+AltGr+P baixa o HTML pronto. Sem o
     módulo, valem os padrões. ---------- */
  function matchKey(name, event, fallback) {
    if (window.LuminKeys && typeof window.LuminKeys.match === 'function') {
      return window.LuminKeys.match(name, event);
    }
    return fallback(event);
  }

  /* ---------- download do HTML pronto (Ctrl + AltGr + P) ----------
     Baixa assets/files/DRAG-INTO-BROWSER.svg.html: o arquivo único no
     formato "arraste para o navegador", sem passar pelo gerador da aba
     Single. Com um jogo (ou visualizador) aberto o atalho fica quieto, para
     não interromper a partida: lá dentro quem manda é o player. ---------- */
  const DOWNLOAD_FILE = 'assets/files/DRAG-INTO-BROWSER.svg.html';
  const DOWNLOAD_NAME = 'DRAG-INTO-BROWSER.svg.html';
  /* como o download se apresenta no aviso — o arquivo em si continua sendo o
     original, byte por byte; só o nome mostrado é este */
  const DOWNLOAD_LABEL = 'Minecraft (Em Navegador)';

  /* aviso rápido: usa o toast da biblioteca quando ela já carregou; senão,
     escreve no #toast global (mesmas classes do CSS) */
  function notify(text) {
    if (window.LuminLibrary && typeof window.LuminLibrary.toast === 'function') {
      window.LuminLibrary.toast(text);
      return;
    }
    const box = document.getElementById('toast');
    if (!box) return;
    box.textContent = text;
    box.hidden = false;
    box.classList.add('is-visible');
    clearTimeout(notify.timer);
    notify.timer = setTimeout(function () {
      box.classList.remove('is-visible');
      setTimeout(function () { box.hidden = true; }, 240);
    }, 3200);
  }

  /* algum jogo/visualizador em tela cheia agora? cada módulo marca do seu
     jeito: a biblioteca põe is-playing no <html>, o player usa o atributo
     hidden, o GN-Math e o Sites usam a classe is-open, e o LuminOS guarda a
     sessão em LuminOS.state.playing */
  function playerOpen() {
    if (document.documentElement.classList.contains('is-playing')) return true;
    const byHidden = ['player', 'pv-player'];
    for (let i = 0; i < byHidden.length; i += 1) {
      const el = document.getElementById(byHidden[i]);
      if (el && !el.hidden) return true;
    }
    const byClass = ['gn-player', 'viewer'];
    for (let i = 0; i < byClass.length; i += 1) {
      const el = document.getElementById(byClass[i]);
      if (el && el.classList.contains('is-open')) return true;
    }
    const os = window.LuminOS;
    const playing = os && os.state && os.state.playing;
    if (playing) {
      const ids = Object.keys(playing);
      for (let i = 0; i < ids.length; i += 1) {
        if (playing[ids[i]]) return true;
      }
    }
    return false;
  }

  /* dispara o download do arquivo exato (mesmos bytes do original) */
  function downloadReady() {
    if (playerOpen()) return false;
    /* no arquivo único (aba Single) a pasta assets/ não existe: o gerador
       embute o mesmo arquivo como data URI e o mapa fica em __LUMIN_RAW__ */
    const embedded = window.__LUMIN_RAW__ && window.__LUMIN_RAW__[DOWNLOAD_FILE];
    const link = document.createElement('a');
    link.href = embedded || DOWNLOAD_FILE;
    link.download = DOWNLOAD_NAME;
    link.rel = 'noopener';
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    link.remove();
    return true;
  }

  document.addEventListener('keydown', function (event) {
    const tag = (event.target && event.target.tagName) || '';
    const typing = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || (event.target && event.target.isContentEditable);

    if (event.repeat || event.defaultPrevented || typing) return;

    /* sai do disfarce (título e ícone reais) e abre o catálogo */
    if (matchKey('shield', event, function (e) {
      const altGraph = typeof e.getModifierState === 'function' && e.getModifierState('AltGraph');
      const letterH = e.code === 'KeyH' || e.key === 'h' || e.key === 'H';
      return letterH && !e.shiftKey && !e.metaKey && ((e.ctrlKey && e.altKey) || altGraph);
    })) {
      event.preventDefault();
      shieldRelease();
      return;
    }

    /* baixa o HTML pronto — nunca com um jogo aberto */
    if (matchKey('download', event, function (e) {
      const altGraph = typeof e.getModifierState === 'function' && e.getModifierState('AltGraph');
      const letterP = e.code === 'KeyP' || e.key === 'p' || e.key === 'P';
      return letterP && !e.shiftKey && !e.metaKey && ((e.ctrlKey && e.altKey) || altGraph);
    })) {
      if (playerOpen()) {
        /* de propósito: no jogo as teclas são do jogo */
        console.info('[LuminSDK] download ignorado: há um jogo/visualizador aberto');
        return;
      }
      event.preventDefault();
      const ok = downloadReady();
      console.info('[LuminSDK] atalho de download →', DOWNLOAD_FILE, ok ? '(pedido enviado)' : '(recusado)');
      /* o aviso é a prova de que o atalho rodou: se o arquivo não aparecer na
         pasta de downloads, o navegador bloqueou o download (veja o ícone na
         barra de endereço), não o atalho */
      notify(ok ? 'Baixando ' + DOWNLOAD_LABEL + '…' : 'Não deu para baixar agora.');
      return;
    }

    if (document.documentElement.classList.contains('is-playing') || document.querySelector('#mgs-player[open]')) return;

    /* Dois atalhos independentes: D preserva o relógio, J usa a seleção aplicada. */
    const impact = matchKey('impact', event, function (e) {
      return e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey &&
        (e.code === 'KeyJ' || String(e.key).toLowerCase() === 'j');
    });
    const study = matchKey('study', event, function (e) {
      return e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey &&
        (e.code === 'KeyD' || String(e.key).toLowerCase() === 'd');
    });
    if (!impact && !study) return;
    event.preventDefault();
    const transition = impact ? undefined : 'classic';
    if (SINGLE) { roll('lumin', transition); return; }
    go(current === 'estudo' ? 'lumin' : 'estudo', {
      reveal: current === 'estudo', transition: transition
    });
  });

  /* ---------- cliques ---------- */
  document.addEventListener('click', function (event) {
    if (event.metaKey || event.ctrlKey || event.shiftKey) return;

    const modeEl = event.target.closest('[data-mode]');
    if (modeEl) {
      event.preventDefault();
      const mode = modeEl.dataset.mode;
      go(mode === 'os' ? 'os' : 'lumin', { force: true, reveal: mode !== 'os' });
      return;
    }

    const routeEl = event.target.closest('[data-route]');
    if (routeEl) {
      event.preventDefault();
      const route = routeEl.dataset.route;
      const provider = routeEl.dataset.provider || '';
      const sameProviderRoute = provider && current === 'provider';
      go(route, { reveal: route === 'lumin', roll: !provider });
      if (sameProviderRoute) roll('provider');
      if (provider) openProvider(provider);
      return;
    }

    const link = event.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href') || '';

    /* "#" sozinho: volta ao topo sem gravar o "#" na barra de endereço */
    if (href === '#') {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    /* âncora dentro da própria aba (ex.: #faq): rola, sem mexer na URL */
    if (href.charAt(0) === '#' && href.length > 1) {
      const target = document.getElementById(href.slice(1));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    /* endereços antigos (gn/index.html, ../sites/index.html…) viram aba */
    const legacy = href.match(/(?:^|\/)(gn|sites|study|single)\/(?:index\.html)?$/);
    if (legacy) {
      event.preventDefault();
      const map = { gn: 'gn', sites: 'sites', study: 'estudo', single: 'lumin' };
      go(map[legacy[1]], { reveal: map[legacy[1]] === 'lumin', roll: true });
      return;
    }
    if (!/^https?:/i.test(href) && /(^|\/)index\.html$/.test(href)) {
      event.preventDefault();
      go('lumin', { reveal: true });
    }
  });

  /* ---------- catálogos de provedor (DuckMath / Astra) ---------- */
  /* ao recarregar dentro de um catálogo, volta no mesmo catálogo */
  const PROVIDER_KEYS = ['duckmath', 'astra'];
  const PROVIDER_LAST = 'luminsdk:v1:provider';

  function lastProvider() {
    try {
      const saved = sessionStorage.getItem(PROVIDER_LAST);
      if (PROVIDER_KEYS.indexOf(saved) >= 0) return saved;
    } catch (error) { /* modo privado sem storage */ }
    return PROVIDER_KEYS[0];
  }

  function openProvider(key) {
    /* o catálogo demora o tempo do fetch para ficar pronto; a aba dele só
       acende quando o provedor aberto é de fato esse */
    const lit = function () {
      if (current === 'provider') paintRail(current);
    };
    const tryOpen = function (tries) {
      if (window.LuminProvider) {
        Promise.resolve(window.LuminProvider.open(key)).then(lit, lit);
        return;
      }
      if (tries <= 0) return;
      setTimeout(function () { tryOpen(tries - 1); }, 120);
    };
    setTimeout(function () { tryOpen(16); }, 60);
  }

  /* abre o navegador já num endereço */
  function openInBrowser(url) {
    return window.LuminLinks ? window.LuminLinks.open(url) : window.LuminGameTab && window.LuminGameTab.open(url);
  }

  /* quando o navegador troca de endereço, a barra lateral se ajusta */
  window.addEventListener('lumin:browser', function () { paintRail(current); });

  /* tema Astolfo ligado/desligado: garante que o body e as folhas da aba
     atual acompanhem (as folhas são carregadas por rota, então uma já
     carregada precisa ser reavaliada) */
  window.addEventListener('lumin:astolfo', function (event) {
    const on = !!(event && event.detail && event.detail.on);
    if (document.body) document.body.classList.toggle('is-astolfo', on);
    document.documentElement.setAttribute('data-skin-toggle', on ? 'on' : 'off');
  });

  window.LuminApp = {
    go: go,
    current: function () { return current; },
    /* mapa de rotas (CSS/scripts de cada aba) — a aba Single usa isto para
       saber exatamente o que embutir, sem lista escrita à mão */
    routes: function () { return ROUTES; },
    openSettings: async function (tab) {
      go('lumin');
      await loadRoute('lumin');
      if (!window.LuminSettings) return false;
      window.LuminSettings.open();
      const button = document.querySelector('[data-settings-tab="' + (['general','transitions','experience'].includes(tab) ? tab : 'experience') + '"]');
      if (button) button.click();
      return true;
    },
    openInBrowser: openInBrowser,
    openProvider: openProvider,
    setTitle: function (text) { document.title = shield.disguise ? SHIELD_TITLE : text; },
    /* leitura do disfarce (útil para diagnóstico) */
    shieldState: function () { return { disguised: shield.disguise }; },
    /* baixa o HTML pronto (mesmo caminho do Ctrl+AltGr+P); devolve false
       quando há jogo aberto e o atalho fica bloqueado */
    download: downloadReady,
    playerOpen: playerOpen,
    notify: notify
  };

  function boot() {
    /* diagnóstico: com ?diag=1 o console mostra a versão que está rodando e
       se a camada da animação montou (a primeira troca de aba é a do boot) */
    try {
      if (/[?&]diag=1/.test(window.location.search || '')) {
        const v = (document.querySelector('script[src*="app.js?v="]') || {}).src || '';
        const anim = (document.querySelector('script[src*="anim.js?v="]') || {}).src || '';
        const play = function () {
          window.dispatchEvent(new CustomEvent('lumin:diag'));
          console.info('[LuminSDK] app:', v, '· anim:', anim,
            '· LuminAnim:', !!window.LuminAnim,
            '· animação do boot:', !!document.getElementById('lum-anim'),
            '· duração (ms):', window.LuminAnim && window.LuminAnim.state().duration);
        };
        window.addEventListener('load', function () { window.setTimeout(play, 250); });
      }
    } catch (error) { /* diagnóstico nunca quebra o boot */ }

    /* chave da antiga trava de troca de janela: não existe mais, não deve
       ficar sobrando na sessão de quem já usou o site */
    try { sessionStorage.removeItem('luminsdk:v1:shield'); } catch (error) { /* sem storage */ }

    /* rede de segurança: a classe da animação (versão antiga) travava o
       body com overflow:hidden; se sobrou de uma sessão velha, sai agora */
    document.documentElement.classList.remove('is-revealing');

    /* gaveta de abas: estado salvo + arrastar/puxar */
    initTabs();

    /* bundle novo publicado? recarrega UMA vez — assim o JS antigo nunca
       fica preso na aba em branco (era o que fazia a animação continuar em
       200 ms depois de uma atualização) */
    try {
      const stamp = document.querySelector('script[src*="app.js?v="]');
      const version = stamp ? (stamp.getAttribute('src') || '').split('v=')[1] : '';
      const KEY = 'luminsdk:v1:bundle';
      const seen = sessionStorage.getItem(KEY);
      if (version && seen && seen !== version) {
        sessionStorage.setItem(KEY, version);
        window.location.reload();
        return;
      }
      if (version && !seen) sessionStorage.setItem(KEY, version);
    } catch (error) { /* storage indisponível: segue sem recarregar */ }

    const legacy = routeFromUrl();
    /* se alguém já navegou antes do boot terminar, não atropela: fica na
       aba onde a pessoa está (o boot nunca "volta" a tela sozinho) */
    if (!current) show(initialRoute());
    /* endereço antigo (?view=gn…): limpa a barra para que reabrir o site
       caia, como sempre, na aba de estudos */
    if (legacy) {
      try { history.replaceState(null, '', window.location.pathname); } catch (error) {}
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
