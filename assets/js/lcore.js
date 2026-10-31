/* =========================================================
   LuminSDK — L_Core (painel do criador)
   · caixa de código no canto inferior direito da página do DuckMath
   · digitando o código exato, abre os comandos
   · antes do painel, pede o nome de quem está usando
   · os avisos vão para o chat global (ntfy.sh) e aparecem numa
     faixa no topo para todo mundo que estiver online, inclusive
     com um jogo aberto
   · o crédito "Ryan Smith" nos estudos abre a escolha Normal / OS
   Autor: Ryan Smith · Licença MIT
   ========================================================= */
(function () {
  'use strict';

  const CODE = 'L_Core';
  const KEY_OPEN = 'luminsdk:v1:core';
  const KEY_NAME = 'luminsdk:v1:core:name';
  const KEY_SEEN = 'luminsdk:v1:core:seen';

  const RATE_MS = 12000;      /* um aviso a cada 12 s */
  const BANNER_MS = 14000;    /* quanto tempo o aviso fica no topo */
  const FRESH_S = 180;        /* só avisos dos últimos 3 min aparecem */

  const AVISOS = 'Avisos do criador';

  let gateEl = null;
  let gateInput = null;
  let chipEl = null;
  let panelEl = null;
  let logEl = null;
  let bodyEl = null;
  let nameWrapEl = null;
  let nameInputEl = null;
  let formEl = null;
  let textEl = null;
  let stateEl = null;
  let bannerEl = null;
  let bannerTimer = 0;
  let menuEl = null;
  let lastSent = 0;
  let started = false;

  /* ---------- utilidades ---------- */
  function store(key, value) {
    try {
      if (value === null || value === undefined) localStorage.removeItem(key);
      else localStorage.setItem(key, String(value));
    } catch (error) { /* modo privado sem storage */ }
  }

  function stored(key) {
    try { return localStorage.getItem(key) || ''; } catch (error) { return ''; }
  }

  function unlocked() {
    return stored(KEY_OPEN) === '1';
  }

  function creatorName() {
    const own = stored(KEY_NAME).trim();
    if (own) return own;
    const social = window.LuminSocial;
    if (social && typeof social.name === 'function') return String(social.name() || '').trim();
    return '';
  }

  function readSeen() {
    try {
      const raw = localStorage.getItem(KEY_SEEN);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (error) { return []; }
  }

  function writeSeen(list) {
    try { localStorage.setItem(KEY_SEEN, JSON.stringify(list)); } catch (error) {}
  }

  function route() {
    return document.documentElement.getAttribute('data-view') || '';
  }

  function providerKey() {
    const api = window.LuminProvider;
    return api && typeof api.current === 'function' ? String(api.current() || '') : '';
  }

  function isDuck() {
    return route() === 'provider' && providerKey() === 'duckmath';
  }

  /* ---------- faixa de aviso no topo ---------- */
  function hideBanner() {
    if (!bannerEl) return;
    bannerEl.classList.remove('is-in');
    window.setTimeout(function () {
      if (bannerEl && !bannerEl.classList.contains('is-in')) bannerEl.hidden = true;
    }, 240);
  }

  function banner() {
    if (bannerEl) return bannerEl;

    bannerEl = document.createElement('div');
    bannerEl.className = 'lcore-banner';
    bannerEl.id = 'lcore-banner';
    bannerEl.hidden = true;
    bannerEl.setAttribute('role', 'status');
    bannerEl.setAttribute('aria-live', 'polite');
    bannerEl.innerHTML = [
      '<span class="lcore-banner__tag">aviso</span>',
      '<span class="lcore-banner__who"></span>',
      '<span class="lcore-banner__text"></span>',
      '<button class="lcore-banner__x" type="button" aria-label="Fechar aviso">✕</button>'
    ].join('');

    bannerEl.querySelector('.lcore-banner__x').addEventListener('click', hideBanner);
    document.body.append(bannerEl);
    return bannerEl;
  }

  function showBanner(item) {
    const node = banner();
    node.querySelector('.lcore-banner__who').textContent = item.n || 'criador';
    node.querySelector('.lcore-banner__text').textContent = item.m || '';
    node.hidden = false;
    /* reinicia a animação de entrada */
    node.classList.remove('is-in');
    void node.offsetWidth;
    node.classList.add('is-in');
    window.clearTimeout(bannerTimer);
    bannerTimer = window.setTimeout(hideBanner, BANNER_MS);
  }

  /* ---------- log do painel ---------- */
  function log(kind, text) {
    if (!logEl) return;
    const line = document.createElement('p');
    line.className = 'lcore__line' + (kind ? ' lcore__line--' + kind : '');
    line.textContent = text;
    logEl.append(line);
    while (logEl.childElementCount > 80) logEl.firstElementChild.remove();
    logEl.scrollTop = logEl.scrollHeight;
  }

  function help() {
    log('sys', 'comandos:');
    log('sys', '/ajuda — esta lista');
    log('sys', '/say <texto> — manda o aviso (ou só escreva o texto)');
    log('sys', '/nome <nome> — troca o nome do criador');
    log('sys', '/tema claro|escuro — troca o tema do site');
    log('sys', '/cor <#hex> — troca a cor de destaque');
    log('sys', '/ir <aba> — lumin, gn, sites, estudo, navegador, provedor, os');
    log('sys', '/online — quantas pessoas estão no site');
    log('sys', '/limpar — limpa este histórico');
    log('sys', '/bloquear — esconde o L_Core nesta máquina');
    log('sys', '/fechar — fecha o painel');
  }

  /* ---------- envio ---------- */
  function sendBroadcast(text) {
    const clean = String(text || '').trim().slice(0, 240);
    if (!clean) return;

    const now = Date.now();
    if (now - lastSent < RATE_MS) {
      const wait = Math.ceil((RATE_MS - (now - lastSent)) / 1000);
      log('warn', 'calma: espere ' + wait + 's para o próximo aviso.');
      return;
    }

    const name = creatorName();
    if (!name) {
      showNameGate();
      log('warn', 'defina o nome do criador primeiro.');
      return;
    }

    const social = window.LuminSocial;
    if (!social || typeof social.send !== 'function') {
      log('warn', 'o chat não está disponível nesta página.');
      return;
    }

    if (typeof social.setName === 'function') social.setName(name);
    lastSent = now;
    log('out', 'você: ' + clean);

    Promise.resolve(social.send(clean, { broadcast: true })).then(function (ok) {
      if (ok) log('ok', 'aviso publicado no topo do site.');
      else log('warn', 'não deu para publicar agora.');
    }, function () {
      log('warn', 'não deu para publicar agora.');
    });
  }

  function handle(raw) {
    const text = String(raw || '').trim();
    if (!text) return;

    if (text.charAt(0) !== '/') {
      sendBroadcast(text);
      return;
    }

    const parts = text.slice(1).split(/\s+/);
    const command = (parts.shift() || '').toLowerCase();
    const arg = parts.join(' ').trim();

    switch (command) {
      case 'ajuda':
      case 'help':
        help();
        break;

      case 'say':
      case 'aviso':
        if (!arg) log('warn', 'use: /say <texto>');
        else sendBroadcast(arg);
        break;

      case 'nome':
        if (!arg) {
          showNameGate();
          break;
        }
        store(KEY_NAME, arg.slice(0, 18));
        if (window.LuminSocial && window.LuminSocial.setName) window.LuminSocial.setName(arg.slice(0, 18));
        log('ok', 'agora você aparece como ' + arg.slice(0, 18) + '.');
        paint();
        break;

      case 'tema': {
        const light = /^(claro|light|l)$/i.test(arg);
        const dark = /^(escuro|dark|d)$/i.test(arg);
        if (!light && !dark) {
          log('warn', 'use: /tema claro ou /tema escuro');
          break;
        }
        const next = light ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        store('luminsdk-theme', next);
        if (window.LuminTheme && window.LuminTheme.set) window.LuminTheme.set(next);
        log('ok', 'tema ' + (light ? 'claro' : 'escuro') + ' ligado.');
        break;
      }

      case 'cor': {
        if (!/^#?[0-9a-f]{6}$/i.test(arg)) {
          log('warn', 'use: /cor #e7e7ea');
          break;
        }
        const hex = arg.charAt(0) === '#' ? arg : '#' + arg;
        if (window.LuminPalette && window.LuminPalette.apply) window.LuminPalette.apply(hex);
        else document.documentElement.style.setProperty('--accent', hex);
        log('ok', 'cor de destaque: ' + hex);
        break;
      }

      case 'ir': {
        const map = {
          lumin: 'lumin', jogos: 'lumin', gn: 'gn', sites: 'sites',
          estudo: 'estudo', estudos: 'estudo', navegador: 'browser',
          browser: 'browser', provedor: 'provider', provider: 'provider', os: 'os'
        };
        const target = map[arg.toLowerCase()];
        if (!target) {
          log('warn', 'abas: lumin, gn, sites, estudo, navegador, provedor, os');
          break;
        }
        if (!window.LuminApp || !window.LuminApp.go) {
          log('warn', 'navegação indisponível aqui.');
          break;
        }
        log('ok', 'abrindo ' + target + '.');
        window.LuminApp.go(target, { force: true });
        break;
      }

      case 'online': {
        const social = window.LuminSocial;
        const total = social && social.people ? social.people() : 1;
        log('sys', total === 1 ? '1 pessoa online agora.' : total + ' pessoas online agora.');
        break;
      }

      case 'limpar':
        if (logEl) logEl.textContent = '';
        break;

      case 'bloquear':
      case 'lock':
        store(KEY_OPEN, null);
        closePanel();
        syncGate();
        break;

      case 'fechar':
      case 'sair':
        closePanel();
        break;

      default:
        log('warn', 'comando desconhecido: /' + command + ' — tente /ajuda');
    }
  }

  /* ---------- caixa de código ---------- */
  function gate() {
    if (gateEl) return gateEl;

    gateEl = document.createElement('form');
    gateEl.className = 'lcore-gate';
    gateEl.id = 'lcore-gate';
    gateEl.setAttribute('autocomplete', 'off');
    gateEl.setAttribute('aria-label', 'Código do L_Core');
    gateEl.innerHTML = [
      '<label class="lcore-gate__label" for="lcore-code">código</label>',
      '<input class="lcore-gate__input" id="lcore-code" type="text" maxlength="24"',
      ' spellcheck="false" autocomplete="off" autocapitalize="off"',
      ' aria-label="Código de acesso">'
    ].join('');

    gateInput = gateEl.querySelector('input');

    gateEl.addEventListener('submit', function (event) {
      event.preventDefault();
      const value = (gateInput.value || '').trim();
      if (value === CODE) {
        gateInput.value = '';
        store(KEY_OPEN, '1');
        syncGate();
        openPanel();
        return;
      }
      gateEl.classList.add('is-wrong');
      gateInput.setAttribute('aria-invalid', 'true');
      gateInput.value = '';
      window.setTimeout(function () {
        gateEl.classList.remove('is-wrong');
        gateInput.removeAttribute('aria-invalid');
      }, 700);
      gateInput.focus();
    });

    document.body.append(gateEl);
    return gateEl;
  }

  /* ---------- painel ---------- */
  function showNameGate() {
    if (!panelEl) return;
    if (nameWrapEl) nameWrapEl.hidden = false;
    if (bodyEl) bodyEl.hidden = true;
    if (nameInputEl) {
      nameInputEl.value = creatorName();
      window.setTimeout(function () { nameInputEl.focus(); nameInputEl.select(); }, 40);
    }
  }

  function paint() {
    if (!panelEl) return;
    const name = creatorName();
    const hasName = !!name;
    if (nameWrapEl) nameWrapEl.hidden = hasName;
    if (bodyEl) bodyEl.hidden = !hasName;
    if (stateEl) {
      stateEl.textContent = hasName ? name : 'defina seu nome';
    }
  }

  function panel() {
    if (panelEl) return panelEl;

    panelEl = document.createElement('section');
    panelEl.className = 'lcore';
    panelEl.id = 'lcore';
    panelEl.hidden = true;
    panelEl.setAttribute('role', 'dialog');
    panelEl.setAttribute('aria-label', 'Painel do criador');
    panelEl.innerHTML = [
      '<header class="lcore__head">',
      '  <span class="lcore__brand">L<b>_</b>Core</span>',
      '  <span class="lcore__state" data-lcore-state>painel do criador</span>',
      '  <span class="lcore__tools">',
      '    <button class="lcore__tool" type="button" data-lcore="lock" title="Esconder o L_Core">bloquear</button>',
      '    <button class="lcore__tool" type="button" data-lcore="close" aria-label="Fechar o painel">✕</button>',
      '  </span>',
      '</header>',
      '<div class="lcore__gate" data-lcore-namewrap hidden>',
      '  <p class="lcore__hint">Antes do painel: com que nome você aparece nos avisos?</p>',
      '  <form class="lcore__form" data-lcore-nameform>',
      '    <input class="lcore__input" type="text" maxlength="18" autocomplete="off"',
      '     placeholder="nome do criador" aria-label="Nome do criador" data-lcore-nameinput>',
      '    <button class="lcore__send" type="submit">Entrar</button>',
      '  </form>',
      '</div>',
      '<div class="lcore__body" data-lcore-body>',
      '  <div class="lcore__log" data-lcore-log aria-live="polite"></div>',
      '  <form class="lcore__form" data-lcore-form>',
      '    <input class="lcore__input" type="text" maxlength="240" autocomplete="off"',
      '     placeholder="escreva ou /ajuda" aria-label="Mensagem" data-lcore-input>',
      '    <button class="lcore__send" type="submit">Enviar</button>',
      '  </form>',
      '</div>'
    ].join('');

    document.body.append(panelEl);

    logEl = panelEl.querySelector('[data-lcore-log]');
    bodyEl = panelEl.querySelector('[data-lcore-body]');
    nameWrapEl = panelEl.querySelector('[data-lcore-namewrap]');
    nameInputEl = panelEl.querySelector('[data-lcore-nameinput]');
    formEl = panelEl.querySelector('[data-lcore-form]');
    textEl = panelEl.querySelector('[data-lcore-input]');
    stateEl = panelEl.querySelector('[data-lcore-state]');

    panelEl.querySelector('[data-lcore-nameform]').addEventListener('submit', function (event) {
      event.preventDefault();
      const name = (nameInputEl.value || '').trim().replace(/\s+/g, ' ').slice(0, 18);
      if (!name) {
        nameInputEl.focus();
        return;
      }
      store(KEY_NAME, name);
      if (window.LuminSocial && window.LuminSocial.setName) window.LuminSocial.setName(name);
      paint();
      log('ok', 'painel liberado para ' + name + '.');
      help();
      if (textEl) window.setTimeout(function () { textEl.focus(); }, 40);
    });

    formEl.addEventListener('submit', function (event) {
      event.preventDefault();
      const text = textEl.value;
      textEl.value = '';
      handle(text);
    });

    panelEl.addEventListener('click', function (event) {
      const btn = event.target.closest('[data-lcore]');
      if (!btn) return;
      const action = btn.dataset.lcore;
      if (action === 'close') closePanel();
      else if (action === 'lock') {
        store(KEY_OPEN, null);
        closePanel();
        syncGate();
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && panelEl && !panelEl.hidden) closePanel();
    });

    return panelEl;
  }

  function openPanel() {
    panel();
    panelEl.hidden = false;
    if (chipEl) chipEl.hidden = true;
    paint();
    if (!logEl.childElementCount) {
      log('sys', 'L_Core aberto. Nome que aparece nos avisos: ' + (creatorName() || '—'));
    }
    if (creatorName() && textEl) window.setTimeout(function () { textEl.focus(); }, 40);
    else showNameGate();
  }

  function closePanel() {
    if (!panelEl) return;
    panelEl.hidden = true;
    if (isDuck() && unlocked()) {
      chip();
      chipEl.hidden = false;
    }
  }

  /* ---------- atalho para reabrir o painel ---------- */
  function chip() {
    if (chipEl) return chipEl;

    chipEl = document.createElement('button');
    chipEl.className = 'lcore-chip';
    chipEl.type = 'button';
    chipEl.id = 'lcore-chip';
    chipEl.hidden = true;
    chipEl.textContent = 'L_Core';
    chipEl.setAttribute('aria-label', 'Abrir o painel do criador');
    chipEl.addEventListener('click', function () { openPanel(); });
    document.body.append(chipEl);
    return chipEl;
  }

  /* ---------- mostra a caixa só no DuckMath ---------- */
  function syncGate() {
    if (!document.body) return;

    const duck = isDuck();
    const isUnlocked = unlocked();
    const open = !!(panelEl && !panelEl.hidden);

    if (duck && !isUnlocked) {
      gate();
      gateEl.hidden = false;
    } else if (gateEl) {
      gateEl.hidden = true;
    }

    if (duck && isUnlocked && !open) {
      chip();
      chipEl.hidden = false;
    } else if (chipEl) {
      chipEl.hidden = true;
    }

    if (!duck && open) closePanel();
  }

  /* ---------- avisos que chegam ---------- */
  function onMessages(list) {
    (list || []).forEach(function (item) {
      if (!item || !item.b) return;
      if (item.n && item.n === creatorName()) return;
      if (Date.now() / 1000 - (item.t || 0) > FRESH_S) return;

      const seen = readSeen();
      if (seen.indexOf(item.id) >= 0) return;
      seen.push(item.id);
      writeSeen(seen.slice(-60));

      showBanner(item);
      log('in', (item.n || 'criador') + ': ' + item.m);
    });
  }

  /* ---------- Ryan Smith → Normal / OS ---------- */
  function closeMenu() {
    if (menuEl) menuEl.hidden = true;
  }

  function openMenu(anchor) {
    if (!menuEl) {
      menuEl = document.createElement('div');
      menuEl.className = 'lcmenu';
      menuEl.hidden = true;
      menuEl.setAttribute('role', 'dialog');
      menuEl.setAttribute('aria-label', 'Como você quer entrar');
      menuEl.innerHTML = [
        '<p class="lcmenu__title">Como você quer entrar?</p>',
        '<div class="lcmenu__opts">',
        '  <button class="lcmenu__opt" type="button" data-lcore-mode="normal">',
        '    <b>Normal</b><span>o site como está hoje</span>',
        '  </button>',
        '  <button class="lcmenu__opt" type="button" data-lcore-mode="os">',
        '    <b>OS</b><span>área de trabalho LuminOS</span>',
        '  </button>',
        '</div>',
        '<p class="lcmenu__foot">dá para trocar quando quiser</p>'
      ].join('');
      document.body.append(menuEl);

      menuEl.addEventListener('click', function (event) {
        const opt = event.target.closest('[data-lcore-mode]');
        if (!opt) return;
        const mode = opt.dataset.lcoreMode;
        closeMenu();
        if (!window.LuminApp || !window.LuminApp.go) return;
        if (mode === 'os') window.LuminApp.go('os', { force: true });
        else window.LuminApp.go('lumin', { reveal: true, force: true });
      });
    }

    menuEl.hidden = false;

    /* posiciona acima do botão, sempre dentro da tela */
    const rect = anchor.getBoundingClientRect();
    const box = menuEl.getBoundingClientRect();
    const margin = 12;
    let left = rect.right - box.width;
    left = Math.max(margin, Math.min(left, window.innerWidth - box.width - margin));
    let top = rect.top - box.height - 10;
    if (top < margin) top = Math.min(rect.bottom + 10, window.innerHeight - box.height - margin);
    menuEl.style.left = left + 'px';
    menuEl.style.top = top + 'px';

    const first = menuEl.querySelector('.lcmenu__opt');
    if (first) window.setTimeout(function () { first.focus(); }, 20);
  }

  function bindDocument() {
    document.addEventListener('click', function (event) {
      const credit = event.target.closest && event.target.closest('#autor');
      if (credit) {
        /* o crédito abre a escolha Normal / OS (antes ia direto ao catálogo) */
        event.preventDefault();
        event.stopPropagation();
        openMenu(credit);
        return;
      }
      if (menuEl && !menuEl.hidden && !event.target.closest('.lcmenu')) closeMenu();
    }, true);

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeMenu();
    });

    window.addEventListener('lumin:view', function () {
      closeMenu();
      syncGate();
    });

    window.addEventListener('resize', closeMenu);
  }

  /* ---------- início ---------- */
  function start() {
    if (started || !document.body) return;
    started = true;

    bindDocument();

    const social = window.LuminSocial;
    if (social && typeof social.onMessage === 'function') social.onMessage(onMessages);
    else window.addEventListener('lumin:chat', function (event) {
      onMessages(event.detail && event.detail.messages);
    });

    /* o catálogo abre depois da rota (e troca entre DuckMath e Astra sem
       trocar de aba), então a caixa confere o estado de leve, sempre */
    syncGate();
    window.setInterval(function () {
      if (document.hidden) return;
      syncGate();
    }, 1000);

    /* escuta os avisos mesmo com o painel fechado */
    window.setInterval(function () {
      if (document.hidden) return;
      const api = window.LuminSocial;
      if (api && typeof api.check === 'function') api.check();
    }, 20000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  window.LuminCore = {
    open: openPanel,
    close: closePanel,
    unlocked: unlocked,
    lock: function () { store(KEY_OPEN, null); closePanel(); syncGate(); },
    broadcast: function (text) {
      if (!unlocked()) return false;
      sendBroadcast(text);
      return true;
    },
    name: creatorName
  };
})();
