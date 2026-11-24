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
function prepare(sql,args=[]){return {bind(...values){return prepare(sql,values);},async all(){return {results:sqlite.prepare(sql).all(...args)};},async run(){const r=sqlite.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}};}};}
let batchQueue=Promise.resolve();
const DB={prepare,batch(statements){const operation=batchQueue.then(async()=>{sqlite.exec('BEGIN IMMEDIATE');try{const r=[];for(const s of statements)r.push(await s.run());sqlite.exec('COMMIT');return r;}catch(e){sqlite.exec('ROLLBACK');throw e;}});batchQueue=operation.catch(()=>{});return operation;}};
const port=Number(process.env.PORT)||4173;
const server=http.createServer(async(req,res)=>{try{const chunks=[];let length=0;for await(const c of req){length+=c.length;if(length>20000){res.writeHead(413);res.end('Dados muito extensos');return;}chunks.push(c);}const origin='http://127.0.0.1:'+port;const request=new Request(origin+req.url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});const response=await worker.fetch(request,{...process.env,DB});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch(e){console.error(e);res.writeHead(500);res.end('Erro interno');}});
server.listen(port,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:'+port));
