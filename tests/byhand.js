// Retained mode used by hand, with no script running.
// 1. The log: every action gets its own line, and only a gesture still going on (keys typed into one box) counts up on one entry.
// 2. The left-out line: with the switch on, a deleted item leaves the data and its row stays on the screen. That row can then be
//    typed in, ticked and deleted again without anything breaking, and its edits reach no item.
const { PAGE, launch } = require('./lib');
(async () => {
  const b = await launch();
  let bad = 0;
  const say = (ok, msg) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
  const open = async () => {
    const ctx = await b.newContext({ viewport: { width: 1200, height: 900 } });
    await ctx.addInitScript(() => { window.IntersectionObserver = undefined; });
    const p = await ctx.newPage();
    p.errs = []; p.on('pageerror', e => p.errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 2).join(' ')));
    await p.goto(PAGE, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(600);
    return p;
  };
  const read = p => p.evaluate(() => { const f = document.querySelector('.fig[data-fig="hand"]'), t = e => e ? e.textContent.replace(/\s+/g, ' ').trim() : '';
    return { sum: t(f.querySelector('.patch-sum')), lines: [...f.querySelectorAll('.code-pile .mach .hline')].map(t).join(' / '), note: t(f.querySelector('.u-note')), miss: f.querySelectorAll('.demo-ax .ax.miss').length,
      log: [...f.querySelectorAll('.hist .lg')].map(l => [...l.querySelectorAll('.lg-n, .lg-x, .lg-w, .lg-t')].map(c => c.textContent).join(' ')),
      cards: [...f.querySelectorAll('.cards li .t')].map(t).join(' | '), rows: [...f.querySelectorAll('.app-list li input[type=text]')].map(i => i.value).join(' | '), marked: f.querySelectorAll('.app-list li.stale, .app-list li.jumped').length }; });

  // 1. the log
  let p = await open(), fig = p.locator('.fig[data-fig="hand"]'), row = i => fig.locator('.app-list li').nth(i), s;
  await fig.locator('.app-list').scrollIntoViewIfNeeded();
  for (const i of [0, 1, 2]) { await row(i).locator('input[type=text]').click(); await p.waitForTimeout(400); }
  s = await read(p);
  say(s.log.length === 2 && s.log.every(l => l === 'click no handler UI state') && s.sum === 'click: no handler ran', `three clicks into three rows: two lines in the log and one showing (${s.log.length} · ${s.sum})`);
  for (const i of [0, 0]) { await row(i).locator('input[type=checkbox]').click(); await p.waitForTimeout(400); }
  s = await read(p);
  say(s.log[0] === 'on tick(i) app state screen' && s.log.length === 4, `ticking a row twice: each its own line (${s.log.slice(0, 2).join(' | ')})`);
  await row(4).locator('input[type=text]').click(); await p.waitForTimeout(250); await p.keyboard.type('abc', { delay: 110 }); await p.waitForTimeout(1200); await p.keyboard.type('de', { delay: 110 }); await p.waitForTimeout(400);
  s = await read(p);
  say(s.sum === 'on input(i):×5' && s.log[0] === 'click no handler UI state', `five keys into one box, with a pause: one entry, counting up (${s.sum})`);
  await row(2).locator('input[type=text]').click(); await p.waitForTimeout(250); await p.keyboard.type('z'); await p.waitForTimeout(400);
  s = await read(p);
  say(s.sum === 'on input(i):' && s.log[1] === 'on input(i) ×5 app state', `a key into another box: a new entry (${s.log.slice(0, 2).join(' | ')})`);
  for (const i of [5, 5]) { await row(i).hover(); await row(i).locator('.x').click(); await p.waitForTimeout(500); }
  s = await read(p);
  say(s.log[0] === 'on delete(i) app state screen' && s.sum === 'on delete(i):', `two deletes: each its own line (${s.log[0]})`);
  let errs = p.errs.slice();
  await p.context().close();

  // 2. the left-out line
  p = await open(); fig = p.locator('.fig[data-fig="hand"]'); row = i => fig.locator('.app-list li').nth(i);
  const marks = JSON.parse(await fig.getAttribute('data-marks'));
  await fig.locator('.scrub').scrollIntoViewIfNeeded();
  await fig.locator('.scrub button', { hasText: 'Leave a line out' }).click();
  for (let i = 0; i < 80 && await fig.locator('.scrub-btn.playing').count(); i++) await p.waitForTimeout(200);
  const tr = await fig.locator('.scrub-track').boundingBox();
  await p.mouse.click(tr.x + tr.width * (marks.del + 700) / marks.end, tr.y + tr.height / 2);
  await p.waitForTimeout(500);
  s = await read(p);
  say(!/Call Phil/.test(s.cards) && /Call Phil/.test(s.rows) && s.miss === 1 && /left out/.test(s.lines) && /still on the screen/.test(s.note) && s.marked === 0,
    `line left out: the item is gone from the data, its row is still on the screen and isn't marked · ${s.lines} · ${s.note}`);
  await fig.locator('.demo').scrollIntoViewIfNeeded();
  const cards = s.cards;
  await row(1).locator('input[type=text]').click(); await p.waitForTimeout(200); await p.keyboard.type('!'); await p.waitForTimeout(500);
  s = await read(p);
  say(/no such item/.test(s.lines) && s.cards === cards, `typing in the row that stayed reaches no item (${s.lines})`);
  await row(1).locator('input[type=checkbox]').click(); await p.waitForTimeout(500);
  s = await read(p);
  say(/no such item/.test(s.lines) && s.cards === cards, `ticking it reaches no item (${s.lines})`);
  await row(1).hover(); await row(1).locator('.x').click(); await p.waitForTimeout(500);
  s = await read(p);
  say(/no such item/.test(s.lines) && s.cards === cards && /Call Phil/.test(s.rows), `deleting it again removes nothing from the data, and it stays (${s.lines})`);
  // by hand, the switch replays nothing: it applies to the app as it stands, so the next delete takes the row off the screen
  await fig.locator('.scrub button', { hasText: 'Put the line back' }).click(); await p.waitForTimeout(300);
  await row(1).hover(); await row(1).locator('.x').click(); await p.waitForTimeout(500);
  s = await read(p);
  say(!/Call Phil/.test(s.rows) && !/left out/.test(s.lines) && s.cards === cards, `line put back, and the row deleted again: now it goes (${s.lines})`);
  errs = errs.concat(p.errs);
  if (errs.length) { bad += errs.length; console.log('ERRORS:\n  ' + [...new Set(errs)].join('\n  ')); }
  console.log(bad, 'failed');
  process.exitCode = bad ? 1 : 0;
  await b.close();
})();
