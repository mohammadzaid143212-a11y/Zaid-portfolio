(()=>{"use strict";
const canvas=document.querySelector("#world"),ctx=canvas.getContext("2d");
let w=0,h=0,dpr=1,t=0,px=0,py=0,tx=0,ty=0,raf=0,last=0;
const dust=Array.from({length:100},()=>({x:Math.random(),y:Math.random(),z:Math.random(),r:.3+Math.random()*1.2,s:.05+Math.random()*.2}));
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
function resize(){w=innerWidth;h=innerHeight;dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)}
function stroke(x,y,X,Y,c,a=1,l=1){ctx.globalAlpha=a;ctx.strokeStyle=c;ctx.lineWidth=l;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(X,Y);ctx.stroke()}
function draw(now){if(!last)last=now;let dt=Math.min(40,now-last);last=now;t+=dt;px+=(tx-px)*.035;py+=(ty-py)*.035;ctx.clearRect(0,0,w,h);
let bg=ctx.createRadialGradient(w*.52,h*.46,0,w*.52,h*.46,Math.max(w,h)*.8);bg.addColorStop(0,"#282022");bg.addColorStop(.45,"#111012");bg.addColorStop(1,"#070708");ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
let vx=w*(.5+px*.035),vy=h*(.49+py*.025);
for(let i=13;i>=0;i--){let z=((i/13+t*.000065)%1),s=.08+z*1.2,fw=w*.42*s,fh=h*.52*s,x=vx-fw/2+Math.sin(t*.0002+i)*w*.018*s,y=vy-fh/2;ctx.strokeStyle=i%3===0?"#a9363d":"#d2b990";ctx.globalAlpha=.1+z*.35;ctx.lineWidth=.5+z;ctx.strokeRect(x,y,fw,fh);let c=Math.max(4,fw*.04);[[x,y,1,1],[x+fw,y,-1,1],[x,y+fh,1,-1],[x+fw,y+fh,-1,-1]].forEach(([a,b,sx,sy])=>{stroke(a,b,a+sx*c,b,"#e5d5b9",.45,1);stroke(a,b,a,b+sy*c,"#e5d5b9",.45,1)})}
for(let p of dust){p.y-=p.s*dt*.00012;if(p.y<0){p.y=1;p.x=Math.random()}ctx.globalAlpha=.15+p.z*.45;ctx.fillStyle="#eadcc6";ctx.beginPath();ctx.arc(p.x*w+px*10*p.z,p.y*h+py*8*p.z,p.r*(.5+p.z),0,7);ctx.fill()}
ctx.globalAlpha=1;let v=ctx.createRadialGradient(w*.5,h*.48,h*.12,w*.5,h*.48,Math.max(w,h)*.72);v.addColorStop(0,"#0000");v.addColorStop(1,"#000b");ctx.fillStyle=v;ctx.fillRect(0,0,w,h);
if(!reduce&&!document.hidden)raf=requestAnimationFrame(draw)}
canvas.addEventListener("pointermove",e=>{tx=(e.clientX/w-.5)*2;ty=(e.clientY/h-.5)*2},{passive:true});canvas.addEventListener("pointerleave",()=>{tx=ty=0});addEventListener("resize",resize);document.addEventListener("visibilitychange",()=>{if(document.hidden)cancelAnimationFrame(raf);else if(!reduce)raf=requestAnimationFrame(draw)});resize();if(reduce)draw(0);else raf=requestAnimationFrame(draw);
const enter=document.querySelector("#enter");enter.addEventListener("click",()=>document.querySelector("#manifesto").scrollIntoView({behavior:"smooth"}));
const reveal=document.querySelector("#revealWorld"),title=document.querySelector("#worldTitle"),sub=document.querySelector("#worldSub"),copy=document.querySelector("#worldCopy"),idx=document.querySelector("#worldIndex");
document.querySelectorAll(".door").forEach(d=>d.addEventListener("click",()=>{document.querySelectorAll(".door").forEach(x=>x.classList.remove("is-opening"));d.classList.add("is-opening");title.textContent=d.dataset.world;sub.textContent=d.dataset.sub;copy.textContent=d.dataset.copy;idx.textContent="WORLD "+d.dataset.num;reveal.classList.add("active");setTimeout(()=>d.classList.remove("is-opening"),900);setTimeout(()=>reveal.scrollIntoView({behavior:"smooth",block:"center"}),300)}));
document.querySelector("#closeWorld").addEventListener("click",()=>{reveal.classList.remove("active");document.querySelector("#worlds").scrollIntoView({behavior:"smooth"})});
const progress=document.querySelector("#progress");addEventListener("scroll",()=>{let max=document.documentElement.scrollHeight-innerHeight;progress.style.width=(max?scrollY/max*100:0)+"%"},{passive:true});
const sound=document.querySelector("#sound");sound.addEventListener("click",()=>{const on=sound.getAttribute("aria-pressed")!=="true";sound.setAttribute("aria-pressed",String(on));sound.firstChild.textContent=on?"SOUND ON ":"SOUND OFF ";sound.querySelector("i").style.background=on?"#d04a4e":"#a9a39b"});
})();