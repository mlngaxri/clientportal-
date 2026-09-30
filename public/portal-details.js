/* Fine-grained polish without external service calls. */
(()=>{
 const $=s=>document.querySelector(s);
 const menu=$('#mobileMenu'),context=$('#mobileContext');
 menu.setAttribute('aria-controls','leftRail');context.setAttribute('aria-controls','contextRail');
 $('#toast').setAttribute('role','status');$('#toast').setAttribute('aria-atomic','true');
 $('#saveState').setAttribute('aria-atomic','true');
 $('#saveBtn').title='Save on this device (Ctrl/⌘ S)';
 $('#addDirection').title='Add a Direction to this page';
 const labels={widthRange:'Website preview width',heightRange:'Website preview height'};
 Object.entries(labels).forEach(([id,label])=>$('#'+id)?.setAttribute('aria-label',label));
 let drawerTrigger=null;
 const updateDrawers=()=>{
  [[menu,$('#leftRail')],[context,$('#contextRail')]].forEach(([button,rail])=>{
   const open=rail.classList.contains('open');button.setAttribute('aria-expanded',String(open));
   button.setAttribute('aria-label',open?'Close '+(button===menu?'navigation':'contextual panel'):'Open '+(button===menu?'navigation':'contextual panel'));
  });
 };
 [menu,context].forEach(b=>b.addEventListener('click',()=>{drawerTrigger=b;updateDrawers();const rail=b===menu?$('#leftRail'):$('#contextRail');if(rail.classList.contains('open'))rail.querySelector('button:not(:disabled),input,textarea')?.focus();}));
 for(const rail of [$('#leftRail'),$('#contextRail')])new MutationObserver(updateDrawers).observe(rail,{attributes:true,attributeFilter:['class']});
 updateDrawers();
 addEventListener('keydown',e=>{
  if(e.key==='Escape'&&($('#leftRail').classList.contains('open')||$('#contextRail').classList.contains('open'))){e.preventDefault();e.stopImmediatePropagation();closeDrawers();drawerTrigger?.focus();}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){
   e.preventDefault();if(document.querySelector('.modal-backdrop.open'))return;
   if(['review','direction'].includes(currentView))$('#saveBtn').click();
   else $(`[data-view-panel="${currentView}"] [data-ops="save-cms"], [data-view-panel="${currentView}"] [data-ops="save"], [data-view-panel="${currentView}"] [data-ops="save-state"]`)?.click();
  }
 },true);
 const previousShow=showView;
 showView=function(name){previousShow(name);document.querySelectorAll('#leftRail [data-view],#leftRail [data-stage],#mobileDock [data-view]').forEach(b=>{const active=(b.dataset.view||b.dataset.stage)===name;if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});};
 const previousSelect=selectPage;
 selectPage=function(name){previousSelect(name);document.querySelectorAll('.canvasbar [data-page]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.page===name)));};
 function counter(field,max,preferred){
  const input=$(`[data-field="${field}"]`);if(!input||input.dataset.detailCounter)return;
  input.dataset.detailCounter='true';const note=document.createElement('small');note.className='detail-counter';note.id='detail-'+field;
  input.after(note);input.setAttribute('aria-describedby',note.id);
  const update=()=>{const n=input.value.length;note.textContent=`${n} / ${max} characters${preferred?' · Suggested '+preferred:''}`;note.classList.toggle('warning',!!preferred&&n>max);};
  input.addEventListener('input',update);update();
 }
 let scheduled=false;
 function details(){
  counter('heading',120);counter('description',1200);counter('cta',80);counter('imageAlt',180);counter('seoTitle',65,'20–65');counter('seoDescription',160,'70–160');
  const upload=$('[data-cms-image]');if(upload&&!upload.dataset.detailHint){upload.dataset.detailHint='true';const note=document.createElement('p');note.className='detail-hint';note.textContent='JPG, PNG or WebP · up to 1.5 MB';upload.closest('label').after(note);}
  const domain=$('[data-field="domain"]');if(domain){domain.autocapitalize='none';domain.spellcheck=false;domain.setAttribute('inputmode','url');domain.setAttribute('autocomplete','off');}
  document.querySelectorAll('.ops-table').forEach(t=>{if(!t.getAttribute('aria-label'))t.setAttribute('aria-label',t.closest('.ops-box')?.querySelector('h3')?.textContent||'Website details');});
 }
 new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;details();});}).observe($('.center'),{childList:true,subtree:true});
 details();showView(currentView);selectPage(currentPage);
})();
