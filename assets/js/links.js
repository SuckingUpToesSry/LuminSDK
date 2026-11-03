/* All HTTP(S) destinations activated by the portal UI use an about:blank iframe.
   Internal routes/anchors and explicit file downloads are not website navigation.
   Cross-origin iframe contents and browser context-menu actions cannot be intercepted. */
(function () {
  'use strict';
  if (window.LuminLinks) return;
  function notify() {
    let status = document.getElementById('lumin-link-status');
    if (!status) {
      status = document.createElement('aside'); status.id = 'lumin-link-status'; status.setAttribute('role','status');
      status.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:2147483647;max-width:360px;padding:16px;border:1px solid #777;border-radius:12px;background:#17171d;color:#fff;font:14px/1.5 system-ui';
      const message = document.createElement('p'); message.textContent = 'Não foi possível abrir a aba. Libere pop-ups para este site e tente novamente. Nenhuma página foi redirecionada.';
      const close = document.createElement('button'); close.type = 'button'; close.textContent = 'Entendi'; close.addEventListener('click',() => status.remove());
      status.append(message,close); document.body.append(status);
    }
  }
  function open(raw,title) {
    let url;
    try { url = new URL(raw,document.baseURI); } catch (error) { return false; }
    if (!/^https?:$/.test(url.protocol) || url.username || url.password) return false;
    if (window.LuminGameTab && window.LuminGameTab.open(url.href,title || url.hostname)) return true;
    notify(); return false;
  }
  function activate(event) {
    if (event.type === 'auxclick' && event.button !== 1 || event.type === 'click' && event.button > 0) return;
    const target = event.target && (event.target.closest ? event.target : event.target.parentElement);
    const link = target && target.closest('a[href]');
    if (!link || link.hasAttribute('download') || link.closest('[data-route],[data-mode]')) return;
    const raw = link.getAttribute('href') || '';
    if (!raw || raw.charAt(0) === '#') return;
    let url; try { url = new URL(raw,document.baseURI); } catch (error) { return; }
    if (!/^https?:$/.test(url.protocol)) return;
    const here = new URL(document.baseURI);
    if (url.origin === here.origin && url.pathname === here.pathname && url.search === here.search) return;
    event.preventDefault(); event.stopImmediatePropagation();
    open(url.href,link.getAttribute('aria-label') || link.textContent.trim() || url.hostname);
  }
  document.addEventListener('click',activate,true);
  document.addEventListener('auxclick',activate,true);
  window.LuminLinks = {open};
})();
