const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { createHash } = require('node:crypto');
const read = name => readFileSync(join(__dirname,'..',name),'utf8');
const data = JSON.parse(read('assets/data/mgs.json'));
const ids = ['HVLL6YBBC5','V9KM79NFHC','J4JXSS9W3N','GEMXRNAA6W','HUZSGDFGGP'];
test('MGS preserves the exact five original mirrors without claiming complete extraction', () => {
  assert.equal(data.coverage,'partial');
  assert.match(data.coverageNote,/Não é uma extração completa/);
  assert.deepEqual(data.sources.map(source => source.id),ids);
  for (const source of data.sources) {
    const url = new URL(source.url);
    assert.equal(url.origin,'https://script.google.com');
    assert.equal(url.pathname,'/macros/s/AKfycbw3KzPix7iLtyJFB7eVqm2NCWhRoqSl0G38p7YeJm6KEHlETcuc-8jVnom69pUcwQUk/exec');
    assert.equal(url.searchParams.get('id'),source.id);
  }
});
test('MGS snapshot is unique HTTPS metadata, with reproducible URL-based identities and provenance', () => {
  assert.equal(data.games.length,630);
  assert.equal(new Set(data.games.map(game => game.url)).size,data.games.length);
  assert.equal(new Set(data.games.map(game => game.id)).size,data.games.length);
  assert.equal(data.provenance.repo,'Onex558/uranium-source-');
  assert.match(data.provenance.commit,/^[a-f0-9]{40}$/);
  assert.equal(Object.keys(data.provenance.manifests).length,4);
  for (const game of data.games) {
    const url = new URL(game.url);
    assert.equal(url.protocol,'https:'); assert.equal(url.username,''); assert.equal(url.password,'');
    assert.match(url.pathname,/\.html?$/i); assert.equal(url.hash,'');
    assert.equal(game.id,createHash('sha256').update(game.url).digest('hex').slice(0,16));
    assert.ok(game.title.length > 0 && game.title.length <= 160);
    assert.ok(game.library && game.metadata.length);
    for (const manifest of game.metadata) assert.ok(Object.hasOwn(data.provenance.manifests,manifest));
    if (game.image) assert.equal(new URL(game.image).protocol,'https:');
  }
});
test('MGS catalog, portal access, sandbox and credits are present; the single build excludes its view', () => {
  const html = read('index.html'), app = read('assets/js/app.js'), single = read('single/index.html');
  assert.match(html,/data-route="mgs"/); assert.match(html,/Multiple Games Sources/);
  assert.match(html,/WebSight \/ P2P/); assert.match(html,/Onex558 \/ Uranium/);
  assert.match(html,/não são reimplementados nem operados pelo LuminSDK/);
  assert.match(app,/mgs: \{/);
  for (const source of data.sources) assert.ok(html.includes('href="'+source.url+'"'));
  const helper = read('assets/js/game-tab.js');
  assert.match(helper,/allow-downloads/); assert.doesNotMatch(helper,/allow-top-navigation/);
  assert.doesNotMatch(single,/id="view-mgs"|id="mgs-player"/);
  assert.doesNotMatch(single,/<script[^>]*src="assets\/js\/mgs/);
});
test('importer does not execute upstream scripts and runtime does not inject metadata as HTML', () => {
  const importer = read('tools/mgs-index.cjs'), runtime = read('assets/js/mgs.js');
  assert.match(importer,/parseExpressionAt/);
  assert.doesNotMatch(importer,/\beval\s*\(|new Function\s*\(|runIn/);
  assert.doesNotMatch(runtime,/\.innerHTML\s*=/);
  assert.match(read('assets/js/downloads.js'),/credentials:'omit'/);
  assert.match(runtime,/AbortController/);
  assert.match(read('assets/js/downloads.js'),/total > max/);
});
