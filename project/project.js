(() => {
  const SUPABASE_URL = "https://rtaedoseedjwljixmrgy.supabase.co";
  const SUPABASE_PUBLIC_KEY = "sb_publishable__Oc_xT1AELiVIQgCgXytTQ_qxLd_ZFo";
  const status = document.getElementById("project-detail-status");
  const article = document.getElementById("project-detail");
  const mediaBox = document.getElementById("project-detail-media");
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    status.textContent = "This project link is missing or invalid.";
    status.classList.add("error");
    return;
  }
  if (!window.supabase) {
    status.textContent = "Project service is temporarily unavailable. Please try again.";
    status.classList.add("error");
    return;
  }
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
  const el = (tag, className) => { const node = document.createElement(tag); if (className) node.className = className; return node; };
  function getMedia(raw) {
    let url;
    try { url = new URL(raw); } catch { return {kind:"link",url:"#"}; }
    if (!["https:","http:"].includes(url.protocol)) return {kind:"link",url:"#"};
    const host = url.hostname.replace(/^www\./,"");
    let videoId = "";
    if (host === "youtu.be") videoId = url.pathname.split("/").filter(Boolean)[0] || "";
    if (host === "youtube.com" || host.endsWith(".youtube.com")) {
      if (url.pathname === "/watch") videoId = url.searchParams.get("v") || "";
      else if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) videoId = url.pathname.split("/")[2] || "";
    }
    if (videoId) return {kind:"iframe",url:"https://www.youtube-nocookie.com/embed/"+encodeURIComponent(videoId)+"?rel=0&playsinline=1"};
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const vimeoId = url.pathname.split("/").filter(Boolean).pop();
      if (/^\d+$/.test(vimeoId || "")) return {kind:"iframe",url:"https://player.vimeo.com/video/"+vimeoId};
    }
    if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url.pathname+url.search)) return {kind:"video",url:url.href};
    return {kind:"link",url:url.href};
  }
  (async () => {
    const {data,error} = await client.from("portfolio_projects")
      .select("title,project_type,description,video_url,thumbnail_url")
      .eq("id",id).eq("is_published",true).maybeSingle();
    if (error || !data) {
      status.textContent = "This project is unavailable or is no longer published.";
      status.classList.add("error");
      return;
    }
    document.title = data.title + " — Zaid";
    const description = data.description || "Cinematic video editing / visual storytelling.";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.content = description.slice(0,180);
    document.getElementById("project-detail-title").textContent = data.title;
    document.getElementById("project-detail-description").textContent = description;
    document.getElementById("project-detail-type").textContent = (data.project_type === "short" ? "SHORT VIDEO" : "LONG VIDEO") + " / PROJECT";
    const media = getMedia(data.video_url);
    if (media.kind === "iframe") {
      const frame = el("iframe");
      frame.src = media.url; frame.title = data.title; frame.loading = "lazy";
      frame.allow = "autoplay; fullscreen; picture-in-picture; encrypted-media"; frame.allowFullscreen = true;
      frame.referrerPolicy = "strict-origin-when-cross-origin";
      mediaBox.append(frame);
    } else if (media.kind === "video") {
      const video = el("video");
      video.src = media.url; video.controls = true; video.playsInline = true; video.preload = "metadata";
      if (data.thumbnail_url) video.poster = data.thumbnail_url;
      mediaBox.append(video);
    } else {
      const link = el("a","external-project-link");
      link.href = media.url; link.target = "_blank"; link.rel = "noopener noreferrer";
      link.textContent = "Open this project video ↗";
      mediaBox.append(link);
    }
    status.hidden = true;
    article.hidden = false;
  })().catch(() => {
    status.textContent = "Could not load this project. Please try again later.";
    status.classList.add("error");
  });
})();