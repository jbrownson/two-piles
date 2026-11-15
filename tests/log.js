// The retained figure's log: what it holds after the script, after a switch, and after a lot of use by hand.
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
    const fig = p.locator('.fig[data-fig="hand"]');
    const marks = JSON.parse(await fig.getAttribute('data-marks'));
    const log = () => p.evaluate(() => { const f = document.querySelector('.fig[data-fig="hand"]'), w = f.querySelector('.hist').getBoundingClientRect();
      return { lines: [...f.querySelectorAll('.hist .lg')].map(l => [...l.querySelectorAll('.lg-n, .lg-x, .lg-w, .lg-t')].map(c => c.textContent).join(' ').replace(/\s+/g, ' ').trim()), shown: [...f.querySelectorAll('.hist .lg')].filter(l => { const r = l.getBoundingClientRect(); return r.bottom <= w.bottom + 1 && r.top >= w.top - 1; }).length,
        wrapped: [...f.querySelectorAll('.hist .lg')].filter(l => l.getBoundingClientRect().height > 26).length, sum: f.querySelector('.patch-sum').textContent, h: Math.round(f.querySelector('.demo').getBoundingClientRect().height), histTop: Math.round(w.top - f.querySelector('.demo').getBoundingClientRect().top) }; });
    const at = async t => { await fig.locator('.scrub-track').scrollIntoViewIfNeeded(); await p.waitForTimeout(touch ? 500 : 60); const tr = await fig.locator('.scrub-track').boundingBox(); const x = tr.x + tr.width * t / marks.end, y = tr.y + tr.height / 2; if (touch) await p.touchscreen.tap(x, y); else await p.mouse.click(x, y); await p.waitForTimeout(500); };
    // the slider, at the end of the script
    await at(marks.end - 60);
    let s = await log();
    say(s.lines.join(' / ') === 'on quit app state / scroll no handler UI state / on delete(i) app state screen / select no handler UI state / on input(i) ×6 app state / click no handler UI state' && s.sum === 'on launch:', `${label}: after the script: ${s.lines.join(' / ')}`);
    say(s.wrapped === 0, `${label}: no log line wraps (${s.wrapped}) · ${s.shown} of ${s.lines.length} in view · figure ${s.h}px`);
    const top0 = s.histTop, h0 = s.h;
    // back to the start: empty
    await at(1);
    s = await log();
    say(s.lines.length === 0 && s.histTop === top0 && s.h === h0, `${label}: at the start the log is empty, and stands where it stood (${s.histTop} vs ${top0}; figure ${s.h} vs ${h0})`);
    // mid-typing: the burst is one entry, not yet in the log
    await at(marks.type + 350);
    s = await log();
    say(s.lines.join(' / ') === 'click no handler UI state' && /^on input\(i\):(×\d)?$/.test(s.sum), `${label}: while typing: log holds “${s.lines.join(' / ')}”, and ${s.sum} is what ran`);
    // by hand: a lot of events, more than fit
    await fig.locator('.app-list li').nth(0).locator('input[type=text]').scrollIntoViewIfNeeded();
    await p.waitForTimeout(touch ? 500 : 100);
    for (let i = 0; i < 9; i++) {
      const box = fig.locator('.app-list li').nth(i % 3).locator(i % 2 ? 'input[type=checkbox]' : 'input[type=text]');
      if (touch) await box.tap(); else await box.click();
      await p.waitForTimeout(260);
      if (!(i % 2)) { await p.keyboard.type('x'); await p.waitForTimeout(200); }
    }
    await p.waitForTimeout(600);
    s = await log();
    // a taller handler than the script has (tick's lines wrap) may move the log down once; it must not move it up, and must stay small
    say(s.lines.length >= 8 && s.lines.length <= 14 && s.histTop >= top0 && s.histTop - top0 <= 40 && s.shown >= (touch ? 3 : 6), `${label}: by hand: ${s.lines.length} lines kept, ${s.shown} in view, log ${s.histTop - top0}px lower than in the script, figure ${s.h}px (was ${h0}) · newest: ${s.lines[0]} / ${s.lines[1]}`);
    if (errs.length) { bad += errs.length; console.log(label, 'ERRORS:\n  ' + [...new Set(errs)].join('\n  ')); }
    await ctx.close();
  }
  console.log(bad, 'failed');
  process.exitCode = bad ? 1 : 0;
  await b.close();
})();
