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

  /* ---------- port que baixa o jogo em partes: montagem leve ----------
     O Granny 1 (e outros ports Unity WebGL) baixam o .data em dezenas de
     pedaços com Promise.all e seguram TUDO na memória antes de juntar: são
     567 MB em 29 partes, ou seja ~567 MB de buffers + uma cópia inteira em
     Uint8Array + o Blob — mais de 1,2 GB de pico. Foi exatamente aí que a
     aba morreu, aos 540 MB de download.
     A montagem abaixo faz o mesmo arquivo, uma parte por vez, cada uma indo
     direto para um Blob (o Chromium guarda blob grande em disco, não no
     heap). O pico vira o tamanho de UMA parte (~20 MB) em vez do jogo
     inteiro — o download pode terminar mesmo numa janela apertada. */
  function lumLeanMerge(file, start, end, total) {
    var parts = [];
    for (var index = Number(start); index <= Number(end); index++) parts.push(file + '.part' + index);
    var label = document.getElementById('loading-text');
    var blobs = [];
    var loaded = 0;
    return (async function () {
      for (var position = 0; position < parts.length; position++) {
        var response = await fetch(parts[position]);
        if (!response.ok) throw new Error('parte ' + (position + 1) + ' falhou (' + response.status + ')');
        var chunks = [];
        var reader = response.body.getReader();
        for (;;) {
          var step = await reader.read();
          if (step.done) break;
          chunks.push(step.value);
          loaded += step.value.length;
          if (label) label.textContent = 'LOADING... ' + (loaded / 1048576).toFixed(2) + ' MB / ' + total + ' MB';
        }
        blobs.push(new Blob(chunks));
        chunks.length = 0;
      }
      return URL.createObjectURL(new Blob(blobs));
    })();
  }

  const MULTIPART = /mergeFiles\(getParts\("([^"]+)",\s*(\d+),\s*(\d+)\)\s*,\s*"[^"]*"\)/;

  function leanMultipart(text) {
    const match = MULTIPART.exec(text);
    if (!match) return text;
    const total = (/mbTotal\s*=\s*['"]([\d.]+)['"]/.exec(text) || [])[1] || '0';
    const call = '__lumLeanMerge(' + JSON.stringify(match[1]) + ',' + match[2] + ',' + match[3] + ',' + JSON.stringify(total) + ')';
    let html = text.replace(match[0], call);
    const helper = '<script>var __lumLeanMerge=' + lumLeanMerge.toString() + ';<\/script>';
    html = html.replace(/<head[^>]*>/i, function (tag) { return tag + helper; });
    return html;
  }

  /* ---------- aviso antes dos jogos que não cabem ----------
     Alguns ports declaram o tamanho do próprio pacote na tela de LOADING
     (`mbTotal`). O Granny 1 declara 567,86 MB num arquivo NÃO comprimido,
     e o UnityLoader 2019 precisa do pacote inteiro na memória JS (XHR
     arraybuffer) **e** de uma cópia igual dentro do heap do WASM (MEMFS):
     só para montar são ~1,2 GB, antes de o jogo começar. Numa janela de
     ~1 GB ele morre logo depois do download. Melhor avisar antes de gastar
     os 567 MB do que descobrir no fim. */
  const HEAVY_MB = 300;

  function heavyNeeds(text) {
    const declared = /mbTotal\s*=\s*['"]([\d.]+)['"]/.exec(text);
    if (!declared) return null;
    const mb = Number(declared[1]);
    if (!(mb >= HEAVY_MB)) return null;
    const parts = /getParts\("([^"]+)",\s*(\d+),\s*(\d+)\)/.exec(text);
    return {
      mb: mb,
      parts: parts ? Number(parts[3]) - Number(parts[2]) + 1 : 0,
      peakMB: Math.round(mb * 2 + 250)
    };
  }

  function prepareHTML(text, source) {
    if (!isDocument(text)) throw Error('A fonte não retornou um documento HTML de jogo');
    return leanMultipart(text);   /* a <base> vive no documento da aba, não aqui */
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

    /* pinta o jogo no iframe (o caminho feliz) */
    function paint(html,target) {
      // srcdoc otherwise inherits the portal origin. Drop allow-same-origin
      // before rendering third-party code so it cannot access the portal,
      // localStorage or remove its own sandbox. Relative assets use <base>.
      frame.setAttribute('sandbox','allow-scripts allow-forms allow-modals allow-pointer-lock allow-downloads allow-popups allow-popups-to-escape-sandbox allow-presentation');
      frame.removeAttribute('src');
      setBase(target.href);
      frame.srcdoc = html;
      frame.hidden = false; pending.hidden = true;
    }

    function actionBar(container) {
      const bar = win.document.createElement('div');
      bar.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:16px;max-width:520px';
      container.append(bar);
      return function (label, handler) {
        const button = win.document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.style.cssText = 'appearance:none;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);' +
          'color:#e7e7ea;font:13px system-ui;padding:9px 15px;border-radius:8px;cursor:pointer';
        button.addEventListener('click', handler);
        bar.append(button);
        return button;
      };
    }

    /* Aviso honesto antes do download: quanto pesa, quanto precisa e por que
       não cabe — com as duas saídas que existem (insistir ou abrir num PC). */
    function warnHeavy(html,target,heavy) {
      pending.hidden = false;
      pending.textContent = '';
      const box = win.document.createElement('div');
      box.style.cssText = 'max-width:560px;margin:0 auto;line-height:1.55';
      const titulo = win.document.createElement('strong');
      titulo.textContent = 'Este jogo não cabe nesta janela';
      titulo.style.cssText = 'display:block;font-size:17px;margin-bottom:8px;color:#fff';
      const texto = win.document.createElement('p');
      texto.style.cssText = 'margin:0 0 4px;color:#c9c9d4';
      texto.textContent = 'Ele baixa ' + heavy.mb.toFixed(2).replace('.', ',') + ' MB' + (heavy.parts ? ' em ' + heavy.parts + ' partes' : '') +
        ' e só para montar precisa de cerca de ' + heavy.peakMB + ' MB (o pacote inteiro na memória + a cópia do Unity). ' +
        'A janela do Edge no Xbox corta perto de 1 GB — é por isso que ele fecha logo depois de carregar.';
      const dica = win.document.createElement('p');
      dica.style.cssText = 'margin:0;color:#9a9aa8;font-size:13px';
      dica.textContent = 'Trocar de servidor não resolve: o limite é memória, não rede. Num PC ele roda normal.';
      box.append(titulo,texto,dica);
      pending.append(box);

      const add = actionBar(pending);
      add('Abrir num navegador (PC)', function () {
        try { win.open(target.href,'_blank','noopener'); } catch (error) { /* pop-up barrado */ }
      });
      add('Continuar mesmo assim', function () { paint(html,target); });
      if (mirrors.length > 1) {
        const proximo = (serverIndex(target.href) + 1) % mirrors.length;
        add('Servidor ' + (proximo + 1), function () { setUrl(mirrors[proximo]); });
      }
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
        /* let, não const: soltamos a referência logo depois de entregar o texto
           ao iframe — o srcdoc já guarda a cópia que o navegador precisa */
        let html = prepareHTML(text,target.href);
        const heavy = heavyNeeds(text);
        if (heavy) {
          /* o pacote não cabe nesta janela: pergunta antes de baixar 567 MB */
          warnHeavy(html,target,heavy);
          html = null;
          return;
        }
        paint(html,target);
        html = null;
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

  window.LuminGameTab = { create: create, open: open, isRawHTML: isRawHTML, prepareHTML: prepareHTML, heavyNeeds: heavyNeeds };
})();
