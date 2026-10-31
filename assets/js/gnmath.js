/* =========================================================
   GN-Math — catálogo e player da aba GN-Math
   Lista de jogos: acervo público do GN-Math (freebuisness),
   capturado em assets/data/gnmath-games.json.
   Tudo aqui é independente do LuminSDK: preferências, favoritos
   e histórico têm chaves próprias no localStorage.
   ========================================================= */
(function () {
  'use strict';

  const DATA_URL = 'assets/data/gnmath-games.json';
  /* O acervo vem do repositório público do GN-Math. O jsDelivr é o principal,
     mas alguns provedores/repos grandes devolvem 404/403; por isso existem
     espelhos — o player tenta um por um antes de desistir. */
  const HTML_MIRRORS = [
    'https://cdn.jsdelivr.net/gh/freebuisness/html@main/',
    'https://raw.githubusercontent.com/freebuisness/html/main/',
    'https://raw.githack.com/freebuisness/html/main/',
    'https://cdn.statically.io/gh/freebuisness/html/main/'
  ];
  const COVER_MIRRORS = [
    'https://cdn.jsdelivr.net/gh/freebuisness/covers@main/',
    'https://raw.githubusercontent.com/freebuisness/covers/main/',
    'https://cdn.statically.io/gh/freebuisness/covers/main/'
  ];
  const COVER_BASE = COVER_MIRRORS[0];
  const HTML_BASE = HTML_MIRRORS[0];
  const STORE = 'gnmath:v1';
  const PAGE_SIZE = 96;

  const TAG_LABELS = {
    port: 'port',
    flash: 'flash',
    emulator: 'emulador',
    fnf: 'fnf',
    nds: 'nds',
    dos: 'dos',
    tools: 'ferramenta',
    psx: 'ps1',
    gba: 'gba',
    nes: 'nes',
    n64: 'n64'
  };

  /* padrão minimalista: neutro, sem grade animada, cursor do sistema */
  const DEFAULT_PREFS = {
    accent: 'grafite',
    bg: 'lisa',
    cursor: 'personalizado',
    density: 'confortavel',
    fx: 'off',
    motion: 'auto',
    sort: 'az'
  };

  const dom = {};
  const state = {
    games: [],
    view: 'todos',
    query: '',
    page: 1,
    sort: 'az',
    favorites: [],
    recents: [],
    current: null,
    loadingGame: false
  };
  /* prefs2: o visual minimalista ignora o conjunto antigo (carmim/grade) */
  const prefs = Object.assign({}, DEFAULT_PREFS, readJSON('prefs3', {}));
  let searchTimer = null;
  let thumbsObserver = null;

  /* ---------- armazenamento ---------- */
  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(STORE + ':' + key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      if (parsed === null || parsed === undefined) return fallback;
      if (Array.isArray(fallback)) return Array.isArray(parsed) ? parsed : fallback;
      if (fallback && typeof fallback === 'object') {
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
      }
      return parsed;
    } catch (error) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(STORE + ':' + key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  /* ---------- utilidades ---------- */
  const $ = (selector, root) => (root || document).querySelector(selector);
  const nf = new Intl.NumberFormat('pt-BR');

  function normalize(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function initials(name) {
    return String(name || '?')
      .replace(/[^\w\s]/g, ' ')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join('');
  }

  function coverOf(game) {
    return COVER_BASE + game.c;
  }

  function fileOf(game) {
    return HTML_BASE + game.f;
  }

  /* todos os endereços possíveis do mesmo jogo */
  function fileSources(game) {
    return HTML_MIRRORS.map(function (base) { return base + game.f; });
  }

  function toast(message) {
    if (!dom.toast) return;
    dom.toast.textContent = message;
    dom.toast.hidden = false;
    dom.toast.classList.add('is-visible');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => {
      dom.toast.classList.remove('is-visible');
      setTimeout(() => { dom.toast.hidden = true; }, 240);
    }, 3000);
  }

  /* ---------- cursor personalizado ---------- */
  /* Desenha um ponto que segue o ponteiro e um anel que corre atrás dele.
     Custo: um único requestAnimationFrame, e só enquanto o anel ainda está
     alcançando o ponteiro — parado, não gasta frame nenhum. */
  const cursor = (function () {
    const fine = (function () {
      if (!window.matchMedia) return true;
      const anyFine = window.matchMedia('(pointer: fine)').matches ||
        window.matchMedia('(any-pointer: fine)').matches;
      const coarse = window.matchMedia('(pointer: coarse)').matches;
      const noHover = window.matchMedia('(hover: none)').matches;
      if (anyFine) return true;
      return !(coarse && noHover);
    })();

    if (!fine) return { start: function () {}, stop: function () {}, pause: function () {} };

    const root = document.documentElement;
    const dot = document.createElement('div');
    const ring = document.createElement('div');
    dot.className = 'gn-cursor-dot';
    dot.setAttribute('aria-hidden', 'true');
    ring.className = 'gn-cursor-ring';
    ring.setAttribute('aria-hidden', 'true');
    document.body.append(dot, ring);

    const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ringPos = { x: pos.x, y: pos.y };
    let looping = false;
    let on = false;

    function smooth() {
      const motion = root.dataset.gnMotion === 'reduzido';
      if (motion) return 1;
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 1;
      return 0.2;
    }

    function animate() {
      if (!on) { looping = false; return; }

      const dx = pos.x - ringPos.x;
      const dy = pos.y - ringPos.y;
      const easing = smooth();

      if (Math.abs(dx) < 0.15 && Math.abs(dy) < 0.15) {
        ringPos.x = pos.x;
        ringPos.y = pos.y;
        ring.style.transform = 'translate3d(' + pos.x + 'px, ' + pos.y + 'px, 0)';
        looping = false;
        return;
      }

      ringPos.x += dx * easing;
      ringPos.y += dy * easing;
      ring.style.transform = 'translate3d(' + ringPos.x + 'px, ' + ringPos.y + 'px, 0)';
      requestAnimationFrame(animate);
    }

    function kick() {
      if (looping || !on) return;
      looping = true;
      requestAnimationFrame(animate);
    }

    function onMove(event) {
      if (event.pointerType === 'touch') return;
      pos.x = event.clientX;
      pos.y = event.clientY;

      if (!root.classList.contains('gn-cursor-active')) {
        root.classList.add('gn-cursor-active');
        ringPos.x = pos.x;
        ringPos.y = pos.y;
        ring.style.transform = 'translate3d(' + pos.x + 'px, ' + pos.y + 'px, 0)';
      }

      dot.style.transform = 'translate3d(' + pos.x + 'px, ' + pos.y + 'px, 0)';
      kick();
    }

    window.addEventListener('pointermove', onMove, { passive: true });

    window.addEventListener('pointerover', (event) => {
      const target = event.target;
      const hit = target && target.closest
        ? target.closest('a, button, [role="button"], input, select, label, summary, .gn-card')
        : null;
      root.classList.toggle('gn-cursor-hover', !!hit);
    }, { passive: true });

    window.addEventListener('pointerdown', () => root.classList.add('gn-cursor-press'));
    window.addEventListener('pointerup', () => root.classList.remove('gn-cursor-press'));
    document.addEventListener('pointerleave', () => {
      root.classList.remove('gn-cursor-active', 'gn-cursor-hover');
      looping = false;
    });

    function start() {
      on = true;
      looping = false;
      root.classList.toggle('gn-cursor-static', smooth() === 1);
      root.classList.add('gn-cursor');
    }

    function stop() {
      on = false;
      looping = false;
      root.classList.remove('gn-cursor', 'gn-cursor-active', 'gn-cursor-hover', 'gn-cursor-press', 'gn-cursor-static');
    }

    return {
      start: start,
      stop: stop,
      pause: () => {
        root.classList.remove('gn-cursor-hover', 'gn-cursor-press');
      }
    };
  })();

  function applyPrefs() {

    const root = document.documentElement;
    root.dataset.gnAccent = prefs.accent;
    root.dataset.gnBg = prefs.bg;
    root.dataset.gnCursor = prefs.cursor;
    root.dataset.gnDensity = prefs.density;
    root.dataset.gnFx = prefs.fx;
    root.dataset.gnMotion = prefs.motion;

    if (prefs.cursor === 'personalizado') cursor.start();
    else cursor.stop();
  }

  /* o ponto e o anel só existem enquanto a aba GN-Math está aberta;
     nas outras abas o cursor volta a ser o do sistema */
  function syncCursorForView() {
    const route = document.documentElement.getAttribute('data-view');
    if (route === 'gn' && prefs.cursor === 'personalizado') cursor.start();
    else cursor.stop();
  }
  window.addEventListener('lumin:view', syncCursorForView);

  function savePrefs() {
    writeJSON('prefs3', prefs);
    applyPrefs();
  }

  /* ---------- favoritos ---------- */
  function isFavorite(id) {
    return state.favorites.indexOf(String(id)) >= 0;
  }

  function toggleFavorite(game) {
    const id = String(game.id);
    const index = state.favorites.indexOf(id);
    if (index >= 0) {
      state.favorites.splice(index, 1);
      toast('“' + game.n + '” saiu dos favoritos');
    } else {
      state.favorites.unshift(id);
      state.favorites = state.favorites.slice(0, 300);
      toast('“' + game.n + '” guardado nos favoritos');
    }
    writeJSON('favs', state.favorites);
    render();
  }

  /* ---------- histórico ---------- */
  function pushRecent(game) {
    state.recents = state.recents.filter((item) => String(item.id) !== String(game.id));
    state.recents.unshift({ id: game.id, n: game.n, c: game.c, f: game.f, at: Date.now() });
    state.recents = state.recents.slice(0, 12);
    writeJSON('recent', state.recents);
    renderRecents();
  }

  /* ---------- filtro + ordenação ---------- */
  function visibleGames() {
    const query = normalize(state.query);
    let list = state.games.slice();

    if (state.view === 'favoritos') {
      list = list.filter((game) => isFavorite(game.id));
    } else if (state.view === 'destaques') {
      list = list.filter((game) => game.ft);
    } else if (state.view !== 'todos') {
      list = list.filter((game) => (game.t || []).indexOf(state.view) >= 0);
    }

    if (query) {
      list = list.filter((game) => {
        if (normalize(game.n).indexOf(query) >= 0) return true;
        if (normalize(game.a || '').indexOf(query) >= 0) return true;
        return (game.t || []).some((tag) => normalize(TAG_LABELS[tag] || tag).indexOf(query) >= 0);
      });
    }

    if (state.sort === 'az') list.sort((a, b) => a.n.localeCompare(b.n, 'pt-BR'));
    else if (state.sort === 'za') list.sort((a, b) => b.n.localeCompare(a.n, 'pt-BR'));
    else if (state.sort === 'novos') list.sort((a, b) => b.id - a.id);
    else list.sort((a, b) => a.id - b.id);

    return list;
  }

  /* ---------- grade ---------- */
  function cardFor(game) {
    const card = document.createElement('article');
    card.className = 'gn-card';
    card.dataset.gameId = String(game.id);
    card.dataset.gameName = game.n;

    const art = document.createElement('div');
    art.className = 'gn-card__art';

    const initialsEl = document.createElement('span');
    initialsEl.className = 'gn-card__initials';
    initialsEl.textContent = initials(game.n);
    art.append(initialsEl);

    const img = document.createElement('img');
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.dataset.src = coverOf(game);
    img.dataset.mirror = '0';
    img.addEventListener('load', () => img.classList.add('is-loaded'));
    /* capa que falha: tenta o próximo espelho antes de desistir (aí fica o
       monograma da carta, que já está desenhado por baixo) */
    img.addEventListener('error', () => {
      const tried = img.dataset.mirror ? Number(img.dataset.mirror) : 0;
      const next = tried + 1;
      if (next < COVER_MIRRORS.length) {
        img.dataset.mirror = String(next);
        img.src = COVER_MIRRORS[next] + game.c;
      } else {
        img.remove();
      }
    });
    art.append(img);

    const playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.className = 'gn-card__play';
    playBtn.setAttribute('aria-label', 'Jogar ' + game.n);
    playBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.2v13.6L19 12z"/></svg><span>Jogar</span>';
    playBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      openGame(game);
    });
    art.append(playBtn);

    const fav = document.createElement('button');
    fav.type = 'button';
    fav.className = 'gn-card__fav' + (isFavorite(game.id) ? ' is-on' : '');
    fav.setAttribute('aria-label', (isFavorite(game.id) ? 'Remover ' : 'Adicionar ') + game.n + (isFavorite(game.id) ? ' dos favoritos' : ' aos favoritos'));
    fav.innerHTML = '<svg viewBox="0 0 24 24" fill="' + (isFavorite(game.id) ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.6l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 10l6.1-.9z"/></svg>';
    fav.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleFavorite(game);
    });
    art.append(fav);

    const body = document.createElement('div');
    body.className = 'gn-card__body';

    const name = document.createElement('span');
    name.className = 'gn-card__name';
    name.textContent = game.n;
    body.append(name);

    const tags = (game.t || []).slice(0, 2);
    if (tags.length) {
      const wrap = document.createElement('div');
      wrap.className = 'gn-card__tags';
      tags.forEach((tag) => {
        const chip = document.createElement('span');
        chip.className = 'gn-card__tag';
        chip.textContent = TAG_LABELS[tag] || tag;
        wrap.append(chip);
      });
      body.append(wrap);
    }

    card.append(art, body);
    card.addEventListener('click', () => openGame(game));
    return card;
  }

  function observeThumbs() {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.gn-card__art img[data-src]').forEach((img) => {
        img.src = img.dataset.src;
        delete img.dataset.src;
      });
      return;
    }
    if (!thumbsObserver) {
      thumbsObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const img = entry.target;
          thumbsObserver.unobserve(img);
          if (img.dataset.src) {
            img.src = img.dataset.src;
            delete img.dataset.src;
          }
        });
      }, { rootMargin: '300px' });
    }
    document.querySelectorAll('.gn-card__art img[data-src]').forEach((img) => thumbsObserver.observe(img));
  }

  function render() {
    if (!dom.grid) return;
    const list = visibleGames();
    const shown = list.slice(0, state.page * PAGE_SIZE);

    dom.grid.textContent = '';
    const fragment = document.createDocumentFragment();
    shown.forEach((game) => fragment.append(cardFor(game)));
    dom.grid.append(fragment);
    observeThumbs();

    if (dom.empty) dom.empty.hidden = shown.length > 0;
    if (dom.count) dom.count.textContent = nf.format(list.length);

    if (dom.more) {
      const hasMore = shown.length < list.length;
      dom.more.hidden = !hasMore;
      dom.moreButton.textContent = 'Mostrar mais ' + nf.format(Math.min(PAGE_SIZE, list.length - shown.length));
    }

    if (dom.chips) {
      dom.chips.querySelectorAll('[data-view]').forEach((chip) => {
        chip.classList.toggle('is-active', chip.dataset.view === state.view);
      });
    }
    if (dom.subtitle) {
      const viewLabel = {
        todos: 'todos os jogos',
        destaques: 'destaques',
        favoritos: 'seus favoritos'
      }[state.view];
      dom.subtitle.textContent = state.query
        ? 'buscando “' + state.query + '”'
        : viewLabel || (TAG_LABELS[state.view] || state.view);
    }
  }

  function renderTags() {
    if (!dom.tagWrap) return;
    const counts = new Map();
    state.games.forEach((game) => {
      (game.t || []).forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1));
    });
    const ordered = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    dom.tagWrap.textContent = '';
    ordered.forEach(([tag, total]) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'gn-chip';
      chip.dataset.view = tag;
      chip.textContent = TAG_LABELS[tag] || tag;
      const count = document.createElement('span');
      count.textContent = total;
      chip.append(count);
      dom.tagWrap.append(chip);
    });
  }

  function renderRecents() {
    if (!dom.recentsWrap) return;
    const items = state.recents.slice(0, 8);
    dom.recentsWrap.hidden = items.length === 0;
    if (!items.length) return;
    dom.recentsGrid.textContent = '';
    const fragment = document.createDocumentFragment();
    items.forEach((item) => {
      const game = state.games.find((g) => String(g.id) === String(item.id)) || item;
      fragment.append(cardFor(game));
    });
    dom.recentsGrid.append(fragment);
    observeThumbs();
  }

  /* ---------- player ---------- */
  const BASE_TAG_RE = /<base\b[^>]*>/i;
  const BASE_HREF_RE = /<base\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s">]+))[^>]*>/i;

  function zoneBaseFor(url, html) {
    const folder = url.substring(0, url.lastIndexOf('/') + 1);
    let root;
    try {
      root = new URL(folder, document.baseURI).href;
    } catch (error) {
      root = folder;
    }
    const match = html.match(BASE_HREF_RE);
    const declared = match ? (match[1] !== undefined ? match[1] : match[2] !== undefined ? match[2] : match[3]) : '';
    if (!declared) return root;
    try {
      return new URL(declared, root).href;
    } catch (error) {
      return root;
    }
  }

  function injectBase(html, url) {
    const tag = '<base href="' + zoneBaseFor(url, html) + '">';
    if (BASE_TAG_RE.test(html)) return html.replace(BASE_TAG_RE, tag);
    if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => m + tag);
    if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (m) => m + tag);
    return tag + html;
  }

  function setPlayerStatus(kind, title, text, actionLabel, onAction) {
    if (!dom.playerStatus) return;
    if (!kind) {
      dom.playerStatus.hidden = true;
      return;
    }
    dom.playerStatus.hidden = false;
    dom.playerStatus.innerHTML = '';

    if (kind === 'loading') {
      const spin = document.createElement('div');
      spin.className = 'gn-spinner';
      dom.playerStatus.append(spin);
    }

    const box = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = title || '';
    box.append(strong);
    if (text) {
      const p = document.createElement('p');
      p.style.margin = '0';
      p.textContent = text;
      box.append(p);
    }
    if (actionLabel && onAction) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'gn-btn gn-btn--accent';
      button.textContent = actionLabel;
      button.addEventListener('click', onAction);
      box.append(button);
    }
    dom.playerStatus.append(box);
  }

  function setSubtitle(game) {
    if (!dom.playerSub) return;
    dom.playerSub.textContent = '';
    const tag = document.createElement('span');
    tag.className = 'gn-player__tag';
    tag.textContent = (game.t && game.t.length ? TAG_LABELS[game.t[0]] || game.t[0] : 'gn-math');
    dom.playerSub.append(tag);

    if (game.a) {
      const author = document.createElement('span');
      author.textContent = 'por ' + game.a;
      dom.playerSub.append(author);
    }
    const source = document.createElement('span');
    source.textContent = '· gn-math';
    dom.playerSub.append(source);
  }

  function openGame(game) {
    state.current = game;
    pushRecent(game);
    cursor.pause();
    if (window.LuminSocial) window.LuminSocial.setPlaying(true);
    if (dom.player) {
      dom.player.classList.add('is-open');
      dom.player.setAttribute('open', '');
      document.body.style.overflow = 'hidden';
    }
    if (dom.playerTitle) dom.playerTitle.textContent = game.n;
    setSubtitle(game);
    loadGame(game);
    if (dom.playerShell) dom.playerShell.focus({ preventScroll: true });
  }

  async function loadGame(game) {
    if (!dom.frame) return;
    state.loadingGame = true;
    dom.frame.removeAttribute('srcdoc');
    dom.frame.src = 'about:blank';
    setPlayerStatus('loading', 'Abrindo “' + game.n + '”…', 'Buscando o jogo no acervo do GN-Math.');

    const sources = fileSources(game);
    let html = '';
    let used = '';

    for (let i = 0; i < sources.length && !html; i++) {
      try {
        const response = await fetch(sources[i], { cache: 'force-cache' });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const text = await response.text();
        if (!text || text.length < 40) throw new Error('arquivo vazio');
        html = text;
        used = sources[i];
      } catch (error) {
        /* tenta o próximo espelho */
      }
    }

    if (!html) {
      /* nenhum espelho respondeu ao fetch: entrega o endereço ao iframe.
         Se o navegador conseguir abrir direto, o jogo funciona mesmo assim. */
      state.loadingGame = false;
      dom.frame.src = sources[0];
      setPlayerStatus(
        'error',
        'Carregando direto do acervo',
        'O espelho principal não respondeu; tentando abrir o arquivo no player. ' +
          'Se a tela ficar em branco, use “Abrir em outra aba”.',
        'Abrir em outra aba',
        () => window.open(sources[0], '_blank', 'noopener')
      );
      return;
    }

    if (/ytgame/i.test(html)) {
      state.loadingGame = false;
      setPlayerStatus(
        'notice',
        'Este jogo só roda na própria aba',
        'O GN-Math classifica “' + game.n + '” como YouTube Playables, que não funciona embutido.',
        'Abrir em outra aba',
        () => window.open(used, '_blank', 'noopener')
      );
      return;
    }

    dom.frame.srcdoc = injectBase(html, used);
    setPlayerStatus(null);
    state.loadingGame = false;
  }

  function closePlayer() {
    if (!state.current) return;
    state.current = null;
    if (window.LuminSocial) window.LuminSocial.setPlaying(false);
    if (dom.player) {
      dom.player.classList.remove('is-open');
      dom.player.removeAttribute('open');
      document.body.style.overflow = '';
    }
    if (dom.frame) {
      dom.frame.removeAttribute('srcdoc');
      dom.frame.src = 'about:blank';
    }
    setPlayerStatus(null);
  }

  function toggleFullscreen() {
    const shell = dom.playerShell;
    if (!shell) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      return;
    }
    if (shell.requestFullscreen) shell.requestFullscreen().catch(() => toast('O navegador não liberou a tela cheia.'));
  }

  /* ---------- painel de ajustes ---------- */
  function openSheet() {
    if (!dom.sheet) return;
    dom.sheet.classList.add('is-open');
    dom.sheet.removeAttribute('hidden');
    syncSheet();
  }

  function closeSheet() {
    if (!dom.sheet) return;
    dom.sheet.classList.remove('is-open');
    dom.sheet.setAttribute('hidden', '');
  }

  function syncSheet() {
    if (!dom.sheet) return;
    dom.sheet.querySelectorAll('[data-pref]').forEach((group) => {
      const key = group.dataset.pref;
      group.querySelectorAll('[data-value]').forEach((button) => {
        button.classList.toggle('is-active', button.dataset.value === String(prefs[key]));
        button.setAttribute('aria-pressed', button.dataset.value === String(prefs[key]) ? 'true' : 'false');
      });
    });
    dom.sheet.querySelectorAll('[data-toggle]').forEach((button) => {
      const key = button.dataset.toggle;
      const on = key === 'fx' ? prefs.fx === 'on' : prefs.motion === 'reduzido';
      button.classList.toggle('is-on', on);
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function bindSheet() {
    if (!dom.sheet) return;
    dom.sheet.addEventListener('click', (event) => {
      const option = event.target.closest('[data-value]');
      if (option) {
        const group = option.closest('[data-pref]');
        if (group) {
          prefs[group.dataset.pref] = option.dataset.value;
          savePrefs();
          syncSheet();
        }
        return;
      }
      const toggle = event.target.closest('[data-toggle]');
      if (toggle) {
        const key = toggle.dataset.toggle;
        if (key === 'fx') prefs.fx = prefs.fx === 'on' ? 'off' : 'on';
        else prefs.motion = prefs.motion === 'reduzido' ? 'auto' : 'reduzido';
        savePrefs();
        syncSheet();
        return;
      }
      if (event.target === dom.sheet || event.target.closest('[data-close-sheet]')) closeSheet();
    });

    if (dom.sheetReset) {
      dom.sheetReset.addEventListener('click', () => {
        Object.assign(prefs, DEFAULT_PREFS);
        savePrefs();
        syncSheet();
        toast('Ajustes do GN-Math restaurados');
      });
    }
    if (dom.sheetClear) {
      dom.sheetClear.addEventListener('click', () => {
        state.favorites = [];
        state.recents = [];
        writeJSON('favs', []);
        writeJSON('recent', []);
        render();
        renderRecents();
        toast('Favoritos e histórico do GN-Math apagados');
      });
    }
  }

  /* ---------- ligações ---------- */
  function bind() {
    dom.grid = $('#gn-grid');
    dom.empty = $('#gn-empty');
    dom.count = $('#gn-count');
    dom.subtitle = $('#gn-subtitle');
    dom.more = $('#gn-more');
    dom.moreButton = $('#gn-more-btn');
    dom.chips = $('#gn-chips');
    dom.search = $('#gn-search-input');
    dom.sort = $('#gn-sort');
    dom.player = $('#gn-player');
    dom.playerShell = $('#gn-player-shell');
    dom.playerTitle = $('#gn-player-title');
    dom.playerSub = $('#gn-player-sub');
    dom.playerStatus = $('#gn-player-status');
    dom.playerClose = $('#gn-player-close');
    dom.frame = $('#gn-frame');
    dom.sheet = $('#gn-sheet');
    dom.sheetReset = $('#gn-sheet-reset');
    dom.sheetClear = $('#gn-sheet-clear');
    dom.toast = $('#gn-toast');
    dom.tagWrap = $('#gn-tags');
    dom.recentsWrap = $('#gn-recents');
    dom.recentsGrid = $('#gn-recents-grid');
    dom.total = $('#gn-total');
    dom.featured = $('#gn-featured');

    if (dom.search) {
      dom.search.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
          state.query = dom.search.value.trim();
          state.page = 1;
          render();
        }, 170);
      });
    }

    if (dom.chips) {
      dom.chips.addEventListener('click', (event) => {
        const chip = event.target.closest('[data-view]');
        if (!chip) return;
        state.view = chip.dataset.view;
        state.page = 1;
        render();
      });
    }

    if (dom.sort) {
      dom.sort.addEventListener('change', () => {
        state.sort = dom.sort.value;
        prefs.sort = state.sort;
        savePrefs();
        state.page = 1;
        render();
      });
    }

    if (dom.moreButton) {
      dom.moreButton.addEventListener('click', () => {
        state.page += 1;
        render();
      });
    }

    if (dom.playerClose) dom.playerClose.addEventListener('click', closePlayer);
    if (dom.player) {
      dom.player.addEventListener('click', (event) => {
        if (event.target === dom.player) closePlayer();
      });
    }

    const reload = $('#gn-player-reload');
    if (reload) reload.addEventListener('click', () => state.current && loadGame(state.current));

    const external = $('#gn-player-external');
    if (external) {
      external.addEventListener('click', () => {
        if (state.current) window.open(fileOf(state.current), '_blank', 'noopener');
      });
    }

    const full = $('#gn-player-full');
    if (full) full.addEventListener('click', toggleFullscreen);

    const settings = $('#gn-settings-btn');
    if (settings) settings.addEventListener('click', openSheet);
    if (dom.sheet) bindSheet();

    const random = $('#gn-random');
    if (random) {
      random.addEventListener('click', () => {
        const pool = visibleGames();
        if (!pool.length) return toast('Nenhum jogo nessa seleção');
        openGame(pool[Math.floor(Math.random() * pool.length)]);
      });
    }

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (dom.sheet && dom.sheet.classList.contains('is-open')) {
        closeSheet();
        return;
      }
      if (state.current) closePlayer();
    });

    /* o brilho do fundo segue o ponteiro, mas só um frame por movimento:
       antes cada pixel de mouse mexia no estilo e recalculava a página toda */
    let bgFrame = 0;
    let bgPoint = { x: 0, y: 0 };
    document.addEventListener('pointermove', (event) => {
      if (prefs.fx !== 'on' || event.pointerType === 'touch') return;
      bgPoint.x = event.clientX;
      bgPoint.y = event.clientY;
      if (bgFrame) return;
      bgFrame = requestAnimationFrame(() => {
        bgFrame = 0;
        const bg = $('.gn-bg');
        if (!bg) return;
        bg.style.setProperty('--gn-mx', ((bgPoint.x / window.innerWidth) * 100).toFixed(2) + '%');
        bg.style.setProperty('--gn-my', ((bgPoint.y / window.innerHeight) * 100).toFixed(2) + '%');
      });
    }, { passive: true });
  }

  function syncControls() {
    if (dom.sort) dom.sort.value = prefs.sort;
    state.sort = prefs.sort || 'az';
  }

  /* ---------- carregamento ---------- */
  async function loadGames() {
    try {
      const response = await fetch(DATA_URL, { cache: 'force-cache' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      state.games = (Array.isArray(data.games) ? data.games : []).filter(
        (game) => game && game.n && game.f && game.n.indexOf('[!]') !== 0 &&
          /* fora entradas sem nome de verdade ("-3", "-b"), que só sujam a grade */
          (String(game.n).match(/[A-Za-zÀ-ÿ]/g) || []).length >= 2
      );
    } catch (error) {
      state.games = [];
      if (dom.grid) {
        dom.grid.textContent = '';
        const warning = document.createElement('div');
        warning.className = 'gn-empty';
        warning.textContent = 'Não foi possível abrir a lista de jogos do GN-Math agora. Recarregue a página em instantes.';
        dom.grid.append(warning);
      }
      return;
    }

    renderTags();
    if (dom.total) dom.total.textContent = nf.format(state.games.length);
    if (dom.featured) dom.featured.textContent = nf.format(state.games.filter((g) => g.ft).length);
    render();
    renderRecents();

    const params = new URLSearchParams(window.location.search);
    const deep = params.get('jogo');
    if (deep) {
      const game = state.games.find((g) => String(g.id) === String(deep));
      if (game) openGame(game);
    }
  }

  function init() {
    applyPrefs();
    syncCursorForView();
    bind();
    syncControls();
    state.favorites = (readJSON('favs', []) || []).map(String);
    state.recents = readJSON('recent', []) || [];
    syncSheet();
    renderRecents();
    loadGames();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
