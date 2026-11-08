const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, '../assets/js/game-tab.js'), 'utf8');
const library = readFileSync(join(__dirname, '../assets/js/library.js'), 'utf8');
const handler = library.slice(library.indexOf('  function openGameInNewTab() {'), library.indexOf('  async function shareGame'));

function boot(options = {}) {
  const opened = [];
  const writes = [];
  const nodes = [];
  const element = (tag) => ({
    tag, attrs: {}, hidden: false,
    setAttribute(name, value) { this.attrs[name] = value; },
    addEventListener() {},
    append(...children) { nodes.push(...children); }
  });
  const doc = {
    head: element('head'), body: element('body'),
    createElement: element, open() {}, close() {},
    write(html) {
      if (options.writeFails) throw new Error('write failed');
      writes.push(html);
    }
  };
  const popup = {
    document: doc, opener: {}, closed: false,
    location: { href: 'about:blank', replace() { throw new Error('must not navigate the tab'); } },
    close() { this.closed = true; }
  };
  const window = {
    open(url, target) {
      opened.push([url, target]);
      if (options.throws) throw new Error('blocked');
      return options.blocked ? null : popup;
    }
  };
  vm.runInNewContext(source, {
    window, document: { baseURI: 'https://suckinguptoessry.github.io/LuminSDK/' }, URL
  });
  return { api: window.LuminGameTab, popup, nodes, opened, writes };
}

test('opens the game only in a fullscreen iframe inside about:blank', () => {
  const state = boot();
  assert.equal(state.api.open('https://games.example/play?a=1#level', 'Meu jogo'), true);
  assert.deepEqual(state.opened, [['about:blank', '_blank']]);
  assert.equal(state.popup.location.href, 'about:blank');
  assert.equal(state.popup.opener, null);
  assert.equal(state.popup.document.title, 'Meu jogo');
  const frame = state.nodes.find(node => node.tag === 'iframe');
  assert.equal(frame.src, 'https://games.example/play?a=1#level');
  assert.equal(frame.title, 'Meu jogo');
  assert.equal(frame.hidden, false);
  assert.equal(frame.attrs.referrerpolicy, 'no-referrer');
  assert.equal(frame.attrs.allowfullscreen, '');
  assert.match(frame.attrs.allow, /fullscreen/);
  assert.match(frame.attrs.allow, /gamepad/);
  assert.match(frame.attrs.sandbox, /allow-pointer-lock/);
  assert.doesNotMatch(frame.attrs.sandbox, /allow-top-navigation/);
  assert.equal(state.nodes.find(node => node.tag === 'p').hidden, true);
});

test('reserves a popup before asynchronously receiving the URL', () => {
  const state = boot();
  const tab = state.api.create('Carregando');
  assert.equal(state.opened.length, 1);
  const frame = state.nodes.find(node => node.tag === 'iframe');
  assert.equal(frame.src, undefined);
  assert.equal(frame.hidden, true);
  assert.equal(tab.setUrl('https://games.example/ready'), true);
  assert.equal(frame.src, 'https://games.example/ready');
});

test('does not interpolate the game title into HTML', () => {
  const state = boot();
  const title = '<img src=x onerror=alert(1)>';
  state.api.open('https://games.example/', title);
  assert.equal(state.popup.document.title, title);
  assert.ok(state.writes.every(html => !html.includes(title)));
  assert.equal(state.nodes.find(node => node.tag === 'iframe').title, title);
});

for (const url of ['', '   ', 'javascript:alert(1)', 'data:text/html,hello', 'file:///tmp/game.html', 'about:blank']) {
  test('rejects an empty or unsafe game URL: ' + JSON.stringify(url), () => {
    const state = boot();
    assert.equal(state.api.open(url, 'Jogo'), false);
    assert.equal(state.popup.closed, true);
    assert.equal(state.opened.length, 1, 'must never fall back to a direct tab');
  });
}

for (const options of [{ blocked: true }, { throws: true }, { writeFails: true }]) {
  test('returns failure without navigating the original page: ' + JSON.stringify(options), () => {
    const state = boot(options);
    assert.equal(state.api.open('https://games.example/', 'Jogo'), false);
    assert.equal(state.popup.location.href, 'about:blank');
  });
}

