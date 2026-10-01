/* Shared UI integration: preserve useful contextual controls for the active surface. */
(() => {
 const previousShow=showView;
 showView=function(name){
  previousShow(name);
  qs('#saveBtn').hidden=!['review','direction'].includes(name);
  qs('#mobileContext').hidden=['settings'].includes(name);
 };
 showView(currentView);
 if(space){
  document.documentElement.dataset.previewSpace=space.id;
  qsa('#leftRail [data-view],#leftRail [data-stage]').forEach(button=>{button.hidden=!space.views.includes(button.dataset.view||button.dataset.stage);});
  qsa('#leftRail [data-nav-group]').forEach(group=>{group.hidden=!qsa('button',group).some(button=>!button.hidden);});
  const header=document.createElement('div');header.className='preview-space-heading';
  const mark=document.createElement('span');mark.className='ff-frame-mark';mark.setAttribute('aria-hidden','true');
  const title=document.createElement('strong');title.textContent=space.label;
  const copy=document.createElement('p');copy.textContent='Explore freely. This space has its own saved draft.';
  const link=document.createElement('a');link.href='index.html?view='+currentView;link.target='_blank';link.rel='noopener';link.textContent='Complete workspace ↗';
  header.append(mark,title,copy,link);qs('#leftRail').prepend(header);
  const summary=qs('.revision-summary');if(summary&&space.id!=='design')summary.hidden=true;
 }
})();

/* Keep project decisions, everyday website tools and account controls easy to find. */
(()=>{
 const rail=qs('#leftRail'),summary=qs('.revision-summary',rail);
 const buttons=new Map(qsa('[data-view],[data-stage]',rail).map(button=>[button.dataset.view||button.dataset.stage,button]));
 qsa(':scope > div:not(.revision-summary)',rail).forEach(group=>group.remove());
 for(const [label,names] of [['Project',['overview','direction','build','review','launch']],['Website',['pages','analytics','seo','domains','connections','states']],['Account',['billing','settings']]]){
  const group=document.createElement('div'),title=document.createElement('div'),nav=document.createElement('div');group.dataset.navGroup=label.toLowerCase();title.className='kicker';title.textContent=label;nav.className='nav';nav.setAttribute('aria-label',label);
  names.forEach(name=>nav.append(buttons.get(name)));group.append(title,nav);rail.insertBefore(group,summary);
 }
 requestAnimationFrame(syncNavSelection);
})();

