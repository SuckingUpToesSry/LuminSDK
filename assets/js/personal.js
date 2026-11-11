/* Seu espaço: preferências e tempo local. Sem conta, envio ou rastreamento remoto. */
(function () {
  'use strict';
  if (window.LuminPersonal) return;
  const KEY = 'luminsdk:personal:v1', TIME_KEY = 'luminsdk:session:v1';
  const DEFAULTS = { name: '', note: '', look: 'edit', text: '100', contrast: 'normal', width: 'normal',
    focus: false, covers: true, dashboard: true, progress: true, palette: true, clock: '24',
    reminder: '0', budget: '60', flash: true, shake: 'full' };
  const VALUES = { look: ['clean','edit','glass'], text: ['100','110','120'], contrast: ['normal','high'],
    width: ['normal','wide'], clock: ['12','24'],
    reminder: ['0','20','40','60'], budget: ['30','60','120'], shake: ['off','soft','full'] };
  const root = document.documentElement;
  let prefs = Object.assign({}, DEFAULTS), storageOK = true;
  function sanitize(input) {
    const clean = Object.assign({}, DEFAULTS);
    if (!input || typeof input !== 'object') return clean;
    Object.keys(DEFAULTS).forEach(key => {
      if (key === 'name' || key === 'note') clean[key] = typeof input[key] === 'string' ? input[key].trim().slice(0, key === 'name' ? 24 : 300) : '';
      else if (VALUES[key]) { if (VALUES[key].includes(String(input[key]))) clean[key] = String(input[key]); }
      else if (typeof input[key] === 'boolean') clean[key] = input[key];
    });
    return clean;
  }
  try { prefs = sanitize(JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (error) { storageOK = false; }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); storageOK = true; } catch (error) { storageOK = false; }
  }
  function apply() {
    ['look','text','contrast','width','shake'].forEach(key => root.setAttribute('data-personal-' + key, prefs[key]));
    ['focus','covers','dashboard','progress'].forEach(key => root.setAttribute('data-personal-' + key, String(prefs[key])));
  }
  function changed() {
    apply();
    try { window.dispatchEvent(new CustomEvent('lumin:personalchange')); } catch (error) {}
  }
  function set(key, value) {
    if (!Object.prototype.hasOwnProperty.call(DEFAULTS, key)) return false;
    if (VALUES[key] && !VALUES[key].includes(String(value))) return false;
    if (typeof DEFAULTS[key] === 'boolean' && typeof value !== 'boolean') return false;
    prefs = sanitize(Object.assign({}, prefs, { [key]: value }));
    write(KEY, prefs); changed(); return true;
  }
  function day() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate(); }
  let session = { day: day(), seconds: 0 };
  try {
    const saved = JSON.parse(localStorage.getItem(TIME_KEY) || 'null');
    if (saved && saved.day === day() && Number.isFinite(saved.seconds)) session.seconds = Math.max(0, Math.min(86400, saved.seconds));
  } catch (error) {}
  let paused = false, last = Date.now(), wasVisible = !document.hidden, lastReminder = session.seconds;
  function flush(clear) {
    if (!clear) {
      try { const saved = JSON.parse(localStorage.getItem(TIME_KEY) || 'null'); if (saved && saved.day === session.day && Number.isFinite(saved.seconds)) session.seconds = Math.max(session.seconds, Math.min(86400, saved.seconds)); } catch (error) {}
    }
    write(TIME_KEY, session);
  }
  function elapsed() {
    const now = Date.now();
    if (session.day !== day()) { session = { day: day(), seconds: 0 }; lastReminder = 0; }
    if (!paused && wasVisible) session.seconds += Math.max(0, Math.min(10, (now-last)/1000));
    last = now; wasVisible = !document.hidden;
  }
  function minutes() { return Math.floor(session.seconds/60); }
  function notify(message) {
    const notice = document.getElementById('personal-notice');
    if (!notice) return;
    notice.querySelector('p').textContent = message; notice.hidden = false;
  }
  function reset() {
    prefs = Object.assign({}, DEFAULTS); session = { day: day(), seconds: 0 }; last = Date.now(); lastReminder = 0; paused = false; wasVisible = !document.hidden;
    write(KEY, prefs); flush(true); changed();
  }
  window.LuminPersonal = { get: () => Object.assign({}, prefs), set, sanitize, reset,
    session: () => ({ seconds: Math.floor(session.seconds), paused, day: session.day }), storage: () => storageOK };
  apply();
  function init() {
    const $ = id => document.getElementById(id);
    function render() {
      document.querySelectorAll('[data-personal]').forEach(input => {
        const key = input.dataset.personal;
        if (document.activeElement === input) return;
        if (input.type === 'checkbox') input.checked = prefs[key]; else input.value = prefs[key];
      });
      if ($('personal-greeting')) $('personal-greeting').textContent = prefs.name ? 'Seu espaço, ' + prefs.name + '.' : 'Seu próximo capítulo começa aqui.';
      if ($('personal-note')) { $('personal-note').textContent = prefs.note || 'Estude, explore e personalize. Do seu jeito.'; }
      if ($('personal-clock')) $('personal-clock').textContent = new Date().toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit', hour12:prefs.clock === '12' });
      const label = minutes() + ' min hoje / meta ' + prefs.budget + ' min';
      if ($('personal-session')) $('personal-session').textContent = label + (paused ? ' · pausado' : ' · tempo visível neste navegador');
      if ($('personal-time-stats')) $('personal-time-stats').textContent = label;
      if ($('personal-progress')) $('personal-progress').value = Math.min(100, session.seconds / (Number(prefs.budget)*60) * 100);
      if ($('personal-pause')) $('personal-pause').textContent = paused ? 'Retomar contador' : 'Pausar contador';
      document.querySelectorAll('[data-launcher-open]').forEach(button => { button.disabled = !prefs.palette; });
      const storageMessage = storageOK ? 'Salvo apenas neste navegador. Não é um perfil público nem uma conta online.' : 'Armazenamento indisponível: as alterações valem só nesta aba.';
      if ($('personal-storage') && $('personal-storage').textContent !== storageMessage) $('personal-storage').textContent = storageMessage;
    }
    document.querySelectorAll('[data-personal]').forEach(input => input.addEventListener('change', () => {
      set(input.dataset.personal, input.type === 'checkbox' ? input.checked : input.value); render();
    }));
    window.addEventListener('lumin:personalchange', render);
    document.addEventListener('click', event => {
      const open = event.target.closest && event.target.closest('[data-personal-settings]');
      if (open && window.LuminApp) window.LuminApp.openSettings('experience');
      const launch = event.target.closest && event.target.closest('[data-launcher-open]');
      if (launch) openLauncher();
    });
    if ($('personal-pause')) $('personal-pause').addEventListener('click', () => { elapsed(); paused = !paused; flush(); render(); });
    if ($('personal-notice-close')) $('personal-notice-close').addEventListener('click', () => { $('personal-notice').hidden = true; });
    if ($('personal-reset')) $('personal-reset').addEventListener('click', () => {
      if (window.confirm('Apagar apenas nome, nota, preferências pessoais e contador de hoje? Jogos, favoritos, estudos e configurações gerais serão preservados.')) { reset(); render(); }
    });
    if ($('personal-export')) $('personal-export').addEventListener('click', () => {
      elapsed(); flush();
      const blob = new Blob([JSON.stringify({ version:1, preferences:prefs, session }, null, 2)], { type:'application/json' });
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = 'lumin-meu-espaco.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    const launcher = $('personal-launcher'), search = $('personal-launcher-search'), list = $('personal-launcher-list');
    const routes = [['lumin','Catálogo de jogos'],['mgs','M. G. S. · Multiple Games Sources'],['estudo','Estudos e resumos'],['hub','Hub e ferramentas'],['os','LuminOS'],['sites','Coleções de sites'],['browser','Navegador']];
    function renderLauncher() {
      if (!list) return;
      list.textContent = '';
      const query = String(search.value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
      const available = routes.filter(row => document.querySelector('.app-view[data-view="' + row[0] + '"]'));
      available.concat([['settings','Minhas preferências']]).filter(row => row[1].normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(query)).forEach(row => {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'personal-command'; button.textContent = row[1];
        button.addEventListener('click', () => { launcher.close(); if (!window.LuminApp) return; if (row[0] === 'settings') window.LuminApp.openSettings('experience'); else window.LuminApp.go(row[0]); });
        list.append(button);
      });
      if (!list.children.length) { const p = document.createElement('p'); p.textContent = 'Nenhum destino encontrado.'; list.append(p); }
    }
    function openLauncher() {
      if (!launcher || !prefs.palette || root.classList.contains('is-playing') || document.querySelector('#mgs-player[open]')) return;
      search.value = ''; renderLauncher(); if (!launcher.open) launcher.showModal(); search.focus();
    }
    if ($('personal-launcher-close')) $('personal-launcher-close').addEventListener('click', () => launcher.close());
    if (search) {
      search.addEventListener('input', renderLauncher);
      search.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); const first = list.querySelector('button'); if (first) first.click(); } });
    }
    document.addEventListener('keydown', event => {
      const target = event.target, tag = target && target.tagName;
      if (!prefs.palette || event.repeat || event.defaultPrevented || (root.classList.contains('is-playing') || document.querySelector('#mgs-player[open]')) || ['INPUT','TEXTAREA','SELECT'].includes(tag) || target && target.isContentEditable) return;
      if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'k') { event.preventDefault(); openLauncher(); }
    });
    document.addEventListener('visibilitychange', () => {
      elapsed();
      if (!document.hidden) {
        try { const saved = JSON.parse(localStorage.getItem(TIME_KEY) || 'null'); if (saved && saved.day === session.day && Number.isFinite(saved.seconds)) session.seconds = Math.max(session.seconds, Math.min(86400, saved.seconds)); } catch (error) {}
      }
      flush(); render();
    });
    window.addEventListener('pagehide', () => { elapsed(); flush(); });
    let ticks = 0;
    setInterval(() => {
      elapsed();
      if (++ticks % 15 === 0 && !document.hidden) flush();
      const interval = Number(prefs.reminder)*60;
      if (interval && session.seconds-lastReminder >= interval && !document.hidden && !root.classList.contains('is-playing') && !document.querySelector('#mgs-player[open]')) {
        lastReminder = session.seconds; notify('Você acumulou ' + minutes() + ' minutos hoje. Que tal uma pausa curta? Nenhum jogo será fechado.');
      }
      if (!document.hidden) render();
    }, 1000);
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
