import {money,time,totals,slots} from '/domain.js';
import {escapeHtml as esc,serviceEditor} from '/catalog-editor.js';
const $=id=>document.getElementById(id);
const isAdmin=location.pathname==='/admin',labels={pending:'Aguardando análise',approved:'Aprovado integralmente',partial:'Aprovado parcialmente',rejected:'Não aprovado'};
let config,selectedIds=[],month,date,selectedTime,days={},sequence=0,key=sessionStorage.getItem('studio-admin')||'',appointments=[],quotes=[],clients=[],cancelId,decisionQuote,submission=null,statusQuote=null,cancelByClient=false;
const selected=()=>config.services.filter(s=>selectedIds.includes(s.id));
const formatDate=(d,long=false)=>new Date(d+'T12:00:00-03:00').toLocaleDateString('pt-BR',long?{weekday:'long',day:'numeric',month:'long'}:{day:'2-digit',month:'2-digit',year:'numeric'});
const endDate=(d,n)=>{const x=new Date(d+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10);};
function itemList(items){return '<ul class="item-list">'+items.map(s=>`<li><span>${esc(s.name)}</span><span>${s.duration} min · ${money(s.price)}</span></li>`).join('')+'</ul>';}
function checks(items,ids,prefix){return items.map(s=>`<label class="service-check"><input type="checkbox" value="${esc(s.id)}" data-${prefix} ${ids.includes(s.id)?'checked':''}><span><strong>${esc(s.name)}</strong><small>${s.duration} min · ${money(s.price)}</small></span></label>`).join('');}
async function api(path,body,admin=false){const response=await fetch('/api/'+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(admin?{Authorization:'Bearer '+key}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await response.json();if(!response.ok){if(response.status===401&&admin)logout();throw new Error(data.error||'Não foi possível concluir.');}return data;}
function toast(text){$('toast').textContent=text;$('toast').hidden=false;setTimeout(()=>$('toast').hidden=true,4000);}
function renderServices(){
 $('service-list').innerHTML=config.services.map(s=>`<div class="col-md-6 col-lg-4"><button class="service-card ${selectedIds.includes(s.id)?'selected':''}" data-service="${esc(s.id)}" aria-pressed="${selectedIds.includes(s.id)}"><span class="service-category">${esc(s.category)} · ${selectedIds.includes(s.id)?'Selecionado':'Selecionar'}</span><h3>${esc(s.name)}</h3><p>${esc(s.description)}</p><span class="service-bottom"><span>${s.duration} min</span><strong>${money(s.price)}</strong></span></button></div>`).join('');
 const items=selected(),total=totals(items);$('selection-total').textContent=items.length?`${items.length} serviço(s) · ${total.duration} minutos no total · ${money(total.price)}`:'Selecione os serviços que deseja realizar no mesmo atendimento.';
 $('selected-services').innerHTML=items.length?itemList(items)+'<a href="#servicos">Alterar serviços selecionados</a>':'<p class="muted">Escolha pelo menos um serviço no catálogo acima.</p>';
 document.querySelectorAll('[data-service]').forEach(b=>b.onclick=async()=>{const id=b.dataset.service;selectedIds=selectedIds.includes(id)?selectedIds.filter(x=>x!==id):[...selectedIds,id];date=null;selectedTime=null;submission=null;renderServices();renderTimes();await loadCalendar();});
}
async function loadCalendar(){const seq=++sequence;days={};renderCalendar();$('calendar-error').textContent='';if(!selectedIds.length){renderTimes();return;}$('calendar').setAttribute('aria-busy','true');try{const r=await api(`availability?services=${encodeURIComponent(selectedIds.join(','))}&month=${month}`);if(seq!==sequence)return;days=r.days;renderCalendar();if(date&&!days[date]?.includes(selectedTime))selectedTime=null;renderTimes();}catch(e){if(seq===sequence)$('calendar-error').textContent=e.message;}finally{if(seq===sequence)$('calendar').setAttribute('aria-busy','false');}}
function renderCalendar(){const [y,m]=month.split('-').map(Number),first=new Date(y,m-1,1).getDay(),count=new Date(y,m,0).getDate();$('month-title').textContent=new Date(y,m-1,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'});$('prev-month').disabled=month<=config.today.slice(0,7);$('next-month').disabled=month>=(Number(config.today.slice(0,4))+2)+'-12';let html='<span aria-hidden="true"></span>'.repeat(first);for(let d=1;d<=count;d++){const value=month+'-'+String(d).padStart(2,'0'),n=days[value]?.length;html+=`<button type="button" data-date="${value}" class="${value===date?'selected ':''}${value===config.today?'today':''}" ${n?'':'disabled'} aria-pressed="${value===date}" aria-label="${esc(formatDate(value,true))}, ${n?n+' horários disponíveis':'sem horários disponíveis'}">${d}</button>`;}$('calendar').innerHTML=html;document.querySelectorAll('[data-date]').forEach(b=>b.onclick=()=>{date=b.dataset.date;selectedTime=null;submission=null;renderCalendar();renderTimes();});}
function renderTimes(){const items=selected(),total=totals(items);$('selected-day').textContent=date?formatDate(date,true):'Escolha um dia';$('service-detail').textContent=items.length?`${items.length} serviço(s) · ${total.duration} min · ${money(total.price)}`:'Selecione seus serviços antes de escolher o horário.';$('time-slots').innerHTML=date?(days[date]||[]).map(t=>`<button class="slot ${t===selectedTime?'selected':''}" data-time="${t}" aria-pressed="${t===selectedTime}">${t}</button>`).join(''):'<p class="muted">Os horários considerarão o tempo total dos serviços selecionados.</p>';document.querySelectorAll('[data-time]').forEach(b=>b.onclick=()=>{selectedTime=b.dataset.time;submission=null;renderTimes();});$('request-panel').hidden=!selectedTime;$('request-error').textContent='';if(selectedTime){const [h,m]=selectedTime.split(':').map(Number);$('summary').textContent=`${formatDate(date)} · ${selectedTime} a ${time(h*60+m+total.duration)}`;$('summary-price').textContent=money(total.price);$('request-items').innerHTML=itemList(items);}}
for(const [id,offset] of [['prev-month',-1],['next-month',1]])$(id).onclick=()=>{const [y,m]=month.split('-').map(Number),d=new Date(y,m-1+offset,1);month=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');date=null;selectedTime=null;submission=null;renderTimes();loadCalendar();};
for(const id of ['client-name','client-phone','whatsapp-consent'])$(id).oninput=()=>submission=null;
$('request-panel').onsubmit=async e=>{e.preventDefault();$('request-button').disabled=true;$('request-error').textContent='';submission??={id:crypto.randomUUID(),token:crypto.randomUUID()};try{const r=await api('request',{...submission,services:selectedIds,date,time:selectedTime,name:$('client-name').value,phone:$('client-phone').value,whatsappConsent:$('whatsapp-consent').checked});$('status-id').value=r.id;$('status-token').value=r.token;const link=location.origin+'/#pedido='+r.id+'.'+r.token;$('request-success').hidden=false;$('request-success').innerHTML=`<h3>Orçamento recebido</h3><p>Seu pedido está aguardando análise. Guarde os dados abaixo para consultar a aprovação.</p><p><strong>Protocolo</strong><br><code>${r.id}</code></p><p><strong>Chave de consulta</strong><br><code>${r.token}</code></p><a href="${esc(link)}">Acompanhar este orçamento</a><p class="muted mt-2">O horário ainda não está reservado. Guarde o link em local privado.</p>`;selectedTime=null;renderTimes();await checkStatus();$('request-success').scrollIntoView({behavior:'smooth'});toast('Orçamento enviado para análise.');}catch(e){$('request-error').textContent=e.message;}finally{$('request-button').disabled=false;}};
function notificationNotice(prepared){return prepared?' Mensagem pronta na aba Notificações.':'';}
async function checkStatus(){
 $('status-error').textContent='';try{
 const q=await api('quote-status',{id:$('status-id').value.trim(),token:$('status-token').value.trim()}),a=q.appointment;statusQuote=q;
 const cancelled=q.cancelled_at||a?.status==='cancelled',cancelDate=q.cancelled_at||a?.cancelled_at,cancelBy=q.cancelled_by||a?.cancelled_by,reason=q.cancellation_reason||a?.cancellation_reason;
 if(cancelled||q.status!=='pending')$('request-success').hidden=true;
 const canCancel=!cancelled&&q.status!=='rejected'&&new Date((a?.date||q.date)+'T'+time(a?.start??q.start)+':00-03:00').getTime()>Date.now();
 $('quote-status').innerHTML=`<article class="quote-card"><span class="status-label">${cancelled?'Cancelado':labels[q.status]}</span><h3 class="mt-3">${esc(q.client_name)}</h3><p>${formatDate(q.date)} · início solicitado: ${time(q.start)}</p><h4>Serviços solicitados</h4>${itemList(q.services)}${a?`<h4 class="mt-3">${a.status==='cancelled'?'Atendimento cancelado':'Atendimento confirmado'}</h4><p>${formatDate(a.date)} · ${time(a.start)} a ${time(a.end)} · ${money(a.price)}</p>${itemList(a.services)}`:''}${q.status==='partial'?'<p class="muted mt-3">Os demais serviços não foram aprovados neste pedido.</p>':''}${q.decision_note?`<p class="decision-note">${esc(q.decision_note)}</p>`:''}${cancelled?`<p class="decision-note">Cancelado ${cancelBy==='client'?'pela cliente':cancelBy==='professional'?'pelo Studio':''}.${reason?' Motivo: '+esc(reason):''}${cancelDate?' Registro: '+new Date(cancelDate).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):''}</p>`:q.status==='pending'?'<p class="muted mt-3">Aguardando a decisão do gestor. Consulte novamente mais tarde.</p>':''}${canCancel?'<button id="client-cancel" class="btn btn-outline-plum mt-3">Cancelar meu pedido ou atendimento</button>':''}</article>`;
 if(canCancel)$('client-cancel').onclick=()=>{cancelByClient=true;$('cancel-reason').value='';$('cancel-error').textContent='';$('cancel-dialog').showModal();};
 }catch(e){$('quote-status').replaceChildren();$('status-error').textContent=e.message;}
}
$('status-form').onsubmit=async e=>{e.preventDefault();await checkStatus();};
function readReceipt(){if(location.hash.startsWith('#pedido=')){const [id,token]=location.hash.slice(8).split('.');$('status-id').value=id||'';$('status-token').value=token||'';checkStatus();$('acompanhar').scrollIntoView({behavior:'smooth'});}}
window.addEventListener('hashchange',readReceipt);

function logout(){sessionStorage.removeItem('studio-admin');key='';$('admin-key').value='';$('admin-content').hidden=true;$('logout').hidden=true;$('login-form').hidden=false;appointments=[];quotes=[];clients=[];for(const id of ['appointments','quotes-list','clients-list'])$(id).replaceChildren();}
$('logout').onclick=logout;
$('login-form').onsubmit=async e=>{e.preventDefault();key=$('admin-key').value.trim();$('login-error').textContent='';try{await api('admin/session',null,true);sessionStorage.setItem('studio-admin',key);$('admin-key').value='';await openAdmin();}catch(e){$('login-error').textContent=e.message;}};
async function openAdmin(){$('login-form').hidden=true;$('admin-content').hidden=false;$('logout').hidden=false;$('admin-date').value=config.today;renderEditor();await loadAppointments();await loadQuotes();}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));for(const t of ['agenda','quotes','settings','clients','notifications'])$('tab-'+t).hidden=t!==b.dataset.tab;if(b.dataset.tab==='quotes')loadQuotes();if(b.dataset.tab==='notifications')loadNotifications();if(b.dataset.tab==='clients')loadClients();});
async function loadAppointments(){const from=$('admin-date').value;if(!from)return;$('agenda-error').textContent='';try{appointments=await api(`admin/appointments?from=${from}&to=${endDate(from,Number($('admin-period').value)-1)}`,null,true);renderAppointments();}catch(e){$('agenda-error').textContent=e.message;}}
function renderAppointments(){const active=appointments.filter(a=>a.status==='confirmed'),attended=active.filter(a=>a.kind==='appointment');$('agenda-stats').innerHTML=`<div class="stat"><strong>${attended.length}</strong>Atendimentos</div><div class="stat"><strong>${active.filter(a=>a.kind==='block').length}</strong>Bloqueios</div><div class="stat"><strong>${money(attended.reduce((s,a)=>s+a.price,0))}</strong>Valor previsto no período</div>`;$('appointments').innerHTML=appointments.length?appointments.map(a=>`<article class="appointment-row ${a.status==='cancelled'?'cancelled':''}"><div><p class="date-label">${formatDate(a.date)} · ${time(a.start)} a ${time(a.end)}</p><h3>${a.kind==='block'?'Horário bloqueado':esc(a.client_name)}</h3><p>${esc(a.client_phone)}</p>${itemList(a.services)}${a.kind==='appointment'?`<p>Total: ${money(a.price)}</p>`:''}</div><div class="appointment-actions">${a.status==='confirmed'?`<span class="status-label">${a.kind==='block'?'Bloqueado':'Confirmado'}</span>${a.whatsapp_consent_at&&a.has_manual_confirmation?`<button class="btn btn-outline-plum" data-open-confirmation="${esc(a.id)}">Confirmação pelo WhatsApp</button>`:''}<button class="btn btn-outline-plum" data-edit="${a.id}">Alterar</button><button class="btn btn-outline-plum" data-cancel="${a.id}">${a.kind==='block'?'Liberar':'Cancelar'}</button>`:'<span class="status-label">Cancelado</span>'}</div></article>`).join(''):'<div class="empty-state">Nenhum atendimento ou bloqueio neste período.<br>Analise os pedidos na aba Orçamentos ou registre um atendimento.</div>';document.querySelectorAll('[data-open-confirmation]').forEach(button=>button.onclick=()=>{
  notificationFocus='manual:'+button.dataset.openConfirmation;
  document.querySelector('[data-tab="notifications"]').click();
 });document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editAppointment(appointments.find(a=>a.id===b.dataset.edit)));document.querySelectorAll('[data-cancel]').forEach(b=>b.onclick=()=>{cancelId=b.dataset.cancel;cancelByClient=false;$('cancel-reason').value='';$('cancel-error').textContent='';$('cancel-dialog').showModal();});}
