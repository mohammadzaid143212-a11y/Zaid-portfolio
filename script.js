const menuButton = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav-links");
if (menuButton && nav) {
  const setMenuOpen = open => {
    nav.classList.toggle("open", open);
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
    nav.setAttribute("aria-hidden", String(!open));
  };
  menuButton.addEventListener("click", () => setMenuOpen(menuButton.getAttribute("aria-expanded") !== "true"));
  nav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => setMenuOpen(false)));
  document.addEventListener("click", event => {
    if (!nav.contains(event.target) && !menuButton.contains(event.target)) setMenuOpen(false);
  });
  document.addEventListener("keydown", event => { if (event.key === "Escape") setMenuOpen(false); });
}
const year = document.querySelector("#year");
if (year) year.textContent = new Date().getFullYear();

// Subtle scroll reveals; content remains visible if reduced motion is preferred.
if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window) {
  document.body.classList.add("reveal-ready");
  const revealTargets = document.querySelectorAll(".section-kicker, .section-heading h2, .project-card, .about-inner > div, .contact-section > h2, .contact-cta");
  revealTargets.forEach(el => el.classList.add("reveal"));
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealTargets.forEach(el => revealObserver.observe(el));
}


// Published portfolio projects are loaded from Supabase. Placeholder cards remain if no projects are published.
(async function loadPublishedProjects() {
  if (!window.supabase) return;
  const SUPABASE_URL = "https://rtaedoseedjwljixmrgy.supabase.co";
  const SUPABASE_PUBLIC_KEY = "sb_publishable__Oc_xT1AELiVIQgCgXytTQ_qxLd_ZFo";
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
  const { data, error } = await client.from("portfolio_projects")
    .select("id,title,project_type,description,video_url,thumbnail_url,sort_order")
    .eq("is_published", true).order("sort_order", { ascending: true }).order("created_at", { ascending: false });
  if (error) return;
  const publishedCount = document.getElementById("published-project-count");
  if (publishedCount) publishedCount.textContent = String((data || []).length).padStart(2, "0");
  if (!data || !data.length) {
    const longGrid = document.getElementById("long-video-gallery");
    const shortGrid = document.getElementById("short-video-gallery");
    [
      [longGrid, "Long-form films", "Published films will appear here."],
      [shortGrid, "Short-form edits", "Published reels and shorts will appear here."]
    ].forEach(([grid, title, note]) => {
      if (!grid) return;
      grid.replaceChildren();
      const empty = document.createElement("div");
      empty.className = "empty-gallery-state";
      const heading = document.createElement("strong");
      heading.textContent = title;
      const caption = document.createElement("span");
      caption.textContent = note;
      empty.append(heading, caption);
      grid.append(empty);
    });
    return;
  }

  const longGrid = document.getElementById("long-video-gallery");
  const shortGrid = document.getElementById("short-video-gallery");
  const grid = longGrid;
  if (!longGrid || !shortGrid) return;
  longGrid.replaceChildren();
  shortGrid.replaceChildren();

  function videoInfo(rawUrl, isShort) {
    let url;
    try { url = new URL(rawUrl); } catch { return { kind: "link", url: "#" }; }
    if (!["https:", "http:"].includes(url.protocol)) return { kind: "link", url: "#" };
    const host = url.hostname.replace(/^www\./, "");
    let id = "";
    if (host === "youtu.be") id = url.pathname.split("/").filter(Boolean)[0] || "";
    if (host === "youtube.com" || host.endsWith(".youtube.com")) {
      if (url.pathname === "/watch") id = url.searchParams.get("v") || "";
      else if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) id = url.pathname.split("/")[2] || "";
    }
    if (id) return { kind: "iframe", url: "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(id) + (isShort ? "?autoplay=1&mute=1&loop=1&playlist=" + encodeURIComponent(id) + "&controls=0&playsinline=1" : "?rel=0&playsinline=1") };
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const vimeoId = url.pathname.split("/").filter(Boolean).pop();
      if (vimeoId && /^\d+$/.test(vimeoId)) return { kind: "iframe", url: "https://player.vimeo.com/video/" + vimeoId + (isShort ? "?autoplay=1&muted=1&loop=1&title=0&byline=0" : "") };
    }
    if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url.pathname + url.search)) return { kind: "video", url: url.href };
    return { kind: "link", url: url.href };
  }

  // Cursor reveal: expose the first published project's own thumbnail beneath the showreel.
  // The effect is progressive enhancement; it stays hidden when no real project thumbnail exists.
  const heroFrame = document.querySelector(".hero-frame");
  const revealLayer = heroFrame?.querySelector(".hero-reveal-layer");
  const revealImage = revealLayer?.querySelector(".hero-reveal-image");
  const revealSource = data.find(project => typeof project.thumbnail_url === "string" && /^https?:\/\//i.test(project.thumbnail_url));
  const heroPoster = heroFrame?.querySelector(".hero-poster");
  if (heroPoster && revealSource) {
    try {
      const posterUrl = new URL(revealSource.thumbnail_url);
      if (["https:", "http:"].includes(posterUrl.protocol)) {
        heroPoster.style.backgroundImage = 'url("' + posterUrl.href + '")';
      }
    } catch {}
  }
  if (heroFrame && revealLayer && revealImage && revealSource && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    revealImage.src = revealSource.thumbnail_url;
    revealImage.alt = "";
    revealLayer.classList.add("is-ready");
    let revealFrame = 0;
    heroFrame.addEventListener("pointermove", event => {
      if (event.pointerType === "mouse" || event.pointerType === "pen" || event.pointerType === "touch") {
        const bounds = heroFrame.getBoundingClientRect();
        const x = Math.max(0, Math.min(bounds.width, event.clientX - bounds.left));
        const y = Math.max(0, Math.min(bounds.height, event.clientY - bounds.top));
        if (revealFrame) cancelAnimationFrame(revealFrame);
        revealFrame = requestAnimationFrame(() => {
          revealLayer.style.setProperty("--reveal-x", x + "px");
          revealLayer.style.setProperty("--reveal-y", y + "px");
          revealLayer.classList.add("is-active");
          revealFrame = 0;
        });
      }
    }, { passive: true });
    heroFrame.addEventListener("pointerleave", () => revealLayer.classList.remove("is-active"));
    heroFrame.addEventListener("pointerdown", event => {
      if (event.pointerType === "touch") revealLayer.classList.add("is-active");
    }, { passive: true });
  }

  // Accessible cinematic quick-view for published projects; full detail pages remain available.
  let showcaseDialog = document.getElementById("project-showcase-dialog");
  if (!showcaseDialog) {
    showcaseDialog = document.createElement("dialog");
    showcaseDialog.id = "project-showcase-dialog";
    showcaseDialog.className = "project-showcase-dialog";
    showcaseDialog.setAttribute("aria-label", "Project showcase");
    showcaseDialog.innerHTML = '<div class="showcase-shell"><button class="showcase-close" type="button" aria-label="Close project showcase">×</button><div class="showcase-media"></div><div class="showcase-copy"><p class="showcase-kicker">SELECTED WORK</p><h2 class="showcase-title"></h2><p class="showcase-description"></p><a class="showcase-detail-link">OPEN PROJECT DETAILS ↗</a></div></div>';
    document.body.append(showcaseDialog);
    showcaseDialog.querySelector(".showcase-close").addEventListener("click", () => showcaseDialog.close());
    showcaseDialog.addEventListener("click", event => { if (event.target === showcaseDialog) showcaseDialog.close(); });
    showcaseDialog.addEventListener("close", () => showcaseDialog.querySelector(".showcase-media").replaceChildren());
  }
  function openProjectShowcase(project, media) {
    const mediaHost = showcaseDialog.querySelector(".showcase-media");
    const title = showcaseDialog.querySelector(".showcase-title");
    const description = showcaseDialog.querySelector(".showcase-description");
    const detail = showcaseDialog.querySelector(".showcase-detail-link");
    mediaHost.replaceChildren();
    title.textContent = project.title || "Selected project";
    description.textContent = project.description || (project.project_type === "long" ? "Cinematic edit / Long-form" : "Short-form / Social");
    detail.href = "/project/?id=" + encodeURIComponent(project.id);
    if (media.kind === "iframe") {
      const frame = document.createElement("iframe"); frame.src = media.url; frame.title = project.title || "Project video";
      frame.allow = "autoplay; fullscreen; picture-in-picture; encrypted-media"; frame.allowFullscreen = true;
      frame.referrerPolicy = "strict-origin-when-cross-origin"; mediaHost.append(frame);
    } else if (media.kind === "video") {
      const video = document.createElement("video"); video.src = media.url; video.controls = true; video.playsInline = true;
      video.preload = "metadata"; if (project.thumbnail_url) video.poster = project.thumbnail_url;
      if (project.project_type === "short") { video.autoplay = true; video.muted = true; video.loop = true; }
      mediaHost.append(video);
    } else {
      const link = document.createElement("a"); link.href = media.url; link.target = "_blank"; link.rel = "noopener noreferrer";
      link.textContent = "Watch this project ↗"; mediaHost.append(link);
    }
    if (!showcaseDialog.open) showcaseDialog.showModal();
  }

  data.forEach((project, index) => {
    const card = document.createElement("article");
    card.className = "project-card" + (project.project_type === "long" && index === 0 ? " project-large" : "") + (project.project_type === "short" ? " project-vertical" : " project-landscape");
    card.dataset.projectType = project.project_type === "short" ? "short" : "long";
    card.dataset.aspectRatio = project.project_type === "short" ? "9:16" : "16:9";
    const art = document.createElement("div");
    art.className = "project-art live-project-art";
    art.style.background = "#111114";
    art.style.padding = "0";
    const media = videoInfo(project.video_url, project.project_type === "short");
    if (media.kind === "iframe") {
      const frame = document.createElement("iframe");
      frame.src = media.url; frame.title = project.title; frame.loading = "lazy";
      frame.allow = "autoplay; fullscreen; picture-in-picture; encrypted-media";
      frame.allowFullscreen = true; frame.referrerPolicy = "strict-origin-when-cross-origin";
      frame.style.cssText = "width:100%;height:100%;border:0;position:absolute;inset:0";
      art.append(frame);
    } else if (media.kind === "video") {
      const video = document.createElement("video");
      video.src = media.url; video.controls = project.project_type !== "short";
      video.playsInline = true; video.preload = "metadata";
      if (project.project_type === "short") { video.autoplay = true; video.muted = true; video.loop = true; }
      if (project.thumbnail_url) video.poster = project.thumbnail_url;
      video.style.cssText = "width:100%;height:100%;object-fit:cover;position:absolute;inset:0";
      art.append(video);
    } else {
      if (project.thumbnail_url) {
        const thumbnail = document.createElement("img");
        thumbnail.src = project.thumbnail_url; thumbnail.alt = ""; thumbnail.loading = "lazy"; thumbnail.decoding = "async";
        thumbnail.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover";
        art.append(thumbnail);
      }
      const link = document.createElement("a"); link.href = media.url; link.target = "_blank"; link.rel = "noopener noreferrer";
      link.textContent = project.project_type === "short" ? "Watch short video ↗" : "Watch project ↗";
      link.style.cssText = "position:absolute;inset:0;display:grid;place-items:center;background:#0005;font-size:14px";
      art.append(link);
    }
    const label = document.createElement("span"); label.className = "art-label";
    label.textContent = (project.project_type === "long" ? "LONG VIDEO" : "SHORT VIDEO") + " / " + String(index + 1).padStart(2, "0");
    label.style.cssText = "position:absolute;z-index:2;top:16px;left:16px;text-shadow:0 1px 6px #000";
    art.append(label);
    const expandButton = document.createElement("button");
    expandButton.type = "button"; expandButton.className = "project-expand-button";
    expandButton.textContent = "EXPAND ↗"; expandButton.setAttribute("aria-label", "Open " + (project.title || "project") + " in cinematic showcase");
    expandButton.addEventListener("click", () => openProjectShowcase(project, media));
    art.append(expandButton);
    const info = document.createElement("div"); info.className = "project-info";
    const copy = document.createElement("div");
    const title = document.createElement("h3"); title.textContent = project.title;
    const desc = document.createElement("p"); desc.textContent = project.description || (project.project_type === "long" ? "Cinematic edit / Long-form" : "Short-form / Social");
    copy.append(title, desc);
    const detailLink = document.createElement("a");
    detailLink.className = "project-detail-link";
    detailLink.href = "/project/?id=" + encodeURIComponent(project.id);
    detailLink.textContent = "View project ↗";
    copy.append(detailLink);
    info.append(copy);
    const arrow = document.createElement("span"); arrow.className = "project-arrow"; arrow.textContent = "↗"; info.append(arrow);
    card.append(art, info);
    (project.project_type === "short" ? shortGrid : longGrid).append(card);
  });
  document.querySelectorAll("[data-video-gallery]").forEach(section => {
    const type = section.dataset.videoGallery;
    const target = type === "short" ? shortGrid : longGrid;
    section.hidden = !target.children.length;
  });
})();


