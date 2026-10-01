let directions=[{page:'Home',target:'home-hero',text:'Use the evening room image here.'},{page:'Home',target:'heading',text:'Make this feel quieter.'}];
try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(Array.isArray(saved?.directions))directions=saved.directions.filter(d=>d&&['Home','Menu','Visit'].includes(d.page)&&typeof d.text==='string')}catch{}
let feedbackTarget=null,lastFocus=null;
const composer=document.createElement('div');composer.className='modal-backdrop';composer.id='directionModal';composer.setAttribute('role','dialog');composer.setAttribute('aria-modal','true');composer.setAttribute('aria-labelledby','directionTitle');composer.innerHTML='<div class="modal"><small id="directionLocation">Current page</small><h2 id="directionTitle">Add a Direction.</h2><label for="directionText">What would you like changed?</label><textarea id="directionText" class="direction-composer" maxlength="1500" placeholder="Describe the change..."></textarea><div class="modal-actions"><button class="top-button" id="cancelDirection">Cancel</button><button class="top-button primary" id="saveDirection">Add Direction</button></div></div>';document.body.append(composer);
const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function renderDirections(){
 qs('.direction-list').innerHTML=directions.map((d,i)=>`<button class="direction-row" type="button" data-feedback="${i}"><small>${escapeHtml(d.page)} · ${escapeHtml(d.target==='heading'?'Heading':d.target==='home-hero'?'Hero image':d.target||'Page')}</small><b>${escapeHtml(d.text)}</b><span>Draft Direction</span></button>`).join('');
 qs('.draft-count').textContent=directions.length+' draft';
 qsa('.status-row').forEach(row=>{if(['Draft Directions','Directions'].includes(row.firstElementChild.textContent))row.lastElementChild.textContent=directions.length});
 qs('.modal-list').innerHTML=directions.map(d=>`<div>${escapeHtml(d.page)} · ${escapeHtml(d.text)}</div>`).join('');
 qs('#submitBtn').disabled=!directions.length;
}
renderDirections();
qs('.direction-list').onclick=e=>{const button=e.target.closest('[data-feedback]');if(!button)return;const d=directions[+button.dataset.feedback];selectPage(d.page);const target=d.target==='heading'?qs('h1',moriPage):qsa('[data-edit-image]',moriPage).find(el=>el.dataset.editImage===d.target);if(target){target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'center'});target.classList.add('review-selected');setTimeout(()=>target.classList.remove('review-selected'),1400)}closeDrawers()};
function composeDirection(target){feedbackTarget=target;qs('#directionLocation').textContent=currentPage+(target?' · '+(target.dataset.editImage||'Text'):'');qs('#directionText').value='';openModal('#directionModal');qs('#directionText').focus()}
qs('#addDirection').onclick=()=>composeDirection(null);qs('#cancelDirection').onclick=()=>closeModal('#directionModal');
qs('#saveDirection').onclick=()=>{const value=qs('#directionText').value.trim();if(!value){qs('#directionText').focus();return}directions.push({page:currentPage,target:feedbackTarget?.dataset.editImage||(feedbackTarget?'heading':'Page'),text:value});renderDirections();markDirty();closeModal('#directionModal');notify('Direction added')};
moriPage.addEventListener('click',e=>{if(currentMode!=='Review mode'||e.target.closest('button,.plate-track'))return;const target=e.target.closest('[data-edit-text],[data-edit-image]');if(target)composeDirection(target)});
moriSite.addEventListener('keydown',e=>{if(currentMode==='Edit site'&&e.target.matches('[data-edit-image]')&&['Enter',' '].includes(e.key)){e.preventDefault();pendingImageTarget=e.target;fileInput.click()}});
// Closed dialogs leave the keyboard and accessibility trees immediately.
const originalOpen=openModal,originalClose=closeModal;
const dialogFocus=new WeakMap();
const focusableIn=m=>qsa('button:not(:disabled),textarea:not(:disabled),input:not(:disabled),select:not(:disabled),a[href],audio[controls],video[controls],[tabindex]:not([tabindex="-1"])',m).filter(el=>!el.closest('[inert]')&&el.getClientRects().length);
function syncDialogs(){
  const open=qs('.modal-backdrop.open');
  qsa('.modal-backdrop').forEach(m=>{const visible=m.classList.contains('open');m.inert=!visible;if(visible)m.removeAttribute('aria-hidden');else m.setAttribute('aria-hidden','true');});
  qs('.shell').inert=!!open;qs('#mobileDock').inert=!!open;
}
openModal=function(id){const m=qs(id);dialogFocus.set(m,document.activeElement);originalOpen(id);syncDialogs();focusableIn(m)[0]?.focus()};
closeModal=function(id){const m=qs(id);if(!m)return;cancelHold();originalClose(id);syncDialogs();const focus=dialogFocus.get(m);if(focus?.isConnected&&!focus.closest('[inert]')&&!focus.disabled)focus.focus();else if(!qs('.modal-backdrop.open'))qs('.view.active button:not(:disabled)')?.focus()};
qsa('.modal-backdrop').forEach(m=>{if(!m.hasAttribute('aria-labelledby')){const title=qs('h2',m);title.id=m.id+'Title';m.setAttribute('aria-labelledby',title.id)}m.addEventListener('click',e=>{if(e.target===m)closeModal('#'+m.id)})});
new MutationObserver(syncDialogs).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});syncDialogs();
const originalModalStep=setModalStep;
setModalStep=function(n){originalModalStep(n);const title=qs('#submitModal .modal-step.active h2');if(!title.id)title.id='submitStep'+n+'Title';qs('#submitModal').setAttribute('aria-labelledby',title.id)};
document.addEventListener('keydown',e=>{const m=qs('.modal-backdrop.open');if(e.key==='Escape'){if(m){e.preventDefault();closeModal('#'+m.id);}qsa('.popover').forEach(p=>p.classList.remove('open'));closeDrawers();return}if(e.key==='Tab'&&m){const focusable=focusableIn(m),first=focusable[0],last=focusable.at(-1);if(!first){e.preventDefault();return;}if(!m.contains(document.activeElement)||e.shiftKey&&document.activeElement===first){e.preventDefault();(e.shiftKey?last:first).focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
hold.addEventListener('keydown',e=>{if([' ','Enter'].includes(e.key)&&!e.repeat){e.preventDefault();startHold()}});hold.addEventListener('keyup',e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();cancelHold()}});hold.addEventListener('blur',cancelHold);
qsa('[data-next-modal],[data-prev-modal]').forEach(b=>b.addEventListener('click',()=>qs('.modal-step.active button',qs('#submitModal'))?.focus()));
const syncPanels=()=>{qsa('.view,.context-view').forEach(p=>p.inert=!p.classList.contains('active'));qsa('.popover').forEach(p=>p.inert=!p.classList.contains('open'));qs('#projectBtn').setAttribute('aria-expanded',qs('#projectPopover').classList.contains('open'));};
new MutationObserver(syncPanels).observe(qs('.shell'),{subtree:true,attributes:true,attributeFilter:['class']});qsa('.popover').forEach(p=>new MutationObserver(syncPanels).observe(p,{attributes:true,attributeFilter:['class']}));syncPanels();
qsa('.mori-mark,.mori-footer [data-edit-text]').forEach(el=>{el.removeAttribute('data-edit-text');el.removeAttribute('contenteditable')});
qs('#resetLocalBtn').addEventListener('click',()=>{directions=[];renderDirections();qs('#submitBtn').textContent='Submit revision';});
// Keep uploads and drop targets predictable and reject unsuitable files.
const originalCompress=compressImage;compressImage=async function(file){if(!/^image\/(png|jpeg|webp|gif|avif)$/.test(file.type)||file.size>15*1024*1024){notify('Choose a PNG, JPEG or WebP under 15 MB.');throw Error('Unsupported image')}try{return await originalCompress(file)}catch(err){notify('This image could not be opened.');throw err}};
window.addEventListener('unhandledrejection',e=>{if(String(e.reason).includes('Unsupported image'))e.preventDefault()});
// Updating any page stays local to this browser; no backend or billing is invoked.
function syncDrawers(){const narrow=innerWidth<=920;leftRail.inert=narrow&&!leftRail.classList.contains('open');contextRail.inert=narrow&&!contextRail.classList.contains('open');qs('#mobileMenu').setAttribute('aria-expanded',leftRail.classList.contains('open'));qs('#mobileContext').setAttribute('aria-expanded',contextRail.classList.contains('open'))}
[leftRail,contextRail].forEach(el=>new MutationObserver(syncDrawers).observe(el,{attributes:true,attributeFilter:['class']}));addEventListener('resize',syncDrawers);syncDrawers();
