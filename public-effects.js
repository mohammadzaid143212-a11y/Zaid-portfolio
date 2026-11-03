(() => {
  "use strict";
  if (!window.supabase || !matchMedia("(pointer:fine)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const db = window.supabase.createClient("https://rtaedoseedjwljixmrgy.supabase.co", "sb_publishable__Oc_xT1AELiVIQgCgXytTQ_qxLd_ZFo");
  db.from("portfolio_theme_settings").select("settings").eq("id", true).maybeSingle().then(({ data, error }) => {
    if (error) return;
    const config = data?.settings?.__cursor;
    if (!config?.enabled) return;
    document.documentElement.style.setProperty("--zaid-cursor-color", config.color || "#c9f36a");
    document.documentElement.style.setProperty("--zaid-cursor-size", Math.max(16, Math.min(48, Number(config.size) || 28)) + "px");
    document.body.classList.add("zaid-custom-cursor");
    const dot = document.createElement("i"), ring = document.createElement("i");
    dot.className = "zaid-cursor-dot"; ring.className = "zaid-cursor-ring";
    document.body.append(dot, ring);
    document.addEventListener("pointermove", event => {
      for (const node of [dot, ring]) node.style.transform = "translate3d(" + event.clientX + "px," + event.clientY + "px,0) translate(-50%,-50%)";
    }, { passive: true });
    document.addEventListener("pointerover", event => ring.classList.toggle("is-hover", !!event.target.closest("a,button,input,textarea,select")));
  }).catch(() => {});
})();