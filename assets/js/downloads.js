/* Fetch public files without credentials. No proxy, authentication bypass or execution.
   jsDelivr GitHub files can fall back to GitHub's public raw Contents API. */
(function () {
  'use strict';
  if (window.LuminDownload) return;
  function candidates(raw) {
    const url = new URL(raw,document.baseURI);
    if (url.protocol !== 'https:' || url.username || url.password) throw Error('Use um endereço HTTPS público');
    const result = [{url:url.href}];
    if (url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'fastly.jsdelivr.net' || url.hostname === 'testingcf.jsdelivr.net') {
      const match = url.pathname.match(/^\/gh\/([^/]+)\/([^/@]+)@([^/]+)\/(.+)$/);
      if (match) {
        const [,owner,repo,ref,file] = match;
        if (/^[\w.-]+$/.test(owner) && /^[\w.-]+$/.test(repo)) {
          const path = file.split('/').map(part => encodeURIComponent(decodeURIComponent(part))).join('/');
          result.push({url:'https://api.github.com/repos/'+owner+'/'+repo+'/contents/'+path+'?ref='+encodeURIComponent(decodeURIComponent(ref)),headers:{Accept:'application/vnd.github.raw+json'}});
        }
      }
    }
    return result;
  }
  function tooLarge() { const error = Error('Arquivo maior que 50 MB; use os controles da fonte original'); error.code = 'SIZE_LIMIT'; return error; }
  async function read(response,options) {
    const max = options.max || 50*1024*1024;
    if (Number(response.headers.get('content-length')) > max) throw tooLarge();
    const type = options.type || response.headers.get('content-type') || 'application/octet-stream';
    if (!response.body || !response.body.getReader) {
      const blob = await response.blob(); if (blob.size > max) throw tooLarge(); return blob;
    }
    const reader = response.body.getReader(), chunks = []; let total = 0;
    try {
      while (true) {
        const part = await reader.read(); if (part.done) break;
        total += part.value.byteLength;
        if (total > max) { await reader.cancel(); throw tooLarge(); }
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
