/* Optional browser smoke test: same .tmp/browser dependencies as transitions.browser.cjs.
   Local repository and mocked external pages only; no claim of live service availability. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname,'..');
const { chromium } = require(path.join(root,'.tmp/browser/node_modules/playwright-core'));
(async () => {
  process.env.AWS_EXECUTION_ENV = 'AWS_Lambda_nodejs22.x';
  const packaged = (await import(pathToFileURL(path.join(root,'.tmp/browser/node_modules/@sparticuz/chromium/build/index.js')))).default;
  const browser = await chromium.launch({executablePath:await packaged.executablePath(),headless:true,args:packaged.args.filter(arg => !/disable-web-security|disable-site-isolation|IsolateOrigins/.test(arg) && arg !== '--single-process')});
  try {
    const context = await browser.newContext({serviceWorkers:'block',acceptDownloads:true,viewport:{width:1366,height:900}});
    const errors = []; let indexFailure = false, downloadMode = 'ok';
    context.on('page',page => page.on('pageerror',error => errors.push(error.message)));
    await context.route('**/*',route => {
      const request = route.request(), url = new URL(request.url());
      if (url.hostname === 'suckinguptoessry.github.io') {
        const relative = url.pathname.replace(/^\/LuminSDK\//,'') || 'index.html';
        if (indexFailure && relative === 'assets/data/mgs.json') return route.fulfill({status:503,body:''});
        const file = path.resolve(root,relative.endsWith('/') ? relative+'index.html' : relative);
        if (!file.startsWith(root+path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return route.fulfill({status:404,body:''});
        const types = {'.js':'text/javascript','.css':'text/css','.json':'application/json','.html':'text/html','.svg':'image/svg+xml'};
        return route.fulfill({contentType:types[path.extname(file)] || 'application/octet-stream',body:fs.readFileSync(file)});
      }
      if (request.resourceType() === 'document') return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Mock external source</title><h1>Mock game or original portal</h1>'});
      if (request.resourceType() === 'fetch' && url.pathname.endsWith('.html')) {
        if (downloadMode === 'network') return route.abort();
        const headers = {'access-control-allow-origin':'*'};
        if (downloadMode === 'large') headers['content-length'] = String(51*1024*1024);
        return route.fulfill({status:downloadMode === 'http' ? 503 : 200,headers,contentType:'text/html',body:'<!doctype html><title>Mock game download</title>'});
      }
      return route.abort();
    });
    const page = await context.newPage();
    await page.goto('https://suckinguptoessry.github.io/LuminSDK/?demo&cloak=0&anim=0');
    await page.waitForFunction(() => !!window.LuminApp);
    assert.equal(await page.evaluate(() => typeof LuminMGS),'undefined');
    await page.keyboard.press('Shift+D');
    assert.equal(await page.evaluate(() => LuminApp.current()),'lumin');
    await page.locator('.tabrail [data-route="mgs"]').click();
    await page.waitForFunction(() => window.LuminMGS && LuminMGS.state().indexed === 630);
    assert.equal(await page.evaluate(() => LuminApp.current()),'mgs');
    assert.equal(await page.locator('.mgs-card').count(),60);
    assert.equal(await page.locator('#mgs-source option').count(),5);
    await page.locator('#mgs-more').click(); assert.equal(await page.locator('.mgs-card').count(),120);
    await page.locator('#mgs-query').fill('this game does not exist in this index');
    assert.equal(await page.locator('.mgs-card').count(),0); assert.equal(await page.locator('#mgs-empty').isVisible(),true);
    await page.locator('#mgs-query').fill('doom'); assert.ok(await page.locator('.mgs-card').count()>0);
    await page.locator('#mgs-query').fill('');
    await page.locator('#mgs-library').selectOption('UGS');
    assert.ok((await page.locator('.mgs-card__library').allTextContents()).every(value => value === 'UGS'));
    const az = await page.locator('.mgs-card h3').first().textContent();
    await page.locator('#mgs-sort').selectOption('za'); assert.notEqual(await page.locator('.mgs-card h3').first().textContent(),az);
    await page.locator('#mgs-library').selectOption(''); await page.locator('#mgs-sort').selectOption('az');
    await page.getByRole('button',{name:/^Favoritar /}).first().click();
    await page.locator('#mgs-favorites').check(); assert.equal(await page.locator('.mgs-card').count(),1);
    await page.locator('#mgs-favorites').uncheck();
    await page.locator('.mgs-card').first().getByRole('button',{name:'Jogar',exact:true}).click();
    await page.waitForFunction(() => LuminMGS.state().playing);
    assert.equal(await page.locator('#mgs-player').evaluate(node => node.open),true);
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('is-playing')),false);
    const gameURL = await page.locator('#mgs-frame').getAttribute('src'); assert.match(gameURL,/^https:/);
    assert.equal(await page.evaluate(() => LuminMGS.state().kind),'game');
    await page.locator('#mgs-player-reload').click(); assert.equal(await page.locator('#mgs-frame').getAttribute('src'),gameURL);
    await page.locator('#mgs-player-close').focus();
    await page.keyboard.press('Shift+J'); await page.keyboard.press('Shift+D'); await page.keyboard.press('Control+k');
    assert.equal(await page.evaluate(() => LuminApp.current()),'mgs');
    assert.equal(await page.locator('#personal-launcher').evaluate(node => node.open),false);
    const popupEvent = page.waitForEvent('popup'); await page.locator('#mgs-player-newtab').click();
    const popup = await popupEvent; await popup.waitForSelector('#lumin-game-frame');
    assert.equal(popup.url(),'about:blank'); assert.equal(await popup.locator('iframe').getAttribute('src'),gameURL);
    assert.equal(await popup.evaluate(() => window.opener),null); await popup.close();
    await page.locator('#mgs-player-close').click();
    await page.waitForFunction(() => !LuminMGS.state().playing);
    assert.equal(await page.locator('#mgs-frame').getAttribute('src'),'about:blank');
    await page.locator('#mgs-source-open').click();
    assert.equal(await page.evaluate(() => LuminMGS.state().kind),'source');
    assert.match(await page.locator('#mgs-frame').getAttribute('src'),/id=HVLL6YBBC5$/);
    await page.locator('#mgs-source-next').click(); assert.match(await page.locator('#mgs-frame').getAttribute('src'),/id=V9KM79NFHC$/);
    await page.keyboard.press('Escape'); await page.waitForFunction(() => !LuminMGS.state().playing);
    const downloadEvent = page.waitForEvent('download');
    await page.locator('.mgs-card').first().getByRole('button',{name:'Baixar HTML'}).click();
    const download = await downloadEvent;
    assert.match(download.suggestedFilename(),/\.html$/); assert.match(fs.readFileSync(await download.path(),'utf8'),/Mock game download/);
    for (const [mode,expected] of [['large','maior que 50 MB'],['http','HTTP 503'],['network','CORS']]) {
      downloadMode = mode;
      await page.locator('.mgs-card').first().getByRole('button',{name:'Baixar HTML'}).click();
      await page.waitForFunction(expected => document.querySelector('#mgs-download-status').textContent.includes(expected),expected);
      assert.equal(await page.evaluate(() => LuminMGS.state().downloading),false);
    }
    downloadMode = 'ok';
    await page.evaluate(() => LuminAstolfo.on());
    await page.screenshot({path:path.join(root,'.tmp/mgs-desktop.png'),fullPage:false});
    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1));
    await page.locator('#mgs-source-open').click();
    assert.ok(await page.evaluate(() => document.querySelector('#mgs-player').getBoundingClientRect().width <= innerWidth+1));
    await page.locator('#mgs-player-close').click();
    await page.locator('#mgs-query').fill('doom');
    await page.screenshot({path:path.join(root,'.tmp/mgs-mobile.png'),fullPage:false});
    await page.evaluate(() => LuminApp.go('estudo'));
    assert.equal(await page.evaluate(() => document.querySelector('link[href*="mgs.css"]').disabled),true);
    await page.evaluate(() => document.activeElement.blur());
    await page.keyboard.press('Control+k'); await page.locator('#personal-launcher-search').fill('multiple games');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => LuminApp.current()),'mgs');
    assert.equal(await page.locator('.mgs-card').count()>0,true);
    indexFailure = true;
    const offline = await context.newPage();
    await offline.goto('https://suckinguptoessry.github.io/LuminSDK/?cloak=0&anim=0&view=mgs');
    await offline.waitForFunction(() => !!window.LuminMGS && !document.querySelector('#mgs-retry').hidden);
    assert.equal(await offline.locator('#mgs-source').inputValue(),'V9KM79NFHC');
    await offline.locator('#mgs-source-open').click();
    assert.equal(await offline.evaluate(() => LuminMGS.state().kind),'source');
    await offline.locator('#mgs-player-close').click();
    indexFailure = false; await offline.locator('#mgs-retry').click();
    await offline.waitForFunction(() => LuminMGS.state().indexed === 630);
    await offline.locator('#mgs-favorites').check(); assert.equal(await offline.locator('.mgs-card').count(),1);
    await offline.evaluate(() => { LuminMGS.openSource(); LuminApp.go('estudo'); });
    await offline.waitForFunction(() => !LuminMGS.state().playing);
    assert.equal(await offline.locator('#mgs-frame').getAttribute('src'),'about:blank');
    assert.deepEqual(errors,[]);
    await context.close();
    console.log('PASS: MGS lazy route, 630 unique metadata entries, pagination/search/libraries/sort/favorites, sandboxed player/reload/cleanup, D/J/Ctrl+K guards, about:blank popup, original mirrors, HTML download and size/HTTP/network failures, mobile, launcher, saved state, index failure/retry. External pages mocked, not live-verified.');
  } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exitCode=1;});
