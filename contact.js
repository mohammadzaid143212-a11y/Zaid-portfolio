const SUPABASE_URL="https://rtaedoseedjwljixmrgy.supabase.co";
const SUPABASE_PUBLIC_KEY="sb_publishable__Oc_xT1AELiVIQgCgXytTQ_qxLd_ZFo";
const CONTACT_EMAIL="mohammadzaid143212@gmail.com";
const WHATSAPP_NUMBER="918857020261";
const INSTAGRAM_URL="https://www.instagram.com/the_shaikhzaid/";
const form=document.querySelector("#inquiry-form");
const status=document.querySelector("#form-status");
const year=document.querySelector("#year");
if(year) year.textContent=new Date().getFullYear();

function showStatus(message,isError=false){
  if(!status)return;
  status.textContent=message;
  status.classList.toggle("error",isError);
}
function buildContactBody(v){
  return encodeURIComponent("New portfolio inquiry\nName: "+v.name+"\nEmail: "+v.email+"\nProject: "+v.projectType+"\nBudget: "+v.budget+"\nDeadline: "+v.deadline+"\nDetails: "+v.details);
}
if(form) form.addEventListener("submit",async event=>{
  event.preventDefault();
  if(!form.reportValidity())return;
  const data=new FormData(form);
  // Quiet honeypot: bots filling this field are not submitted or redirected.
  if(String(data.get("website")||"").trim())return;
  const values={
    name:String(data.get("name")||"").trim().slice(0,100),
    email:String(data.get("email")||"").trim().slice(0,160),
    projectType:String(data.get("projectType")||"").trim().slice(0,100),
    budget:String(data.get("budget")||"").trim().slice(0,80),
    deadline:String(data.get("deadline")||"Flexible").trim().slice(0,80),
    details:String(data.get("details")||"").trim().slice(0,3000),
    method:["email","whatsapp","instagram"].includes(String(data.get("method"))) ? String(data.get("method")) : "email"
  };
  const submit=form.querySelector('[type="submit"]');
  if(submit)submit.disabled=true;
  showStatus("Saving your inquiry…");
  // Open a tab synchronously for channels that require one, avoiding popup blocking.
  const contactWindow=values.method==="whatsapp"||values.method==="instagram" ? window.open("about:blank","_blank") : null;
  let saved=false;
  try{
    if(!window.supabase)throw new Error("The inquiry service is unavailable.");
    const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLIC_KEY);
    const {error}=await client.from("portfolio_inquiries").insert({
      name:values.name,email:values.email,project_type:values.projectType,budget:values.budget,
      deadline:values.deadline,details:values.details,preferred_contact:values.method
    });
    if(error)throw error;
    saved=true;
  }catch(error){
    showStatus("Your contact channel will still open, but the inquiry could not be saved to the owner inbox. "+(error.message||"Please try again."),true);
  }
  const body=buildContactBody(values);
  if(values.method==="email")window.location.href="mailto:"+CONTACT_EMAIL+"?subject="+encodeURIComponent("Portfolio inquiry — "+values.projectType)+"&body="+body;
  else if(values.method==="whatsapp"){
    if(contactWindow)contactWindow.location.href="https://wa.me/"+WHATSAPP_NUMBER+"?text="+body;
  }else if(contactWindow)contactWindow.location.href=INSTAGRAM_URL;
  if(saved)showStatus("Inquiry saved to Zaid’s project inbox. Your selected contact channel is opening now.");
  if(submit)submit.disabled=false;
});
