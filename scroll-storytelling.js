(() => {
  "use strict";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const progress = document.getElementById("scroll-progress-fill");
  const chapterNumber = document.getElementById("chapter-number");
  const chapterName = document.getElementById("chapter-name");
  const links = [...document.querySelectorAll("[data-chapter]")];
  const chapters = [
    { id: "home", number: "00", name: "INTRODUCTION" },
    { id: "work", number: "01", name: "SELECTED WORK" },
    { id: "about", number: "02", name: "THE EDITOR" },
    { id: "contact", number: "03", name: "LET'S CREATE" }
  ].map(item => ({ ...item, element: document.getElementById(item.id) })).filter(item => item.element);
  let frame = 0;
  function updateProgress() {
    frame = 0;
    const root = document.documentElement;
    const range = root.scrollHeight - window.innerHeight;
    const ratio = range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0;
    if (progress) progress.style.transform = "scaleX(" + ratio + ")";
  }
  window.addEventListener("scroll", () => {
    if (!frame) frame = window.requestAnimationFrame(updateProgress);
  }, { passive: true });
  window.addEventListener("resize", updateProgress, { passive: true });
  updateProgress();
  if ("IntersectionObserver" in window && chapters.length) {
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a,b) => b.intersectionRatio-a.intersectionRatio)[0];
      if (!visible) return;
      const active = chapters.find(item => item.element === visible.target);
      if (!active) return;
      links.forEach(link => {
        const current = link.dataset.chapter === active.id;
        link.classList.toggle("is-current", current);
        if (current) link.setAttribute("aria-current", "location"); else link.removeAttribute("aria-current");
      });
      if (chapterNumber) chapterNumber.textContent = active.number;
      if (chapterName) chapterName.textContent = active.name;
    }, { rootMargin: "-28% 0px -42% 0px", threshold: [0,.15,.35,.6] });
    chapters.forEach(item => observer.observe(item.element));
  }
  // Gentle scroll-linked depth on project artwork; disabled for touch and reduced-motion users.
  if (!reduce && window.matchMedia("(pointer:fine)").matches) {
    const cards = document.querySelectorAll(".project-card");
    let ticking = false;
    function updateDepth() {
      ticking = false;
      const vh = window.innerHeight || 1;
      cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const offset = Math.max(-1, Math.min(1, (center - vh / 2) / vh));
        card.style.setProperty("--story-depth", (offset * -9).toFixed(2) + "px");
      });
    }
    window.addEventListener("scroll", () => {
      if (!ticking) { ticking = true; window.requestAnimationFrame(updateDepth); }
    }, { passive: true });
    window.addEventListener("resize", updateDepth, { passive: true });
    updateDepth();
  }
})();
