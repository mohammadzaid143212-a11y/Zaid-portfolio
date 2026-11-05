(() => {
  "use strict";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const targets = [
    ...document.querySelectorAll(
      ".hero-meta, .section-heading, .video-gallery-heading, .about-inner, .contact-section, .site-footer"
    )
  ];
  const galleries = [...document.querySelectorAll(".video-gallery-group")];
  galleries.forEach(group => {
    const heading = group.querySelector(".video-gallery-heading");
    const cards = [...group.querySelectorAll(".project-card")];
    if (heading) targets.push(heading);
    cards.forEach((card, index) => {
      card.style.setProperty("--motion-stagger", Math.min(index * 85, 340) + "ms");
      targets.push(card);
    });
  });
  if (reduce || !("IntersectionObserver" in window)) return;
  document.documentElement.classList.add("motion-polish-ready");
  const uniqueTargets = [...new Set(targets)].filter(Boolean);
  uniqueTargets.forEach(target => target.classList.add("motion-polish-target"));
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("motion-polish-visible");
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
  uniqueTargets.forEach(target => observer.observe(target));
})();