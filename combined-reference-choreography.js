(()=>{"use strict";
const reduce=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const root=document.getElementById("portfolio-intro-root");
if(!root)return;
const db=window.supabase?.createClient("https://rtaedoseedjwljixmrgy.supabase.co","sb_publishable__Oc_xT1AELiVIQgCgXytTQ_qxLd_ZFo");
const playIntro=()=>{
 if(reduce)return;
 const hero=document.querySelector(".hero");
 const media=hero?.querySelector(".hero-frame video,.hero-frame img");
 root.hidden=false;root.setAttribute("aria-hidden","false");root.className="combined-cinematic-intro";
 const backdrop=document.createElement("div");backdrop.className="cci-backdrop";
 if(media){const clone=media.cloneNode(true);clone.removeAttribute("id");clone.muted=true;clone.autoplay=true;clone.loop=true;clone.playsInline=true;backdrop.append(clone);if(clone.tagName==="VIDEO")clone.play().catch(()=>{});}
 const doors=document.createElement("div");doors.className="cci-doors";doors.innerHTML='<span></span><span></span>';
 const content=document.createElement("div");content.className="cci-content";
 const eyebrow=document.createElement("small");eyebrow.textContent="ZAID / VISUAL STORYTELLER";
 const title=document.createElement("h1");title.textContent="Welcome to my portfolio website.";
 const line=document.createElement("i");
 content.append(eyebrow,title,line);root.append(backdrop,doors,content);
 document.documentElement.classList.add("cci-lock");
 const finish=()=>{root.classList.add("cci-exit");document.documentElement.classList.remove("cci-lock");setTimeout(()=>{root.hidden=true;root.replaceChildren();},1300);};
 setTimeout(finish,4800);
};
const applyStory=()=>{
 if(reduce)return;
 document.querySelectorAll(".hero,.work-section,.about-section,.contact-section").forEach((section,i)=>{
  section.classList.add("cci-scene");section.style.setProperty("--cci-index",i);
  const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){section.classList.add("cci-seen");observer.disconnect();}},{threshold:.16});
  observer.observe(section);
 });
 document.querySelectorAll(".project-card").forEach((card,i)=>{card.style.setProperty("--cci-card-index",i);card.classList.add("cci-project");});
 document.querySelectorAll(".menu-toggle,.contact-cta,.text-link,.project-card").forEach(el=>el.classList.add("cci-interactive"));
};
const init=async()=>{
 applyStory();
 if(!db){playIntro();return;}
 try{
  const {data,error}=await db.from("portfolio_theme_settings").select("settings").eq("id",true).maybeSingle();
  if(error)throw error;
  const settings=data?.settings||{};
  // A deliberately configured Owner Studio intro takes precedence over the built-in reference-combination opener.
  if(!settings.__loadingIntro?.enabled)playIntro();
 }catch{playIntro();}
};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();