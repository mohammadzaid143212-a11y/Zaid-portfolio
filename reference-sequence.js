(()=>{"use strict";
const reduce=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
let launched=false;
function run(){
 if(launched||reduce)return;
 const hero=document.querySelector(".hero");if(!hero)return;
 launched=true;
 const layer=document.createElement("div");
 layer.className="reference-sequence-layer";
 layer.setAttribute("aria-hidden","true");
 layer.innerHTML='<div class="rs-atmosphere"></div><div class="rs-grid"></div><div class="rs-edge"></div><div class="rs-gate"><i class="rs-gate-panel"></i><i class="rs-gate-panel"></i></div><div class="rs-center-mark">ZAID®</div><div class="rs-orbit"></div><div class="rs-frame-stack"><div class="rs-frame rs-frame-one"><span>01 / STORY</span></div><div class="rs-frame rs-frame-two"><span>02 / MOTION</span></div><div class="rs-frame rs-frame-three"><span>03 / ATMOSPHERE</span></div></div><div class="rs-kinetic"><span class="rs-kinetic-kicker">INDEPENDENT VIDEO EDITOR · VISUAL STORYTELLER</span><h2 class="rs-kinetic-title"><span>Frames</span> <span>into</span><br><span>feeling</span><span>.</span></h2><span class="rs-kinetic-foot">A VISUAL STORY BY ZAID</span></div><div class="rs-light-sweep"></div>';
 hero.append(layer);
 // Keep the sequence in the marked hero area, then clear it to reveal the real portfolio.
 window.setTimeout(()=>{layer.classList.add("is-leaving");window.setTimeout(()=>{layer.remove();activateLivingPortfolio();},1250);},6100);
}
function activateLivingPortfolio(){
 const root=document.documentElement,heroFrame=document.querySelector(".hero-frame");
 root.classList.add("rs-experience-live");
 if(heroFrame){
  const depth=document.createElement("div");depth.className="rs-living-depth";depth.setAttribute("aria-hidden","true");
  depth.innerHTML='<span class="rs-depth-ring rs-depth-ring-a"></span><span class="rs-depth-ring rs-depth-ring-b"></span><span class="rs-depth-cross"></span><span class="rs-depth-caption">A WORLD BUILT FRAME BY FRAME</span>';
  heroFrame.append(depth);
 }
 const cards=[...document.querySelectorAll(".project-card")];
 cards.forEach((card,i)=>{card.classList.add("rs-living-card");card.style.setProperty("--rs-card-index",i%4);});
 const headings=[...document.querySelectorAll(".section-heading h2,.video-gallery-heading h3,.about-content h2,.contact-section h2")];
 headings.forEach(el=>el.classList.add("rs-living-heading"));
 let ticking=false;
 const update=()=>{
  const y=window.scrollY||0;
  if(heroFrame){const r=heroFrame.getBoundingClientRect();const progress=Math.max(-1,Math.min(1,(window.innerHeight*.75-r.top)/(window.innerHeight+r.height)));heroFrame.style.setProperty("--rs-scroll-depth",(progress*24).toFixed(2)+"px");heroFrame.style.setProperty("--rs-scroll-rotate",(progress*2.2).toFixed(2)+"deg");}
  cards.forEach((card,i)=>{const r=card.getBoundingClientRect();const p=Math.max(-1,Math.min(1,(window.innerHeight*.78-r.top)/(window.innerHeight+r.height)));card.style.setProperty("--rs-scroll-y",(p*13).toFixed(2)+"px");});
  ticking=false;
 };
 const onScroll=()=>{if(!ticking){ticking=true;requestAnimationFrame(update);}};
 window.addEventListener("scroll",onScroll,{passive:true});window.addEventListener("resize",onScroll,{passive:true});update();
 if("IntersectionObserver"in window){
  const io=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("rs-in-view");io.unobserve(entry.target);}}),{threshold:.16});
  [...cards,...headings].forEach(el=>io.observe(el));
 }
}
function watch(){
 const root=document.documentElement;
 if(root.classList.contains("zaid-choreo-live")){run();return;}
 const observer=new MutationObserver(()=>{if(root.classList.contains("zaid-choreo-live")){observer.disconnect();run();}});
 observer.observe(root,{attributes:true,attributeFilter:["class"]});
 // The post-intro runtime may add its live class after the intro completion event.
 window.setTimeout(()=>{if(root.classList.contains("zaid-choreo-live"))run();},13000);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",watch,{once:true});else watch();
})();