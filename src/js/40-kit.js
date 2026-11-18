  /* ---------------------------------------------------------------------------------------------
     A tiny toolkit whose widgets draw themselves and keep nothing. You tell it what to draw: rows,
     a caret, a selection, and how far the list is scrolled. It tells you what was pressed, typed,
     selected or scrolled. Immediate mode, Puri and deui all use it. They differ only in who holds
     the state and how the screen is updated.
     --------------------------------------------------------------------------------------------- */
  function Kit(F) {
    var host = F.host, rows = [], hotRow = -1, composing = false, K = { on: function () {} };
    host.classList.add("scripted");
    var key = h("input", "kit-key", null, host);
    key.type = "text"; key.id = "kit-key-" + F.name; key.autocomplete = "off"; key.spellcheck = false;
    key.setAttribute("autocapitalize", "off"); key.setAttribute("aria-label", "Type into the to-do list");
    var box = h("div", "kit-rows", null, host);   /* the list's window: five rows tall, and it scrolls */

    function node() {
      var d = h("div", "krow");
      h("span", "kchk", null, d).setAttribute("data-part", "check");
      var t = h("span", "ktext", null, d); t.setAttribute("data-part", "text");
      d._t = h("span", "kt", "", t);
      d._s = h("i", "ksel", null, t); d._s.hidden = true;   /* the selected run of text, drawn again over the plain one */
      d._c = h("i", "kcaret", null, t); d._c.hidden = true;
      h("span", "kx", "×", d).setAttribute("data-part", "x");
      d._cls = "krow"; d._caret = null; d._sel = null;
      return d;
    }
    function colX(d, col) {
      var n = d._t.firstChild;
      if (!n || !col) return 0;
      var r = document.createRange(); r.setStart(n, 0); r.setEnd(n, Math.min(col, n.length));
      return r.getBoundingClientRect().width;
    }
    function colAt(d, clientX) {
      var n = d._t.firstChild, len = n ? n.length : 0, x = clientX - d._t.getBoundingClientRect().left, best = 0, bd = Math.abs(x);
      for (var c = 1; c <= len; c++) { var dd = Math.abs(x - colX(d, c)); if (dd < bd) { bd = dd; best = c; } }
      return best;
    }
    function paint(d, r) {
      var cls = "krow" + (r.done ? " done" : "") + (r.focus ? " focus" : "") + (r.hot ? " hot" : "") + (r.tone ? " " + r.tone : "");
      if (d._cls !== cls) { d.className = cls; d._cls = cls; }
      d._caret = r.focus && r.caret != null ? r.caret : null;
      d._sel = r.focus && r.sel && r.sel[0] !== r.sel[1] ? [Math.min(r.sel[0], r.sel[1]), Math.max(r.sel[0], r.sel[1])] : null;
      d._c.hidden = d._caret == null; d._s.hidden = !d._sel;
    }
    function place() {   /* a caret's position needs layout, so carets and selections are placed once the rows are in the page */
      rows.forEach(function (d) {
        if (d._sel) {
          var s = d._t.textContent.slice(d._sel[0], d._sel[1]);
          if (d._s.textContent !== s) d._s.textContent = s;
          d._s.style.left = (d._t.offsetLeft + colX(d, d._sel[0])) + "px";
        }
        if (d._caret == null) return;
        d._c.style.left = (d._t.offsetLeft + colX(d, d._caret)) + "px";
        var hb = host.getBoundingClientRect(), cb = d._c.getBoundingClientRect();   /* the hidden text box sits at the caret, kept inside the list's frame */
        key.style.left = Math.max(0, Math.min(hb.width - 2, cb.left - hb.left)) + "px"; key.style.top = Math.max(0, Math.min(hb.height - 2, cb.top - hb.top)) + "px";
      });
    }
    function renum() { rows.forEach(function (d, i) { d.setAttribute("data-row", i); }); }

    /* Scrolling. The list's window is the browser's own scroller, used the way the hidden text box is used
       for keys: as a source of events. Where the list is scrolled to is told to the kit like everything
       else, and it reports back when the reader scrolls it. */
    var lastY = 0;
    function applyScroll(y) { if (y === lastY) return; box.scrollTop = y; lastY = Math.round(box.scrollTop); }
    box.addEventListener("scroll", function () { var y = Math.round(box.scrollTop); if (y === lastY) return; lastY = y; K.on({ type: "scroll", y: y }); });
    K.setScroll = function (y) { applyScroll(y); return lastY; };
    K.scroll = function () { return Math.round(box.scrollTop); };
    K.maxScroll = function () { return Math.max(0, box.scrollHeight - box.clientHeight); };

    /* Draw everything */
    K.draw = function (v) {
      while (rows.length > v.rows.length) rows.pop().remove();
      v.rows.forEach(function (r, i) {
        var d = rows[i];
        if (!d) { d = node(); box.appendChild(d); rows.push(d); d.setAttribute("data-row", i); }
        if (d._t.textContent !== r.text) d._t.textContent = r.text;
        paint(d, r);
      });
      if (v.scroll != null) applyScroll(v.scroll);
      place();
    };
    /* Or edit what is already drawn */
    K.removeRow = function (i) { var d = rows[i]; if (!d) return; rows.splice(i, 1); d.remove(); renum(); };
    K.insertRow = function (i, r) { var d = node(); d._t.textContent = r.text; paint(d, r); box.insertBefore(d, rows[i] || null); rows.splice(i, 0, d); renum(); };
    K.setText = function (i, s) { if (rows[i]) rows[i]._t.textContent = s; };
    K.setDone = function (i, on) { if (rows[i]) paint(rows[i], { done: on, focus: rows[i]._caret != null, caret: rows[i]._caret, sel: rows[i]._sel, hot: i === hotShown }); };
    var hotShown = -1;
    K.setFocus = function (i, caret, tone, sel) {
      rows.forEach(function (d, j) { paint(d, { done: d.classList.contains("done"), focus: j === i, caret: j === i ? caret : null, sel: j === i ? sel : null, hot: j === hotShown, tone: j === i ? tone : null }); });
      place();
    };
    K.setHot = function (i) { hotShown = i; rows.forEach(function (d, j) { d.classList.toggle("hot", j === i); d._cls = d.className; }); };
    K.snapshot = function () { return rows.map(function (d) { return { text: d._t.textContent, done: d.classList.contains("done") }; }); };
    K.row = function (i) { return rows[i] || null; };

    /* What the reader does. A press never moves the browser's focus by itself, so clicking × or a
       tick doesn't take the keyboard away from the row you're typing in. Dragging along a row's text
       selects, and so does a double click on a word. */
    var drag = null;
    host.addEventListener("mousedown", function (e) {
      e.preventDefault();
      var p = e.target.closest("[data-part]"), d = e.target.closest(".krow");
      drag = e.button === 0 && p && d && p.getAttribute("data-part") === "text" ? { d: d, row: +d.getAttribute("data-row"), col: colAt(d, e.clientX), last: null } : null;
    });
    document.addEventListener("mousemove", function (e) {
      if (!drag || !(e.buttons & 1) || !drag.d.isConnected) return;
      var col = colAt(drag.d, e.clientX);
      if (drag.last == null ? col === drag.col : col === drag.last) return;
      if (drag.last == null) key.focus({ preventScroll: true });
      drag.last = col;
      K.on({ type: "select", row: +drag.d.getAttribute("data-row"), a: drag.col, b: col });
    });
    host.addEventListener("click", function (e) {
      var dragged = drag && drag.last != null;
      drag = null;
      if (dragged) return;   /* that was a drag, and the selection it made stands */
      var p = e.target.closest("[data-part]"), d = e.target.closest(".krow");
      if (!p || !d) return;
      var part = p.getAttribute("data-part"), col = part === "text" ? colAt(d, e.clientX) : 0;
      if (part === "text") key.focus({ preventScroll: true });
      K.on({ type: "press", row: +d.getAttribute("data-row"), part: part, col: col });
    });
    host.addEventListener("dblclick", function (e) {
      var p = e.target.closest('[data-part="text"]'), d = e.target.closest(".krow");
      if (!p || !d) return;
      var s = d._t.textContent, a = colAt(d, e.clientX), b = a;
      while (a > 0 && /\S/.test(s.charAt(a - 1))) a--;
      while (b < s.length && /\S/.test(s.charAt(b))) b++;
      if (a === b) return;
      key.focus({ preventScroll: true });
      K.on({ type: "select", row: +d.getAttribute("data-row"), a: a, b: b });
    });
    key.addEventListener("keydown", function (e) {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "Backspace", "Delete", "Enter"].indexOf(e.key) < 0 || composing) return;
      e.preventDefault(); K.on({ type: "key", key: e.key, shift: e.shiftKey });
    });
    key.addEventListener("compositionstart", function () { composing = true; });
    key.addEventListener("compositionend", function () { composing = false; var s = key.value; key.value = ""; if (s) K.on({ type: "text", text: s }); });
    key.addEventListener("input", function () { if (composing) return; var s = key.value; key.value = ""; if (s) K.on({ type: "text", text: s }); });
    key.addEventListener("focus", function () { host.classList.add("kbd"); });
    key.addEventListener("blur", function () { host.classList.remove("kbd"); });
    host.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      var d = e.target.closest(".krow"), i = d ? +d.getAttribute("data-row") : -1;
      if (i !== hotRow) { hotRow = i; K.on({ type: "hot", row: i }); }
    });
    host.addEventListener("pointerleave", function () { if (hotRow !== -1) { hotRow = -1; K.on({ type: "hot", row: -1 }); } });

    K.scripted = function (on) { host.classList.toggle("scripted", on); };
    K.steady = function (on) { host.classList.toggle("steady", on); };
    K.blur = function () { if (document.activeElement === key) key.blur(); };
    K.pt = {
      text: function (i, k) { var d = rows[i], b = F.box(d._t); return [b.l + colX(d, k == null ? d._t.textContent.length : k) + 1, b.t + b.h / 2 + 3]; },
      x: function (i) { var b = F.box(rows[i].lastChild); return [b.l + b.w / 2 + 1, b.t + b.h / 2 + 3]; },
      list: function (fx, fy) { var b = F.box(box); return [b.l + b.w * fx, b.t + b.h * fy]; },
      rest: function () { var w = F.box(F.win); return [w.l + w.w * 0.62, w.b + 26]; }
    };
    return K;
  }

  /* One line of text with a caret and a selection, which runs from `anchor` to the caret (there is none
     when the two are equal). Returns the new [text, caret, anchor] after a key, or null if the key isn't an edit. */
  function editLine(text, caret, ev, anchor) {
    if (anchor == null) anchor = caret;
    var lo = Math.min(caret, anchor), hi = Math.max(caret, anchor), sel = lo !== hi, c;
    if (ev.type === "text") { c = lo + ev.text.length; return [text.slice(0, lo) + ev.text + text.slice(hi), c, c]; }
    var k = ev.key;
    if (k === "Backspace") return sel ? [text.slice(0, lo) + text.slice(hi), lo, lo] : caret > 0 ? [text.slice(0, caret - 1) + text.slice(caret), caret - 1, caret - 1] : null;
    if (k === "Delete") return sel ? [text.slice(0, lo) + text.slice(hi), lo, lo] : caret < text.length ? [text.slice(0, caret) + text.slice(caret + 1), caret, caret] : null;
    if (k === "ArrowLeft") c = ev.shift || !sel ? Math.max(0, caret - 1) : lo;
    else if (k === "ArrowRight") c = ev.shift || !sel ? Math.min(text.length, caret + 1) : hi;
    else if (k === "Home") c = 0;
    else if (k === "End") c = text.length;
    else return null;
    return [text, c, ev.shift ? anchor : c];
  }
  function startItems() { var id = 1; return EIGHT.map(function (s) { return { id: id++, text: s, done: false }; }); }
  /* Puri and deui have one state, not two piles. The figure still lays it out in two columns, but under one name and in one colour. */
  function oneState(F) { F.dataHead.textContent = "state"; F.where.parentNode.firstChild.textContent = ""; }
  function copyItems(list) { return list.map(function (it) { var c = { id: it.id, text: it.text, done: it.done }; if (it.ui) c.ui = { caret: it.ui.caret, anchor: it.ui.anchor }; return c; }); }
  function topId(list) { var n = 1; list.forEach(function (it) { n = Math.max(n, it.id + 1); }); return n; }
  /* The selected text, for a label: from one column to another of a row's text */
  function selText(text, a, b) { var lo = Math.min(a, b, text.length), hi = Math.min(Math.max(a, b), text.length); return lo === hi ? "none" : q(text.slice(lo, hi), 14); }

  /* ---------------------------------------------------------------------------------------------
     Immediate mode: every frame, handle input and redraw every row. The widgets keep nothing, but
     the library does: which ID is active, its caret and selection, and how far the list is scrolled.
     An ID comes from the item or from the row's position, and that choice decides where the caret
     and the selection are after a delete.
     --------------------------------------------------------------------------------------------- */
  function ImmMachine(F) {
    var K = Kit(F), M = { pt: K.pt }, items = [], nextId = 9, byItem = true;
    var lib = { active: null, caret: 0, anchor: 0, hot: -1, scroll: 0 }, tone = null;
    var frames = 0, still = 0, raf = 0, on = false, dirty = false, queue = [], closed = false;
    K.steady(true);
    /* What runs is the same every frame, so its lines stay and only their words change. The first has the
       arrow that never stops: everything in app state goes in, and the whole screen comes out. The third
       shows only when a widget reported something and your drawing code edited the data. */
    F.quiet = true;
    F.lines("", [["", "view", "", "", { from: F.cards, to: F.win, wide: 1, run: 1 }], ["", "soft"], ["", "data"]]);
    F.quiet = false;
    var l1 = F.mach.children[0], l2 = F.mach.children[1], l3 = F.mach.children[2];
    l3.hidden = true;
    var evAt = null;   /* where in the window the input being handled happened */
    function rowY(r) { var d = K.row(r); if (!d) return null; var b = F.box(d); return b.t + b.h / 2; }
    var SLIP = { click: "focus", key: "caret", drag: "selection", scroll: "scroll" };
    function idOf(i) { return byItem ? "item " + items[i].id : "row " + (i + 1); }
    function activeRow() { for (var i = 0; i < items.length; i++) if (idOf(i) === lib.active) return i; return -1; }
    function focusAt(i, col) { lib.active = idOf(i); lib.caret = lib.anchor = col == null ? items[i].text.length : col; }
    function calm() { tone = null; F.u.focus.classList.remove("bad"); F.setNote("", ""); }
    /* The arrows for one input. It goes from the window to the library, which notes what it means under an
       ID: to the slip it changed, or just to the library's box. If a widget then reports something, your
       drawing code edits the data: `edit` is that line and the card it wrote. */
    function went(evn, edit, kept) {
      var y = evAt; evAt = null;
      setLine(l3, edit ? edit.code : ""); l3.hidden = !edit;
      F.spark([
        { from: F.win, fromY: y, to: kept ? F.u[SLIP[evn]] : F.ustate.parentNode, c: kept ? "ui" : "ink" },
        edit ? Object.assign({ from: l3, c: "data" }, edit.card != null ? { to: function () { return F.cards.children[edit.card]; } } : edit.gap != null ? F.gapAt(edit.gap) : { to: F.dataHead }) : null
      ]);
    }
    function remove(i) {
      var a = activeRow(), was = a >= 0 ? items[a] : null, id = lib.active;
      F.headPulse(K.row(i));
      items.splice(i, 1);
      var b = activeRow(), now = b >= 0 ? items[b] : null;
      tone = null;
      if (!was) F.setNote("", "");
      else if (!now) F.setNote("bad", "Nothing has ID “" + id + "” now, so the library drops the focus.");
      else if (now === was) F.setNote("good", "ID “" + id + "” still names " + q(now.text) + ".");
      else { tone = "jumped"; F.setNote("bad", "ID “" + id + "” now names " + q(now.text) + "."); }
      F.u.focus.classList.toggle("bad", tone === "jumped");
      F.cardsFor(items);
      went("click", { code: "if (x(i)) items.remove(i)", card: null, gap: i }, false);
    }
    function act(ev) {
      if (ev.type === "hot") { lib.hot = ev.row; return; }
      dirty = true;
      if (evAt == null) evAt = ev.type === "scroll" ? F.host : ev.row != null ? rowY(ev.row) : activeRow() >= 0 ? rowY(activeRow()) : F.host;
      if (ev.type === "scroll") { lib.scroll = ev.y; if (tone !== "jumped") F.setNote("", ""); went("scroll", null, true); return; }
      if (ev.type === "select") { calm(); lib.active = idOf(ev.row); lib.anchor = ev.a; lib.caret = ev.b; went("drag", null, true); return; }
      var a = activeRow();
      if (ev.type === "press") {
        if (ev.part === "x") { remove(ev.row); return; }
        calm();
        if (ev.part === "text") { focusAt(ev.row, ev.col); went("click", null, true); }
        else { items[ev.row].done = !items[ev.row].done; F.cardsFor(items, ev.row, K.row(ev.row)); went("click", { code: "if (tick(i)) items[i].done = !items[i].done", card: ev.row }, false); }
        return;
      }
      calm();
      if (a < 0) { if (items.length && ev.type === "key" && /^(ArrowDown|ArrowUp|Enter)$/.test(ev.key)) { focusAt(0); went("key", null, true); } return; }
      var it = items[a];
      if (ev.type === "key" && ev.key === "Enter") {
        items.splice(a + 1, 0, { id: nextId++, text: "", done: false });
        focusAt(a + 1, 0); F.cardsFor(items, a + 1, K.row(a)); went("key", { code: "if (enter) items.insert(i + 1, blank)", card: a + 1 }, true); return;
      }
      if (ev.type === "key" && ev.key === "Backspace" && it.text === "") {
        F.headPulse(K.row(a)); items.splice(a, 1);
        if (items.length) focusAt(Math.max(0, a - 1)); else lib.active = null;
        F.cardsFor(items); went("key", { code: "if (backspace) items.remove(i)", card: null, gap: a }, true); return;
      }
      if (ev.type === "key" && (ev.key === "ArrowUp" || ev.key === "ArrowDown")) {
        var n = a + (ev.key === "ArrowUp" ? -1 : 1);
        if (n >= 0 && n < items.length) { focusAt(n, Math.min(lib.caret, items[n].text.length)); went("key", null, true); }
        return;
      }
      var r = editLine(it.text, lib.caret, ev, lib.anchor);
      if (!r) return;
      var edited = r[0] !== it.text;
      if (edited) { it.text = r[0]; F.cardsFor(items, a, K.row(a)); }
      lib.caret = r[1]; lib.anchor = r[2];
      went("key", edited ? { code: "edit_text(&items[i].text)", card: a } : null, true);
    }
    function setLine(p, s) { if (p.textContent !== s) p.textContent = s; }
    function draw() {
      if (closed) return;   /* no app, no frames */
      var a = activeRow();
      if (lib.active && a < 0) lib.active = null;   /* nothing claimed that ID this frame */
      if (a >= 0) { var len = items[a].text.length; if (lib.caret > len) lib.caret = len; if (lib.anchor > len) lib.anchor = len; }
      var blink = F.quiet || !on || F.playing || (performance.now() % 1060) < 560, src = a >= 0 ? K.row(a) : null;
      K.draw({
        rows: items.map(function (it, i) { return { text: it.text, done: it.done, focus: i === a, caret: blink ? lib.caret : null, sel: i === a ? [lib.anchor, lib.caret] : null, hot: i === lib.hot, tone: i === a ? tone : null }; }),
        scroll: lib.scroll
      });
      frames++; still = dirty ? 0 : still + 1; dirty = false;
      var st = a >= 0 ? selText(items[a].text, lib.anchor, lib.caret) : "none";
      F.setU("focus", lib.active ? "ID “" + lib.active + "”" : "nothing", lib.active, src);
      F.setU("caret", a >= 0 ? "col " + lib.caret : "—", a >= 0 ? lib.caret : "—", src);
      F.setU("selection", st, st, src);
      F.setU("scroll", lib.scroll + " px", lib.scroll, null);
      setLine(F.sum, "frame " + frames.toLocaleString("en-US"));
      setLine(l1, "draw(items): all " + count(items.length, "row"));
      /* One sentence with its number last, so the words never move: only the digits change, and nothing swaps in for a single frame */
      setLine(l2, "frames since anything changed: " + (still > 1 ? still : 0).toLocaleString("en-US"));
    }
    function frame() { queue.splice(0).forEach(act); draw(); }
    function loop() { raf = requestAnimationFrame(function () { if (!on) return; frame(); loop(); }); }
    function now() { if (!on || F.quiet) draw(); }
    K.on = function (ev) { if (closed) return; queue.push(ev); if (!on) frame(); };

    /* What the script calls. It has no code of its own for what a click or a key does: each of these hands act() the same input a reader's click or key would. */
    M.focusRow = function (i) { act({ type: "press", part: "text", row: i, col: items[i].text.length }); now(); };
    M.typeChar = function (i, ch) { if (activeRow() !== i) focusAt(i); act({ type: "text", text: ch }); now(); };
    M.select = function (i, a, b) { act({ type: "select", row: i, a: a, b: b }); now(); };
    M.scrollTo = function (y) { act({ type: "scroll", y: y }); now(); };
    M.removeAt = function (i) { act({ type: "press", part: "x", row: i }); now(); };
    M.hot = function (i) { lib.hot = i; };
    M.setScripted = K.scripted;
    M.blur = K.blur;
    M.flush = function () { draw(); };
    /* How the panel reads after a long quiet spell: its longest text, for a figure measuring its height */
    M.settle = function () { if (closed) return; var s = still, f = frames; still = 99998; frames = 999998; dirty = false; draw(); still = s; frames = f; };
    M.visible = function (v) { v = v && !reduce; if (v === on) return; on = v; cancelAnimationFrame(raf); F.running(on && !closed); if (on) loop(); };
    M.byItem = function () { return byItem; };
    M.choose = function (name, val, live) {
      var a = live ? activeRow() : -1;
      byItem = val === "item";
      F.where.textContent = "kept in the library, under IDs from " + (byItem ? "the items" : "position");
      if (a >= 0) lib.active = idOf(a);
      if (live) { calm(); dirty = true; now(); }
    };
    function fresh() { lib.active = null; lib.caret = 0; lib.anchor = 0; lib.hot = -1; lib.scroll = 0; tone = null; }
    /* Quitting saves the data. The library's store was only ever in memory. */
    M.quit = function () {
      var saved = copyItems(items);
      K.blur(); K.draw({ rows: [], scroll: 0 }); closed = true; queue.length = 0;
      fresh();
      F.setU("focus", "nothing", null, null); F.setU("caret", "—", "—", null); F.setU("selection", "none", "none", null); F.setU("scroll", "0 px", 0, null);
      F.u.focus.classList.remove("bad");
      F.setNote("", ""); F.cardsOff();
      setLine(F.sum, "on quit: disk.save(items)"); setLine(l1, "no frames: the app isn’t running"); setLine(l2, "the library’s store went with it");
      l3.hidden = true; F.running(false); F.spark([]);
      return { data: saved, ui: false };
    };
    M.launch = function (disk) {
      items = copyItems(disk.data); nextId = topId(items); closed = false; dirty = true;
      F.cardsFor(items); draw();
      l3.hidden = true; F.running(on); F.spark([]);
    };
    M.reset = function () {
      items = startItems(); nextId = 9; fresh(); queue.length = 0; dirty = true; closed = false;
      F.resetPanels(); F.cardsFor(items); draw();
      l3.hidden = true; F.running(on); F.spark([]);
    };
    return M;
  }

  LiveFig("imm", {
    kit: true, label: "To-do list, immediate mode", where: "kept in the library, under IDs from the items", keeps: "library", mach: "every frame",
    fields: [["focus", "focus", "nothing"], ["caret", "caret", "—"], ["selection", "selection", "none"], ["scroll", "scroll", "0 px"]],
    switches: [{ name: "ids", label: "Where IDs come from", options: [["item", "IDs from items"], ["pos", "IDs from position"]] }],
    machine: function (F) { return ImmMachine(F); },
    script: function (F) {
      return story(F, {
        cap: function (k) {
          return {
            "1": "Click into “Fix scroll bug”. The library notes which ID has the focus.",
            "2": "Type “today” at the end. Every frame redraws all eight rows, whether you type or not.",
            "3": "Select a word. The library keeps the selection too, under the same ID.",
            "4a": "Delete “Call Phil”, the row above yours.",
            "4": F.m.byItem()
              ? "Delete “Call Phil”, the row above yours. The ID comes from the item, so it still names the same row, and the caret and selection stay."
              : "Delete “Call Phil”, the row above yours. The ID is “row 3”, and row 3 is now “Write essay”, so the caret and selection land there, as in a list without keys.",
            "5": "Scroll. The library keeps the scroll position, and each frame is drawn from it.",
            "6a": "Quit the app with its close box.",
            "6q": "Quit the app with its close box. The data is saved to disk. The library’s store was only ever in memory.",
            "6": "Launch it again. Frames are drawn from the data, as before. The UI state starts over."
          }[k];
        }
      });
    }
  });

  /* ---------------------------------------------------------------------------------------------
     Puri: the same widgets, and no library store. Focus, caret, selection and scroll are plain data
     that your code holds, wherever you like. Each run of the view returns the picture and the handlers
     for it. A widget's handler does the widget's work and calls back into your code to store the
     result, then the whole view reruns.
     --------------------------------------------------------------------------------------------- */
  function PuriMachine(F) {
    var K = Kit(F), M = { pt: K.pt }, items = [], nextId = 9, home = "store", ui = null, hot = -1, tone = null, closed = false;
    oneState(F);
    var WHERE = { store: "the focus, by item id", items: "the focus, on its item", table: "the focus, by row" };
    var P = {};   /* the panel's parts for the current home */
    function blank() { return home === "store" ? { focus: null, caret: 0, anchor: 0, scroll: 0 } : home === "items" ? { scroll: 0 } : { focus: null, rows: {}, scroll: 0 }; }
    function fRow() {
      var i;
      if (home === "store") { for (i = 0; i < items.length; i++) if (items[i].id === ui.focus) return i; return -1; }
      if (home === "items") { for (i = 0; i < items.length; i++) if (items[i].ui) return i; return -1; }
      return ui.focus != null && ui.focus >= 1 && ui.focus <= items.length ? ui.focus - 1 : -1;
    }
    /* Where the focused row's caret and selection are kept, in whichever home is chosen */
    function slot() {
      var i = fRow();
      if (i < 0) return null;
      return home === "store" ? ui : home === "items" ? items[i].ui : ui.rows[ui.focus] || (ui.rows[ui.focus] = { caret: 0, anchor: 0 });
    }
    function rawCaret() { var s = slot(); return s ? s.caret : 0; }
    function rawAnchor() { var s = slot(); return s ? (s.anchor == null ? s.caret : s.anchor) : 0; }
    function caret() { var i = fRow(); return i < 0 ? 0 : Math.min(rawCaret(), items[i].text.length); }
    function anchor() { var i = fRow(); return i < 0 ? 0 : Math.min(rawAnchor(), items[i].text.length); }
    function setFocus(i, c, a) {
      c = c || 0; if (a == null) a = c;
      if (home === "store") { ui.focus = i < 0 ? null : items[i].id; ui.caret = c; ui.anchor = a; }
      else if (home === "items") { items.forEach(function (it) { delete it.ui; }); if (i >= 0) items[i].ui = { caret: c, anchor: a }; }
      else { ui.focus = i < 0 ? null : i + 1; if (i >= 0) ui.rows[i + 1] = { caret: c, anchor: a }; }
    }
    function setCaret(c, a) { var s = slot(); if (!s) return; s.caret = c; s.anchor = a == null ? c : a; }
    /* What the lines say. `s` is the state: there is one of it. The caret and the selected range are one value,
       the selection, and it is kept wherever the switch says the focus is kept. */
    function path(at) { at = at || "i"; return home === "store" ? "s" : home === "items" ? "s.items[" + at + "]" : "s.rows[" + at + "]"; }
    function selCode(expr, at) { return [path(at) + ".selection = " + (expr || "sel"), "ui"]; }
    function textCode(wrote) { return ["s.items[i].text = text", wrote ? "data" : "same"]; }
    function focusCode(expr, at) {
      at = at || "i";
      return (home === "store" ? [["s.focus = s.items[" + at + "].id", "ui"]] : home === "table" ? [["s.focus = " + at, "ui"]] : []).concat([selCode(expr, at)]);
    }
    function box(i) { return "row " + (i + 1) + "’s text box"; }

    /* The panel shows your state, and lets you edit it */
    function numIn(id, label, min, fn) {
      var i = document.createElement("input");
      i.type = "number"; i.className = "u-in"; i.id = id; i.min = String(min); i.setAttribute("aria-label", label); i.setAttribute("inputmode", "numeric");
      i.addEventListener("input", function () { var v = parseInt(i.value, 10); if (!isNaN(v)) fn(Math.max(min, v)); });
      return i;
    }
    function editCaret(v) { if (fRow() < 0) return; tone = null; setCaret(v); rerun("you edited it:", [[path() + ".selection.caret = " + v, "ui"]], null, true); }
    function editFocus(v) { tone = null; ui.focus = Math.min(Math.max(1, v), Math.max(1, items.length)); if (ui.rows[ui.focus] == null) ui.rows[ui.focus] = { caret: 0, anchor: 0 }; F.setNote("", ""); rerun("you edited it:", [["s.focus = " + ui.focus, "ui"]], null, true); }
    function editScroll(v) { ui.scroll = Math.min(v, K.maxScroll()); rerun("you edited it:", [["s.scroll = " + ui.scroll, "ui"]], null, true); }
    function chip(dt) { var u = h("div", "u", null, F.ustate); var a = h("dt", null, dt, u), b = h("dd", null, null, u); return { u: u, dt: a, dd: b }; }
    function buildPanel() {
      F.ustate.textContent = ""; P = {}; F.where.textContent = WHERE[home];
      if (home === "items") { var e = h("div", "u empty", null, F.ustate); h("dt", null, "The focus, caret and selection are on the item.", e); }
      else {
        P.focus = chip("focus"); P.sel = chip(home === "table" ? "row" : "selection"); P.sel.u.classList.add("u-wide");
        if (home === "table") { P.focus.dd.appendChild(document.createTextNode("row ")); P.focusIn = numIn("puri-focus", "Focused row", 1, editFocus); P.focus.dd.appendChild(P.focusIn); }
        else P.focusText = h("span", null, "nothing", P.focus.dd);
        P.selText = h("span", "u-sel", "", P.sel.dd); P.sel.dd.appendChild(document.createTextNode("caret "));
        P.caretIn = numIn("puri-caret", "Caret column", 0, editCaret); P.sel.dd.appendChild(P.caretIn);
      }
      P.scroll = chip("scroll"); P.scrollIn = numIn("puri-scroll", "How far the list is scrolled, in pixels", 0, editScroll);
      P.scroll.dd.appendChild(P.scrollIn); P.scroll.dd.appendChild(document.createTextNode(" px"));
    }
    function setIn(inp, v, dis) { if (!inp) return; inp.disabled = !!dis; if (document.activeElement !== inp && inp.value !== String(v)) inp.value = String(v); }
    function show(at, keepCards) {
      var i = fRow(), c = rawCaret(), key = i < 0 ? "none" : home === "table" ? "row" + ui.focus : "id" + items[i].id;
      if (home !== "items") {
        if (P.focusText) P.focusText.textContent = i < 0 ? "nothing" : q(items[i].text);
        setIn(P.focusIn, ui.focus == null ? "" : ui.focus);
        if (home === "table") P.sel.dt.textContent = ui.focus == null ? "row" : "row " + ui.focus;
        setIn(P.caretIn, i < 0 && home !== "table" ? "" : c, i < 0 && home !== "table");
        var st = i < 0 ? "none" : selText(items[i].text, rawAnchor(), c);
        P.selText.textContent = st === "none" ? "" : st;
        if (F.last.pf !== key) { F.last.pf = key; F.flash(P.focus.u); }
        if (F.last.pc !== c + "|" + st) { F.last.pc = c + "|" + st; F.flash(P.sel.u); }
        P.focus.u.classList.toggle("bad", tone === "jumped");
      }
      setIn(P.scrollIn, ui.scroll);
      if (F.last.py !== ui.scroll) { F.last.py = ui.scroll; F.flash(P.scroll.u); }
      if (keepCards) return;
      F.cardsFor(items, at, at != null ? K.row(at) : null, home !== "items" ? null : function (li, it) {
        if (!it.ui) return;
        var cu = h("span", "cu", "selection · caret ", li), inp = numIn("puri-caret", "Caret column", 0, editCaret);
        inp.value = String(it.ui.caret); cu.appendChild(inp);
        if (it.ui.anchor != null && it.ui.anchor !== it.ui.caret) cu.appendChild(document.createTextNode(" · from " + it.ui.anchor));
      });
    }
    /* Every change ends the same way: rerun the whole view */
    function rerun(name, lines, at, keepCards, gap) {
      var i = fRow();
      K.draw({
        rows: items.map(function (it, j) { return { text: it.text, done: it.done, focus: j === i, caret: caret(), sel: j === i ? [anchor(), caret()] : null, hot: j === hot, tone: j === i ? tone : null }; }),
        scroll: ui.scroll
      });
      var ev = evAt; evAt = null;
      if (name) F.lines(name, linked(name, lines, at, gap), { ev: ev, fire: true, linkSub: count(items.length, "row") + " + handlers" });
      show(at, keepCards);
    }
    /* What runs on an event is a handler the last view(state) returned, and most of them are a widget's own. The widget
       works out what happened in its own terms (which column a click landed on, what a key does to the text and the
       selection) and passes the result to the callback the view gave it. The callback is yours, and all it says is
       where in the state that goes. So a run reads: the widget's line, then the lines of your callback. */
    function handled(who, call, mine, lines, at, keepCards, gap) { rerun(who, [[call, "lib"], [mine, "sub"]].concat(lines), at, keepCards, gap); }
    /* Each line that writes the state has an arrow to what it wrote: an item's card, or a slip, wherever the switch
       keeps that. The view is the figure's standing link: it runs after every handler. */
    var evAt = null;   /* where in the window the event being handled happened */
    function rowY(r) { var d = K.row(r); if (!d) return null; var b = F.box(d); return b.t + b.h / 2; }
    function linked(name, lines, at, gap) {
      var mine = function () { var i = fRow(); return i >= 0 ? F.cards.children[i] : null; };   /* the card of the focused item */
      var slip = function (text) {
        if (home === "items" && /^s\.items\[[^\]]*\]\.selection/.test(text)) return function () { var c = mine(); return c ? c.querySelector(".cu") || c : null; };
        if (/scroll/.test(text)) return function () { return P.scroll ? P.scroll.u : null; };
        if (/focus/.test(text)) return function () { return P.focus ? P.focus.u : mine(); };
        return function () { return P.sel ? P.sel.u : mine(); };
      };
      var told = name === "you edited it:";   /* the reader changed the slip directly: nothing of the handler's to point at */
      var out = lines.map(function (L) {
        var link = told ? null : L[1] === "data" ? (name === "on launch:" ? { to: F.dataHead } : at != null ? { near: 1, to: function () { return F.cards.children[at]; } } : gap != null ? Object.assign({ near: 1 }, F.gapAt(gap)) : { to: F.dataHead })
          : L[1] === "ui" ? { to: name === "on launch:" ? F.ustate : slip(L[0]) } : L[1] === "missing" ? { to: slip(L[0]), miss: 1 } : null;
        if (L[1] === "lib") return [L[0], "lib", "widget", "pile"];
        if (L[1] === "same") return [L[0], "soft", "unchanged", "pile dim"];
        return [L[0], L[1] === "ui" ? "data" : L[1], L[1] === "data" || L[1] === "ui" ? "state" : L[1] === "missing" ? "state · left out" : "", "pile", link];   /* one state, so one colour: every line that writes, writes it */
      });
      return out;
    }
    function del(r) {
      var f = fRow(), was = f >= 0 ? items[f] : null, lines = [["s.items.remove(i)", "data"]], who = "row " + (r + 1) + "’s × button, on click:";
      if (evAt == null) evAt = rowY(r);
      F.headPulse(K.row(r));
      items.splice(r, 1);
      if (home === "table" && ui.focus != null && r <= ui.focus - 1) lines.push([r < ui.focus - 1 ? "s.focus -= 1" : "s.focus = …", "missing", "left out"]);
      else if (was) lines.push([home === "table" ? "the rows above didn’t move: nothing to fix" : home === "store" ? "s.focus names the item: nothing to fix" : "the focus is on the item: nothing to fix", "soft"]);
      var g = fRow(), now = g >= 0 ? items[g] : null;
      tone = null;
      if (!was) F.setNote("", "");
      else if (!now) F.setNote("bad", "The focused item is gone, and no line says where the focus goes.");
      else if (now === was) F.setNote("good", home === "store" ? "Your focus names the item, so it followed." : home === "items" ? "The focus is on the item, so it went with it." : "The focus is still on its item.");
      else { tone = "jumped"; F.setNote("bad", "The state says row " + ui.focus + ". Row " + ui.focus + " is now " + q(now.text) + "."); }
      handled(who, "action(s)", "the action you gave it:", lines, null, false, r);
    }
    K.on = function (ev) {
      if (closed) return;
      if (ev.type === "hot") { hot = ev.row; K.setHot(hot); return; }
      evAt = ev.type === "scroll" ? F.host : ev.row != null ? rowY(ev.row) : fRow() >= 0 ? rowY(fRow()) : F.host;
      if (ev.type === "scroll") { ui.scroll = ev.y; if (tone !== "jumped") F.setNote("", ""); handled("the list, on scroll:", "scroll(s, y)", "the scroll you gave it:", [["s.scroll = y", "ui"]], null, true); return; }
      var i = fRow();
      if (ev.type === "select") {
        tone = null; F.setNote("", "");
        var moved = i !== ev.row;
        setFocus(ev.row, ev.b, ev.a);
        if (moved) handled(box(ev.row) + ", on drag:", "focus(s, drag(x0, x))", "the focus you gave it:", focusCode(), null, home !== "items");
        else handled(box(ev.row) + ", on drag:", "change(s, text, drag(sel, x))", "the change you gave it:", [textCode(false), selCode()], null, home !== "items");
        return;
      }
      if (ev.type === "press") {
        if (ev.part === "x") { del(ev.row); return; }
        tone = null; F.setNote("", "");
        if (ev.part === "text") {   /* a box that has the focus was given `change`, and one that hasn't was given `focus` */
          setFocus(ev.row, ev.col);
          if (i === ev.row) handled(box(ev.row) + ", on click:", "change(s, text, caretAt(x))", "the change you gave it:", [textCode(false), selCode()]);
          else handled(box(ev.row) + ", on click:", "focus(s, caretAt(x))", "the focus you gave it:", focusCode());
        } else { items[ev.row].done = !items[ev.row].done; handled("row " + (ev.row + 1) + "’s checkbox, on click:", "toggle(s)", "the toggle you gave it:", [["s.items[i].done = !done", "data"]], ev.row); }
        return;
      }
      tone = null; F.setNote("", "");
      if (i < 0) { if (items.length && ev.type === "key" && /^(ArrowDown|ArrowUp|Enter)$/.test(ev.key)) { setFocus(0, items[0].text.length); rerun("no widget took the key. Your handler:", focusCode("end", "0")); } return; }
      var it = items[i], c = caret(), an = anchor();
      if (ev.type === "key" && ev.key === "Enter") {
        items.splice(i + 1, 0, { id: nextId++, text: "", done: false }); setFocus(i + 1, 0);
        handled(box(i) + ", on key:", "submit(s)", "the submit you gave it:", [["s.items.insert(i + 1, blank)", "data"]].concat(focusCode("start", "i + 1")), i + 1); return;
      }
      if (ev.type === "key" && ev.key === "Backspace" && it.text === "") {
        F.headPulse(K.row(i)); items.splice(i, 1);
        if (items.length) { var p = Math.max(0, i - 1); setFocus(p, items[p].text.length); } else setFocus(-1);
        rerun("the text box passed. Your handler, on backspace:", [["s.items.remove(i)", "data"]].concat(focusCode("end", "i - 1")), null, false, i); return;
      }
      if (ev.type === "key" && (ev.key === "ArrowUp" || ev.key === "ArrowDown")) {
        var n = i + (ev.key === "ArrowUp" ? -1 : 1);
        if (n >= 0 && n < items.length) { setFocus(n, Math.min(c, items[n].text.length)); rerun("the text box passed. Your handler, on key:", focusCode("sel", n < i ? "i - 1" : "i + 1")); }
        return;
      }
      var r = editLine(it.text, c, ev, an);
      if (!r) return;
      var wrote = r[0] !== it.text;
      it.text = r[0]; setCaret(r[1], r[2]);
      handled(box(i) + ", on key:", "change(s, edit(text, sel, key))", "the change you gave it:", [textCode(wrote), selCode()], wrote ? i : null);
    };

    /* What the script calls: the same input a reader's click or key sends, through the same door */
    M.focusRow = function (i) { K.on({ type: "press", part: "text", row: i, col: items[i].text.length }); };
    M.typeChar = function (i, ch) { if (fRow() !== i) setFocus(i, items[i].text.length); K.on({ type: "text", text: ch }); };
    M.select = function (i, a, b) { K.on({ type: "select", row: i, a: a, b: b }); };
    M.scrollTo = function (y) { K.on({ type: "scroll", y: y }); };
    M.removeAt = function (i) { K.on({ type: "press", part: "x", row: i }); };
    M.hot = function (i) { hot = i; K.setHot(i); };
    M.setScripted = K.scripted;
    M.blur = K.blur;
    M.home = function () { return home; };
    M.choose = function (name, val, live) {
      if (closed) { F.launch(); live = true; }
      var i = live ? fRow() : -1, c = i >= 0 ? rawCaret() : 0, a = i >= 0 ? rawAnchor() : 0, y = live && ui ? ui.scroll : 0;
      items.forEach(function (it) { delete it.ui; });
      home = val; ui = blank(); ui.scroll = y; tone = null;
      if (i >= 0) setFocus(i, c, a);
      buildPanel();
      if (live) { F.last = {}; F.setNote("", ""); F.lines("moved, and nothing else changed", []); rerun(null); }
    };
    /* There is one state, and saving it is one line. What shouldn't outlive the app (the focus, the caret, the selection,
       how far the list is scrolled) is stripped out first, so a smaller structure goes to disk. Loading builds the full
       state back from it, with those parts at their defaults. Keeping any of them would be a change to strip(). */
    M.quit = function () {
      var saved = { items: items.map(function (it) { return { id: it.id, text: it.text, done: it.done }; }) };
      K.blur(); K.draw({ rows: [], scroll: 0 }); closed = true;
      F.lines("on quit:", [["disk.save(strip(s))", "data", "state", "pile", { to: F.diskEl, near: 1 }]]);
      F.setNote("", ""); F.cardsOff();
      return { data: saved, ui: false };
    };
    M.launch = function (disk) {
      items = copyItems(disk.data.items); nextId = topId(items); ui = blank(); closed = false; hot = -1; tone = null;
      buildPanel(); F.last = {};
      rerun("on launch:", [["s = restore(disk.load())", "data"]]);
      F.setNote("", "strip() left the focus, caret, selection and scroll out, so they start over.");
    };
    M.reset = function () {
      items = startItems(); nextId = 9; ui = blank(); hot = -1; tone = null; closed = false;
      F.resetPanels(); buildPanel(); F.lines("nothing yet", []); rerun(null);
    };
    return M;
  }

  LiveFig("puri", {
    kit: true, label: "To-do list, Puri", where: "", keeps: "yours", mach: "the handler view(state) returned",
    link: { text: "view(state)", sub: "8 rows + handlers", from: function (F) { return [F.cards, F.ustate]; } },
    switches: [{ name: "home", label: "How the state holds the focus", options: [["store", "Focus by item id"], ["items", "Focus on the item"], ["table", "Focus by row"]] }],
    turn: "The app is live, and so is its state: change the caret’s number and the caret moves, or change the scroll’s and the list scrolls. The close box quits it and saves to disk, and the icon starts it again. Drag the slider to go back to the example.",
    machine: function (F) { return PuriMachine(F); },
    script: function (F) {
      return story(F, {
        cap: function (k) {
          var home = F.m.home();
          return {
            "1": "Click into “Fix scroll bug”. The handler that runs is the text box’s own, returned by the last view. It finds the column you clicked and passes it to the callback you gave it, which stores it. Then the view reruns, and returns the next handlers.",
            "2": "Type “today” at the end. The text box works out the new text and where the caret goes. Your callback only says where in the state they’re kept.",
            "3": "Select a word. The text box follows the drag and reports it through the same callback as a key: the text, unchanged, and a new selection.",
            "4a": "Delete “Call Phil”, the row above yours.",
            "4": home === "store" ? "Delete “Call Phil”, the row above yours. The focus names the item by its id, so the caret and selection stay with it."
              : home === "items" ? "Delete “Call Phil”, the row above yours. The focus sits on the item itself, so it goes where the item goes."
              : "Delete “Call Phil”, the row above yours. The state says row 3, and row 3 is now “Write essay”. It’s the same mismatch as before, and here it is one line in your own callback.",
            "5": "Scroll. The list reports where it should be, and your callback stores that: a number in the state, which the view reads.",
            "6a": "Quit the app with its close box.",
            "6q": "Quit the app with its close box. One line saves the state, with the parts that shouldn’t outlive the app stripped out first.",
            "6": "Launch it again. The state is built back from what was saved. The focus, caret, selection and scroll start over, as in every figure above, and here that is your choice: strip() is yours."
          }[k];
        }
      });
    }
  });

  /* ---------------------------------------------------------------------------------------------
     deui: every action is a change, a small value. A derivative turns the change into edits to
     the screen and to UI state, and nothing is rerun. The law says the result must equal a rerun.
     Here that is checked after each change, as an illustration. In a proved version it is a proof, checked before the program runs.
     --------------------------------------------------------------------------------------------- */
  function DeuiMachine(F) {
    var K = Kit(F), M = { pt: K.pt }, items = [], nextId = 9, ui = { focus: null, caret: 0, anchor: 0, scroll: 0 }, policy = "next", broken = false, wrong = false, closed = false;
    oneState(F);
    var SAYS = { next: "the next row takes the focus", prev: "the previous row takes the focus", none: "nothing has the focus" };
    var by = "click";   /* how the last change was made: with a click or with a key */
    var SHORT = { focus: "focus", caret: "caret", select: "select", scroll: "scroll", text: "insert", erase: "erase", cut: "erase", tick: "tick", del: "delete row", add: "add row" };
    /* The spec: the whole view, as a plain function of the data. Only the check calls it. */
    function spec() { return items.map(function (it) { return { text: it.text, done: it.done }; }); }
    function check(scrolled) {
      var want = spec(), got = K.snapshot();
      if (got.length !== want.length) return "the screen has " + count(got.length, "row") + ", and a rerun gives " + want.length;
      for (var i = 0; i < want.length; i++) if (got[i].text !== want[i].text || got[i].done !== want[i].done) return "row " + (i + 1) + " differs from a rerun";
      if (scrolled && K.scroll() !== Math.min(ui.scroll, K.maxScroll())) return "the list is scrolled to " + K.scroll() + " px, and a rerun gives " + ui.scroll;
      return null;
    }
    function label(ch) {
      var r = "row " + (ch.row + 1);
      return ch.type === "focus" ? "click " + r + ", col " + ch.col : ch.type === "caret" ? "move the caret to col " + ch.col
        : ch.type === "select" ? "select cols " + Math.min(ch.a, ch.b) + " to " + Math.max(ch.a, ch.b) + " in " + r : ch.type === "scroll" ? "scroll to " + ch.y + " px"
        : ch.type === "text" ? "insert " + q(ch.s) + " in " + r + ", col " + ch.col : ch.type === "erase" ? "erase col " + ch.col + " in " + r
        : ch.type === "cut" ? "erase cols " + ch.a + " to " + ch.b + " in " + r
        : ch.type === "tick" ? "tick " + r : ch.type === "del" ? "delete " + r : "add a row after " + r;
    }
    function panel() {
      var f = ui.focus, src = f == null ? null : K.row(f), st = f == null || !items[f] ? "none" : selText(items[f].text, ui.anchor, ui.caret);
      F.setU("focus", f == null ? "nothing" : "row " + (f + 1), f, src);
      F.setU("caret", f == null ? "—" : "col " + ui.caret, f == null ? "—" : ui.caret, src);
      F.setU("selection", st, st, src);
      F.setU("scroll", ui.scroll + " px", ui.scroll, null);
    }
    function sel() { return [ui.anchor, ui.caret]; }
    /* The derivative: one change in, edits out */
    var evAt = null;   /* where in the window the event being handled happened */
    function rowY(r) { var d = K.row(r); if (!d) return null; var b = F.box(d); return b.t + b.h / 2; }
    function rowAt(r) { return function () { return K.row(r) || F.host; }; }
    function step(ch) {
      var scr = [], uis = [], f = ui.focus, r = ch.row, n, at = null, fixed = wrong, ev = evAt, gone = null; evAt = null;
      function text() { K.setText(r, items[r].text); }
      function caretTo(c) { return function () { ui.caret = ui.anchor = c; }; }
      if (wrong) { K.draw({ rows: spec(), scroll: ui.scroll }); wrong = false; }   /* a wrong screen can't take edits, so the figure redraws it first */
      F.setNote("", "");
      if (ch.type === "focus") {
        uis.push(["focus: " + (f == null ? "nothing" : "row " + (f + 1)) + " → row " + (r + 1), function () { ui.focus = r; }]);
        uis.push(["caret: → col " + ch.col, caretTo(ch.col)]);
      } else if (ch.type === "caret") {
        uis.push(["caret: col " + ui.caret + " → col " + ch.col, caretTo(ch.col)]);
      } else if (ch.type === "select") {
        if (f !== r) uis.push(["focus: " + (f == null ? "nothing" : "row " + (f + 1)) + " → row " + (r + 1), function () { ui.focus = r; }]);
        uis.push(["selection: cols " + Math.min(ch.a, ch.b) + " to " + Math.max(ch.a, ch.b), function () { ui.anchor = ch.a; ui.caret = ch.b; }]);
      } else if (ch.type === "scroll") {
        n = ch.y - ui.scroll;
        uis.push(["scroll: " + ui.scroll + " → " + ch.y + " px", function () { ui.scroll = ch.y; }]);
        scr.push(["shift the list " + Math.abs(n) + " px " + (n > 0 ? "up" : "down"), function () { K.setScroll(ch.y); }, F.host]);
      } else if (ch.type === "text") {
        items[r].text = items[r].text.slice(0, ch.col) + ch.s + items[r].text.slice(ch.col); at = r;
        scr.push(["row " + (r + 1) + ": insert " + q(ch.s) + " at col " + ch.col, text, rowAt(r)]);
        if (f === r && ui.caret >= ch.col) uis.push(["caret: col " + ui.caret + " → col " + (ui.caret + ch.s.length), caretTo(ui.caret + ch.s.length)]);
      } else if (ch.type === "erase") {
        items[r].text = items[r].text.slice(0, ch.col) + items[r].text.slice(ch.col + 1); at = r;
        scr.push(["row " + (r + 1) + ": remove col " + ch.col, text, rowAt(r)]);
        if (f === r && ui.caret > ch.col) uis.push(["caret: col " + ui.caret + " → col " + (ui.caret - 1), caretTo(ui.caret - 1)]);
      } else if (ch.type === "cut") {
        items[r].text = items[r].text.slice(0, ch.a) + items[r].text.slice(ch.b); at = r;
        scr.push(["row " + (r + 1) + ": remove cols " + ch.a + " to " + ch.b, text, rowAt(r)]);
        uis.push(["caret: → col " + ch.a + ", and no selection", caretTo(ch.a)]);
      } else if (ch.type === "tick") {
        items[r].done = !items[r].done; at = r;
        scr.push(["row " + (r + 1) + ": " + (items[r].done ? "tick" : "untick"), function () { K.setDone(r, items[r].done); }, rowAt(r)]);
      } else if (ch.type === "del") {
        n = items.length - 1 - r; gone = rowY(r);
        F.headPulse(K.row(r));
        items.splice(r, 1);
        if (!broken) {
          scr.push(["remove row " + (r + 1), function () { K.removeRow(r); }, gone, -20]);   /* the arrow points between the rows it stood between */
          if (n > 0) scr.push(["move " + count(n, "row") + " up", function () {}, rowAt(r + 1)]);
        }
        if (f != null && f > r) {
          uis.push(["focus: row " + (f + 1) + " → row " + f, function () { ui.focus = f - 1; }]);
          F.setNote("good", "The change says a row above went, so the focus moves from row " + (f + 1) + " to row " + f + ".");
        } else if (f === r) {   /* the change and the focus collide, and the policy decides */
          var to = policy === "none" || !items.length ? null : policy === "prev" ? Math.max(0, r - 1) : Math.min(r, items.length - 1);
          uis.push(["focus: " + (to == null ? "cleared" : policy === "prev" ? "the previous row takes it" : "the next row takes it"), function () { ui.focus = to; ui.caret = ui.anchor = to == null ? 0 : items[to].text.length; }]);
          F.setNote("", "Your row went. The policy decided where the focus goes.");
        }
      } else if (ch.type === "add") {
        n = items.length - 1 - r;
        items.splice(r + 1, 0, { id: nextId++, text: "", done: false }); at = r + 1;
        scr.push(["insert a row at " + (r + 2), function () { K.insertRow(r + 1, { text: "", done: false }); }, rowAt(r + 1)]);
        if (n > 0) scr.push(["move " + count(n, "row") + " down", function () {}, rowAt(r + 2)]);
        uis.push(["focus: row " + (r + 1) + " → row " + (r + 2), function () { ui.focus = r + 1; ui.caret = ui.anchor = 0; }]);
      }
      scr.forEach(function (e) { e[1](); });
      uis.forEach(function (e) { e[1](); });
      K.setFocus(ui.focus == null ? -1 : ui.focus, ui.caret, null, sel());
      /* What ran. The figure is a square. Along the top are the two things there are, the state and the screen, joined by
         the view. Along the bottom are their two changes, joined by the view's derivative. Each change is applied to the
         thing above it, and that is one arrow a side, with a branch for each place it lands. */
      var data = !/^(focus|caret|select|scroll)$/.test(ch.type), bad = check(ch.type === "scroll"), slipOf = function (t) { return F.u[/^focus/.test(t) ? "focus" : /^caret/.test(t) ? "caret" : /^selection/.test(t) ? "selection" : "scroll"]; };
      /* The first panel: the change to the state, an edit a line. */
      var lines = [[label(ch), "data", data ? "state" : "", data ? "pile" : ""]], n1;
      uis.forEach(function (e) { lines.push([e[0], "data", "state", "pile"]); });
      n1 = lines.length;
      /* Where its edits land: an item's card (or the gap a deleted one left), and a slip for each of the others */
      var lands = (data ? [at != null ? { el: function () { return F.cards.children[at]; } } : ch.type === "del" ? F.gapAt(r) : { el: F.dataHead }] : []).concat(uis.map(function (e) { return { el: slipOf(e[0]) }; }));
      var toState = function () {
        var first = F.mach.firstElementChild, src = first ? F.box(first) : null, cards = F.box(F.cards), slips = F.box(F.ustate);
        if (!src) return [];
        if (F.stacked()) return lands.map(function (t) { return { from: first, to: t.el || t.to, toY: t.toY, c: "data" }; });
        var gx = Math.round(slips.l - 11), y0 = Math.round(src.t + src.h / 2);   /* one trunk, up the gutter between the cards and the slips */
        return lands.map(function (t) {
          var e = t.el ? (typeof t.el === "function" ? t.el() : t.el) : null, b = e ? F.box(e) : null, y = b ? b.t + b.h / 2 : t.toY(), left = b ? b.l < gx : true;
          return y == null ? null : { c: "data", hit: e, pts: [[src.l - 2, y0], [gx, y0], [gx, y], [left ? (b ? b.r : cards.r) + 3 : b.l - 3, y]] };
        }).filter(Boolean);
      };
      /* The second, across the derivative: the edits to the screen, then whether they add up to a rerun. */
      if (fixed) lines.push(["the screen was wrong, so it was redrawn first", "soft", "", "", null, 2]);
      var e0 = lines.length;
      scr.forEach(function (e) { lines.push([e[0], "view", "", "", null, 2]); });
      if (broken && ch.type === "del") lines.push(["remove row " + (r + 1), "missing", "left out", "pile", { to: F.win, toY: gone, miss: 1, side: "r" }, 2]);
      var toScreen = function () {
        var first = F.mach2.children[e0 - n1];
        return first && scr.length ? [{ from: first, to: F.win, comb: scr.map(function (e) { return e[3] ? function () { return (typeof e[2] === "function" ? F.box(e[2]()).t : e[2]) + e[3]; } : e[2]; }), clip: F.host, c: "scr", side: "r" }] : [];
      };
      var c0 = lines.length;
      lines.push(bad ? ["✗ " + bad, "bad", "", "", null, 2] : ["✓ same as rerunning the view", "good", "", "", null, 2]);
      wrong = !!bad;
      if (bad) F.setNote("bad", "The screen is wrong now. With a proof checker, this derivative would be rejected before it ever ran.");
      F.lines("on " + (ch.type === "scroll" ? "scroll" : ch.type === "select" ? "select" : by) + ": one change", lines, { ev: ev, cross: true, sum2: count(scr.length, "edit") + " · reran 0 rows", more: [{ at: n1, now: 1, arrows: toState }, { at: c0, now: 1, arrows: toScreen }] });
      panel();
      if (data) F.cardsFor(items, at, at != null ? K.row(at) : null);
    }
    K.on = function (ev) {
      if (closed) return;
      if (ev.type === "hot") { K.setHot(ev.row); return; }
      evAt = ev.type === "scroll" ? F.host : ev.row != null ? rowY(ev.row) : ui.focus != null ? rowY(ui.focus) : F.host;
      if (ev.type === "scroll") { if (ev.y !== ui.scroll) step({ type: "scroll", y: ev.y }); return; }
      if (ev.type === "select") { step({ type: "select", row: ev.row, a: ev.a, b: ev.b }); return; }
      by = ev.type === "press" ? "click" : "key";
      var f = ui.focus;
      if (ev.type === "press") { step({ type: ev.part === "text" ? "focus" : ev.part === "check" ? "tick" : "del", row: ev.row, col: ev.col }); return; }
      if (f == null) { if (items.length && ev.type === "key" && /^(ArrowDown|ArrowUp|Enter)$/.test(ev.key)) step({ type: "focus", row: 0, col: items[0].text.length }); return; }
      var t = items[f].text, c = Math.min(ui.caret, t.length), an = Math.min(ui.anchor, t.length), lo = Math.min(c, an), hi = Math.max(c, an);
      if (ev.type === "text") { if (lo !== hi) step({ type: "cut", row: f, a: lo, b: hi }); step({ type: "text", row: f, col: lo, s: ev.text }); }
      else if (ev.key === "Enter") step({ type: "add", row: f });
      else if (ev.key === "Backspace") { if (lo !== hi) step({ type: "cut", row: f, a: lo, b: hi }); else if (c > 0) step({ type: "erase", row: f, col: c - 1 }); else if (t === "") step({ type: "del", row: f }); }
      else if (ev.key === "Delete") { if (lo !== hi) step({ type: "cut", row: f, a: lo, b: hi }); else if (c < t.length) step({ type: "erase", row: f, col: c }); }
      else if (ev.key === "ArrowUp" || ev.key === "ArrowDown") { var n = f + (ev.key === "ArrowUp" ? -1 : 1); if (n >= 0 && n < items.length) step({ type: "focus", row: n, col: Math.min(c, items[n].text.length) }); }
      else { var r = editLine(t, c, ev, an); if (r && (r[1] !== c || r[2] !== an)) step(r[1] === r[2] ? { type: "caret", row: f, col: r[1] } : { type: "select", row: f, a: r[2], b: r[1] }); }
    };

    /* What the script calls: the same input a reader's click or key sends, through the same door */
    M.focusRow = function (i) { K.on({ type: "press", part: "text", row: i, col: items[i].text.length }); };
    M.typeChar = function (i, ch) { if (ui.focus !== i) { ui.focus = i; ui.caret = ui.anchor = items[i].text.length; } K.on({ type: "text", text: ch }); };
    M.select = function (i, a, b) { K.on({ type: "select", row: i, a: a, b: b }); };
    M.scrollTo = function (y) { K.on({ type: "scroll", y: y }); };
    M.removeAt = function (i) { if (i < items.length) K.on({ type: "press", part: "x", row: i }); };
    M.hot = function (i) { K.setHot(i); };
    M.setScripted = K.scripted;
    M.blur = K.blur;
    M.broken = function () { return broken; };
    M.choose = function (name, val) {
      if (name !== "policy") { broken = !!val; return; }
      policy = val;
      if (!closed) F.setNote("", "If you delete the row you’re in, " + SAYS[val] + ". Try it.");
    };
    /* One state, saved in one line with what shouldn't outlive the app stripped out of it. Launching builds the state
       back and draws the whole view once, the only time it is ever run. */
    M.quit = function () {
      var saved = { items: items.map(function (it) { return { id: it.id, text: it.text, done: it.done }; }) };
      K.blur(); K.draw({ rows: [], scroll: 0 }); closed = true; wrong = false;
      F.lines("on quit:", [["disk.save(strip(s))", "data", "state", "pile", { to: F.diskEl, near: 1 }]]);
      F.setNote("", ""); F.cardsOff();
      F.setU("focus", "nothing", null, null); F.setU("caret", "—", "—", null); F.setU("selection", "none", "none", null); F.setU("scroll", "0 px", 0, null);
      return { data: saved, ui: false };
    };
    M.launch = function (disk) {
      items = copyItems(disk.data.items); nextId = topId(items); ui = { focus: null, caret: 0, anchor: 0, scroll: 0 }; closed = false;
      K.draw({ rows: spec(), scroll: 0 }); K.setHot(-1); K.setFocus(-1, 0, null, sel());
      F.lines("on launch:", [["s = restore(disk.load())", "data", "state", "pile", { to: F.dataHead }]], { fire: true, sum2: "none: the whole view ran, this once" });
      F.last = {}; panel(); F.cardsFor(items);
      F.setNote("", "strip() left the focus, caret, selection and scroll out, so they start over.");
    };
    M.reset = function () {
      items = startItems(); nextId = 9; ui = { focus: null, caret: 0, anchor: 0, scroll: 0 }; wrong = false; closed = false;
      F.resetPanels();
      K.draw({ rows: spec(), scroll: 0 });
      K.setHot(-1);
      F.lines("nothing yet", [], { sum2: "nothing yet" });
      panel(); F.cardsFor(items);
    };
    return M;
  }

  LiveFig("deui", {
    kit: true, label: "To-do list, deui", where: "", keeps: "yours", mach: "the state’s change", two: "the screen’s change",
    /* Two ways to the screen. The function, view, takes the state and gives the whole screen: it runs at launch and never again.
       Its derivative takes the state as it was and its change, and gives the screen's change: it runs on every change. */
    link: { text: "view(state)", sub: "the function · at launch only", from: function (F) { return [F.cards, F.ustate]; } },
    cross: { text: "dview(state, change)", sub: "its derivative · every change", dy: -22 },
    fields: [["focus", "focus", "nothing"], ["caret", "caret", "—"], ["selection", "selection", "none"], ["scroll", "scroll", "0 px"]],
    /* The policy is for a step the shared script doesn't have, deleting the row you're in, so its switch doesn't replay anything */
    switches: [{ name: "policy", quiet: true, label: "If your own row is deleted", show: "If your row is deleted:", options: [["next", "Next row"], ["prev", "Previous row"], ["none", "No focus"]] }],
    toggles: [{ name: "broken", off: "Break the derivative", on: "Fix the derivative" }],
    turn: "The app is live: type, select, scroll, delete, add a row with Enter. Delete the row you’re in to see the policy at work. The close box quits it and saves to disk, and the icon starts it again. Drag the slider to go back to the example.",
    machine: function (F) { return DeuiMachine(F); },
    script: function (F) {
      return story(F, {
        cap: function (k) {
          return {
            "1": "Click into “Fix scroll bug”. A click is a change to the state, and it’s applied directly. The view function isn’t run: it ran at launch, and from here on only its derivative does.",
            "2": "Type “today” at the end. Each key is one small change. The derivative takes the state as it was and the change, and gives one edit to the screen.",
            "3": "Select a word. Another change to the state, applied directly. Nothing is rerun.",
            "4a": "Delete “Call Phil”, the row above yours.",
            "4": F.m.broken()
              ? "Delete “Call Phil”, the row above yours. This derivative leaves out the edit that takes the row off the screen, the same kind of slip as in retained mode. Here the check sees at once that the screen no longer matches a rerun."
              : "Delete “Call Phil”, the row above yours. The change says which row went, so the screen gets two edits, your focus moves from row 3 to row 2 with its caret and selection, and nothing is rerun.",
            "5": "Scroll. One more change, and the derivative turns it into one edit to the screen: shift the list.",
            "6a": "Quit the app with its close box.",
            "6q": "Quit the app with its close box. One line saves the state, with the parts that shouldn’t outlive the app stripped out first.",
            "6": "Launch it again. The state is built back from what was saved, and the view function runs on it, this once. Every change after this goes by the derivative."
          }[k];
        }
      });
    }
  });