$('refresh-agenda').onclick=loadAppointments;$('admin-date').onchange=loadAppointments;$('admin-period').onchange=loadAppointments;
$('new-appointment').onclick=()=>{
 $('manual-entries').replaceChildren();
 $('manual-error').textContent='';
 addManualEntry();
 $('manual-dialog').showModal();
};
$('new-block').onclick=()=>editAppointment(null,'block');

function manualServices(entry){
 return [...entry.querySelectorAll('[data-manual-service]:checked')].map(input=>input.value);
}
function manualStart(entry){
 const [hours,minutes]=entry.querySelector('[name="start"]').value.split(':').map(Number);
 return hours*60+minutes;
}
function updateManualEntries(){
 const entries=[...$('manual-entries').children];
 entries.forEach((entry,index)=>{
  entry.querySelector('legend').textContent=`Cliente ${index+1}`;
  entry.querySelector('[data-remove]').hidden=entries.length===1;
 });
 $('add-manual').disabled=entries.length>=10;
}
function addManualEntry(){
 const entries=$('manual-entries'),previous=entries.lastElementChild;
 const entry=document.createElement('fieldset');
 entry.className='service-edit';
 entry.innerHTML=`
  <legend class="form-label"></legend>
  <div class="row g-3 mb-3">
   <label class="col-sm-6 form-label">Nome<input name="name" class="form-control" maxlength="80" required></label>
   <label class="col-sm-6 form-label">Telefone com DDD<input name="phone" type="tel" class="form-control" maxlength="25" required></label>
   <label class="col-sm-6 form-label">Data<input name="date" type="date" class="form-control" required></label>
   <label class="col-sm-6 form-label">Início<input name="start" type="time" step="900" min="09:00" max="17:45" class="form-control" required></label>
  </div>
  <fieldset><legend class="form-label">Serviços</legend>${checks(config.services,[],'manual-service')}</fieldset>
  <p class="muted mt-2" data-total aria-live="polite"></p>
  <label class="d-block mb-3"><input type="checkbox" name="whatsappConsent"> A cliente autorizou receber atualizações deste atendimento pelo WhatsApp.</label>
  <button type="button" class="btn btn-sm btn-outline-plum" data-remove>Remover cliente</button>`;
 const dateInput=entry.querySelector('[name="date"]'),startInput=entry.querySelector('[name="start"]');
 dateInput.min=config.today;
 let suggestedDate=previous?.querySelector('[name="date"]').value||$('admin-date').value||config.today;
 if(suggestedDate<config.today)suggestedDate=config.today;
 const totalFor=row=>totals(config.services.filter(service=>manualServices(row).includes(service.id)));
 if(previous){
  const suggestedStart=manualStart(previous)+totalFor(previous).duration;
  if(suggestedStart>=540&&suggestedStart<=1065)startInput.value=time(suggestedStart);
 }else{
  for(let offset=0;offset<7;offset++){
   const candidate=endDate(suggestedDate,offset);
   const [firstSlot]=slots(candidate,15,[]);
   if(firstSlot){
    suggestedDate=candidate;
    startInput.value=firstSlot;
    break;
   }
  }
 }
 dateInput.value=suggestedDate;
 entry.oninput=()=>{
  const {duration,price}=totalFor(entry),end=manualStart(entry)+duration;
  entry.querySelector('[data-total]').textContent=duration?`${duration} min · ${money(price)}${Number.isFinite(end)?' · Término às '+time(end):''}`:'';
 };
 entry.querySelector('[data-remove]').onclick=()=>{
  entry.remove();
  updateManualEntries();
  $('add-manual').focus();
 };
 entries.append(entry);
 updateManualEntries();
 entry.querySelector('[name="name"]').focus();
}
$('add-manual').onclick=addManualEntry;
$('close-manual').onclick=()=>$('manual-dialog').close();
$('manual-dialog').oncancel=e=>{if($('save-manual').disabled)e.preventDefault();};
$('manual-form').onsubmit=async e=>{
 e.preventDefault();
 const entries=[...$('manual-entries').children],error=$('manual-error');
 const appointments=entries.map(entry=>({
  name:entry.querySelector('[name="name"]').value,
  phone:entry.querySelector('[name="phone"]').value,
  date:entry.querySelector('[name="date"]').value,
  start:manualStart(entry),
  services:manualServices(entry),
  whatsappConsent:entry.querySelector('[name="whatsappConsent"]').checked
 }));
 error.textContent='';
 const missing=appointments.findIndex(a=>!a.services.length);
 if(missing>=0){
  error.textContent=`Selecione pelo menos um serviço para a cliente ${missing+1}.`;
  entries[missing].querySelector('[data-manual-service]').focus();
  return;
 }
 const controls=[...$('manual-form').elements].filter(control=>!control.disabled);
 controls.forEach(control=>control.disabled=true);
 try{
  const {notificationsPrepared}=await api('admin/appointments',{appointments},true);
  $('manual-dialog').close();
  $('admin-date').value=appointments.map(a=>a.date).sort()[0];
  const message=appointments.length===1?'Atendimento registrado.':`${appointments.length} atendimentos registrados.`;
  toast(message+notificationNotice(notificationsPrepared));
  await loadAppointments();
 }catch(e){error.textContent=e.message;}
 finally{controls.forEach(control=>control.disabled=false);}
};
const editConsentLabel=document.createElement('label');
editConsentLabel.className='d-block mb-3';
editConsentLabel.innerHTML='<input type="checkbox" id="edit-consent"> A cliente autorizou receber atualizações deste atendimento pelo WhatsApp.';
$('appointment-fields').append(editConsentLabel);
function editAppointment(a=null,kind='appointment'){
 kind=a?.kind||kind;
 $('appointment-form').reset();
 $('appointment-error').textContent='';
 $('edit-id').value=a?.id||'';
 $('edit-kind').value=kind;
 $('dialog-title').textContent=kind==='block'?'Bloquear horário':'Alterar atendimento';
 $('dialog-help').textContent=kind==='block'?'Use para pausas e compromissos.':'Selecione os serviços que serão executados neste atendimento.';
 $('appointment-fields').hidden=kind==='block';
 $('block-fields').hidden=kind!=='block';
 $('edit-name').required=kind==='appointment';
 $('edit-phone').required=kind==='appointment';
 $('edit-services').innerHTML=checks(config.services,a?.services.map(s=>s.id)||[],'edit-service');
 $('edit-services').onchange=updateEditTotal;
 updateEditTotal();
 $('edit-name').value=a?.client_name||'';
 $('edit-phone').value=a?.client_phone||'';
 editConsentLabel.hidden=kind==='block'||Boolean(a?.quote_id);
 $('edit-consent').checked=Boolean(a?.whatsapp_consent_at);
 $('edit-phone').oninput=()=>{$('edit-consent').checked=false;};
 $('edit-date').min=config.today;
 $('edit-date').value=a?.date||$('admin-date').value||config.today;
 $('edit-time').value=a?time(a.start):'09:00';
 $('edit-duration').value=a?a.end-a.start:60;
 $('appointment-dialog').showModal();
}
function checked(prefix){return [...document.querySelectorAll(`[data-${prefix}]:checked`)].map(x=>x.value);}
function updateEditTotal(){const ids=checked('edit-service'),total=totals(config.services.filter(s=>ids.includes(s.id)));$('edit-total').textContent=`${total.duration} min · ${money(total.price)}`;}
$('close-dialog').onclick=()=>$('appointment-dialog').close();
$('appointment-form').onsubmit=async e=>{e.preventDefault();const [h,m]=$('edit-time').value.split(':').map(Number);$('save-appointment').disabled=true;$('appointment-error').textContent='';try{await api('admin/appointment',{id:$('edit-id').value,kind:$('edit-kind').value,services:checked('edit-service'),name:$('edit-name').value,phone:$('edit-phone').value,date:$('edit-date').value,start:h*60+m,duration:Number($('edit-duration').value),whatsappConsent:$('edit-consent').checked},true);$('appointment-dialog').close();toast('Agenda atualizada.');await loadAppointments();}catch(e){$('appointment-error').textContent=e.message;}finally{$('save-appointment').disabled=false;}};
$('cancel-back').onclick=()=>$('cancel-dialog').close();
$('cancel-confirm').onclick=async()=>{$('cancel-confirm').disabled=true;try{const r=cancelByClient?await api('cancel',{id:$('status-id').value.trim(),token:$('status-token').value.trim(),reason:$('cancel-reason').value}):await api('admin/appointment',{action:'cancel',id:cancelId,reason:$('cancel-reason').value},true);$('cancel-dialog').close();toast('Cancelamento registrado.'+notificationNotice(!cancelByClient&&r.notificationPrepared));if(cancelByClient){await checkStatus();await loadCalendar();}else{await loadAppointments();await loadQuotes();}}catch(e){$('cancel-error').textContent=e.message;}finally{$('cancel-confirm').disabled=false;}};


