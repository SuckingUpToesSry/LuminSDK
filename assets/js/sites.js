/* =========================================================
   LuminSDK — aba Sites
   Catálogo de sites que abrem DENTRO do LuminSDK (site dentro de site).

   Como funciona:
   · os 488 links ficam em ../assets/data/sites.json e são buscados só
     quando a aba é usada (fonte única, fácil de editar)
   · cada coleção (família) é um card com logo; ao abrir, a lista aparece
     em linhas compactas (endereço + abrir)
   · o visualizador embute o site num iframe; se o site recusar ser
     embutido, avisamos e oferecemos abrir em outra aba

   Sem bibliotecas, sem build.
   Autor: Ryan Smith · Licença MIT
   ========================================================= */
(function () {
  'use strict';

  const DATA_URL = '../assets/data/sites.json';
  const CURRENT = 'sites:v1';

  const CAT_LABEL = {
    jogos: 'Jogos',
    pacotes: 'Pacotes',
    estudo: 'Estudo',
    logos: 'Logos e arquivos'
  };
  const CAT_ORDER = ['jogos', 'pacotes', 'estudo', 'logos'];

  /* endereços que também aparecem com nome próprio na lista antiga */
  const EXTRA = [
    { name: 'Solara', url: 'https://solara.polimont.com.br/', cat: 'jogos' },
    { name: 'GTA V Port', url: 'https://fiveplay.lol/', cat: 'jogos' },
    { name: 'GTA V Port — Launcher v2', url: 'https://v2.fiveplay.lol/launcher.html', cat: 'jogos' }
  ];

  const state = {
    families: [],
    filter: '',
    cat: '',
    open: {},          // coleções expandidas
    query: '',
    current: null,
    loaded: false
  };

  const dom = {};
  let slowTimer = 0;
  let searchTimer = 0;

  const $ = (sel) => document.querySelector(sel);

  function host(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch (error) {
      return url;
    }
  }

  function initials(name) {
    const parts = String(name).replace(/[()·]/g, ' ').split(/[\s\-_.]+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  /* cor estável por coleção (o mesmo nome sempre gera o mesmo par) */
  function hue(text) {
    let sum = 0;
    for (let i = 0; i < text.length; i++) sum = (sum * 31 + text.charCodeAt(i)) % 360;
    return sum;
  }

  function markStyle(name) {
    const h = hue(name);
    return '--m1:hsl(' + h + ' 82% 62%);--m2:hsl(' + ((h + 48) % 360) + ' 88% 58%)';
  }

  /* ---------- dados ---------- */
  function normalize(url) {
    return String(url || '').replace(/\/+$/, '').toLowerCase();
  }

  async function load() {
    if (state.loaded) return;
    try {
      const response = await fetch(DATA_URL, { cache: 'force-cache' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      const families = Array.isArray(data.families) ? data.families : [];
      state.families = families.map(function (family) {
        return {
          id: family.id,
          name: family.name,
          cat: CAT_LABEL[family.cat] ? family.cat : 'estudo',
          logo: family.logo || '',
          sites: (family.sites || []).map(function (site) {
            return { name: site.name, url: site.url };
          })
        };
      });
    } catch (error) {
      state.families = [];
    }

    /* junta os destaques, sem duplicar */
    const seen = new Set();
    state.families.forEach(function (family) {
      family.sites.forEach(function (site) {
        seen.add(normalize(site.url));
      });
    });
    const extras = EXTRA.filter(function (site) {
      return !seen.has(normalize(site.url));
    });
    if (extras.length) {
      state.families.unshift({
        id: 'destaques',
        name: 'Destaques',
        cat: 'jogos',
        logo: '',
        sites: extras.map(function (site) {
          return { name: site.name, url: site.url };
        })
      });
    }

    state.families.forEach(function (family) {
      family.count = family.sites.length;
      family.hosts = family.sites.map(function (site) {
        return (site.name + ' ' + host(site.url)).toLowerCase();
      }).join(' ');
    });

    state.loaded = true;
  }

  function total() {
    return state.families.reduce(function (sum, family) {
      return sum + family.count;
    }, 0);
  }

  function matchesQuery(family) {
    const query = state.query.trim().toLowerCase();
    if (!query) return true;
    if (family.name.toLowerCase().indexOf(query) >= 0) return true;
    return family.hosts.indexOf(query) >= 0;
  }

  function visibleFamilies() {
    let list = state.families;
    if (state.cat) {
      list = list.filter(function (family) {
        return family.cat === state.cat;
      });
    }
    return list.filter(matchesQuery);
  }

  /* ---------- render ---------- */
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function familyCard(family) {
    const card = el('article', 'family' + (state.open[family.id] ? ' is-open' : ''));
    card.dataset.family = family.id;

    const head = el('button', 'family__head');
    head.type = 'button';
    head.setAttribute('aria-expanded', state.open[family.id] ? 'true' : 'false');

    if (family.logo) {
      const logo = el('span', 'family__logo family__logo--img');
      const img = document.createElement('img');
      img.src = family.logo;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.width = 40;
      img.height = 40;
      img.addEventListener('error', function () {
        logo.classList.remove('family__logo--img');
        logo.textContent = initials(family.name);
      });
      logo.append(img);
      head.append(logo);
    } else {
      const mark = el('span', 'family__logo', initials(family.name));
      mark.style.cssText = markStyle(family.name);
      head.append(mark);
    }

    const text = el('span', 'family__text');
    text.append(
      el('span', 'family__name', family.name),
      el('span', 'family__meta', family.count + (family.count === 1 ? ' link' : ' links') + ' · ' + CAT_LABEL[family.cat])
    );
    head.append(text);

    const badge = el('span', 'family__cat family__cat--' + family.cat, CAT_LABEL[family.cat]);
    head.append(badge);

    const chevron = el('span', 'family__chevron');
    chevron.setAttribute('aria-hidden', 'true');
    chevron.textContent = '▾';
    head.append(chevron);

    card.append(head);

    const body = el('div', 'family__body');
    card.append(body);

    /* as linhas só existem no DOM quando a coleção é aberta:
       com 488 links, montar tudo de uma vez seria desperdício */
    if (state.open[family.id]) buildRows(family, body);
    return card;
  }

  function buildRows(family, body) {
    if (!body || body.firstChild) return;
    const list = el('ul', 'link-list');

    family.sites.forEach(function (site) {
      const item = el('li', 'link-row');
      item.dataset.url = site.url;

      const main = el('button', 'link-row__open');
      main.type = 'button';
      main.title = 'Abrir aqui dentro';
      main.append(el('span', 'link-row__name', site.name), el('span', 'link-row__host', host(site.url)));

      const outside = document.createElement('a');
      outside.className = 'link-row__out';
      outside.href = site.url;
      outside.target = '_blank';
      outside.rel = 'noopener noreferrer';
      outside.title = 'Abrir em nova aba';
      outside.setAttribute('aria-label', 'Abrir ' + site.name + ' em nova aba');
      outside.textContent = '↗';

      item.append(main, outside);
      list.append(item);
    });

    body.append(list);
  }

  function render() {
    if (!dom.list) return;

    const families = visibleFamilies();
    const shown = families.reduce(function (sum, family) {
      return sum + family.count;
    }, 0);

    dom.list.textContent = '';

    if (!families.length) {
      const empty = el('div', 'sites-empty');
      if (state.loaded) {
        const art = el('img', 'sites-empty__art');
        art.src = '../assets/img/sites-signal.jpg';
        art.alt = '';
        art.width = 288;
        art.height = 288;
        art.loading = 'lazy';
        art.decoding = 'async';
        empty.append(art);
      }
      empty.append(el('p', 'sites-empty__text', state.loaded
        ? 'Nada encontrado. Tente outro nome (ex.: “solara”, “duck”, “apex”).'
        : 'Carregando a lista de sites…'));
      dom.list.append(empty);
    } else {
      dom.list.append(el('p', 'sites-total',
        families.length + ' coleções · ' + shown + ' links'));
      families.forEach(function (family) {
        dom.list.append(familyCard(family));
      });
    }

    if (dom.count) {
      dom.count.textContent = '';
      const strong = el('strong', null, String(shown));
      dom.count.append(strong, document.createTextNode(
        ' de ' + total() + ' links · abrem aqui dentro, sem sair do LuminSDK'
      ));
    }

    if (dom.emptyNote) dom.emptyNote.hidden = state.loaded;
    syncUrl();
  }

  function toggleFamily(id) {
    state.open[id] = !state.open[id];
    const card = dom.list.querySelector('[data-family="' + id + '"]');
    if (!card) return;
    card.classList.toggle('is-open', !!state.open[id]);
    const head = card.querySelector('.family__head');
    if (head) head.setAttribute('aria-expanded', state.open[id] ? 'true' : 'false');

    if (state.open[id]) {
      const family = state.families.find(function (item) { return item.id === id; });
      if (family) buildRows(family, card.querySelector('.family__body'));
    }
  }

  /* ---------- visualizador ---------- */
  function setNote(on, message) {
    if (!dom.note) return;
    dom.note.classList.toggle('is-on', !!on);
    if (on && message) dom.noteText.textContent = message;
  }

  function open(site) {
    if (!site || !dom.viewer) return;
    state.current = site;

    dom.title.textContent = site.name;
    dom.url.textContent = site.url;
    dom.external.href = site.url;
    if (dom.noteLink) dom.noteLink.href = site.url;
    dom.viewer.classList.add('is-open');
    dom.viewer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setNote(false);
    dom.loading.hidden = false;

    dom.frame.removeAttribute('src');
    dom.frame.src = site.url;

    const url = new URL(window.location.href);
    url.searchParams.set('site', site.url);
    history.replaceState(null, '', url.toString());

    clearTimeout(slowTimer);
    slowTimer = setTimeout(function () {
      setNote(true, 'Demorando para aparecer? Alguns sites recusam abrir dentro de outro site. Use “Abrir em nova aba”.');
    }, 9000);

    if (dom.close) dom.close.focus({ preventScroll: true });
  }

  function close() {
    if (!dom.viewer || !dom.viewer.classList.contains('is-open')) return;
    clearTimeout(slowTimer);
    dom.viewer.classList.remove('is-open');
    dom.viewer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    dom.frame.src = 'about:blank';
    dom.loading.hidden = false;
    setNote(false);

    const url = new URL(window.location.href);
    url.searchParams.delete('site');
    history.replaceState(null, '', url.toString());
    state.current = null;
  }

  function syncUrl() {
    if (state.current) return;
    const url = new URL(window.location.href);
    if (state.cat) url.searchParams.set('cat', state.cat);
    else url.searchParams.delete('cat');
    if (state.query.trim()) url.searchParams.set('busca', state.query.trim());
    else url.searchParams.delete('busca');
    history.replaceState(null, '', url.toString());
  }

  /* ---------- eventos ---------- */
  function bind() {
    dom.list = $('#sites-list');
    dom.count = $('#sites-count');
    dom.search = $('#sites-search');
    dom.chips = $('#sites-chips');
    dom.emptyNote = $('#sites-loading');
    dom.viewer = $('#viewer');
    dom.frame = $('#viewer-frame');
    dom.loading = $('#viewer-loading');
    dom.title = $('#viewer-name');
    dom.url = $('#viewer-url');
    dom.note = $('#viewer-note');
    dom.noteText = $('#viewer-note-text');
    dom.noteLink = $('#viewer-note-link');
    dom.close = $('#viewer-close');
    dom.external = $('#viewer-external');

    if (dom.list) {
      dom.list.addEventListener('click', function (event) {
        const out = event.target.closest('.link-row__out');
        if (out) return;                       /* link externo: deixa o navegador cuidar */

        const row = event.target.closest('.link-row');
        if (row) {
          const family = state.families.find(function (item) {
            return item.sites.some(function (site) {
              return site.url === row.dataset.url;
            });
          });
          const site = family && family.sites.find(function (item) {
            return item.url === row.dataset.url;
          });
          if (site) open(site);
          return;
        }

        const head = event.target.closest('.family__head');
        if (head && head.parentElement) toggleFamily(head.parentElement.dataset.family);
      });
    }

    if (dom.search) {
      dom.search.addEventListener('input', function () {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function () {
          state.query = dom.search.value;
          if (state.query.trim()) {
            /* buscar em tudo: expande as coleções que têm resultado */
            visibleFamilies().forEach(function (family) { state.open[family.id] = true; });
          }
          render();
        }, 130);
      });
    }

    if (dom.chips) {
      dom.chips.addEventListener('click', function (event) {
        const chip = event.target.closest('[data-cat]');
        if (!chip) return;
        state.cat = chip.dataset.cat;
        dom.chips.querySelectorAll('[data-cat]').forEach(function (item) {
          item.setAttribute('aria-pressed', item === chip ? 'true' : 'false');
        });
        render();
      });
    }

    if (dom.frame) {
      dom.frame.addEventListener('load', function () {
        const src = dom.frame.getAttribute('src') || '';
        if (!src || src === 'about:blank') return;
        dom.loading.hidden = true;
      });
    }

    if (dom.close) dom.close.addEventListener('click', close);

    const reload = $('#viewer-reload');
    if (reload) {
      reload.addEventListener('click', function () {
        if (!state.current) return;
        dom.loading.hidden = false;
        setNote(false);
        dom.frame.src = state.current.url;
      });
    }

    const full = $('#viewer-full');
    if (full) {
      full.addEventListener('click', function () {
        if (!dom.frame) return;
        if (document.fullscreenElement) {
          document.exitFullscreen();
          return;
        }
        const request = dom.frame.requestFullscreen || dom.frame.webkitRequestFullscreen;
        if (request) request.call(dom.frame).catch(function () {});
        else if (state.current) window.open(state.current.url, '_blank', 'noopener');
      });
    }

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      if (dom.viewer && dom.viewer.classList.contains('is-open')) {
        event.preventDefault();
        close();
      }
    });

    window.addEventListener('popstate', function () {
      if (!new URLSearchParams(window.location.search).get('site')) close();
    });
  }

  /* ---------- início ---------- */
  async function init() {
    bind();
    if (!dom.list) return;

    const params = new URLSearchParams(window.location.search);
    const q = params.get('busca');
    const cat = params.get('cat');
    if (q && dom.search) {
      state.query = q;
      dom.search.value = q;
    }
    if (cat) {
      state.cat = cat;
      if (dom.chips) {
        dom.chips.querySelectorAll('[data-cat]').forEach(function (item) {
          item.setAttribute('aria-pressed', item.dataset.cat === cat ? 'true' : 'false');
        });
      }
    }

    await load();
    /* a primeira coleção já vem aberta: a aba nunca abre "vazia" */
    const first = visibleFamilies()[0];
    if (first && !Object.keys(state.open).length) state.open[first.id] = true;
    render();

    const deep = params.get('site');
    if (deep) {
      const family = state.families.find(function (item) {
        return item.sites.some(function (site) {
          return site.url === deep;
        });
      });
      const site = family && family.sites.find(function (item) {
        return item.url === deep;
      });
      if (site) open(site);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.LuminSites = {
    families: function () { return state.families; },
    open: function (url) {
      const family = state.families.find(function (item) {
        return item.sites.some(function (site) { return site.url === url; });
      });
      if (!family) return false;
      open(family.sites.find(function (site) { return site.url === url; }));
      return true;
    },
    close: close
  };
})();
