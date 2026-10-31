/* =========================================================
   LuminSDK — presença ao vivo + chat global
   · contador de pessoas no site (some quando um jogo abre)
   · chat sem cadastro: escolhe um nome e fala
   · guarda 100 mensagens; a 101ª empurra a mais antiga para fora
   · tenta o relé público do ntfy.sh (conversa entre visitantes) e,
     quando ele não responde, continua funcionando entre as abas
     deste navegador (localStorage + BroadcastChannel)
   Autor: Ryan Smith · Licença MIT
   ========================================================= */
(function () {
  'use strict';

  const RELAY = 'https://ntfy.sh';
  const LIVE_TOPIC = 'luminsdk_live_5c1a9d27';
  const CHAT_TOPIC = 'luminsdk_chat_5c1a9d27';

  const MAX = 100;
  const STORE_CHAT = 'luminsdk:v1:chat';
  const STORE_NAME = 'luminsdk:v1:chat:name';
  const STORE_ID = 'luminsdk:v1:chat:id';
  const STORE_SEEN = 'luminsdk:v1:chat:seen';

  const PRESENCE_MS = 15000;    /* bate o ponto a cada 15 s */
  const PRESENCE_WINDOW = 75;   /* conta quem apareceu nos últimos 75 s */
  const CHAT_IDLE_MS = 30000;   /* poll do chat mesmo com a janela fechada */

  let messages = [];
  let people = new Set();
  let relayOk = null;           /* null = ainda não sabemos */
  let channel = null;
  let panel = null;
  let list = null;
  let form = null;
  let input = null;
  let nameGate = null;
  let nameInput = null;
  let statusEl = null;
  let lastPoll = 0;
  let playing = false;
  let opened = false;
  let sessions = {};
  const listeners = [];   /* quem quer saber das mensagens novas (painel L_Core) */

  /* ---------- utilidades ---------- */
  function uid() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) {}
  }

  function myId() {
    try {
      let id = sessionStorage.getItem(STORE_ID);
      if (!id) {
        id = uid();
        sessionStorage.setItem(STORE_ID, id);
      }
      return id;
    } catch (error) {
      return uid();
    }
  }

  function myName() {
    try { return localStorage.getItem(STORE_NAME) || ''; } catch (error) { return ''; }
  }

  function setName(name) {
    try { localStorage.setItem(STORE_NAME, name); } catch (error) {}
  }

  function hueOf(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) % 360;
    return hash;
  }

  function clock(seconds) {
    const date = new Date(seconds * 1000);
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return hh + ':' + mm;
  }

  /* ---------- contador de pessoas ---------- */
  function paintPeople() {
    const total = Math.max(1, people.size);
    document.querySelectorAll('[data-people]').forEach(function (node) {
      node.textContent = total === 1 ? '1 pessoa online' : total + ' pessoas online';
    });
    document.querySelectorAll('[data-people-count]').forEach(function (node) {
      node.textContent = String(total);
    });
  }

  function notePerson(id, when) {
    if (!id) return;
    if (when && Date.now() / 1000 - when > PRESENCE_WINDOW) return;
    people.add(String(id));
    paintPeople();
  }

  /* ---------- estado visível (presença no chat) ---------- */
  function viewLabel(route) {
    return ({
      lumin: 'Lumin', gn: 'GN-Math', sites: 'Sites', estudo: 'Estudos',
      browser: 'Navegador', os: 'LuminOS', boot: 'Entrada'
    })[route] || route || '—';
  }

  function headingOf() {
    const view = document.querySelector('.app-view:not([hidden])');
    if (!view) return '';
    const node = view.querySelector('h1, h2');
    if (!node) return '';
    return String(node.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  }

  function snapshot() {
    const root = document.documentElement;
    const route = root.getAttribute('data-view') || LuminAppRoute();
    const frame = document.querySelector('#player:not([hidden]) #player-title, #gn-player.is-open #gn-player-title');
    const iframe = document.querySelector('#brw-stage:not([hidden]) #brw-frame');
    return {
      id: myId(),
      t: Math.floor(Date.now() / 1000),
      n: myName() || 'visitante',
      v: route || '',
      l: viewLabel(route),
      h: headingOf(),
      g: playing ? (frame ? String(frame.textContent || '').slice(0, 60) : 'jogo') : '',
      u: iframe ? String(iframe.getAttribute('src') || '') : '',
      s: Math.round((window.scrollY || 0) / Math.max(1, document.body.scrollHeight - window.innerHeight) * 100) || 0
    };
  }

  function LuminAppRoute() {
    try { return sessionStorage.getItem('luminsdk:v1:start') || 'estudo'; } catch (error) { return 'estudo'; }
  }

  function noteSession(data) {
    if (!data || !data.id) return;
    const id = String(data.id);
    const previous = sessions[id] || {};
    sessions[id] = Object.assign({}, previous, data, {
      id: id,
      me: id === myId(),
      seen: Date.now()
    });
    if (id === myId()) {
      sessions[id].name = myName() || 'você';
    }
  }

  async function heartbeat() {
    const data = snapshot();
    notePerson(myId(), Date.now() / 1000);
    noteSession(data);
    paintPeople();
    try {
      await fetch(RELAY + '/' + LIVE_TOPIC, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'text/plain' },
        cache: 'no-store'
      });
    } catch (error) { /* sem relé: o contador fica com as abas locais */ }
  }

  function report(kind, detail) {
    if (kind) noteSession(Object.assign(snapshot(), { a: String(kind).slice(0, 20) + (detail ? ': ' + String(detail).slice(0, 60) : '') }));
    heartbeat();
  }

  async function pollPeople() {
    try {
      const since = Math.floor(Date.now() / 1000) - PRESENCE_WINDOW;
      const response = await fetch(RELAY + '/' + LIVE_TOPIC + '/json?poll=1&since=' + since, { cache: 'no-store' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const text = await response.text();
      const now = Date.now() / 1000;
      const alive = new Set();
      text.split('\n').forEach(function (line) {
        if (!line) return;
        let row;
        try { row = JSON.parse(line); } catch (error) { return; }
        if (!row || row.event !== 'message' || !row.message) return;
        let data;
        try { data = JSON.parse(row.message); } catch (error) { return; }
        if (!data || !data.id) return;
        if (now - (data.t || 0) < PRESENCE_WINDOW) {
          alive.add(String(data.id));
          noteSession(data);
        }
      });
      alive.add(myId());
      people = alive;
      paintPeople();
    } catch (error) {
      /* mantém o último valor conhecido */
    }
  }

  /* ---------- chat ---------- */
  function loadChat() {
    const saved = read(STORE_CHAT, []);
    messages = Array.isArray(saved) ? saved.filter(function (item) {
      return item && item.id && typeof item.m === 'string';
    }).slice(-MAX) : [];
  }

  function saveChat() {
    write(STORE_CHAT, messages);
  }

  function merge(incoming) {
    let changed = false;
    const added = [];
    const known = new Set(messages.map(function (item) { return item.id; }));
    (incoming || []).forEach(function (item) {
      if (!item || !item.id || typeof item.m !== 'string') return;
      if (known.has(item.id)) return;
      known.add(item.id);
      const row = {
        id: String(item.id),
        n: String(item.n || 'anônimo').slice(0, 18),
        m: String(item.m).slice(0, 300),
        t: Number(item.t) || Math.floor(Date.now() / 1000),
        k: item.k ? 1 : 0,
        b: item.b ? 1 : 0
      };
      messages.push(row);
      added.push(row);
      changed = true;
    });

    if (!changed) return false;

    messages.sort(function (a, b) { return a.t - b.t; });
    /* o mais novo entra, o mais antigo sai: nunca passa de 100 */
    if (messages.length > MAX) messages = messages.slice(messages.length - MAX);
    saveChat();
    renderChat();
    emit(added);
    return true;
  }

  /* avisa quem estiver ouvindo (painel do criador, avisos no topo) */
  function emit(list) {
    if (!list || !list.length) return;
    listeners.slice().forEach(function (fn) {
      try { fn(list); } catch (error) { /* um ouvinte quebrado não derruba o chat */ }
    });
    try {
      window.dispatchEvent(new CustomEvent('lumin:chat', { detail: { messages: list.slice() } }));
    } catch (error) { /* navegador antigo sem CustomEvent */ }
  }

  function renderChat() {
    if (!list) return;
    const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 60;
    list.textContent = '';

    if (!messages.length) {
      const empty = document.createElement('p');
      empty.className = 'chat__empty';
      empty.textContent = 'Ninguém falou nada ainda. Diga oi.';
      list.append(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    messages.forEach(function (item) {
      const row = document.createElement('div');
      row.className = 'chat__msg' + (item.n === myName() ? ' is-mine' : '') + (item.b ? ' is-broadcast' : '');

      const head = document.createElement('p');
      head.className = 'chat__head';

      const who = document.createElement('span');
      who.className = 'chat__who';
      who.textContent = item.n;
      who.style.setProperty('--h', hueOf(item.n));

      const when = document.createElement('time');
      when.className = 'chat__time';
      when.dateTime = new Date(item.t * 1000).toISOString();
      when.textContent = clock(item.t);

      head.append(who);

      if (item.b) {
        const flag = document.createElement('span');
        flag.className = 'chat__flag';
        flag.textContent = 'aviso';
        head.append(flag);
      }

      head.append(when);

      const body = document.createElement('p');
      body.className = 'chat__text';
      body.textContent = item.m;

      row.append(head, body);
      fragment.append(row);
    });

    list.append(fragment);
    if (atBottom) list.scrollTop = list.scrollHeight;
  }

  function countLabel() {
    return messages.length + '/' + MAX;
  }

  function paintCount() {
    document.querySelectorAll('[data-chat-count]').forEach(function (node) {
      node.textContent = countLabel();
    });
  }

  async function send(text, options) {
    const clean = String(text || '').trim().slice(0, 300);
    if (!clean) return false;
    const name = myName();
    if (!name) return false;
    const broadcast = !!(options && options.broadcast);

    const message = {
      id: uid(),
      n: name.slice(0, 18),
      m: clean,
      t: Math.floor(Date.now() / 1000),
      k: Date.now(),
      b: broadcast ? 1 : 0
    };

    merge([message]);
    paintCount();

    if (channel) {
      try { channel.postMessage(message); } catch (error) {}
    }

    try {
      await fetch(RELAY + '/' + CHAT_TOPIC, {
        method: 'POST',
        body: JSON.stringify({ id: message.id, n: message.n, m: message.m, t: message.t, b: message.b }),
        headers: { 'Content-Type': 'text/plain' },
        cache: 'no-store'
      });
      setStatus('ok');
    } catch (error) {
      setStatus('local');
    }
    return true;
  }

  async function pollChat(force) {
    const now = Date.now();
    if (!force && now - lastPoll < 6000) return;
    lastPoll = now;

    let since = read(STORE_SEEN, 0);
    if (!since) since = Math.floor(now / 1000) - 3600;

    try {
      const response = await fetch(
        RELAY + '/' + CHAT_TOPIC + '/json?poll=1&since=' + since,
        { cache: 'no-store' }
      );
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const text = await response.text();
      const found = [];
      text.split('\n').forEach(function (line) {
        if (!line) return;
        let row;
        try { row = JSON.parse(line); } catch (error) { return; }
        if (!row || row.event !== 'message' || !row.message) return;
        let data;
        try { data = JSON.parse(row.message); } catch (error) { return; }
        if (data && data.id) found.push(data);
      });
      merge(found);
      paintCount();
      write(STORE_SEEN, Math.floor(now / 1000) - 5);
      relayOk = true;
      setStatus('ok');
    } catch (error) {
      relayOk = false;
      setStatus('local');
    }
  }

  function setStatus(state) {
    if (!statusEl) return;
    statusEl.classList.toggle('is-offline', state === 'local');
    statusEl.textContent = state === 'local'
      ? 'modo local: este navegador'
      : 'chat público · 100 mensagens';
  }

  /* ---------- interface ---------- */
  function buildPanel() {
    if (panel) return panel;

    panel = document.createElement('section');
    panel.className = 'chat';
    panel.id = 'chat';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'false');
    panel.setAttribute('aria-labelledby', 'chat-title');
    panel.hidden = true;

    panel.innerHTML = [
      '<header class="chat__top">',
      '  <div>',
      '    <h2 class="chat__title" id="chat-title">Chat global</h2>',
      '    <p class="chat__status" data-chat-status>chat público · 100 mensagens</p>',
      '  </div>',
      '  <div class="chat__top-actions">',
      '    <span class="chat__count" data-chat-count>0/100</span>',
      '    <button class="chat__icon" type="button" data-chat-close aria-label="Fechar o chat">✕</button>',
      '  </div>',
      '</header>',
      '<div class="chat__gate" hidden>',
      '  <p class="chat__gate-text">Escolha um nome para entrar. Sem cadastro, sem senha.</p>',
      '  <form class="chat__gate-form" data-chat-gate>',
      '    <input type="text" maxlength="18" placeholder="Seu nome" aria-label="Seu nome" data-chat-name autocomplete="nickname">',
      '    <button class="chat__send" type="submit">Entrar</button>',
      '  </form>',
      '</div>',
      '<div class="chat__log" data-chat-log aria-live="polite"></div>',
      '<form class="chat__form" data-chat-form>',
      '  <input type="text" maxlength="300" placeholder="Escreva uma mensagem…" aria-label="Mensagem" data-chat-input autocomplete="off">',
      '  <button class="chat__send" type="submit" aria-label="Enviar">Enviar</button>',
      '</form>'
    ].join('');

    document.body.append(panel);

    list = panel.querySelector('[data-chat-log]');
    form = panel.querySelector('[data-chat-form]');
    input = panel.querySelector('[data-chat-input]');
    nameGate = panel.querySelector('.chat__gate');
    nameInput = panel.querySelector('[data-chat-name]');
    statusEl = panel.querySelector('[data-chat-status]');

    panel.querySelector('[data-chat-close]').addEventListener('click', close);
    panel.querySelector('[data-chat-gate]').addEventListener('submit', function (event) {
      event.preventDefault();
      const name = (nameInput.value || '').trim().replace(/\s+/g, ' ').slice(0, 18);
      if (!name) {
        nameInput.focus();
        return;
      }
      setName(name);
      syncGate();
      if (input) input.focus();
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!myName()) {
        syncGate();
        if (nameInput) nameInput.focus();
        return;
      }
      const text = input.value;
      input.value = '';
      send(text);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && opened) close();
    });

    syncGate();
    return panel;
  }

  function syncGate() {
    const has = !!myName();
    if (nameGate) nameGate.hidden = has;
    if (form) form.hidden = !has;
    if (!has && nameInput) nameInput.value = '';
  }

  function open() {
    buildPanel();
    panel.hidden = false;
    opened = true;
    document.documentElement.classList.add('chat-open');
    syncGate();
    paintCount();
    renderChat();
    pollChat(true);
    pollPeople();
    if (myName() && input) setTimeout(function () { input.focus(); }, 60);
    else if (nameInput) setTimeout(function () { nameInput.focus(); }, 60);
  }

  function close() {
    if (!panel) return;
    panel.hidden = true;
    opened = false;
    document.documentElement.classList.remove('chat-open');
  }

  function toggle() {
    if (opened) close();
    else open();
  }

  /* ---------- jogo aberto ---------- */
  function setPlaying(value) {
    playing = !!value;
    document.documentElement.classList.toggle('is-playing', playing);
  }

  /* ---------- cliques globais ---------- */
  document.addEventListener('click', function (event) {
    const openBtn = event.target.closest('[data-chat-open]');
    if (openBtn) {
      event.preventDefault();
      toggle();
      return;
    }
    const closeBtn = event.target.closest('[data-chat-close]');
    if (closeBtn) {
      event.preventDefault();
      close();
    }
  });

  /* ---------- início ---------- */
  function start() {
    loadChat();
    paintCount();
    renderChat();
    syncGate();

    if ('BroadcastChannel' in window) {
      try {
        channel = new BroadcastChannel('luminsdk:chat');
        channel.addEventListener('message', function (event) {
          merge([event.data]);
          paintCount();
        });
      } catch (error) { channel = null; }
    }

    window.addEventListener('lumin:view', function () { heartbeat(); });
    let lastBeat = Date.now();
    window.addEventListener('scroll', function () {
      if (Date.now() - lastBeat < 5000) return;
      lastBeat = Date.now();
      report();
    }, { passive: true });

    window.addEventListener('storage', function (event) {
      if (event.key !== STORE_CHAT) return;
      loadChat();
      renderChat();
      paintCount();
    });

    heartbeat();
    pollPeople();
    pollChat(true);

    setInterval(heartbeat, PRESENCE_MS);
    setInterval(pollPeople, PRESENCE_MS * 2);
    setInterval(function () { if (opened) pollChat(false); }, 8000);
    setInterval(function () { if (!opened) pollChat(false); }, CHAT_IDLE_MS);
    setInterval(paintPeople, 10000);
  }

  window.LuminSocial = {
    open: open,
    close: close,
    toggle: toggle,
    setPlaying: setPlaying,
    send: function (text, options) { return send(text, options); },
    setName: function (name) {
      const clean = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 18);
      if (!clean) return false;
      setName(clean);
      syncGate();
      return clean;
    },
    check: function () { return pollChat(true); },
    onMessage: function (fn) {
      if (typeof fn !== 'function') return function () {};
      listeners.push(fn);
      return function () {
        const at = listeners.indexOf(fn);
        if (at >= 0) listeners.splice(at, 1);
      };
    },
    messages: function () { return messages.slice(); },
    name: myName,
    people: function () { return Math.max(1, people.size); },
    sessions: function () {
      const now = Date.now();
      return Object.keys(sessions).map(function (id) { return sessions[id]; })
        .filter(function (item) { return now - item.seen < PRESENCE_WINDOW * 1000; })
        .sort(function (a, b) { return (b.seen || 0) - (a.seen || 0); });
    },
    snapshot: snapshot,
    report: report,
    me: myId,
    relay: function () { return relayOk; },
    max: MAX
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
