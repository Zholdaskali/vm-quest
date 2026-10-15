'use strict';
(()=>{
const el=id=>document.getElementById(id);let invite='',svg='';
window.updateJoinScreen=(url,code,count)=>{
 if(invite!==url){
  invite=url;const qr=qrcode(0,'M');qr.addData(url);qr.make();
  svg=qr.createSvgTag({cellSize:8,margin:32,scalable:true});
  el('joinQR').innerHTML=svg;el('joinCode').textContent=code;el('joinFeedback').textContent='';
 }
 el('joinCount').textContent=count?'Подключились: '+count:'Ожидаем участников';el('showJoin').disabled=false;
};
el('showJoin').onclick=()=>{if(invite)el('joinDialog').showModal();};
el('closeJoin').onclick=async()=>{if(document.fullscreenElement&&document.exitFullscreen)await document.exitFullscreen().catch(()=>{});el('joinDialog').close();};
el('fullscreenJoin').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(el('joinDialog').requestFullscreen)await el('joinDialog').requestFullscreen();else el('joinFeedback').textContent='Используй полноэкранный режим браузера.';}catch(e){el('joinFeedback').textContent='Используй полноэкранный режим браузера.';}};
el('copyJoin').onclick=async()=>{try{await navigator.clipboard.writeText(invite);el('joinFeedback').textContent='Ссылка скопирована';}catch(e){el('joinFeedback').textContent='Скопируй ссылку из пульта преподавателя.';}};
el('downloadQR').onclick=()=>{if(!svg)return;const blob=new Blob([svg],{type:'image/svg+xml'}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='VM-Quest-'+el('joinCode').textContent+'.svg';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
})();
