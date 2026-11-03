const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, '../assets/js/cloak.js'), 'utf8');

function boot(options = {}) {
  const listeners = new Map();
  const timers = [];
  const redirects = [];
  const opened = [];
  const tips = [];
  let allowPopup = !options.blocked;
  let closeAttempts = 0;
  let html = '';
  const popup = {
    closed: false,
    focus() {},
    close() { this.closed = true; },
    document: {
      open() {},
      write(text) {
        if (options.writeFails) throw new Error('cannot write');
        html = text;
      },
      close() {}
    }
  };
  const window = {
    name: options.name || '',
    __LUMIN_SINGLE__: !!options.single,
    location: {
      href: 'https://suckinguptoessry.github.io/LuminSDK/' + (options.search || ''),
      search: options.search || '',
      replace(url) { redirects.push(url); }
    },
    open(url, target) {
      opened.push([url, target]);
      return allowPopup ? popup : null;
    },
    close() {
      closeAttempts += 1;
      if (options.refuseClose) throw new Error('browser refused close');
    },
    setTimeout(fn, delay) { timers.push({ fn, delay }); return timers.length; }
  };
  window.self = window;
  window.top = options.framed ? {} : window;
  const document = {
    title: 'StudyHub | Estudos e Quiz',
    body: { append(tip) { tips.push(tip); } },
    createElement() {
      return { style: {}, setAttribute() {}, remove() { this.removed = true; } };
    },
    addEventListener(type, fn) { listeners.set(type, fn); },
    removeEventListener(type, fn) {
      if (listeners.get(type) === fn) listeners.delete(type);
    }
  };
  vm.runInNewContext(source, { window, document, clearTimeout() {} });
  return {
    window, timers, redirects, opened, tips, listeners, popup,
    html: () => html,
    allowPopup() { allowPopup = true; },
    closeAttempts: () => closeAttempts
  };
}

function runShell(state) {
  const html = state.html();
  assert.match(html, /<\/script><\/body><\/html>$/);
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match, 'shell must contain a properly closed script element');
  const timers = [];
  const frame = { contentDocument: { title: 'StudyHub' }, addEventListener() {} };
  const childWindow = { opener: state.window };
  vm.runInNewContext(match[1], {
    window: childWindow,
    document: { getElementById() { return frame; } },
    setInterval() {},
    setTimeout(fn, delay) { timers.push({ fn, delay }); }
  });
  return { timers, window: childWindow };
}

test('opens a fresh about:blank immediately, embeds the original URL and redirects to Google', () => {
  const state = boot();
  assert.equal(state.timers[0].delay, 0);
  state.timers[0].fn();
  assert.deepEqual(state.opened, [['about:blank', '_blank']]);
  assert.match(state.html(), /src="https:\/\/suckinguptoessry.github.io\/LuminSDK\/"/);
  assert.match(state.html(), /referrerpolicy="no-referrer"/);
  assert.deepEqual(state.redirects, ['https://www.google.com/']);
  assert.equal(state.closeAttempts(), 0, 'original must navigate before the close attempt');
  assert.equal(state.listeners.size, 0);
  const shell = runShell(state);
  assert.equal(shell.timers[0].delay, 1000);
  shell.timers[0].fn();
  assert.equal(state.closeAttempts(), 1);
  assert.equal(shell.window.opener, null);
});

test('a blocked pop-up keeps the original page and retries on a user gesture', () => {
  const state = boot({ blocked: true });
  state.timers[0].fn();
  assert.deepEqual(state.redirects, []);
  assert.equal(state.tips.length, 1);
  assert.ok(state.listeners.has('click'));
  assert.ok(state.listeners.has('keydown'));
  state.allowPopup();
  state.listeners.get('click')();
  assert.deepEqual(state.redirects, ['https://www.google.com/']);
  assert.equal(state.listeners.size, 0);
  assert.equal(state.tips[0].removed, true);
});

test('a gesture before the automatic timer does not create duplicate tabs', () => {
  const state = boot();
  state.listeners.get('keydown')();
  state.timers[0].fn();
  state.window.LuminCloak.open();
  assert.equal(state.opened.length, 1);
  assert.equal(state.redirects.length, 1);
});

test('a failed shell write closes the empty popup without leaving the original page', () => {
  const state = boot({ writeFails: true });
  state.timers[0].fn();
  assert.equal(state.popup.closed, true);
  assert.deepEqual(state.redirects, []);
  assert.ok(state.listeners.has('click'));
});

test('browser refusal to close leaves the Google redirect intact and disconnects opener', () => {
  const state = boot({ refuseClose: true });
  state.timers[0].fn();
  const shell = runShell(state);
  assert.doesNotThrow(() => shell.timers[0].fn());
  assert.deepEqual(state.redirects, ['https://www.google.com/']);
  assert.equal(shell.window.opener, null);
});

for (const options of [
  { framed: true }, { single: true }, { name: 'luminsdk-cloak' }, { search: '?cloak=0' }
]) {
  test('does not migrate excluded contexts: ' + JSON.stringify(options), () => {
    const state = boot(options);
    assert.equal(state.timers.length, 0);
    assert.equal(state.listeners.size, 0);
    assert.equal(state.opened.length, 0);
  });
}
