/* =========================================================
   LuminSDK — aplicativo de URL única
   Tudo vive em UMA página: …/LuminSDK/  (nada depois da barra).

   · as "abas" (Lumin, GN-Math, Sites, Estudos) são trocadas aqui dentro,
     sem mexer no endereço — nada de /gn, /sites, #/gn, ?cat=…
   · a aba escolhida fica guardada na sessão do navegador
   · a porta de entrada é o portal de estudos; o site aparece quando a
     pessoa clica em "Ryan Smith" no rodapé dele (ou Shift + D / Alt + S)
   · cada aba carrega o seu CSS e os seus scripts só na primeira visita

   Sem bibliotecas, sem build.
   Autor: Ryan Smith · Licença MIT
   ========================================================= */
(function () {
  'use strict';

  const ROUTES = {
    lumin: {
      title: 'LuminSDK — mais de 1.100 jogos no seu navegador',
      css: [],
      scripts: [
        { src: 'https://cdn.jsdelivr.net/gh/luminsdk/script@latest/lumin.min.js', attrs: { 'data-lumin-sdk': '' } },
        'assets/js/library.js?v=23',
        'assets/js/settings.js?v=23',
        'assets/js/site.js?v=23',
        'assets/js/atmosphere.js?v=23',
        'assets/js/progress.js?v=23',
        'assets/js/bonus.js?v=23'
      ]
    },
    gn: {
      title: 'GN-Math — mais de 840 jogos | LuminSDK',
      css: ['assets/css/gnmath.css?v=23'],
      scripts: ['assets/js/gnmath.js?v=23'],
      html: {
        'data-gn-accent': 'carmim',
        'data-gn-bg': 'grade',
        'data-gn-cursor': 'personalizado',
        'data-gn-density': 'confortavel',
        'data-gn-fx': 'on',
        'data-gn-motion': 'auto'
      }
    },
    sites: {
      title: 'Sites — coleções que abrem aqui dentro | LuminSDK',
      css: ['assets/css/sites.css?v=23'],
      scripts: ['assets/js/sites.js?v=23']
    },
    browser: {
      title: 'Navegador — abrir sites aqui dentro | LuminSDK',
      css: ['assets/css/browser.css?v=23'],
      scripts: ['assets/js/browser.js?v=23', 'assets/js/atmosphere.js?v=23']
    },
    admin: {
      title: 'Administração — acesso restrito | LuminSDK',
      css: ['assets/css/admin.css?v=23'],
      scripts: ['assets/js/admin.js?v=23', 'assets/js/atmosphere.js?v=23']
    },
    os: {
      title: 'LuminOS — área de trabalho | LuminSDK',
      css: [],
      scripts: ['assets/js/os.js?v=23', 'assets/js/atmosphere.js?v=23']
    },
    boot: {
      title: 'LuminSDK — escolha como entrar',
      css: [],
      scripts: ['assets/js/atmosphere.js?v=23']
    },
    estudo: {
      title: 'StudyDesk — portal de estudos para o ensino médio',
      css: ['assets/css/study.css?v=23'],
      scripts: ['assets/js/study.js?v=23']
    }
  };

  const GN_ATTRS = ['data-gn-accent', 'data-gn-bg', 'data-gn-cursor', 'data-gn-density', 'data-gn-fx', 'data-gn-motion'];
  const REVEAL = 'luminsdk:v1:reveal';
  const START = 'luminsdk:v1:start';
  const MODE = 'luminsdk:v1:mode';

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

  function initialRoute() {
    /* primeiro as duas portas: OS ou Normal */
    const mode = readMode();
    if (mode === 'os') return 'os';
    if (!mode) return 'boot';

    try {
      /* veio dos estudos: abre o catálogo uma única vez */
      if (sessionStorage.getItem(REVEAL) === '1') {
        sessionStorage.removeItem(REVEAL);
        sessionStorage.setItem(START, 'lumin');
        return 'lumin';
      }
      const saved = sessionStorage.getItem(START);
      if (ROUTES[saved] && saved !== 'os' && saved !== 'boot') return saved;
    } catch (error) { /* modo privado sem storage */ }
    return 'estudo';
  }

  /* ---------- carregamento sob demanda ---------- */
  function loadCss(route, href) {
    if (loadedCss[href]) return loadedCss[href];
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.route = route;
    link.disabled = true;               /* liga só quando a aba abre */
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

  function loadRoute(route) {
    const config = ROUTES[route];
    if (!config) return;
    (config.css || []).forEach(function (href) { loadCss(route, href); });
    (config.scripts || []).reduce(function (chain, entry) {
      return chain.then(function () { return loadScript(entry); });
    }, Promise.resolve());
  }

  /* ---------- troca de aba ---------- */
  function paintRail(route) {
    const currentUrl = (window.LuminBrowser && typeof window.LuminBrowser.current === 'function')
      ? window.LuminBrowser.current() : '';

    document.querySelectorAll('[data-route]').forEach(function (item) {
      if (!item.classList.contains('tabrail__tab')) return;

      let active = item.dataset.route === route;

      /* as abas que são "atalhos de site" só acendem quando aquele
         endereço é o que está aberto no navegador */
      if (item.dataset.url) {
        active = route === 'browser' && currentUrl && currentUrl === item.dataset.url;
      } else if (route === 'browser' && item.dataset.route === 'browser') {
        active = !currentUrl || !document.querySelector(
          '.tabrail__tab[data-url="' + currentUrl.replace(/"/g, '') + '"]'
        );
      }

      item.classList.toggle('is-active', !!(active && route !== 'boot'));
      if (active && route !== 'boot') item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });
  }

  function show(route) {
    if (!ROUTES[route]) route = 'lumin';
    if (route === current) return;
    const first = !current;
    current = route;
    const config = ROUTES[route];

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
    paintRail(route);
    syncCss(route);
    loadRoute(route);

    if (first) {
      document.documentElement.classList.add('is-ready');
    }
    if (route !== 'boot' && route !== 'os') window.scrollTo(0, 0);

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
    show(route);
  }

  /* ---------- teclado: Shift+D ou Alt+S ---------- */
  document.addEventListener('keydown', function (event) {
    const tag = (event.target && event.target.tagName) || '';
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || (event.target && event.target.isContentEditable);
    const combo = (event.shiftKey && (event.key === 'D' || event.key === 'd')) ||
      (event.altKey && (event.key === 's' || event.key === 'S'));
    if (!combo || typing) return;
    event.preventDefault();
    if (current === 'os' || current === 'boot') {
      go('estudo');
      return;
    }
    go(current === 'estudo' ? 'lumin' : 'estudo', { reveal: current === 'estudo' });
  });

  /* ---------- cliques ---------- */
  document.addEventListener('click', function (event) {
    if (event.metaKey || event.ctrlKey || event.shiftKey) return;

    const modeEl = event.target.closest('[data-mode]');
    if (modeEl) {
      event.preventDefault();
      const mode = modeEl.dataset.mode;
      go(mode === 'os' ? 'os' : 'estudo', { force: true });
      return;
    }

    const routeEl = event.target.closest('[data-route]');
    if (routeEl) {
      event.preventDefault();
      const route = routeEl.dataset.route;
      const wanted = routeEl.dataset.url || '';
      go(route, { reveal: route === 'lumin' });
      if (wanted) openInBrowser(wanted);
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
      go(map[legacy[1]], { reveal: map[legacy[1]] === 'lumin' });
      return;
    }
    if (!/^https?:/i.test(href) && /(^|\/)index\.html$/.test(href)) {
      event.preventDefault();
      go('lumin', { reveal: true });
    }
  });

  /* abre o navegador já num endereço (abas DuckMath / Astra / Luminal) */
  function openInBrowser(url) {
    window.__luminBrowserOpen = url;
    const tryOpen = function (tries) {
      if (window.LuminBrowser) {
        window.__luminBrowserOpen = '';
        window.LuminBrowser.open(url);
        return;
      }
      if (tries <= 0) return;
      setTimeout(function () { tryOpen(tries - 1); }, 120);
    };
    setTimeout(function () { tryOpen(14); }, 60);
  }

  /* quando o navegador troca de endereço, a barra lateral se ajusta */
  window.addEventListener('lumin:browser', function () { paintRail(current); });

  window.LuminApp = {
    go: go,
    current: function () { return current; },
    openInBrowser: openInBrowser,
    setTitle: function (text) { document.title = text; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { show(initialRoute()); });
  else show(initialRoute());
})();
