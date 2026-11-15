// The unified trial: press play in every figure at three sizes, let the script run to its end, and report page errors,
// the figure's height through the run, whether the page got wider than the screen, and what is left at the end.
const { PAGE, launch, devices } = require('./lib');
(async () => {
  const b = await launch();
  let bad = 0;
  const only = process.env.SIZES ? process.env.SIZES.split(',') : null;   // SIZES=desktop,phone to run fewer
  for (const [label, opts] of [['desktop', { viewport: { width: 1200, height: 900 } }], ['tablet', { viewport: { width: 820, height: 1100 } }], ['phone', { ...devices['iPhone 13'] }], ['small phone', { ...devices['iPhone SE'] }]].filter(x => !only || only.includes(x[0]))) {
    const ctx = await b.newContext(opts), touch = !!opts.hasTouch;
    await ctx.addInitScript(() => { window.IntersectionObserver = undefined; });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 2).join(' ')));
    await p.goto(PAGE, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(600);
    for (const name of ['piles', 'hand', 'react', 'imm', 'puri', 'deui']) {
      const fig = p.locator(`.fig[data-fig="${name}"]`);
      await fig.locator('.scrub-btn').scrollIntoViewIfNeeded();
      await p.waitForTimeout(touch ? 500 : 60);
      if (touch) await fig.locator('.scrub-btn').tap(); else await fig.locator('.scrub-btn').click();
      const hs = new Set(); let most = 0;
      for (let i = 0; i < 170 && (i < 6 || await fig.locator('.scrub-btn.playing').count()); i++) {
        await p.waitForTimeout(100);
        hs.add(await p.evaluate(n => Math.round(document.querySelector(`.fig[data-fig="${n}"] .demo`).getBoundingClientRect().height), name));
        most = Math.max(most, await fig.locator('.demo-ax .ax').count());
      }
      await p.waitForTimeout(900);
      const st = await p.evaluate(n => { const f = document.querySelector(`.fig[data-fig="${n}"]`); return { wide: document.documentElement.scrollWidth - document.documentElement.clientWidth, flying: f.querySelectorAll('.demo-ax .az').length, waiting: f.querySelectorAll('.demo-ax .ax.wait, .hline.wait').length, cap: f.querySelector('.scrub-cap').textContent.slice(0, 24), out: [...f.querySelectorAll('.demo-ax .al')].filter(e => { const r = e.getBoundingClientRect(), s = f.querySelector('.demo').getBoundingClientRect(); return r.left < s.left - 1 || r.right > s.right + 1; }).length }; }, name);
      const ok = hs.size === 1 && st.wide <= 0 && !st.flying && !st.waiting && !st.out;
      if (!ok) bad++;
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${label} ${name}: height ${[...hs].join('/')} · most arrows at once ${most} · left flying ${st.flying}, waiting ${st.waiting}, outside ${st.out} · page ${st.wide}px over · ${st.cap}`);
    }
    if (errs.length) { bad += errs.length; console.log(label, 'ERRORS:\n  ' + [...new Set(errs)].join('\n  ')); }
    await ctx.close();
  }
  console.log(bad, 'failed');
  process.exitCode = bad ? 1 : 0;
  await b.close();
})();
