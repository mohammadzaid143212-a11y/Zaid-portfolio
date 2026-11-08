/* Owner Studio auth + project library. Browser code uses only Supabase publishable key. */
(() => {
  // Keep element editing in its own module, separate from global theme controls.
  const elementStudioContent = document.getElementById("element-studio-content");
  const elementBuilderPanel = document.querySelector("#theme-manager .custom-elements-panel");
  if (elementStudioContent && elementBuilderPanel) {
    elementStudioContent.replaceChildren(elementBuilderPanel);
    elementBuilderPanel.classList.add("element-studio-panel");
  }
  // Keep detailed controls in their own first-class sidebar workspace.
  const adjustmentStudioContent = document.getElementById("adjustment-studio-content");
  const adjustmentPanel = document.getElementById("adjustment-panel");
  if (adjustmentStudioContent && adjustmentPanel) {
    adjustmentStudioContent.replaceChildren(adjustmentPanel);
    adjustmentPanel.open = true;
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
    const showPanel = (id) => {
      const slides = Array.from(dashboardView.querySelectorAll(".studio-slide"));
      const target = slides.find(slide => slide.id === id);
      if (!target) return;
      slides.forEach(slide => {
        const active = slide === target;
        slide.classList.toggle("is-active", active);
        slide.hidden = !active;
        slide.setAttribute("aria-hidden", String(!active));
      });
      dashboardView.querySelectorAll("[data-owner-section]").forEach(link => {
        const active = link.dataset.ownerSection === id;
        link.classList.toggle("is-active", active);
        if (active) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      });
      dashboardView.dataset.activePanel = id;
      window.scrollTo({ top: 0, behavior: "auto" });
    };
    dashboardView.addEventListener("click", event => {
      const link = event.target.closest("[data-owner-section]");
      if (!link || !dashboardView.contains(link)) return;
      event.preventDefault();
      const panelId = link.dataset.ownerSection;
      showPanel(panelId);
      if (panelId === "adjustment-studio") document.getElementById("adjustment-panel")?.setAttribute("open", "");
      if (panelId === "long-video-manager") setVideoPanel("long");
      if (panelId === "short-video-manager") setVideoPanel("short");
    });
    dashboardView.addEventListener("zaid-owner-panels-updated", () => showPanel(dashboardView.dataset.activePanel || "studio-overview"));
    dashboardView.dataset.clickNavigationReady = "true";
    showPanel("studio-overview");
  }
  function showDashboard(user) { recoveryMode = false; hideViews(); dashboardView.classList.remove("hidden"); setupStudioSlides(); signedInAs.textContent = user?.email ? "Signed in as " + user.email : "Authenticated owner"; loadProjects(); window.dispatchEvent(new CustomEvent("zaid-owner-ready")); }

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
    const formatHint = $("#project-format-hint");
    if (formatHint) formatHint.textContent = isLong ? "Public card format: 16:9 landscape · Thumbnail available" : "Public card format: 9:16 vertical · Short video preview is autoplay-ready · No thumbnail field";
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
      let uploadedPath = path;
      if (isVideo) {
        if (!window.tus || typeof window.tus.Upload !== "function") {
          throw new Error("Resumable upload library did not load. Refresh the page and try again.");
        }
        const { data: authData, error: authError } = await client.auth.getSession();
        if (authError) throw authError;
        const accessToken = authData.session?.access_token;
        if (!accessToken) throw new Error("Your owner session expired. Please sign in again.");
        await new Promise((resolve, reject) => {
          const upload = new window.tus.Upload(file, {
            endpoint: "https://rtaedoseedjwljixmrgy.storage.supabase.co/storage/v1/upload/resumable",
            retryDelays: [0, 3000, 5000, 10000, 20000],
            headers: { authorization: "Bearer " + accessToken, apikey: SUPABASE_PUBLIC_KEY },
            uploadDataDuringCreation: true,
            removeFingerprintOnSuccess: true,
            chunkSize: 6 * 1024 * 1024,
            metadata: {
              bucketName: "portfolio-media",
              objectName: path,
              contentType: file.type,
              cacheControl: "3600"
            },
            onError: reject,
            onProgress: (bytesUploaded, bytesTotal) => {
              const percent = Math.min(100, Math.round((bytesUploaded / bytesTotal) * 100));
              bar.style.width = percent + "%";
              uploadStatus(kind, "Uploading " + file.name + " — " + percent + "%");
            },
            onSuccess: resolve
          });
          upload.findPreviousUploads().then(previous => {
            if (previous.length) upload.resumeFromPreviousUpload(previous[0]);
            upload.start();
          }).catch(reject);
        });
      } else {
        const { data, error } = await client.storage.from("portfolio-media").upload(path, file, {
          cacheControl: "3600", upsert: false, contentType: file.type
        });
        if (error) throw error;
        uploadedPath = data.path;
      }
      const { data: publicData } = client.storage.from("portfolio-media").getPublicUrl(uploadedPath);
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
      const card = document.createElement("article"); card.className = "library-item library-item-" + (project.project_type === "short" ? "short" : "long");
      card.dataset.aspectRatio = project.project_type === "short" ? "9:16" : "16:9";
      const info = document.createElement("div"); info.className = "library-item-info";
      const title = document.createElement("h4"); title.textContent = project.title;
      const meta = document.createElement("p"); meta.textContent = (project.project_type === "long" ? "LONG VIDEO" : "SHORT VIDEO") + " · " + (project.is_published ? "PUBLISHED" : "DRAFT");
      const desc = document.createElement("p"); desc.textContent = project.description || "No description added.";
      info.append(title, meta, desc);
      const actions = document.createElement("div"); actions.className = "library-actions";
      const edit = document.createElement("button"); edit.className = "quiet-button"; edit.type = "button"; edit.textContent = "Edit";
      edit.addEventListener("click", () => {
        editingId = project.id; $("#project-id").value = project.id; $("#project-title").value = project.title;
        projectType.value = project.project_type; $("#project-sort-order").value = Number.isInteger(project.sort_order) ? project.sort_order : 0; $("#project-description").value = project.description || "";
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
    const sortOrder = Number.parseInt($("#project-sort-order").value, 10);
    const payload = { title, project_type: projectType.value, description: $("#project-description").value.trim(), video_url: videoUrl, thumbnail_url: projectType.value === "long" ? thumbnail : "", is_published: $("#project-published").checked, sort_order: Number.isFinite(sortOrder) ? Math.max(0, Math.min(9999, sortOrder)) : 0 };
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
  function endPositionDrag() { if (dragPositioning) recordPositionHistory(); dragPositioning = false; positionHandle.classList.remove("is-dragging"); }
  positionHandle.addEventListener("pointerup", endPositionDrag);
  positionHandle.addEventListener("pointercancel", endPositionDrag);
  [elementX,elementY].forEach(input => input.addEventListener("input", updatePositionPreview));
  $("#element-mobile-enabled").addEventListener("change", () => $("#element-mobile-fields").classList.toggle("hidden", !$("#element-mobile-enabled").checked));
  [$("#element-mobile-x"),$("#element-mobile-y"),$("#element-mobile-width")].forEach(input => input.addEventListener("input", updatePositionPreview));
  [elementKind,$("#element-content"),$("#element-url"),$("#element-width"),$("#element-color"),$("#element-rotation"),$("#element-opacity"),$("#element-radius"),$("#element-border-width"),$("#element-shadow"),elementOverlay].forEach(el => el.addEventListener("input", updatePositionPreview));
  $("#element-placement").addEventListener("change", updatePositionPreview);
  updatePositionPreview();

  // Local Visual Builder drafts never write to Supabase or publish the public site.
  const elementDraftKey = "zaid-portfolio:visual-builder-draft:v1";
  const draftFieldIds = ["element-target","element-custom-target","element-kind","element-content","element-url","element-placement","element-width","element-x","element-y","element-overlay","element-layer","element-mobile-enabled","element-mobile-x","element-mobile-y","element-mobile-width","element-animation","element-duration","element-color","element-rotation","element-opacity","element-radius","element-border-width","element-shadow"];
  let draftSaveTimer = null;
  function collectElementDraft() {
    const fields = {};
    draftFieldIds.forEach(id => { const el = document.getElementById(id); if (el) fields[id] = el.type === "checkbox" ? el.checked : el.value; });
    return { version: 1, savedAt: new Date().toISOString(), fields, editingElementId };
  }
  function setElementDraftStatus(message, error = false) {
    const status = $("#element-draft-status");
    if (!status) return;
    status.textContent = message;
    status.dataset.state = error ? "error" : "saved";
  }
  function saveElementDraft(automatic = false) {
    try {
      localStorage.setItem(elementDraftKey, JSON.stringify(collectElementDraft()));
      setElementDraftStatus(automatic ? "Autosaved locally · " + new Date().toLocaleTimeString() : "Draft saved in this browser · " + new Date().toLocaleTimeString());
      return true;
    } catch (err) {
      setElementDraftStatus("Could not save draft in this browser. Check available storage.", true);
      return false;
    }
  }
  function scheduleElementDraftSave() {
    if (draftSaveTimer) window.clearTimeout(draftSaveTimer);
    setElementDraftStatus("Unsaved changes · autosaving…");
    draftSaveTimer = window.setTimeout(() => { draftSaveTimer = null; saveElementDraft(true); }, 650);
  }
  function restoreElementDraft() {
    let draft;
    try { draft = JSON.parse(localStorage.getItem(elementDraftKey) || "null"); }
    catch { setElementDraftStatus("Saved draft could not be read.", true); return; }
    if (!draft || draft.version !== 1 || !draft.fields) { setElementDraftStatus("No saved Visual Builder draft found.", true); return; }
    draftFieldIds.forEach(id => {
      if (!(id in draft.fields)) return;
      const el = document.getElementById(id);
      if (el) el.type === "checkbox" ? el.checked = !!draft.fields[id] : el.value = draft.fields[id];
    });
    editingElementId = draft.editingElementId || null;
    elementKind.dispatchEvent(new Event("change"));
    $("#element-custom-target-field").classList.toggle("hidden", $("#element-target").value !== "custom");
    $("#element-mobile-fields").classList.toggle("hidden", !$("#element-mobile-enabled").checked);
    $("#add-element-button").textContent = editingElementId ? "Update element" : "Add element";
    updatePositionPreview();
    recordPositionHistory();
    if (websitePreview.contentDocument?.readyState === "complete") refreshWebsitePreview();
    const when = draft.savedAt ? new Date(draft.savedAt).toLocaleString() : "an earlier session";
    setElementDraftStatus("Draft restored · saved " + when);
  }
  draftFieldIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.addEventListener("input", scheduleElementDraftSave); el.addEventListener("change", scheduleElementDraftSave); }
  });
  $("#save-element-draft").addEventListener("click", () => saveElementDraft(false));
  $("#restore-element-draft").addEventListener("click", restoreElementDraft);
  $("#discard-element-draft").addEventListener("click", () => {
    if (!window.confirm("Discard the saved Visual Builder draft from this browser?")) return;
    localStorage.removeItem(elementDraftKey);
    setElementDraftStatus("Saved draft discarded. Your published portfolio and saved elements were not changed.");
  });
  window.addEventListener("beforeunload", () => {
    if (draftSaveTimer) { window.clearTimeout(draftSaveTimer); saveElementDraft(true); }
  });
  // Live same-origin website preview with a temporary draggable placement marker.
  const websitePreview = $("#element-website-preview");
   const websitePreviewWrap = websitePreview.closest(".website-preview-frame-wrap");
   const previewDesktopButton = $("#preview-desktop-mode"), previewMobileButton = $("#preview-mobile-mode");
   let previewMode = "desktop";
   function setWebsitePreviewMode(mode) {
     previewMode = mode === "mobile" ? "mobile" : "desktop";
     const mobile = previewMode === "mobile";
     websitePreviewWrap?.classList.toggle("is-mobile-preview", mobile);
     previewDesktopButton.classList.toggle("is-active", !mobile);
     previewMobileButton.classList.toggle("is-active", mobile);
     previewDesktopButton.setAttribute("aria-pressed", String(!mobile));
     previewMobileButton.setAttribute("aria-pressed", String(mobile));
     websitePreview.title = mobile ? "Mobile-sized live public portfolio preview" : "Desktop-sized live public portfolio preview";
     const adjustmentSummary = $("#adjustment-panel > summary small");
     if (adjustmentSummary) adjustmentSummary.textContent = mobile ? "Mobile layout · styling · motion" : "Desktop layout · styling · motion";
     if (typeof applyPositionHistory === "function") applyPositionHistory(historyIndexes[activeHistoryKey()], { refresh: false });
     updateHistoryButtons();
     if (websitePreview.contentDocument?.readyState === "complete") window.setTimeout(refreshWebsitePreview, 80);
   }
   previewDesktopButton.addEventListener("click", () => setWebsitePreviewMode("desktop"));
   previewMobileButton.addEventListener("click", () => setWebsitePreviewMode("mobile"));
  let previewTarget = null, previewMarker = null, previewDrag = false;
  const positionHistory = { desktop: [], mobile: [] };
  const historyIndexes = { desktop: -1, mobile: -1 };
  let restoringHistory = false;
  function activeHistoryKey() { return previewMode === "mobile" ? "mobile" : "desktop"; }
  function activePreviewPosition() {
    return previewMode === "mobile"
      ? { x: Number($("#element-mobile-x").value) || 0, y: Number($("#element-mobile-y").value) || 0, width: Number($("#element-mobile-width").value) || 90 }
      : { x: Number(elementX.value) || 0, y: Number(elementY.value) || 0, width: Number($("#element-width").value) || 80 };
  }
  function positionSnapshot() {
    return {
      x: Number(elementX.value) || 0, y: Number(elementY.value) || 0,
      width: Number($("#element-width").value) || 80, layer: $("#element-layer").value || "front",
      mobileEnabled: $("#element-mobile-enabled").checked,
      mobileX: Number($("#element-mobile-x").value) || 0,
      mobileY: Number($("#element-mobile-y").value) || 0,
      mobileWidth: Number($("#element-mobile-width").value) || 90
    };
  }
  function updateHistoryButtons() {
    const key = activeHistoryKey(), stack = positionHistory[key], index = historyIndexes[key];
    $("#element-undo").disabled = index <= 0;
    $("#element-redo").disabled = index >= stack.length - 1;
    $("#element-history-status").textContent = stack.length
      ? (key === "mobile" ? "Mobile" : "Desktop") + " · Change " + (index + 1) + " of " + stack.length
      : (key === "mobile" ? "Mobile" : "Desktop") + " · Move or resize to create history.";
  }
  function recordPositionHistory() {
    if (restoringHistory) return;
    const key = activeHistoryKey(), stack = positionHistory[key], state = positionSnapshot(), prev = stack[historyIndexes[key]];
    if (prev && JSON.stringify(prev) === JSON.stringify(state)) return;
    stack.splice(historyIndexes[key] + 1);
    stack.push(state);
    if (stack.length > 40) stack.shift();
    historyIndexes[key] = stack.length - 1;
    updateHistoryButtons();
  }
  function applyPositionHistory(index, options = {}) {
    const key = activeHistoryKey(), stack = positionHistory[key];
    if (index < 0 || index >= stack.length) return;
    restoringHistory = true;
    const state = stack[index];
    historyIndexes[key] = index;
    elementX.value = state.x; elementY.value = state.y; $("#element-width").value = state.width;
    $("#element-layer").value = state.layer;
    $("#element-mobile-enabled").checked = !!state.mobileEnabled;
    $("#element-mobile-x").value = state.mobileX; $("#element-mobile-y").value = state.mobileY;
    $("#element-mobile-width").value = state.mobileWidth;
    $("#element-mobile-fields").classList.toggle("hidden", !state.mobileEnabled);
    const active = key === "mobile"
      ? { x: state.mobileX, y: state.mobileY, width: state.mobileWidth }
      : { x: state.x, y: state.y, width: state.width };
    updatePositionPreview();
    if (previewMarker && previewMarker.isConnected) {
      previewMarker.style.left = active.x + "%"; previewMarker.style.top = active.y + "%";
      previewMarker.style.width = "min(" + active.width + "%,100%)";
      previewMarker.style.zIndex = state.layer === "back" ? "1" : "99999";
    }
    restoringHistory = false;
    updateHistoryButtons();
    if (options.refresh !== false && websitePreview.contentDocument?.readyState === "complete") window.setTimeout(refreshWebsitePreview, 50);
  }
  $("#element-undo").addEventListener("click", () => applyPositionHistory(historyIndexes[activeHistoryKey()] - 1));
  $("#element-redo").addEventListener("click", () => applyPositionHistory(historyIndexes[activeHistoryKey()] + 1));
  [elementX, elementY, $("#element-width"), $("#element-layer"), $("#element-mobile-enabled"), $("#element-mobile-x"), $("#element-mobile-y"), $("#element-mobile-width")].forEach(el => {
    el.addEventListener("change", recordPositionHistory);
    el.addEventListener("input", () => { if (el.type === "number") updatePositionPreview(); });
  });
  recordPositionHistory();

  // One-tap alignment for the currently edited element, respecting desktop/mobile mode.
  document.querySelectorAll("[data-element-align]").forEach(button => button.addEventListener("click", () => {
    const position = activePreviewPosition();
    const width = Math.max(10, Math.min(100, Number(position.width) || 80));
    const action = button.dataset.elementAlign;
    let x = clampPercent(position.x), y = clampPercent(position.y);
    if (action === "left") x = width / 2;
    if (action === "center-x") x = 50;
    if (action === "right") x = 100 - width / 2;
    if (action === "top") y = 2;
    if (action === "center-y") y = 50;
    if (action === "bottom") y = 98;
    if (previewMode === "mobile") {
      $("#element-mobile-enabled").checked = true;
      $("#element-mobile-fields").classList.remove("hidden");
      $("#element-mobile-x").value = Math.round(x);
      $("#element-mobile-y").value = Math.round(y);
    } else {
      elementX.value = Math.round(x);
      elementY.value = Math.round(y);
    }
    updatePositionPreview();
    if (websitePreview.contentDocument?.readyState === "complete") refreshWebsitePreview();
    recordPositionHistory();
  }));

  // Direct selection and editing for existing built-in headings and paragraphs.
   let selectedBuiltInSelector = "", selectedBuiltInNode = null;
   const builtInText = $("#built-in-text"), builtInFontSize = $("#built-in-font-size");
   const builtInRadius = $("#built-in-radius"), builtInTextColor = $("#built-in-text-color");
   const builtInBgColor = $("#built-in-bg-color"), builtInStatus = $("#built-in-selection-status");
    const builtInFontWeight = $("#built-in-font-weight"), builtInTextAlign = $("#built-in-text-align");
    const builtInLetterSpacing = $("#built-in-letter-spacing");
    const builtInOpacity = $("#built-in-opacity"), builtInBorderWidth = $("#built-in-border-width");
    const builtInBorderColor = $("#built-in-border-color");
    const builtInLineHeight = $("#built-in-line-height"), builtInTextDecoration = $("#built-in-text-decoration");
    const builtInLinkUrl=$("#built-in-link-url"), builtInImageSrc=$("#built-in-image-src"), builtInImageAlt=$("#built-in-image-alt"), builtInImageWidth=$("#built-in-image-width");
    const builtInImageFit=$("#built-in-image-fit"), builtInImagePosition=$("#built-in-image-position"), builtInLinkTarget=$("#built-in-link-target");
   const builtInSave = $("#save-built-in-element"), builtInReset = $("#reset-built-in-element");
   function stablePreviewSelector(node) {
     if (!node || !node.tagName) return "";
     if (node.id) return "#" + CSS.escape(node.id);
     const parts = []; let current = node;
     while (current && current.nodeType === 1 && current.tagName.toLowerCase() !== "body") {
       let part = current.tagName.toLowerCase();
       if (current.parentElement) {
         const siblings = Array.from(current.parentElement.children).filter(item => item.tagName === current.tagName);
         if (siblings.length > 1) part += ":nth-of-type(" + (siblings.indexOf(current) + 1) + ")";
       }
       parts.unshift(part);
       if (current.parentElement?.id) { parts.unshift("#" + CSS.escape(current.parentElement.id)); break; }
       current = current.parentElement;
     }
     return parts.join(" > ").slice(0,240);
   }
   function setBuiltInControlsEnabled(enabled) {
     [builtInText,builtInFontSize,builtInRadius,builtInTextColor,builtInBgColor,builtInFontWeight,builtInTextAlign,builtInLetterSpacing,builtInOpacity,builtInBorderWidth,builtInBorderColor,builtInLineHeight,builtInTextDecoration,builtInSave,builtInReset].forEach(control => { control.disabled = !enabled; });
     [builtInLinkUrl,builtInImageSrc,builtInImageAlt,builtInImageWidth,builtInImageFit,builtInImagePosition,builtInLinkTarget].forEach(control => { control.disabled = true; });
   }
   function rgbToHex(value) {
     const match = String(value).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
     return match ? "#" + match.slice(1,4).map(part => Number(part).toString(16).padStart(2,"0")).join("") : value;
   }
   function updateBuiltInPreview() {
     const tag = selectedBuiltInNode?.tagName?.toLowerCase();
     const canEditLabel = tag !== "img" && !selectedBuiltInNode?.querySelector("*");
     builtInText.disabled = !canEditLabel;
     if (canEditLabel) selectedBuiltInNode.textContent = builtInText.value.slice(0,500);
     if (tag === "img") {
       if (builtInImageSrc.value.trim()) selectedBuiltInNode.src = builtInImageSrc.value.trim();
       selectedBuiltInNode.alt = builtInImageAlt.value.slice(0,240);
       selectedBuiltInNode.style.width = Math.max(20,Math.min(2000,Number(builtInImageWidth.value)||600)) + "px";
       selectedBuiltInNode.style.height = "auto";
       selectedBuiltInNode.style.objectFit = builtInImageFit.value;
       selectedBuiltInNode.style.objectPosition = builtInImagePosition.value;
     }
     if (tag === "a" && builtInLinkUrl.value.trim()) { selectedBuiltInNode.setAttribute("href",builtInLinkUrl.value.trim()); selectedBuiltInNode.setAttribute("target",builtInLinkTarget.value); if (builtInLinkTarget.value === "_blank") selectedBuiltInNode.setAttribute("rel","noopener noreferrer"); else selectedBuiltInNode.removeAttribute("rel"); }
     if (!selectedBuiltInNode?.isConnected) return;
     // Text updates are handled above only for simple text elements.
     selectedBuiltInNode.style.fontSize = Math.max(10,Math.min(120,Number(builtInFontSize.value)||24)) + "px";
     selectedBuiltInNode.style.borderRadius = Math.max(0,Math.min(100,Number(builtInRadius.value)||0)) + "px";
     selectedBuiltInNode.style.color = builtInTextColor.value;
     selectedBuiltInNode.style.backgroundColor = builtInBgColor.value;
     selectedBuiltInNode.style.fontWeight = builtInFontWeight.value;
     selectedBuiltInNode.style.textAlign = builtInTextAlign.value;
     selectedBuiltInNode.style.letterSpacing = Math.max(-2,Math.min(20,Number(builtInLetterSpacing.value)||0)) + "px";
     selectedBuiltInNode.style.opacity = String(Math.max(10,Math.min(100,Number(builtInOpacity.value)||100))/100);
     selectedBuiltInNode.style.borderWidth = Math.max(0,Math.min(20,Number(builtInBorderWidth.value)||0)) + "px";
     selectedBuiltInNode.style.borderStyle = Number(builtInBorderWidth.value)>0 ? "solid" : "none";
     selectedBuiltInNode.style.borderColor = builtInBorderColor.value;
     selectedBuiltInNode.style.lineHeight = String(Math.max(0.8,Math.min(3,Number(builtInLineHeight.value)||1.2)));
     selectedBuiltInNode.style.textDecoration = builtInTextDecoration.value;
   }
   function selectBuiltInPreviewNode(node) {
     if (!node || node.closest(".owner-added-element,.owner-editor-alignment-guides,.owner-custom-section")) return;
     const selector = stablePreviewSelector(node); if (!selector) return;
     selectedBuiltInNode = node; selectedBuiltInSelector = selector;
     const tagName=node.tagName.toLowerCase(), simpleText=!node.querySelector("*") && tagName!=="img";
     builtInText.disabled = !simpleText;
     builtInLinkUrl.disabled = tagName !== "a";
     builtInImageSrc.disabled = tagName !== "img"; builtInImageAlt.disabled = tagName !== "img"; builtInImageWidth.disabled = tagName !== "img"; builtInImageFit.disabled = tagName !== "img"; builtInImagePosition.disabled = tagName !== "img"; builtInLinkTarget.disabled = tagName !== "a";
     builtInLinkUrl.value = tagName === "a" ? (node.getAttribute("href")||"") : "";
     builtInLinkTarget.value = tagName === "a" && node.getAttribute("target")==="_blank" ? "_blank" : "_self";
     builtInImageSrc.value = tagName === "img" ? (node.getAttribute("src")||"") : "";
     builtInImageAlt.value = tagName === "img" ? (node.getAttribute("alt")||"") : "";
     builtInImageWidth.value = tagName === "img" ? Math.round(node.getBoundingClientRect().width||600) : 600;
     const imageComputedStyle = tagName === "img" ? websitePreview.contentWindow.getComputedStyle(node) : null;
     builtInImageFit.value = tagName === "img" && ["cover","contain","fill","none"].includes(imageComputedStyle.objectFit) ? imageComputedStyle.objectFit : "cover";
     const imagePosition = imageComputedStyle?.objectPosition || "center";
     builtInImagePosition.value = tagName === "img" && ["center","top","bottom","left","right"].includes(imagePosition) ? imagePosition : "center";
     builtInText.value = node.tagName.toLowerCase()==="img" ? "" : node.textContent.trim().slice(0,500);
     const style = websitePreview.contentWindow.getComputedStyle(node);
     builtInFontSize.value = Math.round(parseFloat(style.fontSize)||24);
     builtInRadius.value = Math.round(parseFloat(style.borderRadius)||0);
     builtInTextColor.value = /^#[0-9a-f]{6}$/i.test(rgbToHex(style.color)) ? rgbToHex(style.color) : "#f2f0eb";
     builtInBgColor.value = /^#[0-9a-f]{6}$/i.test(rgbToHex(style.backgroundColor)) ? rgbToHex(style.backgroundColor) : "#ffffff";
     builtInFontWeight.value = String(Math.max(300,Math.min(800,Math.round((parseInt(style.fontWeight,10)||400)/100)*100)));
     builtInTextAlign.value = ["left","center","right","justify"].includes(style.textAlign) ? style.textAlign : "left";
     builtInLetterSpacing.value = Math.max(-2,Math.min(20,parseFloat(style.letterSpacing)||0));
     builtInOpacity.value = Math.round((parseFloat(style.opacity)||1)*100);
     builtInBorderWidth.value = Math.max(0,Math.min(20,Math.round(parseFloat(style.borderTopWidth)||0)));
     builtInBorderColor.value = /^#[0-9a-f]{6}$/i.test(rgbToHex(style.borderTopColor)) ? rgbToHex(style.borderTopColor) : "#ffffff";
     builtInLineHeight.value = Math.max(0.8,Math.min(3,parseFloat(style.lineHeight)/Math.max(1,parseFloat(style.fontSize)||24)||1.2)).toFixed(1);
     builtInTextDecoration.value = ["underline","line-through","overline"].find(value => style.textDecorationLine.includes(value)) || "none";
     setBuiltInControlsEnabled(true);
     builtInText.disabled = !simpleText;
     builtInLinkUrl.disabled = tagName !== "a";
     builtInLinkTarget.disabled = tagName !== "a";
     builtInImageSrc.disabled = tagName !== "img";
     builtInImageAlt.disabled = tagName !== "img";
     builtInImageWidth.disabled = tagName !== "img";
     builtInImageFit.disabled = tagName !== "img";
     builtInImagePosition.disabled = tagName !== "img";
     builtInStatus.textContent = "Selected: " + node.tagName.toLowerCase() + " · " + selector;
   let builtInPosition = {x:0,y:0,width:100};
   let builtInCanvasOverlay = null;
   function removeBuiltInCanvasOverlay() { if (builtInCanvasOverlay) builtInCanvasOverlay.remove(); builtInCanvasOverlay = null; }
   function updateBuiltInCanvasOverlay() {
     if (!selectedBuiltInNode?.isConnected || !builtInCanvasOverlay) return;
     const rect = selectedBuiltInNode.getBoundingClientRect();
     builtInCanvasOverlay.style.left = rect.left + "px"; builtInCanvasOverlay.style.top = rect.top + "px";
     builtInCanvasOverlay.style.width = rect.width + "px"; builtInCanvasOverlay.style.height = rect.height + "px";
   }
   function makeBuiltInCanvasOverlay(node) {
     removeBuiltInCanvasOverlay();
     const doc = websitePreview.contentDocument, overlay = doc.createElement("div");
     overlay.setAttribute("aria-label","Selected element move and resize frame");
     overlay.style.cssText="position:fixed;z-index:2147483000;border:2px dashed #c9f36a;box-sizing:border-box;pointer-events:none;touch-action:none;";
     const grip=doc.createElement("button");grip.type="button";grip.setAttribute("aria-label","Resize selected element");
     grip.style.cssText="position:absolute;right:-9px;bottom:-9px;width:18px;height:18px;border:2px solid #15202a;border-radius:4px;background:#c9f36a;padding:0;pointer-events:auto;touch-action:none;cursor:nwse-resize;";
     const move=doc.createElement("div");move.title="Drag to move";move.style.cssText="position:absolute;inset:0;pointer-events:auto;cursor:move;touch-action:none;background:transparent;";
     overlay.append(move,grip);doc.body.append(overlay);builtInCanvasOverlay=overlay;updateBuiltInCanvasOverlay();
     let moving=false,resizing=false,startX=0,startY=0,startLeft=0,startTop=0,startWidth=0,startHeight=0;
     const parent=node.parentElement;
     move.addEventListener("pointerdown",ev=>{moving=true;startX=ev.clientX;startY=ev.clientY;const r=node.getBoundingClientRect();startLeft=r.left;startTop=r.top;move.setPointerCapture(ev.pointerId);ev.preventDefault();});
     move.addEventListener("pointermove",ev=>{if(!moving)return;overlay.style.left=(startLeft+ev.clientX-startX)+"px";overlay.style.top=(startTop+ev.clientY-startY)+"px";});
     const stopMove=()=>{if(!moving)return;moving=false;const parentRect=parent.getBoundingClientRect(),r=node.getBoundingClientRect(),or=overlay.getBoundingClientRect();builtInPosition.x=Math.round((or.left-r.left)/Math.max(1,parentRect.width)*10000)/100;builtInPosition.y=Math.round((or.top-r.top)/Math.max(1,parentRect.height)*10000)/100;node.style.position="relative";node.style.left=builtInPosition.x+"%";node.style.top=builtInPosition.y+"%";updateBuiltInCanvasOverlay();builtInStatus.textContent="Position adjusted in preview. Tap Save selected element to publish.";};
     move.addEventListener("pointerup",stopMove);move.addEventListener("pointercancel",stopMove);
     grip.addEventListener("pointerdown",ev=>{resizing=true;startX=ev.clientX;startWidth=overlay.getBoundingClientRect().width;grip.setPointerCapture(ev.pointerId);ev.preventDefault();ev.stopPropagation();});
     grip.addEventListener("pointermove",ev=>{if(!resizing)return;const width=Math.max(30,startWidth+ev.clientX-startX);overlay.style.width=width+"px";});
     const stopResize=()=>{if(!resizing)return;resizing=false;const parentRect=parent.getBoundingClientRect();builtInPosition.width=Math.max(5,Math.min(100,Math.round(overlay.getBoundingClientRect().width/Math.max(1,parentRect.width)*10000)/100));node.style.width=builtInPosition.width+"%";updateBuiltInCanvasOverlay();builtInStatus.textContent="Width adjusted in preview. Tap Save selected element to publish.";};
     grip.addEventListener("pointerup",stopResize);grip.addEventListener("pointercancel",stopResize);
     doc.addEventListener("scroll",updateBuiltInCanvasOverlay,true);
     doc.defaultView.addEventListener("resize",updateBuiltInCanvasOverlay);
   }
     const savedSettings = themeSettings.__visualOverrides?.[selector] || {};
     const savedPosition = previewMode === "mobile" ? (savedSettings.positionMobile || savedSettings.position) : (savedSettings.positionDesktop || savedSettings.position);
     builtInPosition = savedPosition && typeof savedPosition === "object"
       ? {x:Math.max(-100,Math.min(100,Number(savedPosition.x)||0)),y:Math.max(-100,Math.min(100,Number(savedPosition.y)||0)),width:Math.max(5,Math.min(100,Number(savedPosition.width)||100))}
       : {x:0,y:0,width:100};
     if (savedPosition) {
       node.style.position = "relative"; node.style.left = builtInPosition.x + "%";
       node.style.top = builtInPosition.y + "%"; node.style.width = builtInPosition.width + "%";
     }
     makeBuiltInCanvasOverlay(node);
   }
   [builtInText,builtInFontSize,builtInRadius,builtInTextColor,builtInBgColor,builtInFontWeight,builtInTextAlign,builtInLetterSpacing,builtInOpacity,builtInBorderWidth,builtInBorderColor,builtInLineHeight,builtInTextDecoration,builtInLinkUrl,builtInImageSrc,builtInImageAlt,builtInImageWidth,builtInImageFit,builtInImagePosition,builtInLinkTarget].forEach(control => { control.addEventListener("input",updateBuiltInPreview); control.addEventListener("change",updateBuiltInPreview); });
   builtInSave.addEventListener("click",async()=>{
     if(!selectedBuiltInSelector||!selectedBuiltInNode)return;
     const tagName=selectedBuiltInNode.tagName.toLowerCase(); const value={elementType:tagName,...(builtInText.disabled?{}:{text:builtInText.value.slice(0,500)}),...(tagName==="a"?{linkUrl:builtInLinkUrl.value.trim(),linkTarget:builtInLinkTarget.value}:{}),...(tagName==="img"?{imageFit:builtInImageFit.value,imagePosition:builtInImagePosition.value,imageSrc:builtInImageSrc.value.trim(),imageAlt:builtInImageAlt.value.slice(0,240),imageWidth:Math.max(20,Math.min(2000,Number(builtInImageWidth.value)||600))}:{}),fontSize:Math.max(10,Math.min(120,Number(builtInFontSize.value)||24)),radius:Math.max(0,Math.min(100,Number(builtInRadius.value)||0)),color:builtInTextColor.value,background:builtInBgColor.value,fontWeight:builtInFontWeight.value,textAlign:builtInTextAlign.value,letterSpacing:Math.max(-2,Math.min(20,Number(builtInLetterSpacing.value)||0)),opacity:Math.max(10,Math.min(100,Number(builtInOpacity.value)||100)),borderWidth:Math.max(0,Math.min(20,Number(builtInBorderWidth.value)||0)),borderColor:builtInBorderColor.value,lineHeight:Math.max(0.8,Math.min(3,Number(builtInLineHeight.value)||1.2)),textDecoration:builtInTextDecoration.value,...(previewMode==="mobile"?(themeSettings.__visualOverrides?.[selectedBuiltInSelector]||{}):{}),position:builtInPosition,...(previewMode==="mobile"?{positionMobile:builtInPosition,styleMobile:{fontSize:Math.max(10,Math.min(120,Number(builtInFontSize.value)||24)),radius:Math.max(0,Math.min(100,Number(builtInRadius.value)||0)),color:builtInTextColor.value,background:builtInBgColor.value,fontWeight:Number(builtInFontWeight.value),textAlign:builtInTextAlign.value,letterSpacing:Math.max(-2,Math.min(20,Number(builtInLetterSpacing.value)||0)),opacity:Math.max(10,Math.min(100,Number(builtInOpacity.value)||100)),borderWidth:Math.max(0,Math.min(20,Number(builtInBorderWidth.value)||0)),borderColor:builtInBorderColor.value,lineHeight:Math.max(0.8,Math.min(3,Number(builtInLineHeight.value)||1.2)),textDecoration:builtInTextDecoration.value,...(tagName==="img"?{imageWidth:Math.max(20,Math.min(2000,Number(builtInImageWidth.value)||600)),imageFit:builtInImageFit.value,imagePosition:builtInImagePosition.value}:{})}}:{positionDesktop:builtInPosition})};
     builtInSave.disabled=true;builtInStatus.textContent="Saving selected element…";
     try{
       const {data,error:readError}=await client.from("portfolio_theme_settings").select("settings").eq("id",true).maybeSingle();
       if(readError)throw readError;
       const latest=data?.settings||themeSettings||{},overrides={...(latest.__visualOverrides||{}),[selectedBuiltInSelector]:value},next={...latest,__visualOverrides:overrides};
       const {error}=await client.from("portfolio_theme_settings").upsert({id:true,settings:next,updated_at:new Date().toISOString()},{onConflict:"id"});
       if(error)throw error;themeSettings=next;builtInStatus.textContent="Saved and published. Refresh the public portfolio to see the changes.";
     }catch(error){builtInStatus.textContent="Could not save: "+(error.message||"Please try again.");}
     finally{builtInSave.disabled=false;}
   });
   builtInReset.addEventListener("click",async()=>{
     if(!selectedBuiltInSelector)return;builtInReset.disabled=true;removeBuiltInCanvasOverlay();
     try{
       const {data,error:readError}=await client.from("portfolio_theme_settings").select("settings").eq("id",true).maybeSingle();
       if(readError)throw readError;
       const latest=data?.settings||themeSettings||{},overrides={...(latest.__visualOverrides||{})};delete overrides[selectedBuiltInSelector];
       const next={...latest,__visualOverrides:overrides};
       const {error}=await client.from("portfolio_theme_settings").upsert({id:true,settings:next,updated_at:new Date().toISOString()},{onConflict:"id"});
       if(error)throw error;themeSettings=next;builtInStatus.textContent="Override reset. Refresh the public preview.";
       if(websitePreview.contentDocument?.readyState==="complete")refreshWebsitePreview();
     }catch(error){builtInStatus.textContent="Could not reset: "+(error.message||"Please try again.");}
     finally{builtInReset.disabled=false;}
   });

   function refreshWebsitePreview() {
    let doc;
    try { doc = websitePreview.contentDocument; } catch { return; }
    if (!doc || !doc.body) return;
    // Let the owner select an already-published custom layer directly in the same-origin preview.
    if (doc.documentElement.dataset.ownerLayerSelectionReady !== "true") {
      const selectionStyle = doc.createElement("style");
      selectionStyle.textContent = ".owner-added-element[data-element-id]{cursor:pointer;outline:1px dashed transparent;outline-offset:4px;transition:outline-color .15s ease}.owner-added-element[data-element-id]:hover{outline-color:#c9f36a}";
      doc.head.append(selectionStyle);
      doc.addEventListener("click", event => {
         const builtIn = event.target.closest("h1,h2,h3,h4,p,button,a[href],img");
         if (builtIn && !builtIn.closest(".owner-added-element,.owner-custom-section") && !(builtIn.tagName.toLowerCase()==="a" && builtIn.closest("button"))) {
           event.preventDefault(); event.stopPropagation(); selectBuiltInPreviewNode(builtIn); return;
         }

        const layer = event.target.closest(".owner-added-element[data-element-id]");
        if (!layer) return;
        const id = layer.dataset.elementId;
        if (getCustomElements().some(item => item.id === id && item.locked)) {
          event.preventDefault(); event.stopPropagation();
          $("#element-upload-status").textContent = "This layer is locked. Unlock it in the layer list to edit.";
          return;
        }
        const card = document.querySelector('#custom-element-list [data-element-id="' + CSS.escape(id) + '"]');
        const editButton = card && Array.from(card.querySelectorAll("button")).find(button => button.textContent.trim() === "Edit");
        if (!editButton) return;
        event.preventDefault();
        event.stopPropagation();
        editButton.click();
        $("#element-upload-status").textContent = "Selected layer from the website preview. Edit its settings in the Adjustment Panel.";
      }, true);
      doc.documentElement.dataset.ownerLayerSelectionReady = "true";
    }
    doc.querySelectorAll(".owner-added-element[data-owner-edit-dimmed]").forEach(el => { el.style.opacity = el.dataset.ownerOriginalOpacity || ""; delete el.dataset.ownerOriginalOpacity; delete el.dataset.ownerEditDimmed; });
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
    const previewColor=$("#element-color").value||"#c9f36a", previewRotation=Math.max(-180,Math.min(180,Number($("#element-rotation").value)||0)), previewOpacity=Math.max(10,Math.min(100,Number($("#element-opacity").value)||100)), previewRadius=Math.max(0,Math.min(200,Number($("#element-radius").value)||0)), previewBorder=Math.max(0,Math.min(10,Number($("#element-border-width").value)||0)), previewShadow=$("#element-shadow").value; const previewShadowCss=({none:"none",soft:"0 8px 24px #0009",glow:"0 0 22px "+previewColor+"99",deep:"0 16px 40px #000"})[previewShadow]||"none"; const initialPosition = activePreviewPosition(); previewMarker.style.cssText = "box-sizing:border-box;position:absolute;z-index:99999;left:"+clampPercent(initialPosition.x)+"%;top:"+clampPercent(initialPosition.y)+"%;transform:translate(-50%,-50%) rotate("+previewRotation+"deg);width:min("+Math.max(10,Math.min(100,Number(initialPosition.width)||80))+"%,100%);min-height:36px;padding:8px 18px 8px 8px;border:"+previewBorder+"px dashed "+previewColor+";border-radius:"+previewRadius+"px;box-shadow:"+previewShadowCss+";opacity:"+(previewOpacity/100)+";background:#08090ddd;text-align:center;cursor:move;touch-action:none;overflow-wrap:anywhere;color:"+previewColor+";";
    const kind = elementKind.value, content = $("#element-content").value.trim(), url = $("#element-url").value.trim();
    if (kind === "text") previewMarker.textContent = content || "Your element";
    else if (kind === "image" && url) { const img = doc.createElement("img"); img.src = url; img.alt = ""; img.style.cssText = "display:block;width:100%;max-height:30vh;object-fit:contain"; previewMarker.append(img); }
    else previewMarker.textContent = kind === "video" ? "▶ Video / motion graphic" : "Image / graphic";
    const alignmentGuides = doc.createElement("div");
    alignmentGuides.className = "owner-editor-alignment-guides";
    alignmentGuides.style.cssText = "position:absolute;inset:0;z-index:99998;pointer-events:none;display:none;";
    const verticalGuide = doc.createElement("span"), horizontalGuide = doc.createElement("span");
    verticalGuide.style.cssText = "position:absolute;top:0;bottom:0;border-left:1px dashed #c9f36a;left:50%;";
    horizontalGuide.style.cssText = "position:absolute;left:0;right:0;border-top:1px dashed #c9f36a;top:50%;";
    alignmentGuides.append(verticalGuide,horizontalGuide);
    if(getComputedStyle(previewTarget).position==="static")previewTarget.style.position="relative";
    previewTarget.append(alignmentGuides,previewMarker);
    if (editingElementId) {
      const original = Array.from(doc.querySelectorAll(".owner-added-element[data-element-id]")).find(el => el.dataset.elementId === editingElementId);
      if (original) { original.dataset.ownerOriginalOpacity = original.style.opacity; original.dataset.ownerEditDimmed = "true"; original.style.opacity = "0.18"; }
    }
    const resizeGrip = doc.createElement("button");
    resizeGrip.type = "button"; resizeGrip.setAttribute("aria-label","Resize element"); resizeGrip.title = "Drag to resize";
    resizeGrip.style.cssText = "position:absolute;right:-7px;bottom:-7px;width:18px;height:18px;border:2px solid #08090d;border-radius:3px;background:#c9f36a;cursor:nwse-resize;touch-action:none;padding:0;";
    previewMarker.append(resizeGrip);
    let resizing = false, resizeStartX = 0, resizeStartWidth = 80;
    resizeGrip.addEventListener("pointerdown", ev => { resizing=true; resizeStartX=ev.clientX; resizeStartWidth=Math.max(10,Math.min(100,Number(activePreviewPosition().width)||80)); resizeGrip.setPointerCapture(ev.pointerId); ev.stopPropagation(); ev.preventDefault(); });
    resizeGrip.addEventListener("pointermove", ev => { if (!resizing || !previewTarget) return; const rect=previewTarget.getBoundingClientRect(); const next=Math.max(10,Math.min(100,resizeStartWidth+(ev.clientX-resizeStartX)/rect.width*100)); if(previewMode === "mobile"){ $("#element-mobile-enabled").checked=true; $("#element-mobile-fields").classList.remove("hidden"); $("#element-mobile-width").value=Math.round(next); } else { $("#element-width").value=Math.round(next); } previewMarker.style.width="min("+next+"%,100%)"; updatePositionPreview(); });
    const stopResize=()=>{if(resizing){resizing=false;recordPositionHistory();}}; resizeGrip.addEventListener("pointerup",stopResize); resizeGrip.addEventListener("pointercancel",stopResize);
    previewMarker.addEventListener("pointerdown", ev => { if (ev.target === resizeGrip) return; previewDrag = true; previewMarker.setPointerCapture(ev.pointerId); ev.preventDefault(); });
    previewMarker.addEventListener("pointermove", ev => { if (!previewDrag || !previewTarget || !previewMarker) return; const rect = previewTarget.getBoundingClientRect(); let x=(ev.clientX-rect.left)/rect.width*100; let y=(ev.clientY-rect.top)/rect.height*100;
      const snapToGuide = value => { const guides=[0,10,25,50,75,90,100]; const nearest=guides.reduce((best,point)=>Math.abs(value-point)<Math.abs(value-best)?point:best,guides[0]); return Math.abs(value-nearest)<=1.8?nearest:null; };
      const guideX=snapToGuide(x), guideY=snapToGuide(y), snappedX=guideX!==null, snappedY=guideY!==null;
      if(snappedX)x=guideX; if(snappedY)y=guideY; x=clampPercent(x); y=clampPercent(y);
      if(previewMode === "mobile"){ $("#element-mobile-enabled").checked=true; $("#element-mobile-fields").classList.remove("hidden"); $("#element-mobile-x").value=Math.round(x); $("#element-mobile-y").value=Math.round(y); } else { elementX.value=Math.round(x); elementY.value=Math.round(y); }
      previewMarker.style.left=x+"%"; previewMarker.style.top=y+"%";
      verticalGuide.style.left=(snappedX?guideX:50)+"%"; horizontalGuide.style.top=(snappedY?guideY:50)+"%";
      verticalGuide.style.display=snappedX?"block":"none"; horizontalGuide.style.display=snappedY?"block":"none";
      alignmentGuides.style.display=(snappedX||snappedY)?"block":"none"; updatePositionPreview(); });
    const stop = () => { if(previewDrag){previewDrag=false;alignmentGuides.style.display="none";recordPositionHistory();} }; previewMarker.addEventListener("pointerup",stop); previewMarker.addEventListener("pointercancel",stop);
    $("#element-upload-status").textContent = editingElementId ? "Editing saved layer: drag the marker or its corner handle, then tap Update element to publish." : "Preview ready. Drag the dashed marker on the website to set its position.";
  }
  websitePreview.addEventListener("load", () => window.setTimeout(refreshWebsitePreview, 600));
  $("#refresh-element-preview").addEventListener("click", refreshWebsitePreview);
  $("#element-target").addEventListener("change", () => window.setTimeout(refreshWebsitePreview, 250));
  $("#element-custom-target").addEventListener("change", () => window.setTimeout(refreshWebsitePreview, 250));
  [elementKind,$("#element-content"),$("#element-url"),$("#element-width"),$("#element-color"),$("#element-rotation"),$("#element-opacity"),$("#element-radius"),$("#element-border-width"),$("#element-shadow"),elementOverlay,$("#element-layer")].forEach(el => el.addEventListener("change", () => { if (websitePreview.contentDocument && websitePreview.contentDocument.readyState === "complete") refreshWebsitePreview(); }));
  function getCustomElements() { return Array.isArray(themeSettings.__elements) ? themeSettings.__elements : []; }
  const selectedCustomLayerIds = new Set();
  function renderCustomElements() {
    const list = $("#custom-element-list"), items = getCustomElements();
    list.replaceChildren();
    const selectedIds = new Set(items.filter(item => selectedCustomLayerIds.has(item.id)).map(item => item.id));
    selectedCustomLayerIds.clear(); selectedIds.forEach(id => selectedCustomLayerIds.add(id));
    if (items.length) {
      const bulk = document.createElement("div"); bulk.className = "custom-layer-bulk-tools";
      const selectAll = document.createElement("button"); selectAll.type = "button"; selectAll.className = "quiet-button"; selectAll.textContent = selectedCustomLayerIds.size === items.length ? "Clear selection" : "Select all";
      selectAll.addEventListener("click", () => { if (selectedCustomLayerIds.size === items.length) selectedCustomLayerIds.clear(); else items.forEach(item => selectedCustomLayerIds.add(item.id)); renderCustomElements(); });
      const count = document.createElement("span"); count.className = "field-help"; count.textContent = selectedCustomLayerIds.size + " selected";
      const bulkVisibility = document.createElement("button"); bulkVisibility.type = "button"; bulkVisibility.className = "quiet-button"; bulkVisibility.textContent = "Hide selected"; bulkVisibility.disabled = selectedCustomLayerIds.size === 0;
      bulkVisibility.addEventListener("click", async () => { const current = getCustomElements().map(item => selectedCustomLayerIds.has(item.id) ? { ...item, hidden: true } : item); bulkVisibility.disabled = true; if (await saveCustomElements(current)) themeNotice("Selected layers hidden. Save & publish to apply."); else bulkVisibility.disabled = false; });
      const bulkShow = document.createElement("button"); bulkShow.type = "button"; bulkShow.className = "quiet-button"; bulkShow.textContent = "Show selected"; bulkShow.disabled = selectedCustomLayerIds.size === 0;
      bulkShow.addEventListener("click", async () => { const current = getCustomElements().map(item => selectedCustomLayerIds.has(item.id) ? { ...item, hidden: false } : item); bulkShow.disabled = true; if (await saveCustomElements(current)) themeNotice("Selected layers made visible. Save & publish to apply."); else bulkShow.disabled = false; });
      const bulkLock = document.createElement("button"); bulkLock.type = "button"; bulkLock.className = "quiet-button"; bulkLock.textContent = "Lock selected"; bulkLock.disabled = selectedCustomLayerIds.size === 0;
      bulkLock.addEventListener("click", async () => { const current = getCustomElements().map(item => selectedCustomLayerIds.has(item.id) ? { ...item, locked: true } : item); bulkLock.disabled = true; if (await saveCustomElements(current)) themeNotice("Selected layers locked."); else bulkLock.disabled = false; });
      const bulkUnlock = document.createElement("button"); bulkUnlock.type = "button"; bulkUnlock.className = "quiet-button"; bulkUnlock.textContent = "Unlock selected"; bulkUnlock.disabled = selectedCustomLayerIds.size === 0;
      bulkUnlock.addEventListener("click", async () => { const current = getCustomElements().map(item => selectedCustomLayerIds.has(item.id) ? { ...item, locked: false } : item); bulkUnlock.disabled = true; if (await saveCustomElements(current)) themeNotice("Selected layers unlocked."); else bulkUnlock.disabled = false; });
      const nudgeGroup = async (dx,dy,label) => {
        if (!selectedCustomLayerIds.size) return;
        if (items.some(item => selectedCustomLayerIds.has(item.id) && item.locked)) return themeNotice("Unlock selected layers before moving them.", true);
        const shift = (value,delta) => clampPercent((Number(value) || 50) + delta);
        const current = getCustomElements().map(item => {
          if (!selectedCustomLayerIds.has(item.id)) return item;
          const moved = { ...item, x:shift(item.x,dx), y:shift(item.y,dy) };
          if (item.mobile) moved.mobile = { ...item.mobile, x:shift(item.mobile.x,dx), y:shift(item.mobile.y,dy) };
          return moved;
        });
        if (await saveCustomElements(current)) themeNotice("Selected layers moved " + label + ". Desktop and mobile positions updated.");
      };
      const groupMove = document.createElement("div"); groupMove.className = "custom-layer-group-move";
      const groupMoveLabel = document.createElement("span"); groupMoveLabel.className = "field-help"; groupMoveLabel.textContent = "Move selected";
      const moveLeft = document.createElement("button"); moveLeft.type = "button"; moveLeft.className = "quiet-button"; moveLeft.textContent = "←"; moveLeft.title = "Move selected layers left 1%"; moveLeft.disabled = selectedCustomLayerIds.size === 0;
      moveLeft.addEventListener("click", () => nudgeGroup(-1,0,"left"));
      const moveRight = document.createElement("button"); moveRight.type = "button"; moveRight.className = "quiet-button"; moveRight.textContent = "→"; moveRight.title = "Move selected layers right 1%"; moveRight.disabled = selectedCustomLayerIds.size === 0;
      moveRight.addEventListener("click", () => nudgeGroup(1,0,"right"));
      const moveUpGroup = document.createElement("button"); moveUpGroup.type = "button"; moveUpGroup.className = "quiet-button"; moveUpGroup.textContent = "↑"; moveUpGroup.title = "Move selected layers up 1%"; moveUpGroup.disabled = selectedCustomLayerIds.size === 0;
      moveUpGroup.addEventListener("click", () => nudgeGroup(0,-1,"up"));
      const moveDownGroup = document.createElement("button"); moveDownGroup.type = "button"; moveDownGroup.className = "quiet-button"; moveDownGroup.textContent = "↓"; moveDownGroup.title = "Move selected layers down 1%"; moveDownGroup.disabled = selectedCustomLayerIds.size === 0;
      moveDownGroup.addEventListener("click", () => nudgeGroup(0,1,"down"));
      groupMove.append(groupMoveLabel,moveLeft,moveRight,moveUpGroup,moveDownGroup);
      const bulkDelete = document.createElement("button"); bulkDelete.type = "button"; bulkDelete.className = "quiet-button"; bulkDelete.textContent = "Delete selected"; bulkDelete.disabled = selectedCustomLayerIds.size === 0 || items.some(item => selectedCustomLayerIds.has(item.id) && item.locked);
      bulkDelete.title = items.some(item => selectedCustomLayerIds.has(item.id) && item.locked) ? "Unlock selected layers before deleting" : "Remove all selected layers";
      bulkDelete.addEventListener("click", async () => {
        const chosen = getCustomElements().filter(item => selectedCustomLayerIds.has(item.id));
        if (!chosen.length) return;
        if (chosen.some(item => item.locked)) return themeNotice("Unlock selected layers before deleting them.", true);
        if (!window.confirm("Delete " + chosen.length + " selected layer(s)? This cannot be undone.")) return;
        const current = getCustomElements().filter(item => !selectedCustomLayerIds.has(item.id));
        bulkDelete.disabled = true;
        if (await saveCustomElements(current)) { selectedCustomLayerIds.clear(); themeNotice(chosen.length + " selected layer(s) deleted."); }
        else bulkDelete.disabled = false;
      });
      bulk.append(selectAll,count,bulkVisibility,bulkShow,bulkLock,bulkUnlock,bulkDelete); list.append(bulk,groupMove);
    }
    if (!items.length) { const p = document.createElement("p"); p.className = "empty-state"; p.textContent = "No custom elements added yet."; list.append(p); return; }
    items.forEach((item, index) => {
      const card = document.createElement("div"); card.className = "custom-element-item";
      card.dataset.elementId = item.id;
      card.classList.toggle("is-selected", item.id === editingElementId);
      card.classList.toggle("is-bulk-selected", selectedCustomLayerIds.has(item.id));
      const select = document.createElement("input"); select.type = "checkbox"; select.className = "custom-layer-select"; select.checked = selectedCustomLayerIds.has(item.id); select.setAttribute("aria-label", "Select layer for bulk actions");
      select.addEventListener("change", () => { if (select.checked) selectedCustomLayerIds.add(item.id); else selectedCustomLayerIds.delete(item.id); renderCustomElements(); });
      const info = document.createElement("div"); const strong = document.createElement("strong");
      strong.textContent = item.kind === "text" ? (item.content || "Text element") : (item.kind === "image" ? "Image / graphic" : "Video / motion graphic");
      const small = document.createElement("p"); small.textContent = item.target + " · " + item.placement + " · " + (item.animation || "no animation") + (item.hidden ? " · HIDDEN" : "") + (item.locked ? " · LOCKED" : "");
      info.append(strong,small);
      const actions = document.createElement("div"); actions.className = "custom-element-actions";
      const lock = document.createElement("button"); lock.type = "button"; lock.className = "quiet-button"; lock.textContent = item.locked ? "Unlock" : "Lock"; lock.title = item.locked ? "Unlock this layer for editing" : "Lock this layer to prevent accidental changes"; lock.setAttribute("aria-pressed", String(!!item.locked));
      lock.addEventListener("click", async () => {
        const current = getCustomElements().slice(), at = current.findIndex(x => x.id === item.id);
        if (at < 0) return;
        current[at] = { ...current[at], locked: !current[at].locked };
        lock.disabled = true;
        const saved = await saveCustomElements(current);
        if (!saved) lock.disabled = false;
        else themeNotice(current[at].locked ? "Layer locked. Unlock it before editing or moving." : "Layer unlocked and ready to edit.");
      });
      const visibility = document.createElement("button"); visibility.type = "button"; visibility.className = "quiet-button"; visibility.textContent = item.hidden ? "Show" : "Hide"; visibility.title = item.hidden ? "Show this layer on the public portfolio" : "Hide this layer on the public portfolio"; visibility.setAttribute("aria-pressed", String(!!item.hidden));
      visibility.addEventListener("click", async () => {
        const current = getCustomElements().slice(), at = current.findIndex(x => x.id === item.id);
        if (at < 0) return;
        current[at] = { ...current[at], hidden: !current[at].hidden };
        visibility.disabled = true;
        const saved = await saveCustomElements(current);
        if (!saved) visibility.disabled = false;
        else themeNotice(current[at].hidden ? "Layer hidden from the public portfolio. Save & publish to apply." : "Layer made visible. Save & publish to apply.");
      });
      const edit = document.createElement("button"); edit.type = "button"; edit.className = "quiet-button"; edit.textContent = "Edit";
      edit.addEventListener("click", () => {
        editingElementId = item.id;
        const adjustmentPanel = $("#adjustment-panel");
        if (adjustmentPanel) adjustmentPanel.open = true; $("#element-target").value = ["site","header","hero","hero-title","hero-media","work","project-cards","about","contact","footer"].includes(item.target) ? item.target : "custom";
        $("#element-custom-target-field").classList.toggle("hidden", $("#element-target").value !== "custom");
        if ($("#element-target").value === "custom") $("#element-custom-target").value = item.target;
        elementKind.value = item.kind; elementKind.dispatchEvent(new Event("change"));
        $("#element-content").value = item.content || ""; $("#element-url").value = item.url || "";
        $("#element-placement").value = item.placement || "center"; $("#element-width").value = item.width || 80; $("#element-layer").value = item.layer === "back" ? "back" : "front";
        $("#element-x").value = item.x ?? 50; $("#element-y").value = item.y ?? 50; $("#element-mobile-enabled").checked = !!item.mobile; $("#element-mobile-x").value = item.mobile?.x ?? 50; $("#element-mobile-y").value = item.mobile?.y ?? 50; $("#element-mobile-width").value = item.mobile?.width ?? 90; $("#element-mobile-fields").classList.toggle("hidden", !item.mobile); elementOverlay.checked = item.overlay !== false; updatePositionPreview();
        $("#element-animation").value = item.animation || "none"; $("#element-duration").value = item.duration || 6;
        $("#element-color").value = item.color || "#c9f36a"; $("#element-rotation").value = item.rotation ?? 0; $("#element-opacity").value = item.opacity ?? 100; $("#element-radius").value = item.radius ?? 0; $("#element-border-width").value = item.borderWidth ?? 0; $("#element-shadow").value = item.shadow || "none"; $("#add-element-button").textContent = "Update element";
        themeNotice("Editing element in Adjustment Panel · Advanced Mode. Make changes and tap Update element.");
        document.querySelector('[data-owner-section="adjustment-studio"]')?.click();
        // Show drag and resize handles for the selected saved layer; publishing still requires Update element.
        if (websitePreview.contentDocument?.readyState === "complete") refreshWebsitePreview();
         $("#adjustment-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      const moveUp = document.createElement("button"); moveUp.type = "button"; moveUp.className = "quiet-button layer-order-button"; moveUp.textContent = "↑"; moveUp.title = "Move layer forward"; moveUp.setAttribute("aria-label", "Move layer forward");
      moveUp.disabled = index === items.length - 1;
      moveUp.addEventListener("click", async () => {
        const current = getCustomElements().slice(), from = current.findIndex(x => x.id === item.id);
        if (from < 0 || from >= current.length - 1) return;
        [current[from], current[from + 1]] = [current[from + 1], current[from]];
        moveUp.disabled = true;
        const saved = await saveCustomElements(current);
        if (!saved) moveUp.disabled = false;
        else themeNotice("Layer moved forward. Refresh the public preview after publishing to review the new stacking order.");
      });
      const moveDown = document.createElement("button"); moveDown.type = "button"; moveDown.className = "quiet-button layer-order-button"; moveDown.textContent = "↓"; moveDown.title = "Move layer backward"; moveDown.setAttribute("aria-label", "Move layer backward");
      moveDown.disabled = index === 0;
      moveDown.addEventListener("click", async () => {
        const current = getCustomElements().slice(), from = current.findIndex(x => x.id === item.id);
        if (from <= 0) return;
        [current[from], current[from - 1]] = [current[from - 1], current[from]];
        moveDown.disabled = true;
        const saved = await saveCustomElements(current);
        if (!saved) moveDown.disabled = false;
        else themeNotice("Layer moved backward. Refresh the public preview after publishing to review the new stacking order.");
      });
      const duplicate = document.createElement("button"); duplicate.type = "button"; duplicate.className = "quiet-button"; duplicate.textContent = "Duplicate"; duplicate.title = "Create a copy of this element";
      duplicate.addEventListener("click", async () => {
        const current = getCustomElements().slice();
        if (current.length >= 30) return themeNotice("Maximum 30 custom elements. Remove one before duplicating.", true);
        const sourceItem = current.find(x => x.id === item.id);
        if (!sourceItem) return;
        const offset = value => clampPercent((Number(value) || 50) + 4);
        const copy = {
          ...sourceItem,
          id: crypto.randomUUID(),
          x: offset(sourceItem.x),
          y: offset(sourceItem.y),
          mobile: sourceItem.mobile ? {
            ...sourceItem.mobile,
            x: offset(sourceItem.mobile.x),
            y: offset(sourceItem.mobile.y)
          } : null
        };
        duplicate.disabled = true;
        const saved = await saveCustomElements([...current, copy]);
        if (saved) {
          editingElementId = copy.id;
          renderCustomElements();
          themeNotice("Element duplicated. The new copy is offset slightly so you can see and edit it independently.");
        } else duplicate.disabled = false;
      });
      const del = document.createElement("button"); del.type = "button"; del.className = "quiet-button"; del.textContent = "Remove";
      del.addEventListener("click", async () => {
        if (!window.confirm("Remove this custom element? This change will be saved to your theme settings.")) return;
        del.disabled = true;
        const saved = await saveCustomElements(getCustomElements().filter(x => x.id !== item.id));
        if (!saved) del.disabled = false;
      });
      if (item.locked) {
        edit.disabled = true; moveUp.disabled = true; moveDown.disabled = true; duplicate.disabled = true; del.disabled = true;
        edit.title = "Unlock this layer before editing";
        del.title = "Unlock this layer before removing";
      }
      actions.append(moveUp,moveDown,visibility,lock,edit,duplicate,del); card.append(select,info,actions); list.append(card);
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
    if (editingElementId && getCustomElements().some(item => item.id === editingElementId && item.locked)) return themeNotice("Unlock this layer before updating it.", true);
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
    const item = { id:editingElementId || crypto.randomUUID(), target, kind, content:content.slice(0,240), url, placement:$("#element-placement").value, width:Math.max(10,Math.min(100,Number($("#element-width").value)||80)), x:clampPercent(elementX.value), y:clampPercent(elementY.value), mobile:$("#element-mobile-enabled").checked ? { x:clampPercent($("#element-mobile-x").value), y:clampPercent($("#element-mobile-y").value), width:Math.max(10,Math.min(100,Number($("#element-mobile-width").value)||90)) } : null, overlay:elementOverlay.checked, layer:$("#element-layer").value, animation:$("#element-animation").value, duration:Math.max(.5,Math.min(30,Number($("#element-duration").value)||6)), color:$("#element-color").value, rotation:Math.max(-180,Math.min(180,Number($("#element-rotation").value)||0)), opacity:Math.max(10,Math.min(100,Number($("#element-opacity").value)||100)), radius:Math.max(0,Math.min(200,Number($("#element-radius").value)||0)), borderWidth:Math.max(0,Math.min(10,Number($("#element-border-width").value)||0)), shadow:["none","soft","glow","deep"].includes($("#element-shadow").value)?$("#element-shadow").value:"none" };
    const nextItems = editingElementId ? items.map(x => x.id === editingElementId ? item : x) : [...items,item];
    const saved = await saveCustomElements(nextItems);
    if (!saved) return;
    resetElementForm({ announce: false });
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
    $("#element-mobile-enabled").checked = false; $("#element-mobile-x").value = 50; $("#element-mobile-y").value = 50; $("#element-mobile-width").value = 90; $("#element-mobile-fields").classList.add("hidden");
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

  // SEO Studio stores site identity metadata in the same settings record as other studio panels.
  const seoForm = $("#seo-studio-form");
  if (seoForm) {
    const seoTitle = $("#seo-page-title"), seoDescription = $("#seo-description");
    const seoThemeColor = $("#seo-theme-color"), seoImage = $("#seo-social-image");
    const seoSocialTitle = $("#seo-social-title"), seoSocialDescription = $("#seo-social-description");
    const seoCount = $("#seo-description-count"), seoPreviewTitle = $("#seo-preview-title");
    const seoPreviewDescription = $("#seo-preview-description"), seoMessage = $("#seo-studio-message");
    const seoSaveButton = $("#save-seo-button");
    let savedSeo = {};
    const seoNotice = (message, isError = false) => setMessage(seoMessage, message, isError);
    const safeHttpUrl = value => {
      if (!value) return "";
      const url = new URL(value);
      if (!["https:", "http:"].includes(url.protocol)) throw new Error("Use a valid http(s) URL for the social image.");
      return url.href;
    };
    const seoValue = () => ({
      title: seoTitle.value.trim().slice(0,70),
      description: seoDescription.value.trim().slice(0,180),
      themeColor: /^#[0-9a-f]{6}$/i.test(seoThemeColor.value) ? seoThemeColor.value : "#0b0b0d",
      image: seoImage.value.trim(),
      socialTitle: seoSocialTitle.value.trim().slice(0,100),
      socialDescription: seoSocialDescription.value.trim().slice(0,200)
    });
    const paintSeoPreview = () => {
      const value = seoValue();
      seoCount.textContent = String(value.description.length);
      seoPreviewTitle.textContent = value.socialTitle || value.title || "Your website title";
      seoPreviewDescription.textContent = value.socialDescription || value.description || "Your website description will appear here.";
      $("#seo-preview").style.setProperty("--seo-preview-accent", value.themeColor);
    };
    const populateSeoForm = value => {
      seoTitle.value = value.title || document.title || "Zaid — Cinematic Video Editor";
      seoDescription.value = value.description || document.querySelector('meta[name="description"]')?.content || "";
      seoThemeColor.value = value.themeColor || document.querySelector('meta[name="theme-color"]')?.content || "#0b0b0d";
      seoImage.value = value.image || "";
      seoSocialTitle.value = value.socialTitle || "";
      seoSocialDescription.value = value.socialDescription || "";
      paintSeoPreview();
    };
    seoForm.addEventListener("input", paintSeoPreview);
    $("#preview-seo-button").addEventListener("click", () => { paintSeoPreview(); seoNotice("Preview refreshed. Save & publish to apply metadata to the public page."); });
    seoForm.addEventListener("submit", async event => {
      event.preventDefault();
      const value = seoValue();
      if (!value.title || !value.description) return seoNotice("Add a website title and description first.", true);
      try { value.image = safeHttpUrl(value.image); }
      catch (error) { return seoNotice(error.message, true); }
      seoSaveButton.disabled = true; seoNotice("Saving site identity settings…");
      try {
        const { data, error: readError } = await client.from("portfolio_theme_settings").select("settings").eq("id", true).maybeSingle();
        if (readError) throw readError;
        const allSettings = data?.settings || {};
        const { error } = await client.from("portfolio_theme_settings").upsert({
          id: true, settings: { ...allSettings, __siteSeo: value }, updated_at: new Date().toISOString()
        }, { onConflict: "id" });
        if (error) throw error;
        savedSeo = value; paintSeoPreview();
        seoNotice("SEO settings saved. Refresh your public portfolio to see the browser metadata update.");
      } catch (error) { seoNotice("Could not save SEO settings: " + (error.message || "Please try again."), true); }
      finally { seoSaveButton.disabled = false; }
    });
    $("#reset-seo-button").addEventListener("click", async () => {
      if (!window.confirm("Reset the saved SEO settings and return to the default page metadata?")) return;
      try {
        const { data, error: readError } = await client.from("portfolio_theme_settings").select("settings").eq("id", true).maybeSingle();
        if (readError) throw readError;
        const next = { ...(data?.settings || {}) }; delete next.__siteSeo;
        const { error } = await client.from("portfolio_theme_settings").upsert({ id: true, settings: next, updated_at: new Date().toISOString() }, { onConflict: "id" });
        if (error) throw error;
        savedSeo = {}; populateSeoForm({});
        seoNotice("SEO settings reset. Refresh the public portfolio to restore default metadata.");
      } catch (error) { seoNotice("Could not reset SEO settings: " + (error.message || "Please try again."), true); }
    });
    (async () => {
      try {
        const { data, error } = await client.from("portfolio_theme_settings").select("settings").eq("id", true).maybeSingle();
        if (error) throw error;
        savedSeo = data?.settings?.__siteSeo || {};
      } catch { savedSeo = {}; }
      populateSeoForm(savedSeo);
    })();
  }

  // Backup & Restore: export saved theme settings and the project library as one JSON file.
  const backupDownloadButton = $("#download-backup-button");
  const backupFileInput = $("#backup-file-input");
  const restoreBackupButton = $("#restore-backup-button");
  const backupFileName = $("#backup-file-name");
  const backupMessage = $("#backup-studio-message");
  let stagedBackup = null;
  const backupNotice = (value, isError = false) => setMessage(backupMessage, value, isError);
  const validBackup = value => Boolean(value && value.format === "zaid-portfolio-backup" && value.version === 1 &&
    value.settings && typeof value.settings === "object" && !Array.isArray(value.settings) &&
    Array.isArray(value.projects) && value.projects.every(project => project && typeof project === "object" &&
      typeof project.title === "string" && ["long", "short"].includes(project.project_type) &&
      typeof project.video_url === "string"));
  backupDownloadButton?.addEventListener("click", async () => {
    backupDownloadButton.disabled = true;
    backupNotice("Preparing your backup…");
    try {
      const [settingsResult, projectsResult] = await Promise.all([
        client.from("portfolio_theme_settings").select("settings").eq("id", true).maybeSingle(),
        client.from("portfolio_projects").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false })
      ]);
      if (settingsResult.error) throw settingsResult.error;
      if (projectsResult.error) throw projectsResult.error;
      const payload = {
        format: "zaid-portfolio-backup",
        version: 1,
        exportedAt: new Date().toISOString(),
        settings: settingsResult.data?.settings || {},
        projects: projectsResult.data || []
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "zaid-portfolio-backup-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.append(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
      backupNotice("Backup downloaded successfully. Store it somewhere safe.");
    } catch (error) {
      backupNotice("Could not create backup: " + (error.message || "Please try again."), true);
    } finally { backupDownloadButton.disabled = false; }
  });
  backupFileInput?.addEventListener("change", async () => {
    stagedBackup = null;
    restoreBackupButton.disabled = true;
    const file = backupFileInput.files?.[0];
    backupFileName.textContent = file ? file.name : "No backup file selected.";
    if (!file) { backupNotice(""); return; }
    if (file.size > 10 * 1024 * 1024) {
      backupNotice("Backup file must be 10 MB or smaller.", true);
      return;
    }
    try {
      const parsed = JSON.parse(await file.text());
      if (!validBackup(parsed)) throw new Error("This file is not a supported Zaid Portfolio backup.");
      stagedBackup = parsed;
      restoreBackupButton.disabled = false;
      backupNotice("Backup validated: " + parsed.projects.length + " project(s), exported " + (parsed.exportedAt || "date unknown") + ".");
    } catch (error) {
      backupNotice("Could not read backup: " + (error.message || "Choose a valid JSON backup."), true);
    }
  });
  restoreBackupButton?.addEventListener("click", async () => {
    if (!stagedBackup || !validBackup(stagedBackup)) return backupNotice("Choose a valid backup file first.", true);
    const count = stagedBackup.projects.length;
    if (!window.confirm("Restore settings and merge " + count + " project(s)? Saved settings will be replaced. Existing projects not in this backup will NOT be deleted.")) return;
    restoreBackupButton.disabled = true;
    backupNotice("Restoring backup…");
    try {
      if (stagedBackup.projects.length) {
        const { error } = await client.from("portfolio_projects").upsert(stagedBackup.projects, { onConflict: "id" });
        if (error) throw error;
      }
      const { error: settingsError } = await client.from("portfolio_theme_settings").upsert({
        id: true, settings: stagedBackup.settings, updated_at: new Date().toISOString()
      }, { onConflict: "id" });
      if (settingsError) throw settingsError;
      await loadProjects();
      backupNotice("Backup restored. Refresh the public portfolio to view restored settings.");
    } catch (error) {
      backupNotice("Restore did not finish: " + (error.message || "Please check the file and try again."), true);
    } finally { restoreBackupButton.disabled = !stagedBackup; }
  });

  logoutButton.addEventListener("click", async () => { recoveryMode = false; await client.auth.signOut(); showLogin(); setMessage(message, "You have signed out."); });
  checkSession();
})();