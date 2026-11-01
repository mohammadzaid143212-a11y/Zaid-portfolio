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
    "about-description": ".about-inner > div > p", "work-note": ".work-note"
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

  const customElements = Array.isArray(data.settings.__elements) ? data.settings.__elements : [];
  const animationNames = { "fade-in":"themeFadeIn", float:"themeFloat", pulse:"themePulse", "slow-zoom":"themeSlowZoom", "slide-up":"themeSlideUp", "slide-left":"themeSlideLeft" };
  customElements.slice(0,30).forEach(item => {
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
        node.style.font = "600 clamp(18px,3vw,34px) Manrope, sans-serif";
        node.style.overflowWrap = "anywhere";
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


// Public portfolio assistant (chat-only). Messages are not persisted in this first phase.
(() => {
  const root = document.getElementById("zaid-ai");
  if (!root) return;
  const launch = document.getElementById("zaid-ai-launch");
  const panel = document.getElementById("zaid-ai-panel");
  const close = document.getElementById("zaid-ai-close");
  const form = document.getElementById("zaid-ai-form");
  const input = document.getElementById("zaid-ai-input");
  const send = document.getElementById("zaid-ai-send");
  const messages = document.getElementById("zaid-ai-messages");
  const suggestions = root.querySelector(".zaid-ai-suggestions");
  let busy = false;
  function toggle(open) {
    panel.hidden = !open;
    launch.setAttribute("aria-expanded", String(open));
    if (open) input.focus();
  }
  function addBubble(text, who) {
    const bubble = document.createElement("div");
    bubble.className = "zaid-ai-bubble " + who;
    bubble.textContent = text;
    messages.append(bubble);
    messages.scrollTop = messages.scrollHeight;
    return bubble;
  }
  launch.addEventListener("click", () => toggle(panel.hidden));
  close.addEventListener("click", () => toggle(false));
  suggestions.addEventListener("click", event => {
    const button = event.target.closest("[data-ai-prompt]");
    if (!button || busy) return;
    input.value = button.dataset.aiPrompt;
    form.requestSubmit();
  });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message || busy) return;
    addBubble(message, "visitor");
    input.value = "";
    suggestions.hidden = true;
    busy = true; send.disabled = true;
    const waiting = addBubble("Thinking…", "assistant");
    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      });
      const data = await response.json();
      waiting.textContent = data.answer || data.error || "The assistant is temporarily unavailable.";
    } catch {
      waiting.textContent = "I can’t connect right now. Please try again or use the contact page.";
    } finally {
      busy = false; send.disabled = false; input.focus();
      messages.scrollTop = messages.scrollHeight;
    }
  });
})();
