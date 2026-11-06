(()=>{"use strict";
const canvas=document.querySelector(".frame-world-canvas");
if(!canvas)return;
const ctx=canvas.getContext("2d",{alpha:true,desynchronized:true});
if(!ctx)return;
const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
let w=0,h=0,dpr=1,raf=0,last=0,elapsed=0;
let px=0,py=0,tx=0,ty=0;
const mobile=matchMedia("(max-width:760px)").matches;
const count=mobile?42:88;
const dust=Array.from({length:count},(_,i)=>({x:Math.random(),y:Math.random(),z:Math.random(),r:.35+Math.random()*1.3,a:.15+Math.random()*.45,s:.08+Math.random()*.24}));
function resize(){
 const r=canvas.getBoundingClientRect();w=Math.max(1,r.width);h=Math.max(1,r.height);
 dpr=Math.min(devicePixelRatio||1,1.6);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
 ctx.setTransform(dpr,0,0,dpr,0,0);
}
function line(x1,y1,x2,y2,color,width=1){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
function frame(z,index){
 const perspective=.16+z*1.18;
 const cx=w*(.5+px*.035),cy=h*(.48+py*.035);
 const scale=perspective;
 const baseW=Math.min(w*.76,760),baseH=Math.min(h*.82,560);
 const fw=baseW*scale,fh=baseH*scale;
 const drift=Math.sin(elapsed*.00022+index*.8)*w*.025*(.25+z);
 const x=cx-fw/2+drift,y=cy-fh/2+Math.cos(elapsed*.00018+index)*h*.018;
 const alpha=.09+z*.46;
 ctx.save();ctx.globalAlpha=alpha;
 ctx.strokeStyle=index%3===0?"#c84b4d":"#d8c5a0";ctx.lineWidth=.5+z*1.25;
 ctx.strokeRect(x,y,fw,fh);
 ctx.strokeStyle="#f1e8d7";ctx.globalAlpha=alpha*.38;ctx.lineWidth=1;
 const c=Math.max(5,fw*.045);
 [[x,y,1,1],[x+fw,y,-1,1],[x,y+fh,1,-1],[x+fw,y+fh,-1,-1]].forEach(([a,b,sx,sy])=>{
  line(a,b,a+sx*c,b,"#ead9bb",1);line(a,b,a,b+sy*c,"#ead9bb",1);
 });
 if(index%2===0){
  ctx.globalAlpha=alpha*.22;line(x+fw*.08,y+fh*.84,x+fw*.92,y+fh*.84,"#e5d6bd",.6);
 }
 ctx.restore();
}
function draw(t){
 if(!last)last=t;const dt=Math.min(40,t-last);last=t;elapsed+=dt;
 px+=(tx-px)*.035;py+=(ty-py)*.035;
 ctx.clearRect(0,0,w,h);
 const bg=ctx.createRadialGradient(w*.52,h*.45,0,w*.52,h*.45,Math.max(w,h)*.72);
 bg.addColorStop(0,"#252323");bg.addColorStop(.48,"#111112");bg.addColorStop(1,"#080809");
 ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
 const glow=ctx.createRadialGradient(w*(.5+px*.04),h*(.5+py*.04),0,w*.5,h*.5,w*.52);
 glow.addColorStop(0,"#8f262b25");glow.addColorStop(.55,"#7a25200a");glow.addColorStop(1,"#00000000");
 ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
 // A sequence of receding film gates creates a continuous camera-travel illusion.
 const gates=mobile?8:11;
 for(let i=gates-1;i>=0;i--){
  const z=((i/gates+(elapsed*.000055)%1)%1);
  frame(z,i);
 }
 // Fine red guide lines converge at the vanishing point.
 const vx=w*(.5+px*.035),vy=h*(.48+py*.035);
 ctx.globalAlpha=.24;
 line(0,h*.12,vx,vy,"#a33b3e",.7);line(w,h*.12,vx,vy,"#a33b3e",.7);
 line(0,h*.9,vx,vy,"#a33b3e",.7);line(w,h*.9,vx,vy,"#a33b3e",.7);
 ctx.globalAlpha=1;
 // Dust moves through the lens at different apparent depths.
 dust.forEach(p=>{
  p.y-=p.s*dt*.00012*(.4+p.z);if(p.y<0){p.y=1;p.x=Math.random();}
  const x=p.x*w+px*14*p.z,y=p.y*h+py*10*p.z;
  ctx.beginPath();ctx.arc(x,y,p.r*(.5+p.z),0,Math.PI*2);
  ctx.fillStyle="rgba(235,218,190,"+(p.a*(.25+p.z*.75))+")";ctx.fill();
 });
 // Centre aperture: a quiet focus point, not a fake play button.
 const pulse=.5+Math.sin(elapsed*.0012)*.12;
 ctx.beginPath();ctx.arc(vx,vy,Math.min(w,h)*.018*pulse,0,Math.PI*2);
 ctx.strokeStyle="#c64a4d88";ctx.lineWidth=1;ctx.stroke();
 ctx.beginPath();ctx.arc(vx,vy,Math.min(w,h)*.005,0,Math.PI*2);ctx.fillStyle="#e7d5b8";ctx.fill();
 // Film-like vignette.
 const vignette=ctx.createRadialGradient(w*.5,h*.48,Math.min(w,h)*.18,w*.5,h*.48,Math.max(w,h)*.72);
 vignette.addColorStop(0,"#00000000");vignette.addColorStop(1,"#000000b8");
 ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
 if(!reduced&&!document.hidden)raf=requestAnimationFrame(draw);
}
function pointer(e){const r=canvas.getBoundingClientRect();tx=((e.clientX-r.left)/r.width-.5)*2;ty=((e.clientY-r.top)/r.height-.5)*2;}
canvas.addEventListener("pointermove",pointer,{passive:true});
canvas.addEventListener("pointerleave",()=>{tx=0;ty=0;},{passive:true});
window.addEventListener("resize",resize,{passive:true});
document.addEventListener("visibilitychange",()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;last=0;}else if(!reduced&&!raf)raf=requestAnimationFrame(draw);});
resize();
if(reduced){draw(0);cancelAnimationFrame(raf);raf=0;}else raf=requestAnimationFrame(draw);
})();