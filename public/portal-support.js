function bindCarousel(){
 document.querySelectorAll('.plate-section').forEach(section=>{
  const track=section.querySelector('.plate-track'), slides=[...track.children], prev=section.querySelector('[data-slide="-1"]'),next=section.querySelector('[data-slide="1"]');
  const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
  let index=0,raf;
  function update(){index=slides.reduce((best,el,i)=>Math.abs(el.offsetLeft-track.offsetLeft-track.scrollLeft)<Math.abs(slides[best].offsetLeft-track.offsetLeft-track.scrollLeft)?i:best,0);section.querySelector('.plate-count').textContent=String(index+1).padStart(2,'0')+' / '+String(slides.length).padStart(2,'0');prev.disabled=index===0;next.disabled=index===slides.length-1;}
  function move(delta){const i=Math.max(0,Math.min(slides.length-1,index+delta));track.scrollTo({left:slides[i].offsetLeft-track.offsetLeft,behavior:reduced?'instant':'smooth'});}
  prev.onclick=()=>move(-1);next.onclick=()=>move(1);
  track.onkeydown=e=>{if(e.target.isContentEditable)return;if(['ArrowRight','ArrowLeft'].includes(e.key)){e.preventDefault();move(e.key==='ArrowRight'?1:-1)}};
  track.onscroll=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(update)};update();
  const settle=()=>slides.forEach(slide=>{slide.style.removeProperty('--lift');slide.style.removeProperty('--depth');slide.style.removeProperty('--hover-scale');slide.style.removeProperty('--tilt')});
  track.addEventListener('pointermove',e=>{
   if(reduced||e.pointerType==='touch')return;
   const rect=track.getBoundingClientRect(),span=Math.max(1,rect.width*.62);
   slides.forEach(slide=>{
    const r=slide.getBoundingClientRect(),delta=(e.clientX-(r.left+r.width/2))/span,weight=Math.exp(-Math.pow(delta*2.15,2));
    slide.style.setProperty('--lift',(-48*weight)+'px');slide.style.setProperty('--depth',(22*weight)+'px');
    slide.style.setProperty('--hover-scale',(1+.055*weight).toFixed(3));slide.style.setProperty('--tilt',(-Math.max(-1,Math.min(1,delta))*5*weight)+'deg');
   });
  });
  track.addEventListener('pointerleave',settle);
  track.addEventListener('focusout',e=>{if(!track.contains(e.relatedTarget))settle()});
 });
}
