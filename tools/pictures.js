// Reference pictures of the built page, for showing that a change to the code changed nothing on screen.
//   node tools/pictures.js <dir>                    take the pictures into <dir>
//   node tools/pictures.js --compare <dir> <dir>    say which pictures differ between two sets
// It takes every figure at every step of its script and under every switch, at desktop and phone sizes, in light and dark,
// plus the whole page at six sizes: about 200 pictures in five minutes. Motion and fades are turned off, so each picture is
// of a settled state. A picture that differs by a pixel or two between runs of the same build is a capture flake: take it again.
const { PAGE, launch, devices } = require('../tests/lib');
const path = require('path'), fs = require('fs'), crypto = require('crypto');
if (process.argv[2] === '--compare') {
  const read = d => JSON.parse(fs.readFileSync(path.join(d, 'sums.json'))), a = read(process.argv[3]), b = read(process.argv[4]);
  const names = [...new Set(Object.keys(a).concat(Object.keys(b)))].sort(), diff = names.filter(n => a[n] !== b[n]);
  console.log(names.length + ' pictures, ' + diff.length + ' differ' + (diff.length ? ':\n  ' + diff.join('\n  ') : ''));
  process.exit(diff.length ? 1 : 0);
}
(async () => {
  const out = path.resolve(process.argv[2] || path.join(__dirname, '..', 'out', 'pictures'));
  fs.mkdirSync(out, { recursive: true });
  const b = await launch();
  const sums = {};
  const keep = (name, png) => { fs.writeFileSync(path.join(out, name + '.png'), png); sums[name] = crypto.createHash('sha1').update(png).digest('hex').slice(0, 12); };
  const SIZES = [['desktop', { viewport: { width: 1200, height: 900 } }], ['dark', { viewport: { width: 1200, height: 900 }, colorScheme: 'dark' }], ['narrow', { viewport: { width: 1024, height: 900 } }], ['tablet', { viewport: { width: 820, height: 1100 } }], ['phone', { ...devices['iPhone 13'] }], ['small', { ...devices['iPhone SE'] }]];
  const SWITCHES = { hand: ['Leave a line out'], react: ['No keys'], imm: ['IDs from position'], puri: ['In the items', 'In a table by row'], deui: ['Previous row', 'No focus', 'Break the derivative'] };
  for (const [label, opts] of SIZES) {
    const ctx = await b.newContext({ ...opts, deviceScaleFactor: 1, reducedMotion: 'reduce' }), touch = !!opts.hasTouch;
    await ctx.addInitScript(() => { window.IntersectionObserver = undefined; });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(PAGE, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' });   // nothing is ever caught part-way through a fade
    await p.waitForTimeout(1500);
    keep(label + '-page', await p.screenshot({ fullPage: true }));
    if (label === 'narrow' || label === 'tablet' || label === 'small') { await ctx.close(); continue; }
    for (const name of ['piles', 'hand', 'react', 'imm', 'puri', 'deui']) {
      const fig = p.locator(`.fig[data-fig="${name}"]`), marks = JSON.parse(await fig.getAttribute('data-marks'));
      const T = { start: 30, click: marks.click + 250, type: marks.type + 900, select: marks.select + 800, del: marks.del + 700, scroll: marks.scroll + 1100, quit: marks.quit + 800, back: marks.end - 60 };
      const at = async t => { await fig.locator('.scrub-track').scrollIntoViewIfNeeded(); await p.waitForTimeout(touch ? 450 : 60); const tr = await fig.locator('.scrub-track').boundingBox(), x = tr.x + tr.width * t / marks.end, y = tr.y + tr.height / 2; if (touch) await p.touchscreen.tap(x, y); else await p.mouse.click(x, y); await p.waitForTimeout(450); };
      const shot = async tag => { await fig.scrollIntoViewIfNeeded(); await p.waitForTimeout(120); keep(`${label}-${name}-${tag}`, await fig.screenshot()); };
      for (const st of Object.keys(T)) { await at(T[st]); await shot(st); }
      for (const sw of SWITCHES[name] || []) {
        const bt = fig.locator('.scrub button', { hasText: sw });
        await bt.scrollIntoViewIfNeeded(); await p.waitForTimeout(touch ? 400 : 50); if (touch) await bt.tap(); else await bt.click();
        await p.waitForTimeout(400);
        for (const st of ['del', 'back']) { await at(T[st]); await shot(sw.toLowerCase().replace(/[^a-z]+/g, '-') + '-' + st); }
      }
      await fig.locator('.scrub-reset').scrollIntoViewIfNeeded(); await p.waitForTimeout(touch ? 400 : 50);
      if (touch) await fig.locator('.scrub-reset').tap(); else await fig.locator('.scrub-reset').click();
    }
    if (errs.length) console.log(label, 'ERRORS:', [...new Set(errs)].join(' | '));
    await ctx.close();
  }
  fs.writeFileSync(path.join(out, 'sums.json'), JSON.stringify(sums, null, 1));
  console.log(Object.keys(sums).length, 'pictures in', out);
  await b.close();
})();
