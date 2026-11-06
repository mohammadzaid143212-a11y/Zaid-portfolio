(()=>{"use strict";
const canvas=document.querySelector("#world");
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
const opening=document.querySelector("#opening");
const progress=document.querySelector("#progress");
const doors=[...document.querySelectorAll(".door")];
const reveal=document.querySelector("#revealWorld");
const title=document.querySelector("#worldTitle"),sub=document.querySelector("#worldSub"),copy=document.querySelector("#worldCopy"),idx=document.querySelector("#worldIndex");
let scene3d=null,renderer=null,camera=null,raf=0,scrollTarget=0,mouseX=0,mouseY=0;
function fallback(){
 const ctx=canvas.getContext("2d");let w=0,h=0,t=0;
 function size(){w=innerWidth;h=innerHeight;canvas.width=w*devicePixelRatio;canvas.height=h*devicePixelRatio;ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0)}
 function draw(){t+=.01;ctx.clearRect(0,0,w,h);let g=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,Math.max(w,h));g.addColorStop(0,"#352024");g.addColorStop(1,"#08090b");ctx.fillStyle=g;ctx.fillRect(0,0,w,h);for(let i=12;i>=0;i--){let z=((i/13+t*.008)%1),s=.08+z*1.2;ctx.strokeStyle=i%3?"#b99f7b":"#bd343c";ctx.globalAlpha=.12+z*.35;ctx.strokeRect(w/2-w*.4*s,h/2-h*.38*s,w*.8*s,h*.76*s)}ctx.globalAlpha=1;if(!reduce)raf=requestAnimationFrame(draw)}
 size();draw();addEventListener("resize",size);
}
async function build3D(){
 try{
  const THREE=await import("https://cdn.jsdelivr.net/npm/three@0.166.1/build/three.module.js");
  scene3d=new THREE.Scene();scene3d.background=new THREE.Color("#08090b");scene3d.fog=new THREE.FogExp2("#08090b",.052);
  camera=new THREE.PerspectiveCamera(52,innerWidth/innerHeight,.1,180);camera.position.set(0,0,8);
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:"high-performance"});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.65));renderer.setSize(innerWidth,innerHeight,false);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
  scene3d.add(new THREE.AmbientLight(0x9b8b7d,.62));
  const red=new THREE.PointLight(0xc52c38,34,24);red.position.set(-2,1,-7);scene3d.add(red);
  const warm=new THREE.PointLight(0xd7b98d,26,30);warm.position.set(3,-1,-17);scene3d.add(warm);
  const blue=new THREE.PointLight(0x647b9c,14,18);blue.position.set(1,3,-26);scene3d.add(blue);
  const tunnel=new THREE.Group();scene3d.add(tunnel);
  const metal=new THREE.MeshStandardMaterial({color:0x262326,metalness:.82,roughness:.32,side:THREE.DoubleSide});
  const edge=new THREE.MeshStandardMaterial({color:0x9e3038,emissive:0x4a0b12,emissiveIntensity:1.15,metalness:.5,roughness:.35});
  const gold=new THREE.MeshStandardMaterial({color:0xc5ae88,emissive:0x3a2415,emissiveIntensity:.5,metalness:.7,roughness:.28});
  for(let i=0;i<15;i++){
   const z=-i*2.1,scale=1+i*.13;
   const frame=new THREE.Group();frame.position.z=z;frame.scale.setScalar(scale);
   const bars=[[.0,1.8,.12,3.8],[0,-1.8,.12,3.8],[-2,0,4,.12],[2,0,4,.12]];
   bars.forEach(([x,y,sx,sy],j)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,.12),j===0&&i%3===0?edge:metal);m.position.set(x,y,0);frame.add(m)});
   const inner=new THREE.Mesh(new THREE.BoxGeometry(3.72,3.55,.025),new THREE.MeshBasicMaterial({color:i%3===0?0x3d151b:0x171619,transparent:true,opacity:.16,side:THREE.DoubleSide}));inner.position.z=-.08;frame.add(inner);
   const topLine=new THREE.Mesh(new THREE.BoxGeometry(3.7,.018,.025),gold);topLine.position.set(0,1.55,.08);frame.add(topLine);
   tunnel.add(frame);
  }
  // Suspended practical lights and fine floating particles give the camera real depth cues.
  for(let i=0;i<30;i++){const geo=new THREE.SphereGeometry(.018+Math.random()*.025,6,6);const mat=new THREE.MeshBasicMaterial({color:i%4===0?0xd8a36c:0xe5ddd0,transparent:true,opacity:.35+Math.random()*.45});const p=new THREE.Mesh(geo,mat);p.position.set((Math.random()-.5)*7,(Math.random()-.5)*5,-Math.random()*31);p.userData.speed=.15+Math.random()*.4;scene3d.add(p);dust.push(p)}
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0x111013,metalness:.6,roughness:.55}));floor.rotation.x=-Math.PI/2;floor.position.y=-2.4;floor.position.z=-12;scene3d.add(floor);
  const clock=new THREE.Clock();
  function render(){
   const dt=Math.min(clock.getDelta(),.04),time=clock.elapsedTime;
   const scroll=window.scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight);
   const targetZ=8-scroll*10.5;
   camera.position.z+=(targetZ-camera.position.z)*.035;
   camera.position.x+=(mouseX*.48-camera.position.x)*.025;
   camera.position.y+=(-mouseY*.28-camera.position.y)*.025;
   camera.rotation.z=Math.sin(time*.16)*.006;
   red.intensity=30+Math.sin(time*1.3)*5;
   dust.forEach(p=>{p.position.z+=p.userData.speed*dt;if(p.position.z>4)p.position.z=-34});
   renderer.render(scene3d,camera);
   if(!reduce&&!document.hidden)raf=requestAnimationFrame(render);
  }
  window.addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.65))},{passive:true});
  if(!reduce)raf=requestAnimationFrame(render);else renderer.render(scene3d,camera);
 }catch(e){console.warn("WebGL scene unavailable; using lightweight fallback.",e);fallback()}
}
const dust=[];
canvas.addEventListener("pointermove",e=>{mouseX=(e.clientX/innerWidth-.5)*2;mouseY=(e.clientY/innerHeight-.5)*2},{passive:true});
canvas.addEventListener("pointerleave",()=>{mouseX=mouseY=0},{passive:true});
document.addEventListener("visibilitychange",()=>{if(document.hidden)cancelAnimationFrame(raf);else if(scene3d&&!reduce)raf=requestAnimationFrame(()=>{const ev=new Event("resize");dispatchEvent(ev)})});
build3D();
document.querySelector("#enter").addEventListener("click",()=>document.querySelector("#manifesto").scrollIntoView({behavior:reduce?"auto":"smooth"}));
doors.forEach(d=>d.addEventListener("click",()=>{
 doors.forEach(x=>x.classList.remove("is-opening"));d.classList.add("is-opening");
 title.textContent=d.dataset.world;sub.textContent=d.dataset.sub;copy.textContent=d.dataset.copy;idx.textContent="WORLD "+d.dataset.num;
 reveal.classList.add("active");
 setTimeout(()=>d.classList.remove("is-opening"),reduce?0:950);
 setTimeout(()=>reveal.scrollIntoView({behavior:reduce?"auto":"smooth",block:"center"}),reduce?0:350);
}));
document.querySelector("#closeWorld").addEventListener("click",()=>{reveal.classList.remove("active");document.querySelector("#worlds").scrollIntoView({behavior:reduce?"auto":"smooth"})});
addEventListener("scroll",()=>{const max=document.documentElement.scrollHeight-innerHeight;progress.style.width=(max?scrollY/max*100:0)+"%"},{passive:true});
const sound=document.querySelector("#sound");sound.addEventListener("click",()=>{const on=sound.getAttribute("aria-pressed")!=="true";sound.setAttribute("aria-pressed",String(on));sound.firstChild.textContent=on?"SOUND ON ":"SOUND OFF ";sound.querySelector("i").style.background=on?"#d04a4e":"#a9a39b"});
})();