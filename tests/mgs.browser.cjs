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
        if (downloadMode === 'network' || downloadMode === 'fallback' && url.hostname !== 'api.github.com') return route.abort();
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
    async function checkPopup(action,expected,owner=page) {
      const event = owner.waitForEvent('popup'); await action(); const popup = await event;
      await popup.waitForSelector('#lumin-game-frame');
      assert.equal(popup.url(),'about:blank'); assert.equal(await popup.evaluate(() => window.opener),null);
      const frameURL = await popup.locator('iframe').getAttribute('data-source-url');
      if (expected instanceof RegExp) assert.match(frameURL,expected); else if (expected) assert.equal(frameURL,expected);
      assert.match(await popup.locator('iframe').getAttribute('sandbox'),/allow-downloads/);
      await popup.close();
    }
    await checkPopup(() => page.locator('.mgs-card').first().getByRole('button',{name:'Jogar',exact:true}).click(),/^https:/);
    const originalLinks = page.locator('.mgs-originals li a'); assert.equal(await originalLinks.count(),5);
    for (let i=0;i<5;i++) {
      const link = originalLinks.nth(i), expected = await link.getAttribute('href');
      await checkPopup(() => link.click(),expected);
    }
    await checkPopup(() => originalLinks.first().click({modifiers:['Control']}));
    await checkPopup(() => originalLinks.first().click({button:'middle'}));
    await checkPopup(() => page.locator('.mgs-credits a').click(),'https://github.com/Onex558/uranium-source-');
    await page.evaluate(() => Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text => { window.copiedSource=text; }}}));
    await page.locator('[data-mgs-copy]').first().click();
    assert.equal(await page.evaluate(() => window.copiedSource),await originalLinks.first().getAttribute('href'));
    await page.locator('#mgs-source').selectOption('V9KM79NFHC');
    await checkPopup(() => page.locator('#mgs-source-open').click(),/id=V9KM79NFHC$/);
    const before = page.url();
    await page.evaluate(() => { const original=window.open; window.open=()=>null; window.restoreOpen=()=>window.open=original; });
    await originalLinks.first().click(); assert.equal(await page.locator('#lumin-link-status').isVisible(),true); assert.equal(page.url(),before);
    await page.evaluate(() => window.restoreOpen()); await page.locator('#lumin-link-status button').click();
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
    downloadMode = 'fallback';
    const fallbackEvent = page.waitForEvent('download');
    await page.locator('.mgs-card').first().getByRole('button',{name:'Baixar HTML'}).click();
    const fallbackDownload = await fallbackEvent; assert.match(fs.readFileSync(await fallbackDownload.path(),'utf8'),/Mock game download/);
    downloadMode = 'ok';
    await page.evaluate(() => LuminAstolfo.on());
    await page.screenshot({path:path.join(root,'.tmp/mgs-desktop.png'),fullPage:false});
    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1));
    await checkPopup(() => page.locator('#mgs-source-open').click(),/id=V9KM79NFHC$/);
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
    await checkPopup(() => offline.locator('#mgs-source-open').click(),/id=V9KM79NFHC$/,offline);
    indexFailure = false; await offline.locator('#mgs-retry').click();
    await offline.waitForFunction(() => LuminMGS.state().indexed === 630);
    await offline.locator('#mgs-favorites').check(); assert.equal(await offline.locator('.mgs-card').count(),1);
    // The browser entrypoint, with no direct-navigation fallback.
    await page.evaluate(() => LuminApp.go('browser'));
    await page.waitForFunction(() => !!window.LuminBrowser);
    await checkPopup(() => page.evaluate(() => LuminBrowser.open('https://example.com/site')), 'https://example.com/site');
    await page.evaluate(() => LuminApp.go('gn'));
    await page.locator('.gn-card').first().waitFor();
    await checkPopup(() => page.locator('.gn-card__play').first().click(),/^https:/);
    await page.evaluate(() => LuminApp.openProvider('duckmath'));
    // openProvider is a source selector; route navigation stays internal.
    await page.evaluate(() => LuminApp.go('provider'));
    await page.waitForFunction(() => !!window.LuminProvider);
    const providerButton = page.locator('#pv-grid button').first();
    await providerButton.waitFor(); await checkPopup(() => providerButton.click(),/^https:/);
    assert.deepEqual(errors,[]);
    await context.close();
    console.log('PASS: MGS catalog/search/filters/favorites; five visible links; game/source/credits/Browser about:blank popups; Ctrl+click and middle-click; blocked-popup no redirect; CDN download, GitHub fallback and size/HTTP/CORS errors; mobile; launcher; saved state; index failure/retry. External sources mocked.');
  } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exitCode=1;});
