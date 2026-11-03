/* =========================================================
   LuminSDK — jogos em uma nova aba about:blank
   A aba permanece em about:blank; só o iframe recebe a URL do jogo.
   create() reserva a aba durante o clique, antes de resolver URLs do SDK.
   Não redireciona nem fecha o portal original.
   ========================================================= */
(function () {
  'use strict';

  function create(title) {
    let win = null;
    try { win = window.open('about:blank', '_blank'); } catch (error) { return null; }
    if (!win || win.closed) return null;

    const name = String(title || 'Jogo');
    let frame;
    let pending;
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

    return {
      setUrl: function (url) {
        if (win.closed || !url || !String(url).trim()) return false;
        try {
          const target = new URL(String(url), document.baseURI);
          if (target.protocol !== 'https:' && target.protocol !== 'http:') return false;
          frame.src = target.href;
          frame.hidden = false;
          pending.hidden = true;
          return true;
        } catch (error) { return false; }
      },
      close: function () {
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

  window.LuminGameTab = { create: create, open: open };
})();
