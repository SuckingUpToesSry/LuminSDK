/* Optional Chromium smoke test. No runtime dependencies added to the portal.
   npm install --prefix .tmp/browser --no-save --package-lock=false playwright-core @sparticuz/chromium
   node tests/transitions.browser.cjs
   Uses locally served repository files; external services are deliberately blocked. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const { chromium } = require(path.join(root, '.tmp/browser/node_modules/playwright-core'));
(async () => {
  process.env.AWS_EXECUTION_ENV = 'AWS_Lambda_nodejs22.x';
  const packaged = (await import(pathToFileURL(path.join(root, '.tmp/browser/node_modules/@sparticuz/chromium/build/index.js')))).default;
  const browser = await chromium.launch({ executablePath: await packaged.executablePath(), headless: true,
    args: packaged.args.filter(arg => !/disable-web-security|disable-site-isolation|IsolateOrigins/.test(arg) && arg !== '--single-process') });
  try {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const errors = [];
    context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.hostname !== 'suckinguptoessry.github.io') return route.abort();
      let relative = url.pathname.replace(/^\/LuminSDK\//, '') || 'index.html';
      if (relative.endsWith('/')) relative += 'index.html';
      const file = path.resolve(root, relative);
      if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return route.fulfill({ status: 404, body: '' });
      const types = { '.js':'text/javascript', '.css':'text/css', '.html':'text/html', '.json':'application/json', '.svg':'image/svg+xml' };
      return route.fulfill({ contentType: types[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
    });
    const page = await context.newPage();
    await page.clock.install({time:new Date('2026-11-03T12:00:00Z')});
    await page.goto('https://suckinguptoessry.github.io/LuminSDK/?cloak=0&demo');
    await page.waitForFunction(() => !!window.STUDY_CONTENT && !!window.LuminPersonal);
    await page.keyboard.press('Shift+J');
    assert.equal(await page.evaluate(() => LuminApp.current()), 'lumin');
    assert.equal(await page.locator('#lum-classic-anim .la-ring').count(),3);
    assert.equal(await page.locator('#lum-anim').count(),0);
    await page.waitForFunction(() => !!window.LuminSettings);
    await page.evaluate(() => LuminAnim.hide());
    await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 1000));
    for (const style of ['impact','slide','cinema','prism']) {
      await page.evaluate(style => LuminAnim.setStyle(style),style);
      await page.keyboard.press('Shift+J');
      assert.equal(await page.locator('#lum-classic-anim').count(),1);
      assert.equal(await page.locator('#lum-anim').count(),0);
      assert.equal(await page.evaluate(() => document.documentElement.classList.contains('lumin-impact')),false);
      await page.clock.runFor(2620);
    }
    await page.evaluate(() => LuminAstolfo.on());
    for (const [style,selector,duration] of [['slide','#lum-anim.transition-slide',520],['fade','#lum-anim.transition-fade',520],['cinema','#lum-anim.transition-cinema',900],['prism','#lum-anim.transition-prism',900],['impact','#lum-anim.impact-black',1540],['classic','#lum-classic-anim',2620],['none','',0]]) {
      await page.evaluate(() => LuminSettings.open());
      await page.locator('#settings-tab-transitions').click();
      await page.locator('#transition-style').selectOption(style);
      if (style === 'none') assert.equal(await page.locator('#transition-preview').isDisabled(),true);
      else {
        await page.locator('#transition-preview').click();
        assert.equal(await page.locator(selector).count(),1);
        assert.equal(await page.locator(selector).evaluate(node => node.matches(':popover-open')),true);
        await page.clock.runFor(duration);
      }
      await page.locator('#settings-close').click();
      await page.keyboard.press('Shift+J');
      assert.equal(await page.evaluate(() => LuminApp.current()),'estudo');
      if (selector) assert.equal(await page.locator(selector).count(),1);
      else assert.equal(await page.locator('#lum-anim,#lum-classic-anim').count(),0);
      assert.equal(await page.evaluate(() => LuminAnim.state().activeStyle),style);
      if (!['impact','classic','none'].includes(style)) assert.equal(await page.locator('#lum-anim .impact-heart').count(),0);
      if (duration) await page.clock.runFor(duration);
      await page.keyboard.press('Shift+D');
      assert.equal(await page.evaluate(() => LuminApp.current()),'lumin');
      assert.equal(await page.locator('#lum-classic-anim').count(),1);
      await page.clock.runFor(2620);
    }
    // The previous settings/light-mode regression must remain fixed.
    await page.evaluate(() => { LuminSettings.open(); LuminAnim.setStyle('impact'); });
    await page.locator('#settings-tab-general').click(); await page.locator('#settings-light').click();
    await page.locator('#settings-close').click(); await page.keyboard.press('Shift+J');
    assert.equal(await page.locator('#lum-anim .impact-heart').isVisible(),true);
    await page.clock.runFor(999); assert.equal(await page.locator('#lum-anim').getAttribute('class'),'impact-black');
    await page.clock.runFor(1); assert.equal(await page.locator('#lum-anim').getAttribute('class'),'impact-flash');
    assert.equal(await page.locator('#lum-anim').evaluate(node => getComputedStyle(node).animationDuration),'0.54s');
    await page.clock.runFor(540);
    await page.evaluate(() => { LuminPersonal.set('flash',false); LuminPersonal.set('shake','off'); });
    await page.keyboard.press('Shift+J'); await page.clock.runFor(1000);
    assert.equal(await page.locator('#lum-anim').getAttribute('class'),'impact-reveal');
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('lumin-impact')),false);
    await page.clock.runFor(540);
    await page.evaluate(() => { LuminPersonal.set('flash',true); LuminPersonal.set('shake','soft'); });
    await page.keyboard.press('Shift+J'); await page.clock.runFor(1000);
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('lumin-impact-soft')),true);
    await page.clock.runFor(540);
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.keyboard.press('Shift+J'); await page.clock.runFor(1000);
    assert.equal(await page.locator('#lum-anim,#lum-classic-anim').count(),0);
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('lumin-impact')),false);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.evaluate(() => LuminAnim.setEnabled(false)); await page.keyboard.press('Shift+J');
    assert.equal(await page.locator('#lum-anim,#lum-classic-anim').count(),0);
    await page.evaluate(() => { LuminAnim.setEnabled(true); LuminAnim.setStyle('prism'); LuminApp.go('lumin'); }); await page.clock.runFor(900);

    // A local profile, real comfort controls, route preference and session tools.
    await page.evaluate(() => LuminApp.openSettings('experience'));
    assert.equal(await page.locator('#settings-panel-experience').isVisible(),true);
    await page.locator('[data-personal="name"]').fill('Lua');
    await page.locator('[data-personal="note"]').fill('Um capítulo por vez.');
    for (const [key,value] of [['look','edit'],['text','110'],['contrast','high'],['width','wide'],['clock','12'],['start','hub'],['budget','30'],['reminder','20']]) await page.locator('[data-personal="'+key+'"]').selectOption(value);
    await page.locator('[data-personal="focus"]').check(); await page.locator('[data-personal="covers"]').uncheck();
    assert.equal(await page.evaluate(() => LuminPersonal.get().name),'Lua');
    assert.equal(await page.locator('#personal-greeting').textContent(),'Seu espaço, Lua.');
    assert.equal(await page.locator('#personal-note').textContent(),'Um capítulo por vez.');
    assert.equal(await page.locator('.presence').isVisible(),false);
    assert.equal(await page.locator('html').evaluate(node => getComputedStyle(node).fontSize),'17.6px');
    const downloadEvent = page.waitForEvent('download'); await page.locator('#personal-export').click();
    const download = await downloadEvent; assert.equal(download.suggestedFilename(),'lumin-meu-espaco.json');
    const stream = await download.createReadStream(); let json=''; for await (const chunk of stream) json+=chunk;
    assert.equal(JSON.parse(json).preferences.name,'Lua');
    await page.locator('#settings-close').click();
    await page.locator('.hero').screenshot({path:path.join(root,'.tmp/edit-desktop.png')});
    await page.locator('#personal-pause').click(); const seconds = await page.evaluate(() => LuminPersonal.session().seconds);
    await page.clock.runFor(5000); assert.equal(await page.evaluate(() => LuminPersonal.session().seconds),seconds);
    await page.locator('#personal-pause').click(); await page.clock.runFor(5000);
    assert.ok(await page.evaluate(() => LuminPersonal.session().seconds) >= seconds+4);
    assert.ok(Number(await page.locator('#personal-progress').getAttribute('value'))>0);
    await page.keyboard.press('Control+k'); assert.equal(await page.locator('#personal-launcher').evaluate(node => node.open),true);
    await page.locator('#personal-launcher-search').fill('resumos'); await page.keyboard.press('Enter'); await page.clock.runFor(900);
    assert.equal(await page.evaluate(() => LuminApp.current()),'estudo');
    await page.locator('.sd-nav [data-tab="resumos"]').click(); await page.clock.runFor(900);
    await page.locator('#learn-search').focus(); await page.keyboard.press('Shift+J'); assert.equal(await page.evaluate(() => LuminApp.current()),'estudo');
    await page.locator('#learn-search').blur();
    await page.evaluate(() => { document.documentElement.classList.add('is-playing'); document.dispatchEvent(new KeyboardEvent('keydown',{key:'j',code:'KeyJ',shiftKey:true,bubbles:true})); document.documentElement.classList.remove('is-playing'); });
    assert.equal(await page.evaluate(() => LuminApp.current()),'estudo');
    await page.locator('#autor').click(); assert.equal(await page.locator('.lcmenu').isVisible(),true);
    await page.locator('[data-lcore-mode="normal"]').click(); await page.clock.runFor(900);
    assert.equal(await page.evaluate(() => LuminApp.current()),'lumin');
    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth<=innerWidth+1));
    await page.evaluate(() => LuminApp.openSettings('experience'));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth<=innerWidth+1));
    await page.locator('#settings-tab-experience').focus(); await page.keyboard.press('ArrowLeft');
    assert.equal(await page.locator('#settings-tab-transitions').getAttribute('aria-selected'),'true');
    await page.locator('#settings-close').click();

    const second = await context.newPage();
    await second.goto('https://suckinguptoessry.github.io/LuminSDK/?cloak=0');
    await second.waitForFunction(() => !!window.LuminApp && !!window.LuminPersonal);
    assert.equal(await second.evaluate(() => LuminApp.current()),'hub');
    assert.equal(await second.evaluate(() => LuminPersonal.get().name),'Lua');
    await second.evaluate(() => LuminApp.openSettings('experience'));
    await second.waitForFunction(() => !!window.LuminSettings);
    await second.evaluate(() => { localStorage.setItem('studydesk:v2:learning','keep'); localStorage.setItem('luminsdk-favorites','keep'); });
    second.once('dialog',dialog => dialog.accept()); await second.locator('#personal-reset').click();
    assert.equal(await second.evaluate(() => LuminPersonal.get().name),'');
    assert.equal(await second.evaluate(() => localStorage.getItem('studydesk:v2:learning')),'keep');
    assert.equal(await second.evaluate(() => localStorage.getItem('luminsdk-favorites')),'keep');
    await second.locator('#settings-close').click();
    await second.evaluate(() => { LuminAstolfo.off(); LuminAnim.setStyle('impact'); });
    await second.keyboard.press('Shift+J'); assert.equal(await second.locator('#lum-classic-anim').count(),1);
    assert.equal(await second.locator('#lum-anim').count(),0);

    const single = await context.newPage();
    await single.goto('https://suckinguptoessry.github.io/LuminSDK/single/?demo&cloak=0');
    await single.waitForFunction(() => !!window.LuminPersonal && !!window.LuminApp);
    await single.keyboard.press('Shift+J'); assert.equal(await single.locator('#lum-classic-anim').count(),1);
    await single.evaluate(() => { LuminAstolfo.on(); LuminAnim.setStyle('cinema'); });
    await single.keyboard.press('Shift+J'); assert.equal(await single.locator('#lum-anim.transition-cinema').count(),1);
    assert.equal(await single.evaluate(() => LuminApp.current()),'lumin');
    assert.deepEqual(errors,[]);
    console.log('PASS: Minimal spacetime-only/no shake, Astolfo applied preview=Shift+J for all 7 styles, light-mode regression, comfort/reduced-motion/opt-out, local profile/export/reset, session pause, Ctrl+K, saved startup, mobile, keyboard guards, OS/Normal menu and single build.');
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
