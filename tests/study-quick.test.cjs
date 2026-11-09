const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const app = fs.readFileSync(path.join(__dirname, '../assets/js/app.js'), 'utf8');
const fernCss = fs.readFileSync(path.join(__dirname, '../assets/css/fern.css'), 'utf8');

test('Shift+F has a visible global button, including outside the Lumin catalog route', () => {
  const button = html.match(/<button[^>]*id="study-quick"[\s\S]*?<\/button>/);
  assert.ok(button, 'the quick-study button is present in the shared document shell');
  assert.match(button[0], /data-study-quick/);
  assert.match(button[0], /aria-keyshortcuts="Shift\+F"/);
  assert.match(button[0], /Shift \+ F/);
  assert.ok(html.indexOf(button[0]) < html.indexOf('id="view-lumin"'), 'button is outside the Lumin-only view');
  assert.doesNotMatch(fernCss, /html\[data-view="(?:os|boot)"\]\s+#study-quick/, 'button stays visible in OS and boot views');
});

test('quick study uses no transition, remembers the previous route and Fern state, then restores them', () => {
  assert.match(app, /matchKey\('studyQuick'/);
  assert.match(app, /go\('estudo', \{ transition: 'none' \}\)/);
  assert.match(app, /studyQuickReturn = \{\s*route: current,\s*fern:/);
  assert.match(app, /if \(studyQuickReturn\.fern[\s\S]*?window\.LuminFern\.toggle\(\)/);
  assert.match(app, /const route = previous && ROUTES\[previous\.route\] \? previous\.route : 'lumin'/);
  assert.match(app, /previous\.fern && window\.LuminFern && !window\.LuminFern\.enabled\(\)/);
  assert.match(app, /data-study-quick/);
});
