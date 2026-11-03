(() => {
  "use strict";
  const grid = document.querySelector("#work .project-grid");
  const toolbar = document.querySelector(".gallery-toolbar");
  if (!grid || !toolbar) return;
  const filters = [...toolbar.querySelectorAll("[data-gallery-filter]")];
  const count = document.getElementById("gallery-visible-count");
  let active = "all";
  function applyFilter(next) {
    active = next;
    let visible = 0;
    grid.querySelectorAll(".project-card").forEach(card => {
      const type = card.dataset.projectType || "unknown";
      const show = active === "all" || type === active;
      card.hidden = !show;
      if (show) visible++;
    });
    filters.forEach(button => {
      const selected = button.dataset.galleryFilter === active;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    if (count) count.textContent = active === "all" ? String(visible).padStart(2,"0") : String(visible).padStart(2,"0") + " / " + active.toUpperCase();
    toolbar.dataset.activeFilter = active;
  }
  filters.forEach(button => button.addEventListener("click", () => applyFilter(button.dataset.galleryFilter)));
  const observer = new MutationObserver(() => {
    const cards = grid.querySelectorAll(".project-card");
    if (!cards.length) return;
    cards.forEach(card => {
      if (!card.dataset.projectType) {
        const label = card.querySelector(".art-label")?.textContent || "";
        card.dataset.projectType = /SHORT/i.test(label) ? "short" : /LONG/i.test(label) ? "long" : "unknown";
      }
    });
    applyFilter(active);
  });
  observer.observe(grid, { childList: true, subtree: false });
  grid.querySelectorAll(".project-card").forEach(card => {
    const label = card.querySelector(".art-label")?.textContent || "";
    card.dataset.projectType = /SHORT/i.test(label) ? "short" : /LONG/i.test(label) ? "long" : "unknown";
  });
  applyFilter("all");
})();
