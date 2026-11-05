(()=>{"use strict";
const DEFAULTS={style:"progress",brand:"ZAID®",tagline:"VISUAL STORYTELLER · VIDEO EDITOR",duration:3.5,frequency:"session",background:"#090909",accent:"#c6a875",skip:true,enabled:true};
const validColor=v=>/^#[0-9a-f]{6}$/i.test(v||"");
const readSettings=async()=>{try{if(!window.supabase)return DEFAULTS;const db=window.supabase.createClient("https://rtaedoseedjwljixmrgy.supabase.co","sb_publishable__Oc_xT1AELiVIQgCgXytTQ_qxLd_ZFo");const {data,error}=await db.from("portfolio_theme_settings").select("settings").eq("id",true).maybeSingle();if(error)return DEFAULTS;return {...DEFAULTS,...(data?.settings?.__loadingIntro||{})};}catch(_){return DEFAULTS;}};
const launch=async()=>{const s=await readSettings();const continueSite=()=>document.dispatchEvent(new Event("zaid:intro:complete"));if(!s.enabled){continueSite();return;}const reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;if(reduced){continueSite();return;}
if(s.frequency==="session"){try{if(sessionStorage.getItem("zaidIntroSeen")==="1"){continueSite();return;}sessionStorage.setItem("zaidIntroSeen","1");}catch(_){}}
if(document.getElementById("cci-dedicated-overlay"))return;
const root=document.createElement("div");root.id="cci-dedicated-overlay";root.className="combined-cinematic-intro";root.dataset.style=["progress","brand","notebook"].includes(s.style)?s.style:"progress";root.setAttribute("role","presentation");root.setAttribute("aria-label","Welcome to Zaid's portfolio");
root.style.setProperty("--cci-bg",validColor(s.background)?s.background:DEFAULTS.background);root.style.setProperty("--cci-accent",validColor(s.accent)?s.accent:DEFAULTS.accent);root.style.setProperty("--cci-duration",Math.max(1,Math.min(8,Number(s.duration)||3.5))+"s");
const backdrop=document.createElement("div");backdrop.className="cci-backdrop";const heroMedia=document.querySelector(".hero-frame video,.hero-frame img");if(heroMedia){const clone=heroMedia.cloneNode(true);clone.removeAttribute("id");clone.removeAttribute("autoplay");clone.muted=true;clone.loop=true;clone.playsInline=true;backdrop.append(clone);if(clone.tagName==="VIDEO"){clone.autoplay=true;clone.play().catch(()=>{});}}
const doors=document.createElement("div");doors.className="cci-doors";doors.append(document.createElement("span"),document.createElement("span"));
const content=document.createElement("div");content.className="cci-content";const eyebrow=document.createElement("small");eyebrow.textContent=String(s.brand||DEFAULTS.brand).slice(0,28);const title=document.createElement("h1");title.textContent="Welcome to my portfolio website.";const tagline=document.createElement("p");tagline.className="cci-tagline";tagline.textContent=String(s.tagline||"").slice(0,70);const line=document.createElement("i");content.append(eyebrow,title,tagline,line);
const progress=document.createElement("div");progress.className="cci-progress";const progressFill=document.createElement("span");progress.append(progressFill);
root.append(backdrop,doors,content);if(root.dataset.style==="progress")root.append(progress);
if(s.skip){const skip=document.createElement("button");skip.type="button";skip.className="cci-skip";skip.textContent="SKIP INTRO ↗";root.append(skip);skip.addEventListener("click",finish,{once:true});}
document.body.append(root);document.documentElement.classList.add("cci-lock");
let ended=false;const duration=Math.max(1,Math.min(8,Number(s.duration)||3.5))*1000;const start=performance.now();
function finish(){if(ended)return;ended=true;root.classList.add("cci-exit");document.documentElement.classList.remove("cci-lock");setTimeout(()=>{root.remove();document.dispatchEvent(new Event("zaid:intro:complete"));},950);}
function tick(now){if(ended)return;const p=Math.min(1,(now-start)/duration);progressFill.style.transform="scaleX("+p+")";if(p>=1)finish();else requestAnimationFrame(tick);}
requestAnimationFrame(tick);
};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(launch,180),{once:true});else setTimeout(launch,180);
})();