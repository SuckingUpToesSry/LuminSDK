/* M. G. S. — Multiple Games Sources. Metadata only, original sources remain accessible.
   Cross-origin iframe contents cannot be read or certified by the portal. */
(function () {
  'use strict';
  if (window.LuminMGS) return;
  const $ = id => document.getElementById(id);
  if (!$('mgs-grid')) return;
  const STORE = 'luminsdk:mgs:v1', PAGE = 60;
  const ORIGINAL_SOURCES = ['HVLL6YBBC5','V9KM79NFHC','J4JXSS9W3N','GEMXRNAA6W','HUZSGDFGGP'].map((id,index) => ({id,name:'WebSight · Fonte '+(index+1),url:'https://script.google.com/macros/s/AKfycbw3KzPix7iLtyJFB7eVqm2NCWhRoqSl0G38p7YeJm6KEHlETcuc-8jVnom69pUcwQUk/exec?id='+id}));
  let downloadController = null;
  let data = null, selected = '', limit = PAGE, favorites = new Set();
  try { const saved = JSON.parse(localStorage.getItem(STORE) || '{}'); if (Array.isArray(saved.favorites)) favorites = new Set(saved.favorites.filter(value => typeof value === 'string').slice(0,3000)); if (typeof saved.source === 'string') selected = saved.source; } catch (error) {}
  function save() { try { localStorage.setItem(STORE,JSON.stringify({favorites:[...favorites],source:selected})); } catch (error) {} }
  function safeURL(raw) { try { const url = new URL(raw); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; } catch (error) { return ''; } }
  function node(tag,text,cls) { const item = document.createElement(tag); if (text) item.textContent = text; if (cls) item.className = cls; return item; }
  function button(text,action,cls) { const item = node('button',text,cls || 'btn btn--soft btn--sm'); item.type = 'button'; item.addEventListener('click',action); return item; }
  function sources() { return data ? data.sources : ORIGINAL_SOURCES; }
  function source() { return sources().find(item => item.id === selected) || sources()[0]; }
  function renderSources() {
    const select = $('mgs-source'); select.textContent = '';
    if (!sources().some(item => item.id === selected)) selected = sources()[0].id;
    sources().forEach(item => { const option = node('option',item.name + ' · ' + item.id); option.value = item.id; select.append(option); }); select.value = selected;
    $('mgs-source-open').disabled = false;
  }
  function normalize(value) { return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); }
  function render() {
    if (!data) return;
    const query = normalize($('mgs-query').value), library = $('mgs-library').value;
    const items = data.games.filter(game => (!library || game.library === library) && (!$('mgs-favorites').checked || favorites.has(game.id)) && normalize(game.title + ' ' + game.library).includes(query));
    if ($('mgs-sort').value === 'za') items.reverse();
    const host = $('mgs-grid'); host.textContent = '';
    items.slice(0,limit).forEach(game => {
      const card = node('article','', 'mgs-card'), art = node('div','', 'mgs-card__art');
      art.append(node('span',game.title.slice(0,2).toUpperCase(),'mgs-card__initial'));
      if (safeURL(game.image)) {
        const image = document.createElement('img'); image.src = game.image; image.alt = ''; image.loading = 'lazy'; image.decoding = 'async'; image.referrerPolicy = 'no-referrer';
        image.addEventListener('error', () => image.remove()); art.append(image);
      }
      card.append(art,node('p',game.library,'mgs-card__library'),node('h3',game.title));
      const actions = node('div','','mgs-card__actions');
      const play = button('Jogar',() => open({title:game.title,url:game.url,kind:'game'}),'btn btn--primary btn--sm');
      const favorite = button(favorites.has(game.id) ? '★' : '☆',() => {
        if (favorites.has(game.id)) favorites.delete(game.id); else favorites.add(game.id);
        save(); if ($('mgs-favorites').checked) render(); else { favorite.textContent = favorites.has(game.id) ? '★' : '☆'; favorite.setAttribute('aria-pressed',String(favorites.has(game.id))); }
      });
      favorite.setAttribute('aria-label','Favoritar ' + game.title); favorite.setAttribute('aria-pressed',String(favorites.has(game.id)));
      const download = button('Baixar HTML',() => downloadGame(game));
      actions.append(play,download,favorite); card.append(actions); host.append(card);
    });
    $('mgs-count').textContent = items.length + ' jogos no filtro · ' + Math.min(items.length,limit) + ' exibidos · ' + data.games.length + ' URLs únicas no índice';
    $('mgs-more').hidden = items.length <= limit;
    $('mgs-empty').hidden = !!items.length;
  }
  async function downloadGame(game) {
    const status = $('mgs-download-status');
    if (downloadController) { status.textContent = 'Aguarde o download atual terminar antes de iniciar outro.'; return; }
    const url = safeURL(game.url); if (!url) return;
    const controller = new AbortController(); downloadController = controller;
    const timer = setTimeout(() => controller.abort(),25000);
    $('mgs-download-cancel').hidden = false; $('mgs-download-recovery').hidden = true;
    status.textContent = 'Baixando o HTML de “' + game.title + '”…';
    try {
      if (!window.LuminDownload) throw Error('Módulo de download indisponível');
      const blob = await window.LuminDownload.fetchFile(url,{signal:controller.signal,type:'text/html',onAttempt:index => {
        if (index) status.textContent = 'A fonte CDN não respondeu. Tentando o arquivo público no GitHub…';
      }});
      const objectURL = URL.createObjectURL(blob), anchor = document.createElement('a');
      anchor.href = objectURL; anchor.download = (game.title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_-]+/gi,'-').slice(0,90) || game.id) + '.html';
      document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(objectURL),1000);
      status.textContent = 'HTML de “' + game.title + '” enviado ao navegador para salvar. Assets externos ainda podem precisar de internet.';
    } catch (error) {
      status.textContent = 'Não foi possível baixar: ' + (controller.signal.aborted ? (controller.userCancelled ? 'cancelado por você' : 'tempo esgotado') : error.message) + '. CORS, limites da API e restrições da fonte continuam valendo. Use os links abaixo para tentar os controles originais.';
      $('mgs-download-file').href = url; $('mgs-download-file').textContent = 'Abrir arquivo de “' + game.title + '” · about:blank';
      $('mgs-download-recovery').hidden = false;
    }
    finally { clearTimeout(timer); downloadController = null; $('mgs-download-cancel').hidden = true; }
  }
  function open(item) {
    const url = safeURL(item.url); if (!url) return false;
    if (window.LuminLinks) return window.LuminLinks.open(url,item.title);
    return !!(window.LuminGameTab && window.LuminGameTab.open(url,item.title));
  }
  function openSource() { const chosen = source(); if (chosen) return open({title:chosen.name + ' · portal original',url:chosen.url}); }
  async function load() {
    $('mgs-retry').hidden = true; $('mgs-count').textContent = 'Lendo o índice local…';
    try {
      const response = await fetch('assets/data/mgs.json?v=73');
      if (!response.ok) throw Error('HTTP '+response.status);
      const raw = await response.json();
      if (!Array.isArray(raw.games) || !Array.isArray(raw.sources) || raw.sources.length !== 5) throw Error('Índice inválido');
      const ids = new Set();
      raw.games = raw.games.filter(game => game && typeof game.id === 'string' && typeof game.title === 'string' && typeof game.library === 'string' && safeURL(game.url) && !ids.has(game.id) && ids.add(game.id));
      raw.sources = raw.sources.filter((item,index) => item && item.id === ORIGINAL_SOURCES[index].id && item.url === ORIGINAL_SOURCES[index].url);
      if (!raw.games.length || raw.sources.length !== 5) throw Error('Não há dados válidos');
      data = raw;
      renderSources();
      const library = $('mgs-library'); library.textContent = ''; const all = node('option','Todas as bibliotecas'); all.value = ''; library.append(all);
      [...new Set(data.games.map(game => game.library))].sort().forEach(name => { const option = node('option',name); option.value = name; library.append(option); });
      $('mgs-meta').textContent = data.sources.length + ' fontes originais · ' + data.games.length + ' jogos indexados · snapshot ' + data.generatedAt;
      $('mgs-source-open').disabled = false; render();
    } catch (error) {
      $('mgs-count').textContent = 'Não foi possível ler o índice. Verifique a conexão e tente novamente. O portal original continua disponível acima.';
      $('mgs-meta').textContent = '5 fontes originais · índice local indisponível';
      $('mgs-retry').hidden = false;
    }
  }
  ['mgs-query','mgs-library','mgs-favorites','mgs-sort'].forEach(id => $(id).addEventListener(id === 'mgs-query' ? 'input' : 'change',() => { limit = PAGE; render(); }));
  $('mgs-source').addEventListener('change', () => { selected = $('mgs-source').value; save(); });
  $('mgs-source-open').addEventListener('click',openSource);
  $('mgs-more').addEventListener('click',() => { limit += PAGE; render(); });
  $('mgs-retry').addEventListener('click',load);
  $('mgs-download-cancel').addEventListener('click',() => { if (downloadController) { downloadController.userCancelled = true; downloadController.abort(); } });
  document.querySelectorAll('[data-mgs-copy]').forEach(button => button.addEventListener('click',async () => {
    const item = ORIGINAL_SOURCES.find(source => source.id === button.dataset.mgsCopy); if (!item) return;
    try { await navigator.clipboard.writeText(item.url); $('mgs-source-status').textContent = 'Link da ' + item.name + ' copiado.'; }
    catch (error) { $('mgs-source-status').textContent = 'Não foi possível copiar automaticamente. Selecione e copie o endereço visível abaixo.'; }
  }));
  window.addEventListener('pagehide',() => { if (downloadController) downloadController.abort(); });
  window.LuminMGS = {openSource,state:() => ({source:selected,indexed:data ? data.games.length : 0,downloading:!!downloadController})};
  renderSources();
  load();
})();
