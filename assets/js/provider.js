/* =========================================================
   LuminSDK — catálogos de provedor (DuckMath e Astra)
   Cada aba abre DENTRO do site, com os links daquela coleção:
   jogos, portes, servidores, cloud gaming e afins, com filtro
   por tipo, busca e modo minimal. O jogo abre embutido, com
   recarga, tela cheia e a aba limpa como plano B.
   Autor: Ryan Smith · Licença MIT
   ========================================================= */
(function () {
  'use strict';

  const DATA = 'assets/data/sites.json';
  const LOAD_TIMEOUT = 9000;

  const PROVIDERS = {
    duckmath: {
      name: 'DuckMath',
      logo: 'assets/img/duckmath.jpg',
      families: ['duck-math'],
      blurb: 'matemática que vira jogo'
    },
    astra: {
      name: 'Astra',
      logo: 'assets/img/astra.jpg',
      families: ['astra'],
      blurb: 'acervo completo do Astra'
    }
  };

  const CATS = [
    { id: 'tudo', label: 'Tudo' },
    { id: 'jogos', label: 'Jogos' },
    { id: 'ports', label: 'Ports' },
    { id: 'servidores', label: 'Servidores' },
    { id: 'cloud', label: 'Cloud gaming' },
    { id: 'visuais', label: 'Visuais' },
    { id: 'estudo', label: 'Estudos' }
  ];

  const RULES = [
    { id: 'cloud', words: ['cloud', 'geforce', 'luna', 'xbox', 'playstation', 'now.', 'remote', 'stream'] },
    { id: 'servidores', words: ['server', 'servidor', 'host', 'node', 'relay', 'proxy', 'panel', 'vps'] },
    { id: 'ports', words: ['port', 'eaglercraft', 'mario', 'gta', 'subway', 'undertale', 'minecraft', 'emulador', 'emulator', 'doom', 'fnf'] },
    { id: 'visuais', words: ['visual', 'theme', 'tema', 'style', 'ui', 'design', 'skin', 'logo'] },
    { id: 'estudo', words: ['study', 'math', 'learning', 'edu', 'school', 'learn', 'tutor', 'ixl', 'clever', 'revault', 'novel'] },
    { id: 'jogos', words: ['game', 'jogo', 'arcade', 'play', 'fun', 'bull'] }
  ];

  const state = {
    key: '',
    families: null,
    items: [],
    cat: 'tudo',
    query: '',
    minimal: false,
    open: null
  };

  let dom = {};
  let timer = null;

  /* ---------- utilidades ---------- */
  function $(id) { return document.getElementById(id); }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function hostOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch (error) { return url; }
  }

  function label(site) {
    const name = String(site.name || '').trim();
    if (name && name.length > 1) return name;
    return hostOf(site.url);
  }

  function initial(text) {
    return String(text || '?').trim().charAt(0).toUpperCase() || '?';
  }

  function colorOf(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) % 360;
    return hash;
  }

  function classify(item) {
    const haystack = (item.name + ' ' + item.url).toLowerCase();
    for (let i = 0; i < RULES.length; i += 1) {
      const rule = RULES[i];
      for (let w = 0; w < rule.words.length; w += 1) {
        if (haystack.indexOf(rule.words[w]) >= 0) return rule.id;
      }
    }
    return 'jogos';
  }

  function kindLabel(id) {
    const found = RULES.filter(function (rule) { return rule.id === id; })[0];
    return ({
      cloud: 'cloud gaming', servidores: 'servidor', ports: 'port',
      visuais: 'visual', estudo: 'estudo', jogos: 'jogo'
    })[id] || (found ? found.id : 'jogo');
  }

  /* ---------- dados ---------- */
  async function loadData() {
    if (state.families) return state.families;
    const response = await fetch(DATA, { cache: 'force-cache' });
    const data = await response.json();
    state.families = data.families || [];
    return state.families;
  }

  function gather(key) {
    const config = PROVIDERS[key];
    if (!config) return [];
    const families = (state.families || []).filter(function (family) {
      return config.families.indexOf(family.id) >= 0;
    });
    const items = [];
    const seen = {};
    families.forEach(function (family) {
      (family.sites || []).forEach(function (site) {
        const url = String(site.url || '');
        if (!url || seen[url]) return;
        seen[url] = true;
        const item = {
          name: label(site),
          url: url,
          host: hostOf(url),
          family: family.name,
          cat: 'jogos'
        };
        item.cat = classify(item);
        items.push(item);
      });
    });
    items.sort(function (a, b) { return a.name.localeCompare(b.name, 'pt-BR'); });
    return items;
  }

  /* ---------- filtros ---------- */
  function counts() {
    const base = state.items;
    const total = { tudo: base.length };
    RULES.forEach(function (rule) { total[rule.id] = 0; });
    base.forEach(function (item) {
      total[item.cat] = (total[item.cat] || 0) + 1;
    });
    return total;
  }

  function paintChips() {
    if (!dom.chips) return;
    const total = counts();
    dom.chips.textContent = '';
    CATS.forEach(function (cat) {
      if (cat.id !== 'tudo' && !total[cat.id]) return;
      const chip = el('button', 'pv-chip' + (state.cat === cat.id ? ' is-on' : ''));
      chip.type = 'button';
      chip.setAttribute('aria-pressed', state.cat === cat.id ? 'true' : 'false');
      chip.append(el('span', '', cat.label));
      chip.append(el('b', '', String(total[cat.id] || 0)));
      chip.addEventListener('click', function () {
        state.cat = cat.id;
        paintChips();
        paintGrid();
      });
      dom.chips.append(chip);
    });
  }

  /* ---------- grade ---------- */
  function matches(item) {
    if (state.cat !== 'tudo' && item.cat !== state.cat) return false;
    if (!state.query) return true;
    const q = state.query.toLowerCase();
    return (item.name + ' ' + item.url + ' ' + item.family).toLowerCase().indexOf(q) >= 0;
  }

  function card(item) {
    const button = el('button', 'pv-card');
    button.type = 'button';
    button.title = item.url;
    button.dataset.cat = item.cat;

    const art = el('span', 'pv-card__art');
    art.style.setProperty('--h', colorOf(item.name));
    art.append(el('span', 'pv-card__mono', initial(item.name)));
    art.append(el('span', 'pv-card__kind', kindLabel(item.cat)));
    const play = el('span', 'pv-card__play');
    play.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.2v13.6L19 12z"/></svg>';
    art.append(play);

    const text = el('span', 'pv-card__text');
    text.append(el('span', 'pv-card__name', item.name));
    text.append(el('span', 'pv-card__host', item.host));

    button.append(art, text);
    button.addEventListener('click', function () { playItem(item); });
    return button;
  }

  function row(item) {
    const button = el('button', 'pv-row');
    button.type = 'button';
    button.title = item.url;
    button.append(el('span', 'pv-row__dot'));
    button.append(el('span', 'pv-row__name', item.name));
    button.append(el('span', 'pv-row__kind', kindLabel(item.cat)));
    button.append(el('span', 'pv-row__host', item.host));
    button.addEventListener('click', function () { playItem(item); });
    return button;
  }

  function paintGrid() {
    if (!dom.grid) return;
    const visible = state.items.filter(matches);
    dom.grid.textContent = '';
    dom.grid.className = 'pv-grid' + (state.minimal ? ' is-minimal' : '');

    const fragment = document.createDocumentFragment();
    visible.forEach(function (item) {
      fragment.append(state.minimal ? row(item) : card(item));
    });
    dom.grid.append(fragment);

    if (dom.empty) dom.empty.hidden = visible.length > 0;
    if (dom.meta) {
      const config = PROVIDERS[state.key] || {};
      dom.meta.textContent = state.items.length + (state.items.length === 1 ? ' link' : ' links') +
        ' · ' + (config.blurb || 'aqui dentro');
    }
  }

  /* ---------- player ---------- */
  function setStatus(on, title, text) {
    if (!dom.status) return;
    dom.status.hidden = !on;
    if (title && dom.statusTitle) dom.statusTitle.textContent = title;
    if (text && dom.statusText) dom.statusText.textContent = text;
  }

  function playItem(item) {
    state.open = item;
    if (!dom.player) return;
    dom.player.hidden = false;
    document.body.style.overflow = 'hidden';
    if (window.LuminSocial) window.LuminSocial.setPlaying(true);

    if (dom.playerTitle) dom.playerTitle.textContent = item.name;
    if (dom.playerUrl) dom.playerUrl.textContent = hostOf(item.url);
    setStatus(true, 'Abrindo “' + item.name + '”…', 'Carregando ' + hostOf(item.url) + '.');

    if (dom.frame) {
      dom.frame.src = 'about:blank';
      dom.frame.src = item.url;
    }

    clearTimeout(timer);
    timer = setTimeout(function () {
      setStatus(true, 'A página não apareceu aqui dentro',
        hostOf(item.url) + ' pode recusar abrir embutido (X-Frame-Options/CSP) ou estar bloqueado ' +
        'por extensão/rede. Use “Abrir em outra aba” — é o caminho mais confiável.');
    }, LOAD_TIMEOUT);

    if (window.LuminSocial) window.LuminSocial.report('provider', state.key + ': ' + item.name);
  }

  function closePlayer() {
    if (!dom.player) return;
    dom.player.hidden = true;
    document.body.style.overflow = '';
    clearTimeout(timer);
    setStatus(false);
    if (dom.frame) dom.frame.src = 'about:blank';
    state.open = null;
    if (window.LuminSocial) window.LuminSocial.setPlaying(false);
  }

  function cleanTab(url) {
    const target = url || (state.open && state.open.url);
    if (!target) return;
    const win = window.open('about:blank', '_blank');
    if (!win) {
      setStatus(true, 'O navegador bloqueou a aba nova',
        'Libere pop-ups para este site e tente de novo.');
      return;
    }
    try {
      win.document.open();
      win.document.write('<!doctype html><meta charset="utf-8"><title>Abrindo…</title>' +
        '<style>html,body{height:100%;margin:0;background:#07070c;color:#cfcfe4;' +
        'font:15px system-ui,sans-serif;display:grid;place-items:center}</style>' +
        '<div>Abrindo ' + hostOf(target) + '…</div>');
      win.document.close();
      win.opener = null;
      win.location.replace(target);
    } catch (error) {
      try { win.location.href = target; } catch (inner) { /* nada a fazer */ }
    }
  }

  function reloadFrame() {
    if (!state.open || !dom.frame) return;
    setStatus(true, 'Abrindo de novo…', hostOf(state.open.url));
    dom.frame.src = 'about:blank';
    dom.frame.src = state.open.url + (state.open.url.indexOf('?') > 0 ? '&' : '?') + 'r=' + Date.now();
    clearTimeout(timer);
    timer = setTimeout(function () {
      setStatus(true, 'Continuou em branco', 'Use “Abrir em outra aba”.');
    }, LOAD_TIMEOUT);
  }

  /* ---------- abrir um provedor ---------- */
  async function open(key) {
    const config = PROVIDERS[key];
    if (!config) return false;
    state.key = key;
    try { sessionStorage.setItem('luminsdk:v1:provider', key); } catch (error) { /* sem storage */ }
    state.cat = 'tudo';
    state.query = '';
    state.minimal = false;

    if (dom.name) dom.name.textContent = config.name;
    if (dom.logo) {
      dom.logo.src = config.logo;
      dom.logo.alt = '';
    }
    if (dom.query) dom.query.value = '';
    if (dom.density) {
      dom.density.setAttribute('aria-pressed', 'false');
      if (dom.densityLabel) dom.densityLabel.textContent = 'Tudo';
    }
    if (dom.grid) dom.grid.innerHTML = '<p class="pv-loading">Carregando o catálogo…</p>';

    try {
      await loadData();
    } catch (error) {
      if (dom.grid) dom.grid.innerHTML = '<p class="pv-loading">Não foi possível abrir o catálogo agora.</p>';
      return false;
    }

    state.items = gather(key);
    paintChips();
    paintGrid();
    return true;
  }

  /* ---------- eventos ---------- */
  function bind() {
    dom.name = $('pv-name');
    dom.meta = $('pv-meta');
    dom.logo = $('pv-logo');
    dom.chips = $('pv-chips');
    dom.grid = $('pv-grid');
    dom.empty = $('pv-empty');
    dom.query = $('pv-query');
    dom.density = $('pv-density');
    dom.densityLabel = $('pv-density-label');
    dom.player = $('pv-player');
    dom.frame = $('pv-frame');
    dom.playerTitle = $('pv-player-title');
    dom.playerUrl = $('pv-player-url');
    dom.status = $('pv-status');
    dom.statusTitle = $('pv-status-title');
    dom.statusText = $('pv-status-text');

    if (dom.query) {
      dom.query.addEventListener('input', function () {
        state.query = dom.query.value.trim();
        paintGrid();
      });
    }

    if (dom.density) {
      dom.density.addEventListener('click', function () {
        state.minimal = !state.minimal;
        dom.density.setAttribute('aria-pressed', state.minimal ? 'true' : 'false');
        if (dom.densityLabel) dom.densityLabel.textContent = state.minimal ? 'Minimal' : 'Tudo';
        paintGrid();
      });
    }

    const close = $('pv-close');
    if (close) close.addEventListener('click', closePlayer);
    const reload = $('pv-reload');
    if (reload) reload.addEventListener('click', reloadFrame);
    const clean = $('pv-clean');
    if (clean) clean.addEventListener('click', function () { cleanTab(); });
    const statusClean = $('pv-status-clean');
    if (statusClean) statusClean.addEventListener('click', function () { cleanTab(); });
    const statusRetry = $('pv-status-retry');
    if (statusRetry) statusRetry.addEventListener('click', reloadFrame);
    const full = $('pv-full');
    if (full) {
      full.addEventListener('click', function () {
        const shell = dom.player && dom.player.querySelector('.pv-player__shell');
        if (!shell) return;
        if (document.fullscreenElement) document.exitFullscreen();
        else if (shell.requestFullscreen) shell.requestFullscreen().catch(function () {});
      });
    }

    if (dom.frame) {
      dom.frame.addEventListener('load', function () {
        if (!state.open) return;
        clearTimeout(timer);
        setStatus(false);
      });
    }

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && state.open) closePlayer();
    });
  }

  function init() {
    if (!document.getElementById('view-provider')) return;
    bind();
  }

  window.LuminProvider = {
    open: open,
    close: closePlayer,
    current: function () { return state.key; },
    count: function () { return state.items.length; }
  };

  window.addEventListener('lumin:view', function () {
    if (document.documentElement.getAttribute('data-view') === 'provider' && !state.items.length) init();
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
