const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('catalog hero is centered and the previous violet atmosphere is restored by default', () => {
  const css = read('assets/css/rewrite.css');
  const settings = read('assets/js/settings.js');
  const atmosphere = read('assets/js/atmosphere.js');
  assert.match(css, /--accent:\s*#8b5cf6/);
  assert.match(css, /\.hero\s*\{[^}]*text-align:\s*center/s);
  assert.match(settings, /particles:\s*true/);
  assert.match(settings, /parallax:\s*true/);
  assert.match(atmosphere, /const NEUTRAL = '#8b5cf6'/);
  assert.match(settings, /if \(parsed\.v === 4\)[\s\S]*particles:\s*true/);
  assert.match(css, /html\[data-view="estudo"\] #view-estudo \{ background: transparent; \}/);
  assert.match(css, /html\[data-view="estudo"\] \.bg-fx__canvas \{ opacity: \.42; \}/);
  assert.match(read('assets/css/styles.css'), /\.bg-fx \{ position: fixed; inset: 0; z-index: 0;/);
  assert.match(css, /body > \.app-view:not\(\[hidden\]\)[\s\S]*z-index: 1/);
  const html = read('index.html');
  const app = read('assets/js/app.js');
  assert.ok(html.indexOf('<div class="bg-fx"') < html.indexOf('id="view-lumin"'), 'interactive atmosphere is shared by all views');
  assert.match(app, /estudo:[\s\S]*assets\/js\/settings\.js\?v=84[\s\S]*assets\/js\/atmosphere\.js\?v=84/);
  assert.match(atmosphere, /root\.getAttribute\('data-view'\) === 'estudo' \? null : initCursor\(\)/);
  assert.match(atmosphere, /window\.addEventListener\('pointermove'/);
  assert.match(html, /assets\/js\/astolfo\.js\?v=84/);
  assert.match(read('assets/css/astolfo.css'), /data-skin="astolfo"/);
});

test('Catboy theme is integrated in the settings, shortcut system, single-file build and cache', () => {
  const html = read('index.html');
  const css = read('assets/css/rewrite.css');
  const theme = read('assets/js/catboy.js');
  const keys = read('assets/js/keybinds.js');
  const serviceWorker = read('sw.js');
  const generator = read('tools/single-file.py');
  const single = read('single/index.html');
  assert.match(html, /data-keybind="catboy"/);
  assert.match(html, /id="catboy-card"/);
  assert.match(theme, /LuminKeys\.match\('catboy', event\)/);
  assert.match(theme, /LuminAstolfo\.off\(\)/);
  assert.match(keys, /catboy: \{ key: 'k', code: 'KeyK', ctrl: true, alt: true, shift: true/);
  assert.match(css, /html\[data-skin="catboy"\]/);
  assert.match(generator, /assets\/js\/catboy\.js/);
  assert.match(single, /LuminCatboy/);
  assert.match(serviceWorker, /assets\/js\/catboy\.js\?v=84/);
});

test('tab rail supports horizontal drag and keeps refreshed logo assets for all destinations', () => {
  const app = read('assets/js/app.js');
  const html = read('index.html');
  const tabs = read('assets/css/tabs.css');
  assert.match(app, /originScroll - dx/);
  assert.match(app, /bar\.addEventListener\('wheel'/);
  assert.match(tabs, /overflow-x:\s*auto/);
  for (const brand of ['lumin', 'mgs', 'gnmath', 'duckmath', 'astra', 'sites', 'browser', 'studyhub', 'hub', 'minecraft', 'single']) {
    assert.ok(fs.existsSync(path.join(__dirname, '..', 'assets/img/tabs', `${brand}.svg`)), `missing ${brand} tab mark`);
    assert.ok(html.includes(`assets/img/tabs/${brand}.svg`), `${brand} tab should use its refreshed mark`);
  }
});
