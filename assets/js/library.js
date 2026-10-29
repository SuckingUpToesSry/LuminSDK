/* =========================================================
   LuminSDK — biblioteca de jogos
   Interface própria construída sobre a API headless do LuminSDK.
   Se algo falhar, cai automaticamente para a interface original.
   Autor: Ryan Smith · Licença MIT
   ========================================================= */
(function () {
  'use strict';

  const CONFIG = {
    maxGamesPerPage: 48,     // teto de jogos por página
    containerWidth: 1240,    // precisa bater com --container do CSS
    maxCategories: 18,
    bootTimeout: 18000,
    fallbackTimeout: 10000,
    requestTimeout: 25000,
    searchDebounce: 380
  };

  /* Paleta usada nos placeholders dos cards (enquanto a capa carrega) */
  const PALETTE = [
    ['#4c1d95', '#0f172a'],
    ['#0e7490', '#0b1120'],
    ['#831843', '#111827'],
    ['#1e3a8a', '#0b1120'],
    ['#365314', '#0b1120'],
    ['#7c2d12', '#111827'],
    ['#312e81', '#0b1120'],
    ['#155e75', '#111827']
  ];

  const state = {
    connected: false,
    mode: 'boot',            // boot | custom | fallback | demo | error
    loading: false,
    page: 1,
    pages: 1,
    total: 0,
    limit: gamesPerPageForViewport(),
    query: '',
    category: '',
    sort: 'default',
    random: false,
    games: [],
    categories: [],
    thumbs: new Map(),
    currentGame: null
  };

  const dom = {};
  let searchTimer = null;
  let imageObserver = null;
  let booted = false;
  let expectedFrameSrc = '';

  /* Quantos jogos por página: replica a conta da grade (colunas x linhas),
     para que a última linha nunca fique pela metade. */
  function layoutInfo() {
    const width = window.innerWidth || 1280;
    const compact = width <= 640;
    const padding = Math.min(34, Math.max(18, width * 0.04));
    const content = Math.min(CONFIG.containerWidth, width) - padding * 2;
    const minCard = compact ? 100 : 120;
    const gap = compact ? 8 : 10;
    const columns = Math.max(2, Math.floor((content + gap) / (minCard + gap)));
    const rows = width >= 1024 ? 4 : 6;
    return { columns: columns, rows: rows };
  }

  function gamesPerPageForViewport() {
    const layout = layoutInfo();
    return Math.min(CONFIG.maxGamesPerPage, Math.max(12, layout.columns * layout.rows));
  }

  /* ---------- helpers ---------- */
  const $ = (selector, root) => (root || document).querySelector(selector);

  function el(tag, props, children) {
    const node = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach((key) => {
        const value = props[key];
        if (value === undefined || value === null) return;
        if (key === 'class') node.className = value;
        else if (key === 'text') node.textContent = value;
        else if (key === 'dataset') Object.assign(node.dataset, value);
        else if (key === 'style') node.setAttribute('style', value);
        else if (key in node) node[key] = value;
        else node.setAttribute(key, value);
      });
    }
    (children || []).forEach((child) => {
      if (child === null || child === undefined) return;
      node.append(child);
    });
    return node;
  }

  const nf = new Intl.NumberFormat('pt-BR');

  function withTimeout(promise, ms, message) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(message || 'Tempo esgotado')), ms);
      Promise.resolve(promise).then(
        (value) => { clearTimeout(timer); resolve(value); },
        (error) => { clearTimeout(timer); reject(error); }
      );
    });
  }

  function initials(name) {
    return String(name || '?')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join('');
  }

  function paletteFor(seed) {
    let hash = 0;
    const text = String(seed || '');
    for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
    return PALETTE[hash % PALETTE.length];
  }

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  function toast(message) {
    if (!dom.toast) return;
    dom.toast.textContent = message;
    dom.toast.hidden = false;
    requestAnimationFrame(() => dom.toast.classList.add('is-visible'));
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => {
      dom.toast.classList.remove('is-visible');
      setTimeout(() => { dom.toast.hidden = true; }, 240);
    }, 3200);
  }

  /* ---------- cache de elementos ---------- */
  function cacheDom() {
    dom.grid = $('#games');
    dom.search = $('#game-search');
    dom.clear = $('#search-clear');
    dom.sort = $('#game-sort');
    dom.randomBtn = $('#random-btn');
    dom.chips = $('#categories');
    dom.summary = $('#results-summary');
    dom.pagination = $('#pagination');
    dom.pages = $('#pagination-pages');
    dom.prev = $('#page-prev');
    dom.next = $('#page-next');
    dom.empty = $('#empty-state');
    dom.emptyTitle = $('#empty-title');
    dom.emptyText = $('#empty-text');
    dom.emptyReset = $('#empty-reset');
    dom.error = $('#error-state');
    dom.errorText = $('#error-text');
    dom.errorRetry = $('#error-retry');
    dom.errorDemo = $('#error-demo');
    dom.randomBar = $('#random-bar');
    dom.randomReset = $('#random-reset');
    dom.fallback = $('#lumin-fallback');
    dom.fallbackMount = $('#lumin-fallback-mount');
    dom.toolbar = $('.toolbar');
    dom.status = $('#sdk-status');
    dom.statusText = $('#sdk-status-text');
    dom.statCategories = $('#stat-categories');
    dom.toast = $('#toast');
    dom.player = $('#player');
    dom.playerFrame = $('#player-frame');
    dom.playerTitle = $('#player-title');
    dom.playerLoading = $('#player-loading');
    dom.playerClose = $('#player-close');
    dom.playerFullscreen = $('#player-fullscreen');
    dom.playerRestart = $('#player-restart');
  }

  /* ---------- status ---------- */
  function setStatus(kind, text) {
    if (!dom.status) return;
    dom.status.dataset.state = kind;
    if (dom.statusText) dom.statusText.textContent = text;
  }

  /* ---------- esqueletos ---------- */
  function renderSkeletons(count) {
    if (!dom.grid) return;
    hideState();
    dom.grid.hidden = false;
    dom.grid.setAttribute('aria-busy', 'true');
    dom.grid.replaceChildren();
    for (let i = 0; i < count; i++) {
      dom.grid.append(
        el('div', { class: 'game-skeleton', 'aria-hidden': 'true' }, [
          el('div', { class: 'game-skeleton__media' }),
          el('div', { class: 'game-skeleton__line' }),
          el('div', { class: 'game-skeleton__line game-skeleton__line--short' })
        ])
      );
    }
  }

  function hideState() {
    if (dom.empty) dom.empty.hidden = true;
    if (dom.error) dom.error.hidden = true;
  }

  function showError(error) {
    if (!dom.grid) return;
    state.mode = 'error';
    dom.grid.replaceChildren();
    dom.grid.hidden = true;
    dom.grid.setAttribute('aria-busy', 'false');
    dom.pagination.hidden = true;
    dom.randomBar.hidden = true;
    dom.summary.textContent = '';
    dom.empty.hidden = true;
    if (dom.errorText) {
      dom.errorText.textContent =
        (error && error.message ? error.message + ' ' : '') +
        'Verifique sua conexão, desative bloqueadores de script e tente novamente.';
    }
    dom.error.hidden = false;
    setStatus('error', 'Indisponível');
  }

  /* ---------- categorias ---------- */
  function renderChips() {
    if (!dom.chips) return;
    dom.chips.replaceChildren();

    const all = el('button', {
      class: 'chip' + (state.category ? '' : ' is-active'),
      type: 'button',
      dataset: { category: '' },
      text: 'Todos'
    });
    dom.chips.append(all);

    state.categories.slice(0, CONFIG.maxCategories).forEach((category) => {
      dom.chips.append(
        el('button', {
          class: 'chip' + (state.category === category ? ' is-active' : ''),
          type: 'button',
          dataset: { category: category },
          text: category
        })
      );
    });
  }

  async function loadCategories() {
    try {
      const result = await withTimeout(
        Lumin.getCategories(),
        CONFIG.requestTimeout,
        'Não foi possível carregar as categorias.'
      );
      const list = Array.isArray(result) ? result : result && result.categories;
      if (Array.isArray(list) && list.length) {
        state.categories = [...new Set(list.filter((c) => typeof c === 'string' && c.trim()))].sort((a, b) =>
          a.localeCompare(b, 'pt-BR')
        );
        renderChips();
        if (dom.statCategories) {
          dom.statCategories.textContent = nf.format(state.categories.length);
          dom.statCategories.removeAttribute('data-count');
        }
      }
    } catch (error) {
      /* categorias são um extra: falha aqui não quebra a biblioteca */
      console.warn('[LuminSDK] categorias indisponíveis:', error);
    }
  }

  /* ---------- carregamento de jogos ---------- */
  function activeQuery() {
    return (state.query || state.category || '').trim();
  }

  function sortGames(list) {
    const games = list.slice();
    if (state.sort === 'az') {
      games.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'));
    } else if (state.sort === 'za') {
      games.sort((a, b) => String(b.name || '').localeCompare(String(a.name || ''), 'pt-BR'));
    }
    return games;
  }

  async function loadPage(page) {
    if (!state.connected || state.loading) return;
    state.loading = true;
    state.random = false;
    state.mode = 'custom';
    dom.randomBar.hidden = true;
    renderSkeletons(state.limit);

    const query = activeQuery();

    try {
      let result = await withTimeout(
        Lumin.getGames({ page: page, limit: state.limit, q: query }),
        CONFIG.requestTimeout,
        'O catálogo demorou demais para responder.'
      );

      let games = (result && Array.isArray(result.games)) ? result.games : [];

      /* Se a busca não retornou nada, tentamos a busca por nome antes de
         mostrar o estado vazio. Nunca fazemos isso por categoria, para não
         exibir jogos fora do filtro escolhido. */
      if (!games.length && state.query) {
        try {
          const fallback = await withTimeout(Lumin.search(state.query), CONFIG.requestTimeout);
          const altGames = Array.isArray(fallback) ? fallback : fallback && fallback.games;
          if (Array.isArray(altGames) && altGames.length) {
            result = {
              games: altGames.slice(0, state.limit),
              total: (fallback && fallback.total) || altGames.length,
              page: 1,
              pages: 1
            };
            games = result.games;
          }
        } catch (error) {
          /* silencioso: seguimos para o estado vazio */
        }
      }

      state.games = games;
      state.page = Number(result && result.page) || page;
      state.pages = Math.max(1, Number(result && result.pages) || Math.ceil((Number(result && result.total) || games.length) / state.limit) || 1);
      state.total = Number(result && result.total) || games.length;

      if (!games.length) {
        showEmpty();
      } else {
        renderGames();
      }
      updateSummary();
      renderPagination();
      setStatus('online', 'Online');
    } catch (error) {
      console.error('[LuminSDK] erro ao carregar jogos:', error);
      if (!state.games.length) showError(error);
      else toast('Não foi possível carregar mais jogos.');
    } finally {
      state.loading = false;
      ensureConnectedUi();
    }
  }

  async function loadRandom() {
    if (!state.connected || state.loading) return;
    if (typeof Lumin.getRandomGames !== 'function') {
      return loadPage(state.page);
    }
    state.loading = true;
    state.random = true;
    state.mode = 'custom';
    renderSkeletons(Math.min(state.limit, 24));
    dom.randomBar.hidden = true;

    try {
      const result = await withTimeout(
        Lumin.getRandomGames(state.limit),
        CONFIG.requestTimeout,
        'Não foi possível sortear jogos.'
      );
      const games = (result && Array.isArray(result.games)) ? result.games : (Array.isArray(result) ? result : []);
      state.games = games;
      state.total = games.length;
      state.pages = 1;
      state.page = 1;
      if (!games.length) {
        showEmpty();
      } else {
        renderGames();
        dom.randomBar.hidden = false;
      }
      dom.summary.textContent = games.length
        ? 'Seleção aleatória com ' + nf.format(games.length) + ' jogos.'
        : '';
      dom.pagination.hidden = true;
    } catch (error) {
      console.error('[LuminSDK] erro no sorteio:', error);
      showError(error);
    } finally {
      state.loading = false;
      ensureConnectedUi();
    }
  }

  function ensureConnectedUi() {
    if (!dom.grid) return;
    dom.grid.setAttribute('aria-busy', 'false');
  }

  function updateSummary() {
    if (!dom.summary) return;
    if (state.random) return;

    const showing = state.games.length;
    if (!showing) {
      dom.summary.textContent = '';
      return;
    }

    const parts = [];
    if (state.query) parts.push('Busca por “' + state.query + '”');
    if (state.category) parts.push('Categoria: ' + state.category);
    const scope = parts.length ? parts.join(' · ') + ' — ' : '';

    dom.summary.textContent =
      scope +
      'Mostrando ' + nf.format(showing) +
      ' de ' + nf.format(state.total) + ' jogos' +
      (state.pages > 1 ? ' · página ' + state.page + ' de ' + nf.format(state.pages) : '');
  }

  /* ---------- renderização dos cards ---------- */
  function createCard(game, index) {
    const name = game && game.name ? String(game.name) : 'Jogo ' + (index + 1);
    const category = game && typeof game.category === 'string' ? game.category : '';
    const palette = paletteFor(game && game.id ? game.id : name);

    const img = el('img', {
      alt: '',
      loading: 'lazy',
      decoding: 'async'
    });
    img.addEventListener('load', () => img.classList.add('is-loaded'));

    const media = el('span', { class: 'game-card__media', style: '--g1:' + palette[0] + ';--g2:' + palette[1] }, [
      img,
      el('span', { class: 'game-card__monogram', 'aria-hidden': 'true', text: initials(name) }),
      el('span', { class: 'game-card__play', 'aria-hidden': 'true', text: '▶ Jogar' })
    ]);

    const card = el('button', {
      class: 'game-card',
      type: 'button',
      'aria-label': 'Jogar ' + name,
      dataset: { gameId: game && game.id ? String(game.id) : '' }
    }, [
      media,
      el('span', { class: 'game-card__body' }, [
        el('span', { class: 'game-card__name', text: name }),
        category ? el('span', { class: 'game-card__cat', text: category }) : null
      ])
    ]);

    card.addEventListener('click', () => openGame(game, name));

    if (!state.mode.startsWith('demo') && game && game.image_token) {
      card.dataset.token = game.image_token;
      observeThumb(card);
    }

    return card;
  }

  function observeThumb(card) {
    if (!('IntersectionObserver' in window)) {
      loadThumb(card);
      return;
    }
    if (!imageObserver) {
      imageObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          imageObserver.unobserve(entry.target);
          loadThumb(entry.target);
        });
      }, { rootMargin: '300px 0px' });
    }
    imageObserver.observe(card);
  }

  async function loadThumb(card) {
    const id = card.dataset.gameId;
    const token = card.dataset.token;
    const img = card.querySelector('img');
    if (!img || !token) return;

    const cached = state.thumbs.get(id);
    if (cached) {
      img.src = cached;
      return;
    }

    try {
      const url = await Lumin.getImageUrl(token);
      if (typeof url === 'string' && url) {
        if (state.thumbs.size > 400) state.thumbs.clear();
        state.thumbs.set(id, url);
        img.src = url;
      }
    } catch (error) {
      /* mantém o placeholder com as iniciais */
    }
  }

  function renderGames() {
    if (!dom.grid) return;
    hideState();
    dom.grid.hidden = false;
    dom.grid.replaceChildren();

    const games = sortGames(state.games);
    const fragment = document.createDocumentFragment();
    games.forEach((game, index) => fragment.append(createCard(game, index)));
    dom.grid.append(fragment);
    dom.grid.setAttribute('aria-busy', 'false');
  }

  function showEmpty() {
    if (!dom.empty) return;
    dom.grid.replaceChildren();
    dom.grid.hidden = true;
    dom.grid.setAttribute('aria-busy', 'false');
    dom.pagination.hidden = true;
    dom.randomBar.hidden = true;

    const term = state.query || state.category;
    dom.emptyTitle.textContent = term ? 'Nada encontrado para “' + term + '”' : 'Nenhum jogo encontrado';
    dom.emptyText.textContent = term
      ? 'Tente outra palavra, verifique a escrita ou explore todas as categorias.'
      : 'O catálogo não retornou jogos agora. Tente novamente em instantes.';
    dom.empty.hidden = false;
    dom.summary.textContent = '';
  }

  /* ---------- paginação ---------- */
  function renderPagination() {
    if (!dom.pagination) return;

    if (state.random || state.pages <= 1) {
      dom.pagination.hidden = true;
      return;
    }

    dom.pagination.hidden = false;
    dom.prev.disabled = state.page <= 1;
    dom.next.disabled = state.page >= state.pages;
    dom.pages.replaceChildren();

    pageWindow(state.page, state.pages).forEach((value) => {
      if (value === '…') {
        dom.pages.append(el('span', { class: 'page-ellipsis', text: '…' }));
        return;
      }
      const button = el('button', {
        class: 'page-btn',
        type: 'button',
        text: String(value),
        'aria-label': 'Página ' + value,
        'aria-current': value === state.page ? 'page' : null
      });
      button.addEventListener('click', () => goToPage(value));
      dom.pages.append(button);
    });
  }

  function pageWindow(current, total) {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages = new Set([1, total, current, current - 1, current + 1]);
    if (current <= 3) [2, 3, 4].forEach((p) => pages.add(p));
    if (current >= total - 2) [total - 1, total - 2, total - 3].forEach((p) => pages.add(p));

    const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
    const output = [];
    sorted.forEach((page, index) => {
      if (index > 0 && page - sorted[index - 1] > 1) output.push('…');
      output.push(page);
    });
    return output;
  }

  function goToPage(page) {
    if (state.loading) return;
    if (page < 1 || page > state.pages || page === state.page) return;
    loadPage(page).then(() => {
      const library = document.getElementById('biblioteca');
      if (library) {
        const top = library.getBoundingClientRect().top + window.scrollY - 90;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    });
  }

  /* ---------- player ---------- */
  function setPlayerLoading(isLoading) {
    if (dom.playerLoading) dom.playerLoading.hidden = !isLoading;
  }

  function openPlayerDialog() {
    if (!dom.player) return;
    if (typeof dom.player.showModal === 'function') {
      if (!dom.player.open) dom.player.showModal();
    } else {
      dom.player.setAttribute('open', '');
    }
    document.documentElement.classList.add('is-playing');
  }

  function closePlayerDialog() {
    if (!dom.player) return;
    if (typeof dom.player.close === 'function' && dom.player.open) dom.player.close();
    else dom.player.removeAttribute('open');
    document.documentElement.classList.remove('is-playing');
  }

  async function startGameInFrame(game, name) {
    setPlayerLoading(true);
    if (dom.playerFrame) dom.playerFrame.src = 'about:blank';

    const result = await withTimeout(
      Lumin.getGameUrl(game.id),
      CONFIG.requestTimeout,
      'O jogo demorou demais para carregar.'
    );
    const url = typeof result === 'string' ? result : result && result.url;
    if (!url) throw new Error('URL do jogo indisponível.');

    expectedFrameSrc = url;
    if (dom.playerFrame) dom.playerFrame.src = url;
    if (dom.playerTitle) dom.playerTitle.textContent = name;
    state.currentGame = game;
  }

  async function openGame(game, name) {
    if (!game || !game.id) {
      toast('Este jogo não tem identificador válido.');
      return;
    }

    if (state.mode === 'demo') {
      toast('Modo demonstração: os jogos reais aparecem quando o catálogo carregar.');
      return;
    }

    if (!dom.player || typeof Lumin === 'undefined' || typeof Lumin.getGameUrl !== 'function') {
      try {
        await Lumin.loadGame(game.id);
      } catch (error) {
        toast('Não foi possível abrir este jogo agora.');
      }
      return;
    }

    openPlayerDialog();
    if (dom.playerTitle) dom.playerTitle.textContent = name;

    try {
      await startGameInFrame(game, name);
    } catch (error) {
      console.warn('[LuminSDK] player próprio falhou, usando o player do SDK:', error);
      closePlayerDialog();
      try {
        await Lumin.loadGame(game.id);
      } catch (sdkError) {
        toast('Não foi possível abrir este jogo agora.');
      }
    }
  }

  function closeGame() {
    closePlayerDialog();
    expectedFrameSrc = '';
    if (dom.playerFrame) dom.playerFrame.src = 'about:blank';
    setPlayerLoading(true);
    state.currentGame = null;
  }

  async function restartGame() {
    if (!state.currentGame) return;
    try {
      await startGameInFrame(state.currentGame, dom.playerTitle.textContent);
    } catch (error) {
      toast('Não foi possível reiniciar o jogo.');
    }
  }

  function toggleFullscreen() {
    const target = dom.playerFrame;
    if (!target) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (target.requestFullscreen) {
      target.requestFullscreen().catch(() => toast('Tela cheia indisponível neste navegador.'));
    } else {
      toast('Tela cheia indisponível neste navegador.');
    }
  }

  /* ---------- fallback: interface original do LuminSDK ---------- */
  async function tryBuiltInUI() {
    if (!dom.fallback || !dom.fallbackMount || typeof Lumin === 'undefined' || !Lumin) return false;

    try {
      const mount = el('div', { class: 'lumin-mount' });
      dom.fallbackMount.replaceChildren(mount);
      dom.fallback.hidden = false;

      await withTimeout(
        Lumin.init({
          container: mount,
          theme: currentTheme(),
          columns: 6,
          rows: 3
        }),
        CONFIG.fallbackTimeout,
        'A interface padrão do LuminSDK não respondeu.'
      );

      if (dom.grid) dom.grid.hidden = true;
      if (dom.toolbar) dom.toolbar.hidden = true;
      if (dom.chips) dom.chips.hidden = true;
      if (dom.summary) dom.summary.hidden = true;
      if (dom.pagination) dom.pagination.hidden = true;
      if (dom.randomBar) dom.randomBar.hidden = true;
      if (dom.empty) dom.empty.hidden = true;
      if (dom.error) dom.error.hidden = true;

      state.mode = 'fallback';
      setStatus('fallback', 'Interface padrão');
      return true;
    } catch (error) {
      console.warn('[LuminSDK] interface padrão também falhou:', error);
      if (dom.fallback) dom.fallback.hidden = true;
      return false;
    }
  }

  async function handleFatal(error) {
    console.error('[LuminSDK] falha ao inicializar:', error);
    if (state.mode === 'fallback') return;
    const ok = await tryBuiltInUI();
    if (!ok) showError(error);
  }

  /* ---------- modo demonstração ---------- */
  const DEMO_GAMES = [
    { id: 'demo-1', name: 'Neon Drift', category: 'Corrida' },
    { id: 'demo-2', name: 'Pixel Quest', category: 'Aventura' },
    { id: 'demo-3', name: 'Space Invaders', category: 'Arcade' },
    { id: 'demo-4', name: 'Block Puzzle', category: 'Puzzle' },
    { id: 'demo-5', name: 'Snake Classic', category: 'Clássicos' },
    { id: 'demo-6', name: 'Sky Hopper', category: 'Plataforma' },
    { id: 'demo-7', name: 'Bubble Pop', category: 'Casual' },
    { id: 'demo-8', name: 'Tower Defense', category: 'Estratégia' },
    { id: 'demo-9', name: 'Basket Duel', category: 'Esporte' },
    { id: 'demo-10', name: 'Zombie Run', category: 'Ação' },
    { id: 'demo-11', name: 'Card Master', category: 'Cartas' },
    { id: 'demo-12', name: 'Mine Sweeper', category: 'Lógica' }
  ];

  function renderDemo() {
    state.mode = 'demo';
    state.games = DEMO_GAMES;
    state.total = DEMO_GAMES.length;
    state.pages = 1;
    showDemoGrid();
    setStatus('fallback', 'Demonstração');
    if (dom.statusText) dom.statusText.textContent = 'Demonstração';
    dom.summary.textContent = 'Demonstração visual — conecte-se à internet para liberar os 1.100+ jogos reais.';
    dom.pagination.hidden = true;
    dom.randomBar.hidden = true;
  }

  function showDemoGrid() {
    if (!dom.grid) return;
    hideState();
    dom.grid.hidden = false;
    dom.grid.replaceChildren();
    const fragment = document.createDocumentFragment();
    DEMO_GAMES.forEach((game, index) => fragment.append(createCard(game, index)));
    dom.grid.append(fragment);
    dom.grid.setAttribute('aria-busy', 'false');
  }

  /* ---------- eventos ---------- */
  function bindEvents() {
    if (dom.search) {
      dom.search.addEventListener('input', () => {
        const value = dom.search.value;
        if (dom.clear) dom.clear.hidden = !value;
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
          state.query = value.trim();
          if (state.query) {
            state.category = '';
            renderChips();
          }
          if (state.mode === 'demo') return;
          loadPage(1);
        }, CONFIG.searchDebounce);
      });

      dom.search.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          clearTimeout(searchTimer);
          state.query = dom.search.value.trim();
          state.category = '';
          renderChips();
          loadPage(1);
        }
        if (event.key === 'Escape' && dom.search.value) {
          dom.search.value = '';
          dom.clear.hidden = true;
          state.query = '';
          loadPage(1);
        }
      });
    }

    if (dom.clear) {
      dom.clear.addEventListener('click', () => {
        dom.search.value = '';
        dom.clear.hidden = true;
        state.query = '';
        dom.search.focus();
        loadPage(1);
      });
    }

    if (dom.sort) {
      dom.sort.addEventListener('change', () => {
        state.sort = dom.sort.value;
        if (state.mode === 'demo') showDemoGrid();
        else if (state.games.length) renderGames();
      });
    }

    if (dom.chips) {
      dom.chips.addEventListener('click', (event) => {
        const chip = event.target.closest('.chip');
        if (!chip) return;
        state.category = chip.dataset.category || '';
        state.query = '';
        if (dom.search) dom.search.value = '';
        if (dom.clear) dom.clear.hidden = true;
        renderChips();
        if (state.mode === 'demo') {
          toast('Modo demonstração: filtros completos só com o catálogo conectado.');
          return;
        }
        loadPage(1);
      });
    }

    if (dom.randomBtn) {
      dom.randomBtn.addEventListener('click', () => {
        if (state.mode === 'demo') {
          toast('Modo demonstração: os jogos reais aparecem quando o catálogo carregar.');
          return;
        }
        loadRandom();
      });
    }

    if (dom.randomReset) {
      dom.randomReset.addEventListener('click', () => {
        dom.randomBar.hidden = true;
        loadPage(1);
      });
    }

    if (dom.prev) dom.prev.addEventListener('click', () => goToPage(state.page - 1));
    if (dom.next) dom.next.addEventListener('click', () => goToPage(state.page + 1));

    if (dom.emptyReset) {
      dom.emptyReset.addEventListener('click', () => {
        state.query = '';
        state.category = '';
        if (dom.search) dom.search.value = '';
        if (dom.clear) dom.clear.hidden = true;
        renderChips();
        loadPage(1);
      });
    }

    if (dom.errorRetry) dom.errorRetry.addEventListener('click', () => window.location.reload());
    if (dom.errorDemo) dom.errorDemo.addEventListener('click', renderDemo);

    if (dom.playerClose) dom.playerClose.addEventListener('click', closeGame);
    if (dom.playerRestart) dom.playerRestart.addEventListener('click', restartGame);
    if (dom.playerFullscreen) dom.playerFullscreen.addEventListener('click', toggleFullscreen);

    if (dom.player) {
      dom.player.addEventListener('close', () => {
        expectedFrameSrc = '';
        if (dom.playerFrame) dom.playerFrame.src = 'about:blank';
        document.documentElement.classList.remove('is-playing');
      });
      dom.player.addEventListener('click', (event) => {
        if (event.target === dom.player) closeGame();
      });
    }

    if (dom.playerFrame) {
      dom.playerFrame.addEventListener('load', () => {
        const src = dom.playerFrame.getAttribute('src') || '';
        if (expectedFrameSrc && src === expectedFrameSrc) setPlayerLoading(false);
      });
    }
  }

  /* ---------- inicialização ---------- */
  function waitForGlobal(timeout) {
    return new Promise((resolve, reject) => {
      const started = Date.now();
      (function tick() {
        if (typeof window.Lumin !== 'undefined' && window.Lumin) return resolve(window.Lumin);
        if (Date.now() - started > timeout) {
          return reject(new Error('O LuminSDK não pôde ser carregado.'));
        }
        setTimeout(tick, 120);
      })();
    });
  }

  async function connect() {
    setStatus('loading', 'Conectando…');

    try {
      await waitForGlobal(6000);
      await withTimeout(
        Lumin.init({
          headless: true,
          onError: (error) => console.warn('[LuminSDK] aviso:', error)
        }),
        CONFIG.bootTimeout,
        'O LuminSDK demorou demais para responder.'
      );
    } catch (error) {
      await handleFatal(error);
      return;
    }

    state.connected = true;
    state.mode = 'custom';
    setStatus('online', 'Online');

    loadCategories();
    await loadPage(1);
  }

  function watchLayout() {
    let current = gamesPerPageForViewport();
    let timer = null;
    window.addEventListener('resize', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const next = gamesPerPageForViewport();
        if (next === current) return;
        current = next;
        state.limit = next;   // vale a partir da próxima página/ busca
      }, 250);
    }, { passive: true });
  }

  function boot() {
    if (booted) return;
    booted = true;
    cacheDom();
    if (!dom.grid) return;
    bindEvents();

    const isDemo = /[?&]demo(=|&|$)/.test(window.location.search);
    if (isDemo) {
      renderDemo();
      return;
    }

    watchLayout();
    renderSkeletons(state.limit);
    connect();
  }

  /* API pública usada pelo site.js */
  window.LuminLibrary = {
    boot: boot,
    random: () => {
      if (state.mode === 'demo') return toast('Modo demonstração ativo.');
      loadRandom();
    },
    focusSearch: () => {
      if (!dom.search) return;
      dom.search.focus({ preventScroll: false });
      const target = document.getElementById('biblioteca');
      if (target) {
        const top = target.getBoundingClientRect().top + window.scrollY - 80;
        if (window.scrollY < top - 40) window.scrollTo({ top: top, behavior: 'smooth' });
      }
    },
    closeGame: closeGame,
    toast: toast,
    refreshTheme: () => {
      if (state.mode === 'fallback') {
        tryBuiltInUI().catch(() => {});
      }
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
