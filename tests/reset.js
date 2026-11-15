// The reset button: from mid-play, from the end, and after using the app by hand, it puts a figure back at its start.
const { PAGE, launch, devices } = require('./lib');
(async () => {
  const b = await launch();
  let bad = 0;
  const say = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
  for (const [label, opts] of [['desktop', { viewport: { width: 1200, height: 900 } }], ['phone', { ...devices['iPhone 13'] }], ['small phone', { ...devices['iPhone SE'] }]]) {
    const ctx = await b.newContext(opts), touch = !!opts.hasTouch;
    await ctx.addInitScript(() => { window.IntersectionObserver = undefined; });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 2).join(' ')));
    await p.goto(PAGE, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(600);
    const press = async loc => { await loc.scrollIntoViewIfNeeded(); await p.waitForTimeout(touch ? 400 : 50); if (touch) await loc.tap(); else await loc.click(); };
    for (const name of ['piles', 'hand', 'react', 'imm', 'puri', 'deui']) {
      const fig = p.locator(`.fig[data-fig="${name}"]`), rst = fig.locator('.scrub-reset'), play = fig.locator('.scrub-btn');
      const state = () => p.evaluate(n => { const f = document.querySelector(`.fig[data-fig="${n}"]`), t = e => e ? e.textContent.replace(/\s+/g, ' ').trim() : '';
        const bar = f.querySelector('.scrub').getBoundingClientRect(), r = f.querySelector('.scrub-reset').getBoundingClientRect(), pl = f.querySelector('.scrub-btn').getBoundingClientRect(), tr = f.querySelector('.scrub-track').getBoundingClientRect();
        return { at: +f.querySelector('.scrub-track').getAttribute('aria-valuenow'), playing: !!f.querySelector('.scrub-btn.playing'), off: !!f.querySelector('.scrub.off'), idle: f.querySelector('.scrub-reset').classList.contains('idle'),
          rows: [...f.querySelectorAll('.app-list li input[type=text]')].map(i => i.value).join('|') || [...f.querySelectorAll('.krow')].map(t).join('|'), cards: f.querySelectorAll('.cards li').length, cap: t(f.querySelector('.scrub-cap')).slice(0, 12),
          log: f.querySelectorAll('.hist .lg').length, arrows: f.querySelectorAll('.demo-ax .ax:not(.ghost)').length, oneLine: Math.abs(r.top - pl.top) < 2 && Math.abs(tr.top + tr.height / 2 - (pl.top + pl.height / 2)) < 6, trackW: Math.round(tr.width), over: document.documentElement.scrollWidth - document.documentElement.clientWidth }; }, name);
      await fig.locator('.scrub').scrollIntoViewIfNeeded();
      const s0 = await state();
      // 1. mid-play
      await press(play); await p.waitForTimeout(2600);
      await press(rst); await p.waitForTimeout(500);
      let s = await state();
      const back = x => x.at === 0 && !x.playing && !x.off && x.idle && x.rows === s0.rows && x.cards === s0.cards && x.log === 0 && x.arrows === s0.arrows && x.cap === s0.cap;   // immediate mode's arrow that never stops is there from the start
      const ok1 = back(s);
      // 2. after using the app by hand
      const first = (await fig.locator('.app-list li input[type=text]').count()) ? fig.locator('.app-list li').nth(0).locator('input[type=text]') : fig.locator('.krow').nth(0).locator('.kt');
      await press(first); await p.waitForTimeout(200); await p.keyboard.type('zz'); await p.waitForTimeout(400);
      const mid = await state();
      await press(rst); await p.waitForTimeout(500);
      s = await state();
      const ok2 = back(s) && mid.off && !mid.idle && mid.rows !== s0.rows;
      // 3. from the end
      const tr = await fig.locator('.scrub-track').boundingBox();
      if (touch) await p.touchscreen.tap(tr.x + tr.width - 2, tr.y + tr.height / 2); else await p.mouse.click(tr.x + tr.width - 2, tr.y + tr.height / 2);
      await p.waitForTimeout(500);
      const end = await state();
      await press(rst); await p.waitForTimeout(500);
      s = await state();
      const ok3 = back(s) && end.at >= 97 && !end.idle;
      say(ok1 && ok2 && ok3 && s0.idle && s.oneLine && s.over <= 0, `${label} ${name}: mid-play ${ok1}, after hand use ${ok2} (${mid.off ? 'was off the script' : 'never left the script'}), from the end ${ok3} · idle at start ${s0.idle} · bar on one line ${s.oneLine}, slider ${s.trackW}px, page ${s.over}px over`);
    }
    await p.locator('.fig[data-fig="hand"] .scrub').scrollIntoViewIfNeeded();
    if (errs.length) { bad += errs.length; console.log(label, 'ERRORS:\n  ' + [...new Set(errs)].join('\n  ')); }
    await ctx.close();
  }
  console.log(bad, 'failed');
  process.exitCode = bad ? 1 : 0;
  await b.close();
})();
