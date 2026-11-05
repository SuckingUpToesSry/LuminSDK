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

  function prepareHTML(text,source) {
    if (!/^\s*<(?:!doctype\s+html\b|!--|(?:html|head|body|base|meta|style|link|title|script|canvas|div|iframe)\b)/i.test(text)) throw Error('A fonte não retornou um documento HTML de jogo');
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

  function create(title) {
    let win = null;
    try { win = window.open('about:blank', '_blank'); } catch (error) { return null; }
    if (!win || win.closed) return null;

    const name = String(title || 'Jogo');
    let frame;
    let pending;
    let active = null, generation = 0, currentURL = null;
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
        const text = await blob.text();
        if (win.closed || version !== generation) return;
        const html = prepareHTML(text,target.href);
        // srcdoc otherwise inherits the portal origin. Drop allow-same-origin
        // before rendering third-party code so it cannot access the portal,
        // localStorage or remove its own sandbox. Relative assets use <base>.
        frame.setAttribute('sandbox','allow-scripts allow-forms allow-modals allow-pointer-lock allow-downloads allow-popups allow-popups-to-escape-sandbox allow-presentation');
        frame.removeAttribute('src');
        frame.srcdoc = html;
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

  function open(url, title) {
    const tab = create(title);
    if (!tab) return false;
    if (tab.setUrl(url)) return true;
    tab.close();
    return false;
  }

  window.LuminGameTab = { create: create, open: open, isRawHTML: isRawHTML };
})();
