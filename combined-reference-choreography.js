(()=>{"use strict";
const reduced=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if(reduced)return;
const start=()=>{
 if(document.getElementById("cci-dedicated-overlay"))return;
 const root=document.createElement("div");
 root.id="cci-dedicated-overlay";
 root.className="combined-cinematic-intro";
 root.setAttribute("role","presentation");
 root.setAttribute("aria-label","Welcome to Zaid's portfolio");
 const backdrop=document.createElement("div");backdrop.className="cci-backdrop";
 const heroMedia=document.querySelector(".hero-frame video,.hero-frame img");
 if(heroMedia){
  const clone=heroMedia.cloneNode(true);clone.removeAttribute("id");clone.removeAttribute("autoplay");clone.muted=true;clone.loop=true;clone.playsInline=true;
  backdrop.append(clone);
  if(clone.tagName==="VIDEO"){clone.autoplay=true;clone.play().catch(()=>{});}
 }
 const doors=document.createElement("div");doors.className="cci-doors";
 const left=document.createElement("span");const right=document.createElement("span");doors.append(left,right);
 const content=document.createElement("div");content.className="cci-content";
 const eyebrow=document.createElement("small");eyebrow.textContent="ZAID  /  VISUAL STORYTELLER";
 const title=document.createElement("h1");title.textContent="Welcome to my portfolio website.";
 const line=document.createElement("i");
 content.append(eyebrow,title,line);
 root.append(backdrop,doors,content);
 document.body.append(root);
 document.documentElement.classList.add("cci-lock");
 const finish=()=>{
  if(!root.isConnected)return;
  root.classList.add("cci-exit");
  document.documentElement.classList.remove("cci-lock");
  window.setTimeout(()=>root.remove(),1100);
 };
 window.setTimeout(finish,5200);
};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>window.setTimeout(start,180),{once:true});
else window.setTimeout(start,180);
})();
