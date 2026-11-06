(()=>{"use strict";
const root=document.documentElement;
const reduce=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if(reduce){root.classList.add("motion-ready","motion-reduced");return;}
root.classList.add("motion-ready");
const revealSelectors=[
 ".hero-topline",".hero-heading-wrap",".editorial-hero-bottom",".editorial-hero-frame",".hero-meta",
 ".zaid-door-heading",".zaid-door",".film-language-top",".film-language-head",
 ".film-language-step",".film-language-bottom",".editorial-section-heading",
 ".video-gallery-heading",".project-card",".expertise-top",".expertise-heading",
 ".expertise-item",".about-label",".about-portrait",".about-content",
 ".editorial-contact .contact-topline",".editorial-contact h2",".editorial-contact .contact-bottom"
];
const targets=[...new Set(revealSelectors.flatMap(s=>[...document.querySelectorAll(s)]))];
targets.forEach((el,i)=>{el.classList.add("motion-reveal");el.style.setProperty("--motion-order",String(i%5));});
const observer=new IntersectionObserver(entries=>{
 entries.forEach(entry=>{
  if(entry.isIntersecting){entry.target.classList.add("is-visible");observer.unobserve(entry.target);}
 });
},{threshold:.14,rootMargin:"0px 0px -7% 0px"});
targets.forEach(el=>observer.observe(el));
const doors=[...document.querySelectorAll(".zaid-door")];
doors.forEach((door,index)=>{
 door.style.setProperty("--door-index",String(index));
 if(window.matchMedia("(hover:hover) and (pointer:fine)").matches){
  door.addEventListener("pointermove",event=>{
   const r=door.getBoundingClientRect(),x=(event.clientX-r.left)/r.width-.5,y=(event.clientY-r.top)/r.height-.5;
   door.style.setProperty("--door-tilt-x",String((-y*3).toFixed(2))+"deg");
   door.style.setProperty("--door-tilt-y",String((x*5).toFixed(2))+"deg");
  });
  door.addEventListener("pointerleave",()=>{door.style.setProperty("--door-tilt-x","0deg");door.style.setProperty("--door-tilt-y","0deg");});
 }
});
const film=document.querySelector(".film-language");
if(film){
 const steps=[...film.querySelectorAll(".film-language-step")];
 steps.forEach((step,i)=>step.style.setProperty("--step-order",String(i)));
}
const progress=document.createElement("div");
progress.className="cinematic-transition";
progress.setAttribute("aria-hidden","true");
document.body.appendChild(progress);
doors.forEach(door=>{
 door.addEventListener("click",event=>{
  const href=door.getAttribute("href"),target=href&&document.querySelector(href);
  if(!target)return;
  event.preventDefault();
  if(door.dataset.busy==="1")return;
  door.dataset.busy="1";
  door.classList.add("is-opening");
  root.classList.add("cinematic-navigation");
  progress.classList.remove("wipe-out");progress.classList.add("wipe-in");
  window.setTimeout(()=>{
   target.scrollIntoView({behavior:"smooth",block:"start"});
   history.replaceState(null,"",href);
   window.setTimeout(()=>{
    progress.classList.remove("wipe-in");progress.classList.add("wipe-out");
    root.classList.remove("cinematic-navigation");
    door.classList.remove("is-opening");door.dataset.busy="0";
   },500);
  },560);
 });
});
let ticking=false;
window.addEventListener("scroll",()=>{
 if(ticking)return;ticking=true;
 requestAnimationFrame(()=>{
  const max=document.documentElement.scrollHeight-window.innerHeight;
  root.style.setProperty("--page-progress",max>0?(window.scrollY/max).toFixed(4):"0");
  ticking=false;
 });
},{passive:true});
})();