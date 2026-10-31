/* =========================================================
   StudyDesk — interações da página de estudos
   · busca e filtro por matéria nos recursos
   · planejador salvo no próprio navegador (localStorage)
   · saída discreta para o LuminSDK: Shift+D, digitar "lumin"
     ou clicar em "Ryan Smith" no rodapé

   Sem bibliotecas, sem build.
   Autor: Ryan Smith · Licença MIT
   ========================================================= */
(function () {
  'use strict';

  const TASKS_KEY = 'studydesk:v1:tasks';
  const REAL = '../index.html';

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.prototype.slice.call(document.querySelectorAll(sel));

  /* ---------- recursos: busca + filtro ---------- */
  const state = { query: '', subject: '' };
  const list = $('#lista');
  const info = $('#recursos-info');
  const empty = $('#vazio');
  const search = $('#busca');
  const chips = $('#chips');

  const RESOURCES = $$('.res').map(function (node) {
    return {
      node: node,
      subject: node.dataset.subject || '',
      text: (node.textContent || '').toLowerCase() + ' ' + (node.dataset.keys || '')
    };
  });

  function filter() {
    let shown = 0;
    RESOURCES.forEach(function (item) {
      const okSubject = !state.subject || item.subject === state.subject;
      const okQuery = !state.query || item.text.indexOf(state.query) >= 0;
      const ok = okSubject && okQuery;
      item.node.hidden = !ok;
      if (ok) shown++;
    });

    if (empty) empty.hidden = shown !== 0;
    if (info) {
      info.textContent = shown === RESOURCES.length
        ? 'Mostrando todos os recursos.'
        : shown === 0
          ? 'Nenhum recurso corresponde ao filtro.'
          : 'Mostrando ' + shown + ' de ' + RESOURCES.length + ' recursos.';
    }
  }

  if (search) {
    let timer = 0;
    search.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        state.query = search.value.trim().toLowerCase();
        filter();
      }, 90);
    });
    search.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        state.query = search.value.trim().toLowerCase();
        filter();
        const first = RESOURCES.filter(function (item) { return !item.node.hidden; })[0];
        if (first) {
          first.node.querySelector('details').open = true;
          first.node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    });
  }

  const buscar = $('#buscar');
  if (buscar) {
    buscar.addEventListener('click', function () {
      if (search) {
        state.query = search.value.trim().toLowerCase();
        filter();
      }
      const section = $('#recursos');
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  if (chips) {
    chips.addEventListener('click', function (event) {
      const chip = event.target.closest('[data-subject]');
      if (!chip) return;
      state.subject = chip.dataset.subject || '';
      $$('#chips [data-subject]').forEach(function (item) {
        item.classList.toggle('is-on', item === chip);
      });
      filter();
    });
  }

  /* ---------- planejador ---------- */
  function readTasks() {
    try {
      const list = JSON.parse(localStorage.getItem(TASKS_KEY) || '[]');
      return Array.isArray(list) ? list : [];
    } catch (error) {
      return [];
    }
  }

  function saveTasks(tasks) {
    try {
      localStorage.setItem(TASKS_KEY, JSON.stringify(tasks.slice(0, 80)));
    } catch (error) {}
  }

  const tasksBox = $('#tarefas');
  const noTasks = $('#sem-tarefas');

  function paint() {
    if (!tasksBox) return;
    const tasks = readTasks();
    tasksBox.textContent = '';
    if (noTasks) noTasks.hidden = tasks.length > 0;

    tasks.forEach(function (task, index) {
      const item = document.createElement('li');
      item.className = 'task' + (task.done ? ' is-done' : '');

      const check = document.createElement('input');
      check.type = 'checkbox';
      check.checked = !!task.done;
      check.setAttribute('aria-label', 'Concluir: ' + task.text);
      check.addEventListener('change', function () {
        const all = readTasks();
        if (all[index]) all[index].done = check.checked;
        saveTasks(all);
        paint();
      });

      const label = document.createElement('span');
      label.textContent = task.text;

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = '×';
      remove.title = 'Remover tarefa';
      remove.setAttribute('aria-label', 'Remover: ' + task.text);
      remove.addEventListener('click', function () {
        const all = readTasks();
        all.splice(index, 1);
        saveTasks(all);
        paint();
      });

      item.append(check, label, remove);
      tasksBox.append(item);
    });
  }

  const form = $('#planner-form');
  const input = $('#tarefa');
  if (form && input) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      const tasks = readTasks();
      tasks.push({ text: text.slice(0, 120), done: false });
      saveTasks(tasks);
      input.value = '';
      paint();
    });
  }

  paint();

  /* "Entrar" não abre cadastro: o acesso é livre (e isso fica claro) */
  const entrar = $('#entrar');
  if (entrar) {
    entrar.addEventListener('click', function () {
      entrar.textContent = 'Acesso livre';
      entrar.disabled = true;
      entrar.title = 'Não é preciso conta para ler os resumos.';
      setTimeout(function () {
        entrar.textContent = 'Entrar';
        entrar.disabled = false;
      }, 2600);
    });
  }

  /* ---------- saída discreta ---------- */
  function reveal() {
    window.location.href = REAL;
  }

  const autor = $('#autor');
  if (autor) {
    autor.addEventListener('click', function (event) {
      event.preventDefault();
      reveal();
    });
  }

  /* Shift+D em qualquer lugar, ou digitar "lumin" */
  let typed = '';
  document.addEventListener('keydown', function (event) {
    const tag = (event.target && event.target.tagName) || '';
    const typing = tag === 'INPUT' || tag === 'TEXTAREA';

    if (event.shiftKey && (event.key === 'D' || event.key === 'd') && !typing) {
      event.preventDefault();
      reveal();
      return;
    }
    if (typing) return;

    if (/^[a-z]$/i.test(event.key)) {
      typed = (typed + event.key.toLowerCase()).slice(-5);
      if (typed === 'lumin') reveal();
    }
  });
})();
