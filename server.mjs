import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
if(!existsSync('public/vendor/bootstrap.min.css'))throw new Error('Bootstrap não encontrado. Consulte o README.');
spawnSync(process.execPath,['scripts/build.mjs'],{stdio:'inherit'});
const {default:worker}=await import('./dist/server/index.js?'+Date.now());
mkdirSync('data',{recursive:true});const sqlite=new DatabaseSync('data/agenda.sqlite');sqlite.exec('PRAGMA journal_mode = WAL');
if(!sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='appointments'").get())sqlite.exec(readFileSync('drizzle/0000_agenda.sql','utf8'));
if(!sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='quotes'").get())sqlite.exec(readFileSync('drizzle/0001_quotes.sql','utf8'));
if(!sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='notifications'").get())sqlite.exec(readFileSync('drizzle/0002_notifications.sql','utf8'));
if(!sqlite.prepare("SELECT name FROM pragma_table_info('appointments') WHERE name='whatsapp_consent_at'").get()){
 sqlite.exec('BEGIN;\n'+readFileSync('drizzle/0003_whatsapp_routines.sql','utf8')+'\nCOMMIT;');
}
if(!sqlite.prepare("SELECT name FROM pragma_table_info('notifications') WHERE name='manual_sent_at'").get()){
 sqlite.exec(readFileSync('drizzle/0004_manual_whatsapp.sql','utf8'));
}
function prepare(sql,args=[]){return {bind(...values){return prepare(sql,values);},async all(){return {results:sqlite.prepare(sql).all(...args)};},run(){const r=sqlite.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}};}};}
const DB={prepare,async batch(statements){
 sqlite.exec('BEGIN IMMEDIATE');
 try{
  const results=statements.map(statement=>statement.run());
  sqlite.exec('COMMIT');
  return results;
 }catch(error){
  sqlite.exec('ROLLBACK');
  throw error;
 }
}};
const port=Number(process.env.PORT)||4173;
const server=http.createServer(async(req,res)=>{
 try{
  const origin='http://127.0.0.1:'+port,url=new URL(req.url,origin);
  const limit=url.pathname==='/api/admin/appointments'?131072:20000;
  const chunks=[];
  let length=0;
  for await(const chunk of req){
   length+=chunk.length;
   if(length>limit){res.writeHead(413);res.end('Dados muito extensos');return;}
   chunks.push(chunk);
  }
  const request=new Request(origin+req.url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
  const response=await worker.fetch(request,{...process.env,DB});
  res.writeHead(response.status,Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
 }catch(e){console.error(e);res.writeHead(500);res.end('Erro interno');}
});
server.listen(port,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:'+port));
