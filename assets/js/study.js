/* =========================================================
   StudyDesk — interações da página de estudos
   · busca e filtro por matéria nos recursos
   · planejador salvo no próprio navegador (localStorage), com progresso
   · cronômetro de foco (25/10/5 min) e teste rápido de 5 perguntas
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
  const progressBox = $('#progresso');
  const progressFill = $('#progresso-fill');
  const progressText = $('#progresso-texto');
  const copyBtn = $('#copiar-plano');

  function paintProgress(tasks) {
    const done = tasks.filter(function (task) { return task.done; }).length;
    if (progressBox) progressBox.hidden = tasks.length === 0;
    if (copyBtn) copyBtn.hidden = tasks.length === 0;
    if (progressFill) {
      progressFill.style.width = tasks.length ? Math.round((done / tasks.length) * 100) + '%' : '0%';
    }
    if (progressText) {
      progressText.textContent = done + ' de ' + tasks.length + ' concluída' +
        (tasks.length === 1 ? '' : 's') +
        (tasks.length ? ' · ' + Math.round((done / tasks.length) * 100) + '%' : '');
    }
  }

  function paint() {
    if (!tasksBox) return;
    const tasks = readTasks();
    tasksBox.textContent = '';
    if (noTasks) noTasks.hidden = tasks.length > 0;
    paintProgress(tasks);

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

  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      const tasks = readTasks();
      if (!tasks.length) return;
      const text = 'Meu plano de estudos\n' + tasks.map(function (task) {
        return (task.done ? '[x] ' : '[ ] ') + task.text;
      }).join('\n');
      const done = function () {
        copyBtn.textContent = 'Plano copiado!';
        setTimeout(function () { copyBtn.textContent = 'Copiar plano'; }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, done);
      } else {
        const area = document.createElement('textarea');
        area.value = text;
        document.body.append(area);
        area.select();
        try { document.execCommand('copy'); } catch (error) {}
        area.remove();
        done();
      }
    });
  }

  paint();

  /* ---------- cronômetro de foco ---------- */
  (function timer() {
    const clock = $('#timer-clock');
    const bar = $('#timer-bar');
    const toggle = $('#timer-toggle');
    const reset = $('#timer-reset');
    const hint = $('#timer-hint');
    const box = $('#foco');
    const presets = $$('#foco [data-min]');
    if (!clock || !toggle) return;

    let total = 25 * 60;
    let left = total;
    let running = false;
    let tick = 0;

    function format(seconds) {
      const min = Math.floor(seconds / 60);
      const sec = seconds % 60;
      return (min < 10 ? '0' : '') + min + ':' + (sec < 10 ? '0' : '') + sec;
    }

    function paintClock() {
      clock.textContent = format(left);
      if (bar) bar.style.width = (total ? ((total - left) / total) * 100 : 0) + '%';
      if (box) box.classList.toggle('timer--run', running);
      toggle.textContent = running ? 'Pausar' : (left === total ? 'Começar' : 'Continuar');
    }

    function stop() {
      clearInterval(tick);
      tick = 0;
      running = false;
      paintClock();
    }

    function start() {
      if (running || left <= 0) return;
      running = true;
      paintClock();
      tick = setInterval(function () {
        left -= 1;
        if (left <= 0) {
          left = 0;
          stop();
          clock.classList.add('is-done');
          if (hint) hint.textContent = 'Bloco concluído! Levante, beba água e volte em 5 minutos.';
          return;
        }
        paintClock();
      }, 1000);
    }

    toggle.addEventListener('click', function () {
      if (running) stop();
      else start();
    });

    if (reset) {
      reset.addEventListener('click', function () {
        stop();
        left = total;
        clock.classList.remove('is-done');
        if (hint) hint.textContent = 'Estude em blocos e descanse 5 minutos entre eles.';
        paintClock();
      });
    }

    presets.forEach(function (chip) {
      chip.addEventListener('click', function () {
        stop();
        total = Number(chip.dataset.min) * 60;
        left = total;
        clock.classList.remove('is-done');
        if (hint) hint.textContent = chip.dataset.min + ' minutos de foco. Sem celular por perto.';
        presets.forEach(function (item) { item.classList.toggle('is-on', item === chip); });
        paintClock();
      });
    });

    paintClock();
  })();

  /* ---------- teste rápido ---------- */
  (function quiz() {
    const box = $('#quiz');
    const count = $('#quiz-count');
    const score = $('#quiz-score');
    const bar = $('#quiz-bar');
    const question = $('#quiz-question');
    const options = $('#quiz-options');
    const feedback = $('#quiz-feedback');
    const next = $('#quiz-next');
    const restart = $('#quiz-restart');
    if (!box || !options) return;

    const POOL = [
      { q: 'Qual é o valor de x em 2x + 6 = 20?', a: ['7', '6', '8', '9'], right: 0, why: '2x = 14, então x = 7.' },
      { q: 'A fórmula de Bháskara resolve equações de qual grau?', a: ['1º grau', '2º grau', '3º grau', 'Qualquer grau'], right: 1, why: 'Ela resolve ax² + bx + c = 0.' },
      { q: 'Na dissertação-argumentativa, em quantos parágrafos o texto costuma ser organizado?', a: ['2', '3', '4', '6'], right: 2, why: 'Introdução, dois desenvolvimentos e conclusão.' },
      { q: 'Qual conectivo marca oposição?', a: ['Ademais', 'Entretanto', 'Portanto', 'Outrossim'], right: 1, why: '“Entretanto” contrapõe ideias.' },
      { q: 'Qual organela realiza a fotossíntese?', a: ['Mitocôndria', 'Ribossomo', 'Cloroplasto', 'Lisossomo'], right: 2, why: 'O cloroplasto tem clorofila.' },
      { q: 'F = m · a corresponde a qual lei de Newton?', a: ['1ª lei', '2ª lei', '3ª lei', 'Lei de Ohm'], right: 1, why: 'É a segunda lei, a fundamental da dinâmica.' },
      { q: 'Em que ano começou a Era Vargas?', a: ['1922', '1930', '1937', '1945'], right: 1, why: 'A Revolução de 1930 levou Vargas ao poder.' },
      { q: 'Quanto é 20% de 250?', a: ['25', '40', '50', '75'], right: 2, why: '0,20 × 250 = 50.' },
      { q: 'No cruzamento Aa × Aa, quantos fenótipos aparecem?', a: ['1', '2', '3', '4'], right: 1, why: 'Dois: dominante (3/4) e recessivo (1/4).' },
      { q: 'A proposta de intervenção fica em qual parte do texto?', a: ['Introdução', '1º desenvolvimento', '2º desenvolvimento', 'Conclusão'], right: 3, why: 'Ela fecha o texto, na conclusão.' },
      { q: 'Um aumento de 20% seguido de desconto de 20% deixa o preço…', a: ['Igual', 'Maior', 'Menor', 'O dobro'], right: 2, why: '1,20 × 0,80 = 0,96 — 4% menor.' },
      { q: 'Qual é a unidade de força no SI?', a: ['Joule', 'Newton', 'Watt', 'Pascal'], right: 1, why: 'Força se mede em newton (N).' },
    ];

    const TOTAL = 5;
    let deck = [];
    let index = 0;
    let hits = 0;
    let answered = false;

    function shuffle(list) {
      const copy = list.slice();
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = copy[i]; copy[i] = copy[j]; copy[j] = tmp;
      }
      return copy;
    }

    function paintScore() {
      if (score) score.textContent = hits + (hits === 1 ? ' acerto' : ' acertos');
      if (bar) bar.style.width = Math.round((index / TOTAL) * 100) + '%';
      if (count) count.textContent = 'Pergunta ' + Math.min(index + 1, TOTAL) + ' de ' + TOTAL;
    }

    function render() {
      answered = false;
      const item = deck[index];
      box.classList.remove('is-over');
      if (feedback) { feedback.textContent = ''; feedback.className = 'quiz__feedback'; }
      if (next) { next.hidden = true; next.textContent = index === TOTAL - 1 ? 'Ver resultado' : 'Próxima'; }
      paintScore();
      if (question) question.textContent = item.q;
      options.textContent = '';

      item.a.forEach(function (text, i) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'opt';
        button.textContent = text;
        button.addEventListener('click', function () {
          if (answered) return;
          answered = true;
          const right = i === item.right;
          if (right) hits += 1;
          Array.prototype.forEach.call(options.children, function (child, k) {
            child.disabled = true;
            if (k === item.right) child.classList.add('is-right');
            else if (k === i) child.classList.add('is-wrong');
          });
          if (feedback) {
            feedback.className = 'quiz__feedback ' + (right ? 'is-right' : 'is-wrong');
            feedback.textContent = (right ? 'Isso! ' : 'Quase. ') + item.why;
          }
          paintScore();
          if (next) next.hidden = false;
        });
        options.append(button);
      });
    }

    function finish() {
      box.classList.add('is-over');
      if (bar) bar.style.width = '100%';
      if (count) count.textContent = 'Resultado';
      if (feedback) {
        feedback.className = 'quiz__feedback ' + (hits >= 4 ? 'is-right' : 'is-wrong');
        feedback.textContent = hits + ' de ' + TOTAL + (hits >= 4
          ? ' — mandou bem, dá para subir a dificuldade.'
          : ' — vale reler o resumo da matéria e tentar de novo.');
      }
      if (question) question.textContent = hits >= 4 ? 'Fechou o bloco com folga.' : 'Revisar é parte do estudo.';
      options.textContent = '';
      if (next) next.hidden = true;
    }

    if (next) {
      next.addEventListener('click', function () {
        index += 1;
        if (index >= TOTAL) { finish(); return; }
        render();
      });
    }

    if (restart) {
      restart.addEventListener('click', function () {
        deck = shuffle(POOL).slice(0, TOTAL);
        index = 0;
        hits = 0;
        render();
      });
    }

    deck = shuffle(POOL).slice(0, TOTAL);
    render();
  })();

  /* atalho "/" leva direto para a busca */
  document.addEventListener('keydown', function (event) {
    if (event.key !== '/' || event.ctrlKey || event.metaKey) return;
    const tag = (event.target && event.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (!search) return;
    event.preventDefault();
    search.focus();
  });

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
    try { sessionStorage.setItem('luminsdk:v1:reveal', '1'); } catch (error) {}
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
