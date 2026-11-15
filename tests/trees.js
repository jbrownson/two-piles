// React's two trees scroll by themselves: together with each other, apart from the window, and without taking the figure off its script.
const { PAGE, launch, devices } = require('./lib');
(async () => {
  const b = await launch();
  let bad = 0;
  const say = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
  for (const [label, opts] of [['desktop', { viewport: { width: 1200, height: 900 } }], ['phone', { ...devices['iPhone 13'] }]]) {
    const ctx = await b.newContext(opts), touch = !!opts.hasTouch;
    await ctx.addInitScript(() => { window.IntersectionObserver = undefined; });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 2).join(' ')));
    await p.goto(PAGE, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(600);
    const fig = p.locator('.fig[data-fig="react"]');
    const marks = JSON.parse(await fig.getAttribute('data-marks'));
    const st = () => p.evaluate(() => { const f = document.querySelector('.fig[data-fig="react"]'), T = [...f.querySelectorAll('.tree')];
      const first = ul => { const b = ul.getBoundingClientRect(); const li = [...ul.children].find(l => { const r = l.getBoundingClientRect(); return r.top + r.height / 2 > b.top; }); return li ? li.querySelector('.tt').textContent : ''; };
      return { trees: T.map(t => Math.round(t.scrollTop)), win: Math.round(f.querySelector('.app-list').scrollTop), top: T.map(first), fades: T.map(t => (t.classList.contains('more-up') ? 'u' : '') + (t.classList.contains('more-down') ? 'd' : '')), pairs: f.querySelectorAll('.demo-ax .ax.pair').length, sizes: T.map(t => Math.round(t.getBoundingClientRect().height)),
        pairY: [...f.querySelectorAll('.demo-ax .ax.pair .al')].map(e => Math.round(e.getBoundingClientRect().top - f.querySelector('.t-new .tree').getBoundingClientRect().top)), off: !!f.querySelector('.scrub.off'), at: +f.querySelector('.scrub-track').getAttribute('aria-valuenow') }; });
    // the script up to the delete: marks are showing
    await fig.locator('.scrub-track').scrollIntoViewIfNeeded(); await p.waitForTimeout(touch ? 500 : 60);
    const tr = await fig.locator('.scrub-track').boundingBox(); const x = tr.x + tr.width * (marks.del + 700) / marks.end, y = tr.y + tr.height / 2;
    if (touch) await p.touchscreen.tap(x, y); else await p.mouse.click(x, y);
    await p.waitForTimeout(600);
    const a = await st();
    say(a.trees.join() === '0,0' && a.pairs >= 4 && a.fades.join() === 'd,d', `${label}: at the delete step: trees at ${a.trees}, ${a.pairs} pairs marked, fading at ${a.fades}`);
    // scroll the new tree by itself
    const nb = await fig.locator('.t-new .tree').boundingBox();
    await fig.locator('.t-new .tree').scrollIntoViewIfNeeded(); await p.waitForTimeout(touch ? 400 : 60);
    const nb2 = await fig.locator('.t-new .tree').boundingBox();
    if (touch) { const cdp = await ctx.newCDPSession(p); const cx = nb2.x + nb2.width / 2, cy = nb2.y + nb2.height - 20;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy }] });
      for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx, y: cy - i * 9 }] }); await p.waitForTimeout(16); }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else { await p.mouse.move(nb2.x + nb2.width / 2, nb2.y + nb2.height / 2); await p.mouse.wheel(0, 80); }
    await p.waitForTimeout(700);
    const c = await st();
    say(c.trees[0] === c.trees[1] && c.trees[1] > 20 && c.win === a.win && !c.off && c.at === a.at, `${label}: scrolling the new tree: both trees at ${c.trees} (together), window still at ${c.win}, still on the script at ${c.at}% (${c.off ? 'OFF' : 'on'})`);
    say(c.pairs >= 3 && c.fades.join() === 'ud,ud' && c.top.join() !== a.top.join() && c.sizes[0] === c.sizes[1], `${label}: the marks followed: ${c.pairs} pairs, first rows now “${c.top.join('” / “')}”, fading at ${c.fades}`);
    // the window scrolls by itself too
    await fig.locator('.app-list').evaluate(el => { el.scrollTop = 60; el.dispatchEvent(new Event('scroll')); });
    await p.waitForTimeout(400);
    const d = await st();
    say(d.win === 60 && d.trees.join() === c.trees.join(), `${label}: scrolling the window: window at ${d.win}, trees still at ${d.trees}`);
    // reset puts the trees back
    if (touch) await fig.locator('.scrub-reset').tap(); else await fig.locator('.scrub-reset').click();
    await p.waitForTimeout(500);
    const e = await st();
    say(e.trees.join() === '0,0' && e.win === 0 && e.at === 0, `${label}: reset: trees at ${e.trees}, window at ${e.win}`);
    if (errs.length) { bad += errs.length; console.log(label, 'ERRORS:\n  ' + [...new Set(errs)].join('\n  ')); }
    if (!touch) { // by hand, a render keeps the trees where the reader had them
      await fig.locator('.demo').scrollIntoViewIfNeeded();
      const nb3 = await fig.locator('.t-new .tree').boundingBox();
      await p.mouse.move(nb3.x + nb3.width / 2, nb3.y + nb3.height / 2); await p.mouse.wheel(0, 120); await p.waitForTimeout(400);
      const before = await st();   // the old tree is empty at the start, so only the new one can have moved
      await fig.locator('.app-list li').nth(1).locator('input[type=checkbox]').click(); await p.waitForTimeout(1500);
      const after = await st();
      say(before.trees[1] > 60 && after.trees[1] === before.trees[1] && after.trees[0] === after.trees[1] && after.off, `${label}: by hand, a render leaves the trees where they were: ${before.trees} → ${after.trees}`);
    }
    await ctx.close();
  }
  console.log(bad, 'failed');
  process.exitCode = bad ? 1 : 0;
  await b.close();
})();
