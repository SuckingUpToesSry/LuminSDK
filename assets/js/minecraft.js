/* =========================================================
   Minecraft — lançador do Mineral

   O jogo NÃO é baixado nem embutido: ele roda no servidor do
   Mantle, numa aba do próprio navegador. Esta aba é só a
   porta de entrada — leve de propósito, porque o alvo é o
   Edge do Xbox Series S (menos de 1 GB por aba).

   A troca de endereço, quando existir um link direto do
   Mineral, é o `GAME` logo abaixo: nada mais depende dele.

   Autor: Ryan Smith · Licença MIT
   ========================================================= */
(function () {
  'use strict';
  if (window.LuminMinecraft) return;

  /* menu do Mantle — o Mineral é a opção que interessa aqui */
  const GAME = 'https://mantle-menu.mantleunblocked.workers.dev/';
  const STORE = 'luminsdk:v1:minecraft';
  const LIMIT_MB = 1024;   /* teto de memória por aba no Edge do Series S */
  const TICK_MS = 2000;

  let timer = 0;

  /* ---------- memória da aba ------------------------------------------
     `performance.memory` é do Chromium (Edge inclusive) e conta só o
     heap do JavaScript desta página — não o do jogo, que roda na aba
     dele. O número serve para provar que ESTA aba é barata, não para
     medir o jogo. */
  function heapMB() {
    const info = window.performance && window.performance.memory;
    if (!info || !info.usedJSHeapSize) return null;
    return Math.round(info.usedJSHeapSize / 1048576);
  }

  function paintMemory() {
    const value = document.getElementById('mc-mem');
    const bar = document.getElementById('mc-mem-bar');
    const note = document.getElementById('mc-mem-note');
    if (!value || !bar) return;

    const used = heapMB();
    if (used === null) {
      value.textContent = '—';
      if (note) note.textContent = 'este navegador não informa a memória da aba; o teto do Edge no Series S é ~1 GB por aba.';
      return;
    }

    value.innerHTML = '';
    value.append(String(used));
    const small = document.createElement('small');
    small.textContent = ' MB de ' + LIMIT_MB + ' MB';
    value.append(small);

    const pct = Math.max(2, Math.min(100, (used / LIMIT_MB) * 100));
    bar.style.width = pct.toFixed(1) + '%';
    if (note) {
      note.textContent = used > LIMIT_MB * 0.75
        ? 'esta aba já passou de três quartos do teto — feche as outras antes de jogar.'
        : 'conta o JavaScript desta página, não o jogo: o jogo tem a memória da aba dele.';
    }
  }

  function watchMemory() {
    if (timer) return;
    paintMemory();
    timer = window.setInterval(paintMemory, TICK_MS);
  }

  function stopMemory() {
    if (!timer) return;
    window.clearInterval(timer);
    timer = 0;
  }

  /* ---------- última partida ---------- */
  function readStore() {
    try {
      const raw = window.localStorage.getItem(STORE);
      const data = raw ? JSON.parse(raw) : null;
      return data && typeof data === 'object' ? data : {};
    } catch (error) { return {}; }
  }

  function writeStore(data) {
    try { window.localStorage.setItem(STORE, JSON.stringify(data)); } catch (error) { /* modo privado */ }
  }

  function paintLast() {
    const el = document.getElementById('mc-last');
    if (!el) return;
    const stamp = Number(readStore().last) || 0;
    if (!stamp) { el.hidden = true; return; }
    let when = '';
    try {
      when = new Date(stamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch (error) { when = ''; }
    el.textContent = when ? 'Última vez que você entrou: ' + when : '';
    el.hidden = !when;
  }

  /* ---------- abrir o jogo ---------- */
  function say(message) {
    const el = document.getElementById('mc-note');
    if (!el) return;
    if (!message) { el.hidden = true; el.textContent = ''; return; }
    el.textContent = message;
    el.hidden = false;
  }

  /* Abre uma aba de verdade e manda ela para o jogo.

     about:blank primeiro, porque assim dá para saber se o navegador
     bloqueou o pop-up; depois `opener = null`, para o jogo não ficar
     preso a esta página nem herdar a navegação daqui. O jogo roda
     sozinho na aba dele — o about:blank que ele abrir por conta própria
     também vira aba normal do navegador. */
  function launch() {
    let win = null;
    try { win = window.open('about:blank', '_blank'); } catch (error) { win = null; }
    if (!win) {
      say('O navegador bloqueou a aba. Libere pop-ups para este site (no Edge do Xbox: Configurações → Privacidade) e toque de novo.');
      return false;
    }
    try { win.opener = null; } catch (error) { /* já navegou */ }
    try { win.location.replace(GAME); } catch (error) {
      try { win.location.href = GAME; } catch (other) { /* aba fechada na hora */ }
    }
    say('');
    const data = readStore();
    data.last = Date.now();
    writeStore(data);
    paintLast();
    return true;
  }

  function init() {
    const button = document.getElementById('mc-go');
    if (button) {
      button.addEventListener('click', function (event) {
        event.preventDefault();
        launch();
      });
    }

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter' || !document.documentElement.hasAttribute('data-view')) return;
      if (document.documentElement.getAttribute('data-view') !== 'minecraft') return;
      const target = event.target;
      if (target && target.closest && target.closest('input,textarea,select')) return;
      if (target === button) return;
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      event.preventDefault();
      launch();
    });

    paintLast();

    window.addEventListener('lumin:view', function (event) {
      const route = event && event.detail && event.detail.route;
      if (route === 'minecraft') { paintLast(); watchMemory(); }
      else stopMemory();
    });

    if (document.documentElement.getAttribute('data-view') === 'minecraft') watchMemory();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  window.LuminMinecraft = {
    url: GAME,
    limit: LIMIT_MB,
    launch: launch,
    heapMB: heapMB
  };
})();
