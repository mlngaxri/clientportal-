/* First-party, anonymous aggregate analytics. No cookies or browser storage. */
(()=>{const script=document.currentScript,project=script?.dataset.project,pageId=script?.dataset.page;if(!project||!pageId||navigator.doNotTrack==='1'||navigator.globalPrivacyControl)return;
 const send=kind=>{const body=JSON.stringify({id:crypto.randomUUID(),pageId,kind,referrer:document.referrer?new URL(document.referrer).hostname:''});fetch(`/api/collect/${project}`,{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true}).catch(()=>{});};
 send('pageview');document.addEventListener('click',event=>{if(event.target instanceof Element&&event.target.closest('[data-fourthform-event="cta"]'))send('cta');});
})();
