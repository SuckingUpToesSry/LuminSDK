const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../assets/js/anim.js'), 'utf8');
function boot(options = {}) {
  const classes = new Set(), nodes = [], timers = new Map(); let id = 0;
  const root = { classList: { add: c => classes.add(c), remove: c => classes.delete(c) } };
  const window = { location: { search: options.query || '' }, matchMedia: () => ({ matches: !!options.reduced }),
    addEventListener() {}, setTimeout(fn, delay) { timers.set(++id, { fn, delay }); return id; }, clearTimeout(id) { timers.delete(id); } };
  const document = { documentElement: root, body: { append: node => nodes.push(node) },
    createElement() { return { setAttribute() {}, remove() { this.removed = true; } }; } };
  vm.runInNewContext(source, { window, document, localStorage: { getItem: () => options.off ? 'off' : null, setItem() {} } });
  function advance() { const [id, timer] = timers.entries().next().value; timers.delete(id); timer.fn(); return timer.delay; }
  return { api: window.LuminAnim, nodes, timers, classes, advance };
}
test('every route holds solid black for 1000 ms before a single flash and bounded shake', () => {
  for (const route of ['lumin','estudo','gn','sites','provider','browser','hub','os','boot']) {
    const state = boot(); assert.equal(state.api.play(route), true);
    assert.equal(state.nodes[0].className, 'impact-black');
    assert.equal(state.timers.values().next().value.delay, 1000);
    assert.equal(state.advance(), 1000); assert.equal(state.nodes[0].className, 'impact-flash');
    assert.ok(state.classes.has('lumin-impact'));
    assert.equal(state.advance(), 540); assert.equal(state.nodes[0].removed, true);
    assert.equal(state.classes.has('lumin-impact'), false); assert.equal(state.api.state().running, false);
  }
});
test('reduced motion never flashes or shakes', () => {
  const state = boot({ reduced: true }); state.api.play('lumin'); state.advance();
  assert.equal(state.nodes[0].removed, true); assert.equal(state.classes.size, 0); assert.equal(state.timers.size, 0);
});
test('rapid navigation cancels old timers and never leaves a layer stuck', () => {
  const state = boot(); state.api.play('gn'); state.api.play('sites');
  assert.equal(state.nodes[0].removed, true); assert.equal(state.timers.size, 1);
  state.advance(); state.api.hide(); assert.equal(state.timers.size, 0); assert.equal(state.classes.size, 0);
});
test('local preference and anim=0 opt out cleanly', () => {
  for (const options of [{ off: true }, { query: '?anim=0' }]) {
    const state = boot(options); assert.equal(state.api.play('lumin'), false); assert.equal(state.nodes.length, 0);
  }
  const state = boot(); state.api.play('lumin'); state.api.setEnabled(false);
  assert.equal(state.nodes[0].removed, true); assert.equal(state.api.play('sites'), false);
});
