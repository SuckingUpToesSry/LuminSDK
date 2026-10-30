/* =========================================================
   LuminSDK — aba Sites
   Lista de sites externos que abrem DENTRO do LuminSDK, num
   visualizador próprio (site dentro de site).

   Regras da casa:
   · nenhuma biblioteca, nenhuma imagem externa, nenhum build
   · a lista é estática e vive aqui, então não gasta requisição
   · se o site recusar ser embutido (X-Frame-Options/CSP), avisamos
     e oferecemos abrir em outra aba — sem fingir que funcionou

   Autor: Ryan Smith · Licença MIT
   ========================================================= */
(function () {
  'use strict';

  /* ---------- acervo ---------- */
  const APEX = [
    ['imp-v2', 'IMP v2'],
    ['triple-t-hd', 'Triple T HD'],
    ['tungtung', 'Tung Tung'],
    ['zaka', 'Zaka'],
    ['solara', 'Solara (Apex)'],
    ['space', 'Space'],
    ['study-hub', 'Study Hub'],
    ['truffled', 'Truffled'],
    ['xylora', 'Xylora'],
    ['aurora', 'Aurora'],
    ['cheesy', 'Cheesy'],
    ['ink', 'Ink'],
    ['krypton', 'Krypton'],
    ['ather', 'Ather'],
    ['j-m-w', 'J.M.W'],
    ['luna', 'Luna'],
    ['other', 'Other'],
    ['re-vault', 'RE Vault'],
    ['celo-ai', 'Celo AI'],
    ['classroom-spot', 'Classroom Spot'],
    ['duck', 'Duck'],
    ['equinox', 'Equinox'],
    ['seletine', 'Seletine'],
    ['bull-33', 'Bull 33'],
    ['c00lkid', 'c00lkid'],
    ['mono-math', 'MonoMath'],
    ['nexus', 'Nexus'],
    ['void', 'Void'],
    ['desync', 'Desync'],
    ['edu-rocks', 'Edu Rocks'],
    ['flare', 'Flare'],
    ['interstellar', 'Interstellar'],
    ['reds', 'Reds']
  ];

  const SITES = [
    {
      slug: 'solara',
      name: 'Solara',
      url: 'https://solara.polimont.com.br/',
      group: 'Portais',
      tag: 'novo'
    },
    {
      slug: 'gta-v-port',
      name: 'GTA V Port',
      url: 'https://fiveplay.lol/',
      group: 'Portais'
    },
    {
      slug: 'gta-v-port-launcher',
      name: 'GTA V Port — Launcher v2',
      url: 'https://v2.fiveplay.lol/launcher.html',
      group: 'Portais'
    }
  ].concat(
    APEX.map(function (item) {
      return {
        slug: 'apex-' + item[0],
        name: item[1],
        url: 'https://' + item[0] + '.apexflightacademy.com/',
        group: 'ApexFlight Pack'
      };
    })
  );

  const GROUP_ORDER = ['Portais', 'ApexFlight Pack'];

  /* ---------- estado ---------- */
  const state = { group: '', query: '', current: null };

  const dom = {};
  let loadTimer = 0;
  let slowTimer = 0;

  function $(sel) {
    return document.querySelector(sel);
  }

  function hostOf(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch (error) {
      return url;
    }
  }

  function initials(name) {
    const parts = String(name).replace(/[()]/g, '').split(/[\s-]+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  function filtered() {
    const query = state.query.trim().toLowerCase();
    return SITES.filter(function (site) {
      if (state.group && site.group !== state.group) return false;
      if (!query) return true;
      return (
        site.name.toLowerCase().indexOf(query) >= 0 ||
        hostOf(site.url).toLowerCase().indexOf(query) >= 0
      );
    });
  }

  /* ---------- lista ---------- */
  function card(site) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'site-card';
    button.dataset.slug = site.slug;
    button.setAttribute('aria-label', 'Abrir ' + site.name + ' aqui dentro');

    const mark = document.createElement('span');
    mark.className = 'site-card__mark';
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = initials(site.name);

    const body = document.createElement('span');
    const name = document.createElement('span');
    name.className = 'site-card__name';
    name.textContent = site.name;
    const host = document.createElement('span');
    host.className = 'site-card__host';
    host.textContent = hostOf(site.url);
    body.append(name, host);

    button.append(mark, body);

    if (site.tag) {
      const tag = document.createElement('span');
      tag.className = 'site-card__tag';
      tag.textContent = site.tag;
      button.append(tag);
    }

    return button;
  }

  function render() {
    if (!dom.list) return;

    const list = filtered();
    dom.list.textContent = '';

    if (!list.length) {
      const empty = document.createElement('p');
      empty.className = 'sites-empty';
      empty.textContent = 'Nenhum site encontrado. Tente outro nome ou toque em “Todos”.';
      dom.list.append(empty);
    } else {
      GROUP_ORDER.forEach(function (group) {
        const items = list.filter(function (site) {
          return site.group === group;
        });
        if (!items.length) return;

        const section = document.createElement('section');
        section.className = 'sites-group';

        const title = document.createElement('h2');
        title.className = 'sites-group__title';
        title.textContent = group;
        const count = document.createElement('small');
        count.textContent = items.length + (items.length === 1 ? ' site' : ' sites');
        title.append(count);

        const grid = document.createElement('div');
        grid.className = 'sites-grid';
        items.forEach(function (site) {
          grid.append(card(site));
        });

        section.append(title, grid);
        dom.list.append(section);
      });
    }

    if (dom.count) {
      dom.count.textContent = '';
      const strong = document.createElement('strong');
      strong.textContent = String(list.length);
      dom.count.append(strong, document.createTextNode(' de ' + SITES.length + ' sites · abre aqui dentro, sem sair do LuminSDK'));
    }
  }

  /* ---------- visualizador ---------- */
  function clearTimers() {
    clearTimeout(loadTimer);
    clearTimeout(slowTimer);
  }

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

    /* limpamos antes para o navegador não reaproveitar a página anterior */
    dom.frame.removeAttribute('src');
    dom.frame.src = site.url;

    const name = site.slug;
    const url = new URL(window.location.href);
    url.searchParams.set('site', name);
    history.replaceState(null, '', url.toString());

    clearTimers();
    /* o iframe dispara 'load' mesmo quando o site bloqueia o embed, então
       usamos o tempo como pista: passou de 9 s, avisamos como resolver */
    slowTimer = setTimeout(function () {
      setNote(true, 'Demorando para aparecer? Alguns sites recusam abrir dentro de outro site. Use “Abrir em nova aba”.');
    }, 9000);

    if (dom.close) dom.close.focus({ preventScroll: true });
  }

  function close() {
    if (!dom.viewer || !dom.viewer.classList.contains('is-open')) return;
    clearTimers();
    dom.viewer.classList.remove('is-open');
    dom.viewer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    dom.frame.src = 'about:blank';
    dom.loading.hidden = false;
    setNote(false);

    const url = new URL(window.location.href);
    url.searchParams.delete('site');
    history.replaceState(null, '', url.toString());

    if (state.current && dom.list) {
      const back = dom.list.querySelector('[data-slug="' + state.current.slug + '"]');
      if (back) back.focus({ preventScroll: true });
    }
    state.current = null;
  }

  function reload() {
    if (!state.current) return;
    clearTimers();
    dom.loading.hidden = false;
    setNote(false);
    dom.frame.src = state.current.url;
  }

  function fullscreen() {
    const target = dom.frame;
    if (!target) return;
    const doc = document;
    if (doc.fullscreenElement || doc.webkitFullscreenElement) {
      (doc.exitFullscreen || doc.webkitExitFullscreen || function () {}).call(doc);
      return;
    }
    const request = target.requestFullscreen || target.webkitRequestFullscreen;
    if (request) request.call(target).catch(function () {});
    else if (target.webkitAllowFullScreen) target.webkitEnterFullscreen();
    else window.open(state.current ? state.current.url : '', '_blank', 'noopener');
  }

  /* ---------- ligações ---------- */
  function bind() {
    dom.list = $('#sites-list');
    dom.count = $('#sites-count');
    dom.search = $('#sites-search');
    dom.chips = $('#sites-chips');
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
        const target = event.target.closest('[data-slug]');
        if (!target) return;
        const site = SITES.find(function (item) {
          return item.slug === target.dataset.slug;
        });
        if (site) open(site);
      });
    }

    if (dom.search) {
      let timer = 0;
      dom.search.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          state.query = dom.search.value;
          render();
        }, 120);
      });
    }

    if (dom.chips) {
      dom.chips.addEventListener('click', function (event) {
        const chip = event.target.closest('[data-group]');
        if (!chip) return;
        state.group = chip.dataset.group;
        dom.chips.querySelectorAll('[data-group]').forEach(function (item) {
          item.setAttribute('aria-pressed', item === chip ? 'true' : 'false');
        });
        render();
      });
    }

    if (dom.frame) {
      dom.frame.addEventListener('load', function () {
        const src = dom.frame.getAttribute('src') || '';
        if (!src || src === 'about:blank') return;
        clearTimeout(loadTimer);
        dom.loading.hidden = true;
      });
    }

    if (dom.close) dom.close.addEventListener('click', close);
    if (dom.external) {
      dom.external.addEventListener('click', function () {
        setNote(false);
      });
    }

    const reloadBtn = $('#viewer-reload');
    if (reloadBtn) reloadBtn.addEventListener('click', reload);

    const fullBtn = $('#viewer-full');
    if (fullBtn) fullBtn.addEventListener('click', fullscreen);

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      if (dom.viewer && dom.viewer.classList.contains('is-open')) {
        event.preventDefault();
        close();
      }
    });

    window.addEventListener('popstate', function () {
      const param = new URLSearchParams(window.location.search).get('site');
      if (!param) close();
    });
  }

  function init() {
    bind();
    if (!dom.list) return;
    render();

    const param = new URLSearchParams(window.location.search).get('site');
    if (param) {
      const site = SITES.find(function (item) {
        return item.slug === param;
      });
      if (site) open(site);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  /* útil para testes e para outras abas */
  window.LuminSites = {
    list: SITES,
    open: function (slug) {
      const site = SITES.find(function (item) {
        return item.slug === slug;
      });
      if (site) open(site);
      return !!site;
    },
    close: close
  };
})();
