/* =========================================================
   LuminSDK — Bônus
   Ferramentas extras que rodam inteiras no navegador:

   · Testador de controle (Gamepad API, por polling)
   · Monitor de conexão (Network Information + teste de latência)
   · Gerenciador de cache (Storage API + service worker)

   Compatibilidade: nada de Web Bluetooth, WebUSB, Keyboard Lock
   ou APIs experimentais — o navegador do Xbox (Edge) não tem
   essas coisas. Tudo aqui funciona por eventos e polling.

   Autor: Ryan Smith · Licença MIT
   ========================================================= */
(function () {
  'use strict';

  var STORE_KEY = 'luminsdk-bonus';

  var state = {
    view: 'hub',
    padIndex: null,
    raf: 0,
    deadzone: 0.12,
    optionSignature: '',
    pressedSignature: '',
    rawSignature: '',
    frames: 0,
    fpsAt: 0,
    pingBusy: false,
    cacheBusy: false,
    hadPad: false
  };

  var dom = {};

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $$(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function toast(message) {
    if (window.LuminLibrary && typeof window.LuminLibrary.toast === 'function') {
      window.LuminLibrary.toast(message);
    }
  }

  function shortName(id) {
    var text = String(id || '').replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
    return text || 'Controle';
  }

  /* ---------- preferências ---------- */
  function loadPrefs() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      if (saved && typeof saved.deadzone === 'number' && isFinite(saved.deadzone)) {
        state.deadzone = Math.min(0.4, Math.max(0, saved.deadzone));
      }
    } catch (error) {
      /* sem armazenamento: usa o padrão */
    }
  }

  function savePrefs() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ deadzone: state.deadzone }));
    } catch (error) {
      /* ignora */
    }
  }

  /* ---------- abrir / fechar ---------- */
  function openBonus() {
    if (!dom.dialog) return;
    showView('hub');
    if (typeof dom.dialog.showModal === 'function') {
      if (!dom.dialog.open) dom.dialog.showModal();
    } else {
      dom.dialog.setAttribute('open', '');
    }
    if (dom.closeBtn) {
      try { dom.closeBtn.focus({ preventScroll: true }); } catch (error) { dom.closeBtn.focus(); }
    }
  }

  function closeBonus() {
    if (!dom.dialog) return;
    if (typeof dom.dialog.close === 'function' && dom.dialog.open) dom.dialog.close();
    else dom.dialog.removeAttribute('open');
    stopLoop();
  }

  function showView(view) {
    state.view = view;
    if (dom.hub) dom.hub.hidden = view !== 'hub';
    if (dom.gamepad) dom.gamepad.hidden = view !== 'gamepad';
    if (dom.net) dom.net.hidden = view !== 'net';
    if (dom.cache) dom.cache.hidden = view !== 'cache';
    if (dom.stats) dom.stats.hidden = view !== 'stats';
    if (dom.ach) dom.ach.hidden = view !== 'ach';

    if (view === 'gamepad') {
      startLoop();
    } else {
      stopLoop();
    }
    if (view === 'net') renderNet();
    if (view === 'cache') renderCache();
    if (view === 'stats' && window.LuminProgress) window.LuminProgress.renderStats(dom.statsBody);
    if (view === 'ach' && window.LuminProgress) window.LuminProgress.renderAchievements(dom.achBody);

    var body = dom.dialog ? $('.sheet__body', dom.dialog) : null;
    if (body) body.scrollTop = 0;
  }

  /* =========================================================
     Testador de controle
     ========================================================= */

  function gamepadsSupported() {
    return typeof navigator.getGamepads === 'function';
  }

  function readPads() {
    if (!gamepadsSupported()) return [];
    var raw = null;
    try { raw = navigator.getGamepads(); } catch (error) { return []; }
    var list = [];
    if (!raw) return list;
    for (var i = 0; i < raw.length; i++) {
      if (raw[i]) list.push(raw[i]);
    }
    return list;
  }

  function startLoop() {
    stopLoop();
    if (!gamepadsSupported()) {
      setStatus('unsupported');
      return;
    }
    state.frames = 0;
    state.fpsAt = (window.performance && performance.now) ? performance.now() : Date.now();
    var step = function () {
      state.raf = requestAnimationFrame(step);
      tick();
    };
    state.raf = requestAnimationFrame(step);
  }

  function stopLoop() {
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = 0;
  }

  function tick() {
    var pads = readPads();
    renderPadOptions(pads);

    if (!pads.length) {
      setStatus('none');
      if (state.hadPad !== false) {
        resetVisual();
        state.hadPad = false;
      }
      return;
    }
    state.hadPad = true;

    var pad = null;
    for (var i = 0; i < pads.length; i++) {
      if (pads[i].index === state.padIndex) pad = pads[i];
    }
    if (!pad) {
      pad = pads[0];
      state.padIndex = pad.index;
      if (dom.select) dom.select.value = String(pad.index);
    }

    setStatus('connected', pad);
    renderPad(pad);

    state.frames += 1;
    var now = (window.performance && performance.now) ? performance.now() : Date.now();
    if (now - state.fpsAt >= 500) {
      if (dom.fps) dom.fps.textContent = Math.round((state.frames * 1000) / (now - state.fpsAt)) + ' Hz';
      state.frames = 0;
      state.fpsAt = now;
    }
  }

  function setStatus(kind, pad) {
    if (!dom.status) return;
    var text;
    if (kind === 'unsupported') {
      text = 'Este navegador não expõe a API de controles (Gamepad). No Xbox, use o Microsoft Edge.';
    } else if (kind === 'none') {
      text = 'Nenhum controle detectado. Conecte um controle e aperte qualquer botão.';
    } else {
      text = 'Conectado: ' + shortName(pad.id) + (pad.mapping ? ' · mapeamento ' + pad.mapping : '');
    }
    if (dom.status.textContent !== text) dom.status.textContent = text;
    dom.status.classList.toggle('is-on', kind === 'connected');
  }

  function renderPadOptions(pads) {
    if (!dom.select) return;
    var signature = pads.map(function (pad) { return pad.index + '|' + pad.id; }).join('~');
    if (signature === state.optionSignature) return;
    state.optionSignature = signature;

    dom.select.textContent = '';
    pads.forEach(function (pad) {
      var option = document.createElement('option');
      option.value = String(pad.index);
      option.textContent = shortName(pad.id) + ' #' + (pad.index + 1);
      dom.select.appendChild(option);
    });

    var many = pads.length > 1;
    dom.select.hidden = !many;
    if (dom.selectLabel) dom.selectLabel.hidden = !many;
    if (many) dom.select.value = String(state.padIndex != null ? state.padIndex : pads[0].index);
  }

  function applyStick(wrap, output, x, y) {
    var deadzone = state.deadzone;
    var ax = Math.abs(x) > deadzone ? x : 0;
    var ay = Math.abs(y) > deadzone ? y : 0;
    if (wrap) {
      var dot = $('[data-stick-dot]', wrap);
      if (dot) dot.style.transform = 'translate(' + (ax * 26).toFixed(1) + 'px,' + (ay * 26).toFixed(1) + 'px)';
      wrap.classList.toggle('is-active', Math.abs(ax) + Math.abs(ay) > 0);
    }
    if (output) output.textContent = x.toFixed(2) + ' / ' + y.toFixed(2);
  }

  function renderPad(pad) {
    if (dom.name) dom.name.textContent = shortName(pad.id);
    if (dom.mapping) dom.mapping.textContent = pad.mapping || 'não padrão';
    if (dom.counts) dom.counts.textContent = pad.buttons.length + ' botões · ' + pad.axes.length + ' eixos';

    var pressed = [];
    $$('[data-pad-btn]', dom.pad || document).forEach(function (el) {
      var index = Number(el.getAttribute('data-pad-btn'));
      var button = pad.buttons[index];
      var value = button ? (typeof button.value === 'number' ? button.value : (button.pressed ? 1 : 0)) : 0;
      var trigger = el.hasAttribute('data-trigger');

      if (trigger) {
        var percent = Math.round(Math.max(0, Math.min(1, value)) * 100);
        var fill = $('[data-trigger-fill]', el);
        var label = $('[data-trigger-val]', el);
        if (fill) fill.style.width = percent + '%';
        if (label) label.textContent = percent + '%';
      }

      var on = trigger ? value > 0.08 : !!(button && (button.pressed || value > 0.5));
      el.classList.toggle('is-on', on);
      if (on && !trigger) pressed.push((el.textContent || '').trim());
    });

    applyStick(dom.stickL, dom.stickLVal, pad.axes[0] || 0, pad.axes[1] || 0);
    applyStick(dom.stickR, dom.stickRVal, pad.axes[2] || 0, pad.axes[3] || 0);

    var signature = pressed.join(',');
    if (signature !== state.pressedSignature) {
      state.pressedSignature = signature;
      var text = pressed.length ? pressed.join(' + ') : 'nenhum';
      if (dom.pressed) dom.pressed.textContent = 'Botões pressionados: ' + text;
      if (dom.live) dom.live.textContent = 'Botões pressionados: ' + text;
    }

    if (dom.rumble) {
      var motor = pad.vibrationActuator;
      dom.rumble.hidden = !(motor && typeof motor.playEffect === 'function');
    }

    if (dom.raw) {
      var lines = [];
      lines.push('botões: ' + pad.buttons.map(function (b, i) {
        var v = typeof b.value === 'number' ? b.value.toFixed(2) : (b.pressed ? '1.00' : '0.00');
        return i + ':' + v;
      }).join(' '));
      lines.push('eixos: ' + pad.axes.map(function (a) { return a.toFixed(2); }).join('  '));
      var raw = lines.join('\n');
      if (raw !== state.rawSignature) {
        state.rawSignature = raw;
        dom.raw.textContent = raw.slice(0, 2000);
      }
    }
  }

  function resetVisual() {
    $$('[data-pad-btn]', dom.pad || document).forEach(function (el) {
      el.classList.remove('is-on');
      if (el.hasAttribute('data-trigger')) {
        var fill = $('[data-trigger-fill]', el);
        var label = $('[data-trigger-val]', el);
        if (fill) fill.style.width = '0%';
        if (label) label.textContent = '0%';
      }
    });
    applyStick(dom.stickL, dom.stickLVal, 0, 0);
    applyStick(dom.stickR, dom.stickRVal, 0, 0);
    if (state.pressedSignature !== '') {
      state.pressedSignature = '';
      if (dom.pressed) dom.pressed.textContent = 'Botões pressionados: nenhum';
      if (dom.live) dom.live.textContent = '';
    }
    if (dom.name) dom.name.textContent = '—';
    if (dom.mapping) dom.mapping.textContent = '—';
    if (dom.counts) dom.counts.textContent = '—';
    if (dom.fps) dom.fps.textContent = '—';
    if (dom.rumble) dom.rumble.hidden = true;
    if (dom.raw && state.rawSignature !== '') {
      state.rawSignature = '';
      dom.raw.textContent = '—';
    }
  }

  function currentPad() {
    var pads = readPads();
    for (var i = 0; i < pads.length; i++) {
      if (pads[i].index === state.padIndex) return pads[i];
    }
    return pads[0] || null;
  }

  function testRumble() {
    var pad = currentPad();
    if (!pad) {
      toast('Nenhum controle conectado.');
      return;
    }
    var motor = pad.vibrationActuator;
    if (!motor || typeof motor.playEffect !== 'function') {
      toast('Este controle não oferece vibração ao navegador.');
      return;
    }
    try {
      var result = motor.playEffect('dual-rumble', {
        duration: 400,
        startDelay: 0,
        strongMagnitude: 0.9,
        weakMagnitude: 0.6
      });
      if (result && typeof result.then === 'function') {
        result.catch(function () { toast('O navegador recusou a vibração.'); });
      }
    } catch (error) {
      toast('Este controle não suporta vibração aqui.');
    }
  }

  /* =========================================================
     Monitor de conexão
     ========================================================= */

  function connection() {
    return navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
  }

  function renderNet() {
    if (!dom.netState) return;
    var online = navigator.onLine !== false;
    dom.netState.textContent = online ? 'Online' : 'Offline';
    dom.netState.classList.toggle('is-bad', !online);

    var net = connection();
    if (!net) {
      if (dom.netType) dom.netType.textContent = 'não informado pelo navegador';
      if (dom.netDown) dom.netDown.textContent = '—';
      if (dom.netRtt) dom.netRtt.textContent = '—';
      if (dom.netSave) dom.netSave.textContent = '—';
      return;
    }
    if (dom.netType) dom.netType.textContent = net.effectiveType ? String(net.effectiveType).toUpperCase() : 'desconhecido';
    if (dom.netDown) dom.netDown.textContent = typeof net.downlink === 'number' ? net.downlink + ' Mb/s' : '—';
    if (dom.netRtt) dom.netRtt.textContent = typeof net.rtt === 'number' ? net.rtt + ' ms (estimado)' : '—';
    if (dom.netSave) dom.netSave.textContent = net.saveData ? 'ligada' : 'desligada';
  }

  function ping() {
    if (state.pingBusy || !dom.netResult) return;
    state.pingBusy = true;
    dom.netResult.textContent = 'Medindo…';
    var started = (window.performance && performance.now) ? performance.now() : Date.now();
    var url = window.location.pathname + '?ping=' + Date.now();
    var done = function (ok) {
      var ms = Math.round(((window.performance && performance.now) ? performance.now() : Date.now()) - started);
      dom.netResult.textContent = ok
        ? 'Resposta do site em ' + ms + ' ms.'
        : 'O site não respondeu em ' + ms + ' ms. Verifique a conexão.';
      state.pingBusy = false;
    };
    if (typeof fetch !== 'function') {
      dom.netResult.textContent = 'Este navegador não permite o teste de latência.';
      state.pingBusy = false;
      return;
    }
    fetch(url, { method: 'HEAD', cache: 'no-store', credentials: 'same-origin' })
      .then(function (response) { done(!!(response && (response.ok || response.type === 'opaque'))); })
      .catch(function () { done(false); });
  }

  /* =========================================================
     Gerenciador de cache
     ========================================================= */

  function formatBytes(bytes) {
    if (!bytes || bytes < 1024) return (bytes || 0) + ' B';
    var units = ['KB', 'MB', 'GB'];
    var value = bytes / 1024;
    var unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit += 1;
    }
    return value.toFixed(value >= 10 ? 0 : 1) + ' ' + units[unit];
  }

  function renderCache() {
    if (!dom.cacheUsage) return;

    if (navigator.storage && typeof navigator.storage.estimate === 'function') {
      navigator.storage.estimate().then(function (info) {
        var usage = info && info.usage ? info.usage : 0;
        var quota = info && info.quota ? info.quota : 0;
        dom.cacheUsage.textContent = formatBytes(usage) + (quota ? ' de ' + formatBytes(quota) : '');
      }).catch(function () {
        dom.cacheUsage.textContent = 'indisponível';
      });
    } else {
      dom.cacheUsage.textContent = 'não informado pelo navegador';
    }

    if (typeof caches === 'undefined') {
      dom.cacheList.textContent = 'cache indisponível neste navegador';
    } else {
      caches.keys().then(function (keys) {
        if (!keys.length) {
          dom.cacheList.textContent = 'nenhum';
          return;
        }
        Promise.all(keys.map(function (key) {
          return caches.open(key).then(function (cache) { return cache.keys(); }).then(function (requests) {
            return key + ' (' + requests.length + ')';
          }).catch(function () { return key; });
        })).then(function (parts) {
          dom.cacheList.textContent = parts.join(' · ');
        });
      }).catch(function () {
        dom.cacheList.textContent = 'não foi possível ler';
      });
    }

    if (dom.cacheSw) {
      if (!('serviceWorker' in navigator)) {
        dom.cacheSw.textContent = 'não usado neste navegador';
      } else {
        navigator.serviceWorker.getRegistration().then(function (registration) {
          if (!registration) {
            dom.cacheSw.textContent = 'não registrado';
            return;
          }
          var waiting = registration.waiting ? ' · atualização pronta' : '';
          dom.cacheSw.textContent = (registration.active ? 'ativo' : 'inativo') + waiting;
        }).catch(function () {
          dom.cacheSw.textContent = 'não foi possível ler';
        });
      }
    }
  }

  function checkUpdate() {
    if (state.cacheBusy || !dom.cacheResult) return;
    if (!('serviceWorker' in navigator)) {
      dom.cacheResult.textContent = 'Este navegador não usa service worker.';
      return;
    }
    state.cacheBusy = true;
    dom.cacheResult.textContent = 'Procurando atualização…';
    navigator.serviceWorker.getRegistration().then(function (registration) {
      if (!registration) {
        dom.cacheResult.textContent = 'Nenhum service worker registrado para este site.';
        state.cacheBusy = false;
        return;
      }
      return registration.update().then(function () {
        dom.cacheResult.textContent = registration.waiting
          ? 'Atualização pronta. Recarregue a página para usar.'
          : 'Você já está na versão mais recente.';
        state.cacheBusy = false;
        renderCache();
      });
    }).catch(function () {
      dom.cacheResult.textContent = 'Não foi possível verificar agora. Tente de novo em instantes.';
      state.cacheBusy = false;
    });
  }

  function clearCache() {
    if (state.cacheBusy || !dom.cacheResult) return;
    if (typeof caches === 'undefined') {
      dom.cacheResult.textContent = 'Este navegador não guarda cache do site.';
      return;
    }
    if (!window.confirm('Limpar o cache do LuminSDK e recarregar a página?')) return;
    state.cacheBusy = true;
    dom.cacheResult.textContent = 'Limpando…';
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) { return caches.delete(key); }));
    }).then(function () {
      state.cacheBusy = false;
      window.location.reload();
    }).catch(function () {
      state.cacheBusy = false;
      dom.cacheResult.textContent = 'Não foi possível limpar o cache.';
    });
  }

  /* =========================================================
     Inicialização
     ========================================================= */

  function cacheDom() {
    dom.dialog = document.getElementById('bonus');
    dom.hub = document.getElementById('bonus-hub');
    dom.gamepad = document.getElementById('bonus-gamepad');
    dom.net = document.getElementById('bonus-net');
    dom.cache = document.getElementById('bonus-cache');
    dom.stats = document.getElementById('bonus-stats');
    dom.ach = document.getElementById('bonus-ach');
    dom.statsBody = document.getElementById('stats-body');
    dom.achBody = document.getElementById('ach-body');
    dom.closeBtn = document.getElementById('bonus-close');

    dom.pad = document.getElementById('pad');
    dom.status = document.getElementById('pad-status');
    dom.select = document.getElementById('pad-select');
    dom.selectLabel = dom.select ? document.querySelector('label[for="pad-select"]') : null;
    dom.name = document.getElementById('pad-name');
    dom.mapping = document.getElementById('pad-mapping');
    dom.counts = document.getElementById('pad-counts');
    dom.fps = document.getElementById('pad-fps');
    dom.pressed = document.getElementById('pad-pressed');
    dom.live = document.getElementById('pad-live');
    dom.raw = document.getElementById('pad-raw');
    dom.rumble = document.getElementById('pad-rumble');
    dom.stickL = document.getElementById('pad-stick-l');
    dom.stickLVal = document.getElementById('pad-stick-l-val');
    dom.stickR = document.getElementById('pad-stick-r');
    dom.stickRVal = document.getElementById('pad-stick-r-val');
    dom.deadzone = document.getElementById('pad-deadzone');
    dom.deadzoneOut = document.getElementById('pad-dz-out');

    dom.netState = document.getElementById('net-state');
    dom.netType = document.getElementById('net-type');
    dom.netDown = document.getElementById('net-down');
    dom.netRtt = document.getElementById('net-rtt');
    dom.netSave = document.getElementById('net-save');
    dom.netResult = document.getElementById('net-result');

    dom.cacheUsage = document.getElementById('cache-usage');
    dom.cacheList = document.getElementById('cache-list');
    dom.cacheSw = document.getElementById('cache-sw');
    dom.cacheResult = document.getElementById('cache-result');
  }

  function bind() {
    var opener = document.getElementById('bonus-btn');
    if (opener) opener.addEventListener('click', openBonus);
    if (dom.closeBtn) dom.closeBtn.addEventListener('click', closeBonus);

    if (dom.dialog) {
      dom.dialog.addEventListener('click', function (event) {
        if (event.target === dom.dialog) closeBonus();
      });
      dom.dialog.addEventListener('close', function () {
        stopLoop();
        showView('hub');
      });
      dom.dialog.addEventListener('cancel', function () {
        stopLoop();
      });
    }

    $$('[data-bonus-open]').forEach(function (button) {
      button.addEventListener('click', function () {
        showView(button.getAttribute('data-bonus-open'));
      });
    });

    $$('[data-bonus-back]').forEach(function (button) {
      button.addEventListener('click', function () { showView('hub'); });
    });

    if (dom.select) {
      dom.select.addEventListener('change', function () {
        state.padIndex = Number(dom.select.value);
        state.optionSignature = '';
      });
    }

    if (dom.deadzone) {
      state.deadzone = Math.min(0.4, Math.max(0, Number(dom.deadzone.value) || 0));
      dom.deadzone.addEventListener('input', function () {
        state.deadzone = Math.min(0.4, Math.max(0, Number(dom.deadzone.value) || 0));
        if (dom.deadzoneOut) dom.deadzoneOut.textContent = Math.round(state.deadzone * 100) + '%';
        savePrefs();
      });
    }

    if (dom.rumble) dom.rumble.addEventListener('click', testRumble);

    var netTest = document.getElementById('net-test');
    if (netTest) netTest.addEventListener('click', ping);

    var netRefresh = document.getElementById('net-refresh');
    if (netRefresh) netRefresh.addEventListener('click', renderNet);

    var cacheCheck = document.getElementById('cache-check');
    if (cacheCheck) cacheCheck.addEventListener('click', checkUpdate);

    var cacheClear = document.getElementById('cache-clear');
    if (cacheClear) cacheClear.addEventListener('click', clearCache);

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') {
        stopLoop();
      } else if (state.view === 'gamepad' && dom.dialog && dom.dialog.open) {
        startLoop();
      }
    });

    window.addEventListener('online', function () { if (state.view === 'net') renderNet(); });
    window.addEventListener('offline', function () { if (state.view === 'net') renderNet(); });

    window.addEventListener('gamepadconnected', function () {
      state.optionSignature = '';
      if (state.view === 'gamepad') {
        toast('Controle conectado.');
        startLoop();
      }
    });

    window.addEventListener('gamepaddisconnected', function () {
      state.optionSignature = '';
      state.pressedSignature = '';
      if (state.view === 'gamepad') toast('Controle desconectado.');
    });
  }

  function init() {
    cacheDom();
    if (!dom.dialog) return;
    loadPrefs();
    if (dom.deadzone) dom.deadzone.value = String(state.deadzone);
    if (dom.deadzoneOut) dom.deadzoneOut.textContent = Math.round(state.deadzone * 100) + '%';
    bind();
    resetVisual();
    if (!gamepadsSupported() && dom.status) setStatus('unsupported');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
