(()=>{"use strict";
const reduce=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
let launched=false;
function run(){
 if(launched)return;
 const heroFrame=document.querySelector(".hero-frame");if(!heroFrame)return;
 launched=true;
 const layer=document.createElement("div");
 layer.className="reference-sequence-layer";
 layer.setAttribute("aria-hidden","true");
 layer.innerHTML='<div class="rs-atmosphere"></div><div class="rs-grid"></div><div class="rs-edge"></div><div class="rs-gate"><i class="rs-gate-panel"></i><i class="rs-gate-panel"></i></div><div class="rs-center-mark">ZAID®</div><div class="rs-orbit"></div><div class="rs-frame-stack"><div class="rs-frame rs-frame-one"><span>01 / STORY</span></div><div class="rs-frame rs-frame-two"><span>02 / MOTION</span></div><div class="rs-frame rs-frame-three"><span>03 / ATMOSPHERE</span></div></div><div class="rs-kinetic"><span class="rs-kinetic-kicker">INDEPENDENT VIDEO EDITOR · VISUAL STORYTELLER</span><h2 class="rs-kinetic-title"><span>Frames</span> <span>into</span><br><span>feeling</span><span>.</span></h2><span class="rs-kinetic-foot">A VISUAL STORY BY ZAID</span></div><div class="rs-light-sweep"></div>';
 heroFrame.append(layer);
 // Keep the sequence in the marked hero area, then clear it to reveal the real portfolio.
 window.setTimeout(()=>{layer.classList.add("is-leaving");window.setTimeout(()=>{layer.remove();activateFrameAmbience(heroFrame);},1250);},6100);
}
function activateFrameAmbience(heroFrame){
 // Keep all post-intro motion confined to the framed visual stage.
 const depth=document.createElement("div");depth.className="rs-living-depth";depth.setAttribute("aria-hidden","true");
 depth.innerHTML='<span class="rs-depth-ring rs-depth-ring-a"></span><span class="rs-depth-ring rs-depth-ring-b"></span><span class="rs-depth-cross"></span><span class="rs-live-frame rs-live-frame-a"><i></i><b>01 / STORY</b></span><span class="rs-live-frame rs-live-frame-b"><i></i><b>02 / MOTION</b></span><span class="rs-live-beam"></span>';
 heroFrame.append(depth);
 heroFrame.classList.add("rs-frame-experience-live");
}
function watch(){
 // Listen to the exact intro-complete event; do not depend on a CSS class race.
 document.addEventListener("zaid:intro:complete",run,{once:true});
 // If the intro is disabled/already completed before this file initializes, start safely.
 if(document.documentElement.classList.contains("zaid-choreo-live"))run();
 window.setTimeout(()=>{if(!launched&&!document.getElementById("cci-dedicated-overlay"))run();},14000);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",watch,{once:true});else watch();
})();