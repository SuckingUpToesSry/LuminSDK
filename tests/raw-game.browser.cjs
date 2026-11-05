/* Regression: text/plain CDN HTML must execute as a sandboxed game, not display
   source. External engine/assets are mocked; no full game or 157 MB PCK download. */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const root = path.resolve(__dirname,'..');
const {chromium} = require(path.join(root,'.tmp/browser/node_modules/playwright-core'));
const fixture = `<html><base href="https://cdn.jsdelivr.net/gh/bubbls/UGS-Assets@15e85c42612500024c1cb8743f7f0e79fbc6ccbd/examination%20or%20smth/"><head><title>Reality</title></head><body><canvas id="canvas"></canvas><script src="index.js"></script><script>const engine=new Engine();engine.startGame();</script></body></html>`;
(async () => {
  process.env.AWS_EXECUTION_ENV = 'AWS_Lambda_nodejs22.x';
  const packaged = (await import(pathToFileURL(path.join(root,'.tmp/browser/node_modules/@sparticuz/chromium/build/index.js')))).default;
  const browser = await chromium.launch({executablePath:await packaged.executablePath(),headless:true,args:packaged.args.filter(arg => !/disable-web-security|disable-site-isolation|IsolateOrigins/.test(arg) && arg !== '--single-process')});
  try {
    const context = await browser.newContext({serviceWorkers:'block'});
    const errors=[],assets=[]; let mode='ok',cdnFailed=false;
    context.on('page',page => page.on('pageerror',error => errors.push(error.message)));
    await context.route('**/*',route => {
      const url = new URL(route.request().url());
      if (url.hostname === 'suckinguptoessry.github.io') {
        const name = url.pathname.replace(/^\/LuminSDK\//,'') || 'index.html';
        const file = path.resolve(root,name.endsWith('/') ? name+'index.html' : name);
        if (!file.startsWith(root+path.sep) || !fs.existsSync(file)) return route.fulfill({status:404,body:''});
        const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml'};
        return route.fulfill({contentType:types[path.extname(file)] || 'application/octet-stream',body:fs.readFileSync(file)});
      }
      const headers={'access-control-allow-origin':'*'};
      if (url.pathname.endsWith('/84.html')) {
        if (mode==='error') return route.fulfill({status:503,headers,body:'Unavailable'});
        if (mode==='fallback' && url.hostname!=='api.github.com') { cdnFailed=true; return route.abort(); }
        return route.fulfill({headers,contentType:'text/plain',body:mode==='actual' && fs.existsSync(path.join(root,'.tmp/examination.html')) ? fs.readFileSync(path.join(root,'.tmp/examination.html'),'utf8') : mode==='relative' ? '<canvas id="canvas"></canvas><script src="engine.js"></script>' : mode==='invalid' ? 'not an HTML game' : fixture});
      }
      if (url.pathname.endsWith('/index.js') || url.pathname.endsWith('/engine.js')) {
        assets.push(url.href);
        return route.fulfill({headers,contentType:'text/javascript',body:`class Engine { static isWebGLAvailable(){return true;} startGame(){document.querySelector('#canvas').dataset.started='yes';window.portalAccess=false;try {void parent.document.body;window.portalAccess=true;}catch(e){}return fetch('index.pck').then(r=>r.text()).then(text=>{document.querySelector('#canvas').dataset.asset=text;});} } if (document.querySelector('script[src="engine.js"]')) new Engine().startGame();`});
      }
      if (url.pathname.endsWith('/index.pck')) { assets.push(url.href); return route.fulfill({headers,body:'mock-pck'}); }
      return route.abort();
    });
    const page=await context.newPage();
    await page.goto('https://suckinguptoessry.github.io/LuminSDK/?cloak=0&anim=0&view=mgs');
    await page.waitForFunction(() => !!window.LuminMGS);
    await page.locator('#mgs-query').fill('Assessment Examination');
    async function launch() { const event=page.waitForEvent('popup'); await page.locator('.mgs-card').getByRole('button',{name:'Jogar',exact:true}).click(); return await event; }
    async function verify(popup) {
      const game=popup.frameLocator('#lumin-game-frame');
      await game.locator('#canvas[data-asset="mock-pck"]').waitFor();
      assert.equal(popup.url(),'about:blank');
      assert.equal(await game.locator('#canvas').getAttribute('data-started'),'yes');
      const frame=popup.frames().find(frame=>frame.parentFrame());
      assert.equal(await frame.evaluate(() => window.portalAccess),false,'untrusted srcdoc cannot read portal origin');
      assert.doesNotMatch(await popup.locator('iframe').getAttribute('sandbox'),/allow-same-origin/);
      assert.match(await popup.locator('iframe').getAttribute('srcdoc'),/<canvas/);
      await popup.close();
    }
    await verify(await launch());
    assert.ok(assets.some(url => url.includes('/examination%20or%20smth/index.js')));
    assert.ok(assets.some(url => url.includes('/examination%20or%20smth/index.pck')));
    mode='actual'; await verify(await launch());
    mode='relative'; await verify(await launch());
    assert.ok(assets.some(url=>url.includes('/games/engine.js')),'missing base resolves against game source, not the portal');
    mode='fallback'; await verify(await launch()); assert.equal(cdnFailed,true);
    mode='error'; const failed=await launch();
    await failed.getByRole('button',{name:'Tentar novamente'}).waitFor();
    assert.equal(failed.url(),'about:blank'); assert.match(await failed.locator('p').textContent(),/HTTP 503/);
    mode='ok'; await failed.getByRole('button',{name:'Tentar novamente'}).click(); await verify(failed);
    mode='invalid'; const invalid=await launch(); await invalid.getByRole('button',{name:'Tentar novamente'}).waitFor();
    assert.match(await invalid.locator('p').textContent(),/não retornou um documento HTML/); await invalid.close();
    assert.deepEqual(errors,[]);
    console.log('PASS: text/plain Examination-shaped HTML executes, existing base preserved before head, relative assets resolve, opaque sandbox blocks portal access, GitHub fallback, errors/retry and invalid responses. Engine/assets mocked, not full game completion.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
