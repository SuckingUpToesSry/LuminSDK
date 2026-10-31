/* =========================================================
   LuminSDK — atalho de disfarce
   Shift+D abre a página de estudos (StudyDesk) em qualquer aba do
   site. De lá, Shift+D, digitar "lumin" ou clicar em "Ryan Smith"
   no rodapé voltam para cá.

   Também existe o botão "Estudos" na barra da esquerda, para quem
   prefere clicar.

   Sem bibliotecas, sem build.
   Autor: Ryan Smith · Licença MIT
   ========================================================= */
(function () {
  'use strict';

  /* descobre o caminho relativo até a pasta study/ conforme a aba atual */
  function studyPath() {
    /* arquivo único não tem a pasta study/ ao lado: usa a versão publicada */
    if (window.__LUMIN_SINGLE__) return 'https://suckinguptoessry.github.io/LuminSDK/study/';
    const path = window.location.pathname;
    const deep = /\/(gn|sites|study)\//.test(path) || /\/single\//.test(path);
    return deep ? '../study/index.html' : 'study/index.html';
  }

  let typed = '';

  document.addEventListener('keydown', function (event) {
    const tag = (event.target && event.target.tagName) || '';
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || (event.target && event.target.isContentEditable);

    if (event.shiftKey && (event.key === 'D' || event.key === 'd') && !typing) {
      event.preventDefault();
      window.location.href = studyPath();
      return;
    }
    if (typing) return;

    /* quem digitar "lumin" na página também cai no disfarce */
    if (/^[a-z]$/i.test(event.key)) {
      typed = (typed + event.key.toLowerCase()).slice(-5);
      if (typed === 'lumin') window.location.href = studyPath();
    }
  });
})();
