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

  /* ---------- o HTML do jogo não é reescrito ----------
     Antes, cada jogo passava por cinco cópias na memória: blob, texto,
     texto com a <base> enfiada dentro, atributo srcdoc e, por fim, a árvore
     do DOMParser. Num port de ~50 MB isso somava mais de 500 MB e o
     navegador morria com SBOX_FATAL_MEMORY_EXCEEDED.

     Agora o documento da própria aba leva a <base> e o srcdoc herda a base
     do pai (é assim que a especificação define about:srcdoc). O texto do
     jogo vai para o iframe do jeito que veio: uma cópia, sem DOMParser e
     sem concatenação. */

  function isDocument(text) {
    return /^\s*<(?:!doctype\s+html\b|!--|(?:html|head|body|base|meta|style|link|title|script|canvas|div|iframe)\b)/i.test(text);
  }

  function baseHrefFor(source) {
    const url = new URL(source, document.baseURI);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password) throw Error('Base de recursos inválida');
    url.hash = '';
    url.search = '';
    return url.href;
  }

  function prepareHTML(text, source) {
    if (!isDocument(text)) throw Error('A fonte não retornou um documento HTML de jogo');
    return text;   /* a <base> vive no documento da aba, não aqui */
  }

  /* O jogo usa caminhos relativos (assets, mapas, áudio): a <base> do
     documento desta aba resolve isso para o srcdoc, sem tocar no HTML. */
  function createBase(doc) {
    const base = doc.createElement('base');
    base.setAttribute('target','_self');
    return base;
  }

  /* Teto de segurança: acima disso o navegador morre antes de o jogo abrir.
     Melhor uma mensagem clara do que a aba inteira indo embora. */
  const MAX_GAME_BYTES = 160 * 1024 * 1024;

  function create(title, alternatives) {
    let win = null;
    try { win = window.open('about:blank', '_blank'); } catch (error) { return null; }
    if (!win || win.closed) return null;

    const name = String(title || 'Jogo');
    let frame;
    let pending;
    let active = null, generation = 0, currentURL = null;
    let mirrors = [], serverBar = null, paintServers = function () {};
    let base = null;
    function setBase(href) {
      if (!base) return;
      base.setAttribute('href', baseHrefFor(href));
    }
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
      base = createBase(doc);
      doc.head.append(charset, viewport, referrer, style, base);

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

    /* qual "Servidor N" é este endereço (para a mensagem de erro dizer algo útil) */
    function serverIndex(href) {
      let index = mirrors.indexOf(href);
      if (index < 0) {
        index = mirrors.findIndex(function (item) {
          try { return new URL(item).pathname === new URL(href).pathname; } catch (error) { return false; }
        });
      }
      return index;
    }

    function serverName(href) {
      const index = serverIndex(href);
      return index >= 0 ? 'Servidor ' + (index + 1) : 'esta fonte';
    }

    /* Rede que bloqueia o fetch (filtro de escola, proxy do console) ainda
       deixa o iframe navegar. Este é o plano B: abrir o endereço direto no
       próprio iframe, sem passar pelo CORS. */
    function openDirect(target) {
      generation++;
      if (active) active.abort();
      frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-modals ' +
        'allow-pointer-lock allow-downloads allow-popups allow-popups-to-escape-sandbox allow-presentation');
      frame.removeAttribute('srcdoc');
      frame.removeAttribute('data-source-url');
      frame.src = target.href;
      frame.hidden = false;
      pending.hidden = true;
    }

    async function renderRaw(target,version) {
      const controller = new AbortController(); active = controller;
      /* 25 s era pouco para dezenas de MB num console: dava "tempo esgotado"
         no meio do download. */
      const timer = setTimeout(() => controller.abort(),120000);
      try {
        if (!window.LuminDownload) throw Error('Módulo de leitura do jogo indisponível');
        const nome = serverName(target.href);
        pending.textContent = 'Baixando do ' + nome + '…';
        /* as:'text' — o arquivo já chega como texto, sem o blob intermediário
           (era uma cópia inteira do jogo só para depois chamar .text()) */
        const text = await window.LuminDownload.fetchFile(target.href,{signal:controller.signal,type:'text/html',as:'text',max:MAX_GAME_BYTES,
          onProgress:function (bytes) {
            if (win.closed || version !== generation) return;
            pending.textContent = 'Baixando do ' + nome + '… ' + (bytes / 1048576).toFixed(1).replace('.', ',') + ' MB';
          },
          onAttempt:index => {
            if (!win.closed && version === generation && index) pending.textContent = 'Tentando o arquivo público no GitHub…';
          }});
        if (win.closed || version !== generation) return;
        const html = prepareHTML(text,target.href);
        // srcdoc otherwise inherits the portal origin. Drop allow-same-origin
        // before rendering third-party code so it cannot access the portal,
        // localStorage or remove its own sandbox. Relative assets use <base>.
        frame.setAttribute('sandbox','allow-scripts allow-forms allow-modals allow-pointer-lock allow-downloads allow-popups allow-popups-to-escape-sandbox allow-presentation');
        frame.removeAttribute('src');
        setBase(target.href);
        frame.srcdoc = html;
        frame.hidden = false; pending.hidden = true;
      } catch (error) {
        if (win.closed || version !== generation) return;
        const motivo = controller.signal.aborted ? 'tempo esgotado' : ((error && error.message) || 'falha de rede');
        const nome = serverName(target.href);
        pending.hidden = false;
        pending.textContent = nome + ' não entregou o jogo (' + motivo + ').';

        const acoes = win.document.createElement('div');
        acoes.className = 'lumin-game-actions';
        acoes.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:14px';

        const botao = function (rotulo, acao) {
          const item = win.document.createElement('button');
          item.type = 'button';
          item.textContent = rotulo;
          item.style.cssText = 'appearance:none;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);' +
            'color:#e7e7ea;font:13px system-ui;padding:8px 14px;border-radius:8px;cursor:pointer';
          item.addEventListener('click', acao);
          acoes.append(item);
          return item;
        };

        botao('Tentar de novo', function () { setUrl(target.href); });
        const proximo = mirrors.length ? (serverIndex(target.href) + 1) % mirrors.length : -1;
        if (mirrors.length > 1) botao('Servidor ' + (proximo + 1), function () { setUrl(mirrors[proximo]); });
        botao('Abrir direto da fonte', function () { openDirect(target); });
        pending.append(acoes);
      } finally { clearTimeout(timer); if (active === controller) active = null; }
    }

    function setUrl(url) {
      if (win.closed || !url || !String(url).trim()) return false;
      let target;
      try { target = new URL(String(url),document.baseURI); } catch (error) { return false; }
      if (!/^https?:$/.test(target.protocol) || target.username || target.password) return false;
      currentURL = target.href; generation++;
      frame.setAttribute('data-source-url',target.href);
      /* a URL do SDK pode chegar com outro formato (sem barra, com
         parâmetros): compara pelo caminho do arquivo */
      if (serverBar) paintServers(serverIndex(target.href));
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
