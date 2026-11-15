(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  function mq(s) { return !!(window.matchMedia && window.matchMedia(s).matches); }
  var reduce = mq("(prefers-reduced-motion: reduce)"), coarse = mq("(pointer: coarse)");
  var measure = document.createElement("canvas").getContext("2d");

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function tx(parent, x, y, s, cls, anchor) {
    var t = el("text", { x: x, y: y, "class": cls || "" }, parent);
    if (anchor) t.setAttribute("text-anchor", anchor);
    t.textContent = s;
    return t;
  }
  function h(tag, cls, text, parent) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, reduce ? 0 : ms); }); }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function tween(ms, fn, e) {
    e = e || ease;
    return new Promise(function (res) {
      if (reduce || ms <= 0) { fn(1); res(); return; }
      var t0 = performance.now();
      function step(now) { var t = Math.min(1, (now - t0) / ms); fn(e(t)); if (t < 1) requestAnimationFrame(step); else res(); }
      requestAnimationFrame(step);
    });
  }
  function pulse(layer, d, color, ms) {
    ms = ms || 900;
    var trail = el("path", { d: d, "class": "trail" }, layer);
    trail.style.stroke = "var(--" + color + ")";
    var L = trail.getTotalLength();
    trail.style.strokeDasharray = L + " " + L;
    trail.style.strokeDashoffset = L;
    var dot = el("rect", { width: 7, height: 7 }, layer);
    dot.style.fill = "var(--" + color + ")";
    return tween(ms, function (t) {
      var p = trail.getPointAtLength(L * t);
      dot.setAttribute("x", p.x - 3.5); dot.setAttribute("y", p.y - 3.5);
      trail.style.strokeDashoffset = L * (1 - t);
    }).then(function () {
      dot.remove();
      trail.classList.add("fade");
      setTimeout(function () { trail.remove(); }, 700);
    });
  }
  /* A quoted, shortened piece of text for labels */
  function q(s, n) { n = n || 18; s = s === "" ? "(empty)" : s; return "“" + (s.length > n ? s.slice(0, n - 1).replace(/\s+$/, "") + "…" : s) + "”"; }
  function count(n, word) { return n + " " + word + (n === 1 ? "" : "s"); }
  /* How the reader last touched a list: with a click, a key or a drag. A machine uses it to name an event no handler was written for. */
  function lastInput(node) {
    var k = "event";
    node.addEventListener("pointerdown", function () { k = "click"; }, true);
    node.addEventListener("keydown", function () { k = "key"; }, true);
    node.addEventListener("pointermove", function (e) { if (e.buttons & 1) k = "drag"; }, true);
    return { get: function () { return k; }, set: function (v) { k = v; } };
  }

