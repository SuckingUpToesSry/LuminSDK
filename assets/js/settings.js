/* =========================================================
   LuminSDK — configurações e desempenho
   · preferências persistentes (partículas, parallax, cursor,
     animações, desfoques e efeitos de hover)
   · detecção automática de dispositivo modesto
   · modo leve / tudo ligado
   · painel de configurações, backup e atalhos

   Autor: Ryan Smith · Licença MIT
   ========================================================= */
(function () {
  'use strict';

  const KEY = 'luminsdk-settings';
  const root = document.documentElement;

  const DEFAULTS = {
    particles: true,
    parallax: true,
    cursor: true,
    motion: true,
    blur: true,
    hover: true,
    auto: true
  };

  const CLASSES = {
    particles: 'no-particles',
    parallax: 'no-parallax',
    cursor: 'no-custom-cursor',
    motion: 'no-motion',
    blur: 'no-blur',
    hover: 'no-hover'
  };

  const listeners = [];
  let settings = Object.assign({}, DEFAULTS);

  /* ---------- detecção de dispositivo ---------- */
  function detectDevice() {
    const nav = navigator || {};
    const cores = nav.hardwareConcurrency || 4;
    const memory = nav.deviceMemory || 4;
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const savesData = !!(nav.connection && nav.connection.saveData);
    const slowNet = !!(nav.connection && /2g/.test(nav.connection.effectiveType || ''));
    const smallScreen = window.innerWidth < 480;

    /* só considera "modesto" quando há mais de um sinal fraco, ou um sinal forte */
    const lowEnd = (cores <= 2 && memory <= 2) || savesData || slowNet;

    return {
      cores: cores,
      memory: memory,
      reduced: reduced,
      saveData: savesData,
      slowNet: slowNet,
      smallScreen: smallScreen,
      modest: lowEnd
    };
  }

  /* Preset automático: mantém o capricho em máquinas boas e alivia nas modestas */
  function autoSettings() {
    const device = detectDevice();
    return {
      particles: !device.modest,
      parallax: !device.modest && !device.smallScreen,
      cursor: !device.modest && !device.smallScreen,
      motion: !device.reduced,
      blur: !device.modest,
      hover: !device.reduced,
      auto: true
    };
  }

  const PRESETS = {
    light: { particles: false, parallax: false, cursor: false, motion: false, blur: false, hover: false, auto: false },
    full: { particles: true, parallax: true, cursor: true, motion: true, blur: true, hover: true, auto: false }
  };

  /* ---------- persistência ---------- */
  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  function write() {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch (error) {
      /* sem armazenamento: vale para esta sessão */
    }
  }

  /* ---------- aplicação ---------- */
  function apply() {
    Object.keys(CLASSES).forEach((key) => {
      const enabled = settings[key] !== false;
      root.classList.toggle(CLASSES[key], !enabled);
    });
    root.setAttribute('data-perf', settings.motion === false ? 'light' : 'full');
  }

  function emit() {
    const payload = Object.assign({}, settings, { device: detectDevice() });
    window.dispatchEvent(new CustomEvent('lumin:settings', { detail: payload }));
    listeners.forEach((fn) => {
      try {
        fn(payload);
      } catch (error) {
        console.warn('[LuminSDK] listener de configurações falhou:', error);
      }
    });
  }

  function set(key, value, options) {
    if (!(key in DEFAULTS)) return;
    settings[key] = !!value;
    if (!options || options.auto !== true) settings.auto = false;
    apply();
    write();
    emit();
    syncUI();
  }

  function setAll(next) {
    settings = Object.assign({}, DEFAULTS, next);
    apply();
    write();
    emit();
    syncUI();
  }

  function reset() {
    setAll(autoSettings());
  }

  /* ---------- UI ---------- */
  function syncUI() {
    document.querySelectorAll('[data-setting]').forEach((input) => {
      const key = input.dataset.setting;
      input.checked = settings[key] !== false;
    });

    const device = detectDevice();
    const label = document.getElementById('settings-device');
    if (label) {
      const parts = [];
      parts.push(device.cores + ' núcleos');
      if (device.memory) parts.push(device.memory + ' GB RAM');
      if (device.reduced) parts.push('movimento reduzido no sistema');
      if (device.saveData) parts.push('economia de dados ativa');
      parts.push(device.modest ? 'perfil leve' : 'perfil completo');
      if (settings.auto) parts.push('automático');
      label.textContent = parts.join(' · ');
    }
  }

  function openSettings() {
    const dialog = document.getElementById('settings');
    if (!dialog) return;
    syncUI();
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }

  function closeSettings() {
    const dialog = document.getElementById('settings');
    if (!dialog) return;
    if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    else dialog.removeAttribute('open');
  }

  function initUI() {
    const button = document.getElementById('settings-btn');
    const close = document.getElementById('settings-close');
    const auto = document.getElementById('settings-auto');
    const light = document.getElementById('settings-light');
    const full = document.getElementById('settings-full');

    if (button) button.addEventListener('click', openSettings);
    if (close) close.addEventListener('click', closeSettings);

    document.querySelectorAll('[data-setting]').forEach((input) => {
      input.addEventListener('change', () => set(input.dataset.setting, input.checked));
    });

    if (auto) {
      auto.addEventListener('click', () => {
        reset();
        if (window.LuminLibrary) window.LuminLibrary.toast('Efeitos ajustados para este dispositivo.');
      });
    }
    if (light) {
      light.addEventListener('click', () => {
        setAll(PRESETS.light);
        if (window.LuminLibrary) window.LuminLibrary.toast('Modo leve ativado.');
      });
    }
    if (full) {
      full.addEventListener('click', () => {
        setAll(PRESETS.full);
        if (window.LuminLibrary) window.LuminLibrary.toast('Todos os efeitos ligados.');
      });
    }

    /* dados */
    const exportBtn = document.getElementById('data-export');
    const importInput = document.getElementById('data-import');
    const clearBtn = document.getElementById('data-clear');

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const api = window.LuminLibrary;
        if (api && api.exportData) api.exportData();
      });
    }

    if (importInput) {
      importInput.addEventListener('change', () => {
        const api = window.LuminLibrary;
        const file = importInput.files && importInput.files[0];
        if (api && api.importData && file) api.importData(file).then(() => syncDataStats());
        importInput.value = '';
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        const api = window.LuminLibrary;
        if (!api) return;
        const confirmed = window.confirm('Apagar favoritos, histórico, saves e cores por jogo deste navegador?');
        if (!confirmed) return;
        api.clearData();
        syncDataStats();
        if (api.toast) api.toast('Seus dados foram apagados.');
      });
    }

    /* atalho "?" abre as configurações */
    document.addEventListener('keydown', (event) => {
      const target = event.target;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (typing) return;
      if (event.key === '?' || (event.key === '/' && event.shiftKey)) {
        const player = document.getElementById('player');
        if (player && player.hasAttribute('open')) return;
        event.preventDefault();
        openSettings();
      }
    });

    /* o painel reflete o estado dos dados ao abrir */
    button?.addEventListener('click', syncDataStats);
    syncUI();
    syncDataStats();
  }

  function syncDataStats() {
    const label = document.getElementById('data-stats');
    const api = window.LuminLibrary;
    if (!label || !api || !api.dataStats) return;
    const stats = api.dataStats();
    label.textContent =
      stats.favorites + ' favorito' + (stats.favorites === 1 ? '' : 's') +
      ' · ' + stats.recents + ' no histórico' +
      ' · ' + stats.saves + ' save' + (stats.saves === 1 ? '' : 's') +
      ' · ' + stats.colors + ' cor' + (stats.colors === 1 ? '' : 'es') + ' por jogo';
  }

  /* ---------- inicialização ---------- */
  function init() {
    const saved = read();
    settings = saved ? Object.assign({}, DEFAULTS, saved) : autoSettings();
    apply();
    write();
    initUI();
    emit();

    /* se o usuário mexer no sistema, respeitamos */
    if (window.matchMedia) {
      const query = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = (event) => {
        if (!settings.auto) return;
        settings = Object.assign({}, autoSettings(), { auto: true });
        if (event.matches) settings.motion = false;
        apply();
        write();
        emit();
        syncUI();
      };
      if (query.addEventListener) query.addEventListener('change', onChange);
      else if (query.addListener) query.addListener(onChange);
    }
  }

  window.LuminSettings = {
    get: () => Object.assign({}, settings),
    set: set,
    setAll: setAll,
    reset: reset,
    open: openSettings,
    close: closeSettings,
    on: (fn) => {
      listeners.push(fn);
      return () => {
        const index = listeners.indexOf(fn);
        if (index >= 0) listeners.splice(index, 1);
      };
    },
    device: detectDevice,
    syncDataStats: syncDataStats
  };

  /* aplica o mais cedo possível para evitar "flash" de efeitos */
  const initial = read();
  settings = initial ? Object.assign({}, DEFAULTS, initial) : autoSettings();
  apply();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
