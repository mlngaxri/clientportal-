/* Shared preview data rules; no account or service dependencies. */
(function(root){
 const clone=value=>structuredClone(value);
 function cmsFields(state,page,defaults){return clone(state.cmsDrafts?.[page]||state.cmsPages?.[page]||defaults[page]);}
 function stageCms(state,page,fields){state.cmsDrafts=state.cmsDrafts||{};state.cmsDrafts[page]=clone(fields);}
 function validateCms(fields){return fields.heading.trim()&&fields.cta.trim()?null:'Add a main heading and a button label before saving.';}
 function prepareCms(state,page,fields){const saved=state.cmsPages?.[page];state.cmsPages=state.cmsPages||{};state.cmsPages[page]=clone(fields);return {page,previous:saved?clone(saved):null};}
 function rollbackCms(state,change){if(change.previous)state.cmsPages[change.page]=change.previous;else delete state.cmsPages[change.page];}
 function validSchedule(state){const time=v=>/^\d{2}:\d{2}$/.test(v)&&Number(v.slice(0,2))<24&&Number(v.slice(3))<60;return !!state.stateName.trim()&&Array.isArray(state.stateDays)&&state.stateDays.length>0&&state.stateDays.every(d=>Number.isInteger(d)&&d>=0&&d<=6)&&time(state.stateStart)&&time(state.stateEnd)&&state.stateStart!==state.stateEnd;}
 function distribute(total,weights){const sum=weights.reduce((a,b)=>a+b,0),exact=weights.map(w=>total*w/sum),values=exact.map(Math.floor);const order=exact.map((v,i)=>({i,part:v-values[i]})).sort((a,b)=>b.part-a.part||a.i-b.i);for(let n=total-values.reduce((a,b)=>a+b,0),i=0;i<n;i++)values[order[i].i]++;return values;}
 const api={cmsFields,stageCms,validateCms,prepareCms,rollbackCms,validSchedule,distribute};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.ffPortalModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
