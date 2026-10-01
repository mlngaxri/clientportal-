/* Shared UI integration: preserve useful contextual controls for the active surface. */
(() => {
 const previousShow=showView;
 showView=function(name){
  previousShow(name);
  qs('#saveBtn').hidden=!['review','direction'].includes(name);
  qs('#mobileContext').hidden=['settings'].includes(name);
 };
 showView(currentView);
})();

/* Give first-time visitors a useful starting point without reloading their draft. */
(()=>{
 const views=['overview','direction','build','review','pages','analytics','seo','domains','connections','states','billing','launch','settings'];
 const guide=document.createElement('div');guide.className='review-guide';guide.setAttribute('aria-live','polite');
 const panel=qs('[data-view-panel="review"]');panel.insertBefore(guide,qs('.stage',panel));
 function updateGuide(){
  const copy={
   'Review mode':['Collect the changes you want.','Click text or an image to add a Direction. Submit your Directions together when the whole round is ready.'],
   'Edit site':['Update words and images directly.','Click text to edit it, or an image to replace it. Save to keep your changes on this device.'],
   'Browse mode':['See the website as a visitor.','Use the pages and navigation to explore the website. Switch to Review mode to add feedback.'],
  }[currentMode];
  guide.replaceChildren();const title=document.createElement('b'),text=document.createElement('p');title.textContent=copy[0];text.textContent=copy[1];guide.append(title,text);
 }
 const previousEdit=applyEditMode;applyEditMode=function(){previousEdit();updateGuide();};updateGuide();
 const open=view=>{if(views.includes(view))showView(view);};
 addEventListener('message',event=>{if(event.source!==parent||event.origin!==location.origin||event.data?.type!=='fourthform:preview-view')return;open(event.data.view);});
 open(new URLSearchParams(location.search).get('view'));
})();