async function loadQuotes(){$('quotes-error').textContent='';try{quotes=await api('admin/quotes',null,true);renderQuotes();}catch(e){$('quotes-error').textContent=e.message;}}
function renderQuotes(){const filter=$('quote-filter').value,list=quotes.filter(q=>filter==='all'||(filter==='cancelled'?q.cancelled_at:!q.cancelled_at&&q.status===filter));$('quotes-list').innerHTML=list.length?list.map(q=>{const competing=quotes.filter(other=>other.id!==q.id&&other.status==='pending'&&!other.cancelled_at&&other.date===q.date&&other.start<q.start+q.duration&&other.start+other.duration>q.start);return `<article class="quote-card"><div class="d-flex flex-wrap justify-content-between gap-2"><h3>${esc(q.client_name)}</h3><span class="status-label">${q.cancelled_at?'Cancelado':labels[q.status]}</span></div><p>${esc(q.client_phone)} · ${formatDate(q.date)} · ${time(q.start)} a ${time(q.start+q.duration)}</p>${itemList(q.services)}<p class="mt-3"><strong>${q.duration} min · ${money(q.price)}</strong></p>${q.status==='pending'&&!q.cancelled_at&&competing.length?`<p class="competition-note">${competing.length} outro(s) pedido(s) pendente(s) com intervalo sobreposto: ${competing.map(c=>esc(c.client_name)).join(', ')}.</p>`:''}${q.decision_note?`<p class="decision-note">${esc(q.decision_note)}</p>`:''}${q.status==='pending'&&!q.cancelled_at?`<button data-analyze="${q.id}" class="btn btn-plum">Analisar e escolher serviços</button>`:''}</article>`;}).join(''):'<div class="empty-state">Nenhum orçamento nesta situação.</div>';document.querySelectorAll('[data-analyze]').forEach(b=>b.onclick=()=>openDecision(quotes.find(q=>q.id===b.dataset.analyze)));}
$('refresh-quotes').onclick=loadQuotes;$('quote-filter').onchange=renderQuotes;
function openDecision(q){decisionQuote=q;$('decision-form').reset();$('decision-error').textContent='';$('decision-client').textContent=q.client_name+' · '+q.client_phone;$('decision-slot').textContent=formatDate(q.date)+' · início: '+time(q.start);$('decision-services').innerHTML=checks(q.services,q.services.map(s=>s.id),'approve-service');$('decision-services').onchange=updateDecisionTotal;updateDecisionTotal();$('decision-dialog').showModal();}
function updateDecisionTotal(){const ids=checked('approve-service'),t=totals(decisionQuote.services.filter(s=>ids.includes(s.id)));$('decision-total').textContent=`${ids.length} serviço(s) aprovado(s) · ${t.duration} min · ${money(t.price)} · término ${time(decisionQuote.start+t.duration)}`;$('approve-quote').disabled=!ids.length;}
async function decide(action){$('decision-error').textContent='';$('approve-quote').disabled=true;$('reject-quote').disabled=true;try{const result=await api('admin/decision',{id:decisionQuote.id,action,services:checked('approve-service'),note:$('decision-note').value},true);$('decision-dialog').close();toast((action==='approve'?'Orçamento aprovado e agenda atualizada.':'Orçamento não aprovado.')+notificationNotice(result.notificationPrepared));await loadQuotes();await loadAppointments();}catch(e){$('decision-error').textContent=e.message;}finally{$('reject-quote').disabled=false;updateDecisionTotal();}}
$('decision-form').onsubmit=e=>{e.preventDefault();decide('approve');};$('reject-quote').onclick=()=>decide('reject');$('close-decision').onclick=()=>$('decision-dialog').close();
function bindRemove(){document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{if(document.querySelectorAll('[data-editor]').length===1){toast('Mantenha pelo menos um serviço.');return;}b.closest('[data-editor]').remove();});}
function renderEditor(){$('service-editor').innerHTML=config.services.map(serviceEditor).join('');bindRemove();}
$('add-service').onclick=()=>{$('service-editor').insertAdjacentHTML('beforeend',serviceEditor({id:crypto.randomUUID(),name:'',category:'Cuidados',duration:60,price:0,description:''}));bindRemove();};
$('settings-form').onsubmit=async e=>{e.preventDefault();$('settings-result').textContent='';const services=[...document.querySelectorAll('[data-editor]')].map(row=>{const s={id:row.dataset.editor};row.querySelectorAll('[data-field]').forEach(input=>s[input.dataset.field]=input.dataset.field==='price'?Math.round(Number(input.value)*100):input.dataset.field==='duration'?Number(input.value):input.value);return s;});const b=e.submitter;b.disabled=true;try{await api('admin/settings',{services},true);config=await api('catalog');$('settings-result').textContent='Catálogo atualizado. Orçamentos já enviados mantêm os valores solicitados.';toast('Configurações salvas.');}catch(e){$('settings-result').textContent=e.message;}finally{b.disabled=false;}};
async function loadClients(){try{const records=await api('admin/appointments?from=2020-01-01&to=2100-12-31',null,true),map=new Map();for(const a of records.filter(x=>x.kind==='appointment'&&x.status==='confirmed')){const id=a.client_name.toLocaleLowerCase()+'|'+a.client_phone,c=map.get(id)||{name:a.client_name,phone:a.client_phone,count:0,last:a.date};c.count++;if(a.date>c.last)c.last=a.date;map.set(id,c);}clients=[...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));renderClients();}catch(e){$('clients-list').textContent=e.message;}}
function renderClients(){const q=$('client-search').value.toLocaleLowerCase(),list=clients.filter(c=>(c.name+' '+c.phone).toLocaleLowerCase().includes(q));$('clients-list').innerHTML=list.length?list.map(c=>`<article class="appointment-row"><div><h3>${esc(c.name)}</h3><p>${esc(c.phone||'Telefone não informado')}</p></div><p>${c.count} atendimento(s)<br>Último registro: ${formatDate(c.last)}</p></article>`).join(''):'<div class="empty-state">Nenhuma cliente encontrada.</div>';}
$('client-search').oninput=renderClients;
async function init(){$('client-view').hidden=isAdmin;$('admin-view').hidden=!isAdmin;try{config=await api('catalog');month=config.today.slice(0,7);if(isAdmin){if(key){try{await api('admin/session',null,true);await openAdmin();}catch(e){logout();$('login-error').textContent=e.message;}}}else{renderServices();renderTimes();renderCalendar();readReceipt();}}catch(e){$(isAdmin?'login-error':'calendar-error').textContent=e.message;}}
document.addEventListener('visibilitychange',async()=>{if(!document.hidden&&config&&!isAdmin){try{config=await api('catalog');selectedIds=selectedIds.filter(id=>config.services.some(s=>s.id===id));renderServices();await loadCalendar();}catch{}}});
init();

