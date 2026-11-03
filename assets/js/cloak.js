/* =========================================================
   LuminSDK — abertura em about:blank
   Abre o site num iframe em uma nova aba e troca a aba original
   pelo Google. A aba nova tenta fechar a original após a navegação.

   Limites do navegador: pop-ups podem exigir um clique/tecla e abas
   abertas pela barra de endereço podem recusar window.close(). Nesse
   caso, a aba original permanece no Google. Não há como forçar isso.

   CONFIG: REDIRECT, OPEN_DELAY, CLOSE_PARENT, CLOSE_DELAY e HINT.
   ?cloak=0 desliga a migração para diagnóstico/desenvolvimento.
   ========================================================= */
(function () {
  'use strict';

  const CONFIG = {
    REDIRECT: 'https://www.google.com/',
    OPEN_DELAY: 0,
    CLOSE_PARENT: true,
    CLOSE_DELAY: 1000,
    HINT: 'Abrir site em about:blank'
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

  const EVENTS = ['pointerup', 'click', 'touchend', 'keydown'];
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

  function showHint() {
    if ((child && !child.closed) || tip) return;
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', showHint, { once: true });
      return;
    }
    /* Um botão persistente, não uma dica que some em 12 s. O clique dá
       a ativação de usuário que Safari/Firefox/Chrome podem exigir. */
    tip = document.createElement('button');
    tip.type = 'button';
    tip.id = 'lumin-cloak-open';
    tip.title = 'Se a aba não abrir, permita pop-ups para este site e tente novamente.';
    tip.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);' +
      'z-index:2147483647;padding:12px 18px;min-height:44px;border-radius:12px;' +
      'font:600 14px/1.4 system-ui,sans-serif;color:#e9d5ff;background:#18102c;' +
      'border:1px solid #b69bd2;cursor:pointer;pointer-events:auto;' +
      'width:max-content;max-width:calc(100vw - 32px);text-align:center';
    tip.textContent = CONFIG.HINT;
    tip.addEventListener('click', attempt);
    document.body.append(tip);
  }

  function stopWatching() {
    EVENTS.forEach(function (type) {
      document.removeEventListener(type, attempt, true);
    });
    hideHint();
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
    stopWatching();
    try { win.focus(); } catch (error) { /* foco controlado pelo navegador */ }
    /* Só sai da página depois de montar o iframe com sucesso. */
    window.location.replace(CONFIG.REDIRECT);
    return true;
  }

  function attempt(event) {
    if (spawn()) {
      /* Evita que o mesmo clique siga um link da página original depois
         de a nova aba já ter sido montada e a saída ao Google agendada. */
      if (event && event.cancelable) event.preventDefault();
    } else {
      showHint();
    }
  }

  EVENTS.forEach(function (type) {
    document.addEventListener(type, attempt, true);
  });
  window.setTimeout(attempt, CONFIG.OPEN_DELAY);

  window.LuminCloak = {
    config: CONFIG,
    open: spawn,
    state: function () {
      return { cloaked: !!child && !child.closed, redirect: CONFIG.REDIRECT };
    }
  };
})();
