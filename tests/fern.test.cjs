const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('Fern mode, assistant and Ultraviolet panel are removed from the app', () => {
  const html = read('index.html');
  const app = read('assets/js/app.js');
  const keybinds = read('assets/js/keybinds.js');
  const sw = read('sw.js');
  const single = read('tools/single-file.py');
  assert.doesNotMatch(html, /id="fern-(?:launch|sidebar|topbar|backdrop|ai|uv)"|data-keybind="fern"/i);
  assert.doesNotMatch(app.replace(/localStorage\.removeItem\('luminsdk:fern-mode:v1'\);/, ''), /LuminFern|fern-mode|fernQuickReturn|window\.LuminFern/i);
  assert.doesNotMatch(keybinds, /\bfern\s*:/i);
  assert.doesNotMatch(sw, /assets\/(?:js|css)\/fern\.(?:js|css)/i);
  assert.doesNotMatch(single, /assets\/(?:js|css)\/fern\.(?:js|css)/i);
  assert.equal(fs.existsSync(path.join(root, 'assets/js/fern.js')), false);
  assert.equal(fs.existsSync(path.join(root, 'assets/css/fern.css')), false);
});
