'use strict';
(()=>{
const el=id=>document.getElementById(id);let invite='',svg='';
window.updateJoinScreen=(url,code,count)=>{
 if(invite!==url){
  const qr=qrcode(0,'M');qr.addData(url);qr.make();
  svg=qr.createSvgTag({cellSize:8,margin:32,scalable:true});
  invite=url;el('joinQR').innerHTML=svg;el('joinCode').textContent=code;el('joinFeedback').textContent='';
 }
 el('joinCount').textContent=count?'Подключились: '+count:'Ожидаем участников';el('showJoin').disabled=false;
};
window.setJoinTopic=kind=>{
 const logic=kind==='business';
 document.querySelector('.join-bottom span').textContent=logic?'БИЗНЕС-МОДЕЛИРОВАНИЕ · ПРАКТИКА':'ВИРТУАЛИЗАЦИЯ · ИНТЕРАКТИВНАЯ ПРАКТИКА';
 document.querySelector('.join-steps li:last-child span').textContent=logic?'Создай первый артефакт проекта':'Начни первую миссию';
 el('joinTitle').innerHTML=logic?'Построй процесс.<br>Проверь улучшение.<br><span>Твой ход.</span>':'Один компьютер.<br>Две системы.<br><span>Твой ход.</span>';
 document.querySelector('.join-description').innerHTML=logic?'Смоделируй обслуживание заявки.<br>Маршрут, данные, роли и эксперимент.':'Собери виртуальную лабораторию.<br>Распредели ресурсы. Восстанови сервер.';
 document.querySelector('.ticket-address').textContent=logic?'zholdaskali.github.io/vm-quest/business/':'zholdaskali.github.io/vm-quest/vm.html';
};
el('showJoin').onclick=()=>{
 const link=el('invite').href,code=el('roomCode').textContent.trim();
 if(!code||!new URL(link).searchParams.get('code')){el('connection').textContent='Сначала выбери или создай группу.';return;}
 try{window.updateJoinScreen(link,code,Number((el('count').textContent.match(/\d+/)||['0'])[0]));el('joinDialog').showModal();}
 catch(e){el('connection').textContent='Не удалось построить QR. Обнови страницу и попробуй ещё раз.';}
};
el('closeJoin').onclick=async()=>{if(document.fullscreenElement&&document.exitFullscreen)await document.exitFullscreen().catch(()=>{});el('joinDialog').close();};
el('fullscreenJoin').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(el('joinDialog').requestFullscreen)await el('joinDialog').requestFullscreen();else el('joinFeedback').textContent='Используй полноэкранный режим браузера.';}catch(e){el('joinFeedback').textContent='Используй полноэкранный режим браузера.';}};
el('copyJoin').onclick=async()=>{try{await navigator.clipboard.writeText(invite);el('joinFeedback').textContent='Ссылка скопирована';}catch(e){el('joinFeedback').textContent='Скопируй ссылку из пульта преподавателя.';}};
el('downloadQR').onclick=()=>{if(!svg)return;const blob=new Blob([svg],{type:'image/svg+xml'}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='VM-Quest-'+el('joinCode').textContent+'.svg';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
})();
