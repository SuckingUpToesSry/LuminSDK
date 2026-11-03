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
  let data = null, current = null, selected = '', limit = PAGE, timeout = 0, favorites = new Set();
  const dialog = $('mgs-player'), frame = $('mgs-frame');
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
    const timer = setTimeout(() => controller.abort(),25000), max = 50*1024*1024;
    status.textContent = 'Baixando o HTML de “' + game.title + '”…';
    try {
      const response = await fetch(url,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});
      if (!response.ok) throw Error('HTTP ' + response.status);
      if (Number(response.headers.get('content-length')) > max) throw Error('Arquivo maior que 50 MB; use o download da fonte original');
      let blob;
      if (response.body && response.body.getReader) {
        const reader = response.body.getReader(), chunks = []; let total = 0;
        while (true) { const part = await reader.read(); if (part.done) break; total += part.value.byteLength; if (total > max) { await reader.cancel(); throw Error('Arquivo maior que 50 MB; use a fonte original'); } chunks.push(part.value); }
        blob = new Blob(chunks,{type:'text/html'});
      } else { blob = await response.blob(); if (blob.size > max) throw Error('Arquivo maior que 50 MB'); }
      const objectURL = URL.createObjectURL(blob), anchor = document.createElement('a');
      anchor.href = objectURL; anchor.download = (game.title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_-]+/gi,'-').slice(0,90) || game.id) + '.html';
      document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(objectURL),1000);
      status.textContent = 'HTML de “' + game.title + '” enviado ao navegador para salvar. Assets externos ainda podem precisar de internet.';
    } catch (error) { status.textContent = 'Não foi possível baixar: ' + (error.name === 'AbortError' ? 'tempo esgotado ou operação cancelada' : error.message) + '. CORS e restrições da fonte continuam valendo; tente o download no portal original.'; }
    finally { clearTimeout(timer); downloadController = null; }
  }
  function message(text) { $('mgs-status').textContent = text; }
  function open(item) {
    const url = safeURL(item.url); if (!url) return false;
    current = { title:item.title,url,kind:item.kind };
    $('mgs-player-title').textContent = item.title;
    $('mgs-player-origin').textContent = new URL(url).hostname;
    message('Solicitando a página externa. O portal não consegue inspecionar ou confirmar o conteúdo de um iframe de outra origem.');
    frame.title = item.title;
    if (window.LuminAnim) window.LuminAnim.hide();
    if (!dialog.open) dialog.showModal();
    frame.src = url;
    clearTimeout(timeout);
    timeout = setTimeout(() => { if (current) message('Se o conteúdo ficou em branco, tente outro mirror ou “Nova aba”. Login, indisponibilidade e bloqueios de iframe/CSP dependem da fonte e não são removidos por about:blank.'); },12000);
    return true;
  }
  function cleanup() {
    clearTimeout(timeout); timeout = 0; frame.src = 'about:blank'; current = null;
    if (document.fullscreenElement && dialog.contains(document.fullscreenElement)) document.exitFullscreen().catch(() => {});
  }
  function close() { if (dialog.open) dialog.close(); else cleanup(); }
  function openSource() { const chosen = source(); if (chosen) open({ title:chosen.name + ' · catálogo original', url:chosen.url, kind:'source' }); }
  function nextSource() {
    const list = sources(), index = list.findIndex(item => item.id === selected);
    selected = list[(index+1)%list.length].id; $('mgs-source').value = selected; save();
    openSource();
  }
  async function load() {
    $('mgs-retry').hidden = true; $('mgs-count').textContent = 'Lendo o índice local…';
    try {
      const response = await fetch('assets/data/mgs.json?v=65');
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
  $('mgs-source-next').addEventListener('click',nextSource);
  $('mgs-more').addEventListener('click',() => { limit += PAGE; render(); });
  $('mgs-retry').addEventListener('click',load);
  $('mgs-player-close').addEventListener('click',close);
  dialog.addEventListener('close',cleanup);
  frame.addEventListener('load',() => { if (current && frame.getAttribute('src') !== 'about:blank') message('O iframe recebeu um evento de carregamento. Verifique o conteúdo: esse evento não confirma que a fonte ou todos os jogos funcionaram.'); });
  $('mgs-player-reload').addEventListener('click',() => { if (current) open(current); });
  $('mgs-player-fullscreen').addEventListener('click',async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else if (dialog.requestFullscreen) await dialog.requestFullscreen(); else message('Tela cheia indisponível neste navegador.'); } catch (error) { message('O navegador não permitiu tela cheia.'); } });
  $('mgs-player-newtab').addEventListener('click',() => { if (current && (!window.LuminGameTab || !window.LuminGameTab.open(current.url,current.title))) message('Não foi possível abrir a aba. Libere pop-ups e tente novamente; o portal continua aberto.'); });
  window.addEventListener('lumin:view',event => { if (event.detail && event.detail.route !== 'mgs') close(); });
  window.addEventListener('pagehide',() => { cleanup(); if (downloadController) downloadController.abort(); });
  window.LuminMGS = { openSource,close,state:() => ({playing:!!current,kind:current && current.kind,source:selected,indexed:data ? data.games.length : 0,downloading:!!downloadController}) };
  renderSources();
  load();
})();
