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
