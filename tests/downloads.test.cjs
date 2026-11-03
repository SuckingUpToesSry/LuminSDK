const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname,'../assets/js/downloads.js'),'utf8');
function boot(fetch) {
  const window = {};
  vm.runInNewContext(source,{window,document:{baseURI:'https://portal.example/'},URL,fetch,Blob,DOMException});
  return window.LuminDownload;
}
const url = 'https://cdn.jsdelivr.net/gh/owner/repo@main/games/a%20b.html';
test('download fallback maps the exact public repository/path/ref, not an arbitrary proxy', () => {
  const list = boot().candidates(url);
  assert.equal(list.length,2); assert.equal(list[0].url,url);
  assert.equal(list[1].url,'https://api.github.com/repos/owner/repo/contents/games/a%20b.html?ref=main');
  assert.equal(list[1].headers.Accept,'application/vnd.github.raw+json');
  assert.equal(boot().candidates('https://example.com/game.html').length,1);
  for (const bad of ['http://example.com/file','javascript:alert(1)','https://user:pass@example.com/file']) assert.throws(() => boot().candidates(bad));
});
test('CDN failure retries GitHub raw without credentials and preserves file bytes', async () => {
  const requests = [];
  const api = boot(async (url,options) => { requests.push([url,options]); if (requests.length === 1) throw TypeError('CORS'); return new Response('<html>game</html>',{headers:{'content-type':'application/vnd.github.raw+json'}}); });
  const blob = await api.fetchFile(url,{type:'text/html'});
  assert.equal(await blob.text(),'<html>game</html>'); assert.equal(blob.type,'text/html');
  assert.equal(requests.length,2); for (const [,options] of requests) { assert.equal(options.credentials,'omit'); assert.equal(options.referrerPolicy,'no-referrer'); }
});
test('size bounds apply before reading and during streaming, without trying another source', async () => {
  for (const response of [new Response('x',{headers:{'content-length':String(51*1024*1024)}}),new Response('12345')]) {
    let calls = 0; const api = boot(async () => { calls++; return response; });
    await assert.rejects(api.fetchFile(url,{max:4}),/maior que 50 MB/); assert.equal(calls,1);
  }
});
test('an aborted download cannot start/retry; public API rate limits and non-file JSON are reported', async () => {
  const controller = new AbortController(); controller.abort(); let calls=0;
  await assert.rejects(boot(async () => {calls++;}).fetchFile(url,{signal:controller.signal}),{name:'AbortError'}); assert.equal(calls,0);
  await assert.rejects(boot(async () => new Response('',{status:403})).fetchFile(url),/HTTP 403/);
  let attempt=0;
  await assert.rejects(boot(async () => { if (!attempt++) throw Error('offline'); return new Response('{}',{headers:{'content-type':'application/json'}}); }).fetchFile(url),/metadados/);
});
test('cancelling an active fetch does not trigger the GitHub fallback', async () => {
  const controller = new AbortController(); let calls=0;
  const api = boot((url,options) => new Promise((resolve,reject) => { calls++; options.signal.addEventListener('abort',() => reject(new DOMException('Cancelled','AbortError')),{once:true}); }));
  const pending = api.fetchFile(url,{signal:controller.signal}); controller.abort();
  await assert.rejects(pending,{name:'AbortError'}); assert.equal(calls,1);
});
