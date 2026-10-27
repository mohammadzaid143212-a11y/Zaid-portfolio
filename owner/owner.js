/* Owner Studio auth + project library. Browser code uses only Supabase publishable key. */
(() => {
  // Keep element editing in its own module, separate from global theme controls.
  const elementStudioContent = document.getElementById("element-studio-content");
  const elementBuilderPanel = document.querySelector("#theme-manager .custom-elements-panel");
  if (elementStudioContent && elementBuilderPanel) {
    elementStudioContent.replaceChildren(elementBuilderPanel);
    elementBuilderPanel.classList.add("element-studio-panel");
  }

  const SUPABASE_URL = "https://rtaedoseedjwljixmrgy.supabase.co";
  const SUPABASE_PUBLIC_KEY = "sb_publishable__Oc_xT1AELiVIQgCgXytTQ_qxLd_ZFo";
  const OWNER_EMAIL = "mohammadzaid143212@gmail.com".toLowerCase();
  const $ = (selector) => document.querySelector(selector);
  const loginView = $("#login-view"), recoveryView = $("#recovery-view"), dashboardView = $("#dashboard-view");
  const form = $("#login-form"), message = $("#auth-message"), loginButton = $("#login-button"), resetButton = $("#reset-button");
  const recoveryForm = $("#recovery-form"), recoveryMessage = $("#recovery-message"), savePasswordButton = $("#save-password-button");
  const logoutButton = $("#logout-button"), signedInAs = $("#signed-in-as");
  const projectForm = $("#project-form"), projectMessage = $("#project-message"), projectList = $("#project-list");
  const projectType = $("#project-type"), thumbnailField = $("#thumbnail-field");
  let recoveryMode = false, editingId = null, projects = [];

  function setMessage(el, text, isError = false) { el.textContent = text; el.classList.toggle("error", isError); }
  function hideViews() { [loginView, recoveryView, dashboardView].forEach(el => el.classList.add("hidden")); }
  function showLogin() { hideViews(); loginView.classList.remove("hidden"); }
  function showRecovery() { recoveryMode = true; hideViews(); recoveryView.classList.remove("hidden"); setMessage(recoveryMessage, ""); }
  function setupStudioSlides() {
    if (!dashboardView || dashboardView.dataset.clickNavigationReady === "true") return;
    const slides = Array.from(dashboardView.querySelectorAll(":scope > .studio-slide"));
    const links = Array.from(dashboardView.querySelectorAll("[data-owner-section]"));
    const showPanel = (id) => {
      const target = slides.find(slide => slide.id === id);
      if (!target) return;
      slides.forEach(slide => {
        const active = slide === target;
        slide.classList.toggle("is-active", active);
        slide.hidden = !active;
        slide.setAttribute("aria-hidden", String(!active));
      });
      links.forEach(link => {
        const active = link.dataset.ownerSection === id;
        link.classList.toggle("is-active", active);
        if (active) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      });
      dashboardView.dataset.activePanel = id;
      window.scrollTo({ top: 0, behavior: "auto" });
    };
    links.forEach(link => {
      if (!link.dataset.ownerSection) return;
      link.addEventListener("click", event => {
        event.preventDefault();
        const panelId = link.dataset.ownerSection;
        showPanel(panelId);
        if (panelId === "long-video-manager") { setVideoPanel("long"); }
        if (panelId === "short-video-manager") { setVideoPanel("short"); }
      });
    });
    dashboardView.dataset.clickNavigationReady = "true";
    showPanel("studio-overview");
  }
  function showDashboard(user) { recoveryMode = false; hideViews(); dashboardView.classList.remove("hidden"); setupStudioSlides(); signedInAs.textContent = user?.email ? "Signed in as " + user.email : "Authenticated owner"; loadProjects(); }

  if (!window.supabase || SUPABASE_PUBLIC_KEY.includes("PASTE_")) {
    setMessage(message, "Setup needed: add your Supabase publishable key in owner/owner.js.", true);
    form.addEventListener("submit", e => { e.preventDefault(); setMessage(message, "Supabase public key has not been configured.", true); });
    resetButton.addEventListener("click", () => setMessage(message, "Add the Supabase public key first.", true));
    return;
  }
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);

  client.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") { showRecovery(); return; }
    if (event === "SIGNED_OUT" && !recoveryMode) showLogin();
    if (event === "SIGNED_IN" && session && !recoveryMode) {
      if ((session.user.email || "").toLowerCase() === OWNER_EMAIL) showDashboard(session.user);
      else { client.auth.signOut(); showLogin(); setMessage(message, "This account is not authorized for Owner Studio.", true); }
    }
  });

  async function checkSession() {
    const { data, error } = await client.auth.getSession();
    if (recoveryMode) return;
    if (error || !data.session) return showLogin();
    if ((data.session.user.email || "").toLowerCase() !== OWNER_EMAIL) {
      await client.auth.signOut(); showLogin(); setMessage(message, "This account is not authorized for Owner Studio.", true); return;
    }
    showDashboard(data.session.user);
  }

  form.addEventListener("submit", async e => {
    e.preventDefault(); setMessage(message, ""); loginButton.disabled = true; loginButton.textContent = "Signing in…";
    const email = $("#email").value.trim().toLowerCase(), password = $("#password").value;
    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if ((data.user?.email || "").toLowerCase() !== OWNER_EMAIL) { await client.auth.signOut(); throw new Error("This account is not authorized for Owner Studio."); }
      showDashboard(data.user);
    } catch (err) { setMessage(message, err.message || "Sign-in failed.", true); }
    finally { loginButton.disabled = false; loginButton.innerHTML = 'Sign in <span aria-hidden="true">↗</span>'; }
  });

  resetButton.addEventListener("click", async () => {
    const email = $("#email").value.trim().toLowerCase();
    if (!email) return setMessage(message, "Enter your owner email first, then tap Forgot password.", true);
    if (email !== OWNER_EMAIL) return setMessage(message, "Password recovery is only available for the owner email.", true);
    resetButton.disabled = true; setMessage(message, "");
    try {
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/owner/" });
      if (error) throw error;
      setMessage(message, "If password recovery is available, Supabase will email you a reset link. Check Inbox and Spam.");
    } catch (err) { setMessage(message, err.message || "Could not request a reset link.", true); }
    finally { resetButton.disabled = false; }
  });

  recoveryForm.addEventListener("submit", async e => {
    e.preventDefault();
    const password = $("#new-password").value, confirmation = $("#confirm-password").value;
    if (password.length < 8) return setMessage(recoveryMessage, "Use at least 8 characters.", true);
    if (password !== confirmation) return setMessage(recoveryMessage, "The passwords do not match.", true);
    savePasswordButton.disabled = true; savePasswordButton.textContent = "Saving password…";
    try {
      const { data, error } = await client.auth.updateUser({ password });
      if (error) throw error;
      $("#new-password").value = ""; $("#confirm-password").value = "";
      setMessage(recoveryMessage, "Password updated successfully.");
      if ((data.user?.email || "").toLowerCase() === OWNER_EMAIL) window.setTimeout(() => showDashboard(data.user), 900);
      else { recoveryMode = false; showLogin(); setMessage(message, "Password updated. Please sign in."); }
    } catch (err) { setMessage(recoveryMessage, err.message || "Could not update password. The link may have expired.", true); }
    finally { savePasswordButton.disabled = false; savePasswordButton.innerHTML = 'Save new password <span aria-hidden="true">↗</span>'; }
  });


  // Sidebar navigation: open the selected workspace and keep the active item in sync.
  const videoManager = document.getElementById("long-video-manager");
  const videoWorkspace = document.getElementById("video-editor-workspace");
  const shortVideoWorkspace = document.getElementById("short-video-workspace");
  const videoChoices = [];
  function setVideoPanel(type) {
    if (!videoManager) return;
    videoManager.dataset.videoPanel = type;
    const targetWorkspace = type === "short" ? shortVideoWorkspace : document.getElementById("long-video-workspace");
    if (targetWorkspace && videoWorkspace && targetWorkspace !== videoWorkspace) targetWorkspace.append(videoWorkspace);
    if (projectType) projectType.value = type;
    toggleThumbnail();
    if (projectList) renderProjects();
    const summary = document.querySelector("#project-controls > summary span");
    if (summary) summary.textContent = type === "long" ? "Add or edit long videos" : "Add or edit short videos";
  }
  setVideoPanel("long");

  function toggleThumbnail() {
    const isLong = projectType.value === "long";
    thumbnailField.classList.toggle("hidden", !isLong);
    $("#project-thumbnail").required = false;
  }
  projectType.addEventListener("change", toggleThumbnail);
  toggleThumbnail();

  const MAX_MEDIA_BYTES = 50 * 1024 * 1024;
  let mediaUploadInProgress = false;
  function uploadStatus(kind, text, isError = false) {
    const status = kind === "video" ? $("#video-upload-status") : $("#thumbnail-upload-status");
    const progress = kind === "video" ? $("#video-upload-progress") : $("#thumbnail-upload-progress");
    status.textContent = text;
    status.classList.toggle("error", isError);
    progress.classList.toggle("hidden", !mediaUploadInProgress || (kind !== "video" && kind !== "thumbnail"));
  }
  async function uploadMediaFile(file, kind) {
    if (!file) return;
    const isVideo = kind === "video";
    const allowed = isVideo
      ? ["video/mp4", "video/webm", "video/ogg", "video/quicktime"]
      : ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      uploadStatus(kind, isVideo ? "Choose an MP4, WebM, OGG or MOV video." : "Choose a JPG, PNG or WebP image.", true);
      (isVideo ? $("#project-video-file") : $("#project-thumbnail-file")).value = "";
      return;
    }
    if (file.size > MAX_MEDIA_BYTES) {
      uploadStatus(kind, "File is larger than 50 MB. Please choose a smaller file.", true);
      (isVideo ? $("#project-video-file") : $("#project-thumbnail-file")).value = "";
      return;
    }
    mediaUploadInProgress = true;
    const fileInput = isVideo ? $("#project-video-file") : $("#project-thumbnail-file");
    const urlInput = isVideo ? $("#project-video") : $("#project-thumbnail");
    const saveButton = $("#save-project-button");
    const progress = isVideo ? $("#video-upload-progress") : $("#thumbnail-upload-progress");
    const bar = isVideo ? $("#video-upload-bar") : $("#thumbnail-upload-bar");
    progress.classList.remove("hidden"); bar.classList.add("uploading");
    fileInput.disabled = true; saveButton.disabled = true;
    uploadStatus(kind, "Uploading " + file.name + "…");
    try {
      const safeName = file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-90) || (isVideo ? "video" : "thumbnail");
      const path = (isVideo ? "videos/" : "thumbnails/") + crypto.randomUUID() + "-" + safeName;
      const { data, error } = await client.storage.from("portfolio-media").upload(path, file, {
        cacheControl: "3600", upsert: false, contentType: file.type
      });
      if (error) throw error;
      const { data: publicData } = client.storage.from("portfolio-media").getPublicUrl(data.path);
      urlInput.value = publicData.publicUrl;
      uploadStatus(kind, "Upload complete: " + file.name);
      fileInput.value = "";
    } catch (err) {
      uploadStatus(kind, "Upload failed: " + (err.message || "Please try again."), true);
    } finally {
      mediaUploadInProgress = false;
      fileInput.disabled = false; saveButton.disabled = false;
      progress.classList.add("hidden"); bar.classList.remove("uploading");
    }
  }
  $("#project-video-file").addEventListener("change", e => uploadMediaFile(e.target.files?.[0], "video"));
  $("#project-thumbnail-file").addEventListener("change", e => uploadMediaFile(e.target.files?.[0], "thumbnail"));

  function resetProjectForm() {
    editingId = null; projectForm.reset(); $("#project-id").value = "";
    $("#project-published").checked = true; $("#save-project-button").innerHTML = 'Save project <span aria-hidden="true">↗</span>';
    $("#cancel-edit-button").classList.add("hidden"); toggleThumbnail(); setMessage(projectMessage, "");
  }
  function updateCounts() {
    $("#project-count").textContent = projects.length;
    $("#long-count").textContent = projects.filter(p => p.project_type === "long").length;
    $("#short-count").textContent = projects.filter(p => p.project_type === "short").length;
  }
  function renderProjects() {
    updateCounts();
    if (!projects.length) { projectList.innerHTML = '<p class="empty-state">No projects yet. Use the form above to add your first video.</p>'; return; }
    projectList.replaceChildren();
    const visibleProjects = projects.filter(project => project.project_type === (videoManager?.dataset.videoPanel || "long"));
    if (!visibleProjects.length) { projectList.innerHTML = '<p class="empty-state">No '+(videoManager?.dataset.videoPanel === "short" ? "short" : "long")+' videos yet. Add the first one using this panel.</p>'; return; }
    visibleProjects.forEach(project => {
      const card = document.createElement("article"); card.className = "library-item";
      const info = document.createElement("div"); info.className = "library-item-info";
      const title = document.createElement("h4"); title.textContent = project.title;
      const meta = document.createElement("p"); meta.textContent = (project.project_type === "long" ? "LONG VIDEO" : "SHORT VIDEO") + " · " + (project.is_published ? "PUBLISHED" : "DRAFT");
      const desc = document.createElement("p"); desc.textContent = project.description || "No description added.";
      info.append(title, meta, desc);
      const actions = document.createElement("div"); actions.className = "library-actions";
      const edit = document.createElement("button"); edit.className = "quiet-button"; edit.type = "button"; edit.textContent = "Edit";
      edit.addEventListener("click", () => {
        editingId = project.id; $("#project-id").value = project.id; $("#project-title").value = project.title;
        projectType.value = project.project_type; $("#project-description").value = project.description || "";
        $("#project-video").value = project.video_url; $("#project-thumbnail").value = project.thumbnail_url || "";
        $("#project-published").checked = project.is_published; toggleThumbnail();
        $("#save-project-button").innerHTML = 'Update project <span aria-hidden="true">↗</span>';
        $("#cancel-edit-button").classList.remove("hidden"); setMessage(projectMessage, "Editing: " + project.title);
        $("#long-video-manager").scrollIntoView({ behavior: "smooth", block: "start" });
      });
      const del = document.createElement("button"); del.className = "danger-button"; del.type = "button"; del.textContent = "Delete";
      del.addEventListener("click", async () => {
        if (!window.confirm('Delete "' + project.title + '"? This cannot be undone.')) return;
        del.disabled = true;
        const { error } = await client.from("portfolio_projects").delete().eq("id", project.id);
        if (error) { setMessage(projectMessage, error.message, true); del.disabled = false; return; }
        if (editingId === project.id) resetProjectForm();
        await loadProjects(); setMessage(projectMessage, "Project deleted.");
      });
      actions.append(edit, del); card.append(info, actions); projectList.append(card);
    });
  }
  async function loadProjects() {
    projectList.innerHTML = '<p class="empty-state">Loading your projects…</p>';
    const { data, error } = await client.from("portfolio_projects").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false });
    if (error) { projects = []; renderProjects(); setMessage(projectMessage, "Could not load projects: " + error.message, true); return; }
    projects = data || []; renderProjects();
  }
  projectForm.addEventListener("submit", async e => {
    e.preventDefault();
    if (mediaUploadInProgress) return setMessage(projectMessage, "Please wait until the file upload finishes.", true);
    const title = $("#project-title").value.trim(), videoUrl = $("#project-video").value.trim();
    if (!title || !videoUrl) return setMessage(projectMessage, "Title and video URL are required.", true);
    let parsedUrl;
    try { parsedUrl = new URL(videoUrl); if (!["https:", "http:"].includes(parsedUrl.protocol)) throw new Error(); }
    catch { return setMessage(projectMessage, "Enter a valid http(s) video URL.", true); }
    const thumbnail = $("#project-thumbnail").value.trim();
    if (thumbnail) { try { const u = new URL(thumbnail); if (!["https:", "http:"].includes(u.protocol)) throw new Error(); } catch { return setMessage(projectMessage, "Enter a valid thumbnail URL or leave it blank.", true); } }
    const payload = { title, project_type: projectType.value, description: $("#project-description").value.trim(), video_url: videoUrl, thumbnail_url: projectType.value === "long" ? thumbnail : "", is_published: $("#project-published").checked };
    const button = $("#save-project-button"); button.disabled = true; button.textContent = editingId ? "Updating…" : "Saving…"; setMessage(projectMessage, "");
    try {
      const result = editingId
        ? await client.from("portfolio_projects").update(payload).eq("id", editingId).select().single()
        : await client.from("portfolio_projects").insert(payload).select().single();
      if (result.error) throw result.error;
      const wasEditing = Boolean(editingId);
      resetProjectForm(); await loadProjects(); setMessage(projectMessage, wasEditing ? "Project updated successfully." : "Project saved successfully.");
    } catch (err) { setMessage(projectMessage, err.message || "Could not save project.", true); }
    finally { button.disabled = false; if (editingId) button.innerHTML = 'Update project <span aria-hidden="true">↗</span>'; else button.innerHTML = 'Save project <span aria-hidden="true">↗</span>'; }
  });
  $("#cancel-edit-button").addEventListener("click", resetProjectForm);
  $("#refresh-projects").addEventListener("click", loadProjects);
  // Visual theme controller: each target has independent settings saved as JSON.
  const themeForm = $("#theme-form"), themeMessage = $("#theme-message");
  const themeTarget = $("#theme-target"), themeMode = $("#theme-mode"), themeScope = $("#theme-scope");
  let lastSectionThemeTarget = "hero";
  themeScope.addEventListener("change", () => {
    if (themeScope.value === "global") {
      if (themeTarget.value !== "site") lastSectionThemeTarget = themeTarget.value;
      themeTarget.value = "site";
      themeTarget.disabled = true;
    } else {
      themeTarget.disabled = false;
      themeTarget.value = lastSectionThemeTarget === "site" ? "hero" : lastSectionThemeTarget;
    }
    updateThemeFields();
    populateThemeForm();
  });
  const themeBg = $("#theme-background"), themeText = $("#theme-text"), themeAccent = $("#theme-accent");
  const themeMediaUrl = $("#theme-media-url"), themeMediaFile = $("#theme-media-file");
  const themeMediaFields = $("#theme-media-fields"), themeColorFields = $("#theme-color-fields");
  let themeSettings = {}, themeUploadBusy = false;
  const themeSelectors = {
    site: "body", header: ".site-header", hero: ".hero", "hero-title": ".hero h1",
    "hero-media": ".hero-frame", work: ".work-section", "project-cards": ".project-card",
    about: ".about-section", contact: ".contact-section", footer: ".site-footer"
  };
  function themeNotice(text, isError = false) { setMessage(themeMessage, text, isError); }
  function selectedThemeKey() {
    if (themeTarget.value !== "custom") return themeTarget.value;
    const selector = $("#theme-custom-selector").value.trim();
    if (!selector || selector.length > 180) return "";
    try { document.querySelector(selector); } catch { return ""; }
    return "custom:" + selector;
  }
  function selectorForTheme(key) { return key.startsWith("custom:") ? key.slice(7) : themeSelectors[key]; }
  function updateThemeFields() {
    const mode = themeMode.value;
    themeMediaFields.classList.toggle("hidden", !["image", "video"].includes(mode));
    themeColorFields.classList.toggle("hidden", mode !== "color");
    $("#custom-selector-field").classList.toggle("hidden", themeTarget.value !== "custom");
  }
  function applyThemeTarget(key, setting, root = document) {
    const selector = selectorForTheme(key);
    if (!selector || !setting) return;
    const elements = root.querySelectorAll(selector);
    elements.forEach(el => {
      if (key === "site" && el !== document.body) return;
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
      } else if (setting.mode === "image" && setting.mediaUrl) {
        el.style.backgroundColor = setting.bg || "transparent";
        el.style.backgroundImage = "linear-gradient(0deg,rgba(0,0,0,.25),rgba(0,0,0,.08)),url(\"" + setting.mediaUrl.replace(/["\\\\]/g, "") + "\")";
        el.style.backgroundSize = "cover"; el.style.backgroundPosition = "center";
      } else if (setting.mode === "none") {
        el.style.backgroundColor = ""; el.style.backgroundImage = "";
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
      } else if (setting.mode !== "video") {
        const video = el.querySelector(":scope > .theme-background-video");
        if (video) video.remove();
      }
    });
  }
  function applyAllThemes(settings, root = document) {
    Object.entries(settings || {}).forEach(([key, setting]) => applyThemeTarget(key, setting, root));
  }
  function populateThemeForm() {
    const key = selectedThemeKey();
    const saved = themeSettings[key] || {};
    themeMode.value = saved.mode || "color"; themeBg.value = saved.bg || "#0b0b0d";
    themeText.value = saved.text || "#f2f0eb"; themeAccent.value = saved.accent || "#c9f36a";
    themeMediaUrl.value = saved.mediaUrl || "";
    $("#theme-animation").value = saved.animation || "none";
    $("#theme-duration").value = saved.duration || 6;
    $("#theme-opacity").value = saved.opacity ?? 100;
    $("#theme-radius").value = saved.radius ?? 0;
    $("#theme-rotation").value = saved.rotation ?? 0;
    updateThemeFields();
  }
  async function loadThemeSettings() {
    const { data, error } = await client.from("portfolio_theme_settings").select("settings").eq("id", true).maybeSingle();
    if (error) { themeNotice("Could not load theme settings: " + error.message, true); return; }
    themeSettings = data?.settings || {};
    populateThemeForm(); renderCustomElements();
  }
  themeTarget.addEventListener("change", () => {
    if (themeTarget.value !== "site") lastSectionThemeTarget = themeTarget.value;
    if (themeScope.value === "global" && themeTarget.value !== "site") {
      themeScope.value = "section";
      themeTarget.disabled = false;
    }
    updateThemeFields(); populateThemeForm();
  });
  themeScope.value = "global";
  themeTarget.value = "site";
  themeTarget.disabled = true;
  $("#theme-custom-selector").addEventListener("change", populateThemeForm);
  themeMode.addEventListener("change", updateThemeFields);
  async function uploadThemeMedia(file) {
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    const valid = isVideo ? ["video/mp4", "video/webm", "video/ogg"].includes(file.type) : ["image/jpeg", "image/png", "image/webp"].includes(file.type);
    if (!valid) { themeNotice("Choose JPG, PNG, WebP or MP4, WebM, OGG media.", true); themeMediaFile.value = ""; return; }
    if (file.size > MAX_MEDIA_BYTES) { themeNotice("Media file must be 50 MB or smaller.", true); themeMediaFile.value = ""; return; }
    themeUploadBusy = true; $("#theme-upload-progress").classList.remove("hidden"); $("#theme-upload-bar").classList.add("uploading");
    $("#theme-upload-status").textContent = "Uploading " + file.name + "…"; $("#save-theme-button").disabled = true;
    try {
      const safeName = file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-90) || "background-media";
      const path = "themes/" + crypto.randomUUID() + "-" + safeName;
      const { data, error } = await client.storage.from("portfolio-media").upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (error) throw error;
      themeMediaUrl.value = client.storage.from("portfolio-media").getPublicUrl(data.path).data.publicUrl;
      themeMode.value = isVideo ? "video" : "image"; updateThemeFields();
      $("#theme-upload-status").textContent = "Upload complete: " + file.name;
      themeNotice("Media uploaded. Preview it, then save and publish.");
    } catch (err) { $("#theme-upload-status").textContent = "Upload failed: " + (err.message || "Try again."); themeNotice(err.message || "Media upload failed.", true); }
    finally { themeUploadBusy = false; $("#theme-upload-progress").classList.add("hidden"); $("#theme-upload-bar").classList.remove("uploading"); $("#save-theme-button").disabled = false; themeMediaFile.value = ""; }
  }
  themeMediaFile.addEventListener("change", e => uploadThemeMedia(e.target.files?.[0]));
  // Custom element builder: safe text/image/video elements inserted into selected public sections.
  const elementKind = $("#element-kind"), elementFile = $("#element-file");
  let elementUploadBusy = false, elementUploadedUrl = "", editingElementId = null, dragPositioning = false;
  $("#element-target").addEventListener("change", () => $("#element-custom-target-field").classList.toggle("hidden", $("#element-target").value !== "custom"));
  elementKind.addEventListener("change", () => {
    $("#element-content").disabled = elementKind.value !== "text";
    elementFile.accept = elementKind.value === "image" ? "image/jpeg,image/png,image/webp" : elementKind.value === "video" ? "video/mp4,video/webm,video/ogg" : "image/jpeg,image/png,image/webp,video/mp4,video/webm,video/ogg";
  });
  async function uploadElementFile(file) {
    if (!file) return;
    const kind = elementKind.value;
    const valid = kind === "image" ? ["image/jpeg","image/png","image/webp"].includes(file.type)
      : kind === "video" ? ["video/mp4","video/webm","video/ogg"].includes(file.type)
      : ["image/jpeg","image/png","image/webp","video/mp4","video/webm","video/ogg"].includes(file.type);
    if (!valid) { $("#element-upload-status").textContent = "Choose a supported image or video for this element type."; return; }
    if (file.size > MAX_MEDIA_BYTES) { $("#element-upload-status").textContent = "File must be 50 MB or smaller."; return; }
    elementUploadBusy = true; $("#element-upload-progress").classList.remove("hidden"); $("#element-upload-bar").classList.add("uploading");
    $("#element-upload-status").textContent = "Uploading " + file.name + "…"; $("#add-element-button").disabled = true;
    try {
      const path = "elements/" + crypto.randomUUID() + "-" + file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g,"-").slice(-90);
      const { data, error } = await client.storage.from("portfolio-media").upload(path,file,{cacheControl:"3600",upsert:false,contentType:file.type});
      if (error) throw error;
      elementUploadedUrl = client.storage.from("portfolio-media").getPublicUrl(data.path).data.publicUrl;
      $("#element-url").value = elementUploadedUrl;
      if (kind === "text") elementKind.value = file.type.startsWith("video/") ? "video" : "image";
      $("#element-upload-status").textContent = "Upload complete: " + file.name;
    } catch (err) { $("#element-upload-status").textContent = "Upload failed: " + (err.message || "Try again."); }
    finally { elementUploadBusy = false; $("#element-upload-progress").classList.add("hidden"); $("#element-upload-bar").classList.remove("uploading"); $("#add-element-button").disabled = false; elementFile.value = ""; }
  }
  elementFile.addEventListener("change", e => uploadElementFile(e.target.files?.[0]));
  const positionStage = $("#element-position-stage"), positionHandle = $("#element-position-handle");
  const elementX = $("#element-x"), elementY = $("#element-y"), elementOverlay = $("#element-overlay");
  function clampPercent(value) { return Math.max(0, Math.min(100, Number(value) || 0)); }
  function updatePositionPreview() {
    const x = clampPercent(elementX.value), y = clampPercent(elementY.value);
    positionHandle.style.left = x + "%"; positionHandle.style.top = y + "%";
    const kind = elementKind.value, content = $("#element-content").value.trim(), url = $("#element-url").value.trim();
    positionHandle.replaceChildren();
    if (kind === "text") positionHandle.textContent = content || "Your element";
    else if (kind === "image" && url) { const img = document.createElement("img"); img.src = url; img.alt = ""; positionHandle.append(img); }
    else positionHandle.textContent = kind === "video" ? "▶ Video / motion graphic" : "Image / graphic";
    positionHandle.style.color = $("#element-color").value || "#c9f36a";
    positionHandle.style.width = Math.max(10, Math.min(100, Number($("#element-width").value) || 80)) + "%";
    positionHandle.style.opacity = String(Math.max(10,Math.min(100,Number($("#element-opacity").value)||100))/100);
    positionHandle.style.borderRadius = Math.max(0,Math.min(200,Number($("#element-radius").value)||0))+"px";
    positionHandle.style.borderWidth = Math.max(0,Math.min(10,Number($("#element-border-width").value)||0))+"px";
    positionHandle.style.boxShadow = ({none:"none",soft:"0 8px 24px #0009",glow:"0 0 22px "+($("#element-color").value||"#c9f36a")+"99",deep:"0 16px 40px #000"})[$("#element-shadow").value] || "none";
    positionHandle.style.transform = "translate(-50%,-50%) rotate("+Math.max(-180,Math.min(180,Number($("#element-rotation").value)||0))+"deg)";
    positionHandle.classList.toggle("is-overlay", elementOverlay.checked);
  }
  function setPositionFromPointer(event) {
    const rect = positionStage.getBoundingClientRect();
    elementX.value = Math.round(clampPercent((event.clientX - rect.left) / rect.width * 100));
    elementY.value = Math.round(clampPercent((event.clientY - rect.top) / rect.height * 100));
    updatePositionPreview();
  }
  positionHandle.addEventListener("pointerdown", event => {
    dragPositioning = true; positionHandle.setPointerCapture?.(event.pointerId);
    positionHandle.classList.add("is-dragging"); setPositionFromPointer(event); event.preventDefault();
  });
  positionStage.addEventListener("pointermove", event => { if (dragPositioning) setPositionFromPointer(event); });
  function endPositionDrag() { dragPositioning = false; positionHandle.classList.remove("is-dragging"); }
  positionHandle.addEventListener("pointerup", endPositionDrag);
  positionHandle.addEventListener("pointercancel", endPositionDrag);
  [elementX,elementY].forEach(input => input.addEventListener("input", updatePositionPreview));
  [elementKind,$("#element-content"),$("#element-url"),$("#element-width"),$("#element-color"),$("#element-rotation"),$("#element-opacity"),$("#element-radius"),$("#element-border-width"),$("#element-shadow"),elementOverlay].forEach(el => el.addEventListener("input", updatePositionPreview));
  $("#element-placement").addEventListener("change", updatePositionPreview);
  updatePositionPreview();
  // Live same-origin website preview with a temporary draggable placement marker.
  const websitePreview = $("#element-website-preview");
  let previewTarget = null, previewMarker = null, previewDrag = false;
  const positionHistory = [];
  let historyIndex = -1, restoringHistory = false;
  function positionSnapshot() { return {x:Number(elementX.value)||0,y:Number(elementY.value)||0,width:Number($("#element-width").value)||80,layer:$("#element-layer").value||"front"}; }
  function updateHistoryButtons() { $("#element-undo").disabled=historyIndex<=0; $("#element-redo").disabled=historyIndex>=positionHistory.length-1; $("#element-history-status").textContent=positionHistory.length ? "Change "+(historyIndex+1)+" of "+positionHistory.length : "Move or resize to create history."; }
  function recordPositionHistory() { if(restoringHistory)return; const state=positionSnapshot(), prev=positionHistory[historyIndex]; if(prev&&prev.x===state.x&&prev.y===state.y&&prev.width===state.width&&prev.layer===state.layer)return; positionHistory.splice(historyIndex+1); positionHistory.push(state); if(positionHistory.length>40)positionHistory.shift(); historyIndex=positionHistory.length-1; updateHistoryButtons(); }
  function applyPositionHistory(index) { if(index<0||index>=positionHistory.length)return; restoringHistory=true; const state=positionHistory[index]; historyIndex=index; elementX.value=state.x; elementY.value=state.y; $("#element-width").value=state.width; $("#element-layer").value=state.layer; updatePositionPreview(); if(previewMarker&&previewMarker.isConnected){previewMarker.style.left=state.x+"%";previewMarker.style.top=state.y+"%";previewMarker.style.width="min("+state.width+"%,100%)";previewMarker.style.zIndex=state.layer==="back"?"1":"99999";} restoringHistory=false; updateHistoryButtons(); }
  $("#element-undo").addEventListener("click",()=>applyPositionHistory(historyIndex-1));
  $("#element-redo").addEventListener("click",()=>applyPositionHistory(historyIndex+1));
  [elementX,elementY,$("#element-width"),$("#element-layer")].forEach(el=>el.addEventListener("change",recordPositionHistory));
  recordPositionHistory();
  function refreshWebsitePreview() {
    let doc;
    try { doc = websitePreview.contentDocument; } catch { return; }
    if (!doc || !doc.body) return;
    if (previewMarker && previewMarker.isConnected) previewMarker.remove();
    previewMarker = null; previewTarget = null;
    const targetValue = $("#element-target").value;
    const selector = targetValue === "custom" ? $("#element-custom-target").value.trim() : targetValue;
    try { previewTarget = selector ? doc.querySelector(selector) : null; } catch { previewTarget = null; }
    if (!previewTarget) { $("#element-upload-status").textContent = "Section not found in preview. Choose another section or check the custom selector."; return; }
    previewTarget.scrollIntoView({block:"start",behavior:"smooth"});
    if (elementOverlay.checked && getComputedStyle(previewTarget).position === "static") previewTarget.style.position = "relative";
    previewMarker = doc.createElement("div");
    previewMarker.setAttribute("role","button"); previewMarker.setAttribute("aria-label","Drag element to position");
    const previewColor=$("#element-color").value||"#c9f36a", previewRotation=Math.max(-180,Math.min(180,Number($("#element-rotation").value)||0)), previewOpacity=Math.max(10,Math.min(100,Number($("#element-opacity").value)||100)), previewRadius=Math.max(0,Math.min(200,Number($("#element-radius").value)||0)), previewBorder=Math.max(0,Math.min(10,Number($("#element-border-width").value)||0)), previewShadow=$("#element-shadow").value; const previewShadowCss=({none:"none",soft:"0 8px 24px #0009",glow:"0 0 22px "+previewColor+"99",deep:"0 16px 40px #000"})[previewShadow]||"none"; previewMarker.style.cssText = "box-sizing:border-box;position:absolute;z-index:99999;left:"+clampPercent(elementX.value)+"%;top:"+clampPercent(elementY.value)+"%;transform:translate(-50%,-50%) rotate("+previewRotation+"deg);width:min("+Math.max(10,Math.min(100,Number($("#element-width").value)||80))+"%,100%);min-height:36px;padding:8px 18px 8px 8px;border:"+previewBorder+"px dashed "+previewColor+";border-radius:"+previewRadius+"px;box-shadow:"+previewShadowCss+";opacity:"+(previewOpacity/100)+";background:#08090ddd;text-align:center;cursor:move;touch-action:none;overflow-wrap:anywhere;color:"+previewColor+";";
    const kind = elementKind.value, content = $("#element-content").value.trim(), url = $("#element-url").value.trim();
    if (kind === "text") previewMarker.textContent = content || "Your element";
    else if (kind === "image" && url) { const img = doc.createElement("img"); img.src = url; img.alt = ""; img.style.cssText = "display:block;width:100%;max-height:30vh;object-fit:contain"; previewMarker.append(img); }
    else previewMarker.textContent = kind === "video" ? "▶ Video / motion graphic" : "Image / graphic";
    const alignmentGuides = doc.createElement("div"); alignmentGuides.className="owner-editor-alignment-guides"; alignmentGuides.style.cssText="position:absolute;inset:0;z-index:99998;pointer-events:none;display:none;"; alignmentGuides.innerHTML="<span style=\"position:absolute;left:50%;top:0;bottom:0;border-left:1px dashed #c9f36a\"></span><span style=\"position:absolute;top:50%;left:0;right:0;border-top:1px dashed #c9f36a\"></span>"; if(getComputedStyle(previewTarget).position==="static")previewTarget.style.position="relative"; previewTarget.append(alignmentGuides,previewMarker);
    const resizeGrip = doc.createElement("button");
    resizeGrip.type = "button"; resizeGrip.setAttribute("aria-label","Resize element"); resizeGrip.title = "Drag to resize";
    resizeGrip.style.cssText = "position:absolute;right:-7px;bottom:-7px;width:18px;height:18px;border:2px solid #08090d;border-radius:3px;background:#c9f36a;cursor:nwse-resize;touch-action:none;padding:0;";
    previewMarker.append(resizeGrip);
    let resizing = false, resizeStartX = 0, resizeStartWidth = 80;
    resizeGrip.addEventListener("pointerdown", ev => { resizing=true; resizeStartX=ev.clientX; resizeStartWidth=Math.max(10,Math.min(100,Number($("#element-width").value)||80)); resizeGrip.setPointerCapture(ev.pointerId); ev.stopPropagation(); ev.preventDefault(); });
    resizeGrip.addEventListener("pointermove", ev => { if (!resizing || !previewTarget) return; const rect=previewTarget.getBoundingClientRect(); const next=Math.max(10,Math.min(100,resizeStartWidth+(ev.clientX-resizeStartX)/rect.width*100)); $("#element-width").value=Math.round(next); previewMarker.style.width="min("+next+"%,100%)"; updatePositionPreview(); });
    const stopResize=()=>{if(resizing){resizing=false;recordPositionHistory();}}; resizeGrip.addEventListener("pointerup",stopResize); resizeGrip.addEventListener("pointercancel",stopResize);
    previewMarker.addEventListener("pointerdown", ev => { if (ev.target === resizeGrip) return; previewDrag = true; previewMarker.setPointerCapture(ev.pointerId); ev.preventDefault(); });
    previewMarker.addEventListener("pointermove", ev => { if (!previewDrag || !previewTarget || !previewMarker) return; const rect = previewTarget.getBoundingClientRect(); let x=(ev.clientX-rect.left)/rect.width*100; let y=(ev.clientY-rect.top)/rect.height*100; const snappedX=Math.abs(x-50)<=2.5, snappedY=Math.abs(y-50)<=2.5; if(snappedX)x=50; if(snappedY)y=50; x=clampPercent(x); y=clampPercent(y); elementX.value=Math.round(x); elementY.value=Math.round(y); previewMarker.style.left=x+"%"; previewMarker.style.top=y+"%"; alignmentGuides.style.display=(snappedX||snappedY)?"block":"none"; updatePositionPreview(); });
    const stop = () => { if(previewDrag){previewDrag=false;alignmentGuides.style.display="none";recordPositionHistory();} }; previewMarker.addEventListener("pointerup",stop); previewMarker.addEventListener("pointercancel",stop);
    $("#element-upload-status").textContent = "Preview ready. Drag the dashed marker on the website to set its position.";
  }
  websitePreview.addEventListener("load", () => window.setTimeout(refreshWebsitePreview, 600));
  $("#refresh-element-preview").addEventListener("click", refreshWebsitePreview);
  $("#element-target").addEventListener("change", () => window.setTimeout(refreshWebsitePreview, 250));
  $("#element-custom-target").addEventListener("change", () => window.setTimeout(refreshWebsitePreview, 250));
  [elementKind,$("#element-content"),$("#element-url"),$("#element-width"),$("#element-color"),$("#element-rotation"),$("#element-opacity"),$("#element-radius"),$("#element-border-width"),$("#element-shadow"),elementOverlay,$("#element-layer")].forEach(el => el.addEventListener("change", () => { if (websitePreview.contentDocument && websitePreview.contentDocument.readyState === "complete") refreshWebsitePreview(); }));
  function getCustomElements() { return Array.isArray(themeSettings.__elements) ? themeSettings.__elements : []; }
  function renderCustomElements() {
    const list = $("#custom-element-list"), items = getCustomElements();
    list.replaceChildren();
    if (!items.length) { const p = document.createElement("p"); p.className = "empty-state"; p.textContent = "No custom elements added yet."; list.append(p); return; }
    items.forEach(item => {
      const card = document.createElement("div"); card.className = "custom-element-item";
      const info = document.createElement("div"); const strong = document.createElement("strong");
      strong.textContent = item.kind === "text" ? (item.content || "Text element") : (item.kind === "image" ? "Image / graphic" : "Video / motion graphic");
      const small = document.createElement("p"); small.textContent = item.target + " · " + item.placement + " · " + (item.animation || "no animation");
      info.append(strong,small);
      const actions = document.createElement("div"); actions.className = "custom-element-actions";
      const edit = document.createElement("button"); edit.type = "button"; edit.className = "quiet-button"; edit.textContent = "Edit";
      edit.addEventListener("click", () => {
        editingElementId = item.id; $("#element-target").value = ["site","header","hero","hero-title","hero-media","work","project-cards","about","contact","footer"].includes(item.target) ? item.target : "custom";
        $("#element-custom-target-field").classList.toggle("hidden", $("#element-target").value !== "custom");
        if ($("#element-target").value === "custom") $("#element-custom-target").value = item.target;
        elementKind.value = item.kind; elementKind.dispatchEvent(new Event("change"));
        $("#element-content").value = item.content || ""; $("#element-url").value = item.url || "";
        $("#element-placement").value = item.placement || "center"; $("#element-width").value = item.width || 80; $("#element-layer").value = item.layer === "back" ? "back" : "front";
        $("#element-x").value = item.x ?? 50; $("#element-y").value = item.y ?? 50; elementOverlay.checked = item.overlay !== false; updatePositionPreview();
        $("#element-animation").value = item.animation || "none"; $("#element-duration").value = item.duration || 6;
        $("#element-color").value = item.color || "#c9f36a"; $("#element-rotation").value = item.rotation ?? 0; $("#element-opacity").value = item.opacity ?? 100; $("#element-radius").value = item.radius ?? 0; $("#element-border-width").value = item.borderWidth ?? 0; $("#element-shadow").value = item.shadow || "none"; $("#add-element-button").textContent = "Update element";
        themeNotice("Editing element. Make changes and tap Update element.");
      });
      const del = document.createElement("button"); del.type = "button"; del.className = "quiet-button"; del.textContent = "Remove";
      del.addEventListener("click", async () => {
        if (!window.confirm("Remove this custom element? This change will be saved to your theme settings.")) return;
        del.disabled = true;
        const saved = await saveCustomElements(getCustomElements().filter(x => x.id !== item.id));
        if (!saved) del.disabled = false;
      });
      actions.append(edit,del); card.append(info,actions); list.append(card);
    });
  }
  async function saveCustomElements(items) {
    const next = { ...themeSettings, __elements: items };
    const saveButton = $("#add-element-button");
    if (saveButton) saveButton.disabled = true;
    try {
      const { error } = await client.from("portfolio_theme_settings").upsert({ id:true, settings:next, updated_at:new Date().toISOString() },{onConflict:"id"});
      if (error) throw error;
      themeSettings = next;
      renderCustomElements();
      themeNotice("Element saved. Use Save & publish in Theme Studio, then refresh the public portfolio to see it.");
      return true;
    } catch (err) {
      themeNotice("Could not save element: " + (err.message || "Please try again."), true);
      return false;
    } finally {
      if (saveButton) saveButton.disabled = false;
    }
  }
  $("#add-element-button").addEventListener("click", async () => {
    if (elementUploadBusy) return themeNotice("Wait for the file upload to finish.",true);
    let target = $("#element-target").value === "custom" ? $("#element-custom-target").value.trim() : $("#element-target").value;
    if (!target) return themeNotice("Choose a target section or enter a CSS selector.",true);
    if ($("#element-target").value === "custom") { try { document.querySelector(target); } catch { return themeNotice("Enter a valid CSS selector.",true); } }
    if (websitePreview.contentDocument && websitePreview.contentDocument.readyState === "complete") {
      try {
        if (!websitePreview.contentDocument.querySelector(target)) return themeNotice("That target was not found on the public website preview. Choose a listed section or check the custom selector.", true);
      } catch { return themeNotice("The target selector is invalid. Check the selector and try again.", true); }
    }
    const kind = elementKind.value, content = $("#element-content").value.trim(), url = $("#element-url").value.trim();
    if (kind === "text" && !content) return themeNotice("Enter the text you want to add.",true);
    if (kind !== "text") { try { const u = new URL(url); if (!["http:","https:"].includes(u.protocol)) throw new Error(); } catch { return themeNotice("Add a valid image/video URL or upload a file first.",true); } }
    const items = getCustomElements();
    if (!editingElementId && items.length >= 30) return themeNotice("Maximum 30 custom elements. Remove one before adding another.",true);
    const item = { id:editingElementId || crypto.randomUUID(), target, kind, content:content.slice(0,240), url, placement:$("#element-placement").value, width:Math.max(10,Math.min(100,Number($("#element-width").value)||80)), x:clampPercent(elementX.value), y:clampPercent(elementY.value), overlay:elementOverlay.checked, layer:$("#element-layer").value, animation:$("#element-animation").value, duration:Math.max(.5,Math.min(30,Number($("#element-duration").value)||6)), color:$("#element-color").value, rotation:Math.max(-180,Math.min(180,Number($("#element-rotation").value)||0)), opacity:Math.max(10,Math.min(100,Number($("#element-opacity").value)||100)), radius:Math.max(0,Math.min(200,Number($("#element-radius").value)||0)), borderWidth:Math.max(0,Math.min(10,Number($("#element-border-width").value)||0)), shadow:["none","soft","glow","deep"].includes($("#element-shadow").value)?$("#element-shadow").value:"none" };
    const nextItems = editingElementId ? items.map(x => x.id === editingElementId ? item : x) : [...items,item];
    const saved = await saveCustomElements(nextItems);
    if (!saved) return;
    editingElementId = null;
    $("#add-element-button").textContent = "Add element";
    $("#element-content").value = "";
    $("#element-url").value = "";
    $("#element-file").value = "";
    elementUploadedUrl = "";
    elementX.value = 50; elementY.value = 50;
    updatePositionPreview();
    if (websitePreview.contentDocument && websitePreview.contentDocument.readyState === "complete") refreshWebsitePreview();
  });
  function resetElementForm({ announce = true } = {}) {
    editingElementId = null;
    $("#add-element-button").textContent = "Add element";
    $("#element-target").value = ".hero";
    $("#element-custom-target").value = "";
    $("#element-custom-target-field").classList.add("hidden");
    elementKind.value = "text";
    $("#element-content").value = "";
    $("#element-url").value = "";
    $("#element-file").value = "";
    elementUploadedUrl = "";
    $("#element-upload-status").textContent = "";
    $("#element-placement").value = "center";
    $("#element-width").value = 80;
    $("#element-layer").value = "front";
    $("#element-animation").value = "none";
    $("#element-duration").value = 6;
    elementX.value = 50;
    elementY.value = 50;
    elementOverlay.checked = true;
    $("#element-color").value = "#c9f36a";
    $("#element-rotation").value = 0;
    $("#element-opacity").value = 100;
    $("#element-radius").value = 0;
    $("#element-border-width").value = 0;
    $("#element-shadow").value = "none";
    updatePositionPreview();
    recordPositionHistory();
    if (websitePreview.contentDocument && websitePreview.contentDocument.readyState === "complete") refreshWebsitePreview();
    if (announce) themeNotice("Fields reset. Your saved elements were not changed.");
  }
  $("#clear-element-form").addEventListener("click", () => resetElementForm());
  renderCustomElements();

  function currentThemeSetting() {
    return {
      mode: themeMode.value, bg: themeBg.value, text: themeText.value, accent: themeAccent.value,
      mediaUrl: themeMediaUrl.value.trim(), animation: $("#theme-animation").value,
      duration: Math.min(30, Math.max(0.5, Number($("#theme-duration").value) || 6)),
      opacity: Math.min(100, Math.max(10, Number($("#theme-opacity").value) || 100)),
      radius: Math.min(200, Math.max(0, Number($("#theme-radius").value) || 0)),
      rotation: Math.min(180, Math.max(-180, Number($("#theme-rotation").value) || 0))
    };
  }
  function previewTheme() {
    const setting = currentThemeSetting(), preview = $("#theme-preview");
    preview.style.color = setting.text || "#f2f0eb";
    preview.style.setProperty("--accent", setting.accent || "#c9f36a");
    preview.style.opacity = String(setting.opacity / 100);
    preview.style.borderRadius = setting.radius + "px";
    preview.style.transform = setting.rotation ? "rotate(" + setting.rotation + "deg)" : "";
    preview.style.animation = "none";
    const previewAnimations = { "fade-in":"themeFadeIn", float:"themeFloat", pulse:"themePulse", "slow-zoom":"themeSlowZoom", "slide-up":"themeSlideUp", "slide-left":"themeSlideLeft", spin:"themeSpin" };
    if (previewAnimations[setting.animation] && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) preview.style.animation = previewAnimations[setting.animation] + " " + setting.duration + "s ease-in-out infinite alternate";
    preview.style.backgroundImage = ""; preview.style.backgroundColor = "";
    const oldVideo = preview.querySelector("video"); if (oldVideo) oldVideo.remove();
    if (setting.mode === "color") preview.style.backgroundColor = setting.bg;
    else if (setting.mode === "image" && setting.mediaUrl) {
      preview.style.backgroundImage = "linear-gradient(0deg,rgba(0,0,0,.2),rgba(0,0,0,.1)),url(\"" + setting.mediaUrl.replace(/["\\\\]/g, "") + "\")";
      preview.style.backgroundSize = "cover"; preview.style.backgroundPosition = "center";
    } else if (setting.mode === "video" && setting.mediaUrl) {
      preview.style.backgroundColor = setting.bg || "#0b0b0d";
      const video = document.createElement("video"); video.src = setting.mediaUrl; video.muted = true; video.loop = true; video.autoplay = true; video.playsInline = true;
      video.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0";
      preview.style.position = "relative"; preview.prepend(video);
      Array.from(preview.children).forEach(child => { if (child !== video) { child.style.position = "relative"; child.style.zIndex = "1"; } });
      const play = video.play(); if (play && play.catch) play.catch(() => {});
    } else { preview.style.backgroundColor = "#101013"; }
    themeNotice("Preview updated below. Save & publish to apply it to the selected public website area.");
    preview.scrollIntoView({behavior:"smooth",block:"center"});
  }
  $("#preview-theme-button").addEventListener("click", previewTheme);
  themeForm.addEventListener("submit", async e => {
    e.preventDefault();
    if (themeUploadBusy) return themeNotice("Wait for the media upload to finish.", true);
    const key = selectedThemeKey(), setting = currentThemeSetting();
    if (!key) return themeNotice("Enter a valid CSS selector for the element you want to customize.", true);
    if (["image", "video"].includes(setting.mode)) {
      try { const url = new URL(setting.mediaUrl); if (!["http:", "https:"].includes(url.protocol)) throw new Error(); }
      catch { return themeNotice("Enter a valid background media URL or upload a file.", true); }
    }
    const button = $("#save-theme-button"); button.disabled = true; button.textContent = "Publishing…"; themeNotice("");
    const nextSettings = { ...themeSettings, [key]: setting };
    try {
      const { error } = await client.from("portfolio_theme_settings").upsert({ id: true, settings: nextSettings, updated_at: new Date().toISOString() }, { onConflict: "id" });
      if (error) throw error;
      themeSettings = nextSettings; applyThemeTarget(key, setting);
      themeNotice("Theme saved and published successfully.");
    } catch (err) { themeNotice("Could not save theme: " + (err.message || "Please try again."), true); }
    finally { button.disabled = false; button.innerHTML = 'Save &amp; publish <span aria-hidden="true">↗</span>'; }
  });
  $("#reset-theme-button").addEventListener("click", async () => {
    const key = selectedThemeKey();
    if (!key) return themeNotice("Choose a website area or enter a valid CSS selector.", true);
    const nextSettings = { ...themeSettings }; delete nextSettings[key];
    try {
      const { error } = await client.from("portfolio_theme_settings").upsert({ id: true, settings: nextSettings, updated_at: new Date().toISOString() }, { onConflict: "id" });
      if (error) throw error;
      themeSettings = nextSettings;
      const selector = selectorForTheme(key);
      document.querySelectorAll(selector).forEach(el => {
        el.style.backgroundColor = ""; el.style.backgroundImage = ""; el.style.color = ""; el.style.removeProperty("--accent");
        const video = el.querySelector(":scope > .theme-background-video"); if (video) video.remove();
      });
      populateThemeForm(); themeNotice("Selected area reset to the site's default style.");
    } catch (err) { themeNotice("Could not reset theme: " + (err.message || "Please try again."), true); }
  });
  loadThemeSettings();

  // Text Studio stores copy and typography overrides alongside published theme settings.
  const textForm = $("#text-studio-form");
  if (textForm) {
    const textTarget = $("#text-target"), textContent = $("#text-content");
    const textFont = $("#text-font"), textSize = $("#text-size"), textWeight = $("#text-weight");
    const textAlign = $("#text-align"), textColor = $("#text-color"), textMessage = $("#text-studio-message");
    const textPreview = $("#text-preview-copy");
    const customFontFile = $("#custom-font-file"), uploadCustomFontButton = $("#upload-custom-font-button");
    const deleteCustomFontButton = $("#delete-custom-font-button"), customFontMessage = $("#custom-font-message");
    let customFonts = [];
    const textSelectors = {
      "hero-description": ".hero-bottom p", "hero-caption": ".frame-caption",
      "work-intro": ".section-heading > p",
      "project-one-title": ".project-large .project-info h3", "project-one-description": ".project-large .project-info p",
      "project-two-title": ".project-grid article:nth-child(2) .project-info h3", "project-two-description": ".project-grid article:nth-child(2) .project-info p",
      "project-three-title": ".project-grid article:nth-child(3) .project-info h3", "project-three-description": ".project-grid article:nth-child(3) .project-info p",
      "about-description": ".about-inner > div > p", "work-note": ".work-note"
    };
    let textOverrides = {};
    const textNotice = (message, error = false) => setMessage(textMessage, message, error);
    const customFontNotice = (message, error = false) => setMessage(customFontMessage, message, error);
    const safeFontName = name => name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9 _-]/g, "").trim().slice(0, 48) || "Custom Font";
    const refreshCustomFontOptions = () => {
      [...textFont.options].filter(option => option.dataset.customFont === "true").forEach(option => option.remove());
      customFonts.forEach(font => {
        const option = document.createElement("option");
        option.value = '"' + font.name.replace(/"/g, "") + '", sans-serif';
        option.textContent = font.name;
        option.dataset.customFont = "true";
        textFont.append(option);
      });
    };
    const saveFontSettings = async nextFonts => {
      const { data, error: readError } = await client.from("portfolio_theme_settings").select("settings").eq("id", true).maybeSingle();
      if (readError) throw readError;
      const settings = { ...(data?.settings || {}), __customFonts: nextFonts };
      const { error } = await client.from("portfolio_theme_settings").upsert({ id: true, settings, updated_at: new Date().toISOString() }, { onConflict: "id" });
      if (error) throw error;
      customFonts = nextFonts; refreshCustomFontOptions();
    };
    uploadCustomFontButton.addEventListener("click", async () => {
      const file = customFontFile.files?.[0];
      if (!file) return customFontNotice("Choose a font file first.", true);
      const ext = file.name.split(".").pop().toLowerCase();
      if (!["woff2","woff","ttf","otf"].includes(ext)) return customFontNotice("Supported formats: WOFF2, WOFF, TTF and OTF.", true);
      if (file.size > 10 * 1024 * 1024) return customFontNotice("Font file must be 10 MB or smaller.", true);
      uploadCustomFontButton.disabled = true; customFontNotice("Uploading font…");
      try {
        const name = safeFontName(file.name);
        const path = "fonts/" + crypto.randomUUID() + "-" + file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
        const mime = ({woff2:"font/woff2",woff:"font/woff",ttf:"font/ttf",otf:"font/otf"})[ext];
        const { data, error } = await client.storage.from("portfolio-media").upload(path, file, { cacheControl:"3600", upsert:false, contentType:mime });
        if (error) throw error;
        const { data: publicData } = client.storage.from("portfolio-media").getPublicUrl(data.path);
        const font = { name, url: publicData.publicUrl, path: data.path };
        await saveFontSettings([...customFonts.filter(item => item.name !== name), font]);
        const face = new FontFace(name, 'url("' + font.url + '")');
        await face.load(); document.fonts.add(face);
        textFont.value = '"' + name + '", sans-serif'; paintTextPreview();
        customFontFile.value = ""; customFontNotice("Font uploaded and saved. It is now available in Font family.");
      } catch (error) { customFontNotice("Could not upload font: " + (error.message || "Please try again."), true); }
      finally { uploadCustomFontButton.disabled = false; }
    });
    deleteCustomFontButton.addEventListener("click", async () => {
      const selected = textFont.selectedOptions[0];
      const font = customFonts.find(item => selected?.dataset.customFont === "true" && selected.textContent === item.name);
      if (!font) return customFontNotice("Select one of your custom fonts first.", true);
      deleteCustomFontButton.disabled = true;
      try {
        const { error } = await client.storage.from("portfolio-media").remove([font.path]);
        if (error) throw error;
        await saveFontSettings(customFonts.filter(item => item.path !== font.path));
        textFont.value = ""; paintTextPreview(); customFontNotice("Custom font deleted.");
      } catch (error) { customFontNotice("Could not delete font: " + (error.message || "Please try again."), true); }
      finally { deleteCustomFontButton.disabled = false; }
    });
    const textStyleFromForm = () => ({
      content: textContent.value.slice(0, 600), font: textFont.value,
      size: Math.max(10, Math.min(120, Number(textSize.value) || 18)),
      weight: textWeight.value, align: textAlign.value, color: textColor.value
    });
    const paintTextPreview = () => {
      const value = textStyleFromForm();
      textPreview.textContent = value.content || "Your text preview appears here.";
      textPreview.style.fontFamily = value.font || "";
      textPreview.style.fontSize = value.size + "px";
      textPreview.style.fontWeight = value.weight || "";
      textPreview.style.textAlign = value.align || "";
      textPreview.style.color = value.color || "";
    };
    const populateTextForm = () => {
      const saved = textOverrides[textTarget.value] || {};
      const target = document.querySelector(textSelectors[textTarget.value]);
      textContent.value = saved.content ?? target?.textContent?.trim() ?? "";
      textFont.value = saved.font || ""; textSize.value = saved.size || 18;
      textWeight.value = saved.weight || ""; textAlign.value = saved.align || "";
      textColor.value = saved.color || "#f2f0eb"; paintTextPreview(); textNotice("");
    };
    ["input","change"].forEach(type => textForm.addEventListener(type, event => {
      if (event.target !== textTarget) paintTextPreview();
    }));
    textTarget.addEventListener("change", populateTextForm);
    $("#preview-text-button").addEventListener("click", paintTextPreview);
    textForm.addEventListener("submit", async event => {
      event.preventDefault();
      const key = textTarget.value, selector = textSelectors[key], value = textStyleFromForm();
      if (!selector) return textNotice("Choose a supported text element.", true);
      const nextOverrides = { ...textOverrides, [key]: value };
      const saveButton = $("#save-text-button"); saveButton.disabled = true; textNotice("");
      try {
        const { data, error: readError } = await client.from("portfolio_theme_settings").select("settings").eq("id", true).maybeSingle();
        if (readError) throw readError;
        const allSettings = data?.settings || {};
        const nextSettings = { ...allSettings, __textStudio: nextOverrides };
        const { error } = await client.from("portfolio_theme_settings").upsert({ id: true, settings: nextSettings, updated_at: new Date().toISOString() }, { onConflict: "id" });
        if (error) throw error;
        textOverrides = nextOverrides;
        textNotice("Text saved and published. Refresh your public portfolio to see the update.");
      } catch (error) { textNotice("Could not save text: " + (error.message || "Please try again."), true); }
      finally { saveButton.disabled = false; }
    });
    $("#reset-text-button").addEventListener("click", async () => {
      const key = textTarget.value, nextOverrides = { ...textOverrides }; delete nextOverrides[key];
      try {
        const { data, error: readError } = await client.from("portfolio_theme_settings").select("settings").eq("id", true).maybeSingle();
        if (readError) throw readError;
        const nextSettings = { ...(data?.settings || {}), __textStudio: nextOverrides };
        const { error } = await client.from("portfolio_theme_settings").upsert({ id: true, settings: nextSettings, updated_at: new Date().toISOString() }, { onConflict: "id" });
        if (error) throw error;
        textOverrides = nextOverrides; populateTextForm(); textNotice("Selected text override reset.");
      } catch (error) { textNotice("Could not reset text: " + (error.message || "Please try again."), true); }
    });
    (async () => {
      try {
        const { data } = await client.from("portfolio_theme_settings").select("settings").eq("id", true).maybeSingle();
        customFonts = data?.settings?.__customFonts || []; refreshCustomFontOptions();
        for (const font of customFonts) { try { const face = new FontFace(font.name, 'url("' + font.url + '")'); await face.load(); document.fonts.add(face); } catch {} }
        textOverrides = data?.settings?.__textStudio || {};
        populateTextForm();
      } catch { populateTextForm(); }
    })();
  }

  // Animation Studio: save reusable motion settings alongside the published theme.
  const animationForm = $("#animation-studio-form");
  if (animationForm) {
    const target = $("#animation-target"), preset = $("#animation-preset");
    const duration = $("#animation-duration"), delay = $("#animation-delay");
    const easing = $("#animation-easing"), trigger = $("#animation-trigger"), repeat = $("#animation-repeat");
    const previewCard = $("#animation-preview-card"), messageEl = $("#animation-studio-message");
    const saveBtn = $("#save-animation-button");
    const targets = {
      "hero-title": ".hero h1", "hero-description": ".hero-bottom p", "hero-media": ".hero-frame",
      work: ".work-section", "project-cards": ".project-card", "project-one": ".project-grid article:first-child",
      about: ".about-section", contact: ".contact-section", header: ".site-header", footer: ".site-footer"
    };
    let animationSettings = {};
    const notice = (message, error=false) => setMessage(messageEl, message, error);
    const current = () => ({ preset:preset.value, duration:Math.max(.3,Math.min(20,Number(duration.value)||1.2)), delay:Math.max(0,Math.min(10,Number(delay.value)||0)), easing:easing.value, trigger:trigger.value, repeat:repeat.value });
    const replay = () => {
      previewCard.classList.remove("animation-preview-running");
      previewCard.style.setProperty("--motion-duration", current().duration+"s");
      previewCard.style.setProperty("--motion-delay", current().delay+"s");
      previewCard.style.setProperty("--motion-easing", current().easing);
      previewCard.dataset.motion = preset.value;
      void previewCard.offsetWidth;
      previewCard.classList.add("animation-preview-running");
      notice("Preview playing. These settings are not published yet.");
    };
    $("#preview-animation-button").addEventListener("click", replay);
    $("#replay-animation-preview").addEventListener("click", replay);
    [preset,duration,delay,easing,trigger,repeat,target].forEach(el=>el.addEventListener("change",()=>{previewCard.classList.remove("animation-preview-running");notice("");}));
    animationForm.addEventListener("submit", async event => {
      event.preventDefault();
      const key=target.value, value=current();
      saveBtn.disabled=true; notice("Publishing animation settings…");
      try {
        const {data,error:readError}=await client.from("portfolio_theme_settings").select("settings").eq("id",true).maybeSingle();
        if(readError) throw readError;
        const settings=data?.settings||{};
        const nextAnimations={...(settings.__animationStudio||{}),[key]:value};
        const {error}=await client.from("portfolio_theme_settings").upsert({id:true,settings:{...settings,__animationStudio:nextAnimations},updated_at:new Date().toISOString()},{onConflict:"id"});
        if(error) throw error;
        animationSettings=nextAnimations;
        notice("Animation saved and published. Refresh your public portfolio to see the update.");
      } catch(error) { notice("Could not save animation: "+(error.message||"Please try again."),true); }
      finally {saveBtn.disabled=false;}
    });
    $("#reset-animation-button").addEventListener("click",async()=>{
      const key=target.value;
      try{
        const {data,error:readError}=await client.from("portfolio_theme_settings").select("settings").eq("id",true).maybeSingle();
        if(readError) throw readError;
        const settings=data?.settings||{}, nextAnimations={...(settings.__animationStudio||{})};
        delete nextAnimations[key];
        const {error}=await client.from("portfolio_theme_settings").upsert({id:true,settings:{...settings,__animationStudio:nextAnimations},updated_at:new Date().toISOString()},{onConflict:"id"});
        if(error) throw error;
        animationSettings=nextAnimations;notice("Animation reset for the selected element.");
      }catch(error){notice("Could not reset animation: "+(error.message||"Please try again."),true);}
    });
    (async()=>{try{const {data,error}=await client.from("portfolio_theme_settings").select("settings").eq("id",true).maybeSingle();if(error)throw error;animationSettings=data?.settings?.__animationStudio||{};}catch{}})();
  }

  logoutButton.addEventListener("click", async () => { recoveryMode = false; await client.auth.signOut(); showLogin(); setMessage(message, "You have signed out."); });
  checkSession();
})();