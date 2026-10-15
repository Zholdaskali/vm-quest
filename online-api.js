(function(){'use strict';
const KEY='vm-guide.online.v1';let profile=null;try{profile=JSON.parse(localStorage.getItem(KEY)||'null');}catch(e){}
const cfg=()=>window.VMCloud||{};
function configured(){return /^https:\/\//.test(cfg().endpoint||'');}
function status(message){const el=document.getElementById('syncStatus');if(el)el.textContent=message;}
function save(p){try{localStorage.setItem(KEY,JSON.stringify(p));profile=p;}catch(e){throw Error('Браузер не сохранил сборку. Освободи место или скачай результат перед закрытием страницы.');}}
function cloudMessage(){status('Занятие '+profile.roomCode+' · результаты проверяются сервером и доступны преподавателю.');}
async function remote(body,studentToken){
 if(!configured())throw Error('Живой режим ещё не подключён. Оставь код пустым для самостоятельной работы.');
 const headers={'Content-Type':'application/json'};if(cfg().publishableKey)headers.apikey=cfg().publishableKey;if(studentToken)headers['X-Student-Token']=studentToken;
 let r;try{r=await fetch(cfg().endpoint,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});}catch(e){throw Error('Нет связи с сервером группы. Последняя сохранённая сборка остаётся в браузере. Повтори действие после восстановления связи.');}
 const d=await r.json();if(!r.ok){const e=Error(d.error||'Сервер отклонил действие');e.status=r.status;if(d.state)e.serverState=d.state;if(d.revision!==undefined)e.revision=d.revision;throw e;}return d;
}
function validName(name){if(typeof name!=='string'||!/^[-\p{L}\p{N} _]{2,32}$/u.test(name.trim()))throw Error('Ник: 2–32 буквы или цифры, пробел, дефис или подчёркивание.');return name.trim();}
window.VMOnline={
 hasProfile:()=>!!profile,
 clearProfile:()=>{profile=null;localStorage.removeItem(KEY);},
 async api(path,payload){
  if(path==='join'){
   const name=validName(payload.name),code=(payload.code||'').trim().toUpperCase();
   if(code){const d=await remote({op:'join',name,code});save({name,mode:'class',roomCode:code,studentToken:d.token,studentId:d.id,state:d.state,revision:d.revision,createdAt:new Date().toISOString()});cloudMessage();}
   else{save({name,mode:'solo',state:VMEngine.initial(),actions:[],createdAt:new Date().toISOString()});status('Самостоятельная работа · сохраняется в этом браузере. Для отправки преподавателю скачай результат.');}
   return {token:'online-profile',name};
  }
  if(path!=='builder')throw Error('Эта функция относится к локальной лаборатории, а не онлайн-конструктору.');
  if(!profile){const e=Error('Введи ник, чтобы начать.');e.status=401;throw e;}
  if(profile.mode==='class'){
   try{const d=await remote(payload?{op:'action',action:payload.action,revision:profile.revision}:{op:'state'},profile.studentToken);save({...profile,state:d.state,revision:d.revision});cloudMessage();}
   catch(e){if(e.serverState)save({...profile,state:e.serverState,revision:e.revision??profile.revision});status('Связь с группой не подтверждена: '+e.message);throw e;}
  }else{
   if(payload){const next=VMEngine.reduce(profile.state,payload.action),actions=payload.action.type==='reset'?[]:[...(profile.actions||[]),payload.action];save({...profile,state:next,actions});}
   status('Самостоятельная работа · '+profile.name+' · результат сохраняется только в этом браузере.');
  }
  return {name:profile.name,state:profile.state};
 }
};
window.addEventListener('DOMContentLoaded',()=>{
 const download=document.getElementById('downloadReport');if(download)download.onclick=()=>{if(!profile)return status('Сначала введи ник и начни сборку.');const result={format:'vm-guide-result-v1',name:profile.name,mode:profile.mode,roomCode:profile.roomCode||null,exportedAt:new Date().toISOString(),state:profile.state,actions:profile.actions||[],note:'Файл — отчёт студента. Его можно изменить вручную; итог группового режима проверяется в пульте сервера.'};const blob=new Blob([JSON.stringify(result,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='vm-result-'+profile.name.replace(/[^\p{L}\p{N}-]/gu,'_')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 const change=document.getElementById('changeMode');if(change)change.onclick=()=>{if(!confirm('Сменить ник или режим? Сначала скачай результат, если хочешь сохранить текущую самостоятельную сборку. Данные группы на сервере останутся.'))return;window.VMOnline.clearProfile();location.reload();};
});
setInterval(()=>{if(profile?.mode==='class'&&!document.hidden)remote({op:'heartbeat'},profile.studentToken).catch(()=>status('Нет подтверждения связи с группой. Результат последнего успешного действия сохранён.'));},15000);
})();
