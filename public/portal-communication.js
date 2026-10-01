/* Interactive communication preview. Everything stays in this browser. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const read = () => { try { const value=JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{}; } catch { return {}; } };
  let saved = read(), onboarding = {};
  try { onboarding = JSON.parse(localStorage.getItem('ff-preview-onboarding-v1') || '{}'); onboarding = onboarding?.brief || onboarding || {};if(typeof onboarding!=='object'||Array.isArray(onboarding))onboarding={}; } catch {}
  const validInitial=value=>value&&Array.isArray(value.objects)&&value.objects.every(o=>o&&typeof o.id==='string'&&typeof o.type==='string'&&typeof o.text==='string'&&['name','src','label','size'].every(k=>o[k]===undefined||typeof o[k]==='string')&&(!o.notes||Array.isArray(o.notes)&&o.notes.every(n=>n&&typeof n.text==='string'&&Number.isFinite(n.time)&&n.time>=0)));
  let initial = { sent: false, locked: false, objects: [
    { id: 'business', type: 'text', label: 'Your business', text: onboarding.description || 'Mori House is a small Japanese dining room in Brisbane. Seasonal cooking, an intimate room and a calm evening pace.' },
    { id: 'goal', type: 'text', label: 'What the website should do', text: Array.isArray(onboarding.goals) ? onboarding.goals.join('\n') : onboarding.goals || 'Help guests explore the menu, find opening hours and reserve a table.' },
    { id: 'feel', type: 'text', label: 'How it should feel', text: Array.isArray(onboarding.feels) ? onboarding.feels.join(' · ') : onboarding.feels || 'Warm, restrained, tactile. Timber, evening light, generous spacing and food photography.' },
    { id: 'ref', type: 'image', label: 'Atmosphere reference', text: 'Soft light, natural materials and a quieter room.', name: 'evening-room.jpg', src: 'mori/warm.webp' },
  ] };
  if (onboarding.links) initial.objects.push({ id: 'links', type: 'text', label: 'Existing online presence', text: Array.isArray(onboarding.links) ? onboarding.links.join('\n') : String(onboarding.links) });
  if (onboarding.note) initial.objects.push({ id: 'note', type: 'text', label: 'Additional note', text: String(onboarding.note) });
  const initialSeed = structuredClone(initial);
  if(validInitial(saved.initialDirection))initial=structuredClone(saved.initialDirection);
  let revisionSubmitted = !!saved.revisionSubmitted, revisionUsed = Number.isInteger(saved.revisionUsed)?Math.max(0,Math.min(3,saved.revisionUsed)):0, revisionHistory = Array.isArray(saved.revisionHistory)?saved.revisionHistory.filter(batch=>window.ffPortalModel.validDirections(batch)):[], editIndex = null;
  const ownFields = () => ({ initialDirection: initial, revisionSubmitted, revisionUsed, revisionHistory });
  window.ffCommunicationFields = ownFields;
  const panel = $('[data-view-panel="direction"]');
  panel.innerHTML = `<div class="panel-head"><h1>Initial Direction</h1><span id="initialStatus">Draft · local preview</span></div><div class="comm-initial"><header class="comm-intro"><span class="kicker">FORM / DIRECTION</span><h2>Start with what<br>you know.</h2><p>Your Initial Direction is the brief for your website. Add the words, images, links and ideas that explain your business and what the website should do.</p><div class="comm-brief-name">${esc(onboarding.name || 'Mori House')} <span>Website Direction</span></div></header><div class="comm-board" id="initialObjects"></div><div class="comm-drop" id="initialDrop"><span>Drop files, paste an image or add a thought.</span><div class="comm-tools"><button data-initial-add="text">Write</button><button id="initialUpload">Upload</button><button data-initial-add="drawing">Draw</button><button id="initialLink">Link</button><button id="initialRecord">Record audio</button><button id="initialScreen">Record screen</button></div><input type="file" id="initialFiles" multiple hidden><p id="initialUploadStatus" role="status"></p></div><footer class="comm-send"><div><b>Save your draft. Send when the brief is ready.</b><p id="initialSendCopy">This preview saves in your browser. No team receives a submission.</p></div><button class="top-button primary" id="initialSend">Send Initial Direction</button></footer><div id="initialLifecycle" class="comm-lifecycle"></div></div>`;
  $('[data-context="direction"]').innerHTML = `<h2>Your Direction</h2><p class="sub">An open place for everything that helps shape the website.</p><div class="comm-guide"><span>01</span><div><b>Start with the thought.</b><p>Describe the business, the audience and what people should do on the website.</p></div></div><div class="comm-guide"><span>02</span><div><b>Add context.</b><p>Add references you like, then explain what you want us to take from them.</p></div></div><div class="comm-guide"><span>03</span><div><b>Send when it feels ready.</b><p>Sending Initial Direction uses no revision round. You can update it until building begins.</p></div></div><div class="quiet-card comm-preview-note"><h3>Local preview</h3><p>Submissions and lifecycle changes are simulated. Nothing is sent to Fourthform.</p></div>`;
  const uid = () => crypto.randomUUID();
  function initialChanged() { initial.updated = Date.now(); markDirty(); updateInitialStatus(); }
  function updateInitialStatus() {
    $('#initialStatus').textContent = initial.locked ? 'Locked · example build started' : initial.sent ? (initial.updated > initial.sentAt ? 'Changes not sent' : 'Sent · local preview') : 'Draft · local preview';
    $('#initialSend').textContent = initial.sent ? 'Send updated Direction' : 'Send Initial Direction';
    $('#initialSend').disabled = initial.locked || !window.ffPortalModel.meaningfulInitial(initial.objects);
    if (currentView === "direction") { $("#submitBtn").disabled=initial.locked || !window.ffPortalModel.meaningfulInitial(initial.objects); $("#submitBtn").textContent=initial.sent?"Send updated Direction":"Send Initial Direction"; }
    $('#initialDrop').hidden = initial.locked;
    $('#initialSendCopy').textContent = initial.locked ? 'This brief is preserved while the example website is being built. Return to the editable preview to try another idea.' : 'This preview saves in your browser. No team receives a submission.';
    $('#initialLifecycle').innerHTML = initial.sent ? (initial.locked ? '<span class="comm-state-label">Building · Initial Direction locked</span><button class="top-button" id="initialUnlock">Return to editable preview</button><button class="top-button" id="initialNextReview">Explore Review →</button>' : '<span class="comm-state-label">Sent · editable until building begins</span><button class="top-button" id="initialStartBuild">Preview building & locking →</button>') : '';
    $('#initialStartBuild')?.addEventListener('click', () => { if(recordingPending||mediaRecorder?.state==='recording'){notify('Stop the recording before starting the example build.');return;}initial.locked = true;if(saveLocal()===false){initial.locked=false;markDirty();updateInitialStatus();return;}renderInitial(); notify('Example build started. Initial Direction is locked.'); });
    $('#initialUnlock')?.addEventListener('click', () => { initial.locked = false;if(saveLocal()===false){initial.locked=true;markDirty();updateInitialStatus();return;}renderInitial(); });
    $('#initialNextReview')?.addEventListener('click', () => showView('review'));
  }
  function filePreview(object) {
    if (object.type === 'image') return `<div class="comm-annotated-image"><img class="comm-image" src="${esc(object.src)}" alt="${esc(object.name || 'Direction reference')}">${object.strokes?.length ? svgMarkup(object.strokes) : ""}</div><button class="top-button" data-image-annotate="${object.id}">${initial.locked ? "View annotations" : "Annotate image"}</button>`;
    if (object.type === 'video') return `<video controls preload="metadata" src="${esc(object.src)}"></video>${initial.locked?"":`<button class="top-button" data-video-note="${object.id}">Add note at this moment</button>`}${(object.notes||[]).map(n=>`<p class="comm-video-note"><button data-video-time="${n.time}">${Math.floor(n.time/60)}:${String(Math.floor(n.time%60)).padStart(2,"0")}</button> ${esc(n.text)}</p>`).join("")}`;
    if (object.type === 'audio') return `<audio controls preload="metadata" src="${esc(object.src)}"></audio>`;
    if (object.type === 'link') return `<a href="${esc(object.src)}" target="_blank" rel="noreferrer">${esc(object.src)} ↗</a>`;
    if (object.type === 'file') return `<div class="comm-file"><span>${esc((object.name || 'file').split('.').pop().toUpperCase())}</span><div><b>${esc(object.name)}</b><small>${esc(object.size || '')}</small></div><a href="${esc(object.src)}" download="${esc(object.name)}">Open ↓</a></div>`;
    if (object.type === 'drawing') return `<div class="comm-drawing-preview">${svgMarkup(object.strokes || [])}</div><button class="top-button" data-sketch="${object.id}">${initial.locked ? 'View drawing' : 'Edit drawing'}</button>`;
    return '';
  }
  function renderInitial() {
    $('#initialObjects').innerHTML = initial.objects.map((object, index) => `<article class="comm-object" data-initial-object="${esc(object.id)}"><div class="comm-object-head"><span>${String(index + 1).padStart(2, '0')} / ${esc(object.label || object.type)}</span>${initial.locked ? '<span>Preserved</span>' : `<div><button data-move-initial="${esc(object.id)}" ${index === 0 ? 'disabled' : ''} aria-label="Move item up">↑</button><button data-remove-initial="${esc(object.id)}" aria-label="Delete item">×</button></div>`}</div>${filePreview(object)}<textarea data-initial-text="${esc(object.id)}" aria-label="${esc(object.label || 'Note for attachment')}" placeholder="Add a note or a thought…" ${initial.locked ? 'readonly' : ''}>${esc(object.text)}</textarea></article>`).join('');
    updateInitialStatus();
  }
  $('#initialObjects').addEventListener('input', e => { const object = initial.objects.find(o => o.id === e.target.dataset.initialText); if (object && !initial.locked) { object.text = e.target.value; initialChanged(); } });
  $('#initialObjects').addEventListener('click', e => {
    const image = e.target.closest('[data-image-annotate]'), videoNote = e.target.closest('[data-video-note]'), videoTime=e.target.closest('[data-video-time]');
    if (videoTime) { const video=videoTime.closest('article').querySelector('video');video.currentTime=+videoTime.dataset.videoTime;return; }
    if (videoNote && !initial.locked) { const object=initial.objects.find(o=>o.id===videoNote.dataset.videoNote),video=videoNote.closest('article').querySelector('video'),text=prompt('Note at this moment');if(text){object.notes=[...(object.notes||[]),{time:video.currentTime,text}];initialChanged();renderInitial();}return; }
    if (image) { const object=initial.objects.find(o=>o.id===image.dataset.imageAnnotate);openSketch({...object,snapshot:{image:object.src,heading:object.text},imageOnly:true},strokes=>{object.strokes=strokes;initialChanged();renderInitial();},initial.locked);return; }
    const remove = e.target.closest('[data-remove-initial]'), move = e.target.closest('[data-move-initial]'), sketch = e.target.closest('[data-sketch]');
    if (sketch) { const object = initial.objects.find(o => o.id === sketch.dataset.sketch); openSketch(object, strokes => { object.strokes = strokes; initialChanged(); renderInitial(); }, initial.locked); return; }
    if (initial.locked) return;
    if (remove) initial.objects = initial.objects.filter(o => o.id !== remove.dataset.removeInitial);
    if (move) { const i = initial.objects.findIndex(o => o.id === move.dataset.moveInitial); if (i > 0) [initial.objects[i-1], initial.objects[i]] = [initial.objects[i], initial.objects[i-1]]; }
    if (remove || move) { initialChanged(); renderInitial(); }
  });
  $$('[data-initial-add]').forEach(button => button.onclick = () => { const object = { id: uid(), type: button.dataset.initialAdd, label: button.dataset.initialAdd === 'text' ? 'A new thought' : 'Drawn Direction', text: '', strokes: [] }; initial.objects.push(object); initialChanged(); renderInitial(); if (object.type === 'drawing') openSketch(object, strokes => { object.strokes = strokes; initialChanged(); renderInitial(); }); else $(`[data-initial-text="${object.id}"]`).focus(); });
  $('#initialUpload').onclick = () => $('#initialFiles').click();
  async function addFiles(files) {
    if (initial.locked) return;
    const direction=initial;
    for (const file of files) {
      if (file.size > 8 * 1024 * 1024) { $('#initialUploadStatus').textContent = 'Choose files under 8 MB for this preview. Save your draft after adding attachments.'; continue; }
      if (!/^(image\/(png|jpeg|webp|gif)|audio\/|video\/|application\/pdf|text\/)/.test(file.type) && !/\.(docx|xlsx|pptx|zip)$/i.test(file.name)) { $('#initialUploadStatus').textContent = 'Choose an image, recording, PDF, document or text file.'; continue; }
      $('#initialUploadStatus').textContent = `Opening ${file.name}…`;
      try {
        const src = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
        if(initial!==direction){$('#initialUploadStatus').textContent='The Direction changed while the file opened. Choose the file again.';return;}
        const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('audio/') ? 'audio' : file.type.startsWith('video/') ? 'video' : 'file';
        if(type==='image')await new Promise((resolve,reject)=>{const image=new Image();image.onload=resolve;image.onerror=reject;image.src=src;});
        if(initial!==direction){$('#initialUploadStatus').textContent='The Direction changed while the file opened. Choose the file again.';return;}
        if(initial.locked){$('#initialUploadStatus').textContent='The Direction was locked while the file opened. Return to editing to add it.';return;}
        initial.objects.push({ id: uid(), type, label: 'Supplied reference', text: '', name: file.name, src, size: `${(file.size/1024).toFixed(0)} KB` });
        initialChanged(); renderInitial(); $('#initialUploadStatus').textContent = `${file.name} added. Save to preserve it in this browser.`;
      } catch { $('#initialUploadStatus').textContent = `${file.name} could not be opened. Choose the file again to retry.`; }
    }
  }
  $('#initialFiles').onchange = e => { void addFiles([...e.target.files]); e.target.value = ''; };
  panel.addEventListener('dragover', e => { if (!initial.locked && e.dataTransfer.types.includes('Files')) { e.preventDefault(); $('#initialDrop').classList.add('dragging'); } });
  panel.addEventListener('dragleave', e => { if (!panel.contains(e.relatedTarget)) $('#initialDrop').classList.remove('dragging'); });
  panel.addEventListener('drop', e => { if (initial.locked) return; e.preventDefault(); $('#initialDrop').classList.remove('dragging'); void addFiles([...e.dataTransfer.files]); });
  panel.addEventListener('paste', e => { if (initial.locked || e.target.matches('textarea,input')) return; if (e.clipboardData.files.length) { e.preventDefault(); void addFiles([...e.clipboardData.files]); } });
  function newModal(id, html) { let element = $('#'+id); if (!element) { element = document.createElement('div'); element.className = 'modal-backdrop'; element.id = id; element.setAttribute('role', 'dialog'); element.setAttribute('aria-modal', 'true'); document.body.append(element); element.onclick = e => { if (e.target === element) closeModal('#'+id); }; } element.innerHTML = html; element.setAttribute('aria-labelledby', id+'Title'); openModal('#'+id); return element; }
  $('#initialLink').onclick = () => { const modal = newModal('commLink', '<div class="modal"><small>Website reference</small><h2 id="commLinkTitle">A useful link.</h2><label for="commLinkValue">Website URL</label><input id="commLinkValue" type="url" placeholder="https://…"><p id="commLinkError" role="alert"></p><div class="modal-actions"><button class="top-button" id="commLinkCancel">Cancel</button><button class="top-button primary" id="commLinkAdd">Add link</button></div></div>'); $('#commLinkCancel').onclick = () => closeModal('#commLink'); $('#commLinkAdd').onclick = () => { try { const value = new URL($('#commLinkValue').value); if (!['http:','https:'].includes(value.protocol)) throw Error(); initial.objects.push({ id: uid(), type: 'link', label: 'Website reference', text: '', src: value.href }); initialChanged(); renderInitial(); closeModal('#commLink'); } catch { $('#commLinkError').textContent = 'Use a complete http or https URL.'; } }; };
  $('#initialSend').onclick = () => { if (initial.locked||!window.ffPortalModel.meaningfulInitial(initial.objects)) return; newModal('commSend', '<div class="modal"><small>Initial Direction / local preview</small><h2 id="commSendTitle">Send this Direction?</h2><p>Sending Initial Direction uses no revision round. You can update the brief until building begins.</p><p class="comm-preview-copy">This simulates sending. No message leaves this browser.</p><div class="modal-actions"><button class="top-button" id="commSendCancel">Keep editing</button><button class="top-button primary" id="commSendConfirm">Send Direction</button></div></div>'); $('#commSendCancel').onclick = () => closeModal('#commSend'); $('#commSendConfirm').onclick = () => { const old = { sent: initial.sent, sentAt: initial.sentAt }; initial.sent = true; initial.sentAt = Date.now(); if (saveLocal() === false) { Object.assign(initial, old);markDirty();updateInitialStatus(); return; } renderInitial(); closeModal('#commSend'); notify('Initial Direction sent in this local preview.'); }; };
  let mediaRecorder = null, recordingPending=false;
  async function record(screen){
    if(mediaRecorder?.state==='recording'){mediaRecorder.stop();return;}
    if(recordingPending||initial.locked)return;
    recordingPending=true;let stream;
    const controls=[$('#initialRecord'),$('#initialScreen')];controls.forEach(b=>b.disabled=true);
    const direction=initial;
    try{
      stream=await (screen?navigator.mediaDevices.getDisplayMedia({video:true,audio:true}):navigator.mediaDevices.getUserMedia({audio:true}));
      if(initial!==direction||initial.locked){stream.getTracks().forEach(t=>t.stop());return;}
      const recorder=new MediaRecorder(stream),chunks=[];mediaRecorder=recorder;
      recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      const cleanup=()=>{stream.getTracks().forEach(t=>t.stop());controls[0].textContent='Record audio';controls[1].textContent='Record screen';controls.forEach(b=>b.disabled=false);if(mediaRecorder===recorder)mediaRecorder=null;};
      recorder.onstop=()=>{cleanup();if(chunks.length&&initial===direction&&!initial.locked)void addFiles([new File(chunks,screen?'Screen recording.webm':'Voice note.webm',{type:recorder.mimeType})]);};
      recorder.onerror=()=>{cleanup();$('#initialUploadStatus').textContent='Recording ended unexpectedly. Try again or upload a recording.';};
      stream.getTracks().forEach(track=>track.onended=()=>{if(recorder.state!=='inactive')recorder.stop();});
      recorder.start();controls[screen?1:0].textContent='Stop recording';
      $('#initialUploadStatus').textContent=screen?'Recording your selected screen. Stop when ready.':'Recording your microphone. Stop when ready.';
    }catch{stream?.getTracks().forEach(t=>t.stop());$('#initialUploadStatus').textContent=screen?'Screen recording could not start. Allow sharing or upload a recording.':'Recording could not start. Allow microphone access or upload a recording.';}
    finally{recordingPending=false;controls.forEach(b=>b.disabled=false);}
  }
  $('#initialScreen').onclick=()=>void record(true);
  $('#initialRecord').onclick=()=>void record(false);
  addEventListener('pagehide',()=>{if(mediaRecorder?.state==='recording')mediaRecorder.stop();mediaRecorder?.stream.getTracks().forEach(t=>t.stop());});
  // Simple pressure-independent vector marks. Coordinates stay relative to the reference.
  function svgMarkup(strokes, draft) { strokes=window.ffPortalModel.cleanStrokes(strokes);draft=draft?window.ffPortalModel.cleanStrokes([draft])[0]:null;return `<svg viewBox="0 0 1000 600" preserveAspectRatio="none" aria-label="Drawn Direction">${[...strokes, ...(draft ? [draft] : [])].map(s => { const a=s.points[0],b=s.points.at(-1); if (!a || !b) return ''; if(s.tool==='text')return `<text x="${a.x}" y="${a.y}" fill="#665cf6" font-size="25">${esc(s.text)}</text>`; if(s.tool==='rect')return `<rect x="${Math.min(a.x,b.x)}" y="${Math.min(a.y,b.y)}" width="${Math.abs(b.x-a.x)}" height="${Math.abs(b.y-a.y)}" fill="none" stroke="#665cf6" stroke-width="4"/>`; let arrow=''; if(s.tool==='arrow'){ const angle=Math.atan2(b.y-a.y,b.x-a.x), size=18; arrow=`<path d="M ${b.x-size*Math.cos(angle-.5)} ${b.y-size*Math.sin(angle-.5)} L ${b.x} ${b.y} L ${b.x-size*Math.cos(angle+.5)} ${b.y-size*Math.sin(angle+.5)}" fill="none" stroke="#665cf6" stroke-width="4"/>`; } return `<polyline points="${s.points.map(p=>`${p.x},${p.y}`).join(' ')}" fill="none" stroke="#665cf6" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>${arrow}`; }).join('')}</svg>`; }
  function openSketch(object, done, readOnly = false) {
    let strokes = window.ffPortalModel.cleanStrokes(object.strokes), tool = 'pen', active = null, surface;
    const modal = newModal('commSketch', `<div class="modal comm-sketch-modal"><small>Draw a Direction ${object.page ? '/ '+esc(object.page) : ''}</small><h2 id="commSketchTitle">Show us the thought.</h2><div class="comm-sketch-tools">${['pen','arrow','rect','text'].map(t=>`<button class="top-button ${t==='pen'?'active':''}" data-sketch-tool="${t}" ${readOnly?'disabled':''}>${t==='rect'?'Rectangle':t[0].toUpperCase()+t.slice(1)}</button>`).join('')}<button class="top-button" id="sketchUndo" ${readOnly?'disabled':''}>Undo</button></div><div class="comm-sketch-surface" id="sketchSurface">${object.snapshot ? `<div class="comm-sketch-reference ${object.imageOnly?"image-only":""}"><img src="${esc(object.snapshot.image)}" alt="Website reference"><div><small>${esc(object.page)} / ${esc(object.target || 'Page')}</small><h3>${esc(object.snapshot.heading)}</h3></div></div>` : ''}<div id="sketchSVG">${svgMarkup(strokes)}</div></div><p class="comm-preview-copy">${object.snapshot ? 'Drawing stays attached to this captured image and heading reference.' : 'Draw with a mouse, pen or touch. Add a written note for context.'}</p><div class="modal-actions"><button class="top-button" id="sketchCancel">${readOnly?'Close':'Cancel'}</button>${readOnly?'':'<button class="top-button primary" id="sketchDone">Keep drawing</button>'}</div></div>`);
    surface = $('#sketchSVG');
    const redraw = () => { surface.innerHTML = svgMarkup(strokes, active); };
    const point = e => { const r=surface.getBoundingClientRect(); return {x:Math.max(0,Math.min(1000,(e.clientX-r.left)/r.width*1000)),y:Math.max(0,Math.min(600,(e.clientY-r.top)/r.height*600))}; };
    surface.onpointerdown = e => { if(readOnly||e.button!==0)return; e.preventDefault(); surface.setPointerCapture(e.pointerId); const p=point(e); if(tool==='text'){ const text=prompt('Annotation text');if(text)strokes.push({tool,points:[p],text});redraw();return;} active={tool,points:[p,p]};redraw(); };
    surface.onpointermove = e => { if(!active)return; const p=point(e);active.points=tool==='pen'?[...active.points,p]:[active.points[0],p];redraw(); };
    surface.onpointerup = () => { if(active)strokes.push(active);active=null;redraw(); };
    surface.onpointercancel = () => {active=null;redraw();};
    $$('[data-sketch-tool]',modal).forEach(button=>button.onclick=()=>{tool=button.dataset.sketchTool;$$('[data-sketch-tool]',modal).forEach(b=>b.classList.toggle('active',b===button));});
    $('#sketchUndo').onclick=()=>{strokes.pop();redraw();};
    $('#sketchCancel').onclick=()=>closeModal('#commSketch');
    $('#sketchDone')?.addEventListener('click',()=>{done(strokes);closeModal('#commSketch');});
  }
  // Rich revision drafts; replacement Directions never change the reviewed website.
  const context = $('[data-context="review"]');
  const editor = document.createElement('div'); editor.id='commReviewEditor'; editor.className='comm-review-editor'; context.append(editor);
  const draftActions = document.createElement('div'); draftActions.className='comm-review-actions';draftActions.innerHTML='<button class="upload" id="reviewDraw">Draw on this page</button><button class="upload" id="reviewWithdraw" hidden>Withdraw Revision</button><button class="upload" id="reviewComplete" hidden>Preview revised delivery →</button>'; context.insertBefore(draftActions,$('.direction-list',context));
  const history = document.createElement('div');history.id='commRevisionHistory'; context.append(history);
  const oldRender = renderDirections;
  renderDirections = function() {
    oldRender();
    $('.draft-count').textContent=`${directions.length} ${revisionSubmitted?'submitted':'draft'}`;
    $$('.direction-row[data-feedback]').forEach((button,i)=>{const d=directions[i]; button.querySelector('span').textContent=revisionSubmitted?'Submitted · waiting for work':d.replacement?'Draft · image replacement':d.strokes?.length?'Draft · drawing':'Draft Direction';});
    $('#submitBtn').disabled=revisionSubmitted||!window.ffPortalModel.validDirections(directions)||revisionUsed>=3;
    $('#submitBtn').textContent=revisionSubmitted?'Submitted · preview':revisionUsed>=3?'All revision rounds used':`Submit Revision ${String(revisionUsed+1).padStart(2,'0')}`;
    $('.revision-summary b').textContent=`Revision ${String(Math.min(3,revisionUsed+(revisionSubmitted?0:1))).padStart(2,'0')} / 03`;
    $('#addDirection').disabled=revisionSubmitted;
    $('#reviewDraw').disabled=revisionSubmitted;
    $('#reviewWithdraw').hidden=!revisionSubmitted;
    $('#reviewComplete').hidden=!revisionSubmitted;
    $('#uploadBtn').disabled=revisionSubmitted;
    $('#asset').setAttribute('aria-disabled',String(revisionSubmitted));
    $('#commRevisionHistory').innerHTML=revisionHistory.length?'<h3>Previous revisions</h3>'+revisionHistory.map((batch,i)=>`<details class="comm-history"><summary>Revision ${String(i+1).padStart(2,'0')} · Completed · ${batch.length} Directions</summary>${batch.map(d=>`<p>${esc(d.page)} · ${esc(d.text)}</p>`).join('')}</details>`).join(''):'';
    if(currentView==='direction') $('#submitBtn').textContent=initial.sent?'Send updated Direction':'Send Initial Direction';
    if(editIndex!==null)renderReviewEditor(editIndex);
  };
  function renderReviewEditor(index) {
    const d=directions[index]; if(!d){editor.innerHTML='';return;}
    editor.innerHTML=`<div class="comm-review-editor-head"><small>${esc(d.page)} / ${esc(d.target||'General')}</small><button id="reviewEditorClose" aria-label="Close Direction">×</button></div>${d.replacement?`<img src="${esc(d.replacement)}" alt="Proposed replacement"><span class="comm-proposal">Proposed replacement · website unchanged</span>`:''}${d.strokes?.length?`<div class="comm-drawing-preview">${svgMarkup(d.strokes)}</div>`:''}<label for="reviewDirectionText">Direction ${index+1}</label><textarea id="reviewDirectionText" ${revisionSubmitted?'readonly':''}>${esc(d.text)}</textarea><div class="comm-review-actions">${revisionSubmitted?'<small>Withdraw this batch to edit it.</small>':'<button class="top-button" id="reviewUpdate">Keep changes</button><button class="top-button" id="reviewDelete">Delete</button>'}</div>`;
    $('#reviewEditorClose').onclick=()=>{editIndex=null;editor.innerHTML='';};
    if (!revisionSubmitted) $("#reviewDirectionText").oninput = e => { d.text=e.target.value;markDirty();oldRender();$('#submitBtn').disabled=revisionSubmitted||!window.ffPortalModel.validDirections(directions)||revisionUsed>=3; };
    $('#reviewUpdate')?.addEventListener('click',()=>{const value=$('#reviewDirectionText').value.trim();if(!value){$('#reviewDirectionText').focus();return;}d.text=value;markDirty();renderDirections();notify('Direction updated. Save to keep it on this device.');});
    $('#reviewDelete')?.addEventListener('click',()=>{directions.splice(index,1);editIndex=null;editor.innerHTML='';markDirty();renderDirections();notify('Draft Direction deleted.');});
  }
  $('.direction-list').onclick=e=>{const button=e.target.closest('[data-feedback]');if(!button)return;editIndex=+button.dataset.feedback;const d=directions[editIndex];selectPage(d.page);const target=d.target==='heading'?$('h1',moriPage):$$('[data-edit-image]',moriPage).find(el=>el.dataset.editImage===d.target);target?.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});renderReviewEditor(editIndex);};
  const originalCompose = composeDirection;
  composeDirection = function(target) { if(revisionSubmitted){notify('Withdraw the submitted batch before editing.');return;} originalCompose(target); };
  replaceTargetImage = function(target, imageUrl) {
    if (!target || !imageUrl||currentMode==='Browse mode'||!moriPage.contains(target))return;
    if(currentMode==='Edit site') { const img=$('img',target);if(img){img.src=imageUrl;target.dataset.localImage='true';capturePage();markDirty();}return; }
    if(revisionSubmitted){notify('Withdraw the submitted batch before adding a replacement.');return;}
    directions.push({page:currentPage,target:target.dataset.editImage||'Image',text:'Replace this image with the supplied reference.',replacement:imageUrl});
    editIndex=directions.length-1;renderDirections();markDirty();
  };
  const previousImpact=impact; impact=function(...args){if(revisionSubmitted && currentMode!=="Edit site"){notify("Withdraw the submitted batch before adding a replacement.");return;} return previousImpact(...args);};
  $('#reviewDraw').onclick=()=>{if(revisionSubmitted)return; const object={page:currentPage,target:'Viewport',text:'See the drawn Direction for this area.',strokes:[],snapshot:{image:$('img',moriPage)?.src||'mori/interior.webp',heading:$('h1',moriPage)?.textContent||currentPage},viewport:+$('#widthRange').value,scroll:siteScroll.scrollTop};openSketch(object,strokes=>{if(!strokes.length)return;object.strokes=strokes;directions.push(object);editIndex=directions.length-1;renderDirections();markDirty();});};
  finishSubmit = function() {
    if(revisionSubmitted||!window.ffPortalModel.validDirections(directions)||revisionUsed>=3){cancelHold();return;}
    const previous=revisionUsed;revisionSubmitted=true;revisionUsed++;
    if(saveLocal()===false){revisionSubmitted=false;revisionUsed=previous;markDirty();cancelHold();return;}
    closeModal('#submitModal');renderDirections();notify('Revision submitted in this local preview. No team was notified.');
  };
  $('#reviewWithdraw').onclick=()=>{if(!revisionSubmitted)return;revisionSubmitted=false;const previous=revisionUsed;revisionUsed=Math.max(0,revisionUsed-1);if(saveLocal()===false){revisionSubmitted=true;revisionUsed=previous;markDirty();return;}renderDirections();notify('Preview batch withdrawn. Revision round restored.');};
  $('#reviewComplete').onclick=()=>{if(!revisionSubmitted)return;const batch=structuredClone(directions);revisionHistory.push(batch);directions=[];revisionSubmitted=false;if(saveLocal()===false){revisionHistory.pop();directions=batch;revisionSubmitted=true;markDirty();return;}editIndex=null;renderDirections();editor.innerHTML='';notify('Example delivery completed. Draft the next batch.');};
  const revisionStep = $('#submitModal [data-modal-step="2"]');
  const acknowledgement = document.createElement('label'); acknowledgement.className='comm-acknowledgement';
  acknowledgement.innerHTML='<input type="checkbox" id="revisionAcknowledge"><span>I understand this submits the whole batch and uses one revision round in this preview.</span>';
  revisionStep.insertBefore(acknowledgement, $('.modal-actions', revisionStep));
  const acknowledgeNext = $('[data-next-modal]', revisionStep); acknowledgeNext.disabled=true;
  $('#revisionAcknowledge').onchange=e=>{acknowledgeNext.disabled=!e.target.checked;};
  $('#submitBtn').addEventListener('click',e=>{
    if(currentView==='direction'){e.preventDefault();e.stopImmediatePropagation();$('#initialSend').click();return;}
    if(currentView!=='review')return;
    $('#revisionAcknowledge').checked=false;acknowledgeNext.disabled=true;
    $('h2', revisionStep).textContent=`Revision ${String(revisionUsed+1).padStart(2,'0')} / 03`;
    $('p', revisionStep).textContent=`Submitting commits this complete batch as Revision ${String(revisionUsed+1).padStart(2,'0')} of 03. Saving drafts never uses a round. This is a local simulation; no team receives these Directions.`;
  },true);
  const previousShow=showView;
  showView=function(name){previousShow(name);renderDirections();if(name==='direction'){$('#submitBtn').disabled=initial.locked || !window.ffPortalModel.meaningfulInitial(initial.objects);$('#submitBtn').textContent=initial.sent?'Send updated Direction':'Send Initial Direction';}else if(name!=='review'){$('#submitBtn').hidden=true;} $('#submitBtn').hidden=!['direction','review'].includes(name);};
  addEventListener('fourthform:reset',()=>{initial=structuredClone(initialSeed);initial.sent=false;initial.locked=false;revisionSubmitted=false;revisionUsed=0;revisionHistory=[];renderInitial();renderDirections();});
  addEventListener('fourthform:restore',e=>{const value=e.detail||{};if(validInitial(value.initialDirection))initial=structuredClone(value.initialDirection);revisionSubmitted=!!value.revisionSubmitted;revisionUsed=Number.isInteger(value.revisionUsed)?Math.max(0,Math.min(3,value.revisionUsed)):0;revisionHistory=Array.isArray(value.revisionHistory)?value.revisionHistory.filter(batch=>window.ffPortalModel.validDirections(batch)):[];renderInitial();renderDirections();});
  const previousSnapshot = window.ffLocalSnapshot;
  window.ffLocalSnapshot = () => ({ ...(typeof previousSnapshot === "function" ? previousSnapshot() : {}), ...ownFields() });
  renderInitial();renderDirections();
  if(new URLSearchParams(location.search).get('stage')==='direction')showView('direction');
})();
