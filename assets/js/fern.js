/* =========================================================
   Lumin Fern — shell lateral e assistente local
   O shell reaproveita as telas existentes: não duplica o catálogo nem
   muda a navegação. Ctrl+Alt+F alterna entre este layout e o SUTS normal.
   O assistente é local (sem IA generativa ou envio de prompts).
   ========================================================= */
(function () {
  'use strict';

  const MODE_KEY = 'luminsdk:fern-mode:v1';
  const COLLAPSE_KEY = 'luminsdk:fern-sidebar:v1';
  const root = document.documentElement;
  const body = document.body;
  const launch = document.getElementById('fern-launch');
  const sidebar = document.getElementById('fern-sidebar');
  const ai = document.getElementById('fern-ai');
  const uv = document.getElementById('fern-uv');
  const backdrop = document.getElementById('fern-backdrop');
  const prompt = document.getElementById('fern-ai-prompt');
  const log = document.getElementById('fern-ai-log');
  const status = document.getElementById('fern-ai-status');
  if (!launch || !sidebar || !body) return;

  function storageGet(key) {
    try { return localStorage.getItem(key) || ''; } catch (error) { return ''; }
  }
  function storageSet(key, value) {
    try { localStorage.setItem(key, value); } catch (error) { /* sessão continua sem storage */ }
  }

  let mobileOpen = false;
  let aiOpened = false;

  function setMode(enabled, persist) {
    const on = !!enabled;
    root.classList.toggle('fern-mode', on);
    launch.setAttribute('aria-pressed', on ? 'true' : 'false');
    launch.title = on ? 'Voltar ao SUTS normal · Ctrl + Alt + F' : 'Abrir o espaço lateral Fern · Ctrl + Alt + F';
    launch.querySelector('[data-fern-launch-label]').textContent = on ? 'SUTS normal' : 'Modo Fern';
    if (persist !== false) storageSet(MODE_KEY, on ? 'on' : 'off');
    if (!on) {
      closeMobile();
      closeAI();
      closeUV();
    }
  }

  function setCollapsed(collapsed) {
    root.classList.toggle('fern-collapsed', !!collapsed);
    const toggle = document.getElementById('fern-side-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    storageSet(COLLAPSE_KEY, collapsed ? 'yes' : 'no');
  }

  function closeMobile() {
    mobileOpen = false;
    root.classList.remove('fern-mobile-open');
    if (backdrop) backdrop.hidden = true;
    const toggle = document.getElementById('fern-side-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }

  function openAI() {
    if (!ai) return;
    ai.hidden = false;
    aiOpened = true;
    if (status) status.textContent = 'Assistente local · nada é enviado';
    setTimeout(function () { if (prompt) prompt.focus(); }, 40);
  }
  function closeAI() {
    if (!ai) return;
    ai.hidden = true;
    aiOpened = false;
  }
  function openUV() { if (uv) { uv.hidden = false; closeMobile(); } }
  function closeUV() { if (uv) uv.hidden = true; }

  function routeTo(route) {
    closeMobile();
    closeAI();
    closeUV();
    if (window.LuminApp && typeof window.LuminApp.go === 'function') {
      window.LuminApp.go(route, { reveal: route === 'lumin' });
    }
  }

  function markActive(route) {
    const provider = window.LuminProvider && window.LuminProvider.current
      ? window.LuminProvider.current() : '';
    let activeItem = null;
    sidebar.querySelectorAll('[data-fern-route]').forEach(function (item) {
      const itemProvider = item.getAttribute('data-provider') || '';
      const active = route === 'provider' && itemProvider
        ? itemProvider === provider
        : !itemProvider && item.getAttribute('data-fern-route') === route;
      item.classList.toggle('is-active', active);
      if (active) { item.setAttribute('aria-current', 'page'); activeItem = item; }
      else item.removeAttribute('aria-current');
    });
    const title = document.getElementById('fern-current');
    if (title) title.textContent = activeItem ? activeItem.textContent.trim() : 'Seu espaço';
  }

  function appendMessage(text, kind, action) {
    if (!log) return;
    const row = document.createElement('div');
    row.className = 'fern-ai-message fern-ai-message--' + (kind === 'user' ? 'user' : 'assistant');
    const bubble = document.createElement('p');
    bubble.textContent = text;
    row.append(bubble);
    if (action) {
      const button = document.createElement('button');
      button.className = 'fern-ai-action';
      button.type = 'button';
      button.textContent = action.label;
      button.addEventListener('click', action.run);
      row.append(button);
    }
    log.append(row);
    log.scrollTop = log.scrollHeight;
  }

  function searchCatalog(query) {
    routeTo('lumin');
    let tries = 0;
    const timer = setInterval(function () {
      tries += 1;
      const input = document.getElementById('game-search');
      if (input && window.LuminLibrary) {
        clearInterval(timer);
        if (query) {
          input.value = query;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        window.LuminLibrary.focusSearch();
      } else if (tries > 60) {
        clearInterval(timer);
      }
    }, 100);
  }

  function cleanGameQuery(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/\b(quero|queria|pode|poderia|me ajuda a|me ajude a|procura|procure|buscar|busca|encontrar|encontre|achar|ache|abrir|jogar|jogo|games?|no catálogo|no catalogo|por favor|um|uma|o|a|os|as)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function answer(text) {
    const q = String(text || '').trim();
    const lower = q.toLowerCase();
    if (/ultraviolet|\buv\b|proxy/.test(lower)) {
      appendMessage('O Ultraviolet não está instalado nem configurado neste site. Ele precisa dos arquivos do cliente e de um servidor Bare compatível; este projeto estático no GitHub Pages não fornece esse backend. Os endereços que você mandou parecem páginas/arquivos de sites, não um endpoint UV. Para não fingir que funciona, deixei o Navegador interno disponível e marquei o proxy como não configurado.', 'assistant', {
        label: 'Abrir o Navegador interno',
        run: function () { routeTo('browser'); }
      });
      return;
    }
    if (/\b(chat|conversar|mensagem|mensagens)\b/.test(lower)) {
      appendMessage('Abrindo o chat global do LuminSDK.', 'assistant', {
        label: 'Abrir Chat',
        run: function () { closeAI(); if (window.LuminSocial) window.LuminSocial.open(); }
      });
      return;
    }
    if (/\b(estudo|estudar|quiz|matem[aá]tica|matematica|resumo|cart[aã]o|cartao)\b/.test(lower)) {
      appendMessage('Vou abrir a área de Estudos.', 'assistant', {
        label: 'Abrir Estudos',
        run: function () { routeTo('estudo'); }
      });
      return;
    }
    if (/\b(navegador|browser|site|internet|url)\b/.test(lower)) {
      appendMessage('Abrindo o navegador integrado. Ele tenta abrir o endereço dentro do site quando o destino permite.', 'assistant', {
        label: 'Abrir Navegador',
        run: function () { routeTo('browser'); }
      });
      return;
    }
    if (/\b(jogo|jogos|game|games|minecraft|granny|roblox|fnaf|mario|sonic|catalog|cat[aá]logo)\b/.test(lower)) {
      const query = cleanGameQuery(q);
      appendMessage(query ? 'Vou abrir a biblioteca e buscar “' + query + '”. O catálogo mantém todos os jogos e fontes que já existem.' : 'Abrindo a biblioteca completa de jogos.', 'assistant', {
        label: query ? 'Buscar na biblioteca' : 'Abrir todos os jogos',
        run: function () { searchCatalog(query); }
      });
      return;
    }
    appendMessage('Sou o assistente local do Modo Fern — não sou uma IA generativa e não envio conversas para um serviço externo. Posso abrir e buscar jogos, ir aos Estudos, abrir o Navegador ou o Chat, e explicar por que o Ultraviolet ainda requer um servidor próprio.', 'assistant');
  }

  function init() {
    setMode(storageGet(MODE_KEY) === 'on', false);
    setCollapsed(storageGet(COLLAPSE_KEY) === 'yes');
    launch.addEventListener('click', function () {
      setMode(!root.classList.contains('fern-mode'));
    });

    const sideToggle = document.getElementById('fern-side-toggle');
    if (sideToggle) sideToggle.addEventListener('click', function () {
      if (window.matchMedia && window.matchMedia('(max-width: 760px)').matches) {
        mobileOpen = !mobileOpen;
        root.classList.toggle('fern-mobile-open', mobileOpen);
        if (backdrop) backdrop.hidden = !mobileOpen;
        sideToggle.setAttribute('aria-expanded', mobileOpen ? 'true' : 'false');
      } else {
        setCollapsed(!root.classList.contains('fern-collapsed'));
      }
    });
    if (backdrop) backdrop.addEventListener('click', closeMobile);

    document.addEventListener('click', function (event) {
      const routeLink = event.target.closest('[data-fern-route]');
      if (routeLink) {
        closeMobile(); closeAI(); closeUV();
        if (routeLink.getAttribute('data-provider')) setTimeout(function () { markActive('provider'); }, 250);
      }
      const button = event.target.closest('[data-fern-action]');
      if (!button) return;
      const action = button.getAttribute('data-fern-action');
      if (action === 'toggle') setMode(!root.classList.contains('fern-mode'));
      if (action === 'chat') { closeMobile(); closeAI(); if (window.LuminSocial) window.LuminSocial.open(); }
      if (action === 'ai') { closeMobile(); openAI(); }
      if (action === 'uv') openUV();
      if (action === 'ai-close') closeAI();
      if (action === 'uv-close') closeUV();
    });

    if (log && !log.children.length) {
      appendMessage('Oi! Posso ajudar a encontrar um jogo ou abrir uma área do site. Experimente: “buscar Minecraft”, “abrir Estudos” ou “o que é Ultraviolet?”.', 'assistant');
    }
    const form = document.getElementById('fern-ai-form');
    if (form) form.addEventListener('submit', function (event) {
      event.preventDefault();
      const text = prompt ? prompt.value.trim() : '';
      if (!text) return;
      prompt.value = '';
      appendMessage(text, 'user');
      answer(text);
    });
    document.querySelectorAll('[data-fern-prompt]').forEach(function (button) {
      button.addEventListener('click', function () {
        const text = button.getAttribute('data-fern-prompt') || '';
        if (!text) return;
        if (prompt) prompt.value = text;
        if (form) form.requestSubmit();
      });
    });

    window.addEventListener('lumin:view', function (event) {
      markActive(event && event.detail ? event.detail.route : '');
      closeMobile();
    });
    markActive(window.LuminApp && window.LuminApp.current ? window.LuminApp.current() : '');

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        if (uv && !uv.hidden) { closeUV(); return; }
        if (aiOpened) { closeAI(); return; }
        if (mobileOpen) { closeMobile(); return; }
      }
      if (document.documentElement.classList.contains('is-playing')) return;
      const target = event.target;
      const tag = target && target.tagName ? target.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || (target && target.isContentEditable)) return;
      const fallback = function (e) {
        const altGraph = typeof e.getModifierState === 'function' && e.getModifierState('AltGraph');
        return (e.ctrlKey && e.altKey || altGraph) && !e.shiftKey && !e.metaKey && (e.key || '').toLowerCase() === 'f';
      };
      const matched = window.LuminKeys && window.LuminKeys.match
        ? window.LuminKeys.match('fern', event)
        : fallback(event);
      if (matched) {
        event.preventDefault();
        setMode(!root.classList.contains('fern-mode'));
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  window.LuminFern = {
    toggle: function () { setMode(!root.classList.contains('fern-mode')); },
    enabled: function () { return root.classList.contains('fern-mode'); },
    openAI: openAI,
    openUV: openUV
  };
})();
