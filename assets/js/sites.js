/* =========================================================
   LuminSDK — aba Sites
   Catálogo de sites que abrem DENTRO do LuminSDK (site dentro de site).

   Links are opened in an about:blank iframe by the shared helper.
   Blocked pop-ups never fall back to direct navigation; CSP still applies.

   Sem bibliotecas, sem build.
   Autor: Ryan Smith · Licença MIT
   ========================================================= */
(function () {
  'use strict';

  const DATA_URL = 'assets/data/sites.json';
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

  /* endereços que recusaram abrir aqui dentro (aprendido no uso) */
  const BLOCK_KEY = 'luminsdk:v1:sites:blocked';
  const MODE_KEY = 'luminsdk:v1:sites:newtab';

  function readBlocked() {
    try {
      const list = JSON.parse(localStorage.getItem(BLOCK_KEY) || '[]');
      return Array.isArray(list) ? list : [];
    } catch (error) {
      return [];
    }
  }

  function markBlocked(target) {
    const list = readBlocked();
    if (!target || list.indexOf(target) >= 0) return;
    list.push(target);
    try {
      localStorage.setItem(BLOCK_KEY, JSON.stringify(list.slice(-400)));
    } catch (error) {}
  }

  function unmarkBlocked(target) {
    const list = readBlocked().filter(function (item) { return item !== target; });
    try {
      localStorage.setItem(BLOCK_KEY, JSON.stringify(list));
    } catch (error) {}
  }

  function readMode() {
    try { return localStorage.getItem(MODE_KEY) === '1'; } catch (error) { return false; }
  }

  function saveMode(on) {
    try { localStorage.setItem(MODE_KEY, on ? '1' : '0'); } catch (error) {}
  }

  const state = {
    families: [],
    filter: '',
    cat: '',
    open: {},          // coleções expandidas
    query: '',
    current: null,
    loaded: false,
    newTab: true,
    openedAt: 0,
    loadedFrame: false,
    /* links que o navegador não conseguiu alcançar (checagem local) */
    dead: {},
    showDead: false,
    checking: false,
    checkAbort: null
  };

  const DEAD_STORE = 'luminsdk:v1:dead';
  const CHECK_TIMEOUT = 9000;
  const CHECK_PARALLEL = 6;

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
  /* ---------- links fora do ar ----------
     O navegador não deixa ver o status de outro domínio, então a checagem
     detecta o que dá para detectar de verdade: endereço que não responde
     (DNS, conexão recusada, tempo esgotado). Página que responde 404
     continua parecendo viva — está escrito na tela, sem promessa falsa. */
  function isDead(url) { return !!state.dead[url]; }

  function deadList() {
    return Object.keys(state.dead).sort();
  }

  function deadCount() {
    return Object.keys(state.dead).length;
  }

  function readDead() {
    try {
      const raw = localStorage.getItem(DEAD_STORE);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved && typeof saved === 'object') state.dead = saved;
    } catch (error) { /* modo privado: segue sem marcações */ }
  }

  function writeDead() {
    try { localStorage.setItem(DEAD_STORE, JSON.stringify(state.dead)); } catch (error) { /* ignora */ }
  }

  /* um link só entra na lista se não estiver marcado como fora do ar */
  function aliveSites(family) {
    return (family.sites || []).filter(function (site) {
      return state.showDead || !isDead(site.url);
    });
  }

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
      el('span', 'family__meta', (function () {
        const vivos = aliveSites(family).length;
        const fora = family.count - vivos;
        return vivos + (vivos === 1 ? ' link' : ' links') +
          (fora > 0 ? ' · ' + fora + ' fora do ar' : '') + ' · ' + CAT_LABEL[family.cat];
      })())
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

    aliveSites(family).forEach(function (site) {
      const item = el('li', 'link-row' + (isDead(site.url) ? ' is-dead' : ''));
      item.dataset.url = site.url;
      if (isDead(site.url)) item.title = 'Não respondeu na última checagem';

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
      if (isDead(site.url)) {
        item.append(el('span', 'link-row__dead', 'fora do ar'));
      }
      list.append(item);
    });

    body.append(list);
  }

  function render() {
    if (!dom.list) return;

    const families = visibleFamilies();
    const shown = families.reduce(function (sum, family) {
      return sum + aliveSites(family).length;
    }, 0);

    dom.list.textContent = '';

    if (!families.length) {
      const empty = el('div', 'sites-empty');
      if (state.loaded) {
        const art = el('img', 'sites-empty__art');
        art.src = 'assets/img/sites-signal.jpg';
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
        families.length + ' coleções · ' + shown + ' links' +
        (deadCount() && !state.showDead ? ' · ' + deadCount() + ' fora do ar ocultos' : '')));
      families.forEach(function (family) {
        dom.list.append(familyCard(family));
      });
    }

    if (dom.count) {
      dom.count.textContent = '';
      const strong = el('strong', null, String(shown));
      dom.count.append(strong, document.createTextNode(
        ' de ' + (total() - deadCount()) + ' links · abrem aqui dentro, sem sair do LuminSDK'
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
    if (!site) return false;
    const ok = cleanTab(site.url,site.name);
    if (!ok) toast('Libere pop-ups e tente novamente. O portal não foi redirecionado.');
    return ok;
  }

  function close() {
    if (!dom.viewer || !dom.viewer.classList.contains('is-open')) return;
    clearTimeout(slowTimer);
    if (state.current && dom.note && dom.note.classList.contains('is-on')) {
      markBlocked(host(state.current.url));   /* da próxima vez vai direto para a aba */
    }
    dom.viewer.classList.remove('is-open');
    dom.viewer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    dom.frame.src = 'about:blank';
    dom.loading.hidden = false;
    setNote(false);

    state.current = null;
  }

  /* The tab itself never navigates away from about:blank. */
  function cleanTab(url,name) {
    return !!(window.LuminLinks ? window.LuminLinks.open(url,name) : window.LuminGameTab && window.LuminGameTab.open(url,name));
  }

  let toastTimer = 0;
  function toast(message) {
    if (!dom.toast) return;
    dom.toast.textContent = message;
    dom.toast.hidden = false;
    dom.toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      dom.toast.classList.remove('is-on');
      dom.toast.hidden = true;
    }, 6200);
  }

  /* a URL do LuminSDK é única e fixa: nada de ?site= / ?cat= / ?busca=
     no endereço — o estado vive só na memória */
  function syncUrl() {}

  /* ---------- checagem de links (roda no seu navegador) ----------
     O navegador não deixa ler o status de outro domínio, então o teste é de
     alcance: se o endereço não responde (DNS, conexão recusada, tempo
     esgotado) ele é marcado. Página que responde 404 continua parecendo
     viva — a tela diz isso com todas as letras, sem prometer demais. */
  function setCheckLabel(text, busy) {
    if (!dom.check) return;
    const span = dom.check.querySelector('span');
    if (span) span.textContent = text;
    dom.check.classList.toggle('is-busy', !!busy);
    dom.check.setAttribute('aria-pressed', busy ? 'true' : 'false');
  }

  function uniqueUrls() {
    const seen = {};
    const out = [];
    state.families.forEach(function (family) {
      (family.sites || []).forEach(function (site) {
        if (!site.url || seen[site.url]) return;
        seen[site.url] = true;
        out.push(site.url);
      });
    });
    return out;
  }

  function probe(url, globalSignal) {
    return new Promise(function (resolve) {
      const local = typeof AbortController === 'function' ? new AbortController() : null;
      let settled = false;
      let timer = 0;

      const finish = function (ok) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (globalSignal) globalSignal.removeEventListener('abort', onAbort);
        resolve(ok);
      };
      const onAbort = function () { if (local) local.abort(); finish(false); };

      timer = setTimeout(onAbort, CHECK_TIMEOUT);
      if (globalSignal) globalSignal.addEventListener('abort', onAbort);

      const options = { mode: 'no-cors', cache: 'no-store', credentials: 'omit', redirect: 'follow' };
      if (local) options.signal = local.signal;
      fetch(url, options).then(function () { finish(true); }, function () { finish(false); });
    });
  }

  async function checkLinks() {
    if (state.checking) {
      if (state.checkAbort) state.checkAbort.abort();
      return;
    }
    const urls = uniqueUrls();
    if (!urls.length) return;

    state.checking = true;
    state.checkAbort = typeof AbortController === 'function' ? new AbortController() : null;
    const signal = state.checkAbort && state.checkAbort.signal;
    const found = {};
    let done = 0;

    hideReport();
    setCheckLabel('checando 0/' + urls.length + '…', true);

    let cursor = 0;
    const worker = async function () {
      while (cursor < urls.length) {
        if (signal && signal.aborted) return;
        const url = urls[cursor];
        cursor += 1;
        const alive = await probe(url, signal);
        if (!alive) found[url] = Date.now();
        done += 1;
        if (done % 3 === 0 || done === urls.length) {
          setCheckLabel('checando ' + done + '/' + urls.length + '…', true);
        }
      }
    };

    const pool = [];
    for (let i = 0; i < CHECK_PARALLEL; i += 1) pool.push(worker());
    await Promise.all(pool);

    const cancelled = !!(signal && signal.aborted);
    state.checking = false;
    state.checkAbort = null;
    setCheckLabel('Checar links', false);

    if (cancelled) {
      toast('Checagem cancelada — nada foi marcado.');
      return;
    }

    state.dead = found;
    writeDead();
    render();
    showReport(urls.length, Object.keys(found).length);
  }

  function hideReport() {
    if (dom.report) dom.report.hidden = true;
    if (dom.deadOut) {
      dom.deadOut.hidden = true;
      dom.deadOut.value = '';
    }
  }

  function showReport(testados, mortos) {
    if (dom.report) dom.report.hidden = false;
    if (dom.reportText) {
      dom.reportText.textContent = testados + ' endereços testados · ' +
        (mortos === 0
          ? 'todos responderam.'
          : mortos + (mortos === 1 ? ' não respondeu' : ' não responderam') + ' — ocultados da lista.') +
        ' O navegador só deixa ver se o endereço responde: página que devolve 404 continua aqui.';
    }
    if (dom.deadToggle) {
      dom.deadToggle.textContent = state.showDead ? 'Ocultar os quebrados' : 'Mostrar os quebrados';
      dom.deadToggle.hidden = mortos === 0;
    }
    if (dom.deadCopy) dom.deadCopy.hidden = mortos === 0;
    if (dom.deadClear) dom.deadClear.hidden = mortos === 0;
  }

  /* copia a lista para colar onde quiser (ex.: mandar de volta para o repo) */
  function copyDead() {
    const list = deadList();
    if (!list.length || !dom.deadOut) return;
    dom.deadOut.hidden = false;
    dom.deadOut.value = list.join('\n');
    dom.deadOut.focus();
    dom.deadOut.select();
    const pronto = function () { toast(list.length + ' endereços copiados.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(dom.deadOut.value).then(pronto, function () {
        toast('Selecione o texto e copie (Ctrl+C).');
      });
    } else {
      toast('Selecione o texto e copie (Ctrl+C).');
    }
  }

  /* ---------- eventos ---------- */
  function bind() {
    dom.list = $('#sites-list');
    dom.count = $('#sites-count');
    dom.search = $('#sites-search');
    dom.chips = $('#sites-chips');
    dom.fold = $('#sites-fold');
    dom.check = $('#sites-check');
    dom.report = $('#sites-report');
    dom.reportText = $('#sites-report-text');
    dom.deadToggle = $('#sites-dead-toggle');
    dom.deadCopy = $('#sites-dead-copy');
    dom.deadClear = $('#sites-dead-clear');
    dom.deadOut = $('#sites-dead-out');
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
    dom.toast = $('#sites-toast');
    dom.mode = $('#sites-mode');
    dom.retry = $('#viewer-retry');

    if (dom.list) {
      dom.list.addEventListener('click', function (event) {
        const out = event.target.closest('.link-row__out');
        if (out) {
          /* o ↗ também passa pela aba limpa (sem referrer e sem opener) */
          if (event.metaKey || event.ctrlKey || event.shiftKey) return;
          const line = out.closest('.link-row');
          event.preventDefault();
          if (line) {
            const nameNode = line.querySelector('.link-row__name');
            cleanTab(line.dataset.url, nameNode ? nameNode.textContent : host(line.dataset.url));
          }
          return;
        }

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

    if (dom.check) {
      dom.check.addEventListener('click', function () {
        if (state.checking) {
          if (state.checkAbort) state.checkAbort.abort();
          return;
        }
        checkLinks();
      });
    }

    if (dom.deadToggle) {
      dom.deadToggle.addEventListener('click', function () {
        state.showDead = !state.showDead;
        render();
        showReport(uniqueUrls().length, deadCount());
      });
    }

    if (dom.deadCopy) dom.deadCopy.addEventListener('click', copyDead);

    if (dom.deadClear) {
      dom.deadClear.addEventListener('click', function () {
        state.dead = {};
        state.showDead = false;
        writeDead();
        render();
        hideReport();
        toast('Marcações de links fora do ar apagadas.');
      });
    }

    /* "dobrar tudo": fecha as coleções abertas; se já estão todas fechadas,
       abre as que apareceram no filtro atual */
    if (dom.fold) {
      dom.fold.addEventListener('click', function () {
        const list = visibleFamilies();
        const abertas = list.filter(function (family) { return state.open[family.id]; });
        const fechar = abertas.length > 0;
        list.forEach(function (family) { state.open[family.id] = !fechar; });
        render();
        dom.fold.setAttribute('aria-pressed', fechar ? 'true' : 'false');
        const rotulo = dom.fold.querySelector('span');
        if (rotulo) rotulo.textContent = fechar ? 'Abrir tudo' : 'Dobrar tudo';
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
        state.loadedFrame = true;
        /* carga em menos de 0,9 s + iframe inacessível = quase sempre a
           página de erro do navegador (bloqueio de iframe) */
        const fast = state.openedAt && Date.now() - state.openedAt < 900;
        if (fast) {
          setNote(true, 'Se a página ficou em branco, este site recusa abrir dentro de outro site. Use “Abrir em nova aba”.');
        }
      });
    }

    if (dom.close) dom.close.addEventListener('click', close);

    /* "abrir em nova aba" (barra e nota) também passa pela aba limpa */
    [dom.external, dom.noteLink].forEach(function (link) {
      if (!link) return;
      link.addEventListener('click', function (event) {
        if (!state.current) return;
        event.preventDefault();
        if (state.current) markBlocked(host(state.current.url));
        cleanTab(state.current.url, state.current.name);
        close();
      });
    });

    if (dom.retry) {
      dom.retry.addEventListener('click', function () {
        if (!state.current) return;
        unmarkBlocked(host(state.current.url));
        setNote(false);
        open({ url: state.current.url, name: state.current.name }, { force: true });
      });
    }

    /* Mandatory policy, not a switch that can re-enable direct navigation. */
    if (dom.mode) { dom.mode.disabled = true; dom.mode.setAttribute('aria-pressed','true'); dom.mode.textContent = 'Sempre about:blank · iframe'; }

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
        else if (state.current) cleanTab(state.current.url,state.current.name);
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
    readDead();
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