/* Give first-time visitors a useful starting point without reloading their draft. */
(()=>{
 const views=['overview','direction','build','review','pages','analytics','seo','domains','connections','states','billing','launch','settings'];
 const guide=document.createElement('div');guide.className='review-guide';guide.setAttribute('aria-live','polite');
 const panel=qs('[data-view-panel="review"]');panel.insertBefore(guide,qs('.stage',panel));
 function updateGuide(){
  const state=window.ffCommunicationFields(),review=state.revisionSubmitted?['Your revision is submitted in this preview.','Browse the website while the batch is held. Withdraw the batch to edit it, or preview a revised delivery to continue the example. No team has received it.']:state.revisionUsed>=3?['Your included review rounds are complete.','You can still browse the website and save notes. Open Launch when you’re ready to explore approval and the final checks.']:['Collect the changes you want.','Click text or an image to add a Direction, a note for your designer. Submit your Directions together when the whole round is ready.'];
  const copy={
   'Review mode':review,
   'Edit site':['Update words and images directly.','Click text to edit it, or an image to replace it. Save to keep your changes on this device.'],
   'Browse mode':['See the website as a visitor.','Use the pages and navigation to explore the website. Switch to Review mode to add feedback.'],
  }[currentMode];
  guide.replaceChildren();const title=document.createElement('b'),text=document.createElement('p');title.textContent=copy[0];text.textContent=copy[1];guide.append(title,text);
 }
 const previousEdit=applyEditMode;applyEditMode=function(){previousEdit();updateGuide();};updateGuide();
 function updateOverview(){
  const state=window.ffCommunicationFields(),submitted=state.revisionSubmitted,complete=state.revisionUsed>=3&&!submitted,round=Math.min(3,state.revisionUsed+(submitted?0:1));
  const panel=qs('[data-view-panel="overview"]'),card=qs('.overview-grid .quiet-card',panel),next=qs('.overview-grid .quiet-card:last-child',panel);
  qs('.hero-summary h2',panel).textContent=complete?'Your included review rounds are complete.':submitted?'Your Directions are ready for the next revision.':state.revisionUsed?'Your revised website is ready for review.':'Your website is ready for review.';
  qs('.hero-summary p',panel).textContent=complete?'Explore the website once more, then work through approval, the balance and the final launch checks. This is an example project; publishing is simulated.':submitted?'This batch is submitted in the local preview. You can withdraw it to make changes, or preview a revised delivery to continue. No team has received your Directions.':'Explore the working website. A Direction is a note about a change you want. Collect your Directions, then submit them together as one revision round.';
  qs('h3',card).textContent=complete?'Review rounds complete':`Revision ${String(round).padStart(2,'0')}${submitted?' · submitted':''}`;
  const rows=qsa('.status-row',card);rows[0].firstElementChild.textContent=submitted?'Submitted Directions':'Draft Directions';rows[0].lastElementChild.textContent=String(directions.length);rows[1].firstElementChild.textContent='Rounds remaining';rows[1].lastElementChild.textContent=String(Math.max(0,3-state.revisionUsed));
  qs('p',next).textContent=complete?'Open the launch checklist to explore approval and the final checks.':submitted?'Open Review to see the submitted batch, withdraw it or preview the next delivery.':'Review the site and add everything you want changed. Saving does not use a revision round.';
  const action=qs('[data-view-jump]',next);action.dataset.viewJump=complete?'launch':'review';action.textContent=complete?'Open launch checklist':submitted?'View submitted revision':'Continue review';
  updateGuide();
 }
 const previousRender=renderDirections;renderDirections=function(){previousRender();updateOverview();};updateOverview();
 const space=window.ffPreviewSpace;
 const allowed=view=>views.includes(view)&&(!space||space.views.includes(view));
 const open=view=>{if(allowed(view))showView(view);};
 addEventListener('message',event=>{if(event.source!==parent||event.origin!==location.origin||event.data?.type!=='fourthform:preview-view')return;open(event.data.view);});
 const requested=new URLSearchParams(location.search).get('view');
 open(allowed(requested)?requested:(space?.view||'review'));
 const previousShow=showView;
 showView=function(view){if(!allowed(view)){notify('This feature is in another preview space. Open the complete workspace to explore everything.');return;}previousShow(view);const url=new URL(location.href);url.searchParams.delete('stage');url.searchParams.set('view',view);history.replaceState(history.state,'',url);if(parent!==window)parent.postMessage({type:'fourthform:preview-active',view},location.origin);};
 addEventListener('popstate',()=>{const params=new URLSearchParams(location.search);open(params.get('view')||(params.get('stage')==='direction'?'direction':'review'));});
 showView(currentView);
 if(space){
  document.documentElement.dataset.previewSpace=space.id;
  qsa('#leftRail [data-view],#leftRail [data-stage]').forEach(button=>{button.hidden=!space.views.includes(button.dataset.view||button.dataset.stage);});
  qsa('#leftRail [data-nav-group]').forEach(group=>{group.hidden=!qsa('button',group).some(button=>!button.hidden);});
  const header=document.createElement('div');header.className='preview-space-heading';
  const mark=document.createElement('span');mark.className='ff-frame-mark';mark.setAttribute('aria-hidden','true');
  const title=document.createElement('strong');title.textContent=space.label;
  const copy=document.createElement('p');copy.textContent='Explore freely. This space has its own saved draft.';
  const link=document.createElement('a');link.href='index.html?view='+currentView;link.target='_blank';link.rel='noopener';link.textContent='Complete workspace ↗';
  header.append(mark,title,copy,link);qs('#leftRail').prepend(header);
  const summary=qs('.revision-summary');if(summary&&space.id!=='design')summary.hidden=true;
 }
})();
