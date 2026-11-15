// No arrow passes over anything but its own two ends.
// At every step of every figure's script, and under every switch, at five screen sizes, each arrow is walked along its
// length and checked against the things it could run over: cards, slips of UI state, lines of code, log lines, rows of a
// tree, rows of the window, headings and notes. The last few pixels at each end are let off, since an arrow starts and
// ends right beside something. Marks between a tree's paired rows are not arrows and are not checked.
const { PAGE, launch, devices } = require('./lib');
const SWITCHES = { hand: ['Leave a line out'], react: ['No keys'], imm: ['IDs from position'], puri: ['In the items', 'In a table by row'], deui: ['Break the derivative'] };
const SIZES = [['desktop', { viewport: { width: 1200, height: 900 } }], ['narrow', { viewport: { width: 1024, height: 900 } }], ['tablet', { viewport: { width: 820, height: 1100 } }], ['phone', { ...devices['iPhone 13'] }], ['small phone', { ...devices['iPhone SE'] }]];
(async () => {
  const b = await launch();
  let bad = 0, checked = 0;
  const only = process.env.SIZES ? process.env.SIZES.split(',') : null;
  for (const [label, opts] of SIZES.filter(s => !only || only.includes(s[0]))) {
    const ctx = await b.newContext(opts), touch = !!opts.hasTouch;
    await ctx.addInitScript(() => { window.IntersectionObserver = undefined; });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(PAGE, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(700);
    const hits = name => p.evaluate(n => {
      const f = document.querySelector(`.fig[data-fig="${n}"]`), d = f.querySelector('.demo'), s = d.getBoundingClientRect();
      const words = e => { const g = document.createRange(); g.selectNodeContents(e); return g.getBoundingClientRect(); };
      const seen = e => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return null; const box = e.closest('.tree, .app-list, .kit, .hist'); if (box) { const c = box.getBoundingClientRect(); if (r.bottom <= c.top + 1 || r.top >= c.bottom - 1) return null; return { left: r.left, right: r.right, top: Math.max(r.top, c.top), bottom: Math.min(r.bottom, c.bottom) }; } return r; };
      const things = [];
      const add = (sel, kind, rect) => f.querySelectorAll(sel).forEach(e => { if (e.hidden || getComputedStyle(e).visibility === 'hidden') return; const r = rect ? rect(e) : seen(e); if (r && r.right - r.left > 4 && r.bottom - r.top > 4) things.push({ kind, text: e.textContent.replace(/\s+/g, ' ').trim().slice(0, 28), l: r.left - s.left + 2, r: r.right - s.left - 2, t: r.top - s.top + 2, b: r.bottom - s.top - 2 }); });
      add('.cards li', 'card'); add('.ustate .u', 'slip'); add('.mach .hline', 'line'); add('.hist .lg', 'log line'); add('.tree li', 'tree row'); add('.app-list li, .krow', 'window row');
      add('.pile-h, .patch-sum, .u-note, .ml-t, .ml-s', 'words', words);
      const out = [];
      f.querySelectorAll('.demo-ax .ax:not(.pair)').forEach(a => {
        if (getComputedStyle(a).display === 'none') return;
        a.querySelectorAll('.al').forEach(path => {
          const L = path.getTotalLength(); if (L < 14) return;
          const over = {};
          for (let k = 7; k <= L - 7; k += 2) { const q = path.getPointAtLength(k); for (const t of things) if (q.x > t.l && q.x < t.r && q.y > t.t && q.y < t.b) { over[t.kind + ' “' + t.text + '”'] = 1; } }
          Object.keys(over).forEach(o => out.push(a.getAttribute('class').replace(/^ax /, '') + ' arrow over ' + o));
        });
      });
      return { arrows: f.querySelectorAll('.demo-ax .ax:not(.pair)').length, out: [...new Set(out)] };
    }, name);
    for (const name of ['hand', 'react', 'imm', 'puri', 'deui']) {
      const fig = p.locator(`.fig[data-fig="${name}"]`), marks = JSON.parse(await fig.getAttribute('data-marks'));
      const T = { click: marks.click + 250, type: marks.type + 900, select: marks.select + 800, del: marks.del + 700, scroll: marks.scroll + 1100, quit: marks.quit + 800, back: marks.end - 60 };
      const at = async t => { await fig.locator('.scrub-track').scrollIntoViewIfNeeded(); await p.waitForTimeout(touch ? 450 : 60); const tr = await fig.locator('.scrub-track').boundingBox(), x = tr.x + tr.width * t / marks.end, y = tr.y + tr.height / 2; if (touch) await p.touchscreen.tap(x, y); else await p.mouse.click(x, y); await p.waitForTimeout(350); };
      const check = async tag => { const r = await hits(name); checked += r.arrows; if (r.out.length) { bad += r.out.length; console.log(`FAIL ${label} ${name} ${tag}:\n       ` + r.out.join('\n       ')); } };
      for (const st of Object.keys(T)) { await at(T[st]); await check(st); }
      for (const sw of SWITCHES[name] || []) {
        const bt = fig.locator('.scrub button', { hasText: sw });
        await bt.scrollIntoViewIfNeeded(); await p.waitForTimeout(touch ? 400 : 50); if (touch) await bt.tap(); else await bt.click();
        for (let i = 0; i < 40 && await fig.locator('.scrub-btn.playing').count(); i++) await p.waitForTimeout(150);
        for (const st of ['del', 'back']) { await at(T[st]); await check(sw + ', ' + st); }
      }
    }
    if (errs.length) { bad += errs.length; console.log(label, 'ERRORS: ' + [...new Set(errs)].join(' | ')); }
    console.log(`ok   ${label}: done`);
    await ctx.close();
  }
  console.log(`${checked} arrows walked, ${bad} problems`);
  console.log(bad, 'failed');
  process.exitCode = bad ? 1 : 0;
  await b.close();
})();
