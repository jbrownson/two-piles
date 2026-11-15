  /* Why now: a diagram of who writes what, and what gets checked */
  var proofFig = (function () {
    var sec = document.querySelector('[data-fig="proof"]');
    if (!sec) return null;
    var svg = sec.querySelector("svg"), L = el("g", {}, svg), FX = el("g", {}, svg), defs = el("defs", {}, svg);
    function grad(id, a, b) {
      var g = el("linearGradient", { id: id, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      el("stop", { offset: 0, style: "stop-color: var(--hair); stop-opacity: " + a }, g);
      el("stop", { offset: 1, style: "stop-color: var(--hair); stop-opacity: " + b }, g);
    }
    grad("fade-top", 1, 0); grad("fade-bot", 0, 1);
    tx(L, 40, 80, "you write the spec", "lab");
    el("rect", { x: 40, y: 98, width: 272, height: 126, rx: 16, "class": "soft-bg" }, L);
    ["draw rows =", "  (place rows)", "    .filter shows"].forEach(function (s, i) { tx(L, 62, 136 + i * 28, s, "code"); });
    tx(L, 40, 264, "and how the input changes", "lab soft");
    tx(L, 40, 290, "insert · delete · update · scroll", "count soft");
    tx(L, 472, 56, "an LLM writes the derivative and proof", "lab soft", "middle");
    var cp = el("clipPath", { id: "clip-proof" }, svg);
    el("rect", { x: 372, y: 72, width: 200, height: 272, rx: 14 }, cp);
    var col = el("g", { "clip-path": "url(#clip-proof)" }, L);
    el("rect", { x: 372, y: 72, width: 200, height: 272, "class": "soft-bg" }, col);
    var lines = el("g", { "class": "lines" }, col);
    var widths = [120, 150, 96, 132, 70, 140, 110, 150, 88, 126, 140, 60, 118, 100, 136];
    for (var rep = 0; rep < 3; rep++) widths.forEach(function (w, i) {
      el("rect", { x: 388 + (i % 3) * 10, y: 84 + (rep * 15 + i) * 12, width: w, height: 5, rx: 2.5, "class": "pl" }, lines);
    });
    el("rect", { x: 398, y: 206, width: 140, height: 6, rx: 3, "class": "pl-bad" }, col);
    el("rect", { x: 372, y: 72, width: 200, height: 48, fill: "url(#fade-top)" }, col);
    el("rect", { x: 372, y: 296, width: 200, height: 48, fill: "url(#fade-bot)" }, col);
    tx(L, 472, 370, "Scroll.lean · 1,174 lines", "count soft", "middle");
    el("path", { d: "M318 160 L 364 160", "class": "guide" }, L);
    el("path", { d: "M580 176 L 694 176", "class": "guide" }, L);
    tx(L, 760, 80, "a prover checks the law", "lab good", "middle");
    var seal = el("g", { "class": "seal" }, L);
    el("circle", { cx: 760, cy: 176, r: 58, "class": "seal-c" }, seal);
    el("path", { d: "M733 178 L753 198 L790 158", "class": "seal-ok" }, seal);
    el("path", { d: "M740 156 L780 196 M780 156 L740 196", "class": "seal-no" }, seal);
    tx(L, 760, 272, "apply (df a d) (f a)", "code sm", "middle");
    tx(L, 760, 294, "= f (apply d a)", "code sm", "middle");
    var status = tx(L, 760, 340, "checked", "badge good", "middle");
    var broken = false, api = { watch: sec.querySelector(".stage"), busy: false, played: false };
    var playBtn = sec.querySelector('[data-act="play"]'), breakBtn = sec.querySelector('[data-act="break"]');
    function setBroken(b) {
      broken = b; svg.classList.toggle("broken", b);
      status.textContent = b ? "rejected" : "checked";
      status.setAttribute("class", "badge " + (b ? "bad" : "good"));
      breakBtn.textContent = b ? "Fix the derivative" : "Break the derivative";
      breakBtn.setAttribute("aria-pressed", b ? "true" : "false");
    }
    function play() {
      return pulse(FX, "M318 160 L 364 160", "ink", 450)
        .then(function () { return wait(900); })
        .then(function () { return pulse(FX, "M580 176 L 694 176", broken ? "bad" : "good", 500); })
        .then(function () { seal.classList.remove("stamp"); void seal.getBoundingClientRect(); seal.classList.add("stamp"); return wait(900); });
    }
    function run() {
      if (api.busy) return;
      api.busy = true; api.played = true; sec.classList.add("busy");
      play().catch(function (e) { console.error(e); }).then(function () { api.busy = false; sec.classList.remove("busy"); });
    }
    playBtn.addEventListener("click", run);
    breakBtn.addEventListener("click", function () { if (api.busy) return; setBroken(!broken); run(); });
    api.autoplay = run;
    return api;
  })();

