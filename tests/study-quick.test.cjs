const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const app = fs.readFileSync(path.join(__dirname, '../assets/js/app.js'), 'utf8');

test('the floating Shift+F quick-study button is removed while the shortcut remains configurable', () => {
  assert.doesNotMatch(html, /id="study-quick"|data-study-quick|study-quick__icon/);
  assert.match(app, /matchKey\('studyQuick'/);
  assert.match(html, /data-keybind="studyQuick"/);
});

test('every full load starts in Studies and clears legacy route/mode preferences', () => {
  const initial = app.match(/function initialRoute\(\) \{[\s\S]*?\n  \}/);
  assert.ok(initial);
  assert.match(initial[0], /sessionStorage\.removeItem\('luminsdk:v1:start'\)/);
  assert.match(initial[0], /sessionStorage\.removeItem\('luminsdk:v1:mode'\)/);
  assert.match(initial[0], /return 'estudo'/);
  assert.doesNotMatch(initial[0], /routeFromUrl|LuminPersonal|readMode/);
});

test('Shift+F still returns between Studies and the previous route without Fern state', () => {
  assert.match(app, /matchKey\('studyQuick'/);
  assert.match(app, /studyQuickReturn = \{ route: current \}/);
  assert.match(app, /const route = previous && ROUTES\[previous\.route\] \? previous\.route : 'lumin'/);
  assert.doesNotMatch(app, /LuminFern|studyQuickReturn\.fern|syncStudyQuick/);
});

test('About:Blank is shown only when Shift+D or Shift+J opens the Lumin catalog', () => {
  assert.match(app, /const enteringCatalog = current === 'estudo'/);
  assert.match(app, /if \(enteringCatalog && window\.LuminCloak[\s\S]*?window\.LuminCloak\.show\(\)/);
  assert.match(app, /else if \(!enteringCatalog && window\.LuminCloak[\s\S]*?window\.LuminCloak\.hide\(\)/);
});
