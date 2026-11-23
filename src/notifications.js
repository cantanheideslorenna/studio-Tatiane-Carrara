import {time,money} from './domain.js';
export function whatsappConfigured(env){return Boolean(env.WA_ACCESS_TOKEN&&/^\d+$/.test(env.WA_PHONE_NUMBER_ID||'')&&/^v\d+\.\d+$/.test(env.WA_API_VERSION||'')&&env.WA_TEMPLATE_APPROVAL&&env.WA_TEMPLATE_CANCELLATION);}
export function notificationStatement(db,env,{id,event,q,a,by='',reason='',guardSql='1',guardValues=[]}){
 const phone=(a?.client_phone||q.client_phone).replace(/\D/g,''),normalized=phone.startsWith('55')&&phone.length>=12?phone:'55'+phone;
 const date=a?.date||q.date,start=a?.start??q.start,end=a?.end??q.start+q.duration,services=a?.services||JSON.parse(q.services_json),name=a?.client_name||q.client_name;
 const formatted=date.split('-').reverse().join('/'),serviceNames=services.map(s=>s.name).join(', '),actor=by==='client'?'pela cliente':'pelo Studio';
 const parameters=event==='approval'?[name,formatted,time(start),time(end),serviceNames,money(a.price),services.length<JSON.parse(q.services_json).length?'parcialmente':'integralmente']:[name,formatted,time(start),serviceNames,actor,reason||'Não informado'];
 const content=event==='approval'?`Olá, ${name}! Seu orçamento foi aprovado ${parameters[6]} pelo Studio Tatiane Carrara. Atendimento em ${formatted}, das ${time(start)} às ${time(end)}. Serviços: ${serviceNames}. Total: ${money(a.price)}.`:`Olá, ${name}! Confirmamos o cancelamento ${actor} do seu atendimento/pedido de ${formatted}, às ${time(start)}. Serviços: ${serviceNames}.${reason?' Motivo: '+reason:''}`;
 const now=new Date().toISOString(),status=!q?.whatsapp_consent?'skipped_no_consent':whatsappConfigured(env)?'pending':'awaiting_config';
 return db.prepare(`INSERT OR IGNORE INTO notifications(id,quote_id,appointment_id,event,phone,payload_json,status,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,? WHERE ${guardSql}`).bind(id,q?.id||null,a?.id||null,event,normalized,JSON.stringify({parameters,content}),status,now,now,...guardValues);
}
export async function dispatchNotification(env,id){
 const db=env.DB,row=(await db.prepare('SELECT * FROM notifications WHERE id=?').bind(id).all()).results[0];if(!row)return null;
 if(['accepted','unknown','sending','skipped_no_consent','superseded'].includes(row.status))return {id,status:row.status};
 if(row.event==='approval'&&row.appointment_id){const a=(await db.prepare('SELECT status FROM appointments WHERE id=?').bind(row.appointment_id).all()).results[0];if(!a||a.status==='cancelled'){await db.prepare("UPDATE notifications SET status='superseded',updated_at=? WHERE id=?").bind(new Date().toISOString(),id).run();return {id,status:'superseded'};}}
 if(!whatsappConfigured(env)){await db.prepare("UPDATE notifications SET status='awaiting_config',updated_at=? WHERE id=? AND status IN ('pending','failed','awaiting_config')").bind(new Date().toISOString(),id).run();return {id,status:'awaiting_config'};}
 const claimed=await db.prepare("UPDATE notifications SET status='sending',attempts=attempts+1,updated_at=? WHERE id=? AND status IN ('pending','awaiting_config','failed')").bind(new Date().toISOString(),id).run();if(!claimed.meta.changes)return {id,status:'sending'};
 const payload=JSON.parse(row.payload_json),template=row.event==='approval'?env.WA_TEMPLATE_APPROVAL:env.WA_TEMPLATE_CANCELLATION;
 let status='unknown',providerId=null,error='Resposta não confirmada. Verifique o provedor antes de tentar reenviar.';
 try{
  const response=await (env.WA_FETCH||fetch)(`https://graph.facebook.com/${env.WA_API_VERSION}/${env.WA_PHONE_NUMBER_ID}/messages`,{method:'POST',headers:{Authorization:'Bearer '+env.WA_ACCESS_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',to:row.phone,type:'template',template:{name:template,language:{code:env.WA_LANGUAGE||'pt_BR'},components:[{type:'body',parameters:payload.parameters.map(value=>({type:'text',text:String(value).replace(/[\r\n\t]+/g,' ').slice(0,500)}))}]}}),signal:AbortSignal.timeout(12000)});
  let data;try{data=await response.json();}catch{data={};}
  if(response.ok&&data.messages?.[0]?.id){status='accepted';providerId=data.messages[0].id;error='';}
  else if(!response.ok){status=response.status>=500?'unknown':'failed';error='Meta retornou HTTP '+response.status+(data.error?.code?' (código '+data.error.code+')':'')+'.';}
 }catch{/* A timeout may happen after provider acceptance. Never retry automatically. */}
 await db.prepare('UPDATE notifications SET status=?,provider_id=?,error=?,updated_at=? WHERE id=?').bind(status,providerId,error,new Date().toISOString(),id).run();return {id,status};
}
