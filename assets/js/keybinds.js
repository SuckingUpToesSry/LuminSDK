/* =========================================================
   LuminSDK — atalhos configuráveis  ·  ARQUIVO EDITÁVEL
   Um lugar só para os atalhos globais do site. Cada atalho tem um
   padrão de fábrica e pode ser trocado nas configurações (seção
   "Atalhos"): toque em "Alterar" e pressione a combinação nova.

   API (window.LuminKeys):
   · get(nome)          → combinação atual {key, code, ctrl, alt, shift, meta}
   · match(nome, event) → true se o evento de teclado bate com o atalho
   · set(nome, combo)   → grava uma combinação nova
   · reset(nome)        → volta ao padrão de fábrica
   · label(nome)        → texto humano, ex.: "Ctrl + Alt + Y"
   · names()            → lista dos atalhos existentes

   Observação de teclado: AltGr chega ao navegador como Ctrl+Alt
   (Windows/Linux). Por isso, um atalho com ctrl+alt também aceita a
   tecla AltGr sozinha — igual ao comportamento antigo do site.
   ========================================================= */
(function () {
  'use strict';

  const STORE = 'luminsdk:keys:v1';

  /* padrões de fábrica — os mesmos de sempre */
  const DEFAULTS = {
    astolfo: { key: 'y', code: 'KeyY', ctrl: true, alt: true, shift: false, meta: false },
    shield: { key: 'h', code: 'KeyH', ctrl: true, alt: true, shift: false, meta: false },
    study: { key: 'd', code: 'KeyD', ctrl: false, alt: false, shift: true, meta: false },
    impact: { key: 'j', code: 'KeyJ', ctrl: false, alt: false, shift: true, meta: false },
    download: { key: 'p', code: 'KeyP', ctrl: true, alt: true, shift: false, meta: false }
  };

  const LABELS = {
    astolfo: 'Ligar/desligar o tema Astolfo',
    shield: 'Sair do disfarce (título e ícone reais)',
    study: 'Estudos ⇄ site · animação clássica',
    impact: 'Estudos ⇄ site · transição escolhida',
    download: 'Baixar o HTML pronto (arraste para o navegador)'
  };

  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (error) { saved = {}; }

  function sane(combo, fallback) {
    if (!combo || typeof combo !== 'object' || !combo.key) return fallback;
    return {
      key: String(combo.key).toLowerCase(),
      code: String(combo.code || ''),
      ctrl: !!combo.ctrl,
      alt: !!combo.alt,
      shift: !!combo.shift,
      meta: !!combo.meta
    };
  }

  function get(name) {
    const def = DEFAULTS[name];
    if (!def) return null;
    return sane(saved[name], def);
  }

  function persist() {
    try { localStorage.setItem(STORE, JSON.stringify(saved)); } catch (error) { /* modo anônimo */ }
  }

  function set(name, combo) {
    if (!DEFAULTS[name]) return false;
    const clean = sane(combo, null);
    if (!clean) return false;
    saved[name] = clean;
    persist();
    announce(name);
    return true;
  }

  function reset(name) {
    if (!DEFAULTS[name]) return false;
    delete saved[name];
    persist();
    announce(name);
    return true;
  }

  /* o evento bate com o atalho? (AltGr conta como Ctrl+Alt) */
  function match(name, event) {
    const combo = get(name);
    if (!combo || !event) return false;
    const key = String(event.key || '').toLowerCase();
    const code = event.code || '';
    if (key !== combo.key && (!combo.code || code !== combo.code)) return false;
    const altGraph = typeof event.getModifierState === 'function' && event.getModifierState('AltGraph');
    const ctrl = !!event.ctrlKey;
    const alt = !!event.altKey;
    if (combo.ctrl && combo.alt) {
      /* aceita Ctrl+Alt de verdade OU a tecla AltGr */
      if (!((ctrl && alt) || altGraph)) return false;
    } else {
      if (ctrl !== combo.ctrl || alt !== combo.alt) return false;
    }
    if (!!event.shiftKey !== combo.shift) return false;
    if (!!event.metaKey !== combo.meta) return false;
    return true;
  }

  function label(name) {
    const combo = get(name);
    if (!combo) return '';
    const parts = [];
    if (combo.ctrl) parts.push('Ctrl');
    if (combo.alt) parts.push('Alt');
    if (combo.shift) parts.push('Shift');
    if (combo.meta) parts.push('Meta');
    let keyName = combo.key.length === 1 ? combo.key.toUpperCase() : combo.key;
    if (keyName === ' ') keyName = 'Espaço';
    parts.push(keyName);
    return parts.join(' + ');
  }

  /* captura a próxima combinação pressionada (para a tela de config) */
  function capture(onDone, onCancel) {
    function finish(event) {
      const key = String(event.key || '');
      if (key === 'Escape') {
        cleanup();
        if (onCancel) onCancel();
        return;
      }
      /* modificador sozinho não é atalho: espera a tecla "de verdade" */
      if (key === 'Control' || key === 'Alt' || key === 'Shift' || key === 'Meta' || key === 'AltGraph') return;
      event.preventDefault();
      event.stopPropagation();
      cleanup();
      const altGraph = typeof event.getModifierState === 'function' && event.getModifierState('AltGraph');
      onDone({
        key: key.toLowerCase(),
        code: event.code || '',
        ctrl: !!event.ctrlKey || altGraph,
        alt: !!event.altKey || altGraph,
        shift: !!event.shiftKey,
        meta: !!event.metaKey
      });
    }
    function cleanup() { document.removeEventListener('keydown', finish, true); }
    document.addEventListener('keydown', finish, true);
    return cleanup;
  }

  /* avisa a página (as etiquetas <kbd> se atualizam sozinhas) */
  function announce(name) {
    try {
      document.dispatchEvent(new CustomEvent('lumin:keychange', { detail: { name: name } }));
    } catch (error) { /* navegador antigo */ }
  }

  function names() { return Object.keys(DEFAULTS); }
  function describe(name) { return LABELS[name] || name; }

  /* ---------- a seção "Atalhos" das configurações ---------- */
  function refreshRows() {
    const rows = document.querySelectorAll('[data-keybind]');
    Array.prototype.forEach.call(rows, function (row) {
      const name = row.getAttribute('data-keybind');
      const kbd = row.querySelector('[data-keybind-label]');
      if (kbd) kbd.textContent = label(name);
    });
    const astolfoNote = document.getElementById('astolfo-shortcut-label');
    if (astolfoNote) astolfoNote.textContent = label('astolfo');
  }

  function initUI() {
    refreshRows();
    document.addEventListener('lumin:keychange', refreshRows);

    document.addEventListener('click', function (event) {
      const btn = event.target && event.target.closest ? event.target.closest('[data-keybind-action]') : null;
      if (!btn) return;
      const row = btn.closest('[data-keybind]');
      if (!row) return;
      const name = row.getAttribute('data-keybind');
      const action = btn.getAttribute('data-keybind-action');

      if (action === 'reset') { reset(name); return; }
      if (action !== 'change') return;

      const old = btn.textContent;
      btn.textContent = 'Pressione as teclas… (Esc cancela)';
      btn.disabled = false;
      btn.classList.add('is-capturing');
      capture(function (combo) {
        set(name, combo);
        btn.textContent = old;
        btn.classList.remove('is-capturing');
      }, function () {
        btn.textContent = old;
        btn.classList.remove('is-capturing');
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initUI);
  else initUI();

  window.LuminKeys = {
    get: get, set: set, reset: reset, match: match,
    label: label, names: names, describe: describe, capture: capture
  };
})();
