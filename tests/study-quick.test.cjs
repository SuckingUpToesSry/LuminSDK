const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const app = fs.readFileSync(path.join(__dirname, '../assets/js/app.js'), 'utf8');
const rewriteCss = fs.readFileSync(path.join(__dirname, '../assets/css/rewrite.css'), 'utf8');

test('Shift+F has a visible global button, including outside the Lumin catalog route', () => {
  const button = html.match(/<button[^>]*id="study-quick"[\s\S]*?<\/button>/);
  assert.ok(button, 'the quick-study button is present in the shared document shell');
  assert.match(button[0], /data-study-quick/);
  assert.match(button[0], /aria-keyshortcuts="Shift\+F"/);
  assert.match(button[0], /Shift \+ F/);
  assert.ok(html.indexOf(button[0]) < html.indexOf('id="view-lumin"'), 'button is outside the Lumin-only view');
  assert.doesNotMatch(rewriteCss, /html\.is-playing\s+#study-quick/, 'global Studies access stays visible even over an active player');
});

test('every full load starts in Studies and clears legacy route/mode preferences', () => {
  const initial = app.match(/function initialRoute\(\) \{[\s\S]*?\n  \}/);
  assert.ok(initial);
  assert.match(initial[0], /sessionStorage\.removeItem\('luminsdk:v1:start'\)/);
  assert.match(initial[0], /sessionStorage\.removeItem\('luminsdk:v1:mode'\)/);
  assert.match(initial[0], /return 'estudo'/);
  assert.doesNotMatch(initial[0], /routeFromUrl|LuminPersonal|readMode/);
});

test('quick study uses no transition and restores the previous route without Fern state', () => {
  assert.match(app, /matchKey\('studyQuick'/);
  assert.match(app, /go\('estudo', \{ transition: 'none' \}\)/);
  assert.match(app, /studyQuickReturn = \{ route: current \}/);
  assert.match(app, /const route = previous && ROUTES\[previous\.route\] \? previous\.route : 'lumin'/);
  assert.doesNotMatch(app, /LuminFern|studyQuickReturn\.fern/);
  assert.match(app, /data-study-quick/);
});

test('About:Blank is shown only when Shift+D or Shift+J opens the Lumin catalog', () => {
  assert.match(app, /const enteringCatalog = current === 'estudo'/);
  assert.match(app, /if \(enteringCatalog && window\.LuminCloak[\s\S]*?window\.LuminCloak\.show\(\)/);
  assert.match(app, /else if \(!enteringCatalog && window\.LuminCloak[\s\S]*?window\.LuminCloak\.hide\(\)/);
});
