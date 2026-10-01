/* Shared preview data rules; no account or service dependencies. */
(function(root){
 const clone=value=>structuredClone(value);
 function cmsFields(state,page,defaults){return clone({...defaults[page],...state.cmsPages?.[page],...state.cmsDrafts?.[page]});}
 function stageCms(state,page,fields){state.cmsDrafts=state.cmsDrafts||{};state.cmsDrafts[page]=clone(fields);}
 function validateCms(fields){return typeof fields.heading==='string'&&fields.heading.trim()&&typeof fields.cta==='string'&&fields.cta.trim()?null:'Add a main heading and a button label before saving.';}
 function prepareCms(state,page,fields){const saved=state.cmsPages?.[page];state.cmsPages=state.cmsPages||{};state.cmsPages[page]=clone(fields);return {page,previous:saved?clone(saved):null};}
 function rollbackCms(state,change){if(change.previous)state.cmsPages[change.page]=change.previous;else delete state.cmsPages[change.page];}
 function validSchedule(state){const time=v=>/^\d{2}:\d{2}$/.test(v)&&Number(v.slice(0,2))<24&&Number(v.slice(3))<60;return typeof state.stateName==='string'&&!!state.stateName.trim()&&Array.isArray(state.stateDays)&&state.stateDays.length>0&&state.stateDays.every(d=>Number.isInteger(d)&&d>=0&&d<=6)&&time(state.stateStart)&&time(state.stateEnd)&&state.stateStart!==state.stateEnd;}
 function distribute(total,weights){const sum=weights.reduce((a,b)=>a+b,0),exact=weights.map(w=>total*w/sum),values=exact.map(Math.floor);const order=exact.map((v,i)=>({i,part:v-values[i]})).sort((a,b)=>b.part-a.part||a.i-b.i);for(let n=total-values.reduce((a,b)=>a+b,0),i=0;i<n;i++)values[order[i].i]++;return values;}
 function validDirections(items){return Array.isArray(items)&&items.length>0&&items.every(d=>d&&typeof d.text==='string'&&!!d.text.trim());}
 function cleanStrokes(value){
  if(!Array.isArray(value))return [];
  return value.filter(s=>s&&['pen','arrow','rect','text'].includes(s.tool)&&Array.isArray(s.points)).map(s=>({tool:s.tool,text:typeof s.text==='string'?s.text.slice(0,500):'',points:s.points.filter(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)).map(p=>({x:Math.max(0,Math.min(1000,p.x)),y:Math.max(0,Math.min(600,p.y))}))})).filter(s=>s.points.length>0&&(s.tool!=='text'||s.text.trim()));
 }
 function meaningfulInitial(items){return Array.isArray(items)&&items.some(o=>o&&((typeof o.text==='string'&&o.text.trim())||(typeof o.src==='string'&&o.src.trim())||cleanStrokes(o.strokes).length));}
 function normalizeOperations(defaults,value){
  const out=clone(defaults);if(!value||typeof value!=='object'||Array.isArray(value))return out;
  for(const key of Object.keys(defaults)){const v=value[key],d=defaults[key];if(Array.isArray(d)){if(Array.isArray(v)&&v.length===d.length&&v.every(x=>typeof x==='boolean'))out[key]=clone(v);}else if(d&&typeof d==='object'){if(v&&typeof v==='object')for(const sub of Object.keys(d))if(typeof v[sub]===typeof d[sub])out[key][sub]=v[sub];}else if(typeof v===typeof d)out[key]=v;}
  if(Array.isArray(value.stateDays))out.stateDays=[...new Set(value.stateDays.filter(d=>Number.isInteger(d)&&d>=0&&d<=6))];
  for(const key of ['cmsPages','cmsDrafts']){out[key]={};for(const page of ['Home','Menu','Visit']){const item=value[key]?.[page];if(item&&typeof item==='object'&&!Array.isArray(item)){out[key][page]={};for(const field of ['heading','description','cta','image','imageAlt'])if(typeof item[field]==='string')out[key][page][field]=item[field];}}}
  for(const key of ['image','imageAlt','cmsImage'])if(typeof value[key]==='string')out[key]=value[key];
  if(['Home','Menu','Visit'].includes(value.page))out.page=value.page;else out.page='Home';
  if([0,1,2].includes(value.analyticsRange))out.analyticsRange=value.analyticsRange;
  if(['base','state'].includes(value.statePreview))out.statePreview=value.statePreview;
  if(typeof value.savedAt==='string')out.savedAt=value.savedAt;
  return out;
 }
 const api={cleanStrokes,meaningfulInitial,validDirections,normalizeOperations,cmsFields,stageCms,validateCms,prepareCms,rollbackCms,validSchedule,distribute};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.ffPortalModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
