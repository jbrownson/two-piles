  /* ---------------------------------------------------------------------------------------------
     One figure for every approach, then a slider that plays a script. Touch the app and you're off
     the script; touch the slider and you're back on it. What differs between figures is the
     "machine" that runs the app.
     The figure is also the diagram, and each approach arranges its own (the stylesheet has one
     grid per figure). What they share is the orientation: what you keep is on the left, the screen
     on the right. What stands between the two, and where your code sits, is the approach:
       retained mode   only your handlers between: what ran last, level with what it edits, and a log of what ran before
       React           the old tree and the new tree between, row for row, and the diff's writes going on to the window
       immediate mode  the drawing loop between, and the library's store under it
       Puri            both piles side by side as your state, one wide arrow across; the handler under them
       deui            the change under your state, the screen's change under the screen, the derivative between
     The parts every figure can use: the app state pile, the UI state pile (cfg.keeps says who keeps
     it), the window, a panel of what ran (F.lines), a second panel (cfg.two), the space between
     (F.mid), and a standing link across that space (cfg.link) that is dormant until it runs.
     (The figure at the top of the page has none of this: it is app state | the app | UI state.)
     --------------------------------------------------------------------------------------------- */
  var figs = [];
  /* Only one figure can hold the page's keyboard focus, so starting one pauses the others. */
  function claim(owner) { figs.forEach(function (f) { if (f !== owner && f.halt) f.halt(); }); }
  /* Figures measure the room they need one at a time, when the browser has a moment to spare */
  var fitQ = [], fitting = false;
  function idle(fn) { if (window.requestIdleCallback) window.requestIdleCallback(fn, { timeout: 500 }); else setTimeout(fn, 40); }
  function fitNext() { var F = fitQ.shift(); if (F) F.fitNow(); if (fitQ.length) idle(fitNext); else fitting = false; }
  function fitSoon(F) { if (fitQ.indexOf(F) < 0) fitQ.push(F); if (!fitting) { fitting = true; idle(fitNext); } }

  var SIX = ["Buy milk", "Call Phil", "Fix scroll bug", "Write essay", "Water plants", "Book flights"];
  var EIGHT = SIX.concat(["Renew passport", "Back up laptop"]);
  var TYPED = " today";
  var TURN = "The app is live: type, select, scroll, tick, delete, add a row with Enter. The close box quits it and saves to disk, and the icon starts it again. Drag the slider to go back to the example.";
  var ICON = '<svg viewBox="0 0 34 42" aria-hidden="true"><path d="M.5 .5 H24.5 L33.5 9.5 V41.5 H.5 Z"/><path class="ln" d="M24.5 .5 V9.5 H33.5 M7 16.5 h4 v4 h-4 z M14.5 18.5 H27 M7 25.5 h4 v4 h-4 z M14.5 27.5 H27 M7 34.5 h4 v0 M14.5 35.5 H22"/></svg>';

  function LiveFig(name, cfg) {
    var root = document.querySelector('.fig[data-fig="' + name + '"]');
    if (!root) return null;
    var F = { name: name, quiet: false, busy: false, off: false, playing: false, t: 0, played: false, last: {}, noAuto: !!cfg.noAuto };

    /* The parts */
    var keeps = cfg.keeps || "";   /* who keeps UI state here: "toolkit", "library" or "yours". None for the top figure. */
    var stage = F.stage = h("div", "demo live" + (cfg.cls ? " " + cfg.cls : "") + (keeps ? " uni keeps-" + keeps + " fig-" + name : ""), null, root);
    var dp = h("div", "pile data-pile", null, stage);
    F.dataHead = h("p", "pile-h", "app state", dp);
    F.cards = h("ol", "cards", null, dp); F.cards.setAttribute("aria-label", "App state");
    var desk = h("div", "app", null, stage), win = F.win = h("div", "app-win", null, desk);
    var abar = h("div", "app-bar", null, win);
    var closeBox = h("button", "app-close", null, abar); closeBox.type = "button"; closeBox.setAttribute("aria-label", "Quit the app");
    h("span", "app-title", "To-do", abar);
    /* Under the window, on the desktop: a disk, and the app's own icon */
    var launcher = h("div", "launcher", null, desk);
    var dk = h("button", "disk-icon", null, launcher); dk.type = "button"; dk.setAttribute("aria-label", "Disk: look at what is saved on it"); dk.tabIndex = -1;
    var hd = h("span", "hd", null, dk); h("i", "hd-ui", null, hd); h("i", "hd-led", null, hd); h("i", "hd-vent", null, hd);
    h("span", "icon-name", "Disk", dk);
    var icon = h("button", "app-icon", null, launcher); icon.type = "button"; icon.setAttribute("aria-label", "Launch the app"); icon.tabIndex = -1;
    icon.innerHTML = ICON; h("span", "icon-name", "To-do", icon);
    F.host = h(cfg.kit ? "div" : "ul", cfg.kit ? "kit" : "app-list", null, win);
    F.host.setAttribute("aria-label", cfg.label);
    if (cfg.kit) F.host.setAttribute("role", "group");
    if (cfg.foot) h("p", "app-foot", cfg.foot, win);
    var mid = F.mid = keeps ? h("div", "pile mid-pile", null, stage) : null;   /* the space between what you keep and the screen */
    if (mid && cfg.link) {   /* the link across it: view(), build(). Its name and a word about when it runs. */
      F.linkLabel = h("div", "mid-link", null, mid);
      h("p", "ml-t", cfg.link.text, F.linkLabel); F.linkSub = h("p", "ml-s", cfg.link.sub || "", F.linkLabel);
    }
    var cp = keeps ? h("div", "pile code-pile", null, stage) : null;   /* what ran: your handler, the change, the frame */
    if (cp) { h("p", "pile-h", cfg.mach || "your handler", cp); F.sum = h("p", "patch-sum", "", cp); F.mach = h("div", "mach", null, cp); }
    if (cp && cfg.log) { F.hist = h("ol", "hist-l", null, h("div", "hist", null, cp)); F.hist.setAttribute("aria-label", "What ran before, newest first"); }   /* a figure that keeps a log of what ran */
    var sp = keeps && cfg.two ? h("div", "pile scr-pile", null, stage) : null;   /* a second panel, where an approach has two things to say */
    if (sp) { h("p", "pile-h", cfg.two, sp); F.sum2 = h("p", "patch-sum", "", sp); F.mach2 = h("div", "mach", null, sp); }
    var xp = sp && cfg.cross ? h("div", "pile cross-pile", null, stage) : null;   /* what turns the first panel into the second, standing between them: the derivative */
    if (xp) { F.crossLabel = h("div", "mid-link cross-link", null, xp); h("p", "ml-t", cfg.cross.text, F.crossLabel); h("p", "ml-s", cfg.cross.sub || "", F.crossLabel); }
    var up = h("div", "pile ui-pile", null, stage), ub = keeps ? h("div", "ui-box", null, up) : up;
    var uh = h("p", "pile-h", "UI state ", ub);
    F.where = h("span", "pile-where", cfg.where || "", uh);
    F.ustate = h("dl", "ustate", null, ub); F.ustate.setAttribute("aria-label", "UI state");
    F.u = {};
    (cfg.fields || []).forEach(function (f) {
      var u = h("div", "u", null, F.ustate); u.setAttribute("data-k", f[0]);
      h("dt", null, f[1], u); h("dd", null, f[2] || "", u);
      F.u[f[0]] = u;
    });
    F.note = h("p", "u-note", "", ub);
    F.fx = el("svg", { "class": "demo-fx", "aria-hidden": "true" }, stage);
    var ax = el("svg", { "class": "demo-ax", "aria-hidden": "true" }, stage);   /* the arrows from what ran to what it touched */
    var over = h("div", "fx-over", null, stage); over.setAttribute("aria-hidden", "true");   /* copies of slips, in flight */
    var zl = el("svg", { "class": "zoom-layer", "aria-hidden": "true" }, desk);   /* the zooming outlines: on the desktop, under the window */
    F.ptr = h("div", "ghost-ptr", null, stage); F.ptr.setAttribute("aria-hidden", "true");
    F.ptr.innerHTML = '<svg viewBox="0 0 22 30" width="22" height="30"><path d="M1 1 L1 23 L7 17.5 L11.5 27.5 L15.5 25.8 L11 16 L19 15.5 Z"/></svg>';

    var sb = F.bar = h("div", "scrub", null, root);
    var rst = h("button", "scrub-reset", null, sb); rst.type = "button"; rst.setAttribute("aria-label", "Reset the example"); rst.title = "Reset";   /* back to the start, with the app as it was then */
    rst.innerHTML = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M3 2.5 H5.5 V13.5 H3 Z M13.5 2.5 L6.5 8 L13.5 13.5 Z"/></svg>';
    var btn = h("button", "scrub-btn", null, sb); btn.type = "button"; btn.setAttribute("aria-label", "Play the example");
    btn.innerHTML = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path class="i-play" d="M4.5 2.5 L13 8 L4.5 13.5 Z"/><path class="i-pause" d="M4 2.5 H7 V13.5 H4 Z M9 2.5 H12 V13.5 H9 Z"/></svg>';
    var track = h("div", "scrub-track", null, sb), opts = [], sel = {}, quietSw = {};
    track.setAttribute("role", "slider"); track.tabIndex = 0; track.setAttribute("aria-label", "Example timeline");
    track.setAttribute("aria-valuemin", "0"); track.setAttribute("aria-valuemax", "100"); track.setAttribute("aria-valuenow", "0");
    h("span", "scrub-rail", null, track);
    var fill = h("span", "scrub-fill", null, track), thumb = h("span", "scrub-thumb", null, track);
    (cfg.switches || []).forEach(function (sw) {
      if (sw.show) h("span", "seg-l", sw.show, sb);
      var seg = h("div", "seg", null, sb); seg.setAttribute("role", "group"); seg.setAttribute("aria-label", sw.label);
      opts.push({ name: sw.name, vals: sw.options.map(function (o) { return o[0]; }) }); sel[sw.name] = sw.options[0][0];
      if (sw.quiet) quietSw[sw.name] = true;   /* a setting for something the script doesn't do: choosing it replays nothing */
      sw.options.forEach(function (o, i) {
        var b = h("button", null, o[1], seg); b.type = "button"; b.setAttribute("aria-pressed", i === 0 ? "true" : "false");
        b.addEventListener("click", function () {
          each(seg.children, function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
          choose(sw.name, o[0]);
        });
      });
    });
    (cfg.toggles || []).forEach(function (tg) {
      opts.push({ name: tg.name, vals: [false, true] }); sel[tg.name] = false;
      var b = h("button", "btn sm", tg.off, sb); b.type = "button"; b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () {
        var on = b.getAttribute("aria-pressed") !== "true";
        b.setAttribute("aria-pressed", on ? "true" : "false"); b.textContent = on ? tg.on : tg.off;
        choose(tg.name, on);
      });
    });
    var cap = h("p", "scrub-cap", "", root), capKey = null;

    /* What the machines use */
    var inflight = {}, pp = [0, 0];
    F.box = function (n) { var s = stage.getBoundingClientRect(), r = n.getBoundingClientRect(); return { l: r.left - s.left, t: r.top - s.top, r: r.right - s.left, b: r.bottom - s.top, w: r.width, h: r.height }; };
    function flashNow(n) { n.classList.add("flash"); setTimeout(function () { n.classList.remove("flash"); }, 170); }
    /* With arrows, a pile's slip flashes when the arrow reaches it, so a flash asked for now waits to see whether an arrow is coming */
    F.flash = function (n) { if (F.quiet || !n) return; if (!keeps) { flashNow(n); return; } flashQ.push(n); linkSoon(); };
    F.route = function (src, dst, color) {
      if (keeps || F.quiet || reduce || inflight[color] || !dst || !dst.isConnected) return;
      var w = F.box(win), c = F.box(dst), sy = (w.t + w.b) / 2, ax, ay, bx, by, m, p;
      if (src && src.isConnected) { var s = F.box(src); sy = Math.max(w.t + 30, Math.min(w.b - 12, s.t + s.h / 2)); }
      if (c.r <= w.l + 4 || c.l >= w.r - 4) {
        ax = c.r <= w.l + 4 ? w.l : w.r; bx = c.r <= w.l + 4 ? c.r + 3 : c.l - 3; by = c.t + c.h / 2; m = (ax + bx) / 2;
        p = "M" + ax + " " + sy + " H " + m + " V " + by + " H " + bx;
      } else {
        ax = (w.l + w.r) / 2; ay = w.b; bx = c.l + c.w / 2; by = c.t - 3;
        m = (ay + by) / 2;
        p = "M" + ax + " " + ay + " V " + m + " H " + bx + " V " + by;
      }
      inflight[color] = true;
      pulse(F.fx, p, color, 480).then(function () { inflight[color] = false; });
    };
    F.ripple = function () {
      if (F.quiet || reduce) return;
      var c = el("circle", { cx: pp[0], cy: pp[1], r: 4, "class": "ripple" }, F.fx);
      tween(450, function (k) { c.setAttribute("r", 4 + k * 18); c.style.opacity = 1 - k; }).then(function () { c.remove(); });
    };
    F.setNote = function (cls, s) { F.note.className = "u-note" + (cls ? " " + cls : ""); F.note.textContent = s || ""; };
    /* A UI-state chip. It flashes when `id` changes, so typing doesn't flash "focus" on every key. */
    F.setU = function (k, v, id, src) {
      var u = F.u[k];
      if (!u || F.last[k] === v) return;
      var moved = F.last[k + "#"] !== id;
      F.last[k] = v; F.last[k + "#"] = id;
      u.querySelector("dd").textContent = v;
      if (moved) { F.flash(u); F.route(src, u, "ui"); }
    };
    F.cardsFor = function (items, at, src, extra) {
      F.cards.textContent = "";
      items.forEach(function (it, i) {
        var li = h("li", it.done ? "done" : null, null, F.cards);
        h("span", "d", null, li); h("span", "t", it.text === "" ? "(empty)" : it.text, li);
        if (extra) extra(li, it, i);
      });
      F.cards.style.setProperty("--rows", String(Math.max(1, Math.ceil(items.length / 2))));   /* on a phone the cards stand in two columns, read downwards */
      if (at != null && F.cards.children[at]) { F.flash(F.cards.children[at]); F.route(src, F.cards.children[at], "data"); }
    };
    F.headPulse = function (src) { F.flash(F.dataHead); F.route(src, F.dataHead, "data"); };
    /* Where card i stood before it was removed: the gap between the cards that are neighbours now. A link that
       points there. Stacked, the cards stand in two columns and there is no one gap, so it points at the pile's name. */
    F.gapAt = function (i) {
      return {
        to: function () { return stacked() || !F.cards.children.length ? F.dataHead : F.cards; },
        toY: function () { var c = F.cards.children, k = c.length; if (!k) return null; var b = F.box(c[Math.min(i, k - 1)]); return i < k ? b.t - 3 : b.b + 3; },
        dy: 0.01
      };
    };
    /* What just ran: a summary, then lines of [text, kind, tag, the tag's class, link]. A link says what the
       line touched, and becomes an arrow:
         { to: thing }                    this line edited that thing (a card, a slip, the window)
         { to: win, toY: row }            ...the window, at that row's height
         { to: win, comb: [rows] }        ...the window, once for each of those rows
         { from: thing, wide: 1 }         everything in that thing went into this line
         { from: thing, to: thing, wide } ...and everything came out again
         { miss: 1, to: thing }           a line that was left out: the arrow that didn't happen
       A thing is an element, a function that returns one, or (for a height) a number. Things are looked
       up when the arrows are drawn, after the machine has finished changing the page.
       `o.ev` is where in the window the event happened: an arrow runs from there to the summary. */
    /* More that `o` can say:
         o.sum2          the second panel's summary; a line whose sixth entry is 2 goes into that panel
         o.more          steps after the lines: [{ arrows: [...], run: fn }], for what isn't a line of code.
                         A step with `at: i` comes before line i instead, if there is one.
         o.fire          the figure's standing link runs as the last step (or `o.fire: "first"`, before the lines)
         o.cross         the link between the two panels runs, before the second panel's first line
         o.linkSub       the words under the link's name, for this run
         o.brief         for a figure that keeps a log: { name, note, run, once } for the one line this run leaves behind */
    /* The log (cfg.log). What ran last stands in full, with its arrows. When something else runs, it is left behind
       as one line under that: its name, and the piles its lines wrote. Newest first, so the oldest run off the bottom.
       Everything that runs gets its own entry, with one exception: a gesture that is still going on. Keys typed into
       one box, a drag, a scroll each call the same thing many times over, and `brief.run` names the gesture so that
       those calls count up on one entry (`once`: without showing the count). Nothing here knows about the script:
       the script and the reader's own hands reach the log through the same calls. */
    var cur = null;
    function logLine(e) {
      var li = document.createElement("li"); li.className = "lg";
      h("span", "lg-n", e.name, li);
      if (e.n > 1 && !e.once) h("span", "lg-x", "×" + e.n, li);
      var r = h("span", "lg-r", null, li);
      if (e.note) h("span", "lg-w", e.note, r);
      e.tags.forEach(function (t) { h("span", "lg-t " + t.cls, t.text, r); });
      F.hist.insertBefore(li, F.hist.firstChild);
      while (F.hist.children.length > 14) F.hist.removeChild(F.hist.lastChild);
      if (F.quiet || reduce) return;
      var d = li.getBoundingClientRect().height + 2;   /* it slides out from under what ran, and the older lines move down to make room */
      F.hist.style.transition = "none"; F.hist.style.transform = "translateY(" + (-d) + "px)";
      F.hist.getBoundingClientRect();
      F.hist.style.transition = "transform .24s ease"; F.hist.style.transform = "";
    }
    function logNote(sum, lines, o) {
      var b = o.brief || {}, e = { sig: sum + "|" + lines.map(function (L) { return L[0] + L[1]; }).join("|"), name: b.name || sum.replace(/:\s*$/, ""), note: b.note || "", once: !!b.once, run: b.run == null ? null : b.run, n: 1, blank: !lines.length, tags: [] };
      lines.forEach(function (L) { var c = L[1] + (L[3] ? " " + L[3] : ""); if (L[2] && !e.tags.some(function (t) { return t.text === L[2] && t.cls === c; })) e.tags.push({ text: L[2], cls: c }); });
      if (cur && !cur.blank && e.run != null && cur.run === e.run && cur.sig === e.sig) e.n = cur.n + 1;   /* the same gesture, still going */
      else if (cur && !cur.blank) logLine(cur);
      cur = e;
    }
    F.lines = function (sum, lines, o) {
      if (!F.mach) return;
      o = o || {};
      if (F.hist) logNote(sum || "", lines || [], o);
      F.sum.textContent = sum || "";
      if (F.hist && cur.n > 1 && !cur.once) h("span", "sum-x", "×" + cur.n, F.sum);   /* how many times over, so far */
      F.mach.textContent = "";
      if (F.mach2) { F.mach2.textContent = ""; F.sum2.textContent = o.sum2 || ""; }
      if (F.linkSub && o.linkSub != null) F.linkSub.textContent = o.linkSub;
      var els = (lines || []).map(function (L) { var p = h("p", "hline " + L[1], L[0], L[5] === 2 && F.mach2 ? F.mach2 : F.mach); if (L[2]) h("span", "htag" + (L[3] ? " " + L[3] : ""), L[2], p); return p; });
      if (keeps) {
        links = { sum: sum || "", lines: lines || [], els: els, ev: o.ev, more: o.more || [], fire: o.fire, cross: o.cross, quiet: F.quiet, fresh: true }; sparks = []; linkSoon();
        /* The panel keeps the height of the most it has held, so what sits under it on a phone never moves as lines come and go */
        var hgt = F.mach.offsetHeight; if (hgt > machFloor) { machFloor = hgt; F.mach.style.minHeight = hgt + "px"; }
        if (F.mach2) { hgt = F.mach2.offsetHeight; if (hgt > mach2Floor) { mach2Floor = hgt; F.mach2.style.minHeight = hgt + "px"; } }
      }
    };
    /* Arrows that don't belong to a line: [{ from, to, c, fromY, toY }]. They last until the next lines or the next spark. */
    F.spark = function (list) { if (!keeps) return; sparks = (list || []).filter(Boolean); sparkFresh = !F.quiet; linkSoon(); };
    F.relink = function () { if (keeps && !linkDue) drawLinks(true); };
    F.stacked = function () { return stacked(); };
    F.diskEl = hd;   /* the disk on the desktop, for the arrows from what is saved on quitting */
    F.running = function (on) { stage.classList.toggle("running", !!on); };   /* frames are being drawn: the arrow that never stops is moving */

    var machFloor = 0, mach2Floor = 0, links = null, sparks = [], sparkFresh = false, linkDue = false, linkGen = 0, lastSig = "", shown = {}, flying = {}, era = 0, pulses = null, drawn = null, flashQ = [], SLOWX = window.__twoPilesSlow || 1;
    function linkSoon() { if (linkDue) return; linkDue = true; Promise.resolve().then(function () { linkDue = false; drawLinks(false); }); }
    function res(x) { x = typeof x === "function" ? x() : x; return x && x.nodeType ? (x.isConnected ? x : null) : x; }
    function rect(x) {
      x = res(x);
      if (x == null || typeof x === "number") return null;
      var list = x.nodeType ? [x] : x.map(res).filter(function (v) { return v && v.nodeType; }), r = null;
      list.forEach(function (v) { var b = boxOf(v); if (!b.w && !b.h) return; r = r ? { l: Math.min(r.l, b.l), t: Math.min(r.t, b.t), r: Math.max(r.r, b.r), b: Math.max(r.b, b.b) } : { l: b.l, t: b.t, r: b.r, b: b.b }; });
      if (r) { r.cx = (r.l + r.r) / 2; r.cy = (r.t + r.b) / 2; r.h = r.b - r.t; r.el = list[0]; }
      return r;
    }
    /* A heading or a summary ends where its words end, not at the far side of its column, so an arrow reaches the words */
    function boxOf(v) {
      var b = F.box(v);
      if ((v.classList.contains("pile-h") || v.classList.contains("patch-sum")) && v.firstChild) {
        var g = document.createRange(); g.selectNodeContents(v);
        var r = g.getBoundingClientRect(), s = stage.getBoundingClientRect();
        if (r.width) b = { l: b.l, t: b.t, r: Math.min(b.r, r.right - s.left + 2), b: b.b, w: r.right - s.left + 2 - b.l, h: b.h };
      }
      return b;
    }
    function yOf(x, or) { x = res(x); if (x == null) return or; if (typeof x === "number") return x; var b = F.box(x); return b.t + b.h / 2; }
    function yAt(ref, or, a) { return yOf(ref, or) + (a.dy || 0); }   /* a height taken from something, nudged: under a label, say */
    function stacked() { return getComputedStyle(stage).gridTemplateColumns.trim().split(/\s+/).length < 3; }
    function cl(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    /* The way from one box to another, by right angles. Side by side, the arrow crosses the gutter between
       the columns. Stacked on a phone, it goes round by the margin. `lane` keeps arrows that share a gutter apart. */
    function way(a, s, t, lane) {
      var W = stage.clientWidth, big = function (r) { return r.h > 48; }, ya, yb;
      if (stacked()) {
        var m, lf;
        if (t.b <= s.t + 4) {            /* up: round by a margin and in at the side. Everything goes up the left, edits up the right. */
          yb = a.toY != null ? cl(yOf(a.toY, t.cy), t.t + 8, t.b - 8) : t.cy;
          /* A wide arrow keeps the outermost track of its margin; thin ones take the tracks inside it, one each */
          if (a.side === "l") { m = a.wide ? 5 : 11 + lane("ml") * 5; return [[s.l - 2, s.cy], [m, s.cy], [m, yb], [t.l - 3, yb]]; }
          m = a.wide ? W - 5 : W - 11 - lane("mr") * 5; return [[s.r + 2, s.cy], [m, s.cy], [m, yb], [t.r + 3, yb]];
        }
        if (t.t >= s.b - 4) {            /* down: by the margin on the target's side */
          lf = a.side ? a.side === "l" : t.cx < W / 2; m = lf ? (a.wide ? 5 : 11 + lane("ml") * 5) : (a.wide ? W - 5 : W - 11 - lane("mr") * 5);
          ya = a.fromY != null ? cl(yOf(a.fromY, s.cy), s.t + 8, s.b - 8) : s.cy;
          return lf ? [[s.l - 2, ya], [m, ya], [m, t.cy], [t.l - 3, t.cy]] : [[s.r + 2, ya], [m, ya], [m, t.cy], [t.r + 3, t.cy]];
        }
        return null;
      }
      var right = t.l >= s.r - 4, left = t.r <= s.l + 4;
      if (right || left) {
        var dir = right ? 1 : -1, x0 = right ? s.r + 2 : s.l - 2, x1 = right ? t.l - 3 : t.r + 3;
        ya = a.fromY != null ? cl(yAt(a.fromY, s.cy, a), s.t + 8, s.b - 8) : big(s) ? cl(a.toY != null ? yAt(a.toY, t.cy, a) : t.cy, s.t + 10, s.b - 10) : s.cy;
        yb = a.toY != null ? cl(yAt(a.toY, t.cy, a) + (t.el === win && !a.dy ? 5 : 0), t.t + 8, t.b - 8) : big(t) ? cl(ya, t.t + 10, t.b - 10) : t.cy;
        /* The turn is made just outside the source, or (`near`) just outside the target, where that is the clearer gutter */
        var jx = a.near ? x1 - dir * (9 + lane((right ? "R" : "L") + "n") * 7) : x0 + dir * (17 + lane((right ? "R" : "L") + (yb < ya ? "u" : "d")) * 7);
        if (!a.near && (x1 - jx) * dir < 9) jx = (x0 + x1) / 2;
        return Math.abs(ya - yb) < 1.5 ? [[x0, ya], [x1, ya]] : [[x0, ya], [jx, ya], [jx, yb], [x1, yb]];
      }
      /* Above or below in the same column: out by the side, along the column's own margin, and in at the side.
         That way an arrow to one card, or to one row of the window, never crosses the others. */
      var cell = t.el && t.el.closest ? t.el.closest(".pile, .app") : null, cb = cell ? F.box(cell) : { l: t.l - 24, r: t.r + 24 };
      yb = a.toY != null ? cl(yAt(a.toY, t.cy, a) + (t.el === win && !a.dy ? 5 : 0), t.t + 8, t.b - 8) : t.cy;
      if (a.side === "r") { var mr = Math.min(cb.r - 5, Math.max(t.r, s.r) + 10 + lane("c" + Math.round(cb.l) + "r", a.wide) * 6); return [[s.r + 2, s.cy], [mr, s.cy], [mr, yb], [t.r + 3, yb]]; }
      var ml = Math.max(cb.l + 5, Math.min(t.l, s.l) - 10 - lane("c" + Math.round(cb.l) + "l", a.wide) * 6);
      return [[s.l - 2, s.cy], [ml, s.cy], [ml, yb], [t.l - 3, yb]];
    }
    function pathOf(pts) { return "M" + pts.map(function (p) { return (Math.round(p[0]) + .5) + " " + (Math.round(p[1]) + .5); }).join(" L"); }
    /* One arrow: a line that stops short of its end, and a head on the end */
    function shaft(g, pts, wide) {
      var n = pts.length, a = pts[n - 2], b = pts[n - 1], dx = Math.sign(Math.round(b[0] - a[0])), dy = Math.sign(Math.round(b[1] - a[1])), hl = wide ? 9 : 6, hw = wide ? 7 : 3.5;
      var base = [b[0] - dx * hl, b[1] - dy * hl], body = pts.slice(0, n - 1).concat([base]);
      el("path", { d: pathOf(body), "class": "al" }, g);
      el("path", { d: pathOf([b, [base[0] - dy * hw, base[1] + dx * hw], [base[0] + dy * hw, base[1] - dx * hw]]) + " Z", "class": "ah" }, g);
      return pathOf(body);
    }
    /* Draw every arrow, and show what has just run.
       The lines and arrows of a run show one after another: a line appears as its turn comes, a square runs along
       its arrow, the arrow is drawn behind it, and what it reaches lights up. That walk is a chain (below).
       Input can come faster than a chain can finish: typing, a drag, a scroll. So nothing here starts over.
       What has been shown stays shown (`shown`, by step) for as long as runs with the same lines keep coming, however
       often the page is redrawn under it. Every run starts a chain of its own, and a chain that finds its step already
       showing only sends the square. A run with different lines begins again from nothing (a new `era`), and the
       chains before it stop where they are. */
    function drawLinks(again) {
      var gen = ++linkGen, spec = links, steps = [], lanes = {};
      var fresh = !again && !!spec && spec.fresh, moving = !reduce && !!spec && !spec.quiet;
      var sig = spec ? (spec.sum + "|" + spec.lines.map(function (L) { return L[0] + L[1]; }).join("|")).replace(/“[^”]*”|\d+/g, "") : "";   /* the same lines with other values in them (another row, another column, another letter) count as the same */
      if (spec) spec.fresh = false;
      if (fresh && (sig !== lastSig || !moving)) { era++; shown = {}; flying = {}; if (pulses) pulses.textContent = ""; }
      if (fresh) lastSig = sig;
      function has(key) { return !moving || !!shown[key]; }
      var sparking = !again && !reduce && sparkFresh; sparkFresh = false;
      if (!pulses) pulses = el("g", null, ax);   /* the squares on their way: they outlast a redraw */
      ax.textContent = "";
      var g0 = el("g", null, ax); ax.appendChild(pulses);
      function lane(key, wide) { var k = lanes[key] || 0; lanes[key] = k + (wide ? 2 : 1); return wide ? k + 0.5 : k; }   /* arrows that share a gutter or a margin each get their own track, and a wide one takes two */
      function make(a) {   /* an arrow's drawing, or nothing if either end isn't on the page */
        if (a.pts) {   /* a way given point by point, for an arrow that has to go round something */
          var pp = typeof a.pts === "function" ? a.pts() : a.pts;
          if (!pp || pp.length < 2) return null;
          var gp = el("g", { "class": "ax c-" + (a.c || "ink") + (a.wide ? " wide" : "") + (a.ghost ? " ghost" : "") }, g0), op = { g: gp, traces: [], miss: !!a.ghost, wide: !!a.wide, c: a.c || "ink", hit: [], then: a.then };
          if (a.wide) g0.insertBefore(gp, g0.firstChild);
          op.traces.push(shaft(gp, pp, a.wide));
          return op;
        }
        var s = rect(a.from), t = rect(a.to);
        if (!s || !t) return null;
        if (a.pair) {   /* two rows that were compared: a line from one to the other, with = on it where they are the same and ≠ where they are not */
          var gq = el("g", { "class": "ax pair " + a.pair }, g0), px0 = Math.round(s.r) + 3, px1 = Math.round(t.l) - 3, py0 = Math.round(s.cy), py1 = Math.round(t.cy), mx = Math.round((px0 + px1) / 2), my = Math.round((py0 + py1) / 2);
          el("path", { d: "M" + px0 + " " + (py0 + .5) + " L" + px1 + " " + (py1 + .5), "class": "al" }, gq);
          el("rect", { x: mx - 7.5, y: my - 5.5, width: 15, height: 12, "class": "pbg" }, gq);
          el("path", { d: "M" + (mx - 4.5) + " " + (my - 1.5) + " h9 M" + (mx - 4.5) + " " + (my + 2.5) + " h9" + (a.pair === "diff" ? " M" + (mx + 2.5) + " " + (my - 5) + " l-5 11" : ""), "class": "ps" }, gq);
          return { g: gq, traces: [], miss: true, hit: [] };
        }
        var g = el("g", { "class": "ax c-" + (a.c || "ink") + (a.wide ? " wide" : "") + (a.miss ? " miss" : "") + (a.run ? " run" : "") + (a.ghost ? " ghost" : "") }, g0), out = { g: g, traces: [], miss: !!a.miss || !!a.ghost, wide: !!a.wide, c: a.c || "ink", hit: [], then: a.then };
        if (a.comb) {   /* one trunk, and a tooth for each row it reaches */
          var clip = rect(a.clip) || t, ys = [], seen = {};
          a.comb.forEach(function (r) { var y = Math.round(cl(yOf(r, t.cy), clip.t + 7, clip.b - 7)); if (!seen[y]) { seen[y] = 1; ys.push(y); } var e = res(r); if (e && e.nodeType) out.hit.push(e); });
          if (!ys.length) ys = [Math.round(t.cy)];
          ys.sort(function (p, q) { return p - q; });
          var first = way({ toY: ys[0] }, s, t, lane), k = first.length, jx = first[k - 2][0], x1 = first[k - 1][0];
          out.traces.push(shaft(g, first, false));
          ys.slice(1).forEach(function (y) { out.traces.push(shaft(g, [[jx, ys[0]], [jx, y], [x1, y]], false)); });
          return out;
        }
        var pts = way(a, s, t, lane);
        if (!pts) { g.remove(); return null; }
        if (a.wide) g0.insertBefore(g, g0.firstChild);   /* a thin arrow that crosses a wide one passes over it */
        out.traces.push(shaft(g, pts, a.wide));
        if (a.run) el("path", { d: out.traces[0], "class": "am" }, g);
        if (t.el && t.el !== win) out.hit.push(t.el);
        return out;
      }
      function crossArrow(ghost) { return { from: F.mach, to: F.mach2, fromY: F.crossLabel, toY: F.crossLabel, dy: cfg.cross.dy || 22, c: "scr", ghost: ghost }; }   /* level, beside its name */
      /* What else the derivative reads (`cfg.cross.feed`): the state as it stood before the change. Out of the state's edge, down the channel, into the link. */
      function crossFeed(ghost) {
        return { c: "scr", ghost: ghost, pts: function () {
          var p = F.box(F.ustate.closest(".pile")), lb = F.box(F.crossLabel), x = Math.round(lb.l + lb.w / 2), y = Math.round(lb.t + lb.h / 2 + (cfg.cross.dy || 22));
          return [[p.r + 2, p.b - 30], [x, p.b - 30], [x, y - 5]];
        } };
      }
      function colour(kind) { return kind === "data" ? "data" : kind === "view" ? "scr" : kind === "ui" ? "ui" : kind === "missing" ? "bad" : "ink"; }
      if (spec) {
        if (spec.ev != null) steps.push({ key: "S", line: F.sum, arrows: [make({ from: win, to: F.sum, fromY: function () { return yOf(spec.ev, null) - 7; }, side: "l", c: "ink" })] });
        else steps.push({ key: "S", line: F.sum, arrows: [] });
        var crossed = !F.sum2, crossing = function () {   /* from the first panel to the second: its summary shows, and the link between them runs if this run fired it */
          if (crossed) return; crossed = true;
          steps.push({ key: "X", line: F.sum2, arrows: cfg.cross && spec.cross ? (stacked() ? [{ from: F.mach, to: F.sum2, c: "scr", side: "l" }] : [crossArrow(false)].concat(cfg.cross.feed ? [crossFeed(false)] : [])).map(make) : [] });
        };
        /* Arrows given as a function are worked out when their step is reached, not before: by then whatever was still moving when the run began has come to rest */
        var mores = spec.more.slice(), moreStep = function (m) { var key = "M" + spec.more.indexOf(m), fn = typeof m.arrows === "function" ? m.arrows : null, later = fn && !has(key + "!"); steps.push({ key: key, line: null, arrows: later ? [] : (fn ? fn() : m.arrows || []).map(make), lazy: later ? fn : null, run: m.run, gap: m.gap }); };
        spec.lines.forEach(function (L, i) {
          mores = mores.filter(function (m) { if (m.at == null || m.at > i) return true; moreStep(m); return false; });
          if (L[5] === 2) crossing();
          var k = L[4], line = spec.els[i], c = k && k.c ? k.c : colour(L[1]), st = { key: "L" + i, line: line, arrows: [] };
          if (k && k.from) st.arrows.push(make({ from: k.from, to: line, c: c, wide: k.wide, run: k.run, side: "l" }));
          steps.push(st);
          if (k && k.to) (k.from ? steps[steps.push({ key: "T" + i, line: null, arrows: [] }) - 1] : st).arrows.push(make({ from: line, to: k.to, toY: k.toY, comb: k.comb, clip: k.clip, c: c, wide: k.wide, miss: k.miss, run: k.run, then: k.then, side: k.side, near: k.near, dy: k.dy }));
        });
      }
      if (spec) { crossing(); mores.forEach(moreStep); }
      if (cfg.cross) {   /* the link between the panels: dormant unless this run fired it */
        var xon = !!(spec && spec.cross);
        F.crossLabel.classList.toggle("on", xon);
        if (!xon && !stacked()) { make(crossArrow(true)); if (cfg.cross.feed) make(crossFeed(true)); }
      }
      /* The standing link across the middle: dormant (a dashed outline) until a run fires it. On a phone it goes by way of its label. */
      if (cfg.link) {
        /* Side by side, it leaves from the edge of the cells that hold what goes in. Stacked, from the things themselves. */
        var srcs = [].concat(cfg.link.from(F)), lk = { from: stacked() ? srcs : srcs.map(function (e) { return e.closest(".pile") || e; }), to: win, wide: 1, c: "scr" }, fired = spec && spec.fire, parts;
        if (stacked()) parts = fired ? [{ from: lk.from, to: F.linkLabel, wide: 1, c: "scr", side: "l" }, { from: F.linkLabel, to: win, wide: 1, c: "scr" }] : [];
        else { lk.fromY = F.linkLabel; lk.toY = F.linkLabel; lk.dy = cfg.link.dy || 21; lk.ghost = !fired; parts = [lk]; }
        if (F.linkLabel) F.linkLabel.classList.toggle("on", !!fired);
        if (fired) { var ls = { key: "F", line: null, arrows: parts.map(make) }; if (spec.fire === "first") steps.splice(1, 0, ls); else steps.push(ls); }
        else parts.forEach(make);
      }
      var extra = sparks.map(function (a) { return make(a); }).filter(Boolean);
      /* What isn't showing yet waits for a chain to reach it. What is showing has happened: its `then` and `run` are called here. */
      function dress(st) {
        var done = has(st.key + "!");
        st.arrows = st.arrows.filter(Boolean);
        st.arrows.forEach(function (a, j) { a.key = st.key + "#" + j; if (done || has(a.key)) { if (a.then) a.then(); } else a.g.classList.add("wait"); });
      }
      steps.forEach(function (st) {
        dress(st);
        if (st.line) st.line.classList.toggle("wait", !has(st.key));
        if (st.run && has(st.key + "!")) st.run(false);
        if (!moving) { shown[st.key] = shown[st.key + "!"] = 1; st.arrows.forEach(function (a) { shown[a.key] = 1; }); }   /* put there without being walked through: a run with the same lines after it has nothing to bring in */
      });
      /* Flashes that were asked for: an arrow on its way will light its own target when it lands. The others go now. */
      var coming = [];
      if (fresh && moving) steps.forEach(function (st) { st.arrows.forEach(function (a) { coming = coming.concat(a.hit); }); });
      if (sparking) extra.forEach(function (a) { coming = coming.concat(a.hit); });
      flashQ.splice(0).forEach(function (n) { if (n.isConnected && !coming.some(function (t) { return t === n || t.contains(n) || n.contains(t); })) flashNow(n); });
      drawn = { era: era, steps: steps, make: make, dress: dress, moving: moving };
      if (fresh && moving) chain();
      extra.forEach(function (a, j) { a.key = "K" + gen + "#" + j; if (!sparking) return; a.g.classList.add("wait"); if (a.miss || !a.traces.length) show(a); else send(a); });
    }
    /* One run, shown a step at a time. It works on the page as it is drawn when each step comes round, since the
       page may have been redrawn while a square was on its way. */
    function chain() {
      var mine = era, i = 0;
      function at(k) { return drawn && drawn.moving && drawn.era === mine && root.isConnected ? drawn.steps[k] : null; }
      function ready(st) { if (st.lazy) { st.arrows = st.lazy().map(drawn.make); st.lazy = null; drawn.dress(st); } return st; }
      (function next() {
        var k = i++, st = at(k);
        if (!st) return;
        ready(st);
        if (st.line) st.line.classList.remove("wait");
        shown[st.key] = 1;
        var movers = st.arrows.filter(function (a) { if (a.miss || !a.traces.length) { show(a); return false; } return true; });
        var land = function () {
          var now = at(k);
          if (!now) return;
          ready(now).arrows.forEach(show);
          if (!shown[now.key + "!"]) { shown[now.key + "!"] = 1; if (now.run) now.run(true); }
          next();
        };
        if (movers.length) Promise.all(movers.map(send)).then(land);
        else setTimeout(land, (st.gap != null ? st.gap : k === 0 ? 0 : 60) * SLOWX);
      })();
    }
    function show(a) { if (shown[a.key]) return; shown[a.key] = 1; a.g.classList.remove("wait"); if (a.then) a.then(); }
    /* A square runs along an arrow, drawing it if it isn't drawn yet. One square at a time on any one arrow: a run
       that comes while one is on its way waits for that one, so a burst of input reads as steady traffic. */
    function send(a) {
      return Promise.all(a.traces.map(function (d) {
        if (flying[d]) return flying[d];
        var mine = era, p = el("path", { d: d, "class": "az" + (a.wide ? " wide" : "") }, pulses), L = p.getTotalLength(), dot = a.wide ? null : el("rect", { width: 7, height: 7 }, pulses);
        p.style.stroke = "var(--" + a.c + ")"; p.style.strokeDasharray = L + " " + L; p.style.strokeDashoffset = L;
        if (dot) dot.style.fill = "var(--" + a.c + ")";
        return flying[d] = tween(Math.max(140, Math.min(300, 90 + L * 0.9)) * SLOWX, function (u) {
          if (!p.isConnected) return;
          if (dot) { var q = p.getPointAtLength(L * u); dot.setAttribute("x", q.x - 3.5); dot.setAttribute("y", q.y - 3.5); }
          p.style.strokeDashoffset = L * (1 - u);
        }).then(function () { if (dot) dot.remove(); p.remove(); if (mine === era) delete flying[d]; });
      })).then(function () { if (a.g.isConnected) show(a); a.hit.forEach(function (n) { if (n.isConnected) flashNow(n); }); });
    }
    F.cardsOff = function () { F.cards.textContent = ""; };
    F.resetPanels = function () {
      F.last = {}; F.setNote("", "");
      sparks = []; sparkFresh = false; flashQ.length = 0;
      each(F.ustate.querySelectorAll(".u"), function (u) { u.classList.remove("bad", "flash"); });
      if (F.hist) { F.hist.textContent = ""; F.hist.style.transition = "none"; F.hist.style.transform = ""; cur = null; }
    };

    /* Quitting and relaunching. The close box quits: the machine saves what it can to disk and the
       window goes. The icon on the desktop starts the app again from whatever was saved. */
    F.closed = false; F.disk = null;
    var floor = 0;   /* the height the figure has reserved; see fit() */
    function setClosed(on) {
      F.closed = on; desk.classList.toggle("closed", on); stage.classList.toggle("quit", on);
      if (!on) { desk.style.minHeight = ""; stage.style.minHeight = floor ? floor + "px" : ""; }
      icon.tabIndex = on ? 0 : -1; dk.tabIndex = on ? 0 : -1; closeBox.tabIndex = on ? -1 : 0;
    }

    /* How quitting and launching look. The state changes at once, as it always has, and the motion is
       played over it with copies, all of it together: outlines that glide between the window and its icon
       (after the old Mac's zooming rectangles; the window itself just goes or appears), and app state
       flying into the disk or out of it. UI state dissolves, unless the app saves it: then it flies to
       the disk as well. Anything that interrupts just clears the copies. */
    var fxT = [], SLOW = window.__twoPilesSlow || 1, FX = 360;
    function later(ms, fn) { fxT.push(setTimeout(fn, ms * SLOW)); }
    function fxClear() {
      fxT.forEach(clearTimeout); fxT = [];
      over.textContent = "";
      each(zl.querySelectorAll(".zoom"), function (g) { g.remove(); });
      desk.classList.remove("opening");
      hd.classList.remove("filling", "busy");
      each(F.cards.children, function (li) { li.style.visibility = ""; });
      each(F.ustate.children, function (u) { if (u._fade) { u._fade.cancel(); u._fade = null; } u.classList.remove("dots"); u.style.visibility = ""; });
    }
    function showFx() { return !F.quiet && !reduce && !!over.animate; }
    /* A copy of a slip for show: it keeps what its number boxes say, and can't be typed in or tabbed to */
    function copy(n) {
      var c = n.cloneNode(true), a = n.querySelectorAll("input"), b = c.querySelectorAll("input");
      each(b, function (inp, i) { inp.setAttribute("value", a[i].value); inp.value = a[i].value; inp.removeAttribute("id"); inp.tabIndex = -1; inp.readOnly = true; });
      c.classList.remove("flash"); c.style.visibility = "";
      return c;
    }
    function slips(list) { return Array.prototype.filter.call(list, function (n) { return !n.classList.contains("empty"); }); }   /* a note in a pile isn't state */
    function copies(list) { return slips(list).map(function (n) { return { box: F.box(n), node: copy(n) }; }); }
    function put(c, cls) {   /* a copy, laid exactly over the slip it was made from */
      var holder = over.querySelector("." + cls) || h(cls === "cards" ? "ol" : "div", cls, null, over), st = c.node.style;
      st.left = c.box.l + "px"; st.top = c.box.t + "px"; st.width = c.box.w + "px"; st.height = c.box.h + "px";
      c.node.classList.remove("flash");
      holder.appendChild(c.node);
      return c.node;
    }
    /* A slip shrinks into the disk, or grows out of it */
    function fly(node, from, to, ms, out) {
      var dx = to.l + to.w / 2 - (from.l + from.w / 2), dy = to.t + to.h / 2 - (from.t + from.h / 2);
      var small = "translate(" + dx + "px, " + dy + "px) scale(" + Math.min(1, 16 / from.w) + ", " + Math.min(1, 7 / from.h) + ")";
      node.animate(out ? [{ transform: small, opacity: 0 }, { opacity: 1, offset: 0.3 }, { transform: "none", opacity: 1 }]
                       : [{ transform: "none", opacity: 1 }, { opacity: 1, offset: 0.7 }, { transform: small, opacity: 0 }],
        { duration: ms * SLOW, easing: out ? "cubic-bezier(.2, .7, .3, 1)" : "cubic-bezier(.6, 0, .8, .4)", fill: "both" });
    }
    /* Three outlines glide from one rectangle to another, each a little behind the last. They are drawn on
       the desktop, so a window that appears covers whichever of them haven't arrived yet. */
    var LAG = 0.14;
    function zoom(a, b, ms) {
      var g = el("g", { "class": "zoom" }, zl), d = F.box(desk), ox = d.l + desk.clientLeft, oy = d.t + desk.clientTop;
      var rs = [1, 0.5, 0.25].map(function (o) { var r = el("rect", null, g); r.style.opacity = o; return r; });
      function mix(p, q, k) { return p + (q - p) * k; }
      tween(ms * SLOW, function (u) {
        rs.forEach(function (r, i) {
          var k = ease(Math.max(0, Math.min(1, u * (1 + LAG * 2) - LAG * i)));
          r.setAttribute("x", mix(a.l, b.l, k) - ox + 0.5); r.setAttribute("y", mix(a.t, b.t, k) - oy + 0.5);
          r.setAttribute("width", Math.max(1, mix(a.w, b.w, k) - 1)); r.setAttribute("height", Math.max(1, mix(a.h, b.h, k) - 1));
        });
      }, function (t) { return t; }).then(function () { g.remove(); });
    }
    /* A slip dissolves into dots and is gone, or forms out of them */
    function fade(node, ms, wait, gone) {
      var full = { opacity: 1, "--dot": "3px" }, none = { opacity: 0, "--dot": "0px" }, o = { duration: ms * SLOW, delay: wait * SLOW, easing: "ease-in-out", fill: "both" }, an;
      node.classList.add("dots");
      try { an = node.animate(gone ? [full, none] : [none, full], o); }
      catch (e) { an = node.animate(gone ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 0 }, { opacity: 1 }], o); }
      node._fade = an;
      an.onfinish = function () { if (gone) node.remove(); else { node.classList.remove("dots"); an.cancel(); node._fade = null; } };
    }
    function playQuit(was, kept) {
      var to = F.box(hd);
      hd.classList.add("filling", "busy");
      zoom(was.win, F.box(icon.firstChild), FX);
      was.chips.forEach(function (c) {
        if (kept) fly(put(c, "fx-chips"), c.box, to, FX);   /* saved, like the app state */
        else fade(put(c, "fx-chips"), FX - 40, 0, true);    /* gone with the window that held it */
      });
      was.cards.forEach(function (c) { fly(put(c, "cards"), c.box, to, FX); });
      later(FX * 0.6, function () { hd.classList.remove("filling"); });
      later(FX + 60, function () { over.textContent = ""; hd.classList.remove("busy"); });
    }
    function playLaunch(kept) {
      var from = F.box(hd);
      function out(n, cls) { var c = { box: F.box(n), node: copy(n) }; n.style.visibility = "hidden"; fly(put(c, cls), c.box, from, FX, true); }
      desk.classList.add("opening"); hd.classList.add("busy");
      each(F.cards.children, function (li) { out(li, "cards"); });
      slips(F.ustate.children).forEach(function (u) {
        if (kept) out(u, "fx-chips");         /* back from the disk, as it was */
        else fade(u, FX - 100, 100, false);   /* a new set, with nothing in it yet */
      });
      zoom(F.box(icon.firstChild), F.box(win), FX);
      later(FX / (1 + LAG * 2), function () { desk.classList.remove("opening"); });   /* the window is there the moment the first outline reaches its frame */
      later(FX + 20, function () {
        over.textContent = ""; hd.classList.remove("busy");
        each(F.cards.children, function (li) { li.style.visibility = ""; }); each(F.ustate.children, function (u) { u.style.visibility = ""; });
      });
    }
    /* Click the disk and what's saved on it comes out for a look, then goes back: app state, and UI state
       only if the app saved it */
    function peek() {
      if (!F.closed) return;
      var up = over.querySelector(".peek"), sv = F.saved;
      if (up) { up._back(); return; }
      if (!sv || !(sv.cards.length + sv.chips.length)) { hd.classList.add("busy"); later(260, function () { hd.classList.remove("busy"); }); return; }
      var d = F.box(hd), x = d.r + 16, y = d.t - 1, box = h("div", "peek", null, over), still = reduce || !box.animate, done = false;
      var list = h("ol", "cards", null, box); sv.cards.forEach(function (n) { list.appendChild(copy(n)); });
      if (sv.chips.length) { var cl = h("div", "fx-chips", null, box); sv.chips.forEach(function (n) { cl.appendChild(copy(n)); }); }
      box.style.left = x + "px"; box.style.top = y + "px"; box.style.width = (F.cards.clientWidth || 220) + "px";
      var out = "scale(0.6)", inside = "translate(" + (d.l + d.w / 2 - x) + "px, " + (d.t + d.h / 2 - y) + "px) scale(0.04)";
      hd.classList.add("busy");
      if (still) box.style.transform = out;
      else box.animate([{ transform: inside, opacity: 0 }, { opacity: 1, offset: 0.4 }, { transform: out, opacity: 1 }], { duration: 260 * SLOW, easing: "cubic-bezier(.2, .7, .3, 1)", fill: "both" });
      box._back = function () {
        if (done) return;
        done = true; hd.classList.remove("busy");
        if (still) { box.remove(); return; }
        box.animate([{ transform: out, opacity: 1 }, { opacity: 1, offset: 0.6 }, { transform: inside, opacity: 0 }], { duration: 220 * SLOW, easing: "cubic-bezier(.6, 0, .8, .4)", fill: "both" }).onfinish = function () { box.remove(); };
      };
      later(1900, box._back);
    }
    dk.addEventListener("click", peek);
    /* The machine does its part without the usual pulses: this motion says it instead */
    function hush(fn) { var q = F.quiet; F.quiet = true; try { return fn(); } finally { F.quiet = q; } }

    F.quit = function () {
      if (F.closed) return;
      fxClear();
      var tall = desk.getBoundingClientRect().height, all = stage.getBoundingClientRect().height;   /* the figure keeps its size when the window goes, so nothing below it jumps */
      var was = showFx() ? { win: F.box(win), cards: copies(F.cards.children), chips: copies(F.ustate.children) } : null;
      var sv = { cards: slips(F.cards.children).map(copy), chips: slips(F.ustate.children).map(copy) };
      /* What an item carries that isn't saved (its caret, in Puri) doesn't go to the disk with it */
      (was ? was.cards.map(function (c) { return c.node; }) : []).concat(sv.cards).forEach(function (nd) { each(nd.querySelectorAll(".cu"), function (x) { x.remove(); }); });
      F.disk = hush(function () { return F.m.quit(); });   /* the machine says what it saved: { data, ui: whether UI state went too } */
      if (!F.disk.ui) sv.chips = [];
      F.saved = sv;   /* the slips as they went to disk, for anyone who looks */
      hd.classList.add("full"); hd.classList.toggle("ui", !!F.disk.ui);
      setClosed(true);
      desk.style.minHeight = Math.max(tall, 250) + "px";
      stage.style.minHeight = Math.max(all, floor) + "px";
      if (was) playQuit(was, !!F.disk.ui);
    };
    F.launch = function () {
      if (!F.closed) return;
      fxClear();
      var show = showFx();
      setClosed(false);
      hush(function () { F.m.launch(F.disk); });
      if (show) playLaunch(!!F.disk.ui);
    };
    closeBox.addEventListener("click", function () { F.quit(); if (document.activeElement === closeBox) icon.focus({ preventScroll: true }); });
    icon.addEventListener("click", function () { F.launch(); if (document.activeElement === icon) closeBox.focus({ preventScroll: true }); });
    F.pt = {
      close: function () { var b = F.box(closeBox); return [b.l + b.w / 2 + 1, b.t + b.h / 2 + 3]; },
      icon: function () { var b = F.box(icon); return [b.l + b.w / 2 + 2, b.t + 22]; }
    };
    /* Where the script's pointer waits while the app is closed: off the icons, so they can be seen */
    F.pt.aside = function () { var b = F.box(icon); return [b.r + 52, b.t - 4]; };

    /* The script player */
    var S = null, wps = null, raf = 0, dragging = false, ticks = [];
    function hot(i) {
      closeBox.classList.toggle("hot", i === "close"); icon.classList.toggle("hot", i === "icon");
      if (F.m.hot) F.m.hot(typeof i === "number" ? i : -1);
    }
    function setOff(on) { F.off = on; sb.classList.toggle("off", on); if (F.m.setScripted) F.m.setScripted(!on); }
    function goOff() {
      if (F.off) return;
      stop(); setOff(true); hot(-1); drawScrub(); placePointer(); caption();
    }
    function placePointer() {
      var on = !F.off && F.t > 0 && F.t < S.end;
      F.ptr.style.opacity = on ? 1 : 0;
      if (!on) { if (!F.off) hot(-1); return; }
      var W = wps || (wps = S.way()), i = 1;
      while (i < W.length - 1 && F.t > W[i][0]) i++;
      var a = W[i - 1], b = W[i], u = b[0] === a[0] ? 1 : Math.max(0, Math.min(1, (F.t - a[0]) / (b[0] - a[0])));
      u = ease(u);
      pp = [a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
      F.ptr.style.transform = "translate(" + pp[0] + "px, " + pp[1] + "px)";
      hot(S.hot ? S.hot(F.t) : -1);
    }
    function drawScrub() {
      var p = 100 * F.t / S.end;
      fill.style.width = p + "%"; thumb.style.left = p + "%";
      track.setAttribute("aria-valuenow", String(Math.round(p)));
      ticks.forEach(function (k, i) { k.classList.toggle("past", !F.off && F.t >= S.stops[i]); });
      var fresh = !F.off && !F.playing && F.t <= 0;   /* already at the start, untouched: nothing for the reset button to do */
      rst.classList.toggle("idle", fresh); rst.setAttribute("aria-disabled", fresh ? "true" : "false");
    }
    function caption() {
      var c;
      if (F.off) c = ["Your turn", cfg.turn || TURN];
      else if (F.t <= 0 && !F.playing) c = ["Watch or try", "Press play to watch, drag the slider to step through, or just use the app."];
      else c = S.caption(F.t);
      if (capKey === c[0] + c[1]) return;
      capShow(c);
      capKey = c[0] + c[1];
      track.setAttribute("aria-valuetext", c[0] + ": " + c[1]);
    }
    function capShow(c) { capKey = null; cap.textContent = ""; h("b", null, c[0], cap); cap.appendChild(document.createTextNode(c[1])); }
    /* The figure reserves the height of its tallest moment, and its caption the height of its longest
       text, so nothing under them moves while the script plays or while you drag the slider. fit() finds
       both with one quiet run through the script, with the figure inert so the run can't take the keyboard
       focus from wherever the reader has it. It runs in a spare moment after the fonts arrive, or just
       before the script first moves, whichever comes first. Choosing a switch setting that needs more
       room adds it then. Neither ever shrinks. */
    var needFit = true, ready = false, lastW = 0, fitT = 0, capFloor = 0;
    function hold() {
      if (F.off) return;
      var hgt = stage.getBoundingClientRect().height;
      if (hgt > floor + 0.5) { floor = Math.ceil(hgt); stage.style.minHeight = floor + "px"; }
    }
    function capHold() {
      var hgt = cap.getBoundingClientRect().height;
      if (hgt > capFloor + 0.5) { capFloor = Math.ceil(hgt); cap.style.minHeight = capFloor + "px"; }
    }
    function sweep() {
      function note(at) {
        if (F.m.flush) F.m.flush();
        capShow(S.caption(at));
        hold(); capHold();
        if (F.m.settle) { F.m.settle(); hold(); }   /* and as it looks once it has sat there a while */
      }
      stage.inert = true; F.quiet = true; F.busy = true;
      fxClear(); setClosed(false); F.disk = null; F.saved = null;
      F.m.reset();
      note(1);
      S.acts.forEach(function (a, i) {
        var next = S.acts[i + 1], at = a.t1 == null ? a.t : a.t1;
        if (a.t1 == null) a.f(); else a.f(1);
        if (next && (next.t1 == null ? next.t : next.t0) - at <= 200) return;   /* a burst of typing counts once */
        note(at);
      });
      F.quiet = false; F.busy = false; stage.inert = false;
    }
    function fit() {
      needFit = false;
      floor = 0; stage.style.minHeight = ""; capFloor = 0; cap.style.minHeight = "";
      capShow(["Your turn", cfg.turn || TURN]); capHold();
      sweep();
    }
    function grow() { if (!needFit) sweep(); }   /* room for the setting just chosen; a pending fit() will cover it anyway */
    /* Any moment of the script can be rebuilt from scratch, which is what lets the slider scrub. */
    function seek(nt) {
      if (needFit && ready) fit();
      F.quiet = true; F.busy = true;
      fxClear(); setClosed(false); F.disk = null; F.saved = null;
      F.m.reset();
      wps = S.way();
      S.acts.forEach(function (a) {
        if (a.t1 == null) { if (a.t <= nt) a.f(); }
        else if (nt >= a.t1) a.f(1);
        else if (nt > a.t0) a.f(ease((nt - a.t0) / (a.t1 - a.t0)));
      });
      if (F.m.flush) F.m.flush();
      F.quiet = false; F.busy = false;
      hold();
      F.t = nt; drawScrub(); placePointer(); caption();
    }
    function stop() {
      F.playing = false; cancelAnimationFrame(raf);
      btn.classList.remove("playing");
      btn.setAttribute("aria-label", F.t >= S.end ? "Replay the example" : "Play the example");
    }
    /* Play from one moment of the script up to another: by default from where it stands (or from the start, if it has ended) to the end. */
    function play(from, until) {
      if (from == null) from = F.t >= S.end ? 0 : F.t;
      if (until == null) until = S.end;
      setOff(false);
      if (reduce) { seek(until); stop(); return; }
      claim(F);
      seek(from);
      F.playing = true; btn.classList.add("playing"); btn.setAttribute("aria-label", "Pause the example");
      var prev = from, base = performance.now() - from;
      cancelAnimationFrame(raf);
      function frame(now) {
        if (!F.playing) return;
        var nt = Math.min(until, now - base);
        F.busy = true;
        var ran = false;
        S.acts.forEach(function (a) {
          if (a.t1 == null) { if (a.t > prev && a.t <= nt) { a.f(); ran = true; } }
          else if (nt > a.t0 && prev < a.t1) a.f(ease(Math.min(1, (nt - a.t0) / (a.t1 - a.t0))));
        });
        F.busy = false;
        if (ran) hold();
        prev = nt; F.t = nt; drawScrub(); placePointer(); caption();
        if (nt >= until) { stop(); caption(); return; }
        raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
    }
    /* A switch always shows what it changes. Wherever the script is, playing or not, it goes back to just
       before the step the setting changes, plays that one step, and stops there so it can be looked at
       and compared with the other setting. Play goes on from there. The steps before it are the same
       under every setting. (Off the script, the setting just applies to the app as the reader has it.) */
    function choose(name, val) {
      sel[name] = val;
      F.m.choose(name, val, F.off);
      if (F.off || quietSw[name]) return;
      F.played = true; F.paused = false;
      grow();
      play(S.replay, S.shown);
    }

    btn.addEventListener("click", function () { F.played = true; F.paused = false; if (F.playing) { stop(); caption(); } else play(); });
    /* Reset: back to the start of the script with the app as it was then, wherever the script had got to and whatever
       the reader has done to the app by hand. The switches stay as they are set: each one is its own way back. */
    rst.addEventListener("click", function () {
      F.played = true; F.paused = false; stop(); setOff(false);
      if (F.m.blur) F.m.blur();
      seek(0);
    });
    function tAt(x) { var r = track.getBoundingClientRect(); return Math.max(0, Math.min(1, (x - r.left) / r.width)) * S.end; }
    var scrubbed = -1e9;   /* when the slider was last touched */
    track.addEventListener("pointerdown", function (e) {
      if (e.button > 0) return;
      e.preventDefault();
      scrubbed = performance.now();
      try { track.setPointerCapture(e.pointerId); } catch (err) {}
      /* Taking the slider is asking to look at something, so the script stops there and stays stopped. Play goes on from that point. */
      F.played = true; F.paused = false; dragging = true; stop(); setOff(false);
      seek(tAt(e.clientX));
    });
    track.addEventListener("pointermove", function (e) { if (dragging) seek(tAt(e.clientX)); });
    function endDrag() { if (!dragging) return; dragging = false; scrubbed = performance.now(); }
    track.addEventListener("pointerup", endDrag);
    track.addEventListener("pointercancel", endDrag);
    track.addEventListener("keydown", function (e) {
      var marks = [0].concat(S.stops, [S.end]), n = null, k = e.key;
      if (k === "ArrowRight" || k === "ArrowUp") n = marks.filter(function (m) { return m > F.t + 1; })[0];
      else if (k === "ArrowLeft" || k === "ArrowDown") n = marks.filter(function (m) { return m < F.t - 1; }).pop();
      else if (k === "Home") n = 0;
      else if (k === "End") n = S.end;
      if (n == null) return;
      e.preventDefault();
      F.played = true; stop(); setOff(false); seek(n);
      track.focus({ preventScroll: true });
    });

    /* Touching the app takes you off the script */
    function aside(e) { return (!!cp && cp.contains(e.target)) || (!!mid && mid.contains(e.target)); }   /* what just ran, and what stands between, are about the app, not the app: using them leaves the script where it is */
    stage.addEventListener("pointerdown", function (e) { if (e.isTrusted && e.pointerType !== "touch" && !aside(e)) goOff(); }, true);
    stage.addEventListener("pointerup", function (e) { if (e.isTrusted && e.pointerType === "touch" && !aside(e)) goOff(); }, true);
    stage.addEventListener("click", function (e) {
      if (!e.isTrusted || aside(e)) return;
      /* If the figure moved under a tap on the slider, the tap's click can land here. It was never meant for the app. */
      if (performance.now() - scrubbed < 500) { e.preventDefault(); e.stopPropagation(); return; }
      goOff();
    }, true);
    stage.addEventListener("focusin", function (e) { if (!F.busy && e.relatedTarget && !aside(e)) goOff(); }, true);   /* the reader tabbed in */
    stage.addEventListener("keydown", function (e) {
      if (!e.isTrusted || F.off || aside(e)) return;
      var page = { " ": 0.88, PageDown: 0.88, PageUp: -0.88, ArrowDown: 0.12, ArrowUp: -0.12 };
      if (e.key in page && !e.metaKey && !e.ctrlKey && !e.altKey) {
        /* The script put the caret here, not the reader, so these keys still scroll the page. */
        e.preventDefault(); e.stopPropagation();
        if (stage.contains(document.activeElement)) document.activeElement.blur();
        window.scrollBy({ top: (e.key === " " && e.shiftKey ? -1 : 1) * page[e.key] * window.innerHeight, behavior: reduce ? "auto" : "smooth" });
        return;
      }
      goOff();
    }, true);
    window.addEventListener("resize", function () {
      if (stage.clientWidth === lastW) return;   /* a phone's address bar sliding away changes the height only */
      lastW = stage.clientWidth;
      clearTimeout(fitT);
      fitT = setTimeout(function () {
        F.refresh(true);
        F.relink();
        /* The pointer's path was worked out at the old width. Rebuilding this moment works it out again. */
        if (!F.off && !dragging && F.t > 0 && F.t < S.end) seek(F.t);
      }, 150);
    });

    F.watch = desk;   /* the desktop, not the window: the window goes when the app quits, and that isn't leaving the screen */
    F.autoplay = function () { play(0); };
    F.resume = function () { F.paused = false; if (!F.off && !F.playing && F.t < S.end) play(F.t); };
    F.halt = function () { if (F.playing) { stop(); caption(); F.paused = true; } };   /* interrupted, so it may pick up again */
    F.visible = function (on) {
      if (!on && F.playing) { stop(); caption(); F.paused = true; }
      if (!on && !F.off && F.m.blur && !F.closed) F.m.blur();
      if (F.m.visible) F.m.visible(on);
    };
    /* Measure again, soon. `stale` says the old reserve is for another layout and has to go at once. */
    F.refresh = function (stale) {
      needFit = true;
      if (stale) { floor = 0; if (!F.closed) stage.style.minHeight = ""; if (F.mach && keeps) { machFloor = 0; F.mach.style.minHeight = ""; } hold(); }
      fitSoon(F);
      F.relink();   /* text has a new width, so the arrows have new ends */
    };
    /* Only a figure sitting at its start can be measured without disturbing it. Any other waits for its script to move. */
    F.fitNow = function () { if (needFit && !F.off && !F.playing && F.t === 0) seek(0); };

    F.m = cfg.machine(F);
    S = cfg.script(F);
    if (S.marks) root.setAttribute("data-marks", JSON.stringify(S.marks));   /* when each step happens, for anything that drives the figure from outside */
    S.stops.forEach(function (s) { var k = h("span", "scrub-tick", null, null); k.style.left = (100 * s / S.end) + "%"; track.insertBefore(k, thumb); ticks.push(k); });
    lastW = stage.clientWidth;
    seek(0);
    ready = true;   /* from here on, the next move of the script measures the reserve first; the fonts arriving is usually what asks */
    figs.push(F);
    return F;
  }

  /* Quit with the close box, then relaunch from the icon: two clicks that scripts use as one step */
  function relaunchStep(F, t0, shut) {
    shut = shut || 1300;   /* how long the app stays closed */
    var t1 = t0 + shut, end = t1 + 1700;
    return {
      end: end, back: t1,
      acts: [{ t: t0, f: function () { F.ripple(); F.quit(); } }, { t: t1, f: function () { F.ripple(); F.launch(); } }],
      way: function (from) {
        var c = F.pt.close(), i = F.pt.icon(), a = F.pt.aside();
        return [[t0 - 900, from[0], from[1]], [t0 - 100, c[0], c[1]], [t0 + 40, c[0], c[1]], [t0 + 330, a[0], a[1]], [t1 - 850, a[0], a[1]], [t1 - 100, i[0], i[1]], [end, i[0], i[1]]];
      },
      hot: function (t) { return t >= t0 - 500 && t < t0 + 150 ? "close" : t >= t1 - 450 && t < t1 + 150 ? "icon" : null; }
    };
  }

  /* One script for every figure: click into a row, type, select a word, delete the row above, scroll,
     then quit and relaunch. What differs from figure to figure is what its machinery does at each
     step, and so what its captions say. A machine needs: focusRow, typeChar, select, removeAt,
     scrollTo, and the points text(i, col), x(i), list(fx, fy) and rest(). */
  var T6 = { click: 1300, type: 1700, sel0: 3300, sel1: 3900, del: 5400, sc0: 6900, sc1: 7700, quit: 9300 }, SHUT = 1500, SCROLL = 40;   /* one row: enough to see, and the row you're in stays in view */
  function story(F, o) {
    var m = F.m, R = relaunchStep(F, T6.quit, SHUT);
    var acts = [{ t: T6.click, f: function () { F.ripple(); m.focusRow(2); } }];
    TYPED.split("").forEach(function (ch, k) { acts.push({ t: T6.type + k * 100, f: function () { m.typeChar(2, ch); } }); });
    acts.push({ t0: T6.sel0, t1: T6.sel1, f: function (u) { m.select(2, 4, 4 + Math.round(6 * u)); } });
    acts.push({ t: T6.del, f: function () { F.ripple(); m.removeAt(1); } });
    acts.push({ t0: T6.sc0, t1: T6.sc1, f: function (u) { m.scrollTo(Math.round(SCROLL * u)); } });
    acts = acts.concat(R.acts);
    return {
      end: R.end, acts: acts, replay: T6.del - 900, shown: T6.del + 450,   /* a switch replays from just before the step it changes, to just after it: the pointer is still on what it clicked */
      stops: [T6.click, T6.type, T6.sel0, T6.del, T6.sc0, T6.quit],
      marks: { click: T6.click, type: T6.type, select: T6.sel0, del: T6.del, scroll: T6.sc0, quit: T6.quit, back: R.back, end: R.end },
      way: function () {
        var r = m.pt.rest(), a = m.pt.text(2), c4 = m.pt.text(2, 4), c10 = m.pt.text(2, 10), x = m.pt.x(1), mid = m.pt.list(0.62, 0.55);
        return [[0, r[0], r[1]], [350, r[0], r[1]], [T6.click, a[0], a[1]], [T6.sel0 - 550, a[0], a[1]], [T6.sel0, c4[0], c4[1]], [T6.sel1, c10[0], c10[1]],
          [T6.del - 800, c10[0], c10[1]], [T6.del - 100, x[0], x[1]], [T6.del + 450, x[0], x[1]], [T6.sc0, mid[0], mid[1]], [T6.sc1 + 300, mid[0], mid[1]]].concat(R.way(mid));
      },
      hot: function (t) { return t >= T6.del - 600 && t < T6.del ? 1 : R.hot(t) || -1; },
      caption: function (t) {
        if (t < T6.type - 200) return ["Step 1 of 6", o.cap("1")];
        if (t < T6.sel0 - 550) return ["Step 2 of 6", o.cap("2")];
        if (t < T6.del - 800) return ["Step 3 of 6", o.cap("3")];
        if (t < T6.sc0 - 500) return ["Step 4 of 6", o.cap(t < T6.del ? "4a" : "4")];
        if (t < T6.quit - 700) return ["Step 5 of 6", o.cap("5")];
        return ["Step 6 of 6", o.cap(t < T6.quit ? "6a" : t < R.back ? "6q" : "6")];
      }
    };
  }


