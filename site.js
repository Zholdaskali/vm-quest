(function(){'use strict';
const brief=document.querySelector('.brief-disclosure');if(brief&&matchMedia('(max-width:700px)').matches)brief.open=false;
const nav=document.querySelector('.site-nav'),menu=document.querySelector('.mobile-toggle');
function closeMenu(){nav?.classList.remove('menu-open');menu?.setAttribute('aria-expanded','false');}
if(menu)menu.onclick=()=>{const open=nav.classList.toggle('menu-open');menu.setAttribute('aria-expanded',String(open));};
nav?.querySelectorAll('.nav-links a').forEach(a=>{a.addEventListener('click',closeMenu);if(new URL(a.href).pathname===location.pathname)a.setAttribute('aria-current','page');});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});document.addEventListener('click',e=>{if(nav&&!nav.contains(e.target))closeMenu();});
const zoomDialog=document.getElementById('diagramDialog');const expand=document.getElementById('expandDiagram');if(expand)expand.onclick=()=>{const clone=document.querySelector('.hero-diagram').cloneNode(true);clone.querySelector('.motion-packet')?.remove();document.getElementById('diagramZoom').replaceChildren(clone);zoomDialog.showModal();};const closeZoom=document.getElementById('closeDiagram');if(closeZoom)closeZoom.onclick=()=>zoomDialog.close();
const reduce=matchMedia('(prefers-reduced-motion: reduce)'),toggle=document.getElementById('motionToggle');let paused=reduce.matches;
try{if(localStorage.getItem('processlab.motion')==='paused')paused=true;}catch(e){}
const images=[...document.querySelectorAll('img[data-gif]')],svgs=[...document.querySelectorAll('.hero-diagram')];
function imageState(img){const target=(!paused&&img.dataset.inView==='true')?img.dataset.gif:img.dataset.still;if(target&&img.getAttribute('src')!==target)img.src=target;}
function applyMotion(){document.documentElement.classList.toggle('motion-paused',paused);for(const svg of svgs){if(paused||document.hidden)svg.pauseAnimations?.();else svg.unpauseAnimations?.();}images.forEach(imageState);if(toggle){toggle.textContent=paused?'▶ Включить анимации':'Ⅱ Приостановить анимации';toggle.setAttribute('aria-pressed',String(paused));}}
if(toggle)toggle.onclick=()=>{paused=!paused;try{localStorage.setItem('processlab.motion',paused?'paused':'running');}catch(e){}applyMotion();};
reduce.addEventListener?.('change',e=>{paused=e.matches;applyMotion();});
const observer='IntersectionObserver' in window?new IntersectionObserver(entries=>{for(const entry of entries){entry.target.dataset.inView=String(entry.isIntersecting);imageState(entry.target);}},{rootMargin:'80px'}):null;
images.forEach(img=>{if(observer)observer.observe(img);else{img.dataset.inView='true';imageState(img);}});
const labels=['Регистрация заявки','Классификация проблемы','Назначение инженера','Устранение неисправности','Проверка результата','Закрытие заявки'];let step=0;
function markStep(){document.querySelectorAll('[data-demo-step]').forEach(n=>n.classList.toggle('active',Number(n.dataset.demoStep)===step));const label=document.getElementById('demoStep');if(label)label.textContent=String(step+1).padStart(2,'0')+' · '+labels[step];}
if(svgs.length){markStep();setInterval(()=>{if(!paused&&!document.hidden){step=(step+1)%6;markStep();}},1667);}
document.addEventListener('visibilitychange',applyMotion);applyMotion();
})();
