const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, '../assets/js/', name + '.js'), 'utf8');
function content() {
  const context = { window: {} }; vm.createContext(context);
  vm.runInContext(read('study-questions'), context);
  const initial = context.window.STUDY_QUESTIONS.length;
  vm.runInContext(read('study-content'), context);
  return { context, initial, bank: context.window.STUDY_QUESTIONS, lessons: context.window.STUDY_CONTENT.lessons };
}
test('expanded bank has 600+ unique questions and 30 substantive summaries across all six subjects', () => {
  const { bank, lessons, initial } = content();
  assert.ok(bank.length >= 600 && bank.length > initial * 2);
  assert.equal(new Set(bank.map(row => row[2])).size, bank.length);
  assert.equal(lessons.length, 30);
  assert.equal(new Set(lessons.map(row => row.id)).size, 30);
  const subjects = new Set(['matematica', 'portugues', 'ciencias', 'historia', 'geografia', 'vida']);
  for (const row of bank) {
    assert.equal(row.length, 6); assert.ok(subjects.has(row[1]));
    assert.equal(row[3].length, 4);
    assert.equal(new Set(row[3]).size, 4, row[2]);
    assert.ok(Number.isInteger(row[4]) && row[4] >= 0 && row[4] < 4);
    assert.ok(row[5].length > 0, row[2]);
  }
  for (const subject of subjects) assert.equal(lessons.filter(row => row.subject === subject).length, 5);
  for (const row of lessons) {
    assert.ok(row.summary.length > 150 && row.example.length > 60 && row.trap.length > 20);
    assert.ok(row.choices.includes(row.choices[0]));
  }
});
test('content reload is idempotent and does not duplicate questions', () => {
  const { context, bank } = content(); const size = bank.length;
  vm.runInContext(read('study-content'), context);
  assert.equal(context.window.STUDY_QUESTIONS.length, size);
});
test('computed equation, percentage, geometry and statistics answers are independently checked', () => {
  const { bank } = content(); let verified = 0;
  for (const row of bank) {
    const q = row[2], correct = parseFloat(row[3][row[4]]); let match, answer;
    if ((match = /^Resolva a equação: (\d+)x \+ (\d+) = (\d+)\.$/.exec(q))) answer = (Number(match[3]) - Number(match[2])) / Number(match[1]);
    else if ((match = /^Calcule (\d+)% de (\d+)\.$/.exec(q))) answer = Number(match[1])*Number(match[2])/100;
    else if ((match = /^Um retângulo mede (\d+) cm por (\d+) cm\./.exec(q))) answer = Number(match[1])*Number(match[2]);
    else if ((match = /^Um triângulo tem base (\d+) m e altura (\d+) m\./.exec(q))) answer = Number(match[1])*Number(match[2])/2;
    else if ((match = /^Qual é a média aritmética de (\d+), (\d+) e (\d+)\?$/.exec(q))) answer = (Number(match[1])+Number(match[2])+Number(match[3]))/3;
    else if ((match = /^Qual é o quadrado do número (\d+)\?$/.exec(q))) answer = Number(match[1])**2;
    else continue;
    assert.equal(correct, answer, q); verified++;
  }
  assert.ok(verified >= 180);
});
test('Shift+D and Shift+J are independent defaults and existing mappings survive', () => {
  const stored = { study: { key: 'd', code: 'KeyD', shift: true }, astolfo: { key: 'q', code: 'KeyQ', ctrl: true } };
  const window = {};
  const context = { window, localStorage: { getItem: () => JSON.stringify(stored), setItem() {} },
    document: { readyState: 'loading', addEventListener() {} } };
  vm.runInNewContext(read('keybinds'), context);
  assert.equal(window.LuminKeys.get('study').key, 'd');
  assert.equal(window.LuminKeys.get('studyQuick').key, 'f');
  assert.equal(window.LuminKeys.get('impact').key, 'j');
  assert.equal(window.LuminKeys.get('astolfo').key, 'q');
  assert.equal(window.LuminKeys.match('study', { key:'D', code:'KeyD', shiftKey:true }), true);
  assert.equal(window.LuminKeys.match('impact', { key:'J', code:'KeyJ', shiftKey:true }), true);
  assert.equal(window.LuminKeys.match('studyQuick', { key:'F', code:'KeyF', shiftKey:true, ctrlKey:false, altKey:false, metaKey:false }), true);
  assert.equal(window.LuminKeys.match('studyQuick', { key:'F', code:'KeyF', shiftKey:true, ctrlKey:true, altKey:false, metaKey:false }), false);
  assert.equal(window.LuminKeys.match('study', { key:'J', code:'KeyJ', shiftKey:true }), false);
  window.LuminKeys.set('study', { key:'p', code:'KeyP', alt:true });
  assert.equal(window.LuminKeys.get('study').key, 'p');
  assert.equal(window.LuminKeys.get('impact').key, 'j');
});
