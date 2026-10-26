/* Owner Studio auth + project library. Browser code uses only Supabase publishable key. */
(() => {
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
  function showDashboard(user) { recoveryMode = false; hideViews(); dashboardView.classList.remove("hidden"); signedInAs.textContent = user?.email ? "Signed in as " + user.email : "Authenticated owner"; loadProjects(); }

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
    projects.forEach(project => {
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
        $("#project-manager").scrollIntoView({ behavior: "smooth", block: "start" });
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
  const themeTarget = $("#theme-target"), themeMode = $("#theme-mode");
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
    populateThemeForm();
  }
  themeTarget.addEventListener("change", () => { updateThemeFields(); populateThemeForm(); });
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
  let elementUploadBusy = false, elementUploadedUrl = "";
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
      info.append(strong,small); const del = document.createElement("button"); del.type = "button"; del.className = "quiet-button"; del.textContent = "Remove";
      del.addEventListener("click", () => saveCustomElements(getCustomElements().filter(x => x.id !== item.id)));
      card.append(info,del); list.append(card);
    });
  }
  async function saveCustomElements(items) {
    const next = { ...themeSettings, __elements: items };
    const { error } = await client.from("portfolio_theme_settings").upsert({ id:true, settings:next, updated_at:new Date().toISOString() },{onConflict:"id"});
    if (error) { themeNotice("Could not save elements: " + error.message,true); return; }
    themeSettings = next; renderCustomElements(); themeNotice("Element list saved. Refresh the public portfolio to see changes.");
  }
  $("#add-element-button").addEventListener("click", async () => {
    if (elementUploadBusy) return themeNotice("Wait for the file upload to finish.",true);
    let target = $("#element-target").value === "custom" ? $("#element-custom-target").value.trim() : $("#element-target").value;
    if (!target) return themeNotice("Choose a target section or enter a CSS selector.",true);
    if ($("#element-target").value === "custom") { try { document.querySelector(target); } catch { return themeNotice("Enter a valid CSS selector.",true); } }
    const kind = elementKind.value, content = $("#element-content").value.trim(), url = $("#element-url").value.trim();
    if (kind === "text" && !content) return themeNotice("Enter the text you want to add.",true);
    if (kind !== "text") { try { const u = new URL(url); if (!["http:","https:"].includes(u.protocol)) throw new Error(); } catch { return themeNotice("Add a valid image/video URL or upload a file first.",true); } }
    const items = getCustomElements();
    if (items.length >= 30) return themeNotice("Maximum 30 custom elements. Remove one before adding another.",true);
    const item = { id:crypto.randomUUID(), target, kind, content:content.slice(0,240), url, placement:$("#element-placement").value, width:Math.max(10,Math.min(100,Number($("#element-width").value)||80)), animation:$("#element-animation").value, duration:Math.max(.5,Math.min(30,Number($("#element-duration").value)||6)), color:$("#element-color").value };
    await saveCustomElements([...items,item]);
  });
  $("#clear-element-form").addEventListener("click", () => { $("#element-content").value=""; $("#element-url").value=""; $("#element-file").value=""; elementUploadedUrl=""; $("#element-upload-status").textContent=""; });
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

  logoutButton.addEventListener("click", async () => { recoveryMode = false; await client.auth.signOut(); showLogin(); setMessage(message, "You have signed out."); });
  checkSession();
})();