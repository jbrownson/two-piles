// The player's details: taking the slider pauses the script, and a switch replays from just before the step it changes.
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
    const state = () => p.evaluate(() => { const f = document.querySelector('.fig[data-fig="hand"]'); return { playing: !!f.querySelector('.scrub-btn.playing'), at: +f.querySelector('.scrub-track').getAttribute('aria-valuenow'), off: !!f.querySelector('.scrub.off'), cap: f.querySelector('.scrub-cap').textContent.slice(0, 40), lines: [...f.querySelectorAll('.mach .hline')].map(l => l.textContent).join(' / ') }; });
    const pct = t => Math.round(100 * t / marks.end);
    const press = async loc => { await loc.scrollIntoViewIfNeeded(); await p.waitForTimeout(touch ? 400 : 50); if (touch) await loc.tap(); else await loc.click(); };
    const playBtn = fig.locator('.scrub-btn'), sw = t => fig.locator('.scrub button', { hasText: t });
    const branch = pct(marks.del - 900);

    // 1. Play, then take the slider: it stays where it was put, paused.
    await press(playBtn);
    await p.waitForTimeout(1500);
    const tr = await fig.locator('.scrub-track').boundingBox();
    const x = tr.x + tr.width * (marks.select + 800) / marks.end, y = tr.y + tr.height / 2;
    if (touch) await p.touchscreen.tap(x, y);
    else { await p.mouse.move(tr.x + tr.width * 0.2, y); await p.mouse.down(); await p.mouse.move(tr.x + tr.width * 0.3, y, { steps: 4 }); await p.mouse.move(x, y, { steps: 4 }); await p.mouse.up(); }
    await p.waitForTimeout(900);
    let s = await state();
    say(!s.playing && Math.abs(s.at - pct(marks.select + 800)) <= 2 && !s.off, `${label}: slider taken while playing → paused at ${s.at}% (wanted ${pct(marks.select + 800)}%)`);
    // ...and play goes on from there
    await press(playBtn);
    await p.waitForTimeout(700);
    s = await state();
    say(s.playing && s.at >= pct(marks.select + 800) && s.at <= pct(marks.select + 800) + 12, `${label}: play goes on from there → playing at ${s.at}%`);

    // 2. A switch while playing, before the step it changes: jumps to just before that step, plays it, and holds.
    const held = pct(marks.del + 450);
    await press(playBtn);                      // pause
    const tr2 = await fig.locator('.scrub-track').boundingBox();
    if (touch) await p.touchscreen.tap(tr2.x + tr2.width * 0.08, tr2.y + tr2.height / 2); else await p.mouse.click(tr2.x + tr2.width * 0.08, tr2.y + tr2.height / 2);
    await p.waitForTimeout(touch ? 700 : 300);
    await press(playBtn);                      // play from 8%
    await p.waitForTimeout(500);
    await press(sw('Leave a line out'));
    await p.waitForTimeout(350);
    s = await state();
    say(s.playing && s.at >= branch - 1 && s.at <= branch + 6, `${label}: switch while playing early → playing from ${s.at}% (the step it changes starts at ${branch}%)`);
    await p.waitForTimeout(2400);
    s = await state();
    say(!s.playing && Math.abs(s.at - held) <= 1 && /left out/.test(s.lines), `${label}: ...plays that step and holds at ${s.at}% (wanted ${held}%): ${s.lines.slice(0, 70)}`);

    // 3. The other setting, from where it was held: the same step again, the other way.
    await press(sw('Put the line back'));
    await p.waitForTimeout(350);
    s = await state();
    say(s.playing && s.at >= branch - 1 && s.at <= branch + 6, `${label}: switch while held → back to ${s.at}% and playing`);
    await p.waitForTimeout(2400);
    s = await state();
    say(!s.playing && Math.abs(s.at - held) <= 1 && !/left out/.test(s.lines), `${label}: ...and holds again at ${s.at}%: ${s.lines.slice(0, 70)}`);

    // 4. Play goes on from there to the end. A switch late in the script goes back to the step.
    await press(playBtn);
    for (let i = 0; i < 60 && (await state()).at < pct(marks.quit); i++) await p.waitForTimeout(150);
    s = await state();
    say(s.playing && s.at >= pct(marks.quit), `${label}: play goes on from the held step → playing at ${s.at}%`);
    await press(sw('Leave a line out'));
    await p.waitForTimeout(350);
    s = await state();
    say(s.playing && s.at >= branch - 1 && s.at <= branch + 6, `${label}: switch while playing late → back to ${s.at}% and playing`);
    for (let i = 0; i < 90 && (await state()).playing; i++) await p.waitForTimeout(150);
    await press(playBtn);
    for (let i = 0; i < 90 && (await state()).playing; i++) await p.waitForTimeout(150);
    s = await state();
    say(!s.playing && s.at === 100, `${label}: ...and play from there runs to the end (${s.at}%) · ${s.cap}`);
    await press(sw('Put the line back'));
    for (let i = 0; i < 90 && (await state()).playing; i++) await p.waitForTimeout(150);

    // 5. Off the script, a switch replays nothing: it applies to the app as it stands.
    await fig.locator('.app-list li').nth(0).locator('input[type=text]').scrollIntoViewIfNeeded();
    await p.waitForTimeout(touch ? 500 : 100);
    if (touch) await fig.locator('.app-list li').nth(0).locator('input[type=text]').tap(); else await fig.locator('.app-list li').nth(0).locator('input[type=text]').click();
    await p.waitForTimeout(300);
    await press(sw('Leave a line out'));
    await p.waitForTimeout(400);
    s = await state();
    say(s.off && !s.playing, `${label}: off the script, the switch replays nothing (off ${s.off}, playing ${s.playing})`);
    if (errs.length) { bad += errs.length; console.log(label, 'ERRORS:\n  ' + [...new Set(errs)].join('\n  ')); }
    await ctx.close();
  }
  console.log(bad, 'failed');
  process.exitCode = bad ? 1 : 0;
  await b.close();
})();
