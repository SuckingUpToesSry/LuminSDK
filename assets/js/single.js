/* =========================================================
   LuminSDK — aba Single: baixar o site inteiro num arquivo só
   O arquivo é montado AQUI, no navegador de quem clica: o módulo
   busca o index.html, as folhas, os scripts, os dados e as imagens,
   embute tudo (CSS/JS em <style>/<script>, imagens em data URI) e
   entrega um .html pronto para abrir com duplo clique.

   · nada de build, nada de servidor: o arquivo sai sempre igual ao
     site que está no ar naquele momento (nunca fica velho)
   · o pacote continua sendo o site inteiro: rail, Lumin, GN-Math,
     DuckMath, Astra, Sites, Nav, Estudos, Hub e LuminOS
   · os módulos de cada aba viajam como texto inerte e só rodam
     quando a aba abre — igual ao site normal (assets/js/app.js lê
     window.__LUMIN_BUNDLE__ quando __LUMIN_SINGLE__ está ligado)
   · os JSON de dados são servidos da memória por um fetch embutido,
     e as imagens criadas por JS são trocadas pelo data URI na hora

   API: window.LuminSingle.{build, plan, run, state}
   Autor: Ryan Smith · Licença MIT
   ========================================================= */
(function () {
  'use strict';

  const FILE = 'LuminSDK.html';
  const STORE = 'luminsdk:v1:single';
  const DATA_FILES = ['assets/data/sites.json', 'assets/data/gnmath-games.json'];
  /* arquivos que o site entrega prontos para baixar (Ctrl + AltGr + P):
     entram como data URI, para o arquivo solto não depender da pasta */
  const RAW_FILES = ['assets/files/DRAG-INTO-BROWSER.svg.html'];
  const PARALLEL = 6;

  const state = { busy: false, prefs: { images: true } };

  /* ---------- utilidades ---------- */
  function clean(url) {
    return String(url || '').split('?')[0].split('#')[0];
  }

  function isLocal(url) {
    return typeof url === 'string' && url.indexOf('assets/') === 0;
  }

  function unique(list) {
    const seen = {};
    const out = [];
    list.forEach(function (item) {
      if (!item || seen[item]) return;
      seen[item] = true;
      out.push(item);
    });
    return out;
  }

  function escapeRe(text) {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function attr(text) {
    return String(text).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  /* "</script" dentro de um <script> fecha o bloco: escapamos a barra,
     que continua válida dentro de string/regex no JavaScript */
  function safeScript(code) {
    return String(code).replace(/<\/(script)/gi, '<\\/$1');
  }

  function safeStyle(code) {
    return String(code).replace(/<\/(style)/gi, '<\\/$1');
  }

  function size(bytes) {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1).replace('.', ',') + ' MB';
  }

  function mime(path) {
    const ext = (clean(path).match(/\.([a-z0-9]+)$/i) || [])[1];
    const table = {
      svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
      webp: 'image/webp', gif: 'image/gif', ico: 'image/x-icon', avif: 'image/avif'
    };
    return table[String(ext || '').toLowerCase()] || 'application/octet-stream';
  }

  function base64(bytes) {
    let binary = '';
    const step = 0x8000;
    for (let i = 0; i < bytes.length; i += step) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
    }
    return btoa(binary);
  }

  async function fetchText(path) {
    const response = await fetch(clean(path), { cache: 'no-store' });
    if (!response.ok) throw new Error(path + ' · HTTP ' + response.status);
    return response.text();
  }

  async function fetchBytes(path) {
    const response = await fetch(clean(path), { cache: 'no-store' });
    if (!response.ok) throw new Error(path + ' · HTTP ' + response.status);
    return new Uint8Array(await response.arrayBuffer());
  }

  /* baixa uma lista mantendo no máximo PARALLEL requisições abertas */
  async function pool(list, worker, onDone) {
    const out = new Array(list.length);
    let next = 0;
    let done = 0;

    async function run() {
      while (next < list.length) {
        const index = next++;
        out[index] = await worker(list[index], index);
        done += 1;
        if (onDone) onDone(done, list.length, list[index]);
      }
    }

    const workers = [];
    const total = Math.min(PARALLEL, list.length);
    for (let i = 0; i < total; i += 1) workers.push(run());
    await Promise.all(workers);
    return out;
  }

  /* ---------- plano: o que precisa entrar ---------- */
  function plan(html, routes) {
    const links = [];
    const eager = [];

    String(html).replace(/<link\b[^>]*>/gi, function (tag) {
      const rel = tag.match(/\brel="([^"]+)"/i);
      const href = tag.match(/\bhref="([^"]+)"/i);
      if (rel && href && String(rel[1]).toLowerCase() === 'stylesheet' && isLocal(href[1])) {
        links.push(href[1]);
      }
      return tag;
    });

    String(html).replace(/<script\b[^>]*><\/script>/gi, function (tag) {
      const src = tag.match(/\bsrc="([^"]+)"/i);
      if (src && isLocal(src[1])) eager.push(src[1]);
      return tag;
    });

    const routeCss = [];
    const routeJs = [];
    Object.keys(routes || {}).forEach(function (key) {
      const route = routes[key] || {};
      (route.css || []).forEach(function (href) {
        if (isLocal(href)) routeCss.push(href);
      });
      (route.scripts || []).forEach(function (entry) {
        const src = typeof entry === 'string' ? entry : (entry && entry.src);
        if (isLocal(src)) routeJs.push(src);
      });
    });

    const eagerCss = unique(links);
    const eagerJs = unique(eager);
    const allCss = unique(eagerCss.concat(routeCss));
    const allJs = unique(eagerJs.concat(routeJs));

    return {
      css: allCss,
      eagerCss: eagerCss,
      eagerJs: eagerJs,
      /* os que já rodam no <head>/<body> não entram no mapa de módulos */
      routeCss: allCss.filter(function (href) { return eagerCss.indexOf(href) < 0; }),
      routeJs: allJs.filter(function (src) { return eagerJs.indexOf(src) < 0; }),
      files: allCss.concat(allJs)
    };
  }

  /* imagens locais citadas em cada arquivo.
     - css:  url("../img/x.jpg") resolve a partir da pasta da folha
     - html/js/json: caminhos já escritos como assets/img/…            */
  function imageRefs(files) {
    const found = [];
    files.forEach(function (file) {
      const text = String((file && file.text) || '');
      const matches = text.match(/assets\/img\/[A-Za-z0-9._\-/]+/g);
      if (matches) matches.forEach(function (item) { found.push(item); });

      if (file && file.css) {
        text.replace(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/gi, function (all, quote, ref) {
          if (/^(data:|https?:|\/\/|#)/i.test(ref)) return all;
          const key = resolvePath(ref, file.path);
          if (key.indexOf('assets/img/') === 0) found.push(key);
          return all;
        });
      }
    });
    return unique(found);
  }

  /* ---------- caminhos relativos dentro do CSS ---------- */
  function resolvePath(ref, base) {
    const dir = clean(base).split('/').slice(0, -1);
    String(ref).split('/').forEach(function (part) {
      if (!part || part === '.') return;
      if (part === '..') dir.pop();
      else dir.push(part);
    });
    return dir.join('/');
  }

  function inlineUrls(css, base, images) {
    return String(css).replace(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/gi, function (all, quote, ref) {
      if (/^(data:|https?:|\/\/|#)/i.test(ref)) return all;
      const uri = images[resolvePath(ref, base)];
      return uri ? 'url("' + uri + '")' : all;
    });
  }

  /* ---------- montagem do arquivo (função pura) ---------- */
  function build(input) {
    const routes = input.routes || {};
    const planInfo = plan(input.html, routes);
    const images = input.images || {};
    /* o mapa do runtime só precisa das imagens que o JS cria sozinho
       (galerias, logos das coleções); as do HTML já entram inline */
    const map = input.map || images;
    const css = input.css || {};
    const js = input.js || {};
    const data = input.data || {};
    const raw = input.raw || {};
    let html = String(input.html);

    /* 1. folhas que já existiam no index.html viram <style> no mesmo lugar
       (preservando id/data-*, ex.: o #astolfo-css do tema Astolfo) */
    planInfo.eagerCss.forEach(function (href) {
      const text = css[href];
      if (typeof text !== 'string') return;
      const re = new RegExp('[ \\t]*<link\\b[^>]*href="' + escapeRe(href) + '"[^>]*>\\r?\\n?', 'i');
      html = html.replace(re, function (tag) {
        const id = tag.match(/\bid="([^"]+)"/i);
        const keep = id ? ' id="' + attr(id[1]) + '"' : '';
        return '<style data-href="' + attr(href) + '"' + keep + '>\n' +
          safeStyle(inlineUrls(text, href, images)) + '\n</style>\n';
      });
    });

    /* 2. folhas de aba (só entram quando a aba abre) ficam desligadas */
    let extra = '';
    planInfo.routeCss.forEach(function (href) {
      const text = css[href];
      if (typeof text !== 'string') return;
      /* data-off: só estas começam desligadas (as do index.html são globais) */
      extra += '<style data-href="' + attr(href) + '" data-off="1" disabled>\n' +
        safeStyle(inlineUrls(text, href, images)) + '\n</style>\n';
    });

    /* 3. scripts que já rodavam agora são inline, no mesmo lugar */
    planInfo.eagerJs.forEach(function (src) {
      const code = js[src];
      if (typeof code !== 'string') return;
      const re = new RegExp('[ \\t]*<script\\b[^>]*\\bsrc="' + escapeRe(src) + '"[^>]*>\\s*<\\/script>\\r?\\n?', 'i');
      html = html.replace(re, function () {
        return '<script data-src="' + attr(src) + '">\n' + safeScript(code) + '\n</script>\n';
      });
    });

    /* 4. scripts de aba viram texto inerte; o app.js injeta o da aba aberta */
    planInfo.routeJs.forEach(function (src) {
      const code = js[src];
      if (typeof code !== 'string') return;
      extra += '<script type="application/x-lumin-module" data-module="' + attr(src) + '">' +
        safeScript(code) + '</script>\n';
    });

    /* 5. dados locais: o fetch embutido devolve da memória */
    const dataBlock = {};
    Object.keys(data).forEach(function (key) {
      dataBlock[clean(key)] = data[key];
    });

    /* 6. boot: liga o modo arquivo-único, desliga as folhas de aba e
       resolve dados/imagens que o site pediria à pasta assets/ */
    const boot = [
      '<script>',
      '/* LuminSDK — arquivo único · gerado em ' + String(input.when || '') + ' */',
      'window.__LUMIN_SINGLE__ = true;',
      'window.__LUMIN_BUNDLE__ = true;',
      'window.__LUMIN_DATA__ = ' + safeScript(JSON.stringify(dataBlock)) + ';',
      'window.__LUMIN_IMAGES__ = ' + safeScript(JSON.stringify(map)) + ';',
      'window.__LUMIN_RAW__ = ' + safeScript(JSON.stringify(raw)) + ';',
      '(function () {',
      '  var styles = document.querySelectorAll("style[data-off]");',
      '  for (var i = 0; i < styles.length; i += 1) styles[i].disabled = true;',
      '  var data = window.__LUMIN_DATA__;',
      '  var original = window.fetch;',
      '  window.fetch = function (input) {',
      '    try {',
      '      var url = typeof input === "string" ? input : (input && input.url) || "";',
      '      var key = url.split("?")[0].split("#")[0].replace(/^\\.\\//, "");',
      '      if (data && Object.prototype.hasOwnProperty.call(data, key)) {',
      '        return Promise.resolve(new Response(JSON.stringify(data[key]), {',
      '          status: 200, headers: { "Content-Type": "application/json" }',
      '        }));',
      '      }',
      '    } catch (error) { /* segue para a rede */ }',
      '    return original.apply(this, arguments);',
      '  };',
      '  /* imagens montadas por JS usam o caminho antigo: troca pelo data URI */',
      '  var map = window.__LUMIN_IMAGES__;',
      '  function fixImage(img) {',
      '    var src = img.getAttribute("src") || "";',
      '    var key = src.split("?")[0];',
      '    if (map && map[key] && img.src !== map[key]) img.src = map[key];',
      '  }',
      '  function scan(root) {',
      '    if (!root || root.nodeType !== 1) return;',
      '    if (root.tagName === "IMG") fixImage(root);',
      '    var list = root.querySelectorAll ? root.querySelectorAll("img[src]") : [];',
      '    for (var i = 0; i < list.length; i += 1) fixImage(list[i]);',
      '  }',
      '  if (window.MutationObserver) {',
      '    new MutationObserver(function (records) {',
      '      records.forEach(function (record) {',
      '        for (var i = 0; i < record.addedNodes.length; i += 1) scan(record.addedNodes[i]);',
      '      });',
      '    }).observe(document.documentElement, { childList: true, subtree: true });',
      '  }',
      '})();',
      '</script>',
      ''
    ].join('\n');

    /* 7. tudo entra no fim do <head> (antes de qualquer script do body) */
    if (!/<\/head>/i.test(html)) throw new Error('index.html sem </head>');
    html = html.replace(/<\/head>/i, function () { return extra + boot + '</head>'; });

    /* 8. manifest não existe num arquivo solto */
    html = html.replace(/[ \t]*<link\b[^>]*rel="manifest"[^>]*>\r?\n?/i, '');

    /* 9. imagens com caminho relativo (ícone, mask-icon, <img>) */
    html = html.replace(/(\b(?:src|href)=")(assets\/img\/[^"]+)(")/gi, function (all, open, path, close) {
      const uri = images[clean(path)];
      return uri ? open + uri + close : all;
    });

    /* 9b. download "como veio": o href relativo vira data URI, senão o
       link (e o atalho) apontariam para uma pasta que não existe no arquivo */
    Object.keys(raw).forEach(function (path) {
      html = html.split('href="' + path + '"').join('href="' + raw[path] + '"');
    });

    /* 10. carimbo da geração */
    const stamp = '<!-- Gerado pela aba Single do LuminSDK em ' + String(input.when || '') +
      ' · ' + planInfo.css.length + ' folhas · ' + planInfo.eagerJs.concat(planInfo.routeJs).length +
      ' scripts · site completo (todas as abas). Não edite à mão. -->\n';
    html = html.replace(/^(<!DOCTYPE html>)/i, function (first) { return first + '\n' + stamp; });

    return {
      html: html,
      plan: planInfo,
      bytes: new Blob([html]).size
    };
  }

  /* ---------- coleta tudo o que o plano pede ---------- */
  async function collect(report, includeImages) {
    report(4, 'Lendo o index.html…');
    const html = await fetchText('index.html');

    const routes = (window.LuminApp && typeof window.LuminApp.routes === 'function')
      ? window.LuminApp.routes()
      : {};
    const planInfo = plan(html, routes);
    const files = planInfo.files;

    report(10, 'Lendo ' + files.length + ' folhas e scripts…');
    const texts = await pool(files, fetchText, function (done, total) {
      report(10 + Math.round((done / total) * 45), 'Lendo ' + done + ' de ' + total + ' arquivos…');
    });

    const css = {};
    const js = {};
    files.forEach(function (path, i) {
      if (planInfo.css.indexOf(path) >= 0) css[path] = texts[i];
      else js[path] = texts[i];
    });

    report(58, 'Lendo os dados (sites e GN-Math)…');
    const dataTexts = await pool(DATA_FILES, fetchText);
    const data = {};
    DATA_FILES.forEach(function (path, i) {
      try { data[path] = JSON.parse(dataTexts[i]); } catch (error) { /* dado inválido: fica de fora */ }
    });

    /* referências de imagem: HTML, url() do CSS, strings do JS e os JSON */
    const cssFiles = files.filter(function (path) { return css[path] !== undefined; })
      .map(function (path) { return { path: path, text: css[path], css: true }; });
    const jsFiles = files.filter(function (path) { return js[path] !== undefined; })
      .map(function (path) { return { path: path, text: js[path] }; });
    const jsonFiles = Object.keys(data).map(function (key) {
      return { path: key, text: JSON.stringify(data[key]) };
    });

    const everyRef = imageRefs([{ path: 'index.html', text: html }].concat(cssFiles, jsFiles, jsonFiles));
    /* o mapa do runtime cobre só o que o JS/data criam depois do carregamento */
    const dynamicRef = imageRefs(jsFiles.concat(jsonFiles));

    const wanted = includeImages ? everyRef : [];
    const images = {};

    if (wanted.length) {
      const blobs = await pool(wanted, fetchBytes, function (done, total) {
        report(58 + Math.round((done / total) * 36), 'Embutindo ' + done + ' de ' + total + ' imagens…');
      });
      wanted.forEach(function (path, i) {
        images[clean(path)] = 'data:' + mime(path) + ';base64,' + base64(blobs[i]);
      });
    }

    const map = {};
    Object.keys(images).forEach(function (key) {
      if (dynamicRef.indexOf(key) >= 0) map[key] = images[key];
    });

    /* arquivos baixados como vieram: base64 dos bytes originais */
    const raw = {};
    if (RAW_FILES.length) {
      const rawBlobs = await pool(RAW_FILES, fetchBytes);
      RAW_FILES.forEach(function (path, i) {
        raw[clean(path)] = 'data:image/svg+xml;base64,' + base64(rawBlobs[i]);
      });
    }

    report(95, 'Montando o arquivo…');
    return {
      html: html, routes: routes, css: css, js: js,
      data: data, images: images, map: map, raw: raw
    };
  }

  /* ---------- download ---------- */
  function save(text) {
    const blob = new Blob([text], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = FILE;
    link.rel = 'noopener';
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
  }

  /* ---------- interface ---------- */
  function el(id) { return document.getElementById(id); }

  function setStatus(text, kind) {
    const box = el('single-status');
    if (!box) return;
    box.hidden = !text;
    box.className = 'single-status' + (kind ? ' is-' + kind : '');
    box.textContent = text || '';
  }

  function setProgress(percent, label) {
    const wrap = el('single-progress');
    const bar = el('single-bar');
    const text = el('single-text');
    if (!wrap) return;
    wrap.hidden = false;
    const value = Math.max(0, Math.min(100, Math.round(percent || 0)));
    if (bar) bar.style.width = value + '%';
    if (text) text.textContent = (label ? label + ' · ' : '') + value + '%';
  }

  function readPrefs() {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && typeof saved.images === 'boolean') state.prefs.images = saved.images;
      }
    } catch (error) { /* modo privado: segue o padrão */ }
    const box = el('single-images');
    if (box) box.checked = state.prefs.images;
  }

  function writePrefs() {
    try { localStorage.setItem(STORE, JSON.stringify(state.prefs)); } catch (error) { /* ignora */ }
  }

  async function run() {
    if (state.busy) return;
    const button = el('single-go');
    state.busy = true;
    if (button) {
      button.dataset.label = button.innerHTML;
      button.disabled = true;
      button.textContent = 'Montando…';
    }
    setStatus('');
    setProgress(0, 'Começando');

    try {
      const parts = await collect(setProgress, state.prefs.images);
      const finished = build({
        html: parts.html,
        routes: parts.routes,
        css: parts.css,
        js: parts.js,
        data: parts.data,
        images: parts.images,
        map: parts.map,
        raw: parts.raw,
        when: new Date().toLocaleString('pt-BR')
      });

      save(finished.html);

      const scripts = finished.plan.eagerJs.length + finished.plan.routeJs.length;
      const pictures = Object.keys(parts.images).length;
      setProgress(100, 'Pronto');
      setStatus('Arquivo gerado: ' + size(finished.bytes) + ' · ' + scripts + ' scripts · ' +
        finished.plan.css.length + ' folhas · ' + pictures + ' imagens. O download começou — ' +
        'abra o .html com duplo clique.', 'ok');

      const meta = el('single-size');
      if (meta) meta.textContent = FILE + ' · ' + size(finished.bytes);
    } catch (error) {
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      setStatus((offline
        ? 'Você está offline: o arquivo precisa dos arquivos do site para ser montado. '
        : 'Não deu para montar o arquivo (' + (error && error.message ? error.message : 'erro inesperado') + '). ') +
        'Se o site estiver aberto direto do disco (file://), use o endereço publicado ou um servidor local.',
      'error');
      setProgress(0, 'Falhou');
    } finally {
      state.busy = false;
      if (button) {
        button.disabled = false;
        button.innerHTML = button.dataset.label || 'Gerar e baixar o arquivo';
      }
    }
  }

  function init() {
    readPrefs();

    const button = el('single-go');
    if (button) {
      button.addEventListener('click', function (event) {
        event.preventDefault();
        run();
      });
    }

    const imagesBox = el('single-images');
    if (imagesBox) {
      imagesBox.addEventListener('change', function () {
        state.prefs.images = !!imagesBox.checked;
        writePrefs();
      });
    }

    if (window.location.protocol === 'file:') {
      setStatus('Esta página está aberta direto do disco: o navegador bloqueia a leitura dos arquivos do site. ' +
        'Use o endereço publicado (GitHub Pages) para gerar o arquivo único.', 'error');
    }
  }

  /* API e inicialização */
  window.LuminSingle = {
    build: build,
    plan: plan,
    collect: collect,
    run: run,
    state: state
  };

  if (typeof document !== 'undefined' && document.addEventListener) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }
})();
