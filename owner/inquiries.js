(() => {
  "use strict";
  const SUPABASE_URL = "https://rtaedoseedjwljixmrgy.supabase.co";
  const SUPABASE_PUBLIC_KEY = "sb_publishable__Oc_xT1AELiVIQgCgXytTQ_qxLd_ZFo";
  const OWNER_EMAIL = "mohammadzaid143212@gmail.com";
  const $ = (selector, root = document) => root.querySelector(selector);
  if (!window.supabase) return;
  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
  let initialized = false, loading = false, inquiries = [];
  const statuses = [
    ["new", "New"],
    ["contacted", "Contacted"],
    ["in_progress", "In progress"],
    ["completed", "Completed"]
  ];
  const statusLabel = value => statuses.find(item => item[0] === value)?.[1] || "New";
  function message(value, isError = false) {
    const node = $("#inquiry-inbox-message");
    if (node) { node.textContent = value; node.classList.toggle("error", isError); }
  }
  function addText(parent, tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = value == null ? "" : String(value);
    parent.append(node);
    return node;
  }
  function buildPanel() {
    const dashboard = $("#dashboard-view"), sidebar = $(".owner-sidebar");
    if (!dashboard || !sidebar || $("#client-inquiries")) return;
    const link = document.createElement("a");
    link.className = "sidebar-link";
    link.href = "#client-inquiries";
    link.dataset.ownerSection = "client-inquiries";
    link.innerHTML = '<span class="sidebar-icon">✉</span><span>Client Inquiries</span>';
    const aiInboxLink = sidebar.querySelector('[data-owner-section="ai-inbox"]');
    const performanceLink = sidebar.querySelector('[data-owner-section="performance-studio"]');
    (aiInboxLink || performanceLink || sidebar.lastElementChild)?.after(link);
    const panel = document.createElement("section");
    panel.id = "client-inquiries";
    panel.className = "manager-card studio-slide";
    panel.hidden = true;
    const heading = document.createElement("div");
    heading.className = "manager-heading";
    const headingInner = document.createElement("div");
    addText(headingInner, "p", "eyebrow", "WORKSPACE / CLIENT RELATIONS");
    addText(headingInner, "h2", "", "Client Inquiries");
    addText(headingInner, "p", "manager-intro", "Review project requests submitted through the public contact form and track their progress.");
    heading.append(headingInner);
    const toolbar = document.createElement("div");
    toolbar.className = "form-actions";
    const filter = document.createElement("select");
    filter.id = "inquiry-status-filter";
    filter.setAttribute("aria-label", "Filter inquiries by status");
    [["all", "All inquiries"], ...statuses].forEach(([value, label]) => {
      const option = document.createElement("option"); option.value = value; option.textContent = label; filter.append(option);
    });
    const refresh = document.createElement("button");
    refresh.type = "button"; refresh.className = "quiet-button"; refresh.id = "refresh-client-inquiries"; refresh.textContent = "Refresh ↻";
    toolbar.append(filter, refresh);
    const stats = document.createElement("div");
    stats.className = "stats";
    [["inquiry-total", "TOTAL"], ["inquiry-new", "NEW"], ["inquiry-active", "IN PROGRESS"], ["inquiry-done", "COMPLETED"]].forEach(([id, label]) => {
      const card = document.createElement("article"); card.className = "stat-card";
      addText(card, "span", "", label); addText(card, "strong", "", "0").id = id; stats.append(card);
    });
    const notice = document.createElement("p"); notice.id = "inquiry-inbox-message"; notice.className = "notice"; notice.setAttribute("role", "status"); notice.setAttribute("aria-live", "polite");
    const list = document.createElement("div"); list.id = "client-inquiry-list"; list.className = "project-list";
    panel.append(heading, toolbar, stats, notice, list);
    dashboard.append(panel);
    refresh.addEventListener("click", loadInquiries);
    filter.addEventListener("change", renderInquiries);
    dashboard.dispatchEvent(new CustomEvent("zaid-owner-panels-updated"));
  }
  function updateStats() {
    $("#inquiry-total").textContent = inquiries.length.toLocaleString();
    $("#inquiry-new").textContent = inquiries.filter(item => item.status === "new").length.toLocaleString();
    $("#inquiry-active").textContent = inquiries.filter(item => item.status === "in_progress" || item.status === "contacted").length.toLocaleString();
    $("#inquiry-done").textContent = inquiries.filter(item => item.status === "completed").length.toLocaleString();
  }
  function renderInquiries() {
    const list = $("#client-inquiry-list");
    if (!list) return;
    const filter = $("#inquiry-status-filter")?.value || "all";
    const visible = inquiries.filter(item => filter === "all" || item.status === filter);
    list.replaceChildren();
    updateStats();
    if (!visible.length) {
      addText(list, "p", "empty-state", inquiries.length ? "No inquiries match this filter." : "No client inquiries yet. New requests from the public contact form will appear here.");
      return;
    }
    visible.forEach(item => {
      const card = document.createElement("article"); card.className = "library-item";
      const info = document.createElement("div"); info.className = "library-item-info";
      addText(info, "h3", "", item.name || "New inquiry");
      addText(info, "p", "field-help", new Date(item.created_at).toLocaleString() + " · " + statusLabel(item.status));
      addText(info, "p", "", item.email);
      addText(info, "p", "", "Project: " + item.project_type + " · Budget: " + item.budget);
      addText(info, "p", "", "Deadline: " + (item.deadline || "Flexible") + " · Preferred: " + (item.preferred_contact || "email"));
      if (item.details) addText(info, "p", "", item.details);
      const actions = document.createElement("div"); actions.className = "library-actions";
      const status = document.createElement("select"); status.setAttribute("aria-label", "Inquiry status for " + (item.name || "client"));
      statuses.forEach(([value, label]) => { const option = document.createElement("option"); option.value = value; option.textContent = label; status.append(option); });
      status.value = statuses.some(x => x[0] === item.status) ? item.status : "new";
      status.addEventListener("change", async () => {
        status.disabled = true;
        try {
          const { error } = await db.from("portfolio_inquiries").update({ status: status.value }).eq("id", item.id);
          if (error) throw error;
          item.status = status.value; renderInquiries(); message("Inquiry status updated.");
        } catch (error) { message("Could not update inquiry: " + (error.message || "Please try again."), true); status.disabled = false; }
      });
      const email = document.createElement("a"); email.className = "quiet-button"; email.href = "mailto:" + encodeURIComponent(item.email); email.textContent = "Email client ↗";
      actions.append(status, email);
      if (item.preferred_contact === "whatsapp") { const whatsapp = document.createElement("a"); whatsapp.className = "quiet-button"; whatsapp.href = "https://wa.me/918857020261?text=" + encodeURIComponent("Hi " + item.name + ", thanks for your project inquiry. I’m following up about: " + item.project_type); whatsapp.target = "_blank"; whatsapp.rel = "noopener noreferrer"; whatsapp.textContent = "WhatsApp ↗"; actions.append(whatsapp); }
      card.append(info, actions); list.append(card);
    });
  }
  async function loadInquiries() {
    if (loading) return;
    loading = true; message("Loading client inquiries…");
    const button = $("#refresh-client-inquiries"); if (button) button.disabled = true;
    try {
      const { data, error } = await db.from("portfolio_inquiries")
        .select("id,name,email,project_type,budget,deadline,details,preferred_contact,status,created_at")
        .order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      inquiries = data || [];
      renderInquiries();
      message(inquiries.length + " recent inquiries loaded.");
    } catch (error) {
      message("Could not load client inquiries: " + (error.message || "Please try again."), true);
    } finally {
      loading = false; if (button) button.disabled = false;
    }
  }
  async function init() {
    if (initialized) return;
    const { data, error } = await db.auth.getSession();
    if (error || !data.session || (data.session.user.email || "").toLowerCase() !== OWNER_EMAIL) return;
    initialized = true;
    buildPanel();
    await loadInquiries();
  }
  window.addEventListener("zaid-owner-ready", () => init().catch(error => message(error.message, true)));
  if (document.readyState !== "loading") init().catch(() => {});
  else document.addEventListener("DOMContentLoaded", () => init().catch(() => {}), { once: true });
})();