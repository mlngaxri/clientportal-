/* Fixed, authored demo content. No customer data, remote assets or service calls. */
const interior = (warm: boolean) => `
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1040" viewBox="0 0 1600 1040">
  <defs>
    <linearGradient id="wall" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${warm ? '#d8c2a7' : '#d8d7cc'}"/><stop offset="1" stop-color="${warm ? '#a77e5e' : '#aeb0a0'}"/></linearGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${warm ? '#987252' : '#85877a'}"/><stop offset="1" stop-color="${warm ? '#4b382d' : '#4c5048'}"/></linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#e9eee0" stop-opacity=".96"/><stop offset=".56" stop-color="#a8b59d" stop-opacity=".92"/><stop offset="1" stop-color="#697766" stop-opacity=".96"/></linearGradient>
    <radialGradient id="light"><stop stop-color="#fff7df" stop-opacity=".96"/><stop offset=".42" stop-color="#f5ddac" stop-opacity=".38"/><stop offset="1" stop-color="#f5ddac" stop-opacity="0"/></radialGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="16"/></filter>
    <filter id="grain" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="3" seed="7"/><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 .12 0"/></filter>
    <filter id="shadow"><feDropShadow dx="0" dy="18" stdDeviation="20" flood-color="#1d1a16" flood-opacity=".24"/></filter>
  </defs>
  <rect width="1600" height="1040" fill="url(#wall)"/>
  <path d="M0 0h1600v190L0 470z" fill="#f0e7d9" opacity=".62"/>
  <rect y="710" width="1600" height="330" fill="url(#floor)"/>
  <g filter="url(#shadow)">
    <rect x="92" y="170" width="480" height="510" rx="4" fill="#34473b"/>
    <rect x="116" y="194" width="432" height="462" fill="url(#glass)"/>
    <path d="M332 194v462M116 420h432" stroke="#35463b" stroke-width="13"/>
    <rect x="988" y="118" width="506" height="546" rx="4" fill="#3d4d42"/>
    <rect x="1012" y="142" width="458" height="498" fill="url(#glass)"/>
    <path d="M1241 142v498M1012 380h458" stroke="#3d4d42" stroke-width="14"/>
  </g>
  <ellipse cx="802" cy="248" rx="300" ry="260" fill="url(#light)" filter="url(#blur)"/>
  <path d="M760 560V298" stroke="#4e4434" stroke-width="8"/>
  <path d="M675 330Q760 182 845 330Z" fill="#f1e5cd"/>
  <ellipse cx="760" cy="336" rx="104" ry="20" fill="#d1b88d" opacity=".45"/>
  <g filter="url(#shadow)">
    <ellipse cx="468" cy="764" rx="280" ry="75" fill="#4f4034"/>
    <ellipse cx="468" cy="744" rx="280" ry="75" fill="#d8bd93"/>
    <path d="M446 805v235M491 805v235" stroke="#4f4235" stroke-width="20"/>
    <ellipse cx="1118" cy="728" rx="226" ry="64" fill="#d8c29c"/>
    <path d="M1118 777v263" stroke="#4c4035" stroke-width="24"/>
  </g>
  <g fill="#f7f0df"><ellipse cx="348" cy="717" rx="34" ry="9"/><ellipse cx="540" cy="724" rx="42" ry="10"/><ellipse cx="1043" cy="706" rx="37" ry="9"/></g>
  <g fill="#6f5946"><ellipse cx="348" cy="717" rx="13" ry="5"/><ellipse cx="540" cy="724" rx="16" ry="5"/></g>
  <g stroke="#40583f" stroke-width="18" fill="none" stroke-linecap="round"><path d="M180 820Q126 625 157 560M171 708Q68 686 72 603M165 663Q256 615 246 548M153 606Q90 566 99 505"/></g>
  <path d="M109 782h118l-16 160h-82z" fill="#9c694e"/>
  <g stroke="#443d32" stroke-width="17" fill="none"><path d="M702 888V775q53-52 106 0v113M691 880h128M708 886v154M802 886v154M1234 894V792q50-49 100 0v102M1224 886h121M1240 892v148M1328 892v148"/></g>
  <rect width="1600" height="1040" filter="url(#grain)" opacity=".34" style="mix-blend-mode:soft-light"/>
  <rect width="1600" height="1040" fill="${warm ? '#6f3d21' : '#6b705f'}" opacity="${warm ? '.055' : '.035'}"/>
</svg>`;
const data = (s: string) => `data:image/svg+xml,${encodeURIComponent(s)}`;
export const originalImage = "/marketing/mori-interior.webp";
export const replacementImage = "/marketing/mori-warm.webp";
export const demoPages = [
  { path: "/", label: "Home" },
  { path: "/menu", label: "Menu" },
  { path: "/visit", label: "Visit" },
];
export function demoSite(page: string, replaced = false, heading = "A table worth\nstaying for.") {
  const image = replaced ? replacementImage : originalImage;
  const safeHeading = heading.replace(/[<>&"']/g,(c)=>({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;","'":"&#39;"})[c]!);
  const title = page === "/menu" ? "Made for the\nway the day feels." : page === "/visit" ? "Come by.\nStay a while." : safeHeading;
  const sub = page === "/menu" ? "A short menu that follows the market, not the calendar." : page === "/visit" ? "Morning coffee, long lunch, something small on the way home." : "Quiet ingredients, considered technique and an intimate room designed around the evening.";
  const pageBlock = page === "/menu" ? `<section class="menu-list"><div><span>Morning</span><b>Sourdough, cultured butter</b><i>9</i></div><div><span>Garden</span><b>Leaves, tahini, preserved lemon</b><i>19</i></div><div><span>Lunch</span><b>Roast pumpkin, lentils, herbs</b><i>24</i></div><div><span>Market</span><b>Fish, brown butter, lemon</b><i>32</i></div></section>` : page === "/visit" ? `<section class="visit"><div><small>Hours</small><p data-fourthform-id="hours">Mon–Fri&nbsp;&nbsp;7:00–15:00<br>Sat–Sun&nbsp;&nbsp;8:00–16:00</p></div><div><small>Find us</small><p>18 Morrow Lane<br>Brisbane, QLD</p></div></section>` : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; form-action 'none'; base-uri 'none'"><style>
