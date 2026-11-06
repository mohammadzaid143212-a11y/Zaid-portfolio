(()=>{"use strict";
const doors=[...document.querySelectorAll(".zaid-door")];
if(!doors.length)return;
const reduce=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
doors.forEach(door=>{
  door.addEventListener("click",event=>{
    const target=door.getAttribute("href");
    if(!target||!target.startsWith("#")||reduce)return;
    event.preventDefault();
    doors.forEach(item=>item.classList.remove("is-opening"));
    door.classList.add("is-opening");
    window.setTimeout(()=>{
      door.classList.remove("is-opening");
      const destination=document.querySelector(target);
      if(destination){
        destination.scrollIntoView({behavior:"smooth",block:"start"});
        if(history.replaceState)history.replaceState(null,"",target);
      }
    },620);
  });
});
})();