// Load the saved Owner Studio visual theme settings on the public portfolio.
(async function loadPublishedTheme() {
  if (!window.supabase) return;
  const client = window.supabase.createClient(
    "https://rtaedoseedjwljixmrgy.supabase.co",
    "sb_publishable__Oc_xT1AELiVIQgCgXytTQ_qxLd_ZFo"
  );
  const { data, error } = await client.from("portfolio_theme_settings")
    .select("settings").eq("id", true).maybeSingle();
  if (error || !data?.settings) return;
  // Apply saved SEO/site identity metadata to the live document.
  const siteSeo = data.settings.__siteSeo || {};
  if (siteSeo.title) document.title = String(siteSeo.title).slice(0,70);
  const setMeta = (selector, attribute, value, content) => {
    if (!content) return;
    let tag = document.head.querySelector(selector);
    if (!tag) { tag = document.createElement("meta"); tag.setAttribute(attribute, value); document.head.append(tag); }
    tag.content = String(content);
  };
  if (siteSeo.description) setMeta('meta[name="description"]', "name", "description", String(siteSeo.description).slice(0,180));
  if (siteSeo.themeColor) setMeta('meta[name="theme-color"]', "name", "theme-color", /^#[0-9a-f]{6}$/i.test(siteSeo.themeColor) ? siteSeo.themeColor : "#0b0b0d");
  setMeta('meta[property="og:title"]', "property", "og:title", siteSeo.socialTitle || siteSeo.title);
  setMeta('meta[property="og:description"]', "property", "og:description", siteSeo.socialDescription || siteSeo.description);
  setMeta('meta[property="og:type"]', "property", "og:type", "website");
  setMeta('meta[property="og:url"]', "property", "og:url", window.location.href);
  setMeta('meta[name="twitter:card"]', "name", "twitter:card", siteSeo.image ? "summary_large_image" : "summary");
  if (siteSeo.image) {
    try {
      const imageUrl = new URL(siteSeo.image);
      if (["https:", "http:"].includes(imageUrl.protocol)) {
        setMeta('meta[property="og:image"]', "property", "og:image", imageUrl.href);
        setMeta('meta[name="twitter:image"]', "name", "twitter:image", imageUrl.href);
      }
    } catch {}
  }
  setMeta('meta[name="twitter:title"]', "name", "twitter:title", siteSeo.socialTitle || siteSeo.title);
  setMeta('meta[name="twitter:description"]', "name", "twitter:description", siteSeo.socialDescription || siteSeo.description);
  const selectors = {
    site: "body", header: ".site-header", hero: ".hero", "hero-title": ".hero h1",
    "hero-media": ".hero-frame", work: ".work-section", "project-cards": ".project-card",
    about: ".about-section", contact: ".contact-section", footer: ".site-footer"
  };
  const customFonts = data.settings.__customFonts || [];
  for (const font of customFonts) {
    try { const face = new FontFace(font.name, 'url("' + font.url + '")'); await face.load(); document.fonts.add(face); }
    catch (error) { console.warn("Could not load custom portfolio font:", font.name, error); }
  }
  const textOverrides = data.settings.__textStudio || {};
  const textSelectors = {
    "hero-description": ".hero-bottom p", "hero-caption": ".frame-caption",
    "work-intro": ".section-heading > p",
    "project-one-title": ".project-large .project-info h3", "project-one-description": ".project-large .project-info p",
    "project-two-title": ".project-grid article:nth-child(2) .project-info h3", "project-two-description": ".project-grid article:nth-child(2) .project-info p",
    "project-three-title": ".project-grid article:nth-child(3) .project-info h3", "project-three-description": ".project-grid article:nth-child(3) .project-info p",
    "about-description": ".about-inner > div > p"
  };
  Object.entries(textOverrides).forEach(([key, setting]) => {
    const selector = textSelectors[key];
    if (!selector || !setting) return;
    document.querySelectorAll(selector).forEach(el => {
      if (typeof setting.content === "string") el.textContent = setting.content;
      el.style.fontFamily = setting.font || "";
      el.style.fontSize = setting.size ? setting.size + "px" : "";
      el.style.fontWeight = setting.weight || "";
      el.style.textAlign = setting.align || "";
      el.style.color = setting.color || "";
    });
  });
  Object.entries(data.settings).forEach(([key, setting]) => {
    const selector = key.startsWith("custom:") ? key.slice(7) : selectors[key];
    if (!selector || !setting) return;
    document.querySelectorAll(selector).forEach(el => {
      el.style.color = setting.text || "";
      if (setting.accent) el.style.setProperty("--accent", setting.accent);
      el.style.opacity = setting.opacity == null ? "" : String(setting.opacity / 100);
      el.style.borderRadius = setting.radius ? setting.radius + "px" : "";
      el.style.transform = setting.rotation ? "rotate(" + setting.rotation + "deg)" : "";
      el.style.animation = "none";
      const animationNames = { "fade-in":"themeFadeIn", float:"themeFloat", pulse:"themePulse", "slow-zoom":"themeSlowZoom", "slide-up":"themeSlideUp", "slide-left":"themeSlideLeft", spin:"themeSpin" };
      if (setting.animation && animationNames[setting.animation] && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        el.style.animation = animationNames[setting.animation] + " " + (setting.duration || 6) + "s ease-in-out infinite alternate";
      }
      if (setting.mode === "color") {
        el.style.backgroundColor = setting.bg || "";
        el.style.backgroundImage = "";
        const old = el.querySelector(":scope > .theme-background-video"); if (old) old.remove();
      } else if (setting.mode === "image" && setting.mediaUrl) {
        el.style.backgroundColor = setting.bg || "transparent";
        el.style.backgroundImage = "linear-gradient(0deg,rgba(0,0,0,.25),rgba(0,0,0,.08)),url(\"" + setting.mediaUrl.replace(/["\\\\]/g, "") + "\")";
        el.style.backgroundSize = "cover"; el.style.backgroundPosition = "center";
        const old = el.querySelector(":scope > .theme-background-video"); if (old) old.remove();
      } else if (setting.mode === "video" && setting.mediaUrl) {
        el.style.backgroundColor = setting.bg || "#0b0b0d";
        let video = el.querySelector(":scope > .theme-background-video");
        if (!video) {
          video = document.createElement("video"); video.className = "theme-background-video";
          video.muted = true; video.loop = true; video.autoplay = true; video.playsInline = true;
          video.setAttribute("aria-hidden", "true"); video.setAttribute("tabindex", "-1");
          video.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;pointer-events:none";
          if (getComputedStyle(el).position === "static") el.style.position = "relative";
          el.prepend(video);
          Array.from(el.children).forEach(child => { if (child !== video) { if (!child.style.position) child.style.position = "relative"; if (!child.style.zIndex) child.style.zIndex = "1"; } });
        }
        if (video.src !== setting.mediaUrl) video.src = setting.mediaUrl;
        const play = video.play(); if (play && play.catch) play.catch(() => {});
      } else if (setting.mode === "none") {
        el.style.backgroundColor = ""; el.style.backgroundImage = "";
        const old = el.querySelector(":scope > .theme-background-video"); if (old) old.remove();
      }
    });
  });

  // Apply owner-managed page structure after core theme settings are loaded.
  const layoutStyle=document.createElement("style");
  layoutStyle.textContent=".owner-custom-section{padding:clamp(48px,8vw,110px) 5vw;border-top:1px solid rgba(255,255,255,.12)}.owner-custom-section .section-inner{max-width:1180px;margin:auto}.owner-custom-section h2{font-size:clamp(30px,5vw,64px);margin:0 0 16px}.owner-custom-section p{max-width:720px;line-height:1.8;opacity:.78}";
  document.head.append(layoutStyle);
  const layout = data.settings.__siteLayout || {};
  const sectionMap = { hero: ".hero", work: ".work-section", about: ".about-section", contact: ".contact-section" };
  const mainContent = document.querySelector("main") || document.body;
  const customSections = Array.isArray(layout.customSections) ? layout.customSections.slice(0,12) : [];
  const customById = new Map(customSections.filter(x=>x&&typeof x.id==="string"&&/^[a-z0-9-]{1,48}$/.test(x.id)).map(x=>[x.id,x]));
  const order = Array.isArray(layout.order) ? layout.order : ["hero","work","about","contact"];
  const applied = new Set();
  function appendCustom(item) {
    if (!item || applied.has("custom:"+item.id)) return;
    const section=document.createElement("section");section.className="owner-custom-section";section.id="owner-section-"+item.id;
    const inner=document.createElement("div");inner.className="section-inner";
    const heading=document.createElement("h2");heading.textContent=String(item.title||"New section").slice(0,70);
    const copy=document.createElement("p");copy.textContent=String(item.copy||"").slice(0,500);
    inner.append(heading,copy);section.append(inner);mainContent.append(section);applied.add("custom:"+item.id);
  }
  order.forEach(key=>{
    if (typeof key!=="string") return;
    if (key.startsWith("custom:")) { appendCustom(customById.get(key.slice(7))); return; }
    const selector=sectionMap[key],node=selector?document.querySelector(selector):null;
    if(!node||applied.has(key))return;
    const visible=layout.visibility?.[key]!==false;node.hidden=!visible;node.setAttribute("aria-hidden",String(!visible));
    mainContent.append(node);applied.add(key);
  });
  Object.entries(sectionMap).forEach(([key,selector])=>{
    const node=document.querySelector(selector);if(!node)return;
    const visible=layout.visibility?.[key]!==false;node.hidden=!visible;node.setAttribute("aria-hidden",String(!visible));
    if(!applied.has(key)){mainContent.append(node);applied.add(key)}
  });
  customSections.forEach(appendCustom);

  // Apply saved Animation Studio presets on the public portfolio.
  const animationSettings = data.settings.__animationStudio || {};
  const motionSelectors = {
    "hero-title": ".hero h1", "hero-description": ".hero-bottom p", "hero-media": ".hero-frame",
    work: ".work-section", "project-cards": ".project-card", "project-one": ".project-grid article:first-child",
    about: ".about-section", contact: ".contact-section", header: ".site-header", footer: ".site-footer"
  };
  const motionNames = {
    fade: "portfolioMotionFade", rise: "portfolioMotionRise", "slide-left": "portfolioMotionLeft",
    "slide-right": "portfolioMotionRight", zoom: "portfolioMotionZoom", float: "portfolioMotionFloat",
    blur: "portfolioMotionBlur", pulse: "portfolioMotionPulse"
  };
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const style = document.createElement("style");
    style.textContent = "@keyframes portfolioMotionFade{from{opacity:0}to{opacity:1}}@keyframes portfolioMotionRise{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}@keyframes portfolioMotionLeft{from{opacity:0;transform:translateX(-32px)}to{opacity:1;transform:translateX(0)}}@keyframes portfolioMotionRight{from{opacity:0;transform:translateX(32px)}to{opacity:1;transform:translateX(0)}}@keyframes portfolioMotionZoom{from{opacity:.5;transform:scale(.92)}to{opacity:1;transform:scale(1)}}@keyframes portfolioMotionFloat{0%{transform:translateY(0)}50%{transform:translateY(-8px)}100%{transform:translateY(0)}}@keyframes portfolioMotionBlur{from{opacity:0;filter:blur(12px)}to{opacity:1;filter:blur(0)}}@keyframes portfolioMotionPulse{0%{opacity:.8;transform:scale(.98)}50%{opacity:1;transform:scale(1.015)}100%{opacity:.8;transform:scale(.98)}}";
    document.head.append(style);
    Object.entries(animationSettings).forEach(([key, setting]) => {
      const selector = motionSelectors[key], animationName = motionNames[setting?.preset];
      if (!selector || !animationName || !setting) return;
      let targets; try { targets = document.querySelectorAll(selector); } catch { return; }
      targets.forEach(el => {
        const play = () => {
          el.style.animation = animationName + " " + Math.max(.3,Math.min(20,Number(setting.duration)||1.2)) + "s " + (setting.easing||"ease-out") + " " + Math.max(0,Math.min(10,Number(setting.delay)||0)) + "s " + (setting.repeat==="infinite"?"infinite":"1") + " both";
        };
        if (setting.trigger === "load") play();
        else if ("IntersectionObserver" in window) {
          const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
              if (entry.isIntersecting) { play(); if (setting.repeat !== "infinite") observer.unobserve(el); }
            });
          }, { threshold: .12 });
          observer.observe(el);
        } else play();
      });
    });
  }

  // Apply saved direct edits to built-in headings and paragraphs.
  const visualOverrides = data.settings.__visualOverrides || {};
  Object.entries(visualOverrides).slice(0,80).forEach(([selector, setting]) => {
    if (!setting || typeof selector !== "string" || selector.length > 240) return;
    let target; try { target = document.querySelector(selector); } catch { return; }
    if (!target || target.closest(".owner-added-element,.owner-custom-section")) return;
    if (typeof setting.text === "string" && target.tagName.toLowerCase() !== "img" && !target.querySelector("*")) target.textContent = setting.text.slice(0,500);
    if (typeof setting.linkUrl === "string" && target.tagName.toLowerCase() === "a" && /^(https?:|mailto:|tel:|#|\/(?!\/)|\.\.?\/)/i.test(setting.linkUrl)) target.setAttribute("href",setting.linkUrl);
    if (target.tagName.toLowerCase() === "a" && ["_self","_blank"].includes(setting.linkTarget)) {
      target.setAttribute("target",setting.linkTarget);
      if (setting.linkTarget === "_blank") target.setAttribute("rel","noopener noreferrer"); else target.removeAttribute("rel");
    }
    if (typeof setting.imageSrc === "string" && target.tagName.toLowerCase() === "img" && /^(https?:|\/(?!\/)|\.\.?\/)/i.test(setting.imageSrc)) target.setAttribute("src",setting.imageSrc);
    if (target.tagName.toLowerCase() === "img") {
      if (typeof setting.imageAlt === "string") target.setAttribute("alt",setting.imageAlt.slice(0,240));
      if (["cover","contain","fill","none"].includes(setting.imageFit)) target.style.objectFit = setting.imageFit;
      if (["center","top","bottom","left","right"].includes(setting.imagePosition)) target.style.objectPosition = setting.imagePosition;
      if (Number.isFinite(Number(setting.imageWidth))) target.style.width = Math.max(20,Math.min(2000,Number(setting.imageWidth))) + "px";
      target.style.height = "auto";
    }
    if (Number.isFinite(Number(setting.fontSize))) target.style.fontSize = Math.max(10,Math.min(120,Number(setting.fontSize))) + "px";
    if (Number.isFinite(Number(setting.radius))) target.style.borderRadius = Math.max(0,Math.min(100,Number(setting.radius))) + "px";
    if (/^#[0-9a-f]{6}$/i.test(setting.color || "")) target.style.color = setting.color;
    if (/^#[0-9a-f]{6}$/i.test(setting.background || "")) target.style.backgroundColor = setting.background;
    if ([300,400,500,600,700,800].includes(Number(setting.fontWeight))) target.style.fontWeight = String(Number(setting.fontWeight));
    if (["left","center","right","justify"].includes(setting.textAlign)) target.style.textAlign = setting.textAlign;
    if (Number.isFinite(Number(setting.letterSpacing))) target.style.letterSpacing = Math.max(-2,Math.min(20,Number(setting.letterSpacing))) + "px";
    if (Number.isFinite(Number(setting.opacity))) target.style.opacity = String(Math.max(10,Math.min(100,Number(setting.opacity)))/100);
    if (Number.isFinite(Number(setting.borderWidth))) { const width = Math.max(0,Math.min(20,Number(setting.borderWidth))); target.style.borderWidth = width + "px"; target.style.borderStyle = width > 0 ? "solid" : "none"; }
    if (/^#[0-9a-f]{6}$/i.test(setting.borderColor || "")) target.style.borderColor = setting.borderColor;
    if (Number.isFinite(Number(setting.lineHeight))) target.style.lineHeight = String(Math.max(0.8,Math.min(3,Number(setting.lineHeight))));
    if (["none","underline","line-through","overline"].includes(setting.textDecoration)) target.style.textDecoration = setting.textDecoration;
    const desktopPosition = setting.positionDesktop || setting.position;
    if (desktopPosition && typeof desktopPosition === "object") {
      const x = Math.max(-100,Math.min(100,Number(desktopPosition.x)||0));
      const y = Math.max(-100,Math.min(100,Number(desktopPosition.y)||0));
      const width = Math.max(5,Math.min(100,Number(desktopPosition.width)||100));
      target.style.position = "relative"; target.style.left = x + "%"; target.style.top = y + "%"; target.style.width = width + "%";
    }
    if (setting.styleMobile && typeof setting.styleMobile === "object") {
      const mobile = setting.styleMobile, declarations = [];
      if (Number.isFinite(Number(mobile.fontSize))) declarations.push("font-size:"+Math.max(10,Math.min(120,Number(mobile.fontSize)))+"px");
      if (Number.isFinite(Number(mobile.radius))) declarations.push("border-radius:"+Math.max(0,Math.min(100,Number(mobile.radius)))+"px");
      if (/^#[0-9a-f]{6}$/i.test(mobile.color||"")) declarations.push("color:"+mobile.color);
      if (/^#[0-9a-f]{6}$/i.test(mobile.background||"")) declarations.push("background-color:"+mobile.background);
      if ([300,400,500,600,700,800].includes(Number(mobile.fontWeight))) declarations.push("font-weight:"+Number(mobile.fontWeight));
      if (["left","center","right","justify"].includes(mobile.textAlign)) declarations.push("text-align:"+mobile.textAlign);
      if (Number.isFinite(Number(mobile.letterSpacing))) declarations.push("letter-spacing:"+Math.max(-2,Math.min(20,Number(mobile.letterSpacing)))+"px");
      if (Number.isFinite(Number(mobile.opacity))) declarations.push("opacity:"+(Math.max(10,Math.min(100,Number(mobile.opacity)))/100));
      if (Number.isFinite(Number(mobile.borderWidth))) { const width=Math.max(0,Math.min(20,Number(mobile.borderWidth))); declarations.push("border-width:"+width+"px","border-style:"+(width>0?"solid":"none")); }
      if (/^#[0-9a-f]{6}$/i.test(mobile.borderColor||"")) declarations.push("border-color:"+mobile.borderColor);
      if (Number.isFinite(Number(mobile.lineHeight))) declarations.push("line-height:"+Math.max(0.8,Math.min(3,Number(mobile.lineHeight))));
      if (["none","underline","line-through","overline"].includes(mobile.textDecoration)) declarations.push("text-decoration:"+mobile.textDecoration);
      if (target.tagName.toLowerCase()==="img") {
        if (Number.isFinite(Number(mobile.imageWidth))) declarations.push("width:"+Math.max(20,Math.min(2000,Number(mobile.imageWidth)))+"px");
        if (["cover","contain","fill","none"].includes(mobile.imageFit)) declarations.push("object-fit:"+mobile.imageFit);
        if (["center","top","bottom","left","right"].includes(mobile.imagePosition)) declarations.push("object-position:"+mobile.imagePosition);
      }
      if (declarations.length) { const style=document.createElement("style"); style.textContent="@media (max-width: 680px) { "+selector+" { "+declarations.join(";")+" !important; } }"; document.head.append(style); }
    }
    if (setting.positionMobile && typeof setting.positionMobile === "object") {
      const mobile = setting.positionMobile;
      const x = Math.max(-100,Math.min(100,Number(mobile.x)||0));
      const y = Math.max(-100,Math.min(100,Number(mobile.y)||0));
      const width = Math.max(5,Math.min(100,Number(mobile.width)||100));
      const style = document.createElement("style");
      style.textContent = "@media (max-width: 680px) { " + selector + " { position:relative !important; left:" + x + "% !important; top:" + y + "% !important; width:" + width + "% !important; } }";
      document.head.append(style);
    }
  });

const customElements = Array.isArray(data.settings.__elements) ? data.settings.__elements : [];
  const animationNames = { "fade-in":"themeFadeIn", float:"themeFloat", pulse:"themePulse", "slow-zoom":"themeSlowZoom", "slide-up":"themeSlideUp", "slide-left":"themeSlideLeft" };
  customElements.slice(0,30).forEach(item => {
    if (item.hidden === true) return;
    let targets;
    try { targets = document.querySelectorAll(item.target); } catch { return; }
    if (!targets.length) return;
    targets.forEach(target => {
      const node = document.createElement("div");
      node.className = "owner-added-element";
      node.dataset.elementId = item.id || "";
      const overlay = item.overlay !== false;
      const x = Math.max(0,Math.min(100,Number(item.x ?? 50)));
      const y = Math.max(0,Math.min(100,Number(item.y ?? 50)));
      if (overlay && getComputedStyle(target).position === "static") target.style.position = "relative";
      const elementColor=item.color||"#c9f36a", elementRotation=Math.max(-180,Math.min(180,Number(item.rotation)||0)), elementOpacity=Math.max(10,Math.min(100,Number(item.opacity)||100)), elementRadius=Math.max(0,Math.min(200,Number(item.radius)||0)), elementBorder=Math.max(0,Math.min(10,Number(item.borderWidth)||0)); const elementShadow=({none:"none",soft:"0 8px 24px #0009",glow:"0 0 22px "+elementColor+"99",deep:"0 16px 40px #000"})[item.shadow]||"none"; node.style.cssText = "box-sizing:border-box;z-index:" + (item.layer === "back" ? "1" : "3") + ";width:min(var(--owner-element-width," + Math.max(10,Math.min(100,Number(item.width)||80)) + "%),100%);padding:8px;text-align:center;color:" + elementColor + ";opacity:"+(elementOpacity/100)+";border-radius:"+elementRadius+"px;border:"+elementBorder+"px solid "+elementColor+";box-shadow:"+elementShadow+";";
      const mobile = item.mobile && typeof item.mobile === "object" ? item.mobile : {};
      if (mobile.width != null && Number.isFinite(Number(mobile.width))) node.style.setProperty("--owner-element-width",Math.max(10,Math.min(100,Number(mobile.width)))+"%");
      if (item.mobile && typeof item.mobile === "object") {
        const mobileX = Math.max(0,Math.min(100,Number(item.mobile.x ?? x)));
        const mobileY = Math.max(0,Math.min(100,Number(item.mobile.y ?? y)));
        const mobileWidth = Math.max(10,Math.min(100,Number(item.mobile.width ?? item.width ?? 80)));
        const responsiveStyle = document.createElement("style");
        const safeId = String(item.id || "").replace(/[^a-zA-Z0-9_-]/g, "");
        responsiveStyle.textContent = "@media (max-width: 680px) { .owner-added-element[data-element-id="+safeId+"] { width: min("+mobileWidth+"%, 100%) !important; "+(overlay ? "left:"+mobileX+"% !important;top:"+mobileY+"% !important;" : "")+" } }";
        document.head.append(responsiveStyle);
      }
      if (overlay) {
        node.style.position = "absolute"; node.style.left = "var(--owner-element-x," + x + "%)"; node.style.top = "var(--owner-element-y," + y + "%)";
        if (mobile.x != null && Number.isFinite(Number(mobile.x))) node.style.setProperty("--owner-element-x",Math.max(0,Math.min(100,Number(mobile.x)))+"%");
        if (mobile.y != null && Number.isFinite(Number(mobile.y))) node.style.setProperty("--owner-element-y",Math.max(0,Math.min(100,Number(mobile.y)))+"%");
        node.style.margin = "0"; node.style.transform = "translate(-50%,-50%) rotate("+elementRotation+"deg)";
      } else {
        node.style.position = "relative"; node.style.margin = (item.placement === "top" ? "0 auto 24px" : item.placement === "bottom" ? "24px auto 0" : "24px auto"); node.style.transform = "rotate("+elementRotation+"deg)";
      }
      if (item.animation && animationNames[item.animation] && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        node.style.animation = animationNames[item.animation] + " " + Math.max(.5,Math.min(30,Number(item.duration)||6)) + "s ease-in-out infinite alternate";
      }
      if (item.kind === "text") {
        node.textContent = String(item.content || "").slice(0,240);
        node.style.fontFamily = "Manrope, sans-serif";
        node.style.fontSize = "clamp(10px," + Math.max(10,Math.min(160,Number(item.fontSize)||34)) + "px,160px)";
        node.style.fontWeight = String(Math.max(300,Math.min(800,Number(item.fontWeight)||600)));
        node.style.textAlign = ["left","center","right"].includes(item.textAlign) ? item.textAlign : "center";
        node.style.lineHeight = String(Math.max(0.8,Math.min(3,Number(item.lineHeight)||1.2)));
        node.style.letterSpacing = Math.max(-2,Math.min(20,Number(item.letterSpacing)||0)) + "px";
        node.style.textDecoration = ["none","underline","line-through","overline"].includes(item.textDecoration) ? item.textDecoration : "none";
        node.style.overflowWrap = "anywhere";
      } else if (item.kind === "shape") {
        node.style.height = Math.max(20,Math.min(1600,Number(item.height)||180)) + "px";
        node.style.minHeight = "20px";
        const gradientColor = /^#[0-9a-f]{6}$/i.test(item.gradientColor || "") ? item.gradientColor : "#6b8cff";
        const gradientAngle = Math.max(0,Math.min(360,Number(item.gradientAngle)||135));
        node.style.background = item.backgroundMode === "gradient" ? "linear-gradient("+gradientAngle+"deg,"+elementColor+","+gradientColor+")" : elementColor;
        node.style.padding = "0";
        node.setAttribute("aria-label","Decorative shape or container");
      } else {
        let media;
        if (item.kind === "image") {
          media = document.createElement("img"); media.alt = ""; media.loading = "lazy"; media.decoding = "async";
          media.style.cssText = "display:block;width:100%;max-height:70vh;object-fit:contain;margin:auto";
        } else if (item.kind === "video") {
          media = document.createElement("video"); media.muted = true; media.loop = true; media.autoplay = true; media.playsInline = true;
          media.setAttribute("aria-label","Decorative motion graphic"); media.style.cssText = "display:block;width:100%;max-height:70vh;object-fit:contain;margin:auto";
          media.controls = true;
          if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { media.autoplay = false; media.controls = true; }
        } else return;
        media.src = item.url; node.append(media);
      }
      target.append(node);
    });
  });
})();
