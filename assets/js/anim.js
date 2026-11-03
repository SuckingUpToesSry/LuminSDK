/* LuminSDK — transições globais configuráveis.
   Shift+D usa o relógio original; Shift+J usa preto → flash → impacto.
   A escolha das configurações vale para a navegação por cliques.
   ?anim=0, preferência local e movimento reduzido são respeitados. */
(function () {
  'use strict';
  if (window.LuminAnim) return;
  const CONFIG = { BLACKOUT: 1000, SHAKE: 480, DURATION: 1540 };
  const KEY = 'luminsdk:impact:v1';
  const STYLE_KEY = 'luminsdk:transition:v1';
  const STYLES = ['classic', 'impact', 'fade', 'slide', 'none'];
  const root = document.documentElement;
  let layer = null;
  let revealTimer = 0;
  let dropTimer = 0;
  let lastRoute = '';
  let lastStyle = 'impact';
  let selected = 'impact';
  let enabled = true;
  try {
    enabled = localStorage.getItem(KEY) !== 'off';
    const stored = localStorage.getItem(STYLE_KEY);
    if (STYLES.includes(stored)) selected = stored;
  } catch (error) {}
  const disabledByUrl = /(?:^|[?&])anim=0(?:&|$)/.test(window.location.search || '');
  function reduced() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function classic() { return window.LuminClassicAnim; }
  function drop() {
    window.clearTimeout(revealTimer);
    window.clearTimeout(dropTimer);
    root.classList.remove('lumin-impact');
    root.classList.remove('lumin-slide');
    if (classic() && typeof classic().hide === 'function') classic().hide();
    if (layer) layer.remove();
    layer = null;
  }
  function announce() {
    try { window.dispatchEvent(new CustomEvent('lumin:transitionchange')); } catch (error) {}
  }
  function play(route, style) {
    drop();
    lastRoute = route || 'lumin';
    lastStyle = STYLES.includes(style) ? style : selected;
    if (!enabled || disabledByUrl || lastStyle === 'none') return false;
    if (lastStyle === 'classic' && !reduced() && classic()) return classic().play(lastRoute);
    const node = document.createElement('div');
    node.id = 'lum-anim';
    node.setAttribute('aria-hidden', 'true');
    if (lastStyle === 'impact') node.className = 'impact-black';
    else node.className = !reduced() && lastStyle === 'slide' ? 'transition-slide' : 'transition-fade';
    (document.body || root).append(node);
    if (typeof node.showPopover === 'function') {
      node.setAttribute('popover', 'manual');
      try { node.showPopover(); } catch (error) {}
    }
    layer = node;
    if (lastStyle !== 'impact') {
      if (lastStyle === 'slide' && !reduced()) root.classList.add('lumin-slide');
      dropTimer = window.setTimeout(drop, reduced() ? 180 : 520);
      return true;
    }
    revealTimer = window.setTimeout(function () {
      if (layer !== node) return;
      if (reduced()) { drop(); return; }
      node.className = 'impact-flash';
      root.classList.add('lumin-impact');
      dropTimer = window.setTimeout(drop, CONFIG.DURATION - CONFIG.BLACKOUT);
    }, CONFIG.BLACKOUT);
    return true;
  }
  window.addEventListener('pagehide', drop);
  window.LuminAnim = {
    config: CONFIG, play: play, hide: drop, refresh: drop,
    styles: function () { return STYLES.slice(); },
    getStyle: function () { return selected; },
    setStyle: function (style) {
      if (!STYLES.includes(style)) return false;
      selected = style;
      try { localStorage.setItem(STYLE_KEY, selected); } catch (error) {}
      drop(); announce(); return true;
    },
    setEnabled: function (on) {
      enabled = !!on;
      try { localStorage.setItem(KEY, enabled ? 'on' : 'off'); } catch (error) {}
      if (!enabled) drop();
      announce();
    },
    state: function () {
      const old = classic() && classic().state();
      return { running: !!layer || !!(old && old.running),
        duration: lastStyle === 'classic' ? 2500 : lastStyle === 'impact' ? CONFIG.DURATION : 520,
        blackout: CONFIG.BLACKOUT, reduced: reduced(), enabled: enabled && !disabledByUrl,
        style: selected, activeStyle: lastStyle, last: lastRoute };
    }
  };
})();
