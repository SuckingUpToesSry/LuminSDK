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
    await page.goto('https://suckinguptoessry.github.io/LuminSDK/?cloak=0');
    await page.waitForFunction(() => !!window.STUDY_CONTENT && !!window.LuminClassicAnim);
    await page.keyboard.press('Shift+D');
    assert.equal(await page.evaluate(() => LuminApp.current()), 'lumin');
    assert.equal(await page.locator('#lum-classic-anim .la-ring').count(), 3);
    assert.equal(await page.locator('#lum-anim').count(), 0);
    await page.waitForFunction(() => !!window.LuminSettings);
    await page.evaluate(() => LuminAnim.hide());
    await page.clock.install({ time: new Date('2026-11-03T12:00:00Z') });
    await page.clock.pauseAt(new Date('2026-11-03T12:00:01Z'));
    await page.keyboard.press('Shift+D');
    assert.equal(await page.evaluate(() => LuminApp.current()), 'estudo');
    assert.match(await page.locator('#lum-classic-anim .la-label').textContent(), /estudos/);
    await page.clock.runFor(2620);
    assert.equal(await page.locator('#lum-classic-anim').count(), 0);
    await page.keyboard.press('Shift+J');
    assert.equal(await page.evaluate(() => LuminApp.current()), 'lumin');
    await page.clock.runFor(999);
    assert.equal(await page.locator('#lum-anim').getAttribute('class'), 'impact-black');
    await page.clock.runFor(1);
    assert.equal(await page.locator('#lum-anim').getAttribute('class'), 'impact-flash');
    assert.equal(await page.locator('html').evaluate(node => node.classList.contains('lumin-impact')), true);
    await page.clock.runFor(540);
    assert.equal(await page.locator('#lum-anim').count(), 0);

    // Regression: General → light mode used to collapse every transition to .001 ms.
    await page.evaluate(() => LuminSettings.open());
    await page.locator('#settings-light').click();
    await page.locator('#settings-close').click();
    assert.equal(await page.locator('html').evaluate(node => node.classList.contains('no-motion')), true);
    await page.keyboard.press('Shift+J');
    await page.clock.runFor(1000);
    assert.equal(await page.locator('#lum-anim').evaluate(node => getComputedStyle(node).animationDuration), '0.54s');
    assert.ok(await page.locator('#lum-anim').evaluate(node => Number(getComputedStyle(node).opacity) > 0));
    assert.equal(await page.locator('.app-view.is-active').evaluate(node => getComputedStyle(node).animationDuration), '0.48s');
    await page.clock.runFor(540);
    await page.evaluate(() => { LuminAstolfo.on(); LuminAnim.play('estudo','impact'); });
    assert.equal(await page.locator('#lum-anim .impact-heart').textContent(), '♡');
    assert.equal(await page.locator('#lum-anim .impact-heart').evaluate(node => getComputedStyle(node).display), 'grid');
    assert.equal(await page.locator('#lum-anim .impact-heart').evaluate(node => getComputedStyle(node).animationDuration), '0.7s');
    assert.equal(await page.locator('#lum-anim .impact-heart').evaluate(node => getComputedStyle(node).placeItems), 'center');
    await page.clock.runFor(1000);
    assert.equal(await page.locator('#lum-anim .impact-heart').isVisible(), false);
    await page.clock.runFor(540);
    await page.evaluate(() => LuminAnim.play('estudo','classic'));
    assert.equal(await page.locator('#lum-classic-anim .la-ring').first().evaluate(node => getComputedStyle(node).animationDuration), '2.5s');
    assert.equal(await page.locator('#lum-classic-anim').evaluate(node => getComputedStyle(node,'::after').content), '"♡"');
    assert.equal(await page.locator('#lum-classic-anim').evaluate(node => getComputedStyle(node,'::after').animationDuration), '2.5s');
    await page.clock.runFor(2620);
    for (const style of ['fade','slide']) {
      await page.evaluate(style => LuminAnim.play('estudo',style), style);
      assert.equal(await page.locator('#lum-anim').evaluate(node => getComputedStyle(node).animationDuration), '0.52s');
      await page.clock.runFor(520);
    }
    // Changing unrelated settings must not change the forced shortcut style.
    await page.evaluate(() => { LuminSettings.setOption('speed','fast'); LuminSettings.setOption('font','mono'); LuminSettings.set('motion',false); });
    await page.keyboard.press('Shift+J');
    assert.equal(await page.evaluate(() => LuminApp.current()), 'lumin');
    await page.clock.runFor(1000);
    assert.equal(await page.locator('#lum-anim').evaluate(node => getComputedStyle(node).animationDuration), '0.54s');
    await page.clock.runFor(540);
    await page.evaluate(() => { LuminAstolfo.off(); LuminAnim.play('lumin','impact'); });
    assert.equal(await page.locator('#lum-anim .impact-heart').isVisible(), false);
    await page.clock.runFor(1540);

    // Plain credit text still opens the actual OS/Normal chooser.
    await page.keyboard.press('Shift+D'); await page.clock.runFor(2620);
    assert.equal(await page.locator('#autor').textContent(), 'Ryan Smith');
    assert.equal(await page.locator('#autor').evaluate(node => getComputedStyle(node).borderBottomWidth), '0px');
    await page.locator('#autor').click();
    assert.equal(await page.locator('.lcmenu').isVisible(), true);
    await page.locator('[data-lcore-mode="normal"]').click(); await page.clock.runFor(1540);
    assert.equal(await page.evaluate(() => LuminApp.current()), 'lumin');
    await page.keyboard.press('Shift+D'); await page.clock.runFor(2620);
    await page.locator('#autor').click(); await page.locator('[data-lcore-mode="os"]').click(); await page.clock.runFor(1540);
    assert.equal(await page.evaluate(() => LuminApp.current()), 'os');
    await page.evaluate(() => LuminApp.go('lumin')); await page.clock.runFor(1540);

    await page.evaluate(() => LuminSettings.open());
    await page.locator('#settings-tab-transitions').click();
    assert.equal(await page.locator('#settings-panel-general').isVisible(), false);
    assert.equal(await page.locator('#settings-panel-transitions').isVisible(), true);
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.locator('#settings-tab-general').getAttribute('aria-selected'), 'true');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#settings-tab-transitions').getAttribute('aria-selected'), 'true');
    for (const [style, selector, duration] of [['fade','#lum-anim.transition-fade',520], ['slide','#lum-anim.transition-slide',520], ['classic','#lum-classic-anim',2620]]) {
      await page.locator('#transition-style').selectOption(style);
      await page.locator('#transition-preview').click();
      assert.equal(await page.locator(selector).count(), 1);
      assert.equal(await page.locator(selector).evaluate(node => node.matches(':popover-open')), true);
      assert.equal(await page.locator('#settings').evaluate(node => node.open), true);
      await page.clock.runFor(duration);
      assert.equal(await page.locator(selector).count(), 0);
    }
    await page.locator('#transition-style').selectOption('fade');
    await page.locator('#settings-close').click();
    await page.keyboard.press('Shift+D');
    assert.equal(await page.locator('#lum-classic-anim').count(), 1);
    assert.equal(await page.evaluate(() => LuminAnim.getStyle()), 'fade');
    // Rapid D -> J must cancel the classic clock and all its timers.
    await page.keyboard.press('Shift+J');
    assert.equal(await page.locator('#lum-classic-anim').count(), 0);
    assert.equal(await page.locator('#lum-anim.impact-black').count(), 1);
    await page.clock.runFor(1540);
    await page.evaluate(() => { LuminAnim.setStyle('slide'); LuminApp.go('sites'); });
    assert.equal(await page.locator('#lum-anim.transition-slide').count(), 1);
    await page.clock.runFor(520);
    // Theme restoration and reduced-motion substitutions are independent of shortcut style.
    await page.evaluate(() => { document.documentElement.setAttribute('data-skin','astolfo'); LuminAnim.play('lumin','classic'); });
    assert.equal(await page.locator('#lum-classic-anim').evaluate(node => node.style.getPropertyValue('--la-1')), '#ff8fc4');
    await page.evaluate(() => LuminAnim.play('lumin','impact'));
    assert.equal(await page.locator('#lum-anim').evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(0, 0, 0)');
    await page.clock.runFor(1000);
    assert.equal(await page.locator('#lum-anim').evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(255, 255, 255)');
    await page.clock.runFor(540);
    await page.emulateMedia({ reducedMotion:'reduce' });
    await page.evaluate(() => LuminAnim.play('lumin','classic'));
    assert.equal(await page.locator('#lum-anim.transition-fade').count(), 1);
    assert.equal(await page.locator('#lum-classic-anim').count(), 0);
    await page.clock.runFor(180);
    await page.evaluate(() => LuminAnim.play('lumin','impact')); await page.clock.runFor(1000);
    assert.equal(await page.locator('#lum-anim').count(), 0);
    await page.emulateMedia({ reducedMotion:'no-preference' });

    const second = await context.newPage();
    await second.goto('https://suckinguptoessry.github.io/LuminSDK/?view=lumin&cloak=0');
    await second.waitForFunction(() => !!window.LuminSettings);
    assert.equal(await second.evaluate(() => LuminAnim.getStyle()), 'slide');
    assert.equal(await second.locator('html').evaluate(node => node.classList.contains('no-motion')), true);
    await second.evaluate(() => LuminSettings.open());
    await second.locator('#settings-tab-transitions').click();
    assert.equal(await second.locator('#transition-style').inputValue(), 'slide');
    await second.locator('#transition-enabled').locator('..').click();
    assert.equal(await second.locator('#transition-enabled').isChecked(), false);
    assert.equal(await second.locator('#transition-preview').isDisabled(), true);
    await second.locator('#settings-close').click();
    await second.keyboard.press('Shift+D');
    await second.waitForFunction(() => !!window.STUDY_CONTENT);
    assert.equal(await second.evaluate(() => LuminApp.current()), 'estudo');
    assert.equal(await second.locator('#lum-classic-anim, #lum-anim').count(), 0);
    assert.equal(await second.locator('#study-impact').isChecked(), false);
    await second.locator('.sd-nav [data-tab="resumos"]').click();
    await second.locator('#learn-search').focus(); await second.keyboard.press('Shift+D'); await second.keyboard.press('Shift+J');
    assert.equal(await second.evaluate(() => LuminApp.current()), 'estudo');
    await second.locator('#learn-search').blur();
    await second.evaluate(() => {
      document.documentElement.classList.add('is-playing');
      for (const key of ['d','j']) document.dispatchEvent(new KeyboardEvent('keydown',{key,code:'Key'+key.toUpperCase(),shiftKey:true,bubbles:true}));
      document.documentElement.classList.remove('is-playing');
    });
    assert.equal(await second.evaluate(() => LuminApp.current()), 'estudo');
    await second.evaluate(() => { LuminAnim.setEnabled(true); LuminAnim.setStyle('none'); LuminApp.go('lumin'); });
    assert.equal(await second.locator('#lum-anim, #lum-classic-anim').count(), 0);
    await second.evaluate(() => LuminSettings.open()); await second.locator('#settings-tab-transitions').click();
    await second.setViewportSize({ width:390, height:844 });
    assert.ok(await second.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await second.locator('#transition-reset').click();
    assert.equal(await second.locator('#transition-style').inputValue(), 'impact');
    assert.equal(await second.locator('#transition-enabled').isChecked(), true);

    const single = await context.newPage();
    await single.goto('https://suckinguptoessry.github.io/LuminSDK/single/?demo&cloak=0');
    await single.waitForFunction(() => !!window.LuminApp && !!window.LuminClassicAnim);
    await single.keyboard.press('Shift+D');
    assert.equal(await single.evaluate(() => LuminApp.current()), 'lumin');
    assert.equal(await single.locator('#lum-classic-anim .la-ring').count(), 3);
    assert.equal(await single.locator('#lum-classic-anim .la-ring').first().evaluate(node => getComputedStyle(node).animationDuration), '2.5s');
    await single.keyboard.press('Shift+J');
    assert.equal(await single.locator('#lum-classic-anim').count(), 0);
    assert.equal(await single.locator('#lum-anim.impact-black').count(), 1);
    await single.clock.runFor(1000);
    assert.equal(await single.locator('#lum-anim').getAttribute('class'), 'impact-flash');
    assert.equal(await single.locator('#lum-anim').evaluate(node => getComputedStyle(node).animationDuration), '0.54s');
    assert.deepEqual(errors, []);
    console.log('PASS: light-mode/settings regression, Astolfo blackout heart, separate D/J effects, exact impact timing, original clock cleanup, Ryan Smith OS/Normal chooser, accessible settings tabs, all previews above dialog, saved style, opt-out sync, mobile, Astolfo, reduced motion, typing/game guards and single-file build.');
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
