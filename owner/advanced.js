(() => {
  "use strict";
  const URL = "https://rtaedoseedjwljixmrgy.supabase.co";
  const KEY = "sb_publishable__Oc_xT1AELiVIQgCgXytTQ_qxLd_ZFo";
  const OWNER = "mohammadzaid143212@gmail.com";
  const $ = (s) => document.querySelector(s);
  if (!window.supabase) return;
  const db = window.supabase.createClient(URL, KEY);
  let active = false, initializing = false, busy = false, versions = [];
  const stackState = (() => { try { return JSON.parse(sessionStorage.getItem("zaid-version-stacks") || "{}"); } catch { return {}; } })();
  let undoStack = Array.isArray(stackState.undo) ? stackState.undo : [];
  let redoStack = Array.isArray(stackState.redo) ? stackState.redo : [];
  function persistStacks(){ try { sessionStorage.setItem("zaid-version-stacks",JSON.stringify({undo:undoStack.slice(-20),redo:redoStack.slice(-20)})); } catch {} }
  const note = (id, msg, bad=false) => { const el=$(id); if(el){el.textContent=msg;el.classList.toggle("error",bad);} };
  async function ownerSession() {
    const {data,error}=await db.auth.getSession();
    if(error || !data.session || (data.session.user.email||"").toLowerCase()!==OWNER) return null;
    return data.session;
  }
  async function snapshot(label) {
    const [{data:projects,error:pErr},{data:theme,error:tErr},{data:session}] = await Promise.all([
      db.from("portfolio_projects").select("*").order("sort_order").order("created_at"),
      db.from("portfolio_theme_settings").select("settings").eq("id",true).maybeSingle(),
      db.auth.getSession()
    ]);
    if(pErr) throw pErr; if(tErr) throw tErr;
    return {label:label||"Restore point",projects:projects||[],settings:theme?.settings||{},createdAt:new Date().toISOString(),createdBy:session.session?.user?.id||null};
  }
  async function saveVersion(label, current=null) {
    const snap=current||await snapshot(label);
    const {error}=await db.from("portfolio_versions").insert({label:label||"Automatic restore point",snapshot:snap,created_by:snap.createdBy});
    if(error) throw error;
    await trimVersions();
    await loadVersions();
    return snap;
  }
  async function trimVersions() {
    const {data,error}=await db.from("portfolio_versions").select("id").order("created_at",{ascending:false}).range(40,999);
    if(error) throw error;
    if(data?.length) { const {error:delErr}=await db.from("portfolio_versions").delete().in("id",data.map(x=>x.id)); if(delErr) throw delErr; }
  }
  async function loadVersions() {
    const {data,error}=await db.from("portfolio_versions").select("id,label,created_at,snapshot").order("created_at",{ascending:false}).limit(40);
    if(error) throw error;
    versions=data||[];
    const list=$("#version-list"); if(!list)return;
    list.replaceChildren();
    if(!versions.length){const p=document.createElement("p");p.className="empty-state";p.textContent="No restore points yet. Changes will create restore points automatically.";list.append(p);return;}
    versions.forEach(v=>{
      const item=document.createElement("article");item.className="advanced-list-item";
      const info=document.createElement("div");const title=document.createElement("strong");title.textContent=v.label;
      const meta=document.createElement("small");meta.textContent=new Date(v.created_at).toLocaleString();
      info.append(title,meta);
      const restore=document.createElement("button");restore.type="button";restore.className="quiet-button";restore.textContent="Restore";
      restore.addEventListener("click",()=>restoreVersion(v));
      item.append(info,restore);list.append(item);
    });
  }
  async function restoreSnapshot(snap) {
    if(!snap || !Array.isArray(snap.projects) || !snap.settings || typeof snap.settings!=="object") throw new Error("This restore point is invalid.");
    const ids=snap.projects.map(p=>p.id).filter(Boolean);
    if(ids.length) {
      const {error:upsertErr}=await db.from("portfolio_projects").upsert(snap.projects,{onConflict:"id"});
      if(upsertErr) throw upsertErr;
      const {error:removeErr}=await db.from("portfolio_projects").delete().not("id","in","("+ids.join(",")+")");
      if(removeErr) throw removeErr;
    } else {
      const {error:removeErr}=await db.from("portfolio_projects").delete().gte("created_at","1970-01-01T00:00:00Z");
      if(removeErr) throw removeErr;
    }
    const {error:themeErr}=await db.from("portfolio_theme_settings").upsert({id:true,settings:snap.settings,updated_at:new Date().toISOString()},{onConflict:"id"});
    if(themeErr) throw themeErr;
    window.location.reload();
  }
  async function restoreVersion(v) {
    if(!window.confirm("Restore this saved version? Current projects and theme settings will be replaced by this restore point.")) return;
    try {
      const current=await snapshot("Before restore");
      undoStack.push(current); redoStack=[]; persistStacks();
      await restoreSnapshot(v.snapshot);
    } catch(e){note("#version-message",e.message||"Restore failed.",true);}
  }
  function bindVersionControls() {
    $("#create-version")?.addEventListener("click",async()=>{
      const b=$("#create-version");b.disabled=true;
      try{await saveVersion("Manual restore point");note("#version-message","Restore point saved successfully.");}
      catch(e){note("#version-message",e.message||"Could not save restore point.",true);}
      finally{b.disabled=false;}
    });
    $("#undo-version")?.addEventListener("click",async()=>{
      if(!undoStack.length){note("#version-message","No more changes to undo in this session.");return;}
      try{const now=await snapshot("Before undo");redoStack.push(now);const prev=undoStack.pop();persistStacks();await restoreSnapshot(prev);}
      catch(e){note("#version-message",e.message||"Undo failed.",true);}
    });
    $("#redo-version")?.addEventListener("click",async()=>{
      if(!redoStack.length){note("#version-message","No changes to redo in this session.");return;}
      try{const now=await snapshot("Before redo");undoStack.push(now);const next=redoStack.pop();persistStacks();await restoreSnapshot(next);}
      catch(e){note("#version-message",e.message||"Redo failed.",true);}
    });
  }
  function interceptSaves() {
    document.addEventListener("submit",async(event)=>{
      const form=event.target;
      if(!(form instanceof HTMLFormElement)||!form.closest("#dashboard-view")||form.dataset.versionGuard==="skip"||busy)return;
      event.preventDefault();event.stopImmediatePropagation();busy=true;
      try{const before=await snapshot("Before "+form.id.replace(/-form$/,"").replace(/-/g," ")+" update");await saveVersion("Before "+form.id.replace(/-form$/,"").replace(/-/g," ")+" update",before);undoStack.push(before);redoStack=[];persistStacks();}
      catch(e){note("#version-message","Automatic restore point could not be saved: "+(e.message||"unknown error"),true);}
      finally{busy=false;form.dataset.versionGuard="skip";form.requestSubmit();delete form.dataset.versionGuard;}
    },true);
  }
  async function initVersions(){try{await loadVersions();}catch(e){note("#version-message",e.message||"Version history unavailable.",true);}}
  async function collectMedia() {
    const found=[]; const folders=["videos","thumbnails","themes","fonts","elements"]; const storage=db.storage.from("portfolio-media");
    async function walk(folder,depth=0){
      if(depth>2)return;
      const {data,error}=await storage.list(folder,{limit:100,offset:0,sortBy:{column:"name",order:"asc"}});
      if(error)throw error;
      for(const entry of data||[]){
        const path=folder?folder+"/"+entry.name:entry.name;
        if(entry.id===null){await walk(path,depth+1);}
        else found.push({name:entry.name,path,metadata:entry.metadata||{},created_at:entry.created_at||entry.updated_at||null});
      }
    }
    for(const folder of folders) await walk(folder);
    return found.sort((a,b)=>(b.created_at||"").localeCompare(a.created_at||""));
  }
  function prettyBytes(n){if(!Number.isFinite(n)||n<=0)return "Size unknown";const u=["B","KB","MB","GB"];let i=0;while(n>=1024&&i<u.length-1){n/=1024;i++;}return n.toFixed(i?1:0)+" "+u[i];}
  async function renderMedia() {
    const list=$("#media-list");if(!list)return;
    list.innerHTML='<p class="empty-state">Loading media library…</p>';
    try{
      const [files,projects,theme]=await Promise.all([
        collectMedia(),
        db.from("portfolio_projects").select("video_url,thumbnail_url"),
        db.from("portfolio_theme_settings").select("settings").eq("id",true).maybeSingle()
      ]);
      if(projects.error)throw projects.error;if(theme.error)throw theme.error;
      const settings=theme.data?.settings||{};
      const referenced=[...(projects.data||[]).flatMap(p=>[p.video_url,p.thumbnail_url]),...(JSON.stringify(settings).match(/https?:[^"' ]+/g)||[])];
      list.replaceChildren();
      if(!files.length){const p=document.createElement("p");p.className="empty-state";p.textContent="No uploaded media found.";list.append(p);return;}
      files.forEach(file=>{
        const url=storageUrl(file.path),isVideo=/\.(mp4|webm|ogg|mov)$/i.test(file.name),isImage=/\.(jpg|jpeg|png|webp)$/i.test(file.name);
        const card=document.createElement("article");card.className="media-library-item";
        const preview=document.createElement("div");preview.className="media-library-preview";
        if(isImage){const img=document.createElement("img");img.src=url;img.alt=file.name;img.loading="lazy";preview.append(img);}
        else if(isVideo){const video=document.createElement("video");video.src=url;video.muted=true;video.preload="metadata";video.playsInline=true;video.controls=true;preview.append(video);}
        else {const span=document.createElement("span");span.textContent="FILE";preview.append(span);}
        const details=document.createElement("div");details.className="media-library-details";
        const title=document.createElement("strong");title.textContent=file.name;
        const meta=document.createElement("small");meta.textContent=file.path+" · "+prettyBytes(file.metadata.size);
        details.append(title,meta);
        const actions=document.createElement("div");actions.className="media-library-actions";
        const open=document.createElement("a");open.href=url;open.target="_blank";open.rel="noopener noreferrer";open.className="quiet-button";open.textContent="Open";
        actions.append(open);
        const used=referenced.some(value=>typeof value==="string"&&value.includes(file.path));
        const del=document.createElement("button");del.type="button";del.className="danger-button";del.textContent=used?"In use":"Delete";del.disabled=used;
        del.title=used?"This file is referenced by a project or theme setting.":"Delete this uploaded file.";
        del.addEventListener("click",async()=>{
          if(!window.confirm("Permanently delete "+file.name+"? This cannot be undone."))return;
          del.disabled=true;const {error}=await storage.remove([file.path]);
          if(error){note("#media-message",error.message,true);del.disabled=false;return;}
          note("#media-message","Media deleted.");await renderMedia();
        });
        actions.append(del);card.append(preview,details,actions);list.append(card);
      });
      note("#media-message",files.length+" media files found. Files used by projects or themes are protected from accidental deletion.");
    }catch(e){list.innerHTML='<p class="empty-state">Could not load media: '+String(e.message||"unknown error").replace(/[<>&"]/g,"")+'</p>';}
  }
  function storageUrl(path){return db.storage.from("portfolio-media").getPublicUrl(path).data.publicUrl;}
  function bindMedia(){ $("#refresh-media")?.addEventListener("click",renderMedia); }
  async function renderAnalytics(){
    const {data,error}=await db.from("portfolio_analytics").select("event_type,project_id,session_key,created_at").gte("created_at",new Date(Date.now()-7*86400000).toISOString()).order("created_at",{ascending:false}).limit(2000);
    if(error){note("#analytics-message",error.message,true);return;}
    const rows=data||[],visitors=new Set(rows.map(r=>r.session_key)).size,pageViews=rows.filter(r=>r.event_type==="page_view").length,projectViews=rows.filter(r=>r.event_type==="project_view").length;
    $("#analytics-visitors").textContent=visitors.toLocaleString();
    $("#analytics-pageviews").textContent=pageViews.toLocaleString();
    $("#analytics-projectviews").textContent=projectViews.toLocaleString();
    const projectCounts={};rows.filter(r=>r.event_type==="project_view"&&r.project_id).forEach(r=>projectCounts[r.project_id]=(projectCounts[r.project_id]||0)+1);
    const [{data:projects,error:pErr}]=await Promise.all([db.from("portfolio_projects").select("id,title")]);
    if(pErr){note("#analytics-message",pErr.message,true);return;}
    const list=$("#analytics-project-list");list.replaceChildren();
    const ranked=(projects||[]).map(p=>({title:p.title,views:projectCounts[p.id]||0})).sort((a,b)=>b.views-a.views);
    if(!ranked.length){const p=document.createElement("p");p.className="empty-state";p.textContent="No project views yet.";list.append(p);}
    ranked.forEach(p=>{const row=document.createElement("div");row.className="analytics-row";const label=document.createElement("span");label.textContent=p.title;const bar=document.createElement("div");bar.className="analytics-track";const fill=document.createElement("i");fill.style.width=(Math.max(0,Math.min(100,p.views/(ranked[0]?.views||1)*100)))+"%";bar.append(fill);const count=document.createElement("strong");count.textContent=p.views+" views";row.append(label,bar,count);list.append(row);});
    note("#analytics-message","Last 7 days · "+rows.length+" events sampled (maximum 2,000). Visitor count uses a random browser identifier, not personal identity.");
  }
  function bindAnalytics(){ $("#refresh-analytics")?.addEventListener("click",renderAnalytics); }
  async function savePerformance(){
    const {data,error}=await db.from("portfolio_theme_settings").select("settings").eq("id",true).maybeSingle();
    if(error)throw error;
    const settings=data?.settings||{};
    settings.__performance={
      lazyImages:$("#perf-lazy-images").checked,
      metadataVideoPreload:$("#perf-video-preload").checked,
      pauseDecorativeOnMobile:$("#perf-pause-mobile").checked,
      disableScrollReveals:$("#perf-disable-reveals").checked
    };
    const {error:saveErr}=await db.from("portfolio_theme_settings").upsert({id:true,settings,updated_at:new Date().toISOString()},{onConflict:"id"});
    if(saveErr)throw saveErr;
    note("#performance-message","Performance preferences saved and published.");
  }
  async function loadPerformance(){
    const {data,error}=await db.from("portfolio_theme_settings").select("settings").eq("id",true).maybeSingle();
    if(error)throw error;
    const p=data?.settings?.__performance||{};
    $("#perf-lazy-images").checked=p.lazyImages!==false;
    $("#perf-video-preload").checked=p.metadataVideoPreload!==false;
    $("#perf-pause-mobile").checked=p.pauseDecorativeOnMobile===true;
    $("#perf-disable-reveals").checked=p.disableScrollReveals===true;
  }
  function bindPerformance(){ $("#performance-form")?.addEventListener("submit",async e=>{e.preventDefault();const b=$("#save-performance");b.disabled=true;try{await savePerformance();}catch(err){note("#performance-message",err.message||"Could not save settings.",true);}finally{b.disabled=false;}}); }
  async function init(){
    if(active||initializing)return;
    initializing=true;
    const session=await ownerSession();
    if(!session){initializing=false;return;}
    active=true;initializing=false;
    bindVersionControls();interceptSaves();bindMedia();bindAnalytics();bindPerformance();
    await Promise.all([initVersions(),loadPerformance()]);
    $("#refresh-media")?.click();$("#refresh-analytics")?.click();
  }
  window.addEventListener("zaid-owner-ready",init);
  if(document.readyState!=="loading")init(); else document.addEventListener("DOMContentLoaded",init,{once:true});
})();