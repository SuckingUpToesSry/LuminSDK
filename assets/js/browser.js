/* =========================================================
   LuminSDK — navegador próprio
   · barra de endereço, home com as coleções do acervo
   · sites abrem sempre em about:blank com iframe, sem redirecionar a aba
   · pop-ups, CSP e restrições da fonte continuam valendo
   Autor: Ryan Smith · Licença MIT
   ========================================================= */
(function () {
  'use strict';

  const DATA = 'assets/data/sites.json';
  const STORE_LAST = 'luminsdk:v1:browser:last';
  const FALLBACK_TIMEOUT = 9000;

  const state = {
    url: '',
    families: null,
    tabs: [{ url: '' }],
    active: 0
  };

  let dom = {};
  let timer = null;

  /* ---------- utilidades ---------- */
  function $(selector) { return document.querySelector(selector); }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function normalize(input) {
    let url = String(input || '').trim();
    if (!url) return '';
    if (/^(javascript|data):/i.test(url)) return '';
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    return url;
  }

  function hostOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch (error) { return url; }
  }

  function initial(name) {
    return String(name || '?').trim().charAt(0).toUpperCase() || '?';
  }

  /* ---------- interface ---------- */
  function setStage(on) {
    if (dom.stage) dom.stage.hidden = !on;
    if (dom.home) dom.home.hidden = on;
  }

  function setLoading(on, text) {
    if (!dom.loading) return;
    dom.loading.hidden = !on;
    if (text && dom.loadingText) dom.loadingText.textContent = text;
  }

  function setNote(on, title, text) {
    if (!dom.note) return;
    dom.note.hidden = !on;
    if (title && dom.noteTitle) dom.noteTitle.textContent = title;
    if (text && dom.noteText) dom.noteText.textContent = text;
  }

  function remember(url) {
    state.url = url;
    try { localStorage.setItem(STORE_LAST, url); } catch (error) {}
    if (dom.input) dom.input.value = url;
    document.title = hostOf(url) + ' — Navegador | LuminSDK';
  }

  /* ---------- abas ----------
     cada aba guarda o endereço que mostra (vazio = página inicial).
     trocar de aba reabre o endereço dela, como um navegador comum. */
  function activeTab() {
    return state.tabs[state.active] || null;
  }

  function touchTab(url) {
    let tab = activeTab();
    if (!tab) {
      tab = { url: '' };
      state.tabs.push(tab);
      state.active = state.tabs.length - 1;
    }
    tab.url = url;
    renderTabs();
  }

  function renderTabs() {
    if (!dom.tabs) return;
    dom.tabs.replaceChildren();

    state.tabs.forEach(function (tab, index) {
      const label = tab.url ? hostOf(tab.url) : 'Nova aba';
      const item = el('div', 'brw-tab' + (index === state.active ? ' is-active' : ''));
      item.setAttribute('role', 'tab');
      item.setAttribute('aria-selected', index === state.active ? 'true' : 'false');
      item.tabIndex = 0;
      item.title = label;

      const icon = el('span', 'brw-tab__icon', tab.url ? initial(label) : '+');
      icon.setAttribute('aria-hidden', 'true');
      const name = el('span', 'brw-tab__title', label);
      const close = el('button', 'brw-tab__close', '×');
      close.type = 'button';
      close.setAttribute('aria-label', 'Fechar aba ' + label);

      item.append(icon, name, close);
      item.addEventListener('click', function () { selectTab(index); });
      item.addEventListener('keydown', function (event) {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        selectTab(index);
      });
      close.addEventListener('click', function (event) {
        event.stopPropagation();
        closeTab(index);
      });
      dom.tabs.append(item);
    });

    const add = el('button', 'brw-tab brw-tab--new', '+');
    add.type = 'button';
    add.title = 'Nova aba';
    add.setAttribute('aria-label', 'Nova aba');
    add.addEventListener('click', newTab);
    dom.tabs.append(add);
  }

  function selectTab(index) {
    const tab = state.tabs[index];
    if (!tab) return;
    state.active = index;
    if (tab.url) {
      open(tab.url);
    } else {
      goHome();
    }
  }

  function newTab() {
    state.tabs.push({ url: '' });
    selectTab(state.tabs.length - 1);
  }

  function closeTab(index) {
    const wasActive = index === state.active;
    state.tabs.splice(index, 1);
    if (!state.tabs.length) state.tabs.push({ url: '' });
    if (!wasActive && index < state.active) state.active -= 1;
    if (wasActive) {
      selectTab(Math.min(index, state.tabs.length - 1));
    } else {
      state.active = Math.min(state.active, state.tabs.length - 1);
      renderTabs();
    }
  }

  /* volta para a página inicial, mantendo a aba */
  function goHome() {
    const tab = activeTab();
    if (tab) tab.url = '';
    setStage(false);
    setNote(false);
    setLoading(false);
    clearTimeout(timer);
    if (dom.frame) dom.frame.src = 'about:blank';
    if (dom.input) dom.input.value = '';
    state.url = '';
    renderTabs();
    renderHome();
  }

  /* Destinations always launch in an about:blank iframe, never a redirect. */
  function open(raw) {
    const url = normalize(raw);
    if (!url) { if (dom.input) dom.input.focus(); return false; }
    remember(url); touchTab(url);
    if (dom.input) dom.input.value = url;
    const ok = cleanTab(url);
    window.dispatchEvent(new CustomEvent('lumin:browser',{detail:{url}}));
    return ok;
  }
  function cleanTab(raw) {
    const url = normalize(raw || state.url); if (!url) return false;
    const ok = !!(window.LuminLinks ? window.LuminLinks.open(url,hostOf(url)) : window.LuminGameTab && window.LuminGameTab.open(url,hostOf(url)));
    if (!ok) setNote(true,'O navegador bloqueou a aba nova','Libere pop-ups e tente novamente. Nenhuma aba foi redirecionada.');
    return ok;
  }

  function logAction(text) {
    if (window.LuminSocial && typeof window.LuminSocial.report === 'function') {
      window.LuminSocial.report('browser', text);
    }
  }

  /* ---------- home ---------- */
  async function loadFamilies() {
    if (state.families) return state.families;
    try {
      const response = await fetch(DATA, { cache: 'force-cache' });
      const data = await response.json();
      state.families = data.families || [];
    } catch (error) {
      state.families = [];
    }
    return state.families;
  }

  function familyCard(family) {
    const button = el('button', 'brw-fam');
    button.type = 'button';

    const top = el('span', 'brw-fam__top');
    if (family.logo) {
      const img = document.createElement('img');
      img.className = 'brw-fam__logo';
      img.src = family.logo;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.width = 30;
      img.height = 30;
      img.addEventListener('error', function () {
        const mark = el('span', 'brw-fam__mark', initial(family.name));
        img.replaceWith(mark);
      });
      top.append(img);
    } else {
      top.append(el('span', 'brw-fam__mark', initial(family.name)));
    }
    top.append(el('span', 'brw-fam__name', family.name));
    button.append(top);
    button.append(el('span', 'brw-fam__url', hostOf(family.sites[0].url)));
    button.append(el('span', 'brw-fam__count', family.sites.length + (family.sites.length === 1 ? ' link' : ' links')));

    button.addEventListener('click', function () { renderFamily(family); });
    return button;
  }

  /* detalhe de uma coleção: os links dela, um por um, sem abrir nada sozinho */
  function renderFamily(family) {
    const list = dom.families;
    if (!list) return;
    list.textContent = '';

    const head = el('div', 'brw-detail');
    const back = el('button', 'brw-chip brw-chip--back', '← todas as coleções');
    back.type = 'button';
    back.addEventListener('click', function () { renderHome(); });
    head.append(back);
    head.append(el('h2', 'brw-detail__title', family.name));
    head.append(el('p', 'brw-detail__meta',
      family.sites.length + (family.sites.length === 1 ? ' link' : ' links') +
      ' · clique para abrir aqui dentro'));
    list.append(head);

    family.sites.forEach(function (site) {
      const button = el('button', 'brw-chip');
      button.type = 'button';
      button.title = site.url;
      button.append(document.createTextNode(site.name));
      button.addEventListener('click', function () {
        open(site.url);
        logAction('abriu ' + site.name);
      });
      list.append(button);
    });
  }

  async function renderHome(query) {
    const families = await loadFamilies();
    const clean = String(query || '').trim().toLowerCase();
    const visible = families.filter(function (family) {
      if (!clean) return true;
      if (family.name.toLowerCase().indexOf(clean) >= 0) return true;
      return family.sites.some(function (site) {
        return site.url.toLowerCase().indexOf(clean) >= 0 || site.name.toLowerCase().indexOf(clean) >= 0;
      });
    });

    if (dom.families) {
      dom.families.textContent = '';
      visible.forEach(function (family) { dom.families.append(familyCard(family)); });
      if (!visible.length) {
        dom.families.append(el('p', 'brw-empty', 'Nenhuma coleção com “' + query + '”.'));
      }
    }

    if (dom.quick) {
      dom.quick.textContent = '';
      const pinned = ['lumin-sdk', 'duck-math', 'gn-math', 'astra', 'links', 'luminal-os', 'n7x', 'revault'];
      const ordered = families.slice().sort(function (a, b) {
        const ia = pinned.indexOf(a.id);
        const ib = pinned.indexOf(b.id);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      }).slice(0, 6);
      ordered.forEach(function (family) {
        const chip = el('button', 'brw-chip');
        chip.type = 'button';
        if (family.logo) {
          const img = document.createElement('img');
          img.src = family.logo;
          img.alt = '';
          img.width = 17;
          img.height = 17;
          img.loading = 'lazy';
          img.addEventListener('error', function () { img.remove(); });
          chip.append(img);
        }
        chip.append(document.createTextNode(family.name));
        chip.addEventListener('click', function () { open(family.sites[0].url); });
        dom.quick.append(chip);
      });
    }
  }

  /* ---------- eventos ---------- */
  function bind() {
    dom.form = $('#brw-form');
    dom.input = $('#brw-input');
    dom.home = $('#brw-homeview');
    dom.stage = $('#brw-stage');
    dom.frame = $('#brw-frame');
    dom.loading = $('#brw-loading');
    dom.loadingText = $('#brw-loading-text');
    dom.note = $('#brw-note');
    dom.noteTitle = $('#brw-note-title');
    dom.noteText = $('#brw-note-text');
    dom.families = $('#brw-families');
    dom.quick = $('#brw-quick');

    if (dom.form && dom.input) {
      dom.form.addEventListener('submit', function (event) {
        event.preventDefault();
        open(dom.input.value);
      });
    }

    dom.tabs = $('#brw-tabs');
    renderTabs();

    const back = $('#brw-back');
    if (back) {
      back.addEventListener('click', function () {
        goHome();
        if (window.LuminApp) window.LuminApp.setTitle('Navegador — abrir sites aqui dentro | LuminSDK');
      });
    }
    const homeBtn = $('#brw-home');
    if (homeBtn) homeBtn.addEventListener('click', goHome);
    const clean = $('#brw-clean');
    if (clean) clean.addEventListener('click', function () { cleanTab(state.url); });
    const retry = $('#brw-retry');
    if (retry) {
      retry.addEventListener('click', function () {
        if (!state.url) return;
        setNote(false);
        setLoading(true, 'Abrindo de novo…');
        if (dom.frame) {
          dom.frame.src = 'about:blank';
          dom.frame.src = state.url + (state.url.indexOf('?') > 0 ? '&' : '?') + 'r=' + Date.now();
        }
        clearTimeout(timer);
        timer = setTimeout(function () {
          setLoading(false);
          setNote(true, 'Continuou em branco', 'O site não aceita abrir aqui dentro. Use a aba limpa.');
        }, FALLBACK_TIMEOUT);
      });
    }
    const full = $('#brw-full');
    if (full) {
      full.addEventListener('click', function () {
        const target = dom.stage;
        if (!target) return;
        if (document.fullscreenElement) document.exitFullscreen();
        else if (target.requestFullscreen) target.requestFullscreen().catch(function () {});
      });
    }
    const noteClean = $('#brw-note-clean');
    if (noteClean) noteClean.addEventListener('click', function () { cleanTab(state.url); });
    const noteRetry = $('#brw-note-retry');
    if (noteRetry) noteRetry.addEventListener('click', function () {
      const r = $('#brw-retry');
      if (r) r.click();
    });

    const search = $('#brw-search');
    if (search) {
      search.addEventListener('submit', function (event) {
        event.preventDefault();
        const input = $('#brw-search-input');
        const value = (input && input.value || '').trim();
        if (!value) {
          renderHome();
          return;
        }
        const looksLikeUrl = /^[\w-]+(\.[\w-]+)+(\/|$)/.test(value) || /^https?:\/\//i.test(value);
        if (looksLikeUrl) open(value);
        else renderHome(value);
      });
    }

    if (dom.frame) {
      dom.frame.addEventListener('load', function () {
        if (!dom.stage || dom.stage.hidden) return;
        setLoading(false);
        clearTimeout(timer);
      });
    }

    renderHome();
  }

  function init() {
    if (!document.getElementById('view-browser')) return;
    bind();
    /* se a marca veio de um link/aba (ex.: aba DuckMath), já abre */
    const pending = window.__luminBrowserOpen;
    if (pending) {
      window.__luminBrowserOpen = '';
      open(pending);
    }
  }

  window.LuminBrowser = {
    open: function (url) { return open(url); },
    clean: function (url) { return cleanTab(url); },
    home: function () { goHome(); },
    current: function () { return state.url; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
