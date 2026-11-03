/* StudyHub — biblioteca, cartões e oficina. Tudo local, sem conta ou IA remota. */
(function () {
  'use strict';
  const content = window.STUDY_CONTENT;
  if (!content || !document.getElementById('learn-lessons')) return;
  const $ = id => document.getElementById(id);
  const KEY = 'studydesk:v2:learning';
  const ids = new Set(content.lessons.map(item => item.id));
  let progress = { read: [], saved: [], known: [], attempts: 0, hits: 0 };
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    ['read', 'saved', 'known'].forEach(key => {
      progress[key] = Array.isArray(raw[key]) ? [...new Set(raw[key].filter(id => ids.has(id)))] : [];
    });
    progress.attempts = Math.max(0, Number(raw.attempts) || 0);
    progress.hits = Math.min(progress.attempts, Math.max(0, Number(raw.hits) || 0));
  } catch (error) {}
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch (error) {}
    paintStats();
  }
  function node(tag, text, cls) {
    const el = document.createElement(tag);
    if (text) el.textContent = text;
    if (cls) el.className = cls;
    return el;
  }
  function button(text, action) {
    const el = node('button', text, 'sd-btn sd-btn--ghost sd-btn--small');
    el.type = 'button'; el.addEventListener('click', action); return el;
  }
  function toggle(key, id) {
    const list = progress[key], index = list.indexOf(id);
    if (index < 0) list.push(id); else list.splice(index, 1);
    save();
  }
  function paintStats() {
    $('learn-stats').textContent = progress.read.length + '/' + content.lessons.length + ' resumos revisados · ' +
      progress.known.length + ' cartões dominados · ' + progress.hits + '/' + progress.attempts + ' acertos na oficina';
    $('flash-progress').textContent = progress.known.length + ' de ' + content.lessons.length + ' cartões marcados como “já sei”. Progresso salvo neste navegador.';
  }
  const normalize = text => String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  ['learn-subject', 'flash-subject'].forEach(id => {
    Object.keys(content.subjects).forEach(subject => {
      const option = node('option', content.subjects[subject]); option.value = subject; $(id).append(option);
    });
  });
  function paintLessons() {
    const query = normalize($('learn-search').value), subject = $('learn-subject').value;
    const lessons = content.lessons.filter(item => (!subject || subject === item.subject) &&
      (!$('learn-bookmarks').checked || progress.saved.includes(item.id)) &&
      normalize(item.title + ' ' + item.summary + ' ' + item.example).includes(query));
    const host = $('learn-lessons'); host.textContent = '';
    $('learn-count').textContent = lessons.length ? lessons.length + ' resumos encontrados.' : 'Nenhum resumo neste filtro. Tente outra busca ou desmarque “Só meus salvos”.';
    lessons.forEach(item => {
      const card = node('article', '', 'sd-learn-card');
      card.append(node('p', content.subjects[item.subject], 'sd-section__label'));
      const details = node('details'); details.append(node('summary', item.title));
      details.append(node('p', item.summary), node('h4', 'Exemplo resolvido'), node('p', item.example),
        node('h4', 'Cuidado com esta pegadinha'), node('p', item.trap));
      const actions = node('div', '', 'sd-learn-actions');
      const read = button(progress.read.includes(item.id) ? 'Revisado ✓' : 'Marcar como revisado', () => {
        toggle('read', item.id); read.textContent = progress.read.includes(item.id) ? 'Revisado ✓' : 'Marcar como revisado'; read.setAttribute('aria-pressed', String(progress.read.includes(item.id)));
      });
      read.setAttribute('aria-pressed', String(progress.read.includes(item.id)));
      const bookmark = button(progress.saved.includes(item.id) ? 'Salvo ★' : 'Salvar resumo', () => {
        toggle('saved', item.id); bookmark.textContent = progress.saved.includes(item.id) ? 'Salvo ★' : 'Salvar resumo'; bookmark.setAttribute('aria-pressed', String(progress.saved.includes(item.id)));
        if ($('learn-bookmarks').checked) paintLessons();
      });
      bookmark.setAttribute('aria-pressed', String(progress.saved.includes(item.id)));
      actions.append(read, bookmark); details.append(actions); card.append(details); host.append(card);
    });
  }
  ['learn-search', 'learn-subject', 'learn-bookmarks'].forEach(id => $(id).addEventListener(id === 'learn-search' ? 'input' : 'change', paintLessons));

  let flashIndex = 0, currentCard = null;
  function flashDeck() {
    return content.lessons.filter(item => (!$('flash-subject').value || item.subject === $('flash-subject').value) &&
      (!$('flash-pending').checked || !progress.known.includes(item.id)));
  }
  function paintFlash() {
    const deck = flashDeck(); flashIndex = deck.length ? flashIndex % deck.length : 0;
    currentCard = deck[flashIndex] || null;
    $('flash-count').textContent = deck.length ? 'Cartão ' + (flashIndex + 1) + ' de ' + deck.length : 'Nenhum cartão pendente neste filtro.';
    $('flash-question').textContent = currentCard ? currentCard.question : 'Tudo revisado por aqui! Troque a matéria ou desmarque o filtro de pendentes.';
    $('flash-answer').hidden = true; $('flash-answer').textContent = '';
    $('flash-flip').disabled = !currentCard; $('flash-flip').setAttribute('aria-expanded', 'false');
    $('flash-flip').textContent = 'Virar cartão'; $('flash-next').disabled = !currentCard;
    $('flash-again').disabled = true; $('flash-known').disabled = true;
    paintStats();
  }
  $('flash-flip').addEventListener('click', () => {
    if (!currentCard) return;
    const answer = $('flash-answer'); answer.hidden = !answer.hidden;
    answer.textContent = currentCard.choices[0] + '. ' + currentCard.summary;
    $('flash-flip').setAttribute('aria-expanded', String(!answer.hidden));
    $('flash-flip').textContent = answer.hidden ? 'Virar cartão' : 'Esconder resposta';
    $('flash-again').disabled = answer.hidden; $('flash-known').disabled = answer.hidden;
  });
  function markCard(known) {
    if (!currentCard || $('flash-answer').hidden) return;
    const id = currentCard.id;
    if (known && !progress.known.includes(id)) progress.known.push(id);
    if (!known) progress.known = progress.known.filter(value => value !== id);
    save();
    if (!known || !$('flash-pending').checked) flashIndex++;
    paintFlash();
  }
  $('flash-known').addEventListener('click', () => markCard(true));
  $('flash-again').addEventListener('click', () => markCard(false));
  $('flash-next').addEventListener('click', () => { flashIndex++; paintFlash(); });
  ['flash-subject', 'flash-pending'].forEach(id => $(id).addEventListener('change', () => { flashIndex = 0; paintFlash(); }));

  let problem = null, submitted = false, hintStep = 0;
  function nextProblem() {
    const n = 2 + Math.floor(Math.random() * 30), type = Math.floor(Math.random() * 3);
    if (type === 0) problem = { q: 'Calcule 25% de ' + (n*4) + '.', answer: n,
      hints: ['25% é o mesmo que 1/4.', 'Divida o valor total por 4.'], why: (n*4) + ' ÷ 4 = ' + n + '. Logo, 25% corresponde a ' + n + '.' };
    else if (type === 1) problem = { q: 'Resolva: 3x + 6 = ' + (3*n+6) + '.', answer: n,
      hints: ['Primeiro subtraia 6 dos dois lados.', 'Depois divida ambos os lados por 3.'], why: '3x = ' + (3*n) + '; x = ' + (3*n) + '/3 = ' + n + '. Conferência: 3 × ' + n + ' + 6 = ' + (3*n+6) + '.' };
    else problem = { q: 'Área de um triângulo: base ' + (2*n) + ' cm e altura 5 cm. Responda só o número em cm².', answer: n*5,
      hints: ['Área do triângulo = base × altura / 2.', 'Multiplique ' + (2*n) + ' por 5 e divida por 2.'], why: (2*n) + ' × 5 / 2 = ' + (n*5) + ' cm².' };
    submitted = false; hintStep = 0; $('practice-question').textContent = problem.q;
    $('practice-input').value = ''; $('practice-input').disabled = false;
    $('practice-feedback').textContent = ''; $('practice-solution').textContent = problem.why;
    $('practice-solution').parentElement.open = false;
  }
  $('practice-hint').addEventListener('click', () => { $('practice-feedback').textContent = problem.hints[Math.min(hintStep++, problem.hints.length - 1)]; });
  $('practice-next').addEventListener('click', nextProblem);
  $('practice-form').addEventListener('submit', event => {
    event.preventDefault(); if (submitted) return;
    const raw = $('practice-input').value.trim().replace(',', '.');
    if (!/^-?\d+(\.\d+)?$/.test(raw) || !Number.isFinite(Number(raw))) {
      $('practice-feedback').textContent = 'Digite um número válido (por exemplo, 12 ou 12,5).'; return;
    }
    submitted = true; const correct = Math.abs(Number(raw) - problem.answer) < 0.00001;
    progress.attempts++; if (correct) progress.hits++; save();
    $('practice-feedback').textContent = (correct ? 'Acertou! ' : 'Vamos corrigir: ') + problem.why;
    $('practice-input').disabled = true;
  });
  const HELP = {
    start: ['Escolha um tema pequeno na biblioteca, não uma matéria inteira.', 'Leia o conceito e acompanhe o exemplo.', 'Explique com suas palavras sem olhar.', 'Faça 5 perguntas e revise os erros.'],
    math: ['Copie os dados e o que a questão pede.', 'Escreva a fórmula ou a operação antes dos números.', 'Resolva uma etapa por linha e confira unidades e sinais.', 'Substitua seu resultado no enunciado ou estime se faz sentido.'],
    text: ['Leia o título e encontre o tema central.', 'Separe a ideia principal de cada parágrafo.', 'Veja a que palavras os pronomes se referem.', 'Resuma em duas frases e procure no texto evidências para sua resposta.'],
    memory: ['Feche o material e tente responder uma pergunta.', 'Confira e explique onde sua resposta ficou incompleta.', 'Use os cartões: marque “preciso revisar” sem medo.', 'Volte amanhã e alguns dias depois; espaçar é melhor que só reler.'],
    test: ['Liste os temas cobrados e identifique suas maiores dúvidas.', 'Divida o tempo disponível em blocos curtos com pausas.', 'Faça um simulado sem consultar os resumos.', 'Corrija os erros, revise conceitos e reserve tempo para dormir.']
  };
  function paintHelp() {
    const list = $('study-help-steps'); list.textContent = '';
    HELP[$('study-help').value].forEach(step => list.append(node('li', step)));
  }
  $('study-help').addEventListener('change', paintHelp);
  $('study-impact').checked = !!(window.LuminAnim && window.LuminAnim.state().enabled);
  $('study-impact').addEventListener('change', () => {
    if (window.LuminAnim) window.LuminAnim.setEnabled($('study-impact').checked);
  });
  $('study-reset').addEventListener('click', () => {
    if (!window.confirm('Apagar revisões, cartões e estatísticas dos quizzes? As tarefas do planejador e os dados de jogos serão preservados.')) return;
    progress = { read: [], saved: [], known: [], attempts: 0, hits: 0 };
    try { localStorage.removeItem('studydesk:v2:quiz'); } catch (error) {}
    save(); paintLessons(); paintFlash();
    window.dispatchEvent(new CustomEvent('study:reset'));
  });
  paintLessons(); paintFlash(); nextProblem(); paintHelp();
})();
