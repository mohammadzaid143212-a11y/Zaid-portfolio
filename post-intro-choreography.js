(()=>{"use strict";
const reduce=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const root=document.documentElement;
let started=false;
function start(){
 if(started)return;started=true;
 root.classList.add("zaid-choreo-ready");
 const hero=document.querySelector(".hero");
 const words=[...document.querySelectorAll(".cinematic-title .title-word")];
 const heroFrame=document.querySelector(".hero-frame");
 const heroEyebrow=document.querySelector(".hero .eyebrow");
 const heroBottom=document.querySelector(".hero-bottom");
 const heroMeta=document.querySelector(".hero-meta");
 if(reduce){root.classList.add("zaid-choreo-static");return;}
 if(hero)hero.classList.add("zaid-choreo-enter");
 [heroEyebrow,...words,heroBottom,heroFrame,heroMeta].filter(Boolean).forEach((el,i)=>{
   el.style.setProperty("--choreo-index",String(i));
   el.classList.add("zaid-choreo-item");
 });
 requestAnimationFrame(()=>root.classList.add("zaid-choreo-live"));
 // Pointer-driven camera movement on the hero frame; never required for touch users.
 if(heroFrame&&matchMedia("(pointer:fine)").matches){
  heroFrame.addEventListener("pointermove",e=>{
   const r=heroFrame.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
   heroFrame.style.setProperty("--camera-x",(x*2.2).toFixed(2)+"deg");
   heroFrame.style.setProperty("--camera-y",(y*-2.2).toFixed(2)+"deg");
   heroFrame.style.setProperty("--camera-px",(x*10).toFixed(1)+"px");
   heroFrame.style.setProperty("--camera-py",(y*8).toFixed(1)+"px");
  });
  heroFrame.addEventListener("pointerleave",()=>{["--camera-x","--camera-y","--camera-px","--camera-py"].forEach(k=>heroFrame.style.removeProperty(k));});
 }
 // Scroll chapters: each section receives one cinematic entrance and a chapter marker.
 const chapters=["home","work","about","contact"].map(id=>document.getElementById(id)).filter(Boolean);
 if("IntersectionObserver"in window){
  const io=new IntersectionObserver(entries=>entries.forEach(entry=>{
   if(!entry.isIntersecting)return;
   entry.target.classList.add("zaid-chapter-visible");
   entry.target.dataset.choreography="revealed";
   io.unobserve(entry.target);
  }),{rootMargin:"0px 0px -12% 0px",threshold:.08});
  chapters.forEach(el=>io.observe(el));
  document.querySelectorAll(".project-card,.video-gallery-heading,.about-content,.contact-cta").forEach((el,i)=>{
   el.style.setProperty("--choreo-stagger",Math.min(i%6,5)*90+"ms");
   el.classList.add("zaid-scroll-object");
   const ob=new IntersectionObserver(es=>es.forEach(en=>{if(en.isIntersecting){en.target.classList.add("zaid-object-visible");ob.disconnect();}}),{threshold:.12});
   ob.observe(el);
  });
 }
 // Refined pointer depth on project cards.
 if(matchMedia("(pointer:fine)").matches)document.querySelectorAll(".project-card").forEach(card=>{
  card.addEventListener("pointermove",e=>{
   const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
   card.style.setProperty("--card-tilt-x",(y*-3).toFixed(2)+"deg");
   card.style.setProperty("--card-tilt-y",(x*3).toFixed(2)+"deg");
  });
  card.addEventListener("pointerleave",()=>{card.style.removeProperty("--card-tilt-x");card.style.removeProperty("--card-tilt-y");});
 });
 // Magnetic response on primary calls to action.
 document.querySelectorAll(".contact-cta,.hero-button-primary").forEach(el=>{
  if(!matchMedia("(pointer:fine)").matches)return;
  el.addEventListener("pointermove",e=>{const r=el.getBoundingClientRect();el.style.setProperty("--mag-x",((e.clientX-r.left-r.width/2)*.07).toFixed(1)+"px");el.style.setProperty("--mag-y",((e.clientY-r.top-r.height/2)*.07).toFixed(1)+"px");});
  el.addEventListener("pointerleave",()=>{el.style.removeProperty("--mag-x");el.style.removeProperty("--mag-y");});
 });
}
document.addEventListener("zaid:intro:complete",start,{once:true});
// Wait for the intro runtime to finish (including its async settings read) before
// revealing the page. The old 500ms fallback raced the intro and consumed the
// one-time start event while the overlay was still loading.
// Keep a long failsafe only for a genuinely missing/broken intro runtime.
window.setTimeout(()=>{
 if(!started&&!document.getElementById("cci-dedicated-overlay"))start();
},12000);
})();