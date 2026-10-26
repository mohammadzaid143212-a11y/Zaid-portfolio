const menuButton = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav-links");
if (menuButton && nav) {
  menuButton.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.textContent = open ? "×" : "☰";
  });
  nav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
    nav.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.textContent = "☰";
  }));
}
const year = document.querySelector("#year");
if (year) year.textContent = new Date().getFullYear();

// Subtle scroll reveals; content remains visible if reduced motion is preferred.
if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window) {
  document.body.classList.add("reveal-ready");
  const revealTargets = document.querySelectorAll(".section-kicker, .section-heading h2, .project-card, .about-inner > div, .contact-section > h2, .contact-link");
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
  if (error || !data || !data.length) return;

  const grid = document.querySelector(".project-grid");
  if (!grid) return;
  grid.replaceChildren();

  function videoInfo(rawUrl, isShort) {
    let url;
    try { url = new URL(rawUrl); } catch { return { kind: "link", url: rawUrl }; }
    const host = url.hostname.replace(/^www\./, "");
    let id = "";
    if (host === "youtu.be") id = url.pathname.split("/").filter(Boolean)[0] || "";
    if (host.endsWith("youtube.com")) {
      if (url.pathname === "/watch") id = url.searchParams.get("v") || "";
      else if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) id = url.pathname.split("/")[2] || "";
    }
    if (id) return { kind: "iframe", url: "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(id) + (isShort ? "?autoplay=1&mute=1&loop=1&playlist=" + encodeURIComponent(id) + "&controls=0&playsinline=1" : "?rel=0&playsinline=1") };
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const vimeoId = url.pathname.split("/").filter(Boolean).pop();
      if (vimeoId && /^\d+$/.test(vimeoId)) return { kind: "iframe", url: "https://player.vimeo.com/video/" + vimeoId + (isShort ? "?autoplay=1&muted=1&loop=1&title=0&byline=0" : "") };
    }
    if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(url.pathname + url.search)) return { kind: "video", url: url.href };
    return { kind: "link", url: url.href };
  }

  data.forEach((project, index) => {
    const card = document.createElement("article");
    card.className = "project-card" + (project.project_type === "long" && index === 0 ? " project-large" : "");
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
        art.style.backgroundImage = "linear-gradient(0deg,#050506cc,transparent 65%),url(" + JSON.stringify(project.thumbnail_url).slice(1,-1) + ")";
        art.style.backgroundSize = "cover"; art.style.backgroundPosition = "center";
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
    const info = document.createElement("div"); info.className = "project-info";
    const copy = document.createElement("div");
    const title = document.createElement("h3"); title.textContent = project.title;
    const desc = document.createElement("p"); desc.textContent = project.description || (project.project_type === "long" ? "Cinematic edit / Long-form" : "Short-form / Social");
    copy.append(title, desc); info.append(copy);
    const arrow = document.createElement("span"); arrow.className = "project-arrow"; arrow.textContent = "↗"; info.append(arrow);
    card.append(art, info); grid.append(card);
  });
  const note = document.querySelector(".work-note");
  if (note) note.textContent = "SELECTED PROJECTS — UPDATED FROM ZAID'S OWNER STUDIO.";
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
  const selectors = {
    site: "body", header: ".site-header", hero: ".hero", "hero-title": ".hero h1",
    "hero-media": ".hero-frame", work: ".work-section", "project-cards": ".project-card",
    about: ".about-section", contact: ".contact-section", footer: ".site-footer"
  };
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
})();
