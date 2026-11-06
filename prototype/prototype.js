(()=>{"use strict";
const progress=document.querySelector("#progress");
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
let ticking=false;
function update(){const max=document.documentElement.scrollHeight-innerHeight;progress.style.width=(max?scrollY/max*100:0)+"%";ticking=false}
addEventListener("scroll",()=>{if(!ticking){requestAnimationFrame(update);ticking=true}},{passive:true});
document.querySelectorAll(".world").forEach(button=>button.addEventListener("click",()=>{
 const target=document.getElementById(button.dataset.target);
 if(target)target.scrollIntoView({behavior:reduce?"auto":"smooth",block:"center"});
}));
const images=[...document.querySelectorAll("img")];
if("IntersectionObserver"in window){
 const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
  if(entry.isIntersecting){entry.target.classList.add("is-visible");observer.unobserve(entry.target)}
 }),{rootMargin:"120px"});
 images.forEach(img=>observer.observe(img));
}
update();
})();