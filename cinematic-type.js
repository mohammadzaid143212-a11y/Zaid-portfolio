(() => {
  "use strict";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const titleWords = document.querySelectorAll(".cinematic-title .title-word");
  titleWords.forEach((word, index) => word.style.setProperty("--word-index", index));
  if (reduce) return;
  const curtain = document.createElement("div");
  curtain.className = "chapter-transition-curtain";
  curtain.setAttribute("aria-hidden", "true");
  document.body.append(curtain);
  let activeChapter = "home";
  let animation = null;
  const chapterIds = ["home", "work", "about", "contact"];
  const targets = chapterIds.map(id => document.getElementById(id)).filter(Boolean);
  if (!("IntersectionObserver" in window) || !targets.length) return;
  const observer = new IntersectionObserver(entries => {
    const candidate = entries.filter(entry => entry.isIntersecting).sort((a,b) => b.intersectionRatio-a.intersectionRatio)[0];
    if (!candidate) return;
    const next = candidate.target.id;
    if (next === activeChapter) return;
    activeChapter = next;
    if (animation) animation.cancel();
    animation = curtain.animate([
      { transform: "scaleY(0)", opacity: 0, transformOrigin: "bottom" },
      { transform: "scaleY(1)", opacity: .75, offset: .48, transformOrigin: "bottom" },
      { transform: "scaleY(0)", opacity: 0, transformOrigin: "top" }
    ], { duration: 680, easing: "cubic-bezier(.76,0,.24,1)" });
  }, { rootMargin: "-38% 0px -48% 0px", threshold: [0,.2,.45] });
  targets.forEach(target => observer.observe(target));
})();
