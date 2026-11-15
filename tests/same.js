// The script and a reader's own hands should leave a figure in the same state. For each figure: run the script's first four
// steps (click row 3, type " today", select a word, delete the row above), then do the same four things by hand on a fresh
// page, and compare what the figure shows: the cards, the UI state slips, what ran, and the note.
const { PAGE, launch, devices } = require('./lib');
(async () => {
  const b = await launch();
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
  const read = (p, name) => p.evaluate(n => { const f = document.querySelector(`.fig[data-fig="${n}"]`), t = e => e ? e.textContent.replace(/\s+/g, ' ').trim() : '';
    const dd = u => { const d = u.querySelector('dd'), inp = d && d.querySelector('input'); return inp ? inp.value : t(d); };
    return { cards: [...f.querySelectorAll('.cards li')].map(t).join(' | '), ui: [...f.querySelectorAll('.ustate .u')].filter(u => u.getAttribute('data-k') !== 'hover' && u.getAttribute('data-k') !== 'views').map(u => t(u.querySelector('dt')) + '=' + dd(u)).join(' · '),
      ran: t(f.querySelector('.patch-sum')).replace(/×\d+$/, '').replace(/^frame [\d,]+/, 'frame N') + ' [' + [...f.querySelectorAll('.code-pile .mach .hline:not([hidden]), .scr-pile .mach .hline')].map(t).filter(s => !/^frames since|^draw\(items\)/.test(s)).join(' / ') + ']', note: t(f.querySelector('.u-note')),
      rows: [...f.querySelectorAll('.app-list li input[type=text]')].map(i => i.value).join(' | ') || [...f.querySelectorAll('.krow')].map(t).join(' | ') }; }, name);
  let bad = 0;
  for (const name of ['piles', 'hand', 'react', 'imm', 'puri', 'deui']) {
    // 1. the script, up to just after the delete
    let p = await open();
    let fig = p.locator(`.fig[data-fig="${name}"]`);
    const marks = JSON.parse(await fig.getAttribute('data-marks'));
    await fig.locator('.scrub-track').scrollIntoViewIfNeeded();
    const tr = await fig.locator('.scrub-track').boundingBox();
    await p.mouse.click(tr.x + tr.width * (marks.del + 700) / marks.end, tr.y + tr.height / 2);
    await p.waitForTimeout(700);
    const A = await read(p, name);
    const e1 = p.errs.slice();
    await p.context().close();
    // 2. the same by hand
    p = await open();
    fig = p.locator(`.fig[data-fig="${name}"]`);
    await fig.locator('.demo').scrollIntoViewIfNeeded();
    await p.waitForTimeout(200);
    const pt = async (fn, ...args) => { const q = await p.evaluate(([n, fn, args]) => { const f = document.querySelector(`.fig[data-fig="${n}"]`), s = f.querySelector('.demo').getBoundingClientRect();
      const rows = [...f.querySelectorAll('.app-list li')].length ? [...f.querySelectorAll('.app-list li')] : [...f.querySelectorAll('.krow')];
      const r = rows[args[0]]; const inp = r.querySelector('input[type=text]') || r.querySelector('.kt') || r; const b = inp.getBoundingClientRect();
      if (fn === 'x') { const x = r.querySelector('.x') || r.querySelector('.kx'); const xb = x.getBoundingClientRect(); return [xb.left + xb.width / 2, xb.top + xb.height / 2]; }
      const cs = getComputedStyle(inp), c = document.createElement('canvas').getContext('2d'); c.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      const text = inp.value != null ? inp.value : inp.textContent; const w = k => c.measureText(text.slice(0, k)).width;
      return [b.left + parseFloat(cs.paddingLeft || 0) + (args[1] == null ? w(text.length) + 6 : w(args[1])), b.top + b.height / 2]; }, [name, fn, args]); return q; };
    let q = await pt('text', 2); await p.mouse.click(q[0], q[1]); await p.waitForTimeout(250);
    await p.keyboard.type(' today', { delay: 60 }); await p.waitForTimeout(250);
    const a = await pt('text', 2, 4), z = await pt('text', 2, 10);
    await p.mouse.move(a[0], a[1]); await p.mouse.down(); await p.mouse.move((a[0] + z[0]) / 2, a[1], { steps: 4 }); await p.mouse.move(z[0], z[1], { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(300);
    q = await pt('x', 1); await p.mouse.move(q[0], q[1], { steps: 3 }); await p.waitForTimeout(150); await p.mouse.click(q[0], q[1]); await p.waitForTimeout(800);
    const B = await read(p, name);
    const errs = e1.concat(p.errs);
    await p.context().close();
    const diff = Object.keys(A).filter(k => A[k] !== B[k]);
    if (diff.length || errs.length) bad++;
    console.log((diff.length || errs.length ? 'DIFF ' : 'same ') + name + (diff.length ? '' : ': ' + A.ui.slice(0, 90) + ' · ' + A.ran.slice(0, 70)));
    diff.forEach(k => console.log(`   ${k}\n     script: ${A[k]}\n     hand:   ${B[k]}`));
    if (errs.length) console.log('   ERRORS: ' + [...new Set(errs)].join(' | '));
  }
  console.log(bad, 'figures differ');
  process.exitCode = bad ? 1 : 0;
  await b.close();
})();
