/* LuminSDK — tema Catboy, opcional e reversível. */
(function () {
  'use strict';
  if (window.LuminCatboy) return;

  const STORE = 'luminsdk:catboy';
  const COLOR_STORE = 'luminsdk-color-v3';
  const CATBOY_COLOR = '#62d9ff';
  const root = document.documentElement;
  let enabled = false;
  let previousPalette = '';

  function read() {
    try { return localStorage.getItem(STORE) === 'on'; } catch (error) { return false; }
  }

  function save(on) {
    try { localStorage.setItem(STORE, on ? 'on' : 'off'); } catch (error) { /* só nesta sessão */ }
  }

  function readPalette() {
    try { return localStorage.getItem(COLOR_STORE) || '#8b5cf6'; } catch (error) { return '#8b5cf6'; }
  }

  function setPalette(hex) {
    if (window.LuminPalette && typeof window.LuminPalette.apply === 'function') {
      window.LuminPalette.apply(hex, { persist: false });
    }
  }

  function render() {
    const button = document.getElementById('catboy-toggle');
    const state = document.getElementById('catboy-state');
    const shortcut = document.getElementById('catboy-shortcut-label');
    const card = document.getElementById('catboy-card');
    if (card) card.classList.toggle('is-on', enabled);
    if (button) {
      button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      button.textContent = enabled ? 'Desativar tema' : 'Ativar tema';
    }
    if (state) state.textContent = enabled ? 'Ligado' : 'Desligado';
    if (shortcut && window.LuminKeys) shortcut.textContent = window.LuminKeys.label('catboy');
  }

  function notify(text) {
    const api = window.LuminLibrary;
    if (api && typeof api.toast === 'function') api.toast(text);
  }

  function set(on, options) {
    const opts = options || {};
    const next = !!on;
    if (next === enabled) { render(); return enabled; }

    if (next && window.LuminAstolfo && window.LuminAstolfo.state && window.LuminAstolfo.state().on) {
      window.LuminAstolfo.off();
    }

    if (next) previousPalette = (window.LuminPalette && window.LuminPalette.current && window.LuminPalette.current()) || readPalette();
    enabled = next;
    if (enabled) root.setAttribute('data-skin', 'catboy');
    else if (root.getAttribute('data-skin') === 'catboy') root.removeAttribute('data-skin');
    if (document.body) document.body.classList.toggle('is-catboy', enabled);
    save(enabled);
    setPalette(enabled ? CATBOY_COLOR : (previousPalette || readPalette()));
    render();

    if (window.LuminAtmosphere && typeof window.LuminAtmosphere.recolor === 'function') {
      window.LuminAtmosphere.recolor();
    }
    if (window.LuminAnim && typeof window.LuminAnim.refresh === 'function') window.LuminAnim.refresh();

    try { window.dispatchEvent(new CustomEvent('lumin:catboy', { detail: { on: enabled } })); } catch (error) {}
    if (!opts.silent) notify(enabled ? 'Catboy mode ligado · Ctrl + Alt + Shift + K desliga' : 'Catboy mode desligado');
    return enabled;
  }

  function toggle() { return set(!enabled); }

  window.LuminCatboy = {
    on: function () { return set(true); },
    off: function () { return set(false); },
    toggle: toggle,
    state: function () { return { on: enabled, saved: read() }; },
    key: 'Ctrl + Alt + Shift + K'
  };

  window.addEventListener('lumin:astolfo', function (event) {
    if (event && event.detail && event.detail.on && enabled) set(false, { silent: true });
  });
  document.addEventListener('lumin:keychange', function (event) {
    if (!event || !event.detail || event.detail.name === 'catboy') render();
  });
  document.addEventListener('click', function (event) {
    const button = event.target && event.target.closest ? event.target.closest('[data-catboy-toggle]') : null;
    if (button) { event.preventDefault(); toggle(); }
  });
  document.addEventListener('keydown', function (event) {
    if (event.repeat || event.defaultPrevented) return;
    const tag = event.target && event.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (event.target && event.target.isContentEditable)) return;
    if (root.classList.contains('is-playing')) return;
    const matched = window.LuminKeys && window.LuminKeys.match
      ? window.LuminKeys.match('catboy', event)
      : event.ctrlKey && event.altKey && event.shiftKey && !event.metaKey &&
        (event.code === 'KeyK' || String(event.key).toLowerCase() === 'k');
    if (!matched) return;
    event.preventDefault();
    event.stopPropagation();
    toggle();
  }, true);

  const astolfoOn = !!(window.LuminAstolfo && window.LuminAstolfo.state && window.LuminAstolfo.state().on);
  if (read() && !astolfoOn) set(true, { silent: true });
  else {
    if (read() && astolfoOn) save(false);
    render();
  }
})();
