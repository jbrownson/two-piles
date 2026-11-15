// The unified trial beyond the script: every switch at the delete step, and the reader's own clicks and keys in each figure.
// Reports page errors, arrows that end up outside the figure, and what the panel says.
const { PAGE, launch, devices } = require('./lib');
(async () => {
  const b = await launch();
  let bad = 0;
  const say = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
  const ctx = await b.newContext({ viewport: { width: 1200, height: 900 } });
  await ctx.addInitScript(() => { window.IntersectionObserver = undefined; });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 2).join(' ')));
  await p.goto(PAGE, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(600);
  const read = n => { const f = document.querySelector(`.fig[data-fig="${n}"]`), s = f.querySelector('.demo').getBoundingClientRect();
    return { arrows: f.querySelectorAll('.demo-ax .ax').length, miss: f.querySelectorAll('.demo-ax .ax.miss').length, wide: f.querySelectorAll('.demo-ax .ax.wide').length,
      out: [...f.querySelectorAll('.demo-ax .al')].filter(e => { const r = e.getBoundingClientRect(); return (r.width || r.height) && (r.left < s.left - 1 || r.right > s.right + 1 || r.top < s.top - 1 || r.bottom > s.bottom + 1); }).length,
      sum: f.querySelector('.patch-sum').textContent, lines: [...f.querySelectorAll('.mach .hline:not([hidden])')].map(l => l.textContent).join(' / '), off: !!f.querySelector('.scrub.off') }; };
  // 1. each switch, at the delete step
  for (const [name, sw, want, back] of [
    ['hand', 'Leave a line out', s => s.miss === 1 && /left out/.test(s.lines), 'Put the line back'],
    ['react', 'No keys', s => /by position/.test(s.lines) && /7 writes/.test(s.lines) && s.arrows >= 4, 'With keys'],
    ['imm', 'IDs from position', s => s.arrows >= 3, 'IDs from items'],
    ['puri', 'Focus on the item', s => s.wide === 1, 'Focus by item id'],
    ['puri', 'Focus by row', s => s.miss === 1, 'Focus by item id'],
    ['deui', 'Break the derivative', s => s.miss === 1 && /✗/.test(s.lines), 'Fix the derivative']]) {
    const fig = p.locator(`.fig[data-fig="${name}"]`);
    const marks = JSON.parse(await fig.getAttribute('data-marks'));
    await fig.locator('.scrub').scrollIntoViewIfNeeded();
    await fig.locator('.scrub button', { hasText: sw }).click();
    for (let i = 0; i < 80 && await fig.locator('.scrub-btn.playing').count(); i++) await p.waitForTimeout(200);
    const tr = await fig.locator('.scrub-track').boundingBox();
    await p.mouse.click(tr.x + tr.width * (marks.del + 700) / marks.end, tr.y + tr.height / 2);
    await p.waitForTimeout(350);
    const s = await p.evaluate(read, name);
    say(want(s) && s.out === 0, `${name}, ${sw}: ${s.arrows} arrows (${s.miss} left out, ${s.wide} wide, ${s.out} outside) · ${s.sum} · ${s.lines.slice(0, 110)}`);
    await fig.locator('.scrub button', { hasText: back }).click();
    for (let i = 0; i < 80 && await fig.locator('.scrub-btn.playing').count(); i++) await p.waitForTimeout(200);
  }
  // 2. the reader's own hands: click into a row, type, tick, delete, add a row, quit and launch
  for (const name of ['hand', 'react', 'imm', 'puri', 'deui']) {
    const fig = p.locator(`.fig[data-fig="${name}"]`), dom = name === 'hand' || name === 'react';
    await fig.locator('.demo').scrollIntoViewIfNeeded();
    const row = i => fig.locator(dom ? '.app-list li' : '.krow').nth(i);
    const log = [];
    const note = async what => { await p.waitForTimeout(900); const s = await p.evaluate(read, name); log.push(`${what}: ${s.arrows}${s.out ? ' (' + s.out + ' OUTSIDE)' : ''}`); return s; };
    await row(3).locator(dom ? 'input[type=text]' : '.ktext').click(); let s = await note('click');
    const off = s.off;
    await p.keyboard.type('ab', { delay: 220 }); await note('type');
    await row(4).locator(dom ? 'input[type=checkbox]' : '.kchk').click(); await note('tick');
    await row(1).hover(); await row(1).locator(dom ? '.x' : '.kx').click(); s = await note('delete');
    await row(2).locator(dom ? 'input[type=text]' : '.ktext').click(); await p.keyboard.press('Enter'); await note('enter');
    await fig.locator('.app-close').click(); const q = await note('quit');
    await fig.locator('.app-icon').click(); const l = await note('launch');
    const outs = log.filter(x => /OUTSIDE/.test(x)).length;
    say(off && outs === 0 && s.arrows >= 2, `${name} by hand: off the script ${off} · arrows after ${log.join(', ')}`);
  }
  if (errs.length) { bad += errs.length; console.log('ERRORS:\n  ' + [...new Set(errs)].join('\n  ')); }
  console.log(bad, 'failed');
  process.exitCode = bad ? 1 : 0;
  await b.close();
})();
