import {time,money,today} from './domain.js';
const reminderDelay=24*60*60*1000;
const startsAt=(date,start)=>Date.parse(date+'T'+time(start)+':00-03:00');
const manualStatuses=['pending','awaiting_config','failed'];

export function notificationStatement(db,{id,event,q,a,by='',reason='',guardSql='1',guardValues=[]}){
 const phone=(a?.client_phone||q.client_phone).replace(/\D/g,''),normalized=phone.startsWith('55')&&phone.length>=12?phone:'55'+phone;
 const date=a?.date||q.date,start=a?.start??q.start,end=a?.end??q.start+q.duration,services=a?.services||JSON.parse(q.services_json),name=a?.client_name||q.client_name;
 const formatted=date.split('-').reverse().join('/'),serviceNames=services.map(s=>s.name).join(', '),actor=by==='client'?'pela cliente':'pelo Studio';
 let content,appointmentDetails;
 if(event==='approval'){
  const decision=services.length<JSON.parse(q.services_json).length?'parcialmente':'integralmente';
  content=`Olá, ${name}! Seu orçamento foi aprovado ${decision} pelo Studio Tatiane Carrara. Atendimento em ${formatted}, das ${time(start)} às ${time(end)}. Serviços: ${serviceNames}. Total: ${money(a.price)}.`;
 }else if(event==='cancellation'){
  content=`Olá, ${name}! Confirmamos o cancelamento ${actor} do seu atendimento/pedido de ${formatted}, às ${time(start)}. Serviços: ${serviceNames}.${reason?' Motivo: '+reason:''}`;
 }else{
  const message=event==='reminder'?'Lembrete do seu atendimento':'O Studio Tatiane Carrara confirmou seu atendimento';
  content=`Olá, ${name}! ${message} em ${formatted}, das ${time(start)} às ${time(end)}. Serviços: ${serviceNames}.`;
 }
 if(a&&event!=='cancellation')appointmentDetails={date,start,end,phone,name,services:JSON.stringify(services)};
 const now=new Date().toISOString(),status=q.whatsapp_consent?'pending':'skipped_no_consent';
 const refresh=event==='reminder'?`
  ON CONFLICT(id) DO UPDATE SET phone=excluded.phone,payload_json=excluded.payload_json,updated_at=excluded.updated_at
  WHERE notifications.manual_sent_at IS NULL AND notifications.status IN ('pending','awaiting_config','failed')
   AND (notifications.phone<>excluded.phone OR notifications.payload_json<>excluded.payload_json)
 `:'';
 return db.prepare(`INSERT OR IGNORE INTO notifications(id,quote_id,appointment_id,event,phone,payload_json,status,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,? WHERE ${guardSql}${refresh}`).bind(id,q?.id||null,a?.id||null,event,normalized,JSON.stringify({content,appointmentDetails}),status,now,now,...guardValues);
}

const notificationRows=`
 SELECT n.id,n.event,n.phone,n.status,n.manual_sent_at,n.payload_json,n.created_at,
  a.status AS appointment_status,a.date AS appointment_date,a.start AS appointment_start,
  a.end AS appointment_end,a.client_phone,a.client_name,a.services_json,
  COALESCE(a.whatsapp_consent_at,q.consent_at) AS consent_at
 FROM notifications n LEFT JOIN appointments a ON a.id=n.appointment_id
 LEFT JOIN quotes q ON q.id=a.quote_id AND q.whatsapp_consent=1 AND q.client_phone=a.client_phone
`;
function manualMessage(row,now){
 const {id,event,phone,status,manual_sent_at,payload_json,created_at}=row;
 const payload=JSON.parse(payload_json),details=payload.appointmentDetails;
 let actionable=!manual_sent_at&&manualStatuses.includes(status);
 if(actionable&&event!=='cancellation'){
  actionable=row.appointment_status==='confirmed'&&Boolean(row.consent_at)&&startsAt(row.appointment_date,row.appointment_start)>now;
  if(actionable&&details)actionable=details.date===row.appointment_date&&details.start===row.appointment_start&&details.end===row.appointment_end&&details.phone===row.client_phone&&details.name===row.client_name&&details.services===row.services_json;
 }
 return {id,event,phone,status:manual_sent_at?'manual_sent':actionable?'pending':manualStatuses.includes(status)?'superseded':status,actionable,content:payload.content,created_at,manual_sent_at};
}
export async function listManualMessages(db,now=Date.now()){
 const {results}=await db.prepare(notificationRows+` ORDER BY CASE WHEN n.event='reminder' AND n.manual_sent_at IS NULL AND a.status='confirmed' AND a.date BETWEEN ? AND ? THEN 0 ELSE 1 END,n.created_at DESC LIMIT 100`)
  .bind(today(new Date(now)),today(new Date(now+reminderDelay))).all();
 return results.map(row=>manualMessage(row,now));
}
export async function markManualMessage(db,id,now=Date.now()){
 const {results:[row]}=await db.prepare(notificationRows+' WHERE n.id=?').bind(id).all();
 if(!row)return false;
 if(row.manual_sent_at)return true;
 if(!manualMessage(row,now).actionable)return false;
 const recordedAt=new Date(now).toISOString();
 await db.prepare('UPDATE notifications SET manual_sent_at=?,updated_at=? WHERE id=? AND manual_sent_at IS NULL').bind(recordedAt,recordedAt,id).run();
 return true;
}
export async function queueDueReminders(db,now=Date.now()){
 const end=now+reminderDelay;
 const {results}=await db.prepare(`
  SELECT a.* FROM appointments a
  LEFT JOIN quotes q ON q.id=a.quote_id AND q.whatsapp_consent=1 AND q.client_phone=a.client_phone
  WHERE a.kind='appointment' AND a.status='confirmed' AND a.date BETWEEN ? AND ?
   AND COALESCE(a.whatsapp_consent_at,q.consent_at) IS NOT NULL
 `).bind(today(new Date(now)),today(new Date(end))).all();
 const statements=results.filter(a=>{
  const start=startsAt(a.date,a.start);
  return start>now&&start<=end;
 }).map(a=>notificationStatement(db,{
  id:`reminder:${a.id}:${a.date}:${a.start}`,event:'reminder',q:{id:a.quote_id,whatsapp_consent:1},
  a:{...a,services:JSON.parse(a.services_json)}
 }));
 if(statements.length)await db.batch(statements);
}