let notificationFocus=null;
const notificationLabels={pending:'Pendente',manual_sent:'Envio registrado pela profissional',sending:'Envio anterior em processamento',accepted:'Aceita pela Meta no fluxo anterior',unknown:'Envio anterior com resultado incerto',skipped_no_consent:'Sem autorização registrada',superseded:'Mensagem indisponível'};
const notificationEvents={approval:'Aprovação de orçamento',cancellation:'Cancelamento',manual_confirmation:'Confirmação de agendamento manual',reminder:'Lembrete de atendimento'};
function notificationCard(message){
 const {id,event,phone,status,actionable,content}=message;
 const actionLabel={approval:'Enviar aprovação',cancellation:'Enviar cancelamento',manual_confirmation:'Enviar confirmação',reminder:'Enviar lembrete'}[event];
 const link='https://wa.me/'+encodeURIComponent(phone)+'?text='+encodeURIComponent(content);
 return `<article class="quote-card">
  <span class="status-label">${notificationLabels[status]}</span>
  <h3 class="mt-3">${notificationEvents[event]}</h3>
  <p>Destino: ${esc(phone)}</p><p class="decision-note">${esc(content)}</p>
  ${actionable?`<div class="d-flex flex-wrap gap-2">
   <a class="btn btn-whatsapp" href="${esc(link)}" target="_blank" rel="noopener noreferrer">${actionLabel}</a>
   <button type="button" class="btn btn-outline-plum" data-mark-sent="${esc(id)}">Marcar como enviado</button>
  </div>`:''}
 </article>`;
}
async function loadNotifications(){
 $('notification-error').textContent='';
 try{
  const {entries}=await api('admin/notifications/refresh',{},true);
  const reminders=entries.filter(entry=>entry.event==='reminder'&&entry.actionable);
  const other=entries.filter(entry=>entry.event!=='reminder'||!entry.actionable);
  $('notifications-list').innerHTML=`<h3>Lembretes pendentes</h3>
   ${reminders.length?reminders.map(notificationCard).join(''):'<p class="muted">Nenhum lembrete pendente para as próximas 24 horas.</p>'}
   <h3 class="mt-4">Outras mensagens e histórico</h3>
   ${other.length?other.map(notificationCard).join(''):'<p class="muted">Nenhuma outra mensagem registrada.</p>'}`;
  if(notificationFocus){
   const card=[...document.querySelectorAll('[data-notification-id]')].find(element=>element.dataset.notificationId===notificationFocus);
   card?.focus();
   notificationFocus=null;
  }
  document.querySelectorAll('[data-mark-sent]').forEach(button=>button.onclick=async()=>{
   button.disabled=true;
   try{await api('admin/notifications/sent',{id:button.dataset.markSent},true);await loadNotifications();}
   catch(e){$('notification-error').textContent=e.message;button.disabled=false;}
  });
 }catch(e){$('notification-error').textContent=e.message;}
}
$('refresh-notifications').onclick=loadNotifications;
