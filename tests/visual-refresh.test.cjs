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
