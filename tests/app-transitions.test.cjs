const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const app = fs.readFileSync(path.join(__dirname, '../assets/js/app.js'), 'utf8');

test('initial entry and transitions into Studies are animation-free; other views keep their transitions', () => {
  assert.match(app, /if \(!first && route !== 'estudo'\) \{\s*roll\(route, transition\);/);
  assert.match(app, /if \(current !== route \|\| route === 'estudo'\)/);
  assert.match(app, /window\.LuminAnim\.hide\(\)/);
});
