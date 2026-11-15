  /* ---------------------------------------------------------------------------------------------
     React: a miniature of how React updates a list. Every change reruns the whole view and diffs
     the new tree against the one from the render before, matching rows by key or by position.
     Both trees are shown. It writes a value only if the box doesn't already show it, as React
     does, which is what keeps your caret while you type.
     --------------------------------------------------------------------------------------------- */
  function ReactMachine(F) {
    var list = F.host, items = [], nextId = 1, keyed = true, scripted = true, M = { pt: {} };
    var by = lastInput(list);   /* a click, a key or a drag: how the reader last touched the list */
    /* While a figure measures itself it is inert and can't take the focus, so the row the script would
       have focused is only remembered. It follows its DOM row around exactly as the real focus does. */
    var ghost = null;
    function idx(n) { var li = n && n.closest ? n.closest("li") : null; return li && li.parentNode === list ? Array.prototype.indexOf.call(list.children, li) : -1; }
    function focusedLi() {
      if (ghost) return ghost.isConnected ? ghost : null;
      var a = document.activeElement; return a && list.contains(a) ? a.closest("li") : null;
    }
    function makeRow() {
      var li = document.createElement("li");
      var cb = h("input", null, null, li); cb.type = "checkbox"; cb.setAttribute("aria-label", "Done");
      var inp = h("input", null, null, li); inp.type = "text"; inp.spellcheck = false; inp.autocomplete = "off";
      if (scripted && coarse) inp.setAttribute("inputmode", "none");
      var x = h("button", "x", "×", li); x.type = "button"; x.setAttribute("aria-label", "Delete");
      li._cb = cb; li._inp = inp; li._id = null; li._text = ""; li._done = false;
      return li;
    }
    function setRow(li, it, i, ops, fresh) {
      if (fresh) { li._inp.value = it.text; li._cb.checked = it.done; li.classList.toggle("done", it.done); }
      else {
        if (li._text !== it.text) {
          if (li._inp.value !== it.text) { li._inp.value = it.text; ops.push({ k: "view", li: li, s: "row " + (i + 1) + ": " + q(li._text, 12) + " → " + q(it.text, 12) }); }
          else ops.push({ k: "soft", li: li, s: "row " + (i + 1) + ": the box already shows it, so no write" });
        }
        if (li._done !== it.done) {
          if (li._cb.checked !== it.done) li._cb.checked = it.done;
          li.classList.toggle("done", it.done);
          ops.push({ k: "view", li: li, s: "row " + (i + 1) + ": " + (it.done ? "ticked" : "unticked") });
        }
      }
      li._id = it.id; li._text = it.text; li._done = it.done;
      li._inp.setAttribute("aria-label", "To-do " + (i + 1));
    }
    function mid(n) { var b = F.box(n); return b.t + b.h / 2; }   /* how high a row stands in the figure: kept for a row about to go, so an arrow can still point to where it was */
    /* The two trees. view(items) returns a new one on every render, and it is compared with the one from the
       render before, row with row, each row matched to its partner by key or by position. Both are drawn as
       lists whose rows stand level with the window's rows. They are data, so the window's scrolling doesn't
       move them: that is something the DOM does by itself, and the trees know nothing of it. A tree longer
       than its box can be scrolled to see the rest. That is the reader looking at the figure, not anything
       the app does, and the two trees move together so that a row stays level with its partner. The new
       tree is the one next to the window: after the render the window matches it. Where a pair differs,
       the diff writes. */
    var treesEl = h("div", "trees", null, F.mid);
    function treeCol(cls, name, label) {
      var c = h("div", "tcol " + cls, null, treesEl), hd = h("p", "pile-h tree-h", name + " ", c), o = { sub: h("span", "pile-where", "", hd), list: h("ul", "tree", null, c) };
      o.list.setAttribute("aria-label", label); o.list.tabIndex = 0;   /* a scrolling list has to be reachable by keyboard */
      return o;
    }
    var OLD = treeCol("t-old", "old tree", "The tree from the render before"), NEW = treeCol("t-new", "new tree", "The new tree, as view(items) returned it");
    var viewLabel = h("div", "mid-link view-link", null, F.mid); h("p", "ml-t", "view(items)", viewLabel);   /* the name on the wide arrow, where there is room for the arrow to go over the old tree */
    var treeDiff = h("div", "mach tree-diff", null, null);
    F.mach.parentNode.insertBefore(treeDiff, F.mach.parentNode.firstChild);   /* what the comparison found: under the new tree, at the top of the cell below it */
    var oldT = null, newT = [], quitted = false, lastRender = -1e9;   /* the trees, as plain rows. No app, no trees: their outlines stay, empty, so nothing under them moves. */
    function snap(r) { return { id: r.id, text: r.text, done: r.done }; }
    function alignTrees() {
      OLD.list.style.marginTop = NEW.list.style.marginTop = "0px";
      /* Side by side, their first rows stand level with the window's first row (the trees have a 1px outline, the list its own padding) */
      OLD.list.style.marginTop = NEW.list.style.marginTop = F.stacked() ? "" : Math.max(2, Math.round(F.box(list).t + (parseFloat(getComputedStyle(list).paddingTop) || 0) - 1 - F.box(NEW.list).t)) + "px";
      edges();
    }
    /* Where a tree has more rows above or below than its box shows, it fades out at that edge */
    function edges() { [OLD.list, NEW.list].forEach(function (ul) { ul.classList.toggle("more-up", ul.scrollTop > 1); ul.classList.toggle("more-down", ul.scrollTop + ul.clientHeight < ul.scrollHeight - 1); }); }
    /* Scrolling one tree scrolls the other, and the marks between them and the arrows out of them follow */
    var redraw = false, placed = -1e9, slide = null;   /* `placed`: when the trees were last put where they are by a render, not by the reader. `slide`: the old tree, still moving into place. */
    [[OLD.list, NEW.list], [NEW.list, OLD.list]].forEach(function (p) {
      p[0].addEventListener("scroll", function () {
        if (p[1].scrollTop !== p[0].scrollTop) p[1].scrollTop = p[0].scrollTop;
        edges();
        if (redraw || performance.now() - placed < 120) return;
        redraw = true; requestAnimationFrame(function () { redraw = false; F.relink(); });
      }, { passive: true });
    });
    function fill(ul, rows) {
      ul.textContent = "";
      rows.forEach(function (r) { var li = h("li", r.done ? "done" : null, null, ul); h("span", "tt", r.text === "" ? "(empty)" : r.text, li); if (keyed) h("span", "tk", "key " + r.id, li); });
    }
    function drawTrees() {
      var at = NEW.list.scrollTop, o = quitted || !oldT ? [] : oldT, r = quitted ? [] : newT;
      fill(OLD.list, o); fill(NEW.list, r);
      /* The shorter tree is padded out to the length of the longer, so both can be scrolled just as far, and they are left where the reader had them */
      var row = (NEW.list.firstElementChild || OLD.list.firstElementChild || {}).offsetHeight || 0, most = Math.max(o.length, r.length);
      OLD.list.style.paddingBottom = (o.length ? (most - o.length) * row : 0) + "px"; NEW.list.style.paddingBottom = (r.length ? (most - r.length) * row : 0) + "px";   /* an empty tree has nothing to scroll, and stays the size of its box */
      OLD.list.scrollTop = NEW.list.scrollTop = at; placed = performance.now();
      OLD.list.setAttribute("data-none", quitted ? "" : oldT ? "no rows" : "none yet");
      OLD.sub.textContent = quitted || !oldT ? "" : "last render";
      if (quitted) NEW.sub.textContent = "no app, no tree";
      else NEW.sub.textContent = "all " + count(newT.length, "row");
      alignTrees();
    }
    function ripple() { each(NEW.list.children, function (li, i) { setTimeout(function () { li.classList.add("flash"); setTimeout(function () { li.classList.remove("flash"); }, 200); }, i * 22); }); }
    window.addEventListener("resize", function () { setTimeout(alignTrees, 180); });
    function diffByPosition() {
      var ops = [], kids = list.children;
      items.forEach(function (it, i) {
        var li = kids[i];
        if (li) { setRow(li, it, i, ops, false); return; }
        li = makeRow(); list.appendChild(li); setRow(li, it, i, ops, true);
        ops.push({ k: "view", li: li, s: "add row " + (i + 1) });
      });
      while (kids.length > items.length) { ops.push({ k: "view", y: mid(kids[kids.length - 1]), old: kids.length - 1, s: "remove row " + kids.length }); list.removeChild(kids[kids.length - 1]); }
      return ops;
    }
    function diffByKey() {
      var ops = [], want = {}, byId = {};
      items.forEach(function (it) { want[it.id] = true; });
      Array.prototype.slice.call(list.children).forEach(function (li, was) {
        if (want[li._id]) byId[li._id] = li;
        else { ops.push({ k: "view", y: mid(li), old: was, s: "remove the " + q(li._text, 14) + " row" }); list.removeChild(li); }
      });
      items.forEach(function (it, i) {
        var li = byId[it.id], fresh = !li;
        if (fresh) li = makeRow();
        if (list.children[i] !== li) list.insertBefore(li, list.children[i] || null);
        setRow(li, it, i, ops, fresh);
        if (fresh) ops.push({ k: "view", li: li, s: "add a row at " + (i + 1) });
      });
      return ops;
    }
    /* What ran: your handler's edit to the data, then the render. Everything in app state goes into view()
       (a wide arrow) and a new tree comes out. It is compared with the old tree, row with row: an equals sign
       where a row and its partner agree, a not-equals sign where they differ. Each difference is then written to
       the window. A last line of the handler (`then`) runs after all that. `ev` is where in the window the
       event happened, `code` the handler's line. */
    var HANDLER = { type: ["input(i)", "items[i].text = box.text"], tick: ["tick(i)", "items[i].done = box.ticked"], delete: ["delete(i)", "items.remove(i)"], insert: ["enter(i)", "items.insert(i + 1, blank)"] };
    function render(why, at, ev, code, then, gap) {
      var before = focusedLi(), beforeId = before ? before._id : null, beforePos = before ? idx(before) : -1;
      each(list.querySelectorAll(".rewrote, .jumped"), function (li) { li.classList.remove("rewrote", "jumped"); });
      F.u.focus.classList.remove("bad");
      /* The old tree is what the last render left. React keeps it; here each row of the DOM remembers its part of it. */
      var first = why === "init" || why === "launch", was = Array.prototype.map.call(list.children, function (li) { return { id: li._id, text: li._text, done: li._done }; });
      var ops = keyed ? diffByKey() : diffByPosition();
      var wrote = ops.filter(function (o) { return o.k === "view"; }), writes = wrote.length;
      var mark = function () { if (why === "delete" || why === "insert") ops.forEach(function (o) { if (o.li && o.li.isConnected) o.li.classList.add("rewrote"); }); };   /* rows the diff wrote to, shown as its arrows land */
      oldT = first ? null : was; newT = items.map(snap);
      /* Row with row. By key, a row's partner is the old row that has its key. By position, it is the old row in its place. */
      var pairs = [], same = function (o, r) { return o.text === r.text && o.done === r.done; };
      if (oldT && keyed) {
        newT.forEach(function (r, j) { var i = -1; oldT.forEach(function (o, k) { if (o.id === r.id) i = k; }); pairs.push({ o: i, n: j, same: i >= 0 && same(oldT[i], r) }); });
        oldT.forEach(function (o, i) { if (!newT.some(function (r) { return r.id === o.id; })) pairs.push({ o: i, n: -1, same: false }); });
      } else if (oldT) for (var k = 0; k < Math.max(oldT.length, newT.length); k++) pairs.push({ o: k < oldT.length ? k : -1, n: k < newT.length ? k : -1, same: k < oldT.length && k < newT.length && same(oldT[k], newT[k]) });
      var differs = pairs.filter(function (p) { return !p.same; }).length;
      drawTrees();
      treeDiff.textContent = "";
      if (why === "init") F.lines("nothing yet", []);
      else {
        var all = why === "launch", written = wrote.filter(function (o) { return o.li && o.li.isConnected; }).map(function (o) { return o.li; });
        var gone = wrote.filter(function (o) { return !(o.li && o.li.isConnected) && o.y != null; });
        var soft = ops.filter(function (o) { return o.k === "soft" && o.li && o.li.isConnected; }).map(function (o) { return o.li; });   /* the trees differ there, but the box already shows it: a write that wasn't needed */
        var lines = [all ? ["items = disk.load()", "data", "app state", "pile", { to: F.dataHead }]
                         : [code || HANDLER[why][1], "data", "app state", "pile", at != null ? { to: function () { return F.cards.children[at]; } } : gap != null ? F.gapAt(gap) : { to: F.dataHead }]];
        if (then) lines.push([then, "ui", "UI state", "pile", { to: function () { return F.u.focus; } }]);   /* the handler's last line: put the focus somewhere */
        /* Under the new tree: what the comparison found. It shows when the comparison is reached. */
        var dl = h("p", "hline view wait", "diff, " + (keyed ? "by key" : "by position"), treeDiff);
        h("span", "htag pile", (differs > writes ? count(differs, "row") + (differs === 1 ? " differs · " : " differ · ") : "") + count(writes, "write"), dl);
        var tint = function () { pairs.forEach(function (p) { if (p.same) return; [[OLD, p.o], [NEW, p.n]].forEach(function (c) { var li = c[1] >= 0 ? c[0].list.children[c[1]] : null; if (li) li.classList.add("differs"); }); }); };
        /* Everything goes into view(), and a whole tree comes out. Side by side, the arrow goes over the old tree to reach the new one. */
        var viewArrow = function () {
          if (slide) slide.finish();   /* anything drawn from here on is measured, so the old tree has to be where it is going */
          if (F.stacked()) return [{ from: F.cards, to: NEW.list, wide: 1, c: "scr", side: "r" }];
          return [{ wide: 1, c: "scr", pts: function () { var c = F.box(F.cards.parentNode), nb = F.box(NEW.list), y = Math.round(F.box(viewLabel).b + 8), x = Math.round(nb.r - 22); return [[c.r + 2, y], [x, y], [x, nb.t - 3]]; } }];
        };
        /* Then the comparison, and the writes. These are worked out when they are drawn, since the lists may have scrolled. */
        var marks = function () {
          if (slide) slide.finish();
          var out = [], lb = F.box(list), ob = F.box(OLD.list), nb = F.box(NEW.list);
          var inside = function (el, b) { var r = F.box(el), y = r.t + r.h / 2; return y > b.t + 3 && y < b.b - 3; };
          pairs.forEach(function (p) {   /* each row and its partner: the same, or not */
            var o = p.o >= 0 ? OLD.list.children[p.o] : null, r = p.n >= 0 ? NEW.list.children[p.n] : null;
            if (o && r && inside(o, ob) && inside(r, nb)) out.push({ pair: p.same ? "same" : "diff", from: o, to: r });
          });
          if (F.stacked()) {   /* the window is above the trees, not beside them: one arrow up the margin, with a tooth for each row written */
            if (written.length || gone.length) out.push({ from: NEW.list, to: F.win, comb: written.concat(gone.map(function (g) { return g.y; })), clip: list, c: "scr" });
            if (soft.length) out.push({ from: NEW.list, to: F.win, comb: soft, clip: list, c: "scr", ghost: 1 });
            return out;
          }
          /* The new tree's row for a row of the window: after the render they stand in the same order. If the window has been
             scrolled, a row it shows may lie below the foot of the tree's box, and its arrow then leaves from the foot. */
          var from = function (dom) { var j = idx(dom), r = j >= 0 ? NEW.list.children[j] : null; return !r ? null : inside(r, nb) ? { from: r } : { from: NEW.list, fromY: r }; };
          var write = function (dom, ghost) { var f = from(dom); if (f && inside(dom, lb)) out.push({ from: f.from, fromY: f.fromY, to: F.win, toY: dom, dy: 0.01, c: "scr", ghost: ghost }); };
          written.forEach(function (dom) { write(dom, 0); });
          soft.forEach(function (dom) { write(dom, 1); });
          gone.forEach(function (g) {   /* an old row with no partner: its row in the window goes. The arrow crosses the new tree along the seam where that row would stand. */
            var o = OLD.list.children[g.old], y = g.y - 20;
            if (!o || y < lb.t + 2 || y > lb.b - 2) return;
            var before = pairs.filter(function (p) { return p.n >= 0 && p.o >= 0 && p.o < g.old; }).length;   /* how many rows of the new tree stand above that seam */
            out.push({ c: "scr", pts: function () {
              var r = F.box(o), a = F.box(OLD.list), c = F.box(NEW.list), w = F.box(F.win), gx = Math.round((a.r + c.l) / 2), row = NEW.list.firstElementChild ? NEW.list.firstElementChild.offsetHeight : 40;
              var oy = Math.max(a.t + 8, Math.min(a.b - 8, r.t + r.h / 2)), sy = Math.max(c.t + 1, Math.min(c.b - 1, c.t + 1 + before * row - NEW.list.scrollTop)), pts = [[a.r + 2, oy], [gx, oy], [gx, sy]];
              if (Math.abs(sy - y) < 2) pts.push([w.l - 3, sy]); else pts.push([c.r + 12, sy], [c.r + 12, y], [w.l - 3, y]);   /* scrolled, the window's own seam is somewhere else */
              return pts;
            } });
          });
          return out;
        };
        var now = performance.now(), calm = !F.quiet && !reduce && now - lastRender > 400;   /* not one of a burst of renders: there is time to show the trees change hands */
        lastRender = now;
        if (slide) slide.finish();
        if (calm && oldT && oldT.length && OLD.list.animate) {   /* last time's new tree is this time's old one */
          slide = OLD.list.animate([{ transform: "translateX(" + Math.round(F.box(NEW.list).l - F.box(OLD.list).l) + "px)", opacity: 0.35 }, { transform: "none", opacity: 1 }], { duration: 260, easing: "ease" });
          slide.onfinish = slide.oncancel = function () { slide = null; };
        }
        if (calm) NEW.list.classList.add("wait");
        F.lines(all ? "on launch:" : "on " + HANDLER[why][0] + ":", lines, { ev: all ? null : ev, more: [
          { at: 1, arrows: viewArrow, run: function (live) { NEW.list.classList.remove("wait"); if (live) ripple(); } },
          { at: 1, arrows: marks, gap: 160, run: function () { dl.classList.remove("wait"); tint(); mark(); } }
        ] });
      }
      F.cardsFor(items, why === "type" || why === "tick" || why === "insert" ? at : null, at != null ? list.children[at] : null);
      var astray = false;   /* the UI state ended up somewhere it shouldn't be */
      if (why !== "delete") F.setNote("", "");
      else {
        var after = focusedLi();
        if (beforeId == null) F.setNote("", "");
        else if (!after) { astray = true; F.setNote("bad", "Focus was lost: the row it was in is gone."); }
        else if (after._id === beforeId) F.setNote("good", "Focus stayed with its item" + (idx(after) !== beforePos ? ", now row " + (idx(after) + 1) : "") + ".");
        else { astray = true; after.classList.add("jumped"); F.u.focus.classList.add("bad"); F.setNote("bad", "Focus stayed on row " + (idx(after) + 1) + ", which now shows " + q(after._text) + "."); }
      }
      sync(true);
    }
    /* What the DOM did by itself, with nothing rerun: where UI state lives in this approach */
    var KEPT = { focus: "the DOM took the focus and placed the caret", caret: "the DOM moved the caret",
                 selection: "the DOM keeps the selection", scroll: "the DOM keeps the scroll position" };
    var seen = null;
    function sync(byRender) {
      if (F.bar.contains(document.activeElement)) return;
      var li = focusedLi(), a = ghost && li ? li._inp : document.activeElement, f = "nothing", c = "—", s = "none";
      if (li) {
        if (a === li._inp) {
          f = q(a.value); c = "col " + (a.selectionDirection === "backward" ? a.selectionStart : a.selectionEnd);
          if (a.selectionStart !== a.selectionEnd) s = q(a.value.slice(a.selectionStart, a.selectionEnd), 14);
        } else f = a === li._cb ? "a checkbox" : "a delete button";
      }
      var sc = Math.round(list.scrollTop) + " px";
      F.setU("focus", f, li ? li._id : "none", li);
      F.setU("caret", c, c, li);
      F.setU("selection", s, s, li);
      F.setU("scroll", sc, sc, null);
      var now = { focus: f, selection: s, scroll: sc, caret: c };
      if (!byRender && seen) {
        var what = ["focus", "selection", "scroll", "caret"].filter(function (k) { return seen[k] !== now[k]; })[0];
        if (what && !(what === "focus" && f === "nothing")) {
          F.lines("nothing reran", [[KEPT[what], "soft", "UI state", "pile"]]);   /* and so no arrows: the DOM changed its own drawer */
          F.setNote("", ""); F.u.focus.classList.remove("bad");   /* the last render's marks are about the last render */
          each(list.querySelectorAll(".rewrote, .jumped"), function (r) { r.classList.remove("rewrote", "jumped"); });
          each(F.mid.querySelectorAll(".tree li.differs"), function (r) { r.classList.remove("differs"); });
        }
      }
      seen = now;
    }
    function focusRow(i, col, mine) {   /* `mine`: the handler that just ran did this, and its lines already say so */
      var li = list.children[i];
      if (!li) return;
      if (!F.off) by.set("click");   /* the script's click; a reader's own keys and clicks name themselves */
      if (F.stage.inert) ghost = li; else li._inp.focus({ preventScroll: true });
      var n = col == null ? li._inp.value.length : Math.min(col, li._inp.value.length);
      li._inp.setSelectionRange(n, n);
      sync(mine);
    }
    function removeAt(i) {
      var src = list.children[i];
      if (i < 0 || !src) return;
      if (!F.off) by.set("click");
      var y = mid(src);
      F.headPulse(src);
      items.splice(i, 1);
      render("delete", null, y, null, null, i);
    }

    function onType(i) { items[i].text = list.children[i]._inp.value; render("type", i, list.children[i]); }   /* the input handler: a reader's key and the script's both end here */
    list.addEventListener("input", function (e) { var i = idx(e.target); if (e.target.type === "text" && i >= 0) onType(i); });
    list.addEventListener("change", function (e) { var i = idx(e.target); if (e.target.type === "checkbox" && i >= 0) { items[i].done = e.target.checked; render("tick", i, list.children[i]); } });
    list.addEventListener("mousedown", function (e) { if (e.target.closest(".x") || e.target.type === "checkbox") e.preventDefault(); });
    list.addEventListener("click", function (e) { var x = e.target.closest(".x"); if (x) removeAt(idx(x)); });
    list.addEventListener("keydown", function (e) {
      var t = e.target, i = idx(t);
      if (t.type !== "text" || i < 0) return;
      if (e.key === "Enter") { e.preventDefault(); items.splice(i + 1, 0, { id: nextId++, text: "", done: false }); render("insert", i + 1, list.children[i], null, "rows[i + 1].box.focus()"); focusRow(i + 1, null, true); }
      else if (e.key === "Backspace" && t.value === "") { e.preventDefault(); var y = mid(list.children[i]); items.splice(i, 1); render("insert", null, y, "items.remove(i)", items.length ? "rows[i - 1].box.focus()" : null, i); if (items.length) focusRow(Math.max(0, i - 1), null, true); }
      else if (e.key === "ArrowUp" && i > 0) { e.preventDefault(); focusRow(i - 1, t.selectionStart); }
      else if (e.key === "ArrowDown" && i < items.length - 1) { e.preventDefault(); focusRow(i + 1, t.selectionStart); }
    });
    ["keyup", "mouseup", "select", "focusin", "scroll"].forEach(function (ev) { list.addEventListener(ev, function () { setTimeout(sync, 0); }); });
    list.addEventListener("focusout", function (e) {
      if (F.bar.contains(e.relatedTarget)) return;
      var li = e.target.closest && e.target.closest("li");
      if (li) li.classList.remove("jumped");
      F.u.focus.classList.remove("bad");
      setTimeout(sync, 0);
    });
    document.addEventListener("selectionchange", function () { if (list.contains(document.activeElement)) sync(); });

    M.focusRow = focusRow;
    M.typeChar = function (i, ch) {
      var li = list.children[i];
      if (!li) return;
      by.set("key");
      if (document.activeElement !== li._inp) li._inp.focus({ preventScroll: true });
      li._inp.value += ch;
      var n = li._inp.value.length; li._inp.setSelectionRange(n, n);
      onType(i);
    };
    M.removeAt = removeAt;
    M.select = function (i, a, b) {
      var li = list.children[i];
      if (!li) return;
      by.set("drag");
      if (F.stage.inert) ghost = li; else if (document.activeElement !== li._inp) li._inp.focus({ preventScroll: true });
      li._inp.setSelectionRange(a, b, "forward"); sync();
    };
    M.scrollTo = function (y) { list.scrollTop = y; sync(); };
    M.hot = function (i) { each(list.children, function (li, j) { li.classList.toggle("hot", j === i); }); };
    M.setScripted = function (on) {
      scripted = on;
      each(list.querySelectorAll('input[type="text"]'), function (inp) { if (on && coarse) inp.setAttribute("inputmode", "none"); else inp.removeAttribute("inputmode"); });
    };
    M.blur = function () { if (list.contains(document.activeElement)) document.activeElement.blur(); };
    M.choose = function (name, val) { keyed = val === "on"; drawTrees(); };
    M.keyed = function () { return keyed; };
    /* Quitting saves the data. The DOM, and the UI state inside it, is gone. */
    M.quit = function () {
      M.blur();
      var saved = items.map(function (it) { return { id: it.id, text: it.text, done: it.done }; });
      list.textContent = "";
      F.lines("on quit:", [["disk.save(items)", "data", "app state", "pile", { to: F.diskEl, near: 1 }]]);   /* it turns beside the disk, clear of the trees */
      quitted = true; drawTrees(); treeDiff.textContent = "";
      F.setNote("", ""); F.cardsOff(); sync();
      return { data: saved, ui: false };
    };
    M.launch = function (disk) {
      items = disk.data.map(function (d) { nextId = Math.max(nextId, d.id + 1); return { id: d.id, text: d.text, done: d.done }; });
      quitted = false;
      render("launch");
    };
    M.reset = function () {
      M.blur(); ghost = null;
      list.textContent = "";
      nextId = 1; items = EIGHT.map(function (s) { return { id: nextId++, text: s, done: false }; });
      list.scrollTop = 0; seen = null; quitted = false; oldT = null; lastRender = -1e9;
      OLD.list.scrollTop = NEW.list.scrollTop = 0;
      F.resetPanels();
      render("init");
    };
    function textX(inp, s) {
      var cs = getComputedStyle(inp), b = F.box(inp);
      measure.font = cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
      return b.l + parseFloat(cs.paddingLeft || "0") + measure.measureText(s).width;
    }
    M.pt.text = function (i, k) { var inp = list.children[i]._inp, b = F.box(inp); return [textX(inp, k == null ? inp.value : inp.value.slice(0, k)) + 1, b.t + b.h / 2 + 3]; };
    M.pt.list = function (fx, fy) { var b = F.box(list); return [b.l + b.w * fx, b.t + b.h * fy]; };
    M.pt.x = function (i) { var b = F.box(list.children[i].querySelector(".x")); return [b.l + b.w / 2 + 1, b.t + b.h / 2 + 3]; };
    M.pt.rest = function () { var w = F.box(F.win); return [w.l + w.w * 0.62, w.b + 26]; };
    return M;
  }

  LiveFig("react", {
    label: "To-do list, React", where: "kept in the DOM", noAuto: coarse, keeps: "toolkit", mach: "your handler",
    fields: [["focus", "focus", "nothing"], ["caret", "caret", "—"], ["selection", "selection", "none"], ["scroll", "scroll", "0 px"]],
    switches: [{ name: "keys", label: "Keys", options: [["on", "With keys"], ["off", "No keys"]] }],
    machine: function (F) { return ReactMachine(F); },
    script: function (F) {
      return story(F, {
        cap: function (k) {
          return {
            "1": "Click into “Fix scroll bug”. Nothing reruns. Focus and the caret belong to the DOM.",
            "2": "Type “today” at the end. Each key reruns the whole view. The new tree differs from the old one in that row, but the box already shows the new text, so nothing is written to it.",
            "3": "Select a word. Nothing reruns. The selection belongs to the DOM too.",
            "4a": "Delete “Call Phil”, the row above yours.",
            "4": F.m.keyed()
              ? "Delete “Call Phil”, the row above yours. Each row is matched to the old row with its key, so one old row is left without a partner. The diff removes it, and your caret and selection stay where they were."
              : "Delete “Call Phil”, the row above yours. Each row is matched to the old row in its place, so every row below differs from its partner and is rewritten. Your caret ends up in “Write essay” and your selection is gone. Both lists of writes give the same picture. Only one is what happened.",
            "5": "Scroll. Nothing reruns. The scroll position belongs to the DOM as well.",
            "6a": "Quit the app with its close box.",
            "6q": "Quit the app with its close box. The data is saved to disk. The DOM is gone, and the UI state with it.",
            "6": "Launch it again. The first render builds every row from the data. The UI state starts over."
          }[k];
        }
      });
    }
  });

