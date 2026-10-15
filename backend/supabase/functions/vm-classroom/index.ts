import './engine.js';
const engine=(globalThis as any).VMEngine;
class HttpError extends Error {constructor(public status:number,message:string,public extra:Record<string,unknown>={}){super(message);}}
const originAllowed=(origin:string)=>origin==='https://zholdaskali.github.io'||/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin);
const dbURL=()=>Deno.env.get('SUPABASE_URL')!;
const service=()=>Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
async function hash(value:string){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('');}
function randomHex(){return Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('');}
function roomCode(){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';return Array.from(crypto.getRandomValues(new Uint8Array(8)),v=>alphabet[v%alphabet.length]).join('');}
function same(a:string,b:string){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
async function db(table:string,query:string,method='GET',body?:unknown){
 const headers:Record<string,string>={apikey:service(),Authorization:'Bearer '+service(),'Content-Type':'application/json',Prefer:'return=representation'};
 const r=await fetch(dbURL()+'/rest/v1/'+table+'?'+query,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
 const data=await r.json();if(!r.ok){if(r.status===409)throw new HttpError(409,'Этот ник уже занят. Выбери другой.');throw new HttpError(503,'Хранилище результатов временно недоступно.');}return data;
}
async function teacher(req:Request){const key=req.headers.get('X-Teacher-Key')||'';if(key.length<24||key.length>256)throw new HttpError(403,'Нужен секрет преподавателя.');const rows=await db('vm_settings','select=teacher_hash&singleton=eq.true');if(!rows.length)throw new HttpError(503,'Доступ преподавателя ещё не настроен.');if(!same(await hash(key),rows[0].teacher_hash))throw new HttpError(403,'Секрет преподавателя неверный.');}
async function student(req:Request){const token=req.headers.get('X-Student-Token')||'';if(!/^[a-f0-9]{64}$/.test(token))throw new HttpError(401,'Войди в группу по коду и нику.');const rows=await db('vm_students','select=*&token_hash=eq.'+await hash(token));if(!rows.length)throw new HttpError(401,'Вход в группу не найден.');const row=rows[0];const room=await db('vm_rooms','select=id,closed&id=eq.'+row.room_id);if(!room.length||room[0].closed)throw new HttpError(403,'Группа закрыта преподавателем.');return row;}
const safeUUID=(value:unknown)=>typeof value==='string'&&/^[a-f0-9-]{36}$/.test(value);
export async function handle(req:Request){
 const origin=req.headers.get('Origin')||'';const cors:Record<string,string>={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Headers':'content-type,apikey,x-student-token,x-teacher-key','Access-Control-Allow-Methods':'POST,OPTIONS'};
 if(originAllowed(origin))cors['Access-Control-Allow-Origin']=origin;
 const reply=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers:cors});
 if(origin&&!originAllowed(origin))return reply(403,{error:'Этот сайт не разрешён для занятия.'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return reply(405,{error:'Используй POST.'});
 try{
  const text=await req.text();if(text.length>8192)throw new HttpError(413,'Слишком большой запрос.');
  const p=JSON.parse(text);if(!p||typeof p!=='object'||Array.isArray(p))throw new HttpError(400,'Ожидается JSON-объект.');
  if(['rooms','create-room','roster'].includes(p.op)){
   await teacher(req);
   if(p.op==='rooms')return reply(200,{rooms:await db('vm_rooms','select=id,code,created_at,closed&order=created_at.desc&limit=100')});
   if(p.op==='create-room'){
    const rows=await db('vm_rooms','select=id,code,created_at','POST',{code:roomCode()});return reply(200,{room:rows[0]});
   }
   if(!safeUUID(p.roomId))throw new HttpError(400,'Выбери группу.');
   const rooms=await db('vm_rooms','select=code&id=eq.'+p.roomId);if(!rooms.length)throw new HttpError(404,'Группа не найдена.');
   return reply(200,{code:rooms[0].code,students:await db('vm_students','select=id,nickname,state,revision,last_seen,created_at&room_id=eq.'+p.roomId+'&order=created_at.asc&limit=120')});
  }
  if(p.op==='join'){
   if(typeof p.code!=='string'||!/^[A-Z2-9]{8}$/.test(p.code))throw new HttpError(400,'Нужен восьмизначный код группы.');
   if(typeof p.name!=='string'||!/^[-\p{L}\p{N} _]{2,32}$/u.test(p.name.trim()))throw new HttpError(400,'Ник: 2–32 буквы или цифры.');
   const rooms=await db('vm_rooms','select=id&closed=eq.false&code=eq.'+p.code);if(!rooms.length)throw new HttpError(404,'Проверь код группы.');
   const existing=await db('vm_students','select=id&room_id=eq.'+rooms[0].id+'&limit=120');if(existing.length>=120)throw new HttpError(409,'Группа заполнена.');
   const token=randomHex(),state=engine.initial();const rows=await db('vm_students','select=id,state,revision','POST',{room_id:rooms[0].id,nickname:p.name.trim(),token_hash:await hash(token),state});
   return reply(200,{token,...rows[0]});
  }
  const row=await student(req);
  if(p.op==='state')return reply(200,{id:row.id,state:row.state,revision:row.revision});
  if(p.op==='heartbeat'){await db('vm_students','id=eq.'+row.id,'PATCH',{last_seen:new Date().toISOString()});return reply(200,{ok:true});}
  if(p.op==='action'){
   if(!Number.isInteger(p.revision)||p.revision!==row.revision)throw new HttpError(409,'Сборка обновилась в другом окне. Повтори действие после синхронизации.',{state:row.state,revision:row.revision});
   let state;try{state=engine.reduce(row.state,p.action);}catch(e){throw new HttpError(409,(e as Error).message);}
   const updated=await db('vm_students','id=eq.'+row.id+'&revision=eq.'+row.revision+'&select=id,state,revision','PATCH',{state,revision:row.revision+1,last_seen:new Date().toISOString()});
   if(!updated.length){const current=await student(req);throw new HttpError(409,'Сборка изменилась, повтори действие.',{state:current.state,revision:current.revision});}
   return reply(200,updated[0]);
  }
  throw new HttpError(404,'Неизвестная операция.');
 }catch(error){if(error instanceof HttpError)return reply(error.status,{error:error.message,...error.extra});if(error instanceof SyntaxError)return reply(400,{error:'Некорректный JSON.'});return reply(503,{error:'Сервер временно недоступен.'});}
}
Deno.serve(handle);
