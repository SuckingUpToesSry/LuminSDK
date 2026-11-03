/* LuminSDK — transição global: 1 s de preto → flash único → impacto.
   ?anim=0, movimento reduzido ou preferência local desativam flash/tremor. */
(function () {
  'use strict';
  if (window.LuminAnim) return;
  const CONFIG = { BLACKOUT: 1000, SHAKE: 480, DURATION: 1540 };
  const KEY = 'luminsdk:impact:v1';
  const root = document.documentElement;
  let layer = null;
  let revealTimer = 0;
  let dropTimer = 0;
  let lastRoute = '';
  let enabled = true;
  try { enabled = localStorage.getItem(KEY) !== 'off'; } catch (error) {}
  const disabledByUrl = /(?:^|[?&])anim=0(?:&|$)/.test(window.location.search || '');
  function reduced() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function drop() {
    window.clearTimeout(revealTimer);
    window.clearTimeout(dropTimer);
    root.classList.remove('lumin-impact');
    if (layer) layer.remove();
    layer = null;
  }
  function play(route) {
    drop();
    lastRoute = route || 'lumin';
    if (!enabled || disabledByUrl) return false;
    const node = document.createElement('div');
    node.id = 'lum-anim';
    node.className = 'impact-black';
    node.setAttribute('aria-hidden', 'true');
    (document.body || root).append(node);
    /* Popover coloca a transição acima de diálogos, sem capturar foco. */
    if (typeof node.showPopover === 'function') {
      node.setAttribute('popover', 'manual');
      try { node.showPopover(); } catch (error) {}
    }
    layer = node;
    revealTimer = window.setTimeout(function () {
      if (layer !== node) return;
      if (reduced()) {
        drop();
        return;
      }
      node.className = 'impact-flash';
      root.classList.add('lumin-impact');
      dropTimer = window.setTimeout(drop, CONFIG.DURATION - CONFIG.BLACKOUT);
    }, CONFIG.BLACKOUT);
    return true;
  }
  window.addEventListener('pagehide', drop);
  window.LuminAnim = {
    config: CONFIG, play: play, hide: drop, refresh: drop,
    setEnabled: function (on) {
      enabled = !!on;
      try { localStorage.setItem(KEY, enabled ? 'on' : 'off'); } catch (error) {}
      if (!enabled) drop();
    },
    state: function () {
      return { running: !!layer, duration: CONFIG.DURATION, blackout: CONFIG.BLACKOUT,
        reduced: reduced(), enabled: enabled && !disabledByUrl, last: lastRoute };
    }
  };
})();
