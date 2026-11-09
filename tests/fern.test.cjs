const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const ROOT = path.join(__dirname, '..');
const keysSource = fs.readFileSync(path.join(ROOT, 'assets/js/keybinds.js'), 'utf8');
const fernSource = fs.readFileSync(path.join(ROOT, 'assets/js/fern.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'assets/css/fern.css'), 'utf8');

function bootKeys(initial = {}) {
  const values = new Map([['luminsdk:keys:v1', JSON.stringify(initial)]]);
  const document = { readyState: 'loading', addEventListener() {}, dispatchEvent() {} };
  const window = {};
  const localStorage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); }
  };
  vm.runInNewContext(keysSource, { window, document, localStorage, CustomEvent: class {} });
  return { api: window.LuminKeys, values };
}

test('Fern hotkey defaults to Ctrl + Alt + F and also accepts AltGr', () => {
  const { api } = bootKeys();
  assert.equal(api.label('fern'), 'Ctrl + Alt + F');
  assert.ok(api.names().includes('fern'));
  assert.equal(api.describe('fern'), 'Alternar espaço Fern / SUTS normal');
  assert.equal(api.match('fern', { key: 'f', code: 'KeyF', ctrlKey: true, altKey: true, shiftKey: false, metaKey: false }), true);
  assert.equal(api.match('fern', { key: 'F', code: 'KeyF', ctrlKey: true, altKey: false, shiftKey: false, metaKey: false, getModifierState: name => name === 'AltGraph' }), true);
  assert.equal(api.match('fern', { key: 'f', code: 'KeyF', ctrlKey: true, altKey: true, shiftKey: true, metaKey: false }), false);
});

test('Fern shortcut is customizable and reset restores the factory combo', () => {
  const { api, values } = bootKeys();
  assert.equal(api.set('fern', { key: 'q', code: 'KeyQ', meta: true }), true);
  assert.equal(api.label('fern'), 'Meta + Q');
  assert.match(values.get('luminsdk:keys:v1'), /"fern"/);
  assert.equal(api.reset('fern'), true);
  assert.equal(api.label('fern'), 'Ctrl + Alt + F');
});

test('Fern layout reuses all existing catalog routes and gives a reversible shortcut', () => {
  for (const route of ['lumin', 'gn', 'mgs', 'provider', 'minecraft', 'browser', 'sites', 'estudo', 'hub']) {
    assert.match(html, new RegExp('data-fern-route="' + route + '"'));
  }
  assert.match(html, /id="fern-launch"[\s\S]*?Ctrl \+ Alt \+ F/);
  assert.match(html, /data-keybind="fern"[\s\S]*?Ctrl \+ Alt \+ F/);
  assert.match(html, /assets\/js\/fern\.js\?v=80/);
  assert.match(html, /assets\/css\/fern\.css\?v=80/);
  assert.match(fernSource, /setMode\(!root\.classList\.contains\('fern-mode'\)\)/);
  assert.match(fernSource, /window\.LuminApp\.go\(route/);
  assert.match(fernSource, /storageGet\(MODE_KEY\) === 'on'/);
});

test('no fake AI model or Ultraviolet backend is advertised; Lucideon is explicitly rejected', () => {
  assert.match(html, /Sem modelo conectado/);
  assert.match(html, /Backend não configurado/);
  assert.match(html, /Este projeto estático não tem esse backend/);
  assert.match(html, /lucideon\.top/);
  assert.match(fernSource, /prompts permanecem locais/);
  assert.match(fernSource, /relatório de JFrog/);
  assert.match(fernSource, /servidor Bare compatível/);
});

test('Fern shell includes a compact desktop rail and a mobile drawer mode', () => {
  assert.match(css, /html\.fern-mode\.fern-collapsed/);
  assert.match(css, /html\.fern-mode\[data-view="estudo"\] body \{ padding-left: var\(--fern-sidebar\); \}/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /fern-mobile-open #fern-sidebar/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});
