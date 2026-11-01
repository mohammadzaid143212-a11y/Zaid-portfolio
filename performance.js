(() => {
  "use strict";
  if(!window.supabase)return;
  const URL="https://rtaedoseedjwljixmrgy.supabase.co",KEY="sb_publishable__Oc_xT1AELiVIQgCgXytTQ_qxLd_ZFo";
  const db=window.supabase.createClient(URL,KEY);
  db.from("portfolio_theme_settings").select("settings").eq("id",true).maybeSingle().then(({data,error})=>{
    if(error)return;
    const p=data?.settings?.__performance||{};
    if(p.lazyImages!==false){
      document.querySelectorAll("img:not([loading])").forEach(img=>{img.loading="lazy";img.decoding="async";});
      const observer=new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{
        if(node.nodeType!==1)return;
        if(node.matches?.("img")&&!node.hasAttribute("loading")){node.loading="lazy";node.decoding="async";}
        node.querySelectorAll?.("img:not([loading])").forEach(img=>{img.loading="lazy";img.decoding="async";});
      })));
      observer.observe(document.body,{childList:true,subtree:true});
    }
    if(p.metadataVideoPreload!==false)document.querySelectorAll("video").forEach(v=>{if(!v.hasAttribute("preload"))v.preload="metadata";});
    if(p.pauseDecorativeOnMobile===true&&matchMedia("(max-width: 680px)").matches)document.querySelectorAll(".hero-video,.theme-background-video").forEach(v=>{v.autoplay=false;v.pause();});
    if(p.disableScrollReveals===true){document.body.classList.remove("reveal-ready");document.querySelectorAll(".reveal").forEach(el=>{el.classList.add("is-visible");el.style.opacity="1";el.style.transform="none";});}
  }).catch(()=>{});
})();