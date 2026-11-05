(()=>{"use strict";
const reduce=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const root=document.documentElement;
let started=false;
function launchHeroVisualSequence(){
 const layer=document.createElement("div");
 layer.className="zaid-hero-visual-sequence";
 layer.setAttribute("aria-hidden","true");
 layer.innerHTML='<div class="zhvs-aura"></div><svg viewBox="0 0 1000 760" preserveAspectRatio="xMidYMid slice"><defs><filter id="zhvs-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter><linearGradient id="zhvs-line" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f5eee2" stop-opacity=".12"/><stop offset=".48" stop-color="#fffaf0"/><stop offset="1" stop-color="#c6a875" stop-opacity=".55"/></linearGradient></defs><g fill="none" stroke="url(#zhvs-line)" stroke-width="2.2" filter="url(#zhvs-glow)"><path class="zhvs-orbit zhvs-one" d="M-90 410 C90 30 420 10 520 250 C650 565 260 830 90 610 C-20 470 180 170 520 165 C850 160 1120 470 920 660 C730 840 400 650 450 390 C500 150 820 50 1090 330"/><path class="zhvs-orbit zhvs-two" d="M-80 560 C110 720 300 100 520 110 C770 120 980 390 840 560 C700 740 390 700 300 490 C210 280 480 80 700 250 C900 410 700 690 500 650 C260 600 180 300 350 170"/><path class="zhvs-orbit zhvs-three" d="M120 -60 C420 120 720 160 880 370 C1030 570 760 800 520 690 C280 580 340 330 560 300 C790 270 900 500 760 650"/></g><circle cx="500" cy="380" r="3" fill="#fffaf0"/></svg><div class="zhvs-flash"></div>';
 document.body.append(layer);
 window.setTimeout(()=>{layer.classList.add("is-settling");window.setTimeout(()=>layer.remove(),1100);},4400);
}
if(!document.getElementById("zaid-hero-visual-sequence-style")){
 const style=document.createElement("style");style.id="zaid-hero-visual-sequence-style";
 style.textContent=`.zaid-hero-visual-sequence{position:fixed;inset:0;z-index:9998;pointer-events:none;overflow:hidden;opacity:1;mix-blend-mode:screen;animation:zhvs-in .45s ease both}.zaid-hero-visual-sequence svg{position:absolute;width:100%;height:100%;inset:0;overflow:visible}.zaid-hero-visual-sequence g{transform-origin:50% 50%}.zhvs-orbit{stroke-dasharray:2600;stroke-dashoffset:2600;animation:zhvs-draw 3.4s cubic-bezier(.2,.7,.2,1) forwards,zhvs-drift 4.8s ease-in-out both}.zhvs-two{animation-delay:.18s,.1s;opacity:.78}.zhvs-three{animation-delay:.38s,.2s;opacity:.55}.zhvs-aura{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 54%,#c6a87530,transparent 48%);animation:zhvs-aura 4.5s ease both}.zhvs-flash{position:absolute;inset:-20%;background:linear-gradient(112deg,transparent 38%,#fff8 49%,#c6a87555 51%,transparent 62%);transform:translateX(-120%);animation:zhvs-flash 1.15s .75s ease-out both}.zaid-hero-visual-sequence.is-settling{opacity:0;transition:opacity 1s ease}.zaid-hero-visual-sequence.is-settling .zhvs-orbit{animation-play-state:paused}@keyframes zhvs-in{from{opacity:0}to{opacity:1}}@keyframes zhvs-draw{to{stroke-dashoffset:0}}@keyframes zhvs-drift{0%,100%{transform:rotate(-5deg) scale(.92)}50%{transform:rotate(5deg) scale(1.04)}}@keyframes zhvs-aura{0%,100%{opacity:0}25%,75%{opacity:1}}@keyframes zhvs-flash{to{transform:translateX(120%)}}@media(max-width:680px){.zaid-hero-visual-sequence svg{transform:scale(1.35)}.zhvs-orbit{stroke-width:2.7}}@media(prefers-reduced-motion:reduce){.zaid-hero-visual-sequence{display:none!important}}`;
 document.head.append(style);
}
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
 // The dedicated reference sequence is launched by reference-sequence.js after this class becomes live.
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
window.setTimeout(()=>{if(!started&&!document.getElementById("cci-dedicated-overlay"))start();},12000);
})();