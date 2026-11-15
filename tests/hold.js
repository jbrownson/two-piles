// Each switch, pressed from the start: the figure should play the step it changes and hold with every arrow drawn.
const { PAGE, launch, devices } = require('./lib');
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { window.IntersectionObserver = undefined; });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(PAGE, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(600);
  let bad = 0;
  for (const [name, sw] of [['hand', 'Leave a line out'], ['react', 'No keys'], ['imm', 'IDs from position'], ['puri', 'Focus by row'], ['deui', 'Break the derivative']]) {
    const fig = p.locator(`.fig[data-fig="${name}"]`);
    await fig.locator('.scrub').scrollIntoViewIfNeeded();
    await fig.locator('.scrub button', { hasText: sw }).click();
    await p.waitForTimeout(3000);
    const s = await p.evaluate(n => { const f = document.querySelector(`.fig[data-fig="${n}"]`); return { playing: !!f.querySelector('.scrub-btn.playing'), at: +f.querySelector('.scrub-track').getAttribute('aria-valuenow'), waiting: f.querySelectorAll('.demo-ax .ax.wait, .hline.wait, .patch-sum.wait, .tree-sum.wait').length, flying: f.querySelectorAll('.demo-ax .az').length, arrows: f.querySelectorAll('.demo-ax .ax').length, cap: f.querySelector('.scrub-cap').textContent.slice(0, 60) }; }, name);
    const ok = !s.playing && s.at === 47 && !s.waiting && !s.flying;
    if (!ok) bad++;
    console.log((ok ? 'ok   ' : 'FAIL ') + name + ', ' + sw + ': ' + JSON.stringify(s));
    await fig.locator('.demo').scrollIntoViewIfNeeded();
    await p.waitForTimeout(100);
  }
  console.log(errs.length ? errs.join('\n') : 'no errors', '·', bad, 'failed');
  process.exitCode = bad || errs.length ? 1 : 0;
  await b.close();
})();
