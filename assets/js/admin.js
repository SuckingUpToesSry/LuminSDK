/* =========================================================
   LuminSDK — painel de administração
   · chave de acesso: o texto NUNCA aparece no código. Só existe a
     impressão digital (SHA-256 com sal) e a comparação é feita aqui.
   · uma pessoa por vez: uma "cadeira" com batimento no relé e no
     localStorage; quem não é o dono entra em espera.
   · espectar: lista de sessões ao vivo, espelho de estado e comandos
     (abrir endereço, trocar aba, aviso, chat, forçar estudos).
   Autor: Ryan Smith · Licença MIT
   ========================================================= */
(function () {
  'use strict';

  /* sal + impressão digital (nenhuma senha em texto neste arquivo) */
  const S1 = 'luminsdk::admin::';
  const S2 = '::v1::';
  const PEPPER = 'luminsdk-seat-v1';
  const ITER = 120000;
  const ROUNDS = 4000;

  /* PBKDF2-SHA256 (navegador normal) e SHA-256 iterado (reserva) */
  const PRINT = [
    'db835e0632da5558', '299d872413f7b395', 'c9bf37d9ca7cd8f6', 'ee1b6311770bd5e6'
  ];
  const PRINT_FB = [
    '2523756d63c2e047', '0fc5789c53d0a96b', 'd592fdb8d36f6c87', '768c72cd0da52adf'
  ];

  const STORE_OK = 'luminsdk:v1:admin:ok';
  const STORE_SEAT = 'luminsdk:v1:admin:seat';
  const SEAT_TOPIC = 'luminsdk_seat_5c1a9d27';
  const SEAT_MS = 8000;
  const SEAT_WINDOW = 26000;

  let panel = null;
  let gate = null;
  let target = null;
  let seatTimer = null;
  let renderTimer = null;
  let me = '';
  let owner = false;
  let relayState = '—';

  /* ---------- utilidades ---------- */
  function $(id) { return document.getElementById(id); }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function myId() {
    if (me) return me;
    me = (window.LuminSocial && window.LuminSocial.me) ? window.LuminSocial.me() : 'local';
    return me;
  }

  /* ---------- SHA-256 (WebCrypto + queda para JS puro) ---------- */
  function sha256Fallback(text) {
    function rightRotate(value, amount) {
      return (value >>> amount) | (value << (32 - amount));
    }
    const mathPow = Math.pow;
    const maxWord = mathPow(2, 32);
    let result = '';
    const words = [];
    const asciiBitLength = text.length * 8;
    const hash = (sha256Fallback.h = sha256Fallback.h || []);
    const k = (sha256Fallback.k = sha256Fallback.k || []);
    let primeCounter = k.length;
    const isComposite = {};
    for (let candidate = 2; primeCounter < 64; candidate += 1) {
      if (!isComposite[candidate]) {
        for (let i = 0; i < 313; i += candidate) isComposite[i] = candidate;
        hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
        primeCounter += 1;
      }
    }
    let ascii = unescape(encodeURIComponent(text));
    ascii += '\x80';
    while (ascii.length % 64 - 56) ascii += '\x00';
    for (let i = 0; i < ascii.length; i += 1) {
      words[i >> 2] |= ascii.charCodeAt(i) << ((3 - i) % 4) * 8;
    }
    words[words.length] = ((asciiBitLength / maxWord) | 0);
    words[words.length] = asciiBitLength;

    let h = hash.slice(0);
    for (let j = 0; j < words.length; j += 16) {
      const w = words.slice(j, j + 16);
      const oldHash = h.slice(0);
      for (let i = 0; i < 64; i += 1) {
        const w15 = w[i - 15];
        const w2 = w[i - 2];
        const a = h[0];
        const e = h[4];
        const temp1 = h[7] +
          (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
          ((e & h[5]) ^ (~e & h[6])) + k[i] +
          (w[i] = i < 16 ? w[i] : (
            w[i - 16] + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
            w[i - 7] + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10)) | 0
          ));
        const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
          ((a & h[1]) ^ (a & h[2]) ^ (h[1] & h[2]));
        h = [(temp1 + temp2) | 0].concat(h);
        h[4] = (h[4] + temp1) | 0;
      }
      for (let i = 0; i < 8; i += 1) h[i] = (h[i] + oldHash[i]) | 0;
    }
    for (let i = 0; i < 8; i += 1) {
      for (let j = 3; j + 1; j -= 1) {
        const byte = (h[i] >> (j * 8)) & 255;
        result += ((byte < 16) ? '0' : '') + byte.toString(16);
      }
    }
    return result;
  }

  function hex(buffer) {
    return Array.prototype.map.call(new Uint8Array(buffer), function (byte) {
      return byte.toString(16).padStart(2, '0');
    }).join('');
  }

  async function keyMatches(text) {
    const material = S1 + text + S2;
    if (window.crypto && window.crypto.subtle && window.crypto.subtle.importKey) {
      try {
        const encoder = new TextEncoder();
        const base = await window.crypto.subtle.importKey(
          'raw', encoder.encode(material), 'PBKDF2', false, ['deriveBits']
        );
        const bits = await window.crypto.subtle.deriveBits({
          name: 'PBKDF2',
          salt: encoder.encode(PEPPER),
          iterations: ITER,
          hash: 'SHA-256'
        }, base, 256);
        return hex(bits) === PRINT.join('');
      } catch (error) { /* cai para o caminho de reserva */ }
    }
    let digest = await sha256FallbackHex(material);
    for (let i = 1; i < ROUNDS; i += 1) {
      digest = sha256FallbackHex(digest);
    }
    return digest === PRINT_FB.join('');
  }

  function sha256FallbackHex(text) {
    return sha256Fallback(text);
  }

  /* ---------- cadeira única ---------- */
  function readSeat() {
    try {
      return JSON.parse(localStorage.getItem(STORE_SEAT) || 'null');
    } catch (error) {
      return null;
    }
  }

  function writeSeat(data) {
    try {
      if (data) localStorage.setItem(STORE_SEAT, JSON.stringify(data));
      else localStorage.removeItem(STORE_SEAT);
    } catch (error) {}
  }

  function claimedAt() {
    try {
      let since = Number(sessionStorage.getItem('luminsdk:v1:admin:since') || 0);
      if (!since) {
        since = Date.now();
        sessionStorage.setItem('luminsdk:v1:admin:since', String(since));
      }
      return since;
    } catch (error) {
      return Date.now();
    }
  }

  async function claimSeat() {
    const now = Date.now();
    const payload = { id: myId(), since: claimedAt(), ts: now };
    writeSeat(payload);
    syncSeatChip('você');
    try {
      await fetch(RELAY() + '/' + SEAT_TOPIC, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'text/plain' },
        cache: 'no-store'
      });
      relayState = 'relé ok';
    } catch (error) {
      relayState = 'só este navegador';
    }
  }

  function RELAY() { return 'https://ntfy.sh'; }

  async function checkSeat() {
    /* dono = quem está na cadeira há menos de 26 s, com o menor id */
    const local = readSeat();
    let alive = [];
    try {
      const response = await fetch(
        RELAY() + '/' + SEAT_TOPIC + '/json?poll=1&since=' + Math.floor((Date.now() - SEAT_WINDOW) / 1000),
        { cache: 'no-store' }
      );
      if (response.ok) {
        const text = await response.text();
        text.split('\n').forEach(function (line) {
          if (!line) return;
          let row;
          try { row = JSON.parse(line); } catch (error) { return; }
          if (!row || row.event !== 'message' || !row.message) return;
          let data;
          try { data = JSON.parse(row.message); } catch (error) { return; }
          if (data && data.id && Date.now() - (data.ts || 0) < SEAT_WINDOW) alive.push(data);
        });
      }
      relayState = 'relé ok';
    } catch (error) {
      relayState = 'só este navegador';
    }
    if (local && Date.now() - (local.ts || 0) < SEAT_WINDOW) alive.push(local);
    alive.push({ id: myId(), ts: Date.now() });

    /* um único registro por id; a cadeira é de quem chegou primeiro */
    const unique = {};
    alive.forEach(function (item) {
      const key = item.id;
      if (!unique[key] || (item.ts || 0) < (unique[key].ts || 0)) unique[key] = item;
    });
    const holder = Object.keys(unique).sort(function (a, b) {
      const diff = (unique[a].since || unique[a].ts || 0) - (unique[b].since || unique[b].ts || 0);
      return diff !== 0 ? diff : a.localeCompare(b);
    })[0];
    owner = holder === myId();

    syncSeatChip(owner ? 'você' : 'em uso por outra pessoa');
    if (gate) gate.classList.toggle('is-waiting', !owner && panelIsOpen());

    /* só um administrador por vez: se a cadeira é de outra pessoa,
       este painel fecha e volta para a porta com o aviso */
    if (!owner && panelIsOpen()) {
      lock();
      const msg = $('adm-msg');
      if (msg) {
        msg.textContent = 'O painel está em uso por outra pessoa. Tente de novo em instantes.';
        msg.className = 'adm-msg is-bad';
      }
      log('cadeira tomada por outra sessão');
    }
    return owner;
  }

  function syncSeatChip(text) {
    const chip = $('adm-seat');
    if (chip) {
      chip.textContent = 'cadeira: ' + text;
      chip.dataset.state = owner ? 'mine' : 'other';
    }
    const channel = $('adm-channel');
    if (channel) channel.textContent = relayState;
  }

  /* ---------- panel ---------- */
  function panelIsOpen() {
    return panel && !panel.hidden;
  }

  function unlock() {
    try { sessionStorage.setItem(STORE_OK, '1'); } catch (error) {}
    if (gate) gate.hidden = true;
    if (panel) panel.hidden = false;
    const lock = $('adm-lock');
    if (lock) lock.hidden = false;
    claimSeat();
    render();
    startLoops();
    log('painel aberto por você');
  }

  function lock() {
    try {
      sessionStorage.removeItem(STORE_OK);
      sessionStorage.removeItem('luminsdk:v1:admin:since');
    } catch (error) {}
    writeSeat(null);
    owner = false;
    if (panel) panel.hidden = true;
    if (gate) gate.hidden = false;
    const lockBtn = $('adm-lock');
    if (lockBtn) lockBtn.hidden = true;
    const key = $('adm-key');
    if (key) key.value = '';
    stopLoops();
    log('painel fechado');
  }

  function startLoops() {
    stopLoops();
    seatTimer = setInterval(claimSeat, SEAT_MS);
    renderTimer = setInterval(render, 2500);
    claimSeat();
  }

  function stopLoops() {
    clearInterval(seatTimer);
    clearInterval(renderTimer);
    seatTimer = null;
    renderTimer = null;
  }

  /* ---------- log ---------- */
  function log(text) {
    const box = $('adm-log');
    if (!box) return;
    const item = el('li');
    const time = new Date();
    item.innerHTML = '<span>' + String(time.getHours()).padStart(2, '0') + ':' +
      String(time.getMinutes()).padStart(2, '0') + ':' +
      String(time.getSeconds()).padStart(2, '0') + '</span>';
    item.append(document.createTextNode(text));
    box.prepend(item);
    while (box.children.length > 40) box.lastChild.remove();
  }

  /* ---------- sessões ---------- */
  function sessions() {
    if (!window.LuminSocial || typeof window.LuminSocial.sessions !== 'function') return [];
    return window.LuminSocial.sessions();
  }

  function renderPeople() {
    const list = $('adm-people');
    const count = $('adm-count');
    if (!list) return;

    const people = sessions();
    if (count) count.textContent = String(people.length);
    list.textContent = '';

    if (!people.length) {
      list.append(el('li', 'adm-person adm-person--empty', 'Ninguém visível agora.'));
      return;
    }

    people.forEach(function (person) {
      const item = el('li', 'adm-person' + (target && target.id === person.id ? ' is-on' : ''));
      const button = el('button', 'adm-person__btn');
      button.type = 'button';

      const dot = el('span', 'adm-person__dot');
      dot.dataset.playing = person.g ? '1' : '0';

      const info = el('span', 'adm-person__info');
      info.append(el('span', 'adm-person__name', person.me ? 'você' : (person.n || 'visitante')));
      info.append(el('span', 'adm-person__meta',
        (person.l || '—') + (person.g ? ' · ' + person.g : '') + ' · ' + (person.seen ? 'agora' : '')));

      button.append(dot, info);
      button.addEventListener('click', function () {
        target = person;
        render();
        log('espectando ' + (person.me ? 'você' : (person.n || 'visitante')));
      });
      item.append(button);
      list.append(item);
    });
  }

  function renderMirror() {
    const tab = $('adm-mirror-tab');
    const heading = $('adm-mirror-heading');
    const meta = $('adm-mirror-meta');
    const title = $('adm-target');
    const live = $('adm-live');
    if (!tab) return;

    if (!target) {
      if (title) title.textContent = 'Ninguém selecionado';
      tab.textContent = '—';
      heading.textContent = 'Escolha alguém na lista';
      meta.textContent = '';
      if (live) live.hidden = true;
      return;
    }

    /* atualiza o alvo com o retrato mais recente */
    const fresh = sessions().filter(function (person) { return person.id === target.id; })[0];
    if (fresh) target = fresh;

    const name = target.me ? 'você' : (target.n || 'visitante');
    if (title) title.textContent = 'Tela de ' + name;
    if (live) live.hidden = false;

    tab.textContent = (target.l || '—') + (target.g ? ' · ' + target.g : '');
    heading.textContent = target.h || 'sem título visível';
    const parts = [];
    parts.push('aba: ' + (target.l || '—'));
    if (target.g) parts.push('jogo: ' + target.g);
    if (target.u) parts.push('endereço: ' + target.u.replace(/^https?:\/\//, '').slice(0, 48));
    parts.push('rolagem: ' + (target.s || 0) + '%');
    parts.push('visto: ' + new Date(target.seen || Date.now()).toLocaleTimeString('pt-BR'));
    meta.textContent = parts.join(' · ');
  }

  function render() {
    checkSeat();
    renderPeople();
    renderMirror();
    const meNode = $('adm-me');
    if (meNode) meNode.textContent = myId().slice(-6);
    const sync = $('adm-sync');
    if (sync) sync.textContent = new Date().toLocaleTimeString('pt-BR');
  }

  /* ---------- comandos ---------- */
  async function send(cmd, arg, label) {
    if (!target) {
      log('escolha uma pessoa primeiro');
      return;
    }
    if (!owner) {
      log('a cadeira está com outra pessoa: só quem está nela pode mandar');
      return;
    }
    const name = target.me ? 'você' : (target.n || 'visitante');
    let sent = false;
    if (window.LuminSocial && typeof window.LuminSocial.command === 'function') {
      sent = await window.LuminSocial.command(target.id, cmd, arg);
    }
    log((sent === false ? 'tentou (sem relé) ' : '') + (label || cmd) + ' → ' + name);
  }

  /* ---------- eventos ---------- */
  function bind() {
    gate = $('adm-gate');
    panel = $('adm-panel');

    const form = $('adm-form');
    const key = $('adm-key');
    const msg = $('adm-msg');
    let attempts = 0;

    if (form && key) {
      form.addEventListener('submit', async function (event) {
        event.preventDefault();
        const submit = $('adm-submit');
        if (submit && submit.disabled) return;
        if (submit) submit.disabled = true;
        const ok = await keyMatches(key.value);
        if (submit) submit.disabled = false;

        if (ok) {
          key.value = '';
          if (msg) { msg.textContent = 'Chave aceita.'; msg.className = 'adm-msg is-ok'; }
          log('chave aceita');
          unlock();
          return;
        }

        attempts += 1;
        if (msg) {
          msg.textContent = attempts >= 3
            ? 'Chave incorreta. Tentativas seguidas ficam mais lentas.'
            : 'Chave incorreta.';
          msg.className = 'adm-msg is-bad';
        }
        key.value = '';
        key.focus();
        if (attempts >= 3) {
          key.disabled = true;
          setTimeout(function () { key.disabled = false; }, 4000);
        }
      });
    }

    const lockBtn = $('adm-lock');
    if (lockBtn) lockBtn.addEventListener('click', function () { lock(); });

    const sendUrl = $('adm-send-url');
    if (sendUrl) {
      sendUrl.addEventListener('click', function () {
        const field = $('adm-url');
        if (!field || !field.value.trim()) {
          log('digite um endereço');
          return;
        }
        send('open', field.value.trim(), 'abrir ' + field.value.trim().slice(0, 40));
        field.value = '';
      });
    }

    const sendView = $('adm-send-view');
    if (sendView) {
      sendView.addEventListener('click', function () {
        const select = $('adm-view');
        if (!select) return;
        send('go', select.value, 'trocar para ' + select.value);
      });
    }

    const sendMsg = $('adm-send-msg');
    if (sendMsg) {
      sendMsg.addEventListener('click', function () {
        const field = $('adm-msg-input');
        if (!field || !field.value.trim()) {
          log('escreva um aviso');
          return;
        }
        send('msg', field.value.trim(), 'aviso: ' + field.value.trim().slice(0, 32));
        field.value = '';
      });
    }

    document.querySelectorAll('[data-cmd]').forEach(function (button) {
      button.addEventListener('click', function () {
        const cmd = button.dataset.cmd;
        send(cmd, '', ({ chat: 'abrir chat', study: 'forçar estudos', reload: 'recarregar' })[cmd] || cmd);
      });
    });

    /* se a sessão já estava liberada, volta direto para o painel */
    let open = false;
    try { open = sessionStorage.getItem(STORE_OK) === '1'; } catch (error) {}
    if (open) {
      if (gate) gate.hidden = true;
      if (panel) panel.hidden = false;
      const lockButton = $('adm-lock');
      if (lockButton) lockButton.hidden = false;
      claimSeat();
      startLoops();
      render();
    }
  }

  function init() {
    if (!document.getElementById('view-admin')) return;
    bind();
    syncSeatChip('livre');
  }

  window.LuminAdmin = {
    sessions: sessions,
    open: unlock,
    lock: lock,
    owner: function () { return owner; }
  };

  window.addEventListener('lumin:view', function () {
    if (document.documentElement.getAttribute('data-view') === 'admin') init();
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
