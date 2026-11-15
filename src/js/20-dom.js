  /* ---------------------------------------------------------------------------------------------
     Retained mode: real text boxes, kept by the browser, and handlers that pass each change on by
     hand: one line for the data, one for the screen. The top figure uses this machine as it is. The
     retained-mode figure also shows the handlers, each line labelled with what it edits, and has a
     switch that leaves the screen's line out of the delete handler: the item leaves the data and
     its row stays on the screen. Nothing in the toolkit notices, and the row is there until the
     app is relaunched and the screen is built again from the data.
     --------------------------------------------------------------------------------------------- */
  function DomMachine(F, opt) {
    var list = F.host, items = [], nextId = 1, hover = -1, scripted = true, M = { pt: {} };
    var slip = false;   /* the figure's switch: leave the screen's line out of the delete handler */
    var shut = false;   /* the app has quit: what its widgets lose then is not something a widget did */
    var by = lastInput(list);   /* a click, a key or a drag: how the reader last touched the list */
    var EDITS = { data: "app state", view: "screen", ui: "UI state" };   /* what a line edits, by its kind */
    function row(i) { return list.children[i]; }
    function idx(n) {
      var li = n && n.closest ? n.closest("li") : null;
      return li && li.parentNode === list && li._inp ? Array.prototype.indexOf.call(list.children, li) : -1;
    }
    function rowOf(it) { for (var i = 0; i < list.children.length; i++) if (list.children[i]._it === it) return list.children[i]; return null; }
    /* While a figure measures itself it is inert and can't take the focus, so the row the script would
       have focused is only remembered. What the figure shows then is what it will show for real. */
    var ghost = null;
    function focusedLi() {
      if (ghost && !F.stage.inert) ghost = null;
      if (ghost) return ghost.isConnected ? ghost : null;
      var a = document.activeElement; return a && list.contains(a) ? a.closest("li") : null;
    }
    function take(box, li) { if (F.stage.inert) ghost = li; else if (document.activeElement !== box) box.focus({ preventScroll: true }); }
    function makeRow(it) {
      var li = document.createElement("li");
      var cb = h("input", null, null, li); cb.type = "checkbox"; cb.checked = it.done; cb.setAttribute("aria-label", "Done");
      var inp = h("input", null, null, li); inp.type = "text"; inp.value = it.text; inp.spellcheck = false; inp.autocomplete = "off";
      if (scripted && coarse) inp.setAttribute("inputmode", "none");
      var x = h("button", "x", "×", li); x.type = "button"; x.setAttribute("aria-label", "Delete");
      if (it.done) li.className = "done";
      li._cb = cb; li._inp = inp; li._it = it;
      return li;
    }
    function tidy() {
      var e = list.querySelector(".empty");
      if (items.length && e) e.remove();
      if (!items.length && !e) { e = h("li", "empty", null, list); h("button", "add", "+ Add a row", e).type = "button"; }
      each(list.children, function (li, i) { if (li._inp) li._inp.setAttribute("aria-label", "To-do " + (i + 1)); });
    }
    function build() { list.textContent = ""; items.forEach(function (it) { list.appendChild(makeRow(it)); }); tidy(); }
    function focusLi(li, col) {
      if (!li || !li._inp) return;
      take(li._inp, li);
      var c = col == null ? li._inp.value.length : Math.min(col, li._inp.value.length);
      li._inp.setSelectionRange(c, c);
      var lb = list.getBoundingClientRect(), rb = li.getBoundingClientRect();
      if (rb.top < lb.top) list.scrollTop -= lb.top - rb.top + 6;
      else if (rb.bottom > lb.bottom) list.scrollTop += rb.bottom - lb.bottom + 6;
    }
    /* Rows the screen still shows for items the data no longer holds: the screen and the data have drifted */
    function stale() { return Array.prototype.filter.call(list.children, function (li) { return li._it && items.indexOf(li._it) < 0; }); }
    /* Where in the data a new item goes, to stand after this row. A stale row has no place of its own, so the row above it decides. */
    function after(li) { for (var r = li; r; r = r.previousElementSibling) { var k = r._it ? items.indexOf(r._it) : -1; if (k >= 0) return k + 1; } return 0; }

    /* A handler is a list of hand-written lines: [the code, what it edits, what it does, left out?].
       A line that was left out is shown, but doesn't run. Each line gets an arrow to what it edits:
       a card in app state, the window at the row it changed, or a slip of UI state. `at` says where
       on the screen: { ev: the row the event came from, row: the row the handler changed }. */
    function run(name, lines, it, at) {
      at = at || {};
      lines.forEach(function (L) { if (!L[3]) L[2](); });
      tidy();
      /* A stale row is not marked in the window. The app can't tell it from any other row, and that is the trouble with it.
         The left-out line's arrow points at it, and the note names it. */
      var lost = stale(), orphan = !!it && items.indexOf(it) < 0;   /* the event came from a stale row: its item is in nobody's data */
      if (opt.code) {
        var card = function () { var i = it ? items.indexOf(it) : -1; return i >= 0 ? F.cards.children[i] : F.dataHead; };
        var launch = name === "on launch:";   /* the one time build() runs: the dormant link across the gap wakes up */
        F.lines(name, lines.map(function (L) {
          if (L[1] === "data" && (orphan || at.gone)) return [L[0], "soft", "no such item", "pile dim", null];   /* the line ran, and found nothing to edit */
          var link = launch ? (L[1] === "data" ? { to: F.dataHead } : null)
            : L[1] === "data" ? (at.gap == null ? { to: card } : F.gapAt(at.gap))
            : L[1] === "view" ? { to: F.win, toY: at.row, dy: at.gap != null && !L[3] ? -20 : 0, miss: L[3] ? 1 : 0 }   /* a row that went: between its neighbours. A row that should have gone: the row itself. */
            : { to: function () { return F.u.focus; } };
          return [L[0], L[3] ? "missing" : L[1], EDITS[L[1]] + (L[3] ? " · left out" : ""), "pile", link];
        }), { ev: at.ev, fire: launch, brief: at.burst ? { run: at.burst } : null });
        F.setNote(lost.length ? "bad" : "", lost.length ? q(lost[0]._it.text) + " is still on the screen. It’s gone from the data." : "");
      }
      var at = it ? items.indexOf(it) : -1;
      F.cardsFor(items, at >= 0 ? at : null, it ? rowOf(it) : null);
      sync(true);
    }
    function onInput(li) {
      run("on input(i):", [["items[i].text = rows[i].box.text", "data", function () { li._it.text = li._inp.value; }]], li._it, { ev: li, burst: "input:" + li._it.id });   /* keys typed into one box are one burst */
    }
    function onTick(li) {
      run("on tick(i):", [
        ["items[i].done = rows[i].tick.on", "data", function () { li._it.done = li._cb.checked; }],
        ["rows[i].strike(items[i].done)", "view", function () { li.classList.toggle("done", li._it.done); }]], li._it, { ev: li, row: li });
    }
    function onDelete(li, refocus) {
      if (!li || !li._it) return;
      var it = li._it, k = items.indexOf(it), pos = idx(li), b = F.box(li), y = b.t + b.h / 2;   /* where the row was, for the arrows: it may be gone by the time they are drawn */
      if (k >= 0) F.headPulse(li);
      var lines = [
        ["items.remove(i)", "data", function () { if (k >= 0) items.splice(k, 1); }],
        ["rows[i].remove()", "view", function () { list.removeChild(li); }, slip]];
      if (refocus != null) lines.push(["rows[" + (refocus < pos ? "i - 1" : "i") + "].box.focus()", "ui", function () { var n = list.querySelectorAll("li:not(.empty)"); if (n.length) focusLi(n[Math.max(0, Math.min(refocus, n.length - 1))]); }]);
      run("on delete(i):", lines, null, { ev: y, row: y, gap: k >= 0 ? k : null, gone: k < 0 });
      var fl = focusedLi(), box = fl && fl._inp;
      if (opt.code && refocus == null && !stale().length && box) F.setNote("good", box.selectionStart !== box.selectionEnd ? "Your caret and selection never moved. They live in the box they were in." : "Your caret never moved. It lives in the box it was in.");
    }
    function onEnter(li) {
      var it = { id: nextId++, text: "", done: false }, fresh = null;
      run("on enter(i):", [
        ["items.insert(i + 1, blank)", "data", function () { items.splice(li ? after(li) : 0, 0, it); }],
        ["rows.insert(i + 1, row(blank))", "view", function () { var e = list.querySelector(".empty"); if (e) e.remove(); fresh = makeRow(it); list.insertBefore(fresh, li ? li.nextSibling : list.firstChild); }],
        ["rows[i + 1].box.focus()", "ui", function () { focusLi(fresh, 0); }]], it, { ev: li, row: function () { return fresh; } });
    }

    /* The readout: UI state, read back from the widgets that keep it */
    function setViews(n) {
      if (F.last.views === n) return;
      F.last.views = n;
      var dd = F.u.views.querySelector("dd");
      dd.textContent = ""; dd.className = "ticks";
      for (var i = 0; i < Math.min(n, 12); i++) h("span", "tick", null, dd);
      if (n > 12) dd.appendChild(document.createTextNode("+" + (n - 12)));
      if (n === 0) dd.textContent = "none";
      dd.setAttribute("aria-label", n + " row views");
      F.flash(F.u.views); F.route(null, F.u.views, "ui");
    }
    /* What the widgets did by themselves, with no handler involved. That is this approach's answer to
       "where does UI state live?", so the handler panel says so each time it happens. */
    var OWN = { focus: "the box took the focus", caret: "the box moved its caret", selection: "the box holds its selection", scroll: "the list scrolled itself" };
    var seen = null;
    function sync(byHandler) {
      if (F.bar.contains(document.activeElement)) return;   /* the slider has the keyboard: keep showing the script's state */
      var li = focusedLi(), a = ghost && li ? li._inp : document.activeElement, i = li ? idx(li) : -1, f = "nothing", c = "—", s = "none";
      if (li && i >= 0) {
        if (a === li._inp) {
          f = q(a.value);   /* named by its text, not its row number: deleting the row above must not look like a change of focus */
          c = "col " + (a.selectionDirection === "backward" ? a.selectionStart : a.selectionEnd);
          if (a.selectionStart !== a.selectionEnd) s = q(a.value.slice(a.selectionStart, a.selectionEnd), 14);
        } else f = a === li._cb ? "a checkbox" : "a delete button";
      } else li = null;
      var sc = Math.round(list.scrollTop) + " px";
      if (F.u.views) setViews(list.querySelectorAll("li:not(.empty)").length);
      F.setU("focus", f, li ? li._it : null, li);
      F.setU("caret", c, c, li);
      F.setU("selection", s, s, li);
      F.setU("scroll", sc, sc, null);
      if (F.u.hover) {
        var hv = hover >= 0 ? "row " + (hover + 1) : "nothing";
        if (F.last.hover !== hv) { F.last.hover = hv; F.u.hover.querySelector("dd").textContent = hv; F.flash(F.u.hover); }
      }
      if (opt.code) {
        var now = { focus: f, selection: s, scroll: sc, caret: c };
        if (!byHandler && seen && !shut) {
          var what = ["focus", "selection", "scroll", "caret"].filter(function (k) { return seen[k] !== now[k]; })[0];
          if (what && !(what === "focus" && f === "nothing")) {
            var ev = what === "scroll" ? "scroll" : what === "selection" ? "select" : by.get() === "key" ? "key" : "click";   /* what the reader did, for the log */
            /* and so no arrows: the window changed its own drawer. A click is one thing. A drag, a scroll, a caret walked along a box are each one gesture, however many times we hear of it. */
            F.lines(ev + ": no handler ran", [[OWN[what], "soft", EDITS.ui, "pile"]], { brief: { name: ev, note: "no handler", once: true, run: what === "focus" ? null : what + ":" + (li ? li._it.id : "list") } });
            if (!stale().length) F.setNote("", "");   /* the last handler's note is about the last handler */
          }
        }
        seen = now;
      }
    }

    list.addEventListener("input", function (e) { var li = row(idx(e.target)); if (e.target.type === "text" && li) onInput(li); });
    list.addEventListener("change", function (e) { var li = row(idx(e.target)); if (e.target.type === "checkbox" && li) onTick(li); });
    /* A click on a delete button leaves the focus where it was, in every figure, which is also what the script's click does.
       (In the top figure a checkbox still takes the focus when clicked: it is there to show focus on something other than text.) */
    list.addEventListener("mousedown", function (e) { if (e.target.closest(".x") || (!opt.full && e.target.type === "checkbox")) e.preventDefault(); });
    list.addEventListener("click", function (e) {
      var x = e.target.closest(".x");
      if (x) { var i = idx(x); onDelete(row(i), document.activeElement === x ? i : null); return; }   /* reached by keyboard, the button holds the focus and is about to go, so a row takes it */
      if (e.target.closest(".add")) onEnter(null);
    });
    list.addEventListener("keydown", function (e) {
      var t = e.target, i = idx(t);
      if (t.type !== "text" || i < 0) return;
      var n = list.querySelectorAll("li:not(.empty)").length;
      if (e.key === "Enter") { e.preventDefault(); onEnter(row(i)); }
      else if (e.key === "Backspace" && t.value === "") { e.preventDefault(); onDelete(row(i), i - 1); }
      else if (e.key === "ArrowUp" && i > 0) { e.preventDefault(); focusLi(row(i - 1), t.selectionStart); sync(); }
      else if (e.key === "ArrowDown" && i < n - 1) { e.preventDefault(); focusLi(row(i + 1), t.selectionStart); sync(); }
    });
    ["keyup", "mouseup", "select", "focusin", "scroll"].forEach(function (ev) { list.addEventListener(ev, function () { setTimeout(sync, 0); }); });
    list.addEventListener("focusout", function (e) { if (!F.bar.contains(e.relatedTarget)) setTimeout(sync, 0); });
    document.addEventListener("selectionchange", function () { if (list.contains(document.activeElement)) sync(); });
    if (opt.full) {
      list.addEventListener("mousemove", function (e) { if (F.playing) return; var i = idx(e.target); if (i !== hover) { hover = i; sync(); } });
      list.addEventListener("mouseleave", function () { if (F.playing) return; if (hover !== -1) { hover = -1; sync(); } });
    }

    /* What the script calls. Rows are named by where they are on the screen. */
    M.focusRow = function (i, col) { by.set("click"); focusLi(row(i), col); sync(); };
    M.typeChar = function (i, ch) {
      var li = row(i);
      if (!li || !li._inp) return;
      by.set("key");
      take(li._inp, li);
      li._inp.value += ch;
      var n = li._inp.value.length; li._inp.setSelectionRange(n, n);
      onInput(li);
    };
    M.removeAt = function (i) { by.set("click"); onDelete(row(i), null); };
    M.select = function (i, a, b) {
      var li = row(i);
      if (!li || !li._inp) return;
      by.set("drag");
      take(li._inp, li);
      li._inp.setSelectionRange(a, b, "forward"); sync();
    };
    M.scrollTo = function (y) { list.scrollTop = y; sync(); };
    M.hover = function (i) { hover = i; sync(); };
    M.hot = function (i) {
      each(list.children, function (li, j) { li.classList.toggle("hot", j === i); });
      if (F.u.hover && !F.off && hover !== i) { hover = i; sync(); }   /* the script's pointer is a pointer too */
    };
    M.setScripted = function (on) {
      scripted = on;
      each(list.querySelectorAll('input[type="text"]'), function (inp) { if (on && coarse) inp.setAttribute("inputmode", "none"); else inp.removeAttribute("inputmode"); });
    };
    M.blur = function () { ghost = null; if (list.contains(document.activeElement)) document.activeElement.blur(); };
    M.choose = function (name, val) { if (name === "slip") slip = !!val; };
    M.slip = function () { return slip; };

    /* Quitting saves the data. The widgets, and the UI state inside them, are simply gone. */
    M.quit = function () {
      var had = !!focusedLi();
      M.blur();
      var saved = items.map(function (it) { return { id: it.id, text: it.text, done: it.done }; }), lost = stale().map(function (li) { return li._it.text; });
      list.textContent = ""; hover = -1; shut = true;
      if (opt.code) F.lines("on quit:", [["disk.save(items)", "data", EDITS.data, "pile", { to: F.diskEl }]]);
      F.setNote("", "");
      F.cardsOff(); sync();
      return { data: saved, gone: lost, had: had, ui: false };
    };
    M.launch = function (disk) {
      items = disk.data.map(function (d) { nextId = Math.max(nextId, d.id + 1); return { id: d.id, text: d.text, done: d.done }; });
      shut = false;
      run("on launch:", [["items = disk.load()", "data", function () {}], ["rows = build(items)", "view", build]], null);
      if (opt.code && disk.gone && disk.gone.length) F.setNote("", q(disk.gone[0]) + " is gone now. The screen was rebuilt from the data.");
      else if (opt.code && disk.had) F.setNote("", "The UI state started over. It lived in the widgets.");
    };
    M.reset = function () {
      M.blur();
      nextId = 1; items = opt.items.map(function (s) { return { id: nextId++, text: s, done: false }; });
      hover = -1; shut = false; build(); list.scrollTop = 0; seen = null;
      F.resetPanels(); F.cardsFor(items);
      if (opt.code) F.lines("nothing yet", []);
      sync();
    };

    /* Where the script's pointer goes */
    function textX(inp, s) {
      var cs = getComputedStyle(inp), b = F.box(inp);
      measure.font = cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
      return b.l + parseFloat(cs.paddingLeft || "0") + measure.measureText(s).width;
    }
    M.pt.text = function (i, k) { var inp = row(i)._inp, b = F.box(inp); return [textX(inp, k == null ? inp.value : inp.value.slice(0, k)) + 1, b.t + b.h / 2 + 3]; };
    M.pt.x = function (i) { var b = F.box(row(i).querySelector(".x")); return [b.l + b.w / 2 + 1, b.t + b.h / 2 + 3]; };
    M.pt.check = function (i) { var b = F.box(row(i)._cb); return [b.l + b.w / 2 + 1, b.t + b.h / 2 + 2]; };
    M.pt.rest = function () { var w = F.box(F.win); return [w.l + w.w * 0.62, w.b + 26]; };
    M.pt.list = function (fx, fy) { var b = F.box(list); return [b.l + b.w * fx, b.t + b.h * fy]; };
    M.pt.row = function (i, fx) { var b = F.box(row(i)); return [b.l + b.w * fx, b.t + b.h / 2]; };
    return M;
  }

  /* The top figure: the app, and both piles */
  LiveFig("piles", {
    cls: "full", label: "To-do list", noAuto: coarse,
    fields: [["views", "views"], ["focus", "focus", "nothing"], ["caret", "caret", "—"], ["selection", "selection", "none"], ["scroll", "scroll", "0 px"], ["hover", "pointer over", "nothing"]],
    foot: "Enter adds a row · Backspace on an empty row removes it",
    turn: "The app is live: click a row, type, select a word, scroll, tick something off, add a row with Enter. The close box quits it, and the icon starts it again. Drag the slider to go back to the example.",
    machine: function (F) { return DomMachine(F, { items: EIGHT, full: true }); },
    script: function (F) {
      return story(F, {
        cap: function (k) {
          return {
            "1": "Click into a row. Focus and a caret appear in UI state. App state doesn’t change.",
            "2": "Type. The text changes in app state, and the caret moves in UI state.",
            "3": "Select a word. Only UI state changes.",
            "4a": "Delete the row above yours.",
            "4": "Delete the row above yours. App state loses an item, and the list loses a row. Your caret and your selection stay where they were.",
            "5": "Scroll. Only UI state changes.",
            "6a": "Quit the app with its close box.",
            "6q": "Quit the app with its close box. App state is saved to disk. UI state isn’t. It goes with the widgets that held it.",
            "6": "Launch it again. App state comes back from disk. The UI state is new: no focus, no selection, scrolled to the top."
          }[k];
        }
      });
    }
  });

  /* Retained mode: the same app and the same script, with the handlers showing */
  LiveFig("hand", {
    label: "To-do list, retained mode", where: "kept in the widgets", noAuto: coarse, keeps: "toolkit", mach: "what ran", log: true,
    link: { text: "build()", sub: "ran once, at launch", from: function (F) { return F.cards; } },
    fields: [["focus", "focus", "nothing"], ["caret", "caret", "—"], ["selection", "selection", "none"], ["scroll", "scroll", "0 px"]],
    toggles: [{ name: "slip", off: "Leave a line out", on: "Put the line back" }],
    machine: function (F) { return DomMachine(F, { items: EIGHT, code: true }); },
    script: function (F) {
      return story(F, {
        cap: function (k) {
          var slip = F.m.slip();
          return {
            "1": "Click into “Fix scroll bug”. No handler runs. The text box keeps its own focus and caret.",
            "2": "Type “today” at the end. Each key runs a one-line handler that copies the text into app state. The box already shows it.",
            "3": "Select a word. No handler runs. The selection is the text box’s own.",
            "4a": "Delete “Call Phil”, the row above yours.",
            "4": slip
              ? "Delete “Call Phil”, the row above yours, with the screen’s line left out. The item leaves the data, but its row stays on the screen, and nothing in the toolkit can tell."
              : "Delete “Call Phil”, the row above yours. The handler makes two edits by hand: one takes the item out of the data, the other takes the row off the screen. Your caret and selection never move, because they live in the box they were in.",
            "5": "Scroll. No handler runs. The list keeps its own scroll position.",
            "6a": "Quit the app with its close box.",
            "6q": slip
              ? "Quit the app with its close box. The data is saved to disk, without “Call Phil”. Its row was on the screen to the end."
              : "Quit the app with its close box. The data is saved to disk. Focus, caret, selection and scroll were in the widgets, and go with them.",
            "6": slip
              ? "Launch it again. The startup code rebuilds the screen from the data, so “Call Phil” is gone at last. Until now the screen showed a row the data didn’t have."
              : "Launch it again. The startup code rebuilds the screen from the data. The UI state starts over."
          }[k];
        }
      });
    }
  });
