/* Fetch public files without credentials. No proxy, authentication bypass or execution.
   jsDelivr GitHub files can fall back to GitHub's public raw Contents API. */
(function () {
  'use strict';
  if (window.LuminDownload) return;
  /* Reconhece o mesmo arquivo em qualquer um dos espelhos públicos do GitHub.
     Serve para, quando um host está bloqueado na rede (filtro de escola,
     proxy do console), o mesmo "servidor" tentar por outra porta: jsDelivr,
     GitHub cru, githack, statically e a API do GitHub (que costuma passar
     onde CDN não passa). */
  function ghParts(url) {
    let m;
    if ((m = url.pathname.match(/^\/gh\/([^/]+)\/([^/@]+)@([^/]+)\/(.+)$/))) return { owner: m[1], repo: m[2], ref: m[3], path: m[4] };
    if (url.hostname === 'raw.githubusercontent.com' && (m = url.pathname.match(/^\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/))) return { owner: m[1], repo: m[2], ref: m[3], path: m[4] };
    if ((url.hostname === 'raw.githack.com' || url.hostname === 'rawcdn.githack.com') && (m = url.pathname.match(/^\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/))) return { owner: m[1], repo: m[2], ref: m[3], path: m[4] };
    if (url.hostname === 'cdn.statically.io' && (m = url.pathname.match(/^\/gh\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/))) return { owner: m[1], repo: m[2], ref: m[3], path: m[4] };
    return null;
  }

  function candidates(raw) {
    const url = new URL(raw,document.baseURI);
    if (url.protocol !== 'https:' || url.username || url.password) throw Error('Use um endereço HTTPS público');
    const result = [{url:url.href}];
    const seen = new Set([url.href]);
    const add = function (candidate) {
      if (!candidate || seen.has(candidate.url)) return;
      seen.add(candidate.url);
      result.push(candidate);
    };

    const parts = ghParts(url);
    if (parts && /^[\w.-]+$/.test(parts.owner) && /^[\w.-]+$/.test(parts.repo)) {
      let path = parts.path;
      try { path = path.split('/').map(part => encodeURIComponent(decodeURIComponent(part))).join('/'); } catch (error) { path = parts.path; }
      const ref = encodeURIComponent(decodeURIComponent(parts.ref));
      add({url:'https://api.github.com/repos/'+parts.owner+'/'+parts.repo+'/contents/'+path+'?ref='+ref,headers:{Accept:'application/vnd.github.raw+json'}});
      add({url:'https://cdn.jsdelivr.net/gh/'+parts.owner+'/'+parts.repo+'@'+parts.ref+'/'+parts.path});
      add({url:'https://raw.githubusercontent.com/'+parts.owner+'/'+parts.repo+'/'+parts.ref+'/'+parts.path});
      add({url:'https://cdn.statically.io/gh/'+parts.owner+'/'+parts.repo+'/'+parts.ref+'/'+parts.path});
    }
    return result;
  }
  function tooLarge(max) {
    const bytes = max || 50*1024*1024;
    const limit = bytes >= 1048576 ? Math.round(bytes / 1048576) + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB';
    const error = Error('Arquivo maior que ' + limit + '; use os controles da fonte original');
    error.code = 'SIZE_LIMIT'; return error;
  }
  async function read(response,options) {
    const max = options.max || 50*1024*1024;
    if (Number(response.headers.get('content-length')) > max) throw tooLarge(max);
    /* as:'text' — quem vai usar o arquivo como texto (jogos em HTML) recebe
       uma string direto: sem blob no meio, que era uma cópia inteira a mais
       do arquivo na memória do navegador. */
    if (options.as === 'text') {
      /* leitura em partes: o texto vai sendo decodificado aos poucos, sem
         guardar o arquivo em bytes e em texto ao mesmo tempo, e dá para
         mostrar o quanto já veio (jogos de dezenas de MB) */
      if (!response.body || !response.body.getReader) {
        const text = await response.text();
        if (text.length > max) throw tooLarge(max);
        return text;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      const parts = []; let total = 0;
      try {
        for (;;) {
          const part = await reader.read();
          if (part.done) break;
          total += part.value.byteLength;
          if (total > max) { await reader.cancel(); throw tooLarge(max); }
          parts.push(decoder.decode(part.value, { stream: true }));
          if (options.onProgress) options.onProgress(total);
        }
        parts.push(decoder.decode());
      } finally { reader.releaseLock(); }
      return parts.join('');
    }
    const type = options.type || response.headers.get('content-type') || 'application/octet-stream';
    if (!response.body || !response.body.getReader) {
      const blob = await response.blob(); if (blob.size > max) throw tooLarge(max); return blob;
    }
    const reader = response.body.getReader(), chunks = []; let total = 0;
    try {
      while (true) {
        const part = await reader.read(); if (part.done) break;
        total += part.value.byteLength;
        if (total > max) { await reader.cancel(); throw tooLarge(max); }
        chunks.push(part.value);
      }
    } finally { reader.releaseLock(); }
    return new Blob(chunks,{type});
  }
  async function fetchFile(raw,options) {
    options = options || {}; let last;
    for (const [index,item] of candidates(raw).entries()) {
      if (options.signal && options.signal.aborted) throw new DOMException('Cancelado','AbortError');
      if (options.onAttempt) options.onAttempt(index,item.url);
      try {
        const response = await fetch(item.url,{signal:options.signal,headers:item.headers,credentials:'omit',referrerPolicy:'no-referrer'});
        if (!response.ok) throw Error('HTTP '+response.status);
        if (index > 0 && /application\/json/i.test(response.headers.get('content-type') || '')) throw Error('A fonte retornou metadados, não o arquivo');
        return await read(response,options);
      } catch (error) {
        if (error.name === 'AbortError' || options.signal && options.signal.aborted || error.code === 'SIZE_LIMIT') throw error;
        last = error;
      }
    }
    throw last || Error('Arquivo indisponível');
  }
  window.LuminDownload = {candidates,fetchFile};
})();
