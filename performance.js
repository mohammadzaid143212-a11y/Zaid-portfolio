(() => {
  "use strict";
  if (!window.supabase) return;
  const URL = "https://rtaedoseedjwljixmrgy.supabase.co";
  const KEY = "sb_publishable__Oc_xT1AELiVIQgCgXytTQ_qxLd_ZFo";
  const db = window.supabase.createClient(URL, KEY);
  db.from("portfolio_theme_settings").select("settings").eq("id", true).maybeSingle().then(({ data, error }) => {
    if (error) return;
    const settings = data?.settings?.__performance || {};
    if (settings.lazyImages !== false) {
      const markLazy = root => {
        const images = [];
        if (root?.matches?.("img:not([loading])")) images.push(root);
        root?.querySelectorAll?.("img:not([loading])").forEach(img => images.push(img));
        images.forEach(img => {
          // Keep images already in/near the first viewport eager for good LCP.
          const rect = img.getBoundingClientRect();
          if (rect.top < window.innerHeight * 1.25 && rect.bottom > -200) {
            img.loading = "eager";
            img.decoding = "async";
          } else {
            img.loading = "lazy";
            img.decoding = "async";
          }
        });
      };
      markLazy(document);
      const observer = new MutationObserver(records => records.forEach(record =>
        record.addedNodes.forEach(node => { if (node.nodeType === 1) markLazy(node); })
      ));
      observer.observe(document.body, { childList: true, subtree: true });
    }
    if (settings.metadataVideoPreload !== false) {
      document.querySelectorAll("video").forEach(video => {
        if (!video.hasAttribute("preload")) video.preload = "metadata";
      });
    }
    const mobile = matchMedia("(max-width: 680px)").matches;
    if (settings.pauseDecorativeOnMobile === true && mobile) {
      document.querySelectorAll(".hero-video,.theme-background-video").forEach(video => {
        video.autoplay = false;
        video.pause();
      });
    }
    if (settings.disableScrollReveals === true) {
      document.body.classList.remove("reveal-ready");
      document.querySelectorAll(".reveal").forEach(el => {
        el.classList.add("is-visible");
        el.style.opacity = "1";
        el.style.transform = "none";
      });
    }
  }).catch(() => {});
})();