/* =========================================================
   LuminSDK — estatísticas do jogador e conquistas
   Tudo local: nada sai do navegador.

   · conta partidas, tempo jogado, jogos e categorias
   · guarda os últimos 7 dias e a sequência de dias
   · desbloqueia conquistas e avisa com um toast
   · desenha as telas de Estatísticas e Conquistas no painel Bônus

   Autor: Ryan Smith · Licença MIT
   ========================================================= */
(function () {
  'use strict';

  var KEY = 'luminsdk:progress:v1';
  var MAX_SESSION_MS = 6 * 60 * 60 * 1000; /* 6 h: evita contar aba dormindo */

  var data = load();
  var active = null;
  var listeners = [];

  function load() {
    var base = {
      v: 1,
      sessions: 0,
      ms: 0,
      games: {},
      categories: {},
      days: {},
      daily: {},
      challenges: {},
      bestSession: 0,
      bestDay: 0,
      firstAt: null,
      lastAt: null,
      achievements: {}
    };
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return base;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return base;
      return Object.assign(base, parsed, {
        games: parsed.games && typeof parsed.games === 'object' ? parsed.games : {},
        categories: parsed.categories && typeof parsed.categories === 'object' ? parsed.categories : {},
        days: parsed.days && typeof parsed.days === 'object' ? parsed.days : {},
        daily: parsed.daily && typeof parsed.daily === 'object' ? parsed.daily : {},
        challenges: parsed.challenges && typeof parsed.challenges === 'object' ? parsed.challenges : {},
        achievements: parsed.achievements && typeof parsed.achievements === 'object' ? parsed.achievements : {}
      });
    } catch (error) {
      return base;
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (error) {
      /* sem armazenamento: vale para esta sessão */
    }
  }

  function dayKey(date) {
    var d = date || new Date();
    var month = String(d.getMonth() + 1);
    if (month.length < 2) month = '0' + month;
    var day = String(d.getDate());
    if (day.length < 2) day = '0' + day;
    return d.getFullYear() + '-' + month + '-' + day;
  }

  function toast(message) {
    if (window.LuminLibrary && typeof window.LuminLibrary.toast === 'function') {
      window.LuminLibrary.toast(message);
    }
  }

  function emit() {
    listeners.forEach(function (fn) {
      try { fn(); } catch (error) { /* ignora */ }
    });
    window.dispatchEvent(new CustomEvent('lumin:progress'));
  }

  /* ---------- sessões ---------- */
  function start(game) {
    if (!game || !game.id) return;
    if (active && active.id === game.id) return;
    if (active) stop();

    active = {
      id: game.id,
      name: game.name || game.id,
      category: typeof game.category === 'string' ? game.category : '',
      at: Date.now()
    };
  }

  function accumulate() {
    var now = Date.now();
    var elapsed = Math.max(0, Math.min(MAX_SESSION_MS, now - active.at));
    active.ms = (active.ms || 0) + elapsed;
    active.at = now;
  }

  function pause() {
    if (!active || active.paused) return;
    accumulate();
    active.paused = true;
  }

  function resume() {
    if (!active || !active.paused) return;
    active.at = Date.now();
    active.paused = false;
  }

  function stop() {
    if (!active) return;
    accumulate();
    var elapsed = Math.min(MAX_SESSION_MS, active.ms || 0);
    var game = active;
    active = null;

    if (elapsed < 1000) return; /* abriu e fechou sem jogar: não conta */
    var now = Date.now();

    data.sessions += 1;
    data.ms += elapsed;
    if (elapsed > data.bestSession) data.bestSession = elapsed;

    var entry = data.games[game.id] || { name: game.name, sessions: 0, ms: 0, last: null };
    entry.name = game.name || entry.name;
    entry.sessions += 1;
    entry.ms += elapsed;
    entry.last = now;
    data.games[game.id] = entry;

    if (game.category) {
      var cat = data.categories[game.category] || { sessions: 0, ms: 0 };
      cat.sessions += 1;
      cat.ms += elapsed;
      data.categories[game.category] = cat;
    }

    var key = dayKey(new Date(now));
    data.days[key] = (data.days[key] || 0) + elapsed;
    if (data.days[key] > data.bestDay) data.bestDay = data.days[key];

    var today = data.daily[key] || (data.daily[key] = emptyDay());
    today.sessions += 1;
    today.ms += elapsed;
    today.games[game.id] = (today.games[game.id] || 0) + elapsed;
    if (game.category) today.categories[game.category] = (today.categories[game.category] || 0) + 1;
    if (new Date(now).getHours() >= 18) today.evening += 1;
    pruneDays();

    if (!data.firstAt) data.firstAt = now;
    data.lastAt = now;

    save();
    check();
    checkChallenges();
    emit();
  }

  /* ---------- desafios diários ---------- */

  function emptyDay() {
    return { sessions: 0, ms: 0, games: {}, categories: {}, evening: 0 };
  }

  function todayData() {
    var key = dayKey();
    var day = data.daily[key];
    if (!day || typeof day !== 'object') {
      day = emptyDay();
      data.daily[key] = day;
    }
    if (!day.games || typeof day.games !== 'object') day.games = {};
    if (!day.categories || typeof day.categories !== 'object') day.categories = {};
    if (!day.evening) day.evening = 0;
    return day;
  }

  /* guarda no máximo 60 dias detalhados */
  function pruneDays() {
    var keys = Object.keys(data.daily).sort();
    while (keys.length > 60) {
      delete data.daily[keys.shift()];
    }
  }

  function seedOf(text) {
    var hash = 2166136261;
    for (var i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function categoryChoices() {
    var known = Object.keys(data.categories);
    var fallback = ['Arcade', 'Puzzle', 'Ação', 'Corrida', 'Aventura'];
    return (known.length ? known : fallback).slice(0, 12);
  }

  /* três desafios por dia, sempre os mesmos naquele dia */
  function dailyChallenges() {
    var key = dayKey();
    var day = todayData();
    var seed = seedOf('lumin-' + key);
    var cats = categoryChoices();
    var pickCategory = cats[seed % cats.length] || 'Arcade';

    var pool = [
      function (n) {
        var goal = 3 + (n % 3);
        return {
          id: 'sessions', title: 'Pega o ritmo',
          desc: 'Jogue ' + goal + ' partidas hoje.',
          goal: goal, value: day.sessions
        };
      },
      function (n) {
        var goal = 10 + (n % 3) * 5;
        return {
          id: 'minutes', title: 'Um tempo de jogo',
          desc: 'Jogue ' + goal + ' minutos hoje.',
          goal: goal * 60000, value: day.ms, unit: 'time'
        };
      },
      function (n) {
        var goal = 2 + (n % 2);
        return {
          id: 'unique', title: 'Variedade',
          desc: 'Experimente ' + goal + ' jogos diferentes hoje.',
          goal: goal, value: Object.keys(day.games).length
        };
      },
      function () {
        return {
          id: 'category', title: 'Na sua categoria',
          desc: 'Jogue algo de ' + pickCategory + ' hoje.',
          goal: 1, value: day.categories[pickCategory] ? 1 : 0
        };
      },
      function () {
        return {
          id: 'evening', title: 'Sessão da noite',
          desc: 'Jogue uma partida depois das 18h.',
          goal: 1, value: day.evening
        };
      }
    ];

    var chosen = [];
    var indexes = [];
    for (var i = 0; i < 3; i++) {
      var idx = (seed + i * 7) % pool.length;
      var guard = 0;
      while (indexes.indexOf(idx) >= 0 && guard < pool.length * 2) {
        idx = (idx + 1) % pool.length;
        guard += 1;
      }
      indexes.push(idx);
      var built = pool[idx](seed + i);
      built.goal = Math.max(1, built.goal);
      built.done = built.value >= built.goal;
      built.percent = Math.min(100, Math.round((built.value / built.goal) * 100));
      chosen.push(built);
    }
    return chosen;
  }

  function completedDays() {
    return Object.keys(data.challenges).filter(function (key) {
      var done = data.challenges[key];
      return Array.isArray(done) && done.length >= 3;
    }).length;
  }

  function challengeStreak() {
    var cursor = new Date();
    var total = 0;
    for (var i = 0; i < 4000; i++) {
      var key = dayKey(cursor);
      var done = data.challenges[key];
      if (!done || !Array.isArray(done) || done.length < 3) {
        if (i === 0) { cursor.setDate(cursor.getDate() - 1); continue; }
        break;
      }
      total += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return total;
  }

  function checkChallenges() {
    var key = dayKey();
    var done = data.challenges[key] || (data.challenges[key] = []);
    var changed = false;
    var pending = dailyChallenges();
    pending.forEach(function (challenge) {
      if (done.indexOf(challenge.id) >= 0) return;
      if (!challenge.done) return;
      done.push(challenge.id);
      changed = true;
      toast('🎯 Desafio do dia: ' + challenge.title);
      window.dispatchEvent(new CustomEvent('lumin:challenge', { detail: { id: challenge.id } }));
    });
    if (changed) {
      save();
      emit();
    }
  }

  function challenges() {
    var list = dailyChallenges();
    var key = dayKey();
    var done = data.challenges[key] || [];
    return list.map(function (challenge) {
      return Object.assign({}, challenge, { claimed: done.indexOf(challenge.id) >= 0 });
    });
  }

  function renderChallenges(root) {
    if (!root) return;
    checkChallenges();
    var list = challenges();
    root.textContent = '';

    var doneCount = list.filter(function (item) { return item.claimed; }).length;
    var head = el('div', 'ach-summary');
    head.appendChild(el('strong', null, doneCount + ' de ' + list.length));
    head.appendChild(el('span', null, 'desafios de hoje'));
    var meter = el('div', 'ach-summary__track');
    var fill = el('span', 'ach-summary__fill');
    fill.style.width = Math.round((doneCount / list.length) * 100) + '%';
    meter.appendChild(fill);
    head.appendChild(meter);
    root.appendChild(head);

    var grid = el('div', 'chal-list');
    list.forEach(function (item) {
      var card = el('article', 'chal' + (item.claimed ? ' is-done' : ''));
      var badge = el('span', 'chal__badge', item.claimed ? '✓' : '•');
      card.appendChild(badge);

      var body = el('div', 'chal__body');
      body.appendChild(el('strong', 'chal__title', item.title));
      body.appendChild(el('p', 'chal__desc', item.desc));
      var track = el('div', 'chal__track');
      var bar = el('span', 'chal__fill');
      bar.style.width = (item.claimed ? 100 : item.percent) + '%';
      track.appendChild(bar);
      body.appendChild(track);
      body.appendChild(el('small', 'chal__meta', item.claimed
        ? 'Concluído · volta amanhã'
        : formatValue(Math.min(item.value, item.goal), item.unit) + ' de ' + formatValue(item.goal, item.unit)));
      card.appendChild(body);
      grid.appendChild(card);
    });
    root.appendChild(grid);

    var foot = el('p', 'chal__note');
    foot.textContent = completedDays() + ' dia(s) com os três desafios · sequência de ' +
      challengeStreak() + ' dia(s). Os desafios mudam à meia-noite.';
    root.appendChild(foot);
  }

  /* ---------- números derivados ---------- */
  function uniqueGames() {
    return Object.keys(data.games).length;
  }

  function favoriteCount() {
    try {
      if (window.LuminLibrary && typeof window.LuminLibrary.dataStats === 'function') {
        return window.LuminLibrary.dataStats().favorites || 0;
      }
    } catch (error) { /* ignora */ }
    return 0;
  }

  function streak() {
    var keys = Object.keys(data.days);
    if (!keys.length) return 0;
    var cursor = new Date();
    /* se hoje ainda não jogou, a sequência conta a partir de ontem */
    if (!data.days[dayKey(cursor)]) cursor.setDate(cursor.getDate() - 1);
    var total = 0;
    while (data.days[dayKey(cursor)]) {
      total += 1;
      cursor.setDate(cursor.getDate() - 1);
      if (total > 4000) break;
    }
    return total;
  }

  function playedAtHour(hourStart, hourEnd) {
    var now = new Date();
    var hour = now.getHours();
    if (hour >= hourStart && hour < hourEnd) return 1;
    return 0;
  }

  function playedOnWeekend() {
    var day = new Date().getDay();
    return day === 0 || day === 6 ? 1 : 0;
  }

  function stats() {
    return {
      sessions: data.sessions,
      ms: data.ms,
      unique: uniqueGames(),
      categories: Object.keys(data.categories).length,
      favorites: favoriteCount(),
      streak: streak(),
      bestSession: data.bestSession,
      bestDay: data.bestDay,
      days: data.days,
      games: data.games,
      category: data.categories,
      firstAt: data.firstAt,
      lastAt: data.lastAt,
      achievements: data.achievements
    };
  }

  /* ---------- conquistas ---------- */
  var ACHIEVEMENTS = [
    { id: 'first', title: 'Primeira partida', desc: 'Abra e jogue um jogo por pelo menos 1 segundo.', goal: 1, value: function (s) { return s.sessions; } },
    { id: 'sessions-10', title: 'Pegando o jeito', desc: 'Jogue 10 partidas.', goal: 10, value: function (s) { return s.sessions; } },
    { id: 'sessions-50', title: 'Maratonista', desc: 'Jogue 50 partidas.', goal: 50, value: function (s) { return s.sessions; } },
    { id: 'sessions-100', title: 'Viciado assumido', desc: 'Jogue 100 partidas.', goal: 100, value: function (s) { return s.sessions; } },
    { id: 'unique-10', title: 'Explorador', desc: 'Jogue 10 jogos diferentes.', goal: 10, value: function (s) { return s.unique; } },
    { id: 'unique-25', title: 'Colecionador', desc: 'Jogue 25 jogos diferentes.', goal: 25, value: function (s) { return s.unique; } },
    { id: 'cats-5', title: 'Gosto variado', desc: 'Passe por 5 categorias diferentes.', goal: 5, value: function (s) { return s.categories; } },
    { id: 'time-1h', title: 'Uma horinha', desc: 'Acumule 1 hora de jogo.', goal: 3600000, value: function (s) { return s.ms; }, unit: 'time' },
    { id: 'time-10h', title: 'Dez de dez', desc: 'Acumule 10 horas de jogo.', goal: 36000000, value: function (s) { return s.ms; }, unit: 'time' },
    { id: 'marathon', title: 'Sem pausa', desc: 'Fique 30 minutos no mesmo jogo.', goal: 1800000, value: function (s) { return s.bestSession; }, unit: 'time' },
    { id: 'streak-3', title: 'Três dias seguidos', desc: 'Jogue em 3 dias consecutivos.', goal: 3, value: function (s) { return s.streak; } },
    { id: 'streak-7', title: 'Semana cheia', desc: 'Jogue em 7 dias consecutivos.', goal: 7, value: function (s) { return s.streak; } },
    { id: 'night', title: 'Coruja', desc: 'Jogue entre meia-noite e 5 da manhã.', goal: 1, value: function () { return playedAtHour(0, 5); }, secret: true },
    { id: 'early', title: 'Madrugador', desc: 'Jogue entre 5 e 7 da manhã.', goal: 1, value: function () { return playedAtHour(5, 7); }, secret: true },
    { id: 'weekend', title: 'Fim de semana', desc: 'Jogue no sábado ou no domingo.', goal: 1, value: function () { return playedOnWeekend(); }, secret: true },
    { id: 'fav-1', title: 'Favorito', desc: 'Marque um jogo com o coração.', goal: 1, value: function (s) { return s.favorites; } },
    { id: 'fav-10', title: 'Curador', desc: 'Marque 10 jogos como favoritos.', goal: 10, value: function (s) { return s.favorites; } }
  ];

  function check() {
    var s = stats();
    var unlocked = false;
    ACHIEVEMENTS.forEach(function (achievement) {
      if (data.achievements[achievement.id]) return;
      var value = Number(achievement.value(s)) || 0;
      if (value >= achievement.goal) {
        data.achievements[achievement.id] = new Date().toISOString();
        unlocked = true;
        toast('🏆 Conquista desbloqueada: ' + achievement.title);
        window.dispatchEvent(new CustomEvent('lumin:achievement', { detail: { id: achievement.id, title: achievement.title } }));
      }
    });
    if (unlocked) save();
  }

  function achievements() {
    var s = stats();
    return ACHIEVEMENTS.map(function (achievement) {
      var value = Math.max(0, Number(achievement.value(s)) || 0);
      var unlockedAt = data.achievements[achievement.id] || null;
      return {
        id: achievement.id,
        title: achievement.title,
        desc: achievement.desc,
        goal: achievement.goal,
        value: Math.min(value, achievement.goal),
        percent: Math.min(100, Math.round((value / achievement.goal) * 100)),
        unlocked: !!unlockedAt,
        at: unlockedAt,
        secret: !!achievement.secret,
        unit: achievement.unit || 'count'
      };
    });
  }

  /* ---------- formatação ---------- */
  function formatTime(ms) {
    var total = Math.round((Number(ms) || 0) / 1000);
    if (total < 60) return total + ' s';
    var minutes = Math.floor(total / 60);
    if (minutes < 60) return minutes + ' min';
    var hours = Math.floor(minutes / 60);
    var rest = minutes % 60;
    return hours + ' h' + (rest ? ' ' + rest + ' min' : '');
  }

  function formatValue(value, unit) {
    if (unit === 'time') return formatTime(value);
    return String(value);
  }

  /* ---------- render: estatísticas ---------- */
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function renderStats(root) {
    if (!root) return;
    var s = stats();
    root.textContent = '';

    var grid = el('div', 'stats-grid');
    [
      [String(s.sessions), 'partidas'],
      [formatTime(s.ms), 'tempo total'],
      [String(s.unique), 'jogos diferentes'],
      [String(s.streak), s.streak === 1 ? 'dia seguido' : 'dias seguidos']
    ].forEach(function (item) {
      var card = el('div', 'stat-card');
      card.appendChild(el('span', 'stat-card__value', item[0]));
      card.appendChild(el('span', 'stat-card__label', item[1]));
      grid.appendChild(card);
    });
    root.appendChild(grid);

    /* últimos 7 dias */
    var week = el('section', 'stats-block');
    week.appendChild(el('h4', 'stats-block__title', 'Últimos 7 dias'));
    var chart = el('div', 'week-chart');
    var days = [];
    var max = 0;
    for (var i = 6; i >= 0; i--) {
      var date = new Date();
      date.setDate(date.getDate() - i);
      var key = dayKey(date);
      var ms = s.days[key] || 0;
      if (ms > max) max = ms;
      days.push({ date: date, ms: ms, key: key });
    }
    days.forEach(function (day) {
      var bar = el('div', 'week-chart__col');
      var track = el('div', 'week-chart__track');
      var fill = el('span', 'week-chart__fill');
      var height = max ? Math.max(4, Math.round((day.ms / max) * 100)) : 4;
      fill.style.height = height + '%';
      track.appendChild(fill);
      bar.appendChild(track);
      var label = el('span', 'week-chart__label', ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][day.date.getDay()]);
      bar.appendChild(label);
      bar.title = day.key + ' · ' + formatTime(day.ms);
      chart.appendChild(bar);
    });
    week.appendChild(chart);
    root.appendChild(week);

    /* categorias */
    var cats = Object.keys(s.category).map(function (name) {
      return { name: name, ms: s.category[name].ms, sessions: s.category[name].sessions };
    }).sort(function (a, b) { return b.ms - a.ms; }).slice(0, 5);

    var catBlock = el('section', 'stats-block');
    catBlock.appendChild(el('h4', 'stats-block__title', 'Categorias favoritas'));
    if (!cats.length) {
      catBlock.appendChild(el('p', 'stats-empty', 'Ainda sem dados — jogue alguma coisa!'));
    } else {
      cats.forEach(function (cat) {
        var row = el('div', 'bar-row');
        row.appendChild(el('span', 'bar-row__label', cat.name));
        var track = el('span', 'bar-row__track');
        var fill = el('span', 'bar-row__fill');
        fill.style.width = Math.max(4, Math.round((cat.ms / cats[0].ms) * 100)) + '%';
        track.appendChild(fill);
        row.appendChild(track);
        row.appendChild(el('span', 'bar-row__value', formatTime(cat.ms)));
        catBlock.appendChild(row);
      });
    }
    root.appendChild(catBlock);

    /* mais jogados */
    var top = Object.keys(s.games).map(function (id) {
      var game = s.games[id];
      return { id: id, name: game.name || id, ms: game.ms, sessions: game.sessions };
    }).sort(function (a, b) { return b.ms - a.ms; }).slice(0, 5);

    var topBlock = el('section', 'stats-block');
    topBlock.appendChild(el('h4', 'stats-block__title', 'Mais jogados'));
    if (!top.length) {
      topBlock.appendChild(el('p', 'stats-empty', 'Nenhuma partida registrada ainda.'));
    } else {
      var list = el('ol', 'top-list');
      top.forEach(function (game) {
        var item = el('li', 'top-list__item');
        item.appendChild(el('span', 'top-list__name', game.name));
        item.appendChild(el('span', 'top-list__meta', game.sessions + 'x · ' + formatTime(game.ms)));
        list.appendChild(item);
      });
      topBlock.appendChild(list);
    }
    root.appendChild(topBlock);

    var actions = el('div', 'stats-actions');
    var reset = el('button', 'btn btn--soft btn--sm btn--danger', 'Zerar estatísticas');
    reset.type = 'button';
    reset.addEventListener('click', function () {
      if (!window.confirm('Zerar partidas, tempo e conquistas deste navegador?')) return;
      resetAll();
      renderStats(root);
      toast('Estatísticas zeradas.');
    });
    actions.appendChild(reset);
    root.appendChild(actions);
  }

  /* ---------- render: conquistas ---------- */
  var MEDAL = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="5.2"></circle><path d="M8.6 13.5 7 21l5-2.4L17 21l-1.6-7.5"></path></svg>';
  var LOCK = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2.4"></rect><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7"></path></svg>';

  function renderAchievements(root) {
    if (!root) return;
    check(); /* garante que o que já foi alcançado aparece desbloqueado */
    var list = achievements();
    var unlocked = list.filter(function (item) { return item.unlocked; }).length;
    root.textContent = '';

    var head = el('div', 'ach-summary');
    head.appendChild(el('strong', null, unlocked + ' de ' + list.length));
    head.appendChild(el('span', null, ' conquistas desbloqueadas'));
    var meter = el('div', 'ach-summary__track');
    var meterFill = el('span', 'ach-summary__fill');
    meterFill.style.width = Math.round((unlocked / list.length) * 100) + '%';
    meter.appendChild(meterFill);
    head.appendChild(meter);
    root.appendChild(head);

    var grid = el('div', 'ach-grid');
    list.forEach(function (item) {
      var card = el('article', 'ach' + (item.unlocked ? ' is-unlocked' : ' is-locked'));
      var badge = el('span', 'ach__badge');
      badge.innerHTML = item.unlocked ? MEDAL : LOCK;
      card.appendChild(badge);

      var body = el('div', 'ach__body');
      body.appendChild(el('strong', 'ach__title', item.title));

      /* conquista secreta: não entrega a dica antes de ser desbloqueada */
      var hidden = item.secret && !item.unlocked;
      body.appendChild(el('p', 'ach__desc', hidden ? 'Conquista secreta — descubra jogando.' : item.desc));

      if (!hidden) {
        var track = el('div', 'ach__track');
        var fill = el('span', 'ach__fill');
        fill.style.width = (item.unlocked ? 100 : item.percent) + '%';
        track.appendChild(fill);
        body.appendChild(track);

        var meta = el('small', 'ach__meta', item.unlocked
          ? 'Desbloqueada'
          : formatValue(item.value, item.unit) + ' de ' + formatValue(item.goal, item.unit));
        body.appendChild(meta);
      }

      card.appendChild(body);
      grid.appendChild(card);
    });
    root.appendChild(grid);
  }

  function resetAll() {
    active = null;
    data = {
      v: 1, sessions: 0, ms: 0, games: {}, categories: {}, days: {}, daily: {},
      challenges: {}, bestSession: 0, bestDay: 0, firstAt: null, lastAt: null, achievements: {}
    };
    save();
    emit();
  }

  /* ---------- ciclo de vida ---------- */
  /* ao carregar, desbloqueia conquistas que já foram alcançadas antes */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(check, 900); });
  } else {
    setTimeout(check, 900);
  }

  window.addEventListener('pagehide', function () { stop(); });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') pause();
    else resume();
  });

  window.LuminProgress = {
    start: start,
    stop: stop,
    check: check,
    stats: stats,
    achievements: achievements,
    challenges: challenges,
    renderChallenges: renderChallenges,
    renderStats: renderStats,
    renderAchievements: renderAchievements,
    reset: resetAll,
    onChange: function (fn) {
      listeners.push(fn);
      return function () {
        var index = listeners.indexOf(fn);
        if (index >= 0) listeners.splice(index, 1);
      };
    }
  };
})();
