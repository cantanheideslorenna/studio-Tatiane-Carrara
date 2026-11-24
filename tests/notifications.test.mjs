import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {api} from '../src/api.js';
import {listManualMessages,queueDueReminders} from '../src/notifications.js';
function env(){const db=new DatabaseSync(':memory:');for(const m of ['0000_agenda','0001_quotes','0002_notifications','0003_whatsapp_routines','0004_manual_whatsapp'])db.exec(readFileSync('drizzle/'+m+'.sql','utf8'));function prepare(sql,values=[]){return {bind(...v){return prepare(sql,v);},async all(){return {results:db.prepare(sql).all(...values)};},async run(){return {meta:{changes:Number(db.prepare(sql).run(...values).changes)}};}};}let queue=Promise.resolve();return {db,ADMIN_KEY:'test-key',DB:{prepare,batch(statements){const p=queue.then(async()=>{db.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}});queue=p.catch(()=>{});return p;}}};}
async function call(e,path,body,admin=false){const r=await api(new Request('https://test.local/api/'+path,{method:body?'POST':'GET',headers:admin?{Authorization:'Bearer test-key'}:{},...(body?{body:JSON.stringify(body)}:{})}),e);return {status:r.status,data:await r.json()};}
const fixture=()=>({id:crypto.randomUUID(),token:crypto.randomUUID(),date:'2099-11-24',time:'09:00',services:['henna','spa'],name:'Cliente de teste',phone:'27999999999',whatsappConsent:true});
async function create(e){const p=fixture();assert.equal((await call(e,'request',p)).status,201);return p;}
const approve=(e,p)=>call(e,'admin/decision',{id:p.id,action:'approve',services:['spa']},true);
const cancel=(e,p,extra={})=>call(e,'cancel',{id:p.id,token:p.token,...extra});
test('agenda manual vincula serviços a cada cliente e desfaz o lote se houver conflito',async()=>{
 const e=env();
 try{
  const first={date:'2099-11-24',start:540,name:'Primeira cliente',phone:'27999999999',services:['henna','spa']};
  const second={...first,start:630,name:'Segunda cliente',phone:'27988888888',services:['buco']};
  const save=(first,second)=>call(e,'admin/appointments',{appointments:[first,second]},true);
  assert.equal((await save(first,{...second,start:600})).status,409);
  assert.equal(e.db.prepare('SELECT COUNT(*) AS total FROM appointments').get().total,0);
  const saved=await save(first,second);
  assert.equal(saved.status,201);
  const {data}=await call(e,'admin/appointments?from=2099-11-24&to=2099-11-24',null,true);
  assert.deepEqual(data.map(a=>[a.id,a.client_name,a.client_phone,a.start,a.end,a.price,a.services.map(s=>s.id)]),[
   [saved.data.ids[0],first.name,first.phone,540,630,7500,first.services],
   [saved.data.ids[1],second.name,second.phone,630,645,1500,second.services]
  ]);
  assert.equal((await save({...first,start:660},second)).status,409);
  assert.equal(e.db.prepare('SELECT COUNT(*) AS total FROM appointments').get().total,2);
 }finally{e.db.close();}
});
test('mensagens manuais exigem autorização e lembretes só aparecem nas próximas 24 horas',async()=>{
 const e=env();
 try{
  const first={date:'2099-11-24',start:540,name:'Primeira cliente',phone:'27999999999',services:['spa'],whatsappConsent:true};
  const save=appointments=>call(e,'admin/appointments',{appointments},true);
  const created=await save([first,{...first,start:570,phone:'27988888888',whatsappConsent:false}]);
  assert.equal(created.status,201);
  assert.equal(created.data.notificationsPrepared,1);
  const id='manual:'+created.data.ids[0];
  const {data}=await call(e,'admin/notifications',null,true);
  assert.deepEqual(data.entries.map(n=>[n.id,n.phone,n.status]),[[id,'5527999999999','pending']]);
  assert.match(data.entries[0].content,/Spa labial/);
  const mark=()=>call(e,'admin/notifications/sent',{id},true);
  assert.equal((await mark()).status,200);
  const firstMark=e.db.prepare('SELECT manual_sent_at FROM notifications WHERE id=?').get(id).manual_sent_at;
  assert.equal((await mark()).status,200);
  assert.equal(e.db.prepare('SELECT manual_sent_at FROM notifications WHERE id=?').get(id).manual_sent_at,firstMark);
  assert.equal((await call(e,'admin/notifications/sent',{id})).status,401);
  assert.equal((await call(e,'admin/notifications/refresh',{})).status,401);
  const due=Date.parse('2099-11-23T12:00:00Z');
  await queueDueReminders(e.DB,due-1);
  assert.equal((await listManualMessages(e.DB,due-1)).filter(n=>n.event==='reminder').length,0);
  await Promise.all([queueDueReminders(e.DB,due),queueDueReminders(e.DB,due)]);
  const pending=await listManualMessages(e.DB,due);
  assert.equal(pending.filter(n=>n.event==='reminder'&&n.actionable).length,1);
  assert.equal(pending.find(n=>n.id===id).status,'manual_sent');
  assert.equal((await call(e,'admin/appointment',{id:created.data.ids[0],action:'cancel'},true)).status,200);
  assert.equal((await listManualMessages(e.DB,due)).find(n=>n.event==='reminder').actionable,false);
 }finally{e.db.close();}
});
test('alteração do telefone retira a autorização e bloqueia a confirmação pendente',async()=>{
 const e=env();
 try{
  const first={date:'2099-11-24',start:540,name:'Cliente',phone:'27999999999',services:['spa'],whatsappConsent:true};
  const saved=await call(e,'admin/appointments',{appointments:[first]},true);
  const [id]=saved.data.ids;
  assert.equal((await call(e,'admin/appointment',{...first,id,phone:'27988888888',whatsappConsent:false},true)).status,200);
  const [message]=await listManualMessages(e.DB);
  assert.equal(message.status,'superseded');
  assert.equal((await call(e,'admin/notifications/sent',{id:message.id},true)).status,409);
 }finally{e.db.close();}
});
test('aviso e autorização para atualizações são exigidos e registrados',async()=>{const e=env(),p=fixture();p.whatsappConsent=false;assert.equal((await call(e,'request',p)).status,400);p.whatsappConsent=true;assert.equal((await call(e,'request',p)).status,201);const q=e.db.prepare('SELECT whatsapp_consent,consent_at FROM quotes').get();assert.equal(q.whatsapp_consent,1);assert.ok(q.consent_at);e.db.close();});
test('aprovação confirma agenda e prepara mensagem para envio manual',async()=>{const e=env(),p=await create(e),r=await approve(e,p);assert.equal(r.status,200);assert.equal(r.data.notificationPrepared,true);const n=e.db.prepare('SELECT * FROM notifications').get();assert.equal(n.phone,'5527999999999');assert.ok(JSON.parse(n.payload_json).content.includes('parcialmente'));assert.equal(e.db.prepare('SELECT status FROM appointments').get().status,'confirmed');e.db.close();});
test('cliente cancela apenas com sua chave, libera agenda e gera uma única confirmação',async()=>{const e=env(),p=await create(e);await approve(e,p);assert.equal((await cancel(e,{...p,token:crypto.randomUUID()})).status,404);assert.equal((await cancel(e,p,{reason:'Mudança de planos'})).status,200);assert.equal((await cancel(e,p)).data.alreadyCancelled,true);const a=e.db.prepare('SELECT * FROM appointments').get();assert.equal(a.status,'cancelled');assert.equal(a.cancelled_by,'client');assert.equal(a.cancellation_reason,'Mudança de planos');assert.equal(e.db.prepare("SELECT COUNT(*) AS n FROM notifications WHERE event='cancellation'").get().n,1);assert.ok((await call(e,'availability?services=spa&month=2099-11')).data.days[p.date].includes('09:00'));e.db.close();});
test('cliente pode cancelar pedido pendente e ele não pode mais ser aprovado',async()=>{const e=env(),p=await create(e);assert.equal((await cancel(e,p)).status,200);assert.equal((await approve(e,p)).status,409);assert.equal(e.db.prepare('SELECT COUNT(*) AS n FROM appointments').get().n,0);assert.equal(e.db.prepare('SELECT cancelled_by FROM quotes').get().cancelled_by,'client');e.db.close();});
test('cancelamento pela profissional preserva motivo opcional e não duplica mensagem',async()=>{for(const reason of ['Indisponibilidade da profissional','']){const e=env(),p=await create(e),r=await approve(e,p);assert.equal((await call(e,'admin/appointment',{id:r.data.id,action:'cancel',reason},true)).status,200);assert.equal((await call(e,'admin/appointment',{id:r.data.id,action:'cancel',reason},true)).status,200);const q=e.db.prepare('SELECT cancelled_by,cancellation_reason FROM quotes').get();assert.equal(q.cancelled_by,'professional');assert.equal(q.cancellation_reason,reason);const n=e.db.prepare("SELECT payload_json FROM notifications WHERE event='cancellation'").get();assert.ok(JSON.parse(n.payload_json).content.includes('pelo Studio'));if(reason)assert.ok(n.payload_json.includes(reason));e.db.close();}});
test('aprovação concorrente com cancelamento não deixa atendimento ativo',async()=>{const e=env(),p=await create(e);const results=await Promise.all([approve(e,p),cancel(e,p)]);assert.equal(results[1].status,200);assert.ok([200,409].includes(results[0].status));assert.equal(e.db.prepare("SELECT COUNT(*) AS n FROM appointments WHERE status='confirmed'").get().n,0);assert.ok(e.db.prepare('SELECT cancelled_at FROM quotes').get().cancelled_at);e.db.close();});
test('registros antigos sem autorização não habilitam envio manual',async()=>{
 const e=env();
 try{
  const p=await create(e);
  e.db.prepare('UPDATE quotes SET whatsapp_consent=0 WHERE id=?').run(p.id);
  assert.equal((await approve(e,p)).data.notificationPrepared,false);
  await cancel(e,p);
  assert.ok((await listManualMessages(e.DB)).every(n=>n.status==='skipped_no_consent'&&!n.actionable));
 }finally{e.db.close();}
});
