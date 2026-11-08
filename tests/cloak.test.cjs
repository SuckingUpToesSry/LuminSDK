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
  const styles = [];
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

  function element(tag) {
    return {
      tagName: String(tag).toUpperCase(),
      style: {},
      listeners: {},
      children: [],
      classList: {
        value: [],
        add(name) { this.value.push(name); },
        contains(name) { return this.value.includes(name); }
      },
      addEventListener(type, fn) { this.listeners[type] = fn; },
      append(child) { this.children.push(child); },
      setAttribute(name, value) { this[name] = value; },
      remove() { this.removed = true; }
    };
  }

  const head = element('head');
  const body = element('body');
  const document = {
    title: 'StudyHub | Estudos e Quiz',
    head,
    documentElement: element('html'),
    body: {
      append(tip) { tips.push(tip); body.append(tip); }
    },
    createElement: element,
    getElementById(id) {
      const inHead = head.children.find((item) => item.id === id);
      if (inHead) return inHead;
      return styles.find((item) => item.id === id) || null;
    },
    addEventListener(type, fn) { listeners.set(type, fn); },
    removeEventListener(type, fn) {
      if (listeners.get(type) === fn) listeners.delete(type);
    }
  };
  // o <style> do botão é criado e guardado no head pelo próprio cloak
  const originalCreate = document.createElement;
  document.createElement = function (tag) {
    const node = originalCreate(tag);
    if (String(tag).toLowerCase() === 'style') { node.id = 'lumin-cloak-style'; styles.push(node); }
    return node;
  };

  vm.runInNewContext(source, { window, document, clearTimeout() {} });
  return {
    window, timers, redirects, opened, tips, listeners, popup, head, styles,
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

test('nada abre sozinho: sem pop-up, sem redirecionar e sem ouvinte global de gesto', () => {
  const state = boot();
  assert.deepEqual(state.opened, [], 'a página não abre aba por conta própria');
  assert.deepEqual(state.redirects, [], 'a aba original não sai do site');
  assert.equal(state.listeners.size, 0, 'nenhum gesto no documento dispara a abertura');
});

test('o botão aparece no canto inferior direito, com o texto pedido, e vive 10 segundos', () => {
  const state = boot();
  assert.equal(state.tips.length, 1);
  const tip = state.tips[0];
  assert.equal(tip.id, 'lumin-cloak-open');
  assert.equal(tip.type, 'button');
  assert.equal(tip.textContent, 'Abrir em About:Blank');
  assert.match(tip.title, /10 segundos/);
  // posição e vida pregadas no CSS do botão (não em estilo inline esparramado)
  const css = state.styles[0].textContent;
  assert.match(css, /position:fixed/);
  assert.match(css, /right:18px/);
  assert.match(css, /bottom:18px/);
  assert.equal(state.timers[0].delay, 10000, 'o botão some depois de 10 s');
  assert.deepEqual(state.redirects, [], 'esperar o botão sumir não navega');
});

test('depois dos 10 s o botão sai com transição e não deixa rastro', () => {
  const state = boot();
  const tip = state.tips[0];
  state.timers[0].fn();
  assert.equal(tip.classList.contains('is-out'), true, 'sai com a classe de transição');
  assert.equal(state.timers[1].delay, 320, 'e só então é removido do DOM');
  state.timers[1].fn();
  assert.equal(tip.removed, true);
});

test('clicar no botão abre o about:blank, embute a URL original e manda a aba para o Google', () => {
  const state = boot();
  state.tips[0].listeners.click({ cancelable: true, preventDefault() {} });
  assert.deepEqual(state.opened, [['about:blank', '_blank']]);
  assert.match(state.html(), /src="https:\/\/suckinguptoessry.github.io\/LuminSDK\/"/);
  assert.match(state.html(), /referrerpolicy="no-referrer"/);
  assert.deepEqual(state.redirects, ['https://www.google.com/']);
  assert.equal(state.closeAttempts(), 0, 'a original navega antes de tentar fechar');
  const shell = runShell(state);
  assert.equal(shell.timers[0].delay, 1000);
  shell.timers[0].fn();
  assert.equal(state.closeAttempts(), 1);
  assert.equal(shell.window.opener, null);
});

test('pop-up barrado: a página fica e o próprio botão explica o que fazer', () => {
  const state = boot({ blocked: true });
  const tip = state.tips[0];
  tip.listeners.click({ cancelable: true, preventDefault() {} });
  assert.deepEqual(state.redirects, []);
  assert.match(tip.textContent, /Pop-up barrado/);
  assert.equal(state.tips.length, 1, 'nada de botão duplicado');
  state.allowPopup();
  tip.listeners.click({ cancelable: true, preventDefault() {} });
  assert.deepEqual(state.redirects, ['https://www.google.com/']);
  assert.equal(tip.removed, true, 'com sucesso o botão sai da tela');
});

test('um clique só abre uma aba, mesmo clicando de novo depois', () => {
  const state = boot();
  state.tips[0].listeners.click({ cancelable: true, preventDefault() {} });
  state.window.LuminCloak.open();
  assert.equal(state.opened.length, 1);
  assert.equal(state.redirects.length, 1);
});

test('show() traz o botão de volta e hide() tira na hora', () => {
  const state = boot();
  const first = state.tips[0];
  state.window.LuminCloak.hide();
  assert.equal(first.removed, true);
  state.window.LuminCloak.show();
  assert.equal(state.tips.length, 2);
  assert.equal(state.tips[1].textContent, 'Abrir em About:Blank');
});

test('falha ao escrever na aba nova fecha o pop-up e não sai do site', () => {
  const state = boot({ writeFails: true });
  state.tips[0].listeners.click({ cancelable: true, preventDefault() {} });
  assert.equal(state.popup.closed, true);
  assert.deepEqual(state.redirects, []);
});

test('navegador recusando fechar deixa o redirecionamento e solta o opener', () => {
  const state = boot({ refuseClose: true });
  state.tips[0].listeners.click({ cancelable: true, preventDefault() {} });
  const shell = runShell(state);
  assert.doesNotThrow(() => shell.timers[0].fn());
  assert.deepEqual(state.redirects, ['https://www.google.com/']);
  assert.equal(shell.window.opener, null);
});

for (const options of [
  { framed: true }, { single: true }, { search: '?cloak=0' }
]) {
  test('contextos excluídos não ganham botão nem timer: ' + JSON.stringify(options), () => {
    const state = boot(options);
    assert.equal(state.timers.length, 0);
    assert.equal(state.tips.length, 0);
    assert.equal(state.listeners.size, 0);
    assert.equal(state.opened.length, 0);
  });
}

test('window.name antigo não desliga o botão', () => {
  const state = boot({ name: 'luminsdk-cloak' });
  assert.equal(state.tips.length, 1);
  assert.equal(state.tips[0].id, 'lumin-cloak-open');
});
