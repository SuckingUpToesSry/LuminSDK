/* =========================================================
   LuminSDK — imagem de fundo personalizada  ·  ARQUIVO EDITÁVEL
   Seção "Imagem de fundo" das configurações: cole o endereço de uma
   imagem e ela vira o papel de parede do site inteiro, com controle
   de opacidade. Fica salvo no navegador e sobrevive ao recarregar.

   Como ela é pintada (lição aprendida com o tema Astolfo): o fundo
   opaco do body cobre qualquer camada fixa de z-index negativo quando
   o html também tem fundo. Então, com imagem ligada, a cor-base vai
   para o html, o body fica transparente e a imagem vive numa <div>
   fixa de z-index -1 — acima até do papel de parede do Astolfo (-2):
   a sua imagem vence quando as duas estão ligadas.

   API (window.LuminBg): set(url, opacity), setOpacity(x), clear(), get()
   ========================================================= */
(function () {
  'use strict';

  const STORE = 'luminsdk:bgimage:v1';
  const MIN = 0.05;
  const MAX = 1;

  let state = { url: '', opacity: 0.35 };
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (raw && typeof raw === 'object') {
      state.url = typeof raw.url === 'string' ? raw.url : '';
      const op = Number(raw.opacity);
      if (op >= MIN && op <= MAX) state.opacity = op;
    }
  } catch (error) { /* primeiro uso */ }

  let layer = null;

  function ensureLayer() {
    if (layer && layer.isConnected) return layer;
    layer = document.getElementById('user-bg');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'user-bg';
      layer.setAttribute('aria-hidden', 'true');
      document.body.prepend(layer);
    }
    return layer;
  }

  function apply() {
    const el = ensureLayer();
    const on = !!state.url;
    if (on) document.documentElement.setAttribute('data-userbg', '1');
    else document.documentElement.removeAttribute('data-userbg');
    if (!on) {
      el.style.backgroundImage = '';
      el.style.opacity = '';
      return;
    }
    el.style.backgroundImage = 'url("' + String(state.url).replace(/"/g, '%22') + '")';
    el.style.opacity = String(state.opacity);
  }

  function persist() {
    try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (error) { /* anônimo */ }
  }

  function setOpacity(value, quiet) {
    const op = Math.min(MAX, Math.max(MIN, Number(value)));
    if (!isNaN(op)) state.opacity = op;
    if (!quiet) { persist(); apply(); syncUI(); }
  }

  function set(url, opacity) {
    state.url = String(url || '').trim();
    if (opacity !== undefined) setOpacity(opacity, true);
    persist();
    apply();
    syncUI();
  }

  function clear() {
    state.url = '';
    persist();
    apply();
    syncUI();
  }

  function get() { return { url: state.url, opacity: state.opacity }; }

  /* ---------- a seção das configurações ---------- */
  function syncUI() {
    const input = document.getElementById('bg-url');
    const range = document.getElementById('bg-opacity');
    const out = document.getElementById('bg-opacity-value');
    const note = document.getElementById('bg-note');
    if (input && document.activeElement !== input) input.value = state.url;
    if (range) range.value = String(Math.round(state.opacity * 100));
    if (out) out.textContent = Math.round(state.opacity * 100) + '%';
    if (note) {
      note.textContent = state.url
        ? 'Imagem ligada — ela fica atrás de todas as abas. A barra controla a opacidade.'
        : 'Nenhuma imagem definida. Cole o endereço de uma imagem (jpg, png, webp…) e toque em Aplicar.';
    }
  }

  function initUI() {
    apply();
    syncUI();

    document.addEventListener('click', function (event) {
      const btn = event.target && event.target.closest ? event.target.closest('[data-bgimage]') : null;
      if (!btn) return;
      const what = btn.getAttribute('data-bgimage');
      if (what === 'apply') {
        const input = document.getElementById('bg-url');
        set(input ? input.value : '');
      } else if (what === 'clear') {
        clear();
      }
    });

    document.addEventListener('input', function (event) {
      const t = event.target;
      if (!t || t.id !== 'bg-opacity') return;
      setOpacity(Number(t.value) / 100);
    });

    /* Enter no campo do endereço aplica na hora */
    document.addEventListener('keydown', function (event) {
      const t = event.target;
      if (!t || t.id !== 'bg-url' || event.key !== 'Enter') return;
      event.preventDefault();
      set(t.value);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initUI);
  else initUI();

  window.LuminBg = { set: set, setOpacity: setOpacity, clear: clear, get: get };
})();
