(function(root){
'use strict';
const points=[10,20,20,20,20,10],prices={cpu:{4:2,8:4},ram:{8:2,16:4,32:8},disk:{32:1,64:2}};
class ModelError extends Error{}
function initial(){return {hardware:{cpu:4,ram:8,disk:32},assembled:false,on:false,hypervisor:false,vms:[],completed:[],flags:{},stress:false,lastHttp:null,events:['Миссия: разместить сервер и клиент в двух гостевых ОС на одном учебном компьютере.'],score:0};}
function cost(h){return Object.keys(prices).reduce((n,k)=>n+prices[k][h[k]],0);}
function log(s,t){s.events=[...s.events,t].slice(-18);}
function mark(s,n){if(!s.completed.includes(n)&&Array.from({length:n-1},(_,i)=>i+1).every(i=>s.completed.includes(i))){s.completed.push(n);log(s,'Миссия '+n+' выполнена.');}}
function pair(s){return [s.vms.find(v=>v.os==='ubuntu'&&v.apps.includes('java')),s.vms.find(v=>v.os==='debian'&&v.apps.includes('client'))];}
function reduce(state,a){
 if(!a||typeof a!=='object'||Array.isArray(a))throw new ModelError('Ожидается действие конструктора.');
 const s=JSON.parse(JSON.stringify(state));const fail=t=>{throw new ModelError(t);};const vm=()=>s.vms.find(v=>v.id===a.vm)||fail('Выбери существующую VM.');const stopped=v=>{if(v.on)fail('Для изменения конфигурации сначала выключи эту VM. Другая может продолжать работать.');};
 switch(a.type){
 case 'hardware':{
  if(s.on)fail('Сначала выключи учебный хост. Реальное железо не заменяют на работающем компьютере.');
  const h=a.hardware;if(!h||Array.isArray(h)||Object.keys(h).length!==3||Object.keys(prices).some(k=>!Number.isInteger(h[k])||!Object.hasOwn(prices[k],h[k])))fail('Выбери компоненты из набора.');
  if(cost(h)>10)fail('Бюджет — 10 монет. Попробуй другую конфигурацию.');
  if(s.vms.some(v=>v.cpu>8||v.ram>h.ram||v.disk>h.disk)||s.vms.reduce((n,v)=>n+v.disk,0)>h.disk)fail('Новые компоненты меньше уже выделенных ресурсов.');
  s.hardware={...h};s.assembled=true;s.on=true;mark(s,1);log(s,'Хост собран за '+cost(h)+' из 10 монет. CPU и RAM физически конечны.');break;}
 case 'hypervisor':
  if(!s.on)fail('Сначала собери и включи хост.');s.hypervisor=true;log(s,'Слой виртуализации установлен. Он предоставляет гостям виртуальные устройства и распределяет ресурсы хоста.');break;
 case 'create':{
  if(!s.on||!s.hypervisor)fail('Без слоя виртуализации создать гостевую машину в этом конструкторе нельзя.');if(s.vms.length>=2)fail('В этой миссии нужны две VM. Настрой существующие.');
  const id='vm'+(s.vms.length+1);s.vms.push({id,cpu:1,ram:1,disk:4,os:null,apps:[],on:false,boot:0});log(s,'Создана '+id+': виртуальные устройства есть, гостевая ОС ещё не установлена.');break;}
 case 'config':{
  const v=vm();stopped(v);for(const [k,min,max] of [['cpu',1,8],['ram',1,16],['disk',4,32]])if(!Number.isInteger(a[k])||a[k]<min||a[k]>max)fail('Проверь диапазон '+k+'.');
  if(s.vms.filter(x=>x.id!==v.id).reduce((n,x)=>n+x.disk,0)+a.disk>s.hardware.disk)fail('Не хватает дискового бюджета хоста. Диск учитывается и у выключенной VM.');
  Object.assign(v,{cpu:a.cpu,ram:a.ram,disk:a.disk});log(s,v.id+': конфигурация сохранена. Это доля ресурсов хоста, а не новое физическое железо.');break;}
 case 'os':{
  const v=vm();stopped(v);if(!['ubuntu','debian'].includes(a.os))fail('Выбери Ubuntu или Debian.');if(v.os&&v.os!==a.os)fail('ОС уже установлена. Для миссии установи другую ОС во вторую VM.');v.os=a.os;log(s,'В '+v.id+' установлена '+v.os+': отдельное ядро и файловая система.');break;}
 case 'app':{
  const v=vm();stopped(v);if(!v.os)fail('Сначала установи гостевую ОС.');if(!['java','client'].includes(a.app))fail('Приложение отсутствует в наборе.');if(!v.apps.includes(a.app))v.apps.push(a.app);log(s,(a.app==='java'?'Java-сервер':'Клиент')+' помещён внутрь '+v.id+'. Приложение зависит от этой гостевой ОС.');break;}
 case 'vm-power':{
  const v=vm();if(v.on){v.on=false;log(s,v.id+' остановлена. Её процессы не выполняются, виртуальный диск сохранён.');break;}
  if(!s.on||!s.hypervisor||!v.os)fail('Нужны включённый хост, слой виртуализации и установленная ОС.');
  const required=v.apps.includes('java')?(s.stress?6:3):v.apps.includes('client')?2:1;
  if(v.ram<required||(v.apps.includes('java')&&(v.cpu<2||v.disk<8))||(v.apps.includes('client')&&v.disk<6))fail('Для этой учебной нагрузки ресурсов гостя не хватает: Java требует 2 vCPU, '+required+' ГБ RAM и 8 ГБ диска; клиент — 1 vCPU, 2 ГБ RAM и 6 ГБ диска.');
  const used=4+s.vms.filter(x=>x.on).reduce((n,x)=>n+x.ram+.5,0)+v.ram+.5;if(used>s.hardware.ram)fail('Не хватает RAM хоста: macOS 4 ГБ + 0,5 ГБ на каждую запущенную VM + RAM гостей. Выключи хост и замени модуль памяти или пересмотри план.');
  v.on=true;v.boot++;log(s,v.id+' загружена. RAM занята; vCPU получают время физических ядер.');break;}
 case 'request':{
  const [server,client]=pair(s);if(!client||!client.on)fail('Для запроса нужен работающий клиент в Debian.');const status=server&&server.on&&(!s.stress||server.ram>=6)?200:503;s.lastHttp=status;log(s,'Debian → виртуальная сеть → Ubuntu: HTTP '+status+'.');
  if(status===200){mark(s,3);if(s.flags.isolated)mark(s,4);if(s.stress&&(s.flags.oom||s.flags.prepared)&&server.ram>=6)mark(s,5);if(s.flags.hostFailure)mark(s,6);}
  else if(server&&!server.on&&s.completed.includes(3)){s.flags.isolated=true;log(s,'Отказ изолирован: клиент Debian продолжает выполняться; сервер Ubuntu выключен. Верни Ubuntu и повтори запрос.');}
  else if(server&&server.on&&s.stress){s.flags.oom=true;log(s,'Гостевое ядро работает, но памяти Java-процессу не хватило. OOM в модели: исправь ресурсы сервера.');}break;}
 case 'stress':{
  if(!s.completed.includes(4))fail('Сначала исследуй изоляцию: выключи серверную VM, отправь запрос, восстанови сервер.');const [server]=pair(s);if(server&&server.ram>=6)s.flags.prepared=true;s.stress=true;log(s,'Нагрузка Java выросла: теперь ей нужно 6 ГБ RAM. Проверь запросом, что сломалось.');break;}
 case 'host-power':
  if(!s.assembled)fail('Сначала собери компьютер.');if(s.on){if(s.completed.includes(5)&&s.vms.every(v=>v.on))s.flags.hostFailure=true;s.on=false;s.vms.forEach(v=>v.on=false);log(s,'Хост выключен: остановились все гости. Один физический компьютер — общий домен отказа.');}else{s.on=true;log(s,'Хост включён. Гостевые ОС нужно запустить отдельно.');}break;
 case 'reset':return initial();
 default:fail('Неизвестное действие.');
 }
 if(s.hypervisor&&s.vms.length===2&&new Set(s.vms.map(v=>v.os)).size===2&&s.vms.some(v=>v.os==='ubuntu')&&s.vms.some(v=>v.os==='debian'))mark(s,2);
 s.score=s.completed.reduce((n,i)=>n+points[i-1],0);return s;
}
root.VMEngine={initial,reduce,cost,points};if(typeof module!=='undefined')module.exports=root.VMEngine;
})(globalThis);
