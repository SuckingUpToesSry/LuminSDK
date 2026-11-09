/* =========================================================
   LuminSDK — abertura em about:blank (manual)
   Nada abre sozinho: um botão no canto inferior direito, visível por
   5 segundos, oferece "Abrir em About:Blank". Se você tocar nele, o site
   abre num iframe em uma aba nova e a aba original vai para o Google
   (a aba nova tenta fechar a original depois).

   Limites do navegador: pop-ups podem exigir um clique/tecla e abas
   abertas pela barra de endereço podem recusar window.close(). Nesse
   caso, a aba original permanece no Google. Não há como forçar isso.

   CONFIG: REDIRECT, BUTTON_MS, CLOSE_PARENT, CLOSE_DELAY e HINT.
   ?cloak=0 desliga a migração para diagnóstico/desenvolvimento.
   ========================================================= */
(function () {
  'use strict';

  const CONFIG = {
    REDIRECT: 'https://www.google.com/',
    /* quanto tempo o botão branco fica na tela antes de sumir (5 s) */
    BUTTON_MS: 5000,
    CLOSE_PARENT: true,
    CLOSE_DELAY: 1000,
    HINT: 'Abrir em About:Blank'
  };

  const NAME = 'luminsdk-cloak';
  const HERE = window.location.href;
  const TITLE = document.title || 'LuminSDK';

  /* O iframe não pode abrir outra aba; a versão única não deve migrar. */
  if (window.self !== window.top) return;
  /* window.name pode sobreviver ao voltar de uma aba antiga. Só estar em
     um iframe impede a migração; um nome antigo não deve desativá-la. */
  if (window.__LUMIN_SINGLE__) return;
  if (/(?:^|[?&])cloak=0(?:&|$)/.test(window.location.search || '')) return;

  let child = null;
  let tip = null;
  let opening = false;

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function shellHtml() {
    /* O timer vive na aba nova: timers da original morrem ao ir ao Google.
       O fechamento é best-effort, sem manipular o histórico para forçá-lo. */
    const script = '(function(){' +
      'var f=document.getElementById("luminsdk-surface");' +
      'function title(){try{var d=f.contentDocument;' +
      'if(d&&d.title)document.title=d.title;}catch(e){}}' +
      'f.addEventListener("load",title);setInterval(title,1200);' +
      'var original=window.opener;' +
      (CONFIG.CLOSE_PARENT
        ? 'setTimeout(function(){try{if(original&&!original.closed)original.close();}' +
          'catch(e){}finally{window.opener=null;}},' + CONFIG.CLOSE_DELAY + ');'
        : 'window.opener=null;') +
      '})();';

    return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<meta name="referrer" content="no-referrer">' +
      '<title>' + escapeHtml(TITLE) + '</title>' +
      '<style>html,body{height:100%;margin:0;overflow:hidden;background:#07070c}' +
      'iframe{position:fixed;inset:0;width:100%;height:100%;border:0;display:block}' +
      '</style></head><body>' +
      '<iframe id="luminsdk-surface" src="' + escapeHtml(HERE) + '"' +
      ' title="' + escapeHtml(TITLE) + '" referrerpolicy="no-referrer" allowfullscreen' +
      ' allow="autoplay; fullscreen; gamepad; clipboard-write; clipboard-read;' +
      ' encrypted-media; pointer-lock; midi; accelerometer; gyroscope"></iframe>' +
      '<script>' + script + '<' + '/script></body></html>';
  }

  function hideHint() {
    if (tip) tip.remove();
    tip = null;
  }

  const STYLE_ID = 'lumin-cloak-style';

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = '#lumin-cloak-open{position:fixed;right:18px;bottom:18px;z-index:2147483647;' +
      'padding:11px 16px;min-height:44px;border-radius:12px;font:600 13px/1.3 system-ui,sans-serif;' +
      'color:#172235;background:#fff;border:1px solid #e0e7f0;' +
      'box-shadow:0 10px 30px rgba(19,34,58,.16);cursor:pointer;pointer-events:auto;' +
      'max-width:calc(100vw - 36px);text-align:center;' +
      'transition:opacity .3s ease,transform .3s ease,background .18s ease}' +
      '#lumin-cloak-open:hover{background:#f7f9fc}' +
      '#lumin-cloak-open:focus-visible{outline:2px solid #557fc9;outline-offset:2px}' +
      '#lumin-cloak-open.is-out{opacity:0;transform:translateY(8px)}' +
      '@media (prefers-reduced-motion:reduce){#lumin-cloak-open{transition:opacity .01s linear}}';
    (document.head || document.documentElement).append(style);
  }

  let countdown = 0;

  function hideHint() {
    clearTimeout(countdown);
    if (tip) { tip.remove(); tip = null; }
  }

  function dismiss() {
    if (!tip) return;
    tip.classList.add('is-out');
    window.setTimeout(function () { hideHint(); }, 320);
  }

  /* Um botão branco, não um pop-up automático: nada de o site pular sozinho
     para uma aba em branco. Ele aparece no canto inferior direito e some
     depois de 5 segundos (com a transição de saída). */
  function showHint() {
    if ((child && !child.closed) || tip) return;
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', showHint, { once: true });
      return;
    }
    ensureStyle();
    tip = document.createElement('button');
    tip.type = 'button';
    tip.id = 'lumin-cloak-open';
    tip.title = 'Abre o site numa aba em branco, com a aba original indo para o Google. Some em 5 segundos.';
    tip.textContent = CONFIG.HINT;
    tip.addEventListener('click', attempt);
    document.body.append(tip);
    countdown = window.setTimeout(dismiss, CONFIG.BUTTON_MS);
  }

  function spawn() {
    if (child && !child.closed) return true;
    if (child && child.closed) child = null;
    if (opening) return false;
    opening = true;
    let win = null;
    try {
      /* _blank cria uma aba nova, sem sobrescrever outra sessão do portal. */
      win = window.open('about:blank', '_blank');
      if (!win || win.closed) return false;
      win.name = NAME;
      win.document.open();
      win.document.write(shellHtml());
      win.document.close();
    } catch (error) {
      try { if (win) win.close(); } catch (closeError) { /* best-effort */ }
      return false;
    } finally {
      opening = false;
    }

    child = win;
    hideHint();
    try { win.focus(); } catch (error) { /* foco controlado pelo navegador */ }
    /* Só sai da página depois de montar o iframe com sucesso. */
    window.location.replace(CONFIG.REDIRECT);
    return true;
  }

  function attempt(event) {
    if (event && event.cancelable) event.preventDefault();
    if (!spawn()) {
      /* pop-up barrado: o botão continua ali e explica o que fazer */
      if (tip) {
        tip.textContent = 'Pop-up barrado — permita pop-ups e toque de novo';
        tip.title = 'O navegador recusou a aba nova. Libere pop-ups para este site e toque de novo.';
      } else {
        showHint();
      }
    }
  }

  /* nenhum ouvinte global de gesto: o site não sai mais sozinho da aba.
     O botão branco aparece uma vez, por 5 segundos. */
  showHint();

  window.LuminCloak = {
    config: CONFIG,
    open: function () { showHint(); return spawn(); },
    show: showHint,
    hide: hideHint,
    state: function () {
      return { cloaked: !!child && !child.closed, redirect: CONFIG.REDIRECT };
    }
  };
})();