test('does not reopen a game tab the user closed while waiting for its URL', () => {
  const state = boot();
  const tab = state.api.create('Jogo');
  state.popup.closed = true;
  assert.equal(tab.setUrl('https://games.example/'), false);
  assert.equal(state.opened.length, 1);
});

function libraryHandler(options = {}) {
  const events = [];
  const urls = [];
  const messages = [];
  const game = options.game === undefined ? { id: 'sdk/1', name: 'Teste' } : options.game;
  const tab = {
    setUrl(url) { urls.push(url); return !!url; },
    close() { events.push('close'); }
  };
  const window = {
    LuminGameTab: { create(title) { events.push('create:' + title); return options.blocked ? null : tab; } },
    Lumin: { getGameUrl(id) {
      events.push('sdk:' + id);
      if (options.syncThrow) throw new Error('SDK error');
      return options.result === undefined ? Promise.resolve({ url: 'https://games.example/fresh' }) : options.result;
    } }
  };
  const context = {
    window, state: { currentGame: game },
    expectedFrameSrc: options.reuse || '', CONFIG: { requestTimeout: 25 },
    hasSdk: () => !options.noSdk,
    withTimeout: promise => promise,
    customSource: () => options.custom || null,
    tobyFor: () => options.toby || '',
    toast: message => messages.push(message)
  };
  vm.runInNewContext(handler + '\nopenGameInNewTab();', context);
  return { events, urls, messages, context };
}

const flush = () => new Promise(resolve => setImmediate(resolve));

test('Lumin reserves the tab in the click before requesting a fresh SDK URL', async () => {
  const state = libraryHandler();
  assert.deepEqual(state.events, ['create:Teste']);
  await flush();
  assert.deepEqual(state.events, ['create:Teste', 'sdk:sdk/1']);
  assert.deepEqual(state.urls, ['https://games.example/fresh']);
});

test('Lumin accepts a string SDK result', async () => {
  const state = libraryHandler({ result: Promise.resolve('https://games.example/string') });
  await flush();
  assert.deepEqual(state.urls, ['https://games.example/string']);
});

for (const syncThrow of [true, false]) {
  test('Lumin reuses the captured player URL after SDK failure; synchronous throw: ' + syncThrow, async () => {
    const state = libraryHandler({
      reuse: 'https://games.example/reuse', syncThrow,
      result: { then(resolve, reject) { reject(new Error('offline')); } }
    });
    state.context.expectedFrameSrc = 'https://games.example/different-game';
    await flush();
    assert.deepEqual(state.urls, ['https://games.example/reuse']);
  });
}

test('Lumin preserves custom game sources instead of opening a different SDK URL', () => {
  const state = libraryHandler({ custom: { url: 'https://toby.example/game' } });
  assert.deepEqual(state.events, ['create:Teste']);
  assert.deepEqual(state.urls, ['https://toby.example/game']);
});

test('Lumin uses the local GN-Math URL, including game id zero', () => {
  const state = libraryHandler({ game: { id: 0, name: 'Bowmasters', url: 'https://games.example/0.html' } });
  assert.deepEqual(state.urls, ['https://games.example/0.html']);
});

test('Lumin does not call the SDK when a popup is blocked', async () => {
  const state = libraryHandler({ blocked: true });
  await flush();
  assert.deepEqual(state.events, ['create:Teste']);
  assert.deepEqual(state.urls, []);
  assert.match(state.messages[0], /pop-ups/);
});

test('Lumin closes an unused tab when no URL can be resolved', async () => {
  const state = libraryHandler({ noSdk: true });
  await flush();
  assert.deepEqual(state.events, ['create:Teste', 'close']);
  assert.match(state.messages[0], /Não foi possível/);
});

