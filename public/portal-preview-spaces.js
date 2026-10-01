/* Each focused space keeps its own local draft. The complete workspace uses its existing keys. */
(()=>{
 const spaces={
  design:{label:'Design & feedback',view:'review',views:['overview','direction','build','review']},
  content:{label:'Content & States',view:'pages',views:['pages','states','settings']},
  insight:{label:'Audience & search',view:'analytics',views:['analytics','seo','connections','settings']},
  launch:{label:'Launch & account',view:'launch',views:['launch','domains','billing','settings']},
 };
 const id=new URLSearchParams(location.search).get('space');
 window.ffPreviewSpace=Object.hasOwn(spaces,id)?{id,...spaces[id]}:null;
 window.ffStorageKey=key=>window.ffPreviewSpace?`${key}:space:${window.ffPreviewSpace.id}`:key;
})();
