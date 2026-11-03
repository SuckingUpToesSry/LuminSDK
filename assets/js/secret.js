/* =========================================================
   LuminSDK — sala secreta  ·  NÃO EDITE OS NÚMEROS
   Um bloco de recados que só abre com o código certo, digitado letra
   por letra. O código NÃO está escrito neste arquivo: aqui só vive um
   verificador matemático (PBKDF2+SHA-256) — pelo F12 dá para ver este
   texto, mas não dá para extrair o código dele. As mensagens ficam no
   navegador CIFRADAS (AES-GCM) com chave derivada do código: sem ele,
   o que aparece no console é só ruído.

   Como abrir:
   · teclado: digite o código, letra por letra, em qualquer tela
   · celular: 5 toques seguidos no cantinho inferior direito da tela
     (área invisível) e digite o código na caixinha que aparece
   ========================================================= */
(function () {
  'use strict';

  if (!window.crypto || !window.crypto.subtle || !window.TextEncoder) return;

  const SALT_V = 'ae51c0de77f2014badb02e9c4c31a8d4';
  const SALT_K = '3f9b7d12c4e8a655019fd2c87b3e6a10';
  const VERIFIER = 'e1409152059d34e942d2d75278702602613cb501cb9bdbd3d6033a2af6893327';
  const ITER = 120000;
  const STORE = 'luminsdk:sc:v1';
  const MAXLEN = 5;        /* tamanho do código */

  let key = null;          /* CryptoKey só em memória, some ao trancar */
  let room = null;         /* o dialog, criado só depois de abrir */


  /* ---------- utilidades ---------- */
  function hexToBytes(hex) {
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
    return out;
  }
  function bytesToHex(buf) {
    return Array.prototype.map.call(new Uint8Array(buf), function (b) {
      return ('0' + b.toString(16)).slice(-2);
    }).join('');
  }
  function b64(buf) {
    let s = '';
    const a = new Uint8Array(buf);
    for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
    return btoa(s);
  }
  function unb64(str) {
    const s = atob(str);
    const a = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
    return a;
  }

  async function derive(code, saltHex, usages) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveBits', 'deriveKey']);
    if (usages) {
      return crypto.subtle.deriveKey(
        { name: 'PBKDF2', hash: 'SHA-256', salt: hexToBytes(saltHex), iterations: ITER },
        base, { name: 'AES-GCM', length: 256 }, false, usages
      );
    }
    return crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: hexToBytes(saltHex), iterations: ITER },
      base, 256
    );
  }

  async function check(code) {
    const bits = await derive(code, SALT_V, null);
    const hash = bytesToHex(await crypto.subtle.digest('SHA-256', bits));
    return hash === VERIFIER;
  }

  async function loadMessages() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (error) { raw = null; }
    if (!raw || !raw.iv || !raw.data) return [];
    try {
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(raw.iv) }, key, unb64(raw.data));
      const list = JSON.parse(new TextDecoder().decode(plain));
      return Array.isArray(list) ? list : [];
    } catch (error) { return []; }
  }

  async function saveMessages(list) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv }, key,
      new TextEncoder().encode(JSON.stringify(list))
    );
    try { localStorage.setItem(STORE, JSON.stringify({ iv: b64(iv), data: b64(data) })); } catch (error) {}
  }

  /* ---------- a sala (DOM só existe enquanto aberta) ---------- */
  function esc(text) {
    return String(text).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function render(list) {
    const feed = room ? room.querySelector('.sc-feed') : null;
    if (!feed) return;
    if (!list.length) {
      feed.innerHTML = '<p class="sc-empty">Nada por aqui ainda. Escreva o primeiro recado.</p>';
      return;
    }
    feed.innerHTML = list.map(function (m) {
      const when = new Date(m.t);
      const stamp = when.toLocaleDateString('pt-BR') + ' ' +
        when.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return '<div class="sc-msg"><p>' + esc(m.x) + '</p><small>' + stamp + '</small></div>';
    }).join('');
    feed.scrollTop = feed.scrollHeight;
  }

  async function openRoom() {
    if (room) { try { room.showModal(); } catch (error) {} return; }
    room = document.createElement('dialog');
    room.className = 'sc-room';
    room.innerHTML =
      '<div class="sc-head"><strong>Sala secreta</strong>' +
      '<span class="sc-actions">' +
      '<button type="button" class="sc-wipe" title="Apagar tudo">Apagar</button>' +
      '<button type="button" class="sc-lock">Trancar</button></span></div>' +
      '<div class="sc-feed" aria-live="polite"></div>' +
      '<form class="sc-form"><input class="sc-input" type="text" maxlength="500" ' +
      'placeholder="Escreva um recado…" autocomplete="off">' +
      '<button class="sc-send" type="submit">Enviar</button></form>';
    document.body.appendChild(room);

    room.querySelector('.sc-lock').addEventListener('click', lock);
    room.addEventListener('cancel', function (event) { event.preventDefault(); lock(); });
    room.querySelector('.sc-wipe').addEventListener('click', async function () {
      if (!window.confirm('Apagar todos os recados?')) return;
      await saveMessages([]);
      render([]);
    });
    room.querySelector('.sc-form').addEventListener('submit', async function (event) {
      event.preventDefault();
      const input = room.querySelector('.sc-input');
      const text = (input.value || '').trim();
      if (!text) return;
      input.value = '';
      const list = await loadMessages();
      list.push({ t: Date.now(), x: text });
      await saveMessages(list);
      render(list);
    });

    try { room.showModal(); } catch (error) {}
    render(await loadMessages());
  }

  function lock() {
    key = null;
    if (room) {
      try { room.close(); } catch (error) {}
      room.remove();
      room = null;      /* o DOM some: o F12 volta a não ter o que ler */
    }
  }

  /* as tentativas entram numa fila: digitando rápido, os "quase códigos"
     que se formam no caminho não engolem a tentativa verdadeira */
  let queue = Promise.resolve(false);
  function unlock(code) {
    const attempt = queue.then(async function () {
      if (key) { await openRoom(); return true; }
      if (!(await check(code))) return false;
      key = await derive(code, SALT_K, ['encrypt', 'decrypt']);
      await openRoom();
      return true;
    }).catch(function () { return false; });
    queue = attempt.then(function () {}, function () {});
    return attempt;
  }

  /* ---------- gatilho 1: o código digitado letra por letra ---------- */
  let tail = '';
  document.addEventListener('keydown', function (event) {
    const k = event.key || '';
    if (k.length !== 1) return;          /* só caracteres imprimíveis */
    tail = (tail + k).slice(-MAXLEN);
    if (tail.length === MAXLEN && !key) {
      const typed = tail;
      unlock(typed).then(function (ok) { if (ok) tail = ''; });
    }
  }, true);

  /* ---------- gatilho 2 (celular): 5 toques no canto inferior direito.
     Nenhum elemento é criado para isso — só coordenadas, invisível. ---------- */
  let taps = [];
  document.addEventListener('pointerdown', function (event) {
    const nearCorner =
      event.clientX > window.innerWidth - 90 &&
      event.clientY > window.innerHeight - 90;
    if (!nearCorner) { taps = []; return; }
    const now = Date.now();
    taps = taps.filter(function (t) { return now - t < 2600; });
    taps.push(now);
    if (taps.length >= 5) {
      taps = [];
      askCode();
    }
  }, true);

  /* caixinha discreta para digitar o código no celular */
  function askCode() {
    if (key) { openRoom(); return; }
    let box = document.getElementById('sc-ask');
    if (box) { box.showModal(); return; }
    box = document.createElement('dialog');
    box.id = 'sc-ask';
    box.className = 'sc-ask';
    box.innerHTML =
      '<form method="dialog" class="sc-ask__form">' +
      '<input class="sc-ask__input" type="password" inputmode="text" maxlength="12" ' +
      'placeholder="…" autocomplete="off" autocapitalize="off" spellcheck="false">' +
      '<button type="submit" hidden></button></form>';
    document.body.appendChild(box);
    const input = box.querySelector('.sc-ask__input');
    box.querySelector('form').addEventListener('submit', function () {
      const typed = input.value || '';
      input.value = '';
      unlock(typed).then(function (ok) {
        if (ok) { box.remove(); }
      });
    });
    box.addEventListener('close', function () {
      input.value = '';
      window.setTimeout(function () { if (box && !box.open && !key) box.remove(); }, 50);
    });
    try { box.showModal(); } catch (error) {}
    try { input.focus(); } catch (error) {}
  }
})();