test('the single-file edition embeds the helper before the library without an external helper request', () => {
  const html = readFileSync(join(__dirname, '../single/index.html'), 'utf8');
  assert.doesNotMatch(html, /<script src="assets\/js\/game-tab\.js/);
  assert.ok(html.indexOf('window.LuminGameTab =') < html.indexOf('function openGameInNewTab()'));
  assert.ok(html.includes(source.trim()));
});

test('only public raw HTML file hosts use HTML rendering, not ordinary websites or binaries', () => {
  const {api}=boot();
  for (const url of ['https://cdn.jsdelivr.net/gh/owner/repo@main/game.html','https://fastly.jsdelivr.net/gh/owner/repo@main/game.htm','https://raw.githubusercontent.com/owner/repo/main/game.html','https://raw.githack.com/owner/repo/main/game.html','https://cdn.statically.io/gh/owner/repo/main/game.html']) assert.equal(api.isRawHTML(new URL(url)),true,url);
  for (const url of ['https://example.com/game.html','https://script.google.com/macros/s/id/exec','https://github.com/owner/repo/blob/main/game.html','https://cdn.jsdelivr.net/gh/owner/repo@main/game.zip','http://cdn.jsdelivr.net/gh/owner/repo@main/game.html','https://cdn.jsdelivr.net.evil.example/gh/owner/repo@main/game.html']) assert.equal(api.isRawHTML(new URL(url)),false,url);
});

const MULTIPART_FIXTURE = [
  '<!doctype html><html lang="en"><head><title>Granny</title></head><body>',
  '<div id="loading-text">LOADING...</div>',
  '<script>',
  'var mbTotal = "567.86";',
  'async function mergeFiles(fileParts, cacheKey) { const b = await Promise.all(fileParts.map(p => fetch(p))); return URL.createObjectURL(new Blob(b)); }',
  'function getParts(file, start, end) { let parts = []; for (let i = start; i <= end; i++) parts.push(file + ".part" + i); return parts; }',
  'mergeFiles(getParts("Build/GrannyPortButBetter.data.unityweb", 1, 29), "GrannyPortButBetter.data.unityweb");',
  '</script></body></html>'
].join('\n');

test('a montagem em 29 partes vira download sequencial direto para Blob (fim do pico de 1,2 GB)', () => {
  const { api } = boot();
  const out = api.prepareHTML(MULTIPART_FIXTURE, 'https://cdn.jsdelivr.net/gh/freebuisness/html@main/90-fix3.html');
  assert.ok(out.includes('__lumLeanMerge("Build/GrannyPortButBetter.data.unityweb",1,29,"567.86")'), 'chama a montagem leve com o mesmo arquivo e o mesmo total');
  assert.ok(!out.includes('mergeFiles(getParts('), 'o Promise.all das 29 partes não é mais chamado');
  assert.ok(out.indexOf('var __lumLeanMerge=') > out.indexOf('<head>'), 'o helper entra depois do <head>');
  assert.equal(out.split('<script').length, out.split('</script>').length, 'todo <script> injetado é fechado');
  assert.match(out, /await fetch\(parts\[position\]\)/, 'uma parte por vez, em ordem');
  assert.match(out, /new Blob\(blobs\)/, 'as partes viram um Blob (disco), não buffers no heap');
  assert.ok(!/Promise\.all\(/.test(out.slice(out.indexOf('var __lumLeanMerge='), out.indexOf('<\/script>'))), 'sem paralelismo de 29 downloads');
});

test('HTML sem download em partes não é tocado', () => {
  const { api } = boot();
  const plain = '<!doctype html><html><head><title>x</title></head><body><canvas></canvas></body></html>';
  assert.equal(api.prepareHTML(plain, 'https://cdn.jsdelivr.net/gh/o/r@main/g.html'), plain);
});

test('reconhece o pacote gigante e calcula o pico antes de baixar', () => {
  const { api } = boot();
  const granny = api.heavyNeeds(MULTIPART_FIXTURE);
  assert.equal(granny.mb, 567.86);
  assert.equal(granny.parts, 29);
  assert.ok(granny.peakMB > 1200, 'pico estimado passa de 1,2 GB');
  assert.equal(api.heavyNeeds('<html><body>jogo normal</body></html>'), null);
  assert.equal(api.heavyNeeds('var mbTotal = "40.5";'), null, 'jogo de 40 MB não é avisado');
  assert.ok(api.heavyNeeds('var mbTotal = "301";'), 'a partir de 300 MB avisa');
});
