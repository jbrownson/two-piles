  each(document.querySelectorAll('.timeline a, .verdict a, a.mark, .cap a[href^="#"]'), function (a) {
    a.addEventListener("click", function (e) {
      var t = document.querySelector(a.getAttribute("href"));
      if (!t) return;
      e.preventDefault();
      t.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    });
  });

  /* Play each figure once when its app is half in view, and pause it when it leaves */
  if (typeof window.IntersectionObserver === "function") {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var half = e.isIntersecting && e.intersectionRatio >= 0.5;
        figs.forEach(function (F) {
          if (F.watch !== e.target) return;
          F.visible(e.isIntersecting);
          if (half && !F.played && !F.noAuto && !F.off && !reduce) { F.played = true; F.autoplay(); }
          else if (half && F.paused) F.resume();
        });
        if (proofFig && proofFig.watch === e.target && half && !proofFig.played && !reduce) proofFig.autoplay();
      });
    }, { threshold: [0, 0.5] });
    figs.forEach(function (F) { io.observe(F.watch); });
    if (proofFig) io.observe(proofFig.watch);
  } else figs.forEach(function (F) { F.visible(true); });

  /* Text sizes change when the fonts arrive. The script's pointer aims at text, and each figure has reserved a height. */
  var fontT = 0;
  function fontsCame() { clearTimeout(fontT); fontT = setTimeout(function () { figs.forEach(function (F) { F.refresh(); }); }, 200); }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(fontsCame);
    if (document.fonts.addEventListener) document.fonts.addEventListener("loadingdone", fontsCame);   /* a font that arrives late */
  } else fontsCame();
})();
