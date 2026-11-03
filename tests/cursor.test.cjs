const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, '../assets/js/atmosphere.js'), 'utf8');
const start = source.indexOf('  function initCursor() {');
const end = source.indexOf('  /* ---------- inicialização ---------- */', start);
const initCursor = source.slice(start, end);

function cursor(reduceMotion) {
  const listeners = {};
  const classes = new Set();
  const root = { classList: {
    contains(name) { return classes.has(name); },
    add(...names) { names.forEach(name => classes.add(name)); },
    remove(...names) { names.forEach(name => classes.delete(name)); },
    toggle(name, force) { if (force) classes.add(name); else classes.delete(name); }
  } };
  const nodes = [];
  const document = {
    body: { append(...items) { nodes.push(...items); } },
    createElement() { return { style: {}, setAttribute() {} }; },
    addEventListener(name, fn) { listeners[name] = fn; }
  };
  const window = {
    innerWidth: 1000, innerHeight: 700,
    addEventListener(name, fn) { listeners[name] = fn; }
  };
  vm.runInNewContext(initCursor + '\ninitCursor();', {
    window, document, root, finePointer: true, reduceMotion,
    localStorage: { getItem() { return null; } },
    requestAnimationFrame() {}
  });
  return { listeners, dot: nodes[0], ring: nodes[1] };
}

test('dot and ring share the initial pointer position', () => {
  const state = cursor(false);
  state.listeners.pointermove({ clientX: 300, clientY: 200 });
  assert.equal(state.dot.style.transform, 'translate3d(300px, 200px, 0)');
  assert.equal(state.ring.style.transform, state.dot.style.transform);
});

test('reduced motion keeps the ring centered on every pointer movement', () => {
  const state = cursor(true);
  for (const [x, y] of [[100, 120], [480, 360], [20, 30]]) {
    state.listeners.pointermove({ clientX: x, clientY: y });
    assert.equal(state.dot.style.transform, `translate3d(${x}px, ${y}px, 0)`);
    assert.equal(state.ring.style.transform, state.dot.style.transform);
  }
});

test('popover dot explicitly restores its solid fill after the transparent popover reset', () => {
  const css = readFileSync(join(__dirname, '../assets/css/styles.css'), 'utf8');
  const reset = css.indexOf('.cursor-dot[popover],');
  const fill = css.indexOf('.cursor-dot[popover] {', reset);
  assert.ok(reset >= 0 && fill > reset);
  const rule = css.slice(fill, css.indexOf('}', fill));
  assert.match(rule, /background:\s*var\(--accent\)/);
});