*{box-sizing:border-box}html{background:#eeeae0}body{margin:0;background:#eeeae0;color:#233128;font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}nav{height:76px;display:flex;align-items:center;justify-content:space-between;padding:0 5.5%;border-bottom:1px solid #c9c7bd}nav strong{font-size:25px;font-weight:500;letter-spacing:-1.1px}nav div{display:flex;gap:28px}a{color:inherit;text-decoration:none;font-size:12px}main{padding:52px 5.5% 44px}header{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:56px;align-items:end;margin-bottom:38px}small{font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:#6f746d}h1{font-family:"Iowan Old Style","Baskerville",Georgia,serif;font-weight:400;white-space:pre-line;font-size:clamp(58px,7.2vw,104px);line-height:.89;letter-spacing:-.055em;margin:21px 0 0;max-width:880px}header p{font-size:13px;line-height:1.7;color:#60665f;margin:0 0 16px}.line-link{display:inline-block;border-bottom:1px solid #788076;padding-bottom:4px}.hero-wrap{position:relative}.hero-wrap:after{content:"Mori House / Brisbane";position:absolute;right:13px;bottom:12px;color:white;font-size:9px;letter-spacing:.11em;text-transform:uppercase;text-shadow:0 1px 12px #0008}.hero{display:block;width:100%;height:440px;object-fit:cover;object-position:center 56%;filter:saturate(.88) contrast(.98)}footer{height:64px;padding:0 5.5%;display:flex;align-items:center;justify-content:space-between;font-size:10px;color:#75766f;border-top:1px solid #c9c7bd}.menu-list{display:grid;grid-template-columns:1fr 1fr;column-gap:70px;margin:6px 0 46px;border-top:1px solid #c9c7bd}.menu-list div{display:grid;grid-template-columns:72px 1fr auto;gap:14px;padding:18px 0;border-bottom:1px solid #c9c7bd;align-items:baseline}.menu-list span{font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:#7d7f77}.menu-list b{font-size:13px;font-weight:400}.menu-list i{font-size:11px;font-style:normal;color:#696d67}.visit{display:grid;grid-template-columns:1fr 1fr;gap:60px;margin:8px 0 54px;border-top:1px solid #c9c7bd;padding-top:24px}.visit p{font-family:"Iowan Old Style","Baskerville",Georgia,serif;font-size:28px;line-height:1.25;letter-spacing:-.03em;margin:10px 0}a:focus-visible,button:focus-visible{outline:2px solid #665cf6;outline-offset:4px}#hint{position:fixed;display:none;pointer-events:none;background:#20201d;color:#faf9f5;font:11px "Helvetica Neue",Arial,sans-serif;padding:6px 9px;border-radius:6px;z-index:100;box-shadow:0 8px 20px #0002}@media(max-width:700px){nav{height:64px;padding:0 20px}nav strong{font-size:22px}nav div{gap:15px}main{padding:36px 20px}header{grid-template-columns:1fr;gap:18px}h1{font-size:58px}header p{max-width:430px}.hero{height:370px}.menu-list{grid-template-columns:1fr}.visit{grid-template-columns:1fr;gap:22px}footer{padding:0 20px}.hero-wrap:after{display:none}}@media(max-width:700px){nav{height:42px;padding:0 16px}nav strong{font-size:16px;letter-spacing:-.04em}nav div{gap:12px}nav a{font-size:9px}main{padding:18px 16px 24px}header{gap:9px;margin-bottom:18px}h1{font-size:42px;margin:12px 0 0;line-height:.96}small{font-size:7px;letter-spacing:.1em}header>div:last-child{display:none}.hero{height:240px;object-position:center 56%}}@media(max-width:430px){h1{font-size:37px}.hero{height:210px}}</style></head><body>
<nav><strong data-fourthform-id="wordmark">Mori House</strong><div><a href="/" data-page="/">Home</a><a href="/menu" data-page="/menu">Menu</a><a href="/visit" data-page="/visit">Visit</a></div></nav>
<main><header><div><small>Season-led Japanese dining · Brisbane</small><h1 data-fourthform-id="headline">${title}</h1></div><div><p data-fourthform-id="intro">${sub}</p><a class="line-link" href="/menu" data-page="/menu">Explore the menu ↗</a></div></header>${pageBlock}<div class="hero-wrap"><img class="hero" data-fourthform-id="opening-image" src="${image}" alt="A warm, sunlit neighbourhood dining room" /></div></main><footer><span>Seasonal food, everyday.</span><span>A fictional Fourthform website.</span></footer><span id="hint"></span><script>
let enabled=true,pins=[];const page=${JSON.stringify(page)},origin='*';const hint=document.getElementById('hint');
function send(x){parent.postMessage(x,origin)}
function context(el){const r=el.getBoundingClientRect();return{replaceable:el instanceof HTMLImageElement,page,width:innerWidth,scroll:scrollY,selector:'[data-fourthform-id="'+el.dataset.fourthformId+'"]',rect:{x:r.x,y:r.y,width:r.width,height:r.height}}}
function replace(el,x,y){const raw=decodeURIComponent(${JSON.stringify(replacementImage)}.split(',')[1]);const file=new File([raw],'Morrow replacement.svg',{type:'image/svg+xml'});send({type:'ff-replace',context:context(el),file,point:{x:x??el.getBoundingClientRect().x,y:y??el.getBoundingClientRect().y}})}
addEventListener('message',e=>{if(e.source!==parent)return;const m=e.data;if(m?.type==='ff-mode'){enabled=m.enabled;send({type:'ff-ready'});send({type:'ff-page',page})}if(m?.type==='ff-pins'){pins=m.pins;document.querySelectorAll('.pin').forEach(p=>p.remove());pins.forEach((p,i)=>{if(p.target?.page!==page)return;let el;try{el=document.querySelector(p.target.selector)}catch{}if(!el)return;const b=document.createElement('button');b.className='pin';b.textContent=String(i+1);b.setAttribute('aria-label','Direction '+(i+1));const r=el.getBoundingClientRect();b.style.cssText='position:absolute;z-index:20;left:'+r.left+'px;top:'+(r.top+scrollY)+'px;width:26px;height:26px;border-radius:50%;border:2px solid white;background:#665cf6;color:white;font:11px Arial';b.onclick=()=>send({type:'ff-pin',id:p.id});document.body.appendChild(b)})}if(m?.type==='ff-demo-replace'){const el=document.querySelector('[data-fourthform-id="opening-image"]');replace(el)} });
document.addEventListener('click',e=>{if(e.target.closest('.pin'))return;const a=e.target.closest('[data-page]');if(a){e.preventDefault();send({type:'ff-demo-page',page:a.dataset.page});return}if(!enabled)return;const el=e.target.closest('[data-fourthform-id]');if(el){e.preventDefault();send({type:'ff-target',context:context(el),label:el.alt||el.textContent})}});
document.addEventListener('dragover',e=>{const el=e.target.closest('img[data-fourthform-id]');if(!el||!enabled)return;e.preventDefault();el.style.outline='1px solid #665cf6';el.style.outlineOffset='-1px';hint.textContent='Drop to replace';hint.style.display='block';hint.style.left=(e.clientX+12)+'px';hint.style.top=(e.clientY+12)+'px'});
document.addEventListener('dragleave',()=>{document.querySelectorAll('img').forEach(el=>{el.style.outline='';el.style.outlineOffset='' });hint.style.display='none'});
document.addEventListener('drop',e=>{e.preventDefault();hint.style.display='none';const el=e.target.closest('img[data-fourthform-id]');if(!el||!enabled)return;el.style.outline='';el.style.outlineOffset='';replace(el,e.clientX,e.clientY)});
send({type:'ff-ready'});
</script></body></html>`;
}
