/* =========================================================
   LuminSDK — jogos em uma nova aba about:blank
   A aba permanece em about:blank; só o iframe recebe a URL do jogo.
   create() reserva a aba durante o clique, antes de resolver URLs do SDK.
   Não redireciona nem fecha o portal original.
   ========================================================= */
(function () {
  'use strict';

  /* Raw-file CDNs send HTML as text/plain + nosniff. A direct iframe then
     displays source code. Only known public file hosts use this renderer;
     ordinary websites keep their normal navigation/CSP behavior. */
  function isRawHTML(target) {
    if (target.protocol !== 'https:' || !/\.html?$/i.test(target.pathname)) return false;
    return /^(?:cdn|fastly|testingcf)\.jsdelivr\.net$/.test(target.hostname) && /^\/(?:gh|npm)\//.test(target.pathname) ||
      ['raw.githubusercontent.com','raw.githack.com'].includes(target.hostname) ||
      target.hostname === 'cdn.statically.io' && target.pathname.startsWith('/gh/');
  }

  /* Acima disso, o DOMParser monta a árvore inteira na memória e o documento
     grande acaba em SBOX_FATAL_MEMORY_EXCEEDED (portes grandes, como o
     Granny 1). Nesse caso a <base> entra por texto: mesmo resultado, sem a
     cópia da árvore — e é isso que mantém o jogo abaixo de 1 GB. */
  const BIG_DOC = 8 * 1024 * 1024;

  function baseHrefFor(text,source) {
    const found = /<base\b[^>]*\bhref\s*=\s*["']([^"']+)["']/i.exec(text);
    let resolved;
    try { resolved = new URL(found ? found[1] : source,source); } catch (error) { throw Error('Base de recursos inválida'); }
    if (!/^https?:$/.test(resolved.protocol) || resolved.username || resolved.password) throw Error('Base de recursos inválida');
    return resolved.href;
  }

  function prepareHTML(text,source) {
    if (!/^\s*<(?:!doctype\s+html\b|!--|(?:html|head|body|base|meta|style|link|title|script|canvas|div|iframe)\b)/i.test(text)) throw Error('A fonte não retornou um documento HTML de jogo');

    if (text.length > BIG_DOC) {
      const href = baseHrefFor(text,source).replace(/&/g,'&amp;').replace(/"/g,'&quot;');
      const tag = '<base href="'+href+'" target="_self">';
      const head = /<head\b[^>]*>/i.exec(text);
      if (head) {
        const at = head.index + head[0].length;
        return text.slice(0,at) + tag + text.slice(at);
      }
      if (/^\s*<!doctype/i.test(text)) {
        const after = text.indexOf('>') + 1;
        return text.slice(0,after) + tag + text.slice(after);
      }
      return tag + text;
    }

    const parsed = new DOMParser().parseFromString(text,'text/html');
    let base = parsed.querySelector('base[href]');
    const resolved = new URL(base ? base.getAttribute('href') : source,source);
    if (!/^https?:$/.test(resolved.protocol) || resolved.username || resolved.password) throw Error('Base de recursos inválida');
    if (!base) { base = parsed.createElement('base'); parsed.head.prepend(base); }
    base.setAttribute('href',resolved.href);
    base.setAttribute('target','_self');
    // The first base in the head must be the real asset base, including when
    // the source placed it before <head> (as in Assessment Examination).
    parsed.head.prepend(base);
    return '<!doctype html>\n'+parsed.documentElement.outerHTML;
  }

  function create(title, alternatives) {
    let win = null;
    try { win = window.open('about:blank', '_blank'); } catch (error) { return null; }
    if (!win || win.closed) return null;

    const name = String(title || 'Jogo');
    let frame;
    let pending;
    let active = null, generation = 0, currentURL = null;
    let mirrors = [], serverBar = null, paintServers = function () {};
    try {
      const doc = win.document;
      doc.open();
      doc.write('<!doctype html><html lang="pt-BR"><head></head><body></body></html>');
      doc.close();
      doc.title = name;

      const charset = doc.createElement('meta');
      charset.setAttribute('charset', 'utf-8');
      const viewport = doc.createElement('meta');
      viewport.name = 'viewport';
      viewport.content = 'width=device-width,initial-scale=1';
      const referrer = doc.createElement('meta');
      referrer.name = 'referrer';
      referrer.content = 'no-referrer';
      const style = doc.createElement('style');
      style.textContent = 'html,body{height:100%;margin:0;overflow:hidden;background:#07070c;' +
        'color:#e7e7ea;font:15px/1.5 system-ui,sans-serif}' +
        'iframe{position:fixed;inset:0;width:100%;height:100%;border:0;display:block}' +
        'p{position:fixed;inset:0;display:grid;place-items:center;margin:0;padding:24px}' +
        '[hidden]{display:none}';
      doc.head.append(charset, viewport, referrer, style);

      pending = doc.createElement('p');
      pending.textContent = 'Preparando “' + name + '”…';
      pending.setAttribute('role', 'status');
      frame = doc.createElement('iframe');
      frame.id = 'lumin-game-frame';
      frame.title = name;
      frame.hidden = true;
      frame.setAttribute('referrerpolicy', 'no-referrer');
      frame.setAttribute('allowfullscreen', '');
      frame.setAttribute('allow', 'autoplay; fullscreen; pointer-lock; gamepad; clipboard-write; encrypted-media');
      /* Permite o jogo, mas não que ele navegue a aba principal para fora
         de about:blank. Bloqueios X-Frame-Options/CSP continuam valendo. */
      frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-modals ' +
        'allow-pointer-lock allow-downloads allow-popups allow-popups-to-escape-sandbox allow-presentation');
      doc.body.append(pending, frame);

      /* Todos os servidores (espelhos) daquele jogo, à mão: o primeiro entra
         sozinho; se um não responder, dá para trocar sem sair do jogo. */
      mirrors = Array.isArray(alternatives)
        ? alternatives.filter(function (item) { return typeof item === 'string' && item; })
        : [];
      if (mirrors.length > 1) {
        serverBar = doc.createElement('div');
        serverBar.id = 'lumin-game-servers';
        serverBar.setAttribute('role', 'group');
        serverBar.setAttribute('aria-label', 'Servidores do jogo');
        serverBar.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:9;display:flex;gap:6px;' +
          'padding:6px;border-radius:10px;background:rgba(8,8,12,.86);border:1px solid rgba(255,255,255,.14);' +
          'backdrop-filter:blur(8px);font:12px/1 system-ui,sans-serif';
        paintServers = function (index) {
          Array.prototype.forEach.call(serverBar.children, function (button, i) {
            const on = i === index;
            button.style.background = on ? 'rgba(255,255,255,.92)' : 'transparent';
            button.style.color = on ? '#0a0a0b' : '#d8d8dd';
            button.style.borderColor = on ? 'rgba(255,255,255,.92)' : 'rgba(255,255,255,.16)';
            button.setAttribute('aria-pressed', on ? 'true' : 'false');
          });
        };
        mirrors.forEach(function (url, index) {
          const button = doc.createElement('button');
          button.type = 'button';
          button.textContent = 'Servidor ' + (index + 1);
          button.title = url;
          button.style.cssText = 'appearance:none;border:1px solid rgba(255,255,255,.16);background:transparent;' +
            'color:#d8d8dd;font:inherit;padding:6px 10px;border-radius:7px;cursor:pointer';
          button.addEventListener('click', function () { setUrl(url); paintServers(index); });
          serverBar.append(button);
        });
        doc.body.append(serverBar);
      }

      frame.addEventListener('load', function () {
        if (frame.hidden) return;
        try { frame.focus(); } catch (error) { /* foco controlado pelo navegador */ }
      });
      win.opener = null;
    } catch (error) {
      try { win.close(); } catch (closeError) { /* best-effort */ }
      return null;
    }

    async function renderRaw(target,version) {
      const controller = new AbortController(); active = controller;
      const timer = setTimeout(() => controller.abort(),25000);
      try {
        if (!window.LuminDownload) throw Error('Módulo de leitura do jogo indisponível');
        const blob = await window.LuminDownload.fetchFile(target.href,{signal:controller.signal,type:'text/html',onAttempt:index => {
          if (!win.closed && version === generation && index) pending.textContent = 'Tentando o arquivo público no GitHub…';
        }});
        let text = await blob.text();
        if (win.closed || version !== generation) return;
        let html = prepareHTML(text,target.href);
        text = null;   /* o documento já está no html: solta a segunda cópia */
        // srcdoc otherwise inherits the portal origin. Drop allow-same-origin
        // before rendering third-party code so it cannot access the portal,
        // localStorage or remove its own sandbox. Relative assets use <base>.
        frame.setAttribute('sandbox','allow-scripts allow-forms allow-modals allow-pointer-lock allow-downloads allow-popups allow-popups-to-escape-sandbox allow-presentation');
        frame.removeAttribute('src');
        frame.srcdoc = html;
        html = null;
        frame.hidden = false; pending.hidden = true;
      } catch (error) {
        if (win.closed || version !== generation) return;
        pending.hidden = false;
        pending.textContent = 'Não foi possível preparar o jogo: ' + (controller.signal.aborted ? 'tempo esgotado' : error.message) + '. Verifique a conexão e tente novamente. Recursos externos e limitações do jogo ainda podem impedir a execução. ';
        const retry = win.document.createElement('button'); retry.type = 'button'; retry.textContent = 'Tentar novamente';
        retry.addEventListener('click',() => setUrl(currentURL)); pending.append(retry);
      } finally { clearTimeout(timer); if (active === controller) active = null; }
    }

    function setUrl(url) {
      if (win.closed || !url || !String(url).trim()) return false;
      let target;
      try { target = new URL(String(url),document.baseURI); } catch (error) { return false; }
      if (!/^https?:$/.test(target.protocol) || target.username || target.password) return false;
      currentURL = target.href; generation++;
      frame.setAttribute('data-source-url',target.href);
      if (serverBar) {
        let index = mirrors.indexOf(target.href);
        if (index < 0) {
          /* a URL do SDK pode chegar com outro formato (sem barra, com
             parâmetros): compara pelo caminho do arquivo */
          index = mirrors.findIndex(function (item) {
            try { return new URL(item).pathname === target.pathname; } catch (error) { return false; }
          });
        }
        paintServers(index);
      }
      if (active) active.abort();
      if (frame.removeAttribute) frame.removeAttribute('srcdoc');
      if (isRawHTML(target)) {
        frame.src = 'about:blank'; frame.hidden = true; pending.hidden = false;
        pending.textContent = 'Preparando o HTML de “' + name + '”…';
        renderRaw(target,generation);
      } else {
        frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-modals allow-pointer-lock allow-downloads allow-popups allow-popups-to-escape-sandbox allow-presentation');
        frame.src = target.href; frame.hidden = false; pending.hidden = true;
      }
      return true;
    }
    if (win.addEventListener) win.addEventListener('pagehide',() => { generation++; if (active) active.abort(); });
    return {
      setUrl:setUrl,
      close:function () {
        generation++; if (active) active.abort();
        try { win.close(); } catch (error) { /* best-effort */ }
      }
    };
  }

  function open(url, title, alternatives) {
    const tab = create(title, alternatives);
    if (!tab) return false;
    if (tab.setUrl(url)) return true;
    tab.close();
    return false;
  }

  window.LuminGameTab = { create: create, open: open, isRawHTML: isRawHTML, prepareHTML: prepareHTML };
})();
