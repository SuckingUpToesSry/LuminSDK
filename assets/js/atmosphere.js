/* =========================================================
   LuminSDK — atmosfera e aparência
   · paleta de cores em tempo real (com persistência)
   · partículas de fundo na cor escolhida
   · fundo que segue o ponteiro (parallax suave)
   · cursor personalizado
   · sliders de colunas e linhas da grade

   Autor: Ryan Smith · Licença MIT
   ========================================================= */
(function () {
  'use strict';

  const THEME_KEY = 'luminsdk-theme';
  const COLOR_KEY = 'luminsdk-color';
  const root = document.documentElement;
  const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const finePointer = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);

  const PRESETS = [
    { name: 'Violeta', hex: '#8b5cf6' },
    { name: 'Índigo', hex: '#6366f1' },
    { name: 'Azul', hex: '#3b82f6' },
    { name: 'Ciano', hex: '#06b6d4' },
    { name: 'Turquesa', hex: '#14b8a6' },
    { name: 'Esmeralda', hex: '#10b981' },
    { name: 'Limão', hex: '#84cc16' },
    { name: 'Âmbar', hex: '#f59e0b' },
    { name: 'Laranja', hex: '#f97316' },
    { name: 'Vermelho', hex: '#ef4444' },
    { name: 'Rosa', hex: '#ec4899' },
    { name: 'Magenta', hex: '#d946ef' }
  ];

  /* ---------- cor: conversões ---------- */
  function hexToRgb(hex) {
    let value = String(hex || '').replace('#', '').trim();
    if (value.length === 3) value = value.split('').map((c) => c + c).join('');
    if (!/^[0-9a-f]{6}$/i.test(value)) return { r: 139, g: 92, b: 246 };
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16)
    };
  }

  function rgbToHex(r, g, b) {
    const to = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
    return '#' + to(r) + to(g) + to(b);
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  function hslToHex(h, s, l) {
    const hh = (((h % 360) + 360) % 360) / 360;
    const ss = Math.max(0, Math.min(100, s)) / 100;
    const ll = Math.max(0, Math.min(100, l)) / 100;

    if (ss === 0) {
      const v = Math.round(ll * 255);
      return rgbToHex(v, v, v);
    }

    const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
    const p = 2 * ll - q;
    const channel = (t) => {
      let tt = t;
      if (tt < 0) tt += 1;
      if (tt > 1) tt -= 1;
      if (tt < 1 / 6) return p + (q - p) * 6 * tt;
      if (tt < 1 / 2) return q;
      if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
      return p;
    };
    return rgbToHex(channel(hh + 1 / 3) * 255, channel(hh) * 255, channel(hh - 1 / 3) * 255);
  }

  /* ---------- aplicação da paleta ---------- */
  const palette = {
    hex: '#8b5cf6',
    rgb: { r: 139, g: 92, b: 246 },
    hsl: { h: 262, s: 90, l: 66 }
  };

  function setToken(name, value) {
    root.style.setProperty(name, value);
  }

  function applyPalette(hex, options) {
    const isLight = root.getAttribute('data-theme') === 'light';
    const base = hexToRgb(hex);
    const hsl = rgbToHsl(base.r, base.g, base.b);

    palette.hex = rgbToHex(base.r, base.g, base.b);
    palette.rgb = base;
    palette.hsl = hsl;

    /* No tema claro o destaque precisa ser mais escuro para manter contraste */
    /* no escuro mantém a cor escolhida (só clareia o mínimo para contraste);
       no claro escurece para o destaque continuar legível */
    const accentL = isLight ? Math.max(30, Math.min(52, hsl.l - 14)) : Math.min(72, Math.max(46, hsl.l));
    const softHue = hsl.h + 18;
    const altHue = hsl.h + 140;
    const popHue = hsl.h + 80;

    const accent = hslToHex(hsl.h, Math.min(92, hsl.s || 80), accentL);
    const accentRgb = hexToRgb(accent);
    const soft = hslToHex(softHue, Math.min(88, (hsl.s || 80) - 4), accentL - 4);
    const softRgb = hexToRgb(soft);
    const alt = hslToHex(altHue, Math.min(88, (hsl.s || 80) + 4), isLight ? accentL - 2 : accentL + 2);
    const altRgb = hexToRgb(alt);
    const pop = hslToHex(popHue, Math.min(88, (hsl.s || 80) + 2), isLight ? accentL - 4 : accentL + 4);
    const popRgb = hexToRgb(pop);
    const strong = hslToHex(hsl.h - 12, Math.min(80, hsl.s || 70), Math.max(28, accentL - 14));

    setToken('--accent', accent);
    setToken('--accent-rgb', accentRgb.r + ', ' + accentRgb.g + ', ' + accentRgb.b);
    setToken('--accent-soft', soft);
    setToken('--accent-soft-rgb', softRgb.r + ', ' + softRgb.g + ', ' + softRgb.b);
    setToken('--accent-alt', alt);
    setToken('--accent-alt-rgb', altRgb.r + ', ' + altRgb.g + ', ' + altRgb.b);
    setToken('--accent-pop', pop);
    setToken('--accent-pop-rgb', popRgb.r + ', ' + popRgb.g + ', ' + popRgb.b);
    setToken('--accent-strong', strong);
    setToken('--glow', 'rgba(' + accentRgb.r + ', ' + accentRgb.g + ', ' + accentRgb.b + ', ' + (isLight ? 0.2 : 0.38) + ')');

    /* mantém os apelidos antigos funcionando */
    setToken('--violet', accent);
    setToken('--indigo', soft);
    setToken('--cyan', alt);
    setToken('--pink', pop);

    if (!options || options.persist !== false) {
      try {
        localStorage.setItem(COLOR_KEY, palette.hex);
      } catch (error) {
        /* sem armazenamento: aplica só nesta sessão */
      }
    }

    if (window.LuminAtmosphere && typeof window.LuminAtmosphere.recolor === 'function') {
      window.LuminAtmosphere.recolor();
    }

    return palette;
  }

  function loadSavedColor() {
    try {
      return localStorage.getItem(COLOR_KEY);
    } catch (error) {
      return null;
    }
  }

  /* ---------- UI da paleta ---------- */
  function initPaletteUI() {
    const toggle = document.getElementById('palette-toggle');
    const panel = document.getElementById('palette-panel');
    const swatches = document.getElementById('palette-swatches');
    const customColor = document.getElementById('palette-color');
    const hue = document.getElementById('palette-hue');
    const reset = document.getElementById('palette-reset');
    const close = document.getElementById('palette-close');

    if (!toggle || !panel || !swatches) return;

    PRESETS.forEach((preset) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'swatch';
      button.dataset.hex = preset.hex;
      button.style.background = 'linear-gradient(135deg, ' + preset.hex + ', ' + hslToHex(rgbToHsl(hexToRgb(preset.hex).r, hexToRgb(preset.hex).g, hexToRgb(preset.hex).b).h + 32, 80, 58) + ')';
      button.style.color = preset.hex;
      button.setAttribute('aria-label', 'Usar a cor ' + preset.name);
      button.setAttribute('aria-pressed', 'false');
      button.title = preset.name;
      button.addEventListener('click', () => {
        applyPalette(preset.hex);
        syncSwatches();
        if (customColor) customColor.value = palette.hex;
        if (hue) hue.value = String(palette.hsl.h);
      });
      swatches.append(button);
    });

    function syncSwatches() {
      swatches.querySelectorAll('.swatch').forEach((swatch) => {
        const active = swatch.dataset.hex.toLowerCase() === palette.hex.toLowerCase();
        swatch.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    }

    function openPanel(open) {
      panel.hidden = !open;
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      const dot = document.getElementById('palette-dot');
      if (dot) dot.style.filter = open ? 'brightness(1.25)' : '';
    }

    toggle.addEventListener('click', () => openPanel(panel.hidden));

    if (close) close.addEventListener('click', () => {
      openPanel(false);
      toggle.focus({ preventScroll: true });
    });

    document.addEventListener('click', (event) => {
      if (panel.hidden) return;
      if (panel.contains(event.target) || toggle.contains(event.target)) return;
      openPanel(false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !panel.hidden) {
        openPanel(false);
        toggle.focus({ preventScroll: true });
      }
    });

    if (customColor) {
      customColor.addEventListener('input', () => {
        applyPalette(customColor.value);
        syncSwatches();
        if (hue) hue.value = String(palette.hsl.h);
      });
    }

    if (hue) {
      hue.addEventListener('input', () => {
        const next = hslToHex(Number(hue.value), 82, 62);
        applyPalette(next);
        syncSwatches();
        if (customColor) customColor.value = palette.hex;
      });
    }

    if (reset) {
      reset.addEventListener('click', () => {
        applyPalette('#8b5cf6');
        syncSwatches();
        if (customColor) customColor.value = '#8b5cf6';
        if (hue) hue.value = '262';
        if (window.LuminLibrary) window.LuminLibrary.toast('Cor padrão restaurada.');
      });
    }

    if (customColor) customColor.value = palette.hex;
    if (hue) hue.value = String(palette.hsl.h);
    syncSwatches();

    /* o index também pode disparar a troca de tema */
    window.addEventListener('lumin:theme', () => {
      applyPalette(palette.hex, { persist: false });
    });
  }

  /* ---------- sliders da grade ---------- */
  function initGridUI() {
    const cols = document.getElementById('grid-cols');
    const rows = document.getElementById('grid-rows');
    const colsValue = document.getElementById('grid-cols-value');
    const rowsValue = document.getElementById('grid-rows-value');
    const reset = document.getElementById('grid-reset');
    const library = window.LuminLibrary;

    if (!cols || !rows || !library || typeof library.getGrid !== 'function') return;

    const limits = typeof library.gridDefaults === 'function'
      ? library.gridDefaults()
      : { minCols: 2, maxCols: 12, minRows: 2, maxRows: 8 };

    cols.min = String(limits.minCols);
    cols.max = String(limits.maxCols);
    rows.min = String(limits.minRows);
    rows.max = String(limits.maxRows);

    let commitTimer = null;

    function paintFill(input) {
      const min = Number(input.min);
      const max = Number(input.max);
      const value = Number(input.value);
      const percent = ((value - min) / Math.max(1, max - min)) * 100;
      input.style.setProperty('--fill', percent.toFixed(1) + '%');
    }

    function syncFromLibrary() {
      const grid = library.getGrid();
      cols.value = String(grid.cols);
      rows.value = String(grid.rows);
      if (colsValue) colsValue.textContent = String(grid.cols);
      if (rowsValue) rowsValue.textContent = String(grid.rows);
      cols.setAttribute('aria-valuetext', grid.cols + ' colunas');
      rows.setAttribute('aria-valuetext', grid.rows + ' linhas');
      paintFill(cols);
      paintFill(rows);
      if (reset) {
        reset.classList.toggle('is-active', grid.auto);
        reset.textContent = grid.auto ? 'Auto' : 'Automático';
        reset.title = grid.auto
          ? 'A grade está no tamanho automático'
          : 'Voltar ao tamanho automático';
      }
    }

    function commit() {
      clearTimeout(commitTimer);
      commitTimer = setTimeout(() => {
        library.setGrid(Number(cols.value), Number(rows.value));
      }, 420);
    }

    function onInput() {
      if (colsValue) colsValue.textContent = cols.value;
      if (rowsValue) rowsValue.textContent = rows.value;
      cols.setAttribute('aria-valuetext', cols.value + ' colunas');
      rows.setAttribute('aria-valuetext', rows.value + ' linhas');
      paintFill(cols);
      paintFill(rows);
      library.previewGrid(Number(cols.value), Number(rows.value));
      commit();
    }

    cols.addEventListener('input', onInput);
    rows.addEventListener('input', onInput);

    if (reset) {
      reset.addEventListener('click', () => {
        library.setGrid(null, null);
        syncFromLibrary();
      });
    }

    window.addEventListener('lumin:grid', syncFromLibrary);
    syncFromLibrary();
  }

  /* ---------- atmosfera: partículas, parallax e cursor ---------- */
  function createAtmosphere() {
    const holder = document.querySelector('.bg-fx');
    if (!holder) return null;

    let canvas = holder.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'bg-fx__canvas';
      canvas.setAttribute('aria-hidden', 'true');
      holder.append(canvas);
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const pointer = { x: 0, y: 0, tx: 0, ty: 0, active: false };
    const blobs = [...holder.querySelectorAll('.bg-fx__blob')];
    let particles = [];
    let width = 0;
    let height = 0;
    let dpr = 1;
    let frame = 0;
    let running = true;

    function accent() {
      const styles = getComputedStyle(root);
      const rgb = styles.getPropertyValue('--accent-rgb').trim();
      const alt = styles.getPropertyValue('--accent-alt-rgb').trim();
      return {
        main: 'rgb(' + (rgb || '139, 92, 246') + ')',
        alt: 'rgb(' + (alt || '34, 211, 238') + ')',
        mainRaw: rgb || '139, 92, 246',
        altRaw: alt || '34, 211, 238'
      };
    }

    function resize() {
      const rect = holder.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      width = Math.max(320, rect.width);
      height = Math.max(320, rect.height);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const target = Math.round((width * height) / 24000);
      const count = Math.max(36, Math.min(120, target));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        r: 0.9 + Math.random() * 1.9,
        alt: Math.random() > 0.72
      }));

      if (reduceMotion) draw();
    }

    function draw() {
      if (!width || !height) return;
      const colors = accent();
      ctx.clearRect(0, 0, width, height);

      /* brilho que acompanha o ponteiro */
      if (pointer.active) {
        const glow = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 260);
        glow.addColorStop(0, 'rgba(' + colors.mainRaw + ', .18)');
        glow.addColorStop(0.55, 'rgba(' + colors.altRaw + ', .07)');
        glow.addColorStop(1, 'rgba(' + colors.mainRaw + ', 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(pointer.x - 260, pointer.y - 260, 520, 520);
      }

      /* pontos */
      particles.forEach((particle) => {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
        ctx.fillStyle = particle.alt ? 'rgba(' + colors.altRaw + ', .75)' : 'rgba(' + colors.mainRaw + ', .8)';
        ctx.fill();
      });

      /* conexões */
      const maxDist = 118;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist > maxDist) continue;
          const alpha = (1 - dist / maxDist) * 0.3;
          ctx.strokeStyle = 'rgba(' + colors.mainRaw + ', ' + alpha.toFixed(3) + ')';
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      /* laços entre o ponteiro e os pontos próximos */
      if (pointer.active) {
        particles.forEach((particle) => {
          const dist = Math.hypot(particle.x - pointer.x, particle.y - pointer.y);
          if (dist > 170) return;
          const alpha = (1 - dist / 170) * 0.5;
          ctx.strokeStyle = 'rgba(' + colors.altRaw + ', ' + alpha.toFixed(3) + ')';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(particle.x, particle.y);
          ctx.lineTo(pointer.x, pointer.y);
          ctx.stroke();
        });
      }
    }

    function step() {
      if (!running) return;

      pointer.x += (pointer.tx - pointer.x) * 0.12;
      pointer.y += (pointer.ty - pointer.y) * 0.12;

      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < -16) particle.x = width + 16;
        if (particle.x > width + 16) particle.x = -16;
        if (particle.y < -16) particle.y = height + 16;
        if (particle.y > height + 16) particle.y = -16;

        /* leve repulsão em volta do cursor */
        if (pointer.active) {
          const dx = particle.x - pointer.x;
          const dy = particle.y - pointer.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 130 && dist > 0.01) {
            const force = (1 - dist / 130) * 0.55;
            particle.x += (dx / dist) * force;
            particle.y += (dy / dist) * force;
          }
        }
      });

      draw();
      frame = requestAnimationFrame(step);
    }

    function parallax() {
      const nx = pointer.active ? (pointer.tx / width - 0.5) : 0;
      const ny = pointer.active ? (pointer.ty / height - 0.5) : 0;

      canvas.style.transform = 'translate3d(' + (nx * -26).toFixed(2) + 'px, ' + (ny * -20).toFixed(2) + 'px, 0)';

      blobs.forEach((blob, index) => {
        const depth = index === 0 ? 44 : -34;
        blob.style.transform =
          'translate3d(' + (nx * depth).toFixed(2) + 'px, ' + (ny * depth * 0.7).toFixed(2) + 'px, 0)';
      });
    }

    window.addEventListener('resize', resize, { passive: true });

    if (finePointer) {
      window.addEventListener('pointermove', (event) => {
        const rect = holder.getBoundingClientRect();
        pointer.tx = event.clientX - rect.left;
        pointer.ty = event.clientY - rect.top;
        pointer.active = true;
      }, { passive: true });

      window.addEventListener('pointerleave', () => {
        pointer.active = false;
        parallax();
      });
    }

    document.addEventListener('visibilitychange', () => {
      running = !document.hidden;
      if (running && !reduceMotion) frame = requestAnimationFrame(step);
      else cancelAnimationFrame(frame);
    });

    resize();
    if (reduceMotion) {
      draw();
    } else {
      frame = requestAnimationFrame(step);
    }

    /* parallax suave sempre que o ponteiro se move */
    let parallaxFrame = 0;
    window.addEventListener('pointermove', () => {
      if (reduceMotion || parallaxFrame) return;
      parallaxFrame = requestAnimationFrame(() => {
        parallax();
        parallaxFrame = 0;
      });
    }, { passive: true });

    return {
      recolor: () => {
        if (reduceMotion) {
          draw();
          return;
        }
        draw();
      }
    };
  }

  /* ---------- cursor personalizado ---------- */
  function initCursor() {
    if (!finePointer) return;

    const dot = document.createElement('div');
    const ring = document.createElement('div');
    dot.className = 'cursor-dot';
    dot.setAttribute('aria-hidden', 'true');
    ring.className = 'cursor-ring';
    ring.setAttribute('aria-hidden', 'true');
    document.body.append(dot, ring);

    root.classList.add('has-custom-cursor');

    const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ringPos = { x: pos.x, y: pos.y };
    let visible = false;

    function move(event) {
      pos.x = event.clientX;
      pos.y = event.clientY;
      if (!visible) {
        visible = true;
        root.classList.add('cursor-active');
        ringPos.x = pos.x;
        ringPos.y = pos.y;
      }
      dot.style.transform = 'translate3d(' + pos.x + 'px, ' + pos.y + 'px, 0)';
    }

    function animate() {
      ringPos.x += (pos.x - ringPos.x) * 0.18;
      ringPos.y += (pos.y - ringPos.y) * 0.18;
      ring.style.transform = 'translate3d(' + ringPos.x + 'px, ' + ringPos.y + 'px, 0)';
      requestAnimationFrame(animate);
    }

    window.addEventListener('pointermove', move, { passive: true });

    window.addEventListener('pointerover', (event) => {
      const target = event.target;
      const interactive = target && target.closest
        ? target.closest('a, button, summary, [role="button"], input, select, .game-card, label')
        : null;
      root.classList.toggle('cursor-hover', !!interactive);
    }, { passive: true });

    window.addEventListener('pointerdown', () => root.classList.add('cursor-pressed'));
    window.addEventListener('pointerup', () => root.classList.remove('cursor-pressed'));

    document.addEventListener('pointerleave', () => {
      root.classList.remove('cursor-active', 'cursor-hover');
      visible = false;
    });

    if (!reduceMotion) requestAnimationFrame(animate);
  }

  /* ---------- inicialização ---------- */
  let started = false;

  function init() {
    if (started) return;
    started = true;

    const saved = loadSavedColor();
    palette.hsl = rgbToHsl(hexToRgb(saved || '#8b5cf6').r, hexToRgb(saved || '#8b5cf6').g, hexToRgb(saved || '#8b5cf6').b);
    applyPalette(saved || '#8b5cf6', { persist: false });

    window.LuminAtmosphere = createAtmosphere() || { recolor: function () {} };

    initPaletteUI();
    initGridUI();
    initCursor();

    /* o botão de tema do site.js pede a reaplicação da paleta */
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      window.setTimeout(() => applyPalette(palette.hex, { persist: false }), 0);
    });

    /* armazenamento alterado em outra aba */
    window.addEventListener('storage', (event) => {
      if (event.key === THEME_KEY && event.newValue) {
        root.setAttribute('data-theme', event.newValue === 'light' ? 'light' : 'dark');
        applyPalette(palette.hex, { persist: false });
      }
      if (event.key === COLOR_KEY && event.newValue) {
        applyPalette(event.newValue, { persist: false });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
