// One figure at one or more moments of its script, as a picture in out/shots/. For looking at a change while making it.
//   node tools/look.js <figure> <steps> [desktop|phone|tablet] [dark|light] [switch text]
//   figures: piles hand react imm puri deui   steps, comma-separated: start,click,type,select,del,scroll,quit,back
const { PAGE, launch, devices } = require('../tests/lib');
const path = require('path'), fs = require('fs');
(async () => {
  const name = process.argv[2] || 'hand', steps = (process.argv[3] || 'del').split(','), mode = process.argv[4] || 'desktop', dark = process.argv[5] === 'dark', sw = process.argv[6];
  const b = await launch();
  const base = mode === 'phone' ? { ...devices['iPhone 13'], deviceScaleFactor: 2 } : mode === 'tablet' ? { viewport: { width: 820, height: 1100 }, deviceScaleFactor: 1 } : { viewport: { width: 1200, height: 900 }, deviceScaleFactor: +(process.env.DPR || 1) };
  const ctx = await b.newContext({ ...base, colorScheme: dark ? 'dark' : 'light' });
  await ctx.addInitScript(() => { window.IntersectionObserver = undefined; });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
  await p.goto(PAGE, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(700);
  const fig = p.locator(`.fig[data-fig="${name}"]`);
  const marks = JSON.parse(await fig.getAttribute('data-marks'));
  const touch = mode === 'phone';
  if (sw) { await fig.locator('.scrub').scrollIntoViewIfNeeded(); const bt = fig.locator('.scrub button', { hasText: sw }); if (touch) await bt.tap(); else await bt.click(); for (let i = 0; i < 80 && await fig.locator('.scrub-btn.playing').count(); i++) await p.waitForTimeout(200); await p.waitForTimeout(700); }
  const T = { start: 30, click: marks.click + 250, type: marks.type + 900, select: marks.select + 800, del: marks.del + 700, scroll: marks.scroll + 1100, quit: marks.quit + 800, back: marks.end - 60 };
  const shots = path.join(__dirname, '..', 'out', 'shots'); fs.mkdirSync(shots, { recursive: true });
  const frames = [];
  for (const st of steps) {
    await fig.locator('.scrub-track').scrollIntoViewIfNeeded();
    await p.waitForTimeout(touch ? 650 : 80);
    const tr = await fig.locator('.scrub-track').boundingBox();
    const x = tr.x + tr.width * T[st] / marks.end, y = tr.y + tr.height / 2;
    if (touch) await p.touchscreen.tap(x, y); else await p.mouse.click(x, y);
    await p.waitForTimeout(700);
    await fig.locator('.demo').scrollIntoViewIfNeeded();
    await p.waitForTimeout(150);
    frames.push({ st, png: await fig.locator('.demo').screenshot() });
    const info = await p.evaluate(n => { const f = document.querySelector(`.fig[data-fig="${n}"]`), d = f.querySelector('.demo').getBoundingClientRect(); return { h: Math.round(d.height), arrows: f.querySelectorAll('.demo-ax .ax').length, sum: (f.querySelector('.patch-sum') || {}).textContent, lines: [...f.querySelectorAll('.mach .hline')].map(l => l.textContent).join(' / ') }; }, name);
    console.log(st, JSON.stringify(info));
  }
  const iw = +(process.env.IW || (mode === 'phone' ? 390 : mode === 'tablet' ? 788 : 1100)), cols = +(process.env.COLS || (mode === 'phone' ? 3 : 1));
  const pg = await (await b.newContext({ viewport: { width: cols * (iw + 10) + 20, height: 800 }, deviceScaleFactor: 1 })).newPage();
  await pg.setContent('<!doctype html><body style="margin:0;padding:5px;background:#777;font:12px monospace;color:#fff"><div id="g" style="display:grid;grid-template-columns:repeat(' + cols + ',' + iw + 'px);gap:10px;align-items:start">' +
    frames.map(f => '<div>' + name + ' · ' + f.st + '<br><img style="width:' + iw + 'px;display:block" src="data:image/png;base64,' + f.png.toString('base64') + '"></div>').join('') + '</div></body>');
  await pg.locator('#g').screenshot({ path: path.join(shots, name + '-' + mode + (dark ? '-dark' : '') + (sw ? '-' + sw.toLowerCase().replace(/[^a-z]+/g, '-') : '') + '-' + steps.join('_') + '.png') });
  console.log(errs.length ? errs.join('\n') : 'no errors');
  await b.close();
})();
