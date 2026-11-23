export const DEFAULT_SERVICES = [
 {id:'henna',name:'Design com henna',duration:60,price:5000,category:'Sobrancelhas',description:'Definição e preenchimento para valorizar seu olhar.'},
 {id:'tintura',name:'Design com tintura',duration:60,price:5500,category:'Sobrancelhas',description:'Cor e desenho em harmonia com seus traços.'},
 {id:'brow',name:'Brow lamination',duration:90,price:12500,category:'Sobrancelhas',description:'Fios alinhados e um efeito naturalmente marcante.'},
 {id:'cilios',name:'Extensão de cílios',duration:120,price:14000,category:'Cílios',description:'Volume e curvatura com atendimento personalizado.'},
 {id:'spa',name:'Spa labial',duration:30,price:2500,category:'Cuidados',description:'Um momento de cuidado e hidratação para os lábios.'},
 {id:'buco',name:'Epilação de buço',duration:15,price:1500,category:'Cuidados',description:'Um cuidado delicado para finalizar sua rotina.'}
];
export const ZONE = 'America/Sao_Paulo';
export function today(now = new Date()) { return new Intl.DateTimeFormat('en-CA',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(now); }
export function validDate(date) { return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date+'T12:00:00-03:00')) && new Date(date+'T12:00:00Z').toISOString().slice(0,10) === date; }
export function workingDay(date) { const d = new Date(date+'T12:00:00Z').getUTCDay(); return d>=2 && d<=6; }
export function future(date, start, now = new Date()) { return new Date(date+'T'+time(start)+':00-03:00').getTime() > now.getTime(); }
export function time(min) { return String(Math.floor(min/60)).padStart(2,'0')+':'+String(min%60).padStart(2,'0'); }
export function slots(date, duration, busy, now = new Date()) {
 if (!validDate(date) || !workingDay(date) || date<today(now)) return [];
 const result=[];
 for(let start=540;start+duration<=1080;start+=15) {
  if(future(date,start,now) && !busy.some(b=>b.start<start+duration && b.end>start)) result.push(time(start));
 }
 return result;
}
export function money(cents) { return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100); }
export function totals(services) { return services.reduce((sum,s)=>({duration:sum.duration+s.duration,price:sum.price+s.price}),{duration:0,price:0}); }
