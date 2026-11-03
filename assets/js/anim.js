/* LuminSDK — transições globais configuráveis.
   Minimalista usa espaço-tempo; no Astolfo, Shift+J usa a seleção aplicada.
   A escolha das configurações vale para a navegação por cliques.
   ?anim=0, preferência local e movimento reduzido são respeitados. */
(function () {
  'use strict';
  if (window.LuminAnim) return;
  const CONFIG = { BLACKOUT: 1000, SHAKE: 480, DURATION: 1540 };
  const KEY = 'luminsdk:impact:v1';
  const STYLE_KEY = 'luminsdk:transition:v1';
  const STYLES = ['classic', 'impact', 'cinema', 'prism', 'fade', 'slide', 'none'];
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
  function minimalist() { return root.getAttribute('data-skin') !== 'astolfo'; }
  function resolveStyle(style) {
    const wanted = STYLES.includes(style) ? style : selected;
    return wanted === 'none' ? 'none' : minimalist() ? 'classic' : wanted;
  }
  function preferences() { return window.LuminPersonal ? window.LuminPersonal.get() : { flash: true, shake: 'full' }; }
  function drop() {
    window.clearTimeout(revealTimer);
    window.clearTimeout(dropTimer);
    root.classList.remove('lumin-impact');
    root.classList.remove('lumin-slide');
    root.classList.remove('lumin-impact-soft');
    if (classic() && typeof classic().hide === 'function') classic().hide();
    if (layer) layer.remove();
    layer = null;
  }
  function announce() {
    try { window.dispatchEvent(new CustomEvent('lumin:transitionchange')); } catch (error) {}
  }
  function play(route, style) {
    drop();
    lastRoute = typeof route === 'string' && route ? route : 'lumin';
    lastStyle = resolveStyle(style);
    if (!enabled || disabledByUrl || lastStyle === 'none') return false;
    if (lastStyle === 'classic' && !reduced() && classic()) return classic().play(lastRoute);
    const node = document.createElement('div');
    node.id = 'lum-anim';
    node.setAttribute('aria-hidden', 'true');
    if (lastStyle === 'impact') {
      node.className = 'impact-black';
      /* Elemento real: o coração não depende do pseudo-elemento clássico.
         O CSS só o mostra com Astolfo, durante o segundo de preto. */
      const heart = document.createElement('span');
      heart.className = 'impact-heart';
      heart.textContent = '♡';
      node.append(heart);
    } else if (!reduced() && (lastStyle === 'cinema' || lastStyle === 'prism')) {
      node.className = 'transition-' + lastStyle;
      const caption = document.createElement('span');
      caption.className = 'transition-caption';
      caption.textContent = lastStyle === 'cinema' ? 'NEXT SCENE / ' + lastRoute.toUpperCase() : 'LUMIN / CHROMATIC';
      node.append(caption);
    } else node.className = !reduced() && lastStyle === 'slide' ? 'transition-slide' : 'transition-fade';
    (document.body || root).append(node);
    if (typeof node.showPopover === 'function') {
      node.setAttribute('popover', 'manual');
      try { node.showPopover(); } catch (error) {}
    }
    layer = node;
    if (lastStyle !== 'impact') {
      if (lastStyle === 'slide' && !reduced()) root.classList.add('lumin-slide');
      dropTimer = window.setTimeout(drop, reduced() ? 180 : lastStyle === 'cinema' || lastStyle === 'prism' ? 900 : 520);
      return true;
    }
    revealTimer = window.setTimeout(function () {
      if (layer !== node) return;
      if (reduced()) { drop(); return; }
      const prefs = preferences();
      node.className = prefs.flash === false ? 'impact-reveal' : 'impact-flash';
      if (prefs.shake !== 'off') {
        root.classList.add('lumin-impact');
        if (prefs.shake === 'soft') root.classList.add('lumin-impact-soft');
      }
      dropTimer = window.setTimeout(drop, CONFIG.DURATION - CONFIG.BLACKOUT);
    }, CONFIG.BLACKOUT);
    return true;
  }
  window.addEventListener('pagehide', drop);
  window.LuminAnim = {
    config: CONFIG, play: play, hide: drop, refresh: drop,
    styles: function () { return STYLES.slice(); },
    getStyle: function () { return selected; },
    resolveStyle: resolveStyle,
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
        duration: reduced() ? (lastStyle === 'impact' ? 1000 : 180) : lastStyle === 'classic' ? 2500 : lastStyle === 'impact' ? CONFIG.DURATION : lastStyle === 'cinema' || lastStyle === 'prism' ? 900 : 520,
        blackout: CONFIG.BLACKOUT, reduced: reduced(), enabled: enabled && !disabledByUrl,
        style: selected, effectiveStyle: resolveStyle(), minimalist: minimalist(), activeStyle: lastStyle, last: lastRoute };
    }
  };
})();
