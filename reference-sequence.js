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
 window.setTimeout(()=>{layer.classList.add("is-leaving");window.setTimeout(()=>layer.remove(),1250);},6100);
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