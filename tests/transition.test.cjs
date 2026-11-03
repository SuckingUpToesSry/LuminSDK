const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../assets/js/anim.js'), 'utf8');
function boot(options = {}) {
  const classes = new Set(), nodes = [], timers = new Map(); let id = 0;
  const root = { getAttribute: () => options.minimal ? null : 'astolfo', classList: { add: c => classes.add(c), remove: c => classes.delete(c) } };
  const window = { LuminClassicAnim: options.classic, LuminPersonal: options.personal, location: { search: options.query || '' }, matchMedia: () => ({ matches: !!options.reduced }),
    addEventListener() {}, setTimeout(fn, delay) { timers.set(++id, { fn, delay }); return id; }, clearTimeout(id) { timers.delete(id); } };
  const document = { documentElement: root, body: { append: node => nodes.push(node) },
    createElement() { return { children: [], append(node) { this.children.push(node); }, setAttribute() {}, remove() { this.removed = true; } }; } };
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

test('navigation choice is validated and shortcuts explicitly override it', () => {
  let alive = false; const routes = [];
  const state = boot({ classic: { play(route) { routes.push(route); alive = true; return true; }, hide() { alive = false; }, state() { return { running: alive }; } } });
  assert.equal(state.api.getStyle(), 'impact');
  assert.equal(state.api.setStyle('unknown'), false);
  assert.equal(state.api.setStyle('fade'), true);
  state.api.play('sites'); assert.equal(state.nodes[0].className, 'transition-fade');
  assert.equal(state.advance(), 520); assert.equal(state.nodes[0].removed, true);
  state.api.play('lumin', 'classic'); assert.deepEqual(routes, ['lumin']); assert.equal(state.api.state().running, true);
  state.api.play('estudo', 'impact'); assert.equal(alive, false);
  assert.equal(state.nodes[1].className, 'impact-black'); assert.equal(state.api.getStyle(), 'fade');
  state.api.setStyle('none'); assert.equal(state.nodes[1].removed, true); assert.equal(state.api.play('gn'), false);
  assert.equal(state.api.play('estudo', 'impact'), true);
  state.api.setEnabled(false); assert.equal(state.api.play('lumin', 'classic'), false); assert.equal(alive, false);
});
test('slide and fade clean up after 520 ms without an impact flash', () => {
  for (const style of ['slide', 'fade']) {
    const state = boot(); state.api.setStyle(style); state.api.play('sites');
    assert.equal(state.nodes[0].className, 'transition-' + style);
    assert.equal(state.advance(), 520); assert.equal(state.nodes[0].removed, true); assert.equal(state.classes.size, 0);
  }
});
test('reduced motion substitutes a short fade for classic and slide', () => {
  for (const style of ['classic', 'slide']) {
    const state = boot({ reduced: true }); state.api.play('lumin', style);
    assert.equal(state.nodes[0].className, 'transition-fade');
    assert.equal(state.advance(), 180); assert.equal(state.classes.size, 0);
  }
});

test('impact mounts a dedicated Astolfo heart; other styles do not reuse the classic pseudo-element', () => {
  const state = boot(); state.api.play('estudo', 'impact');
  assert.equal(state.nodes[0].children.length, 1);
  assert.equal(state.nodes[0].children[0].className, 'impact-heart');
  assert.equal(state.nodes[0].children[0].textContent, '♡');
  state.advance(); assert.equal(state.nodes[0].className, 'impact-flash');
  state.advance(); assert.equal(state.nodes[0].removed, true);
  state.api.play('estudo', 'fade'); assert.equal(state.nodes[1].children.length, 0);
});

test('minimalist always resolves visual styles to spacetime, never impact or page shake', () => {
  const played = [];
  const state = boot({ minimal: true, classic: { play: route => { played.push(route); return true; }, hide() {}, state: () => ({ running:false }) } });
  for (const style of ['impact','cinema','prism','slide','fade','classic']) {
    state.api.setStyle(style); assert.equal(state.api.resolveStyle(), 'classic');
    assert.equal(state.api.play('lumin'), true); assert.equal(state.api.state().activeStyle,'classic');
  }
  assert.equal(played.length, 6); assert.equal(state.nodes.length,0); assert.equal(state.classes.size,0);
  state.api.setStyle('none'); assert.equal(state.api.play('lumin'),false);
});
test('Astolfo applies the selected effect on the same API used by Shift+J, not a forced heart', () => {
  const state = boot();
  for (const style of ['slide','fade','cinema','prism']) {
    state.api.setStyle(style); state.api.play('estudo');
    assert.equal(state.api.state().activeStyle,style);
    assert.equal(state.nodes.at(-1).className,'transition-'+style);
    assert.equal(state.nodes.at(-1).children.some(node => node.className === 'impact-heart'),false);
    assert.equal(state.advance(), ['cinema','prism'].includes(style) ? 900 : 520);
  }
});
test('personal comfort options independently remove flash and shake on Astolfo impact', () => {
  const state = boot({ personal:{ get: () => ({ flash:false, shake:'off' }) } });
  state.api.play('lumin','impact'); state.advance();
  assert.equal(state.nodes[0].className,'impact-reveal'); assert.equal(state.classes.size,0);
  state.advance(); assert.equal(state.nodes[0].removed,true);
});
