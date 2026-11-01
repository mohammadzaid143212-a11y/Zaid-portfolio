(() => {
  "use strict";
  if(!window.supabase)return;
  const URL="https://rtaedoseedjwljixmrgy.supabase.co";
  const KEY="sb_publishable__Oc_xT1AELiVIQgCgXytTQ_qxLd_ZFo";
  const db=window.supabase.createClient(URL,KEY);
  function sessionKey(){
    try{let key=localStorage.getItem("zaid_analytics_session");if(!key){key=crypto.randomUUID();localStorage.setItem("zaid_analytics_session",key);}return key;}
    catch{return crypto.randomUUID();}
  }
  function send(type,id=null){
    const key=sessionKey(),path=location.pathname.slice(0,300)||"/";
    const once="zaid_analytics_"+type+"_"+path+(id||"");
    try{if(sessionStorage.getItem(once))return;sessionStorage.setItem(once,"1");}catch{}
    db.from("portfolio_analytics").insert({event_type:type,project_id:id,session_key:key,page_path:path}).then(()=>{}).catch(()=>{});
  }
  send("page_view");
  const id=new URLSearchParams(location.search).get("id");
  if(id&&/^[0-9a-f-]{36}$/i.test(id))send("project_view",id);
})();