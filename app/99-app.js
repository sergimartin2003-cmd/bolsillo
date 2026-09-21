'use strict';
/* ================= utilidades ================= */
const $=(s,el)=>(el||document).querySelector(s);
const uid=()=>Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-4);
const pad=n=>String(n).padStart(2,'0');
const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parseISO=s=>{const p=String(s).split('-').map(Number);return new Date(p[0],p[1]-1,p[2])};
const todayISO=()=>iso(new Date());
const dim=(y,m)=>new Date(y,m+1,0).getDate();
const addDays=(s,n)=>{const d=parseISO(s);d.setDate(d.getDate()+n);return iso(d)};
const addMonths=(s,n)=>{const d=parseISO(s);const day=d.getDate();const t=new Date(d.getFullYear(),d.getMonth()+n,1);t.setDate(Math.min(day,dim(t.getFullYear(),t.getMonth())));return iso(t)};
const diffDays=(a,b)=>Math.round((parseISO(b)-parseISO(a))/864e5);
const norm=s=>String(s==null?'':s).normalize('NFC').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').normalize('NFC');
const r2=n=>Math.round((n+Number.EPSILON)*100)/100;
const clone=o=>JSON.parse(JSON.stringify(o));
const MONTHS=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const MON=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const DAYS=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const DAY3=['dom','lun','mar','mié','jue','vie','sáb'];
const cap=s=>s?s[0].toUpperCase()+s.slice(1):s;
function fmtDay(s){const t=todayISO();if(s===t)return'Hoy';if(s===addDays(t,-1))return'Ayer';if(s===addDays(t,1))return'Mañana';const d=parseISO(s);return DAY3[d.getDay()]+', '+d.getDate()+' '+MON[d.getMonth()]+(d.getFullYear()!==new Date().getFullYear()?' '+d.getFullYear():'')}
const fmtShort=s=>{const d=parseISO(s);return d.getDate()+' '+MON[d.getMonth()]};
const fmtLong=s=>{const d=parseISO(s);return d.getDate()+' de '+MONTHS[d.getMonth()]+' de '+d.getFullYear()};
const monthKey=s=>s.slice(0,7);
const monthLabel=k=>{const p=k.split('-');return MON[+p[1]-1]+(p[0]!==String(new Date().getFullYear())?" '"+p[0].slice(2):'')};

function parseNum(str){
  if(typeof str==='number')return str;
  let s=String(str==null?'':str).trim().replace(/[^\d.,\-+]/g,'');
  if(!s)return NaN;
  let neg=s[0]==='-';s=s.replace(/[-+]/g,'');
  const lc=s.lastIndexOf(','),ld=s.lastIndexOf('.');
  if(lc>-1&&ld>-1){s=lc>ld?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'')}
  else if(lc>-1){const p=s.split(',');s=p.length>2?p.join(''):s.replace(',','.')}
  else if(ld>-1){const p=s.split('.');if(p.length>2)s=p.join('');else if(p[1].length===3&&p[0].length<=3&&p[0]!=='0'&&p[0]!=='')s=p.join('')}
  const n=parseFloat(s);return neg?-n:n;
}
const NF={};
function num(v,d){return new Intl.NumberFormat('es-ES',{minimumFractionDigits:d==null?2:d,maximumFractionDigits:d==null?2:d}).format(v)}
function money(v,cur,o){
  o=o||{};cur=cur||S.settings.currency;
  if(S.settings.incognito&&!o.force)return '••••';
  const key=cur+(o.int?'i':'');
  try{
    if(!NF[key])NF[key]=new Intl.NumberFormat('es-ES',{style:'currency',currency:cur,useGrouping:'always',minimumFractionDigits:o.int?0:undefined,maximumFractionDigits:o.int?0:2});
    return NF[key].format(v);
  }catch(e){return num(v)+' '+cur}
}
const compact=v=>new Intl.NumberFormat('es-ES',{notation:'compact',maximumFractionDigits:1}).format(v);
const csym=cur=>{try{return new Intl.NumberFormat('es-ES',{style:'currency',currency:cur}).formatToParts(0).find(p=>p.type==='currency').value}catch(e){return cur}};

/* ================= estado ================= */
const KEY='bolsillo.v2',KEY_OLD='bolsillo.v1';
const realKey=()=>'bolsillo.real.'+SPACE;
const LS={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v);return true}catch(e){return false}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
const DEFAULT_RATES={EUR:1,USD:1.08,GBP:0.85,CHF:0.95,JPY:165,MXN:19.6,COP:4400,ARS:1150,CLP:1020,PEN:4.05,BRL:5.9,UYU:44,CAD:1.47,AUD:1.65,CNY:7.85,MAD:10.8,TRY:37,USDT:1.08};
const PALETTE=['#3FA34D','#E8833A','#3B82C4','#7A5AF8','#E0B400','#C43B8A','#E5484D','#1BA6A6','#4C6EF5','#2E9E6B','#B0763C','#D9576F','#6B7280','#0F8A5C','#13A3B4','#8E5BD1'];
const ACCENTS=['#2748D9','#5B3FD9','#0E8A9C','#0F8A5C','#D9480F','#C2255C','#1F2937','#B45309'];
const ACC_TYPES={cash:{n:'Efectivo',i:'💵'},bank:{n:'Cuenta bancaria',i:'🏦'},card:{n:'Tarjeta de crédito',i:'💳'},savings:{n:'Ahorro',i:'🐖'},invest:{n:'Inversión',i:'📈'},loan:{n:'Préstamo',i:'🏛️'},other:{n:'Otra',i:'👛'}};
/* ---------- préstamos: amortización (sistema francés) ---------- */
function loanPayment(principal,ratePct,months){
  const r=(parseNum(ratePct)||0)/100/12;months=parseInt(months,10)||0;principal=Math.abs(parseNum(principal)||0);
  if(!(months>0)||!(principal>0))return 0;
  if(r<=0)return principal/months;
  return principal*r/(1-Math.pow(1+r,-months));
}
function loanSchedule(principal,ratePct,months,startDate){
  const r=(parseNum(ratePct)||0)/100/12;months=parseInt(months,10)||0;principal=Math.abs(parseNum(principal)||0);
  const pay=loanPayment(principal,ratePct,months);
  let bal=principal;const rows=[];
  for(let i=1;i<=months&&bal>0.005;i++){
    const interest=r2(bal*r);let princ=r2(pay-interest);if(princ>bal)princ=bal;
    bal=r2(bal-princ);
    rows.push({n:i,date:addMonths(startDate||todayISO(),i),payment:r2(princ+interest),principal:princ,interest,balance:Math.max(0,bal)});
  }
  return rows;
}
const FREQ={daily:'Diaria',weekly:'Semanal',biweekly:'Cada 2 semanas',monthly:'Mensual',yearly:'Anual'};

function defaultCategories(){
  const E=(key,name,icon,color,parent)=>({id:'c_'+key,name,icon,color,type:'expense',parent:parent?'c_'+parent:null});
  const I=(key,name,icon,color)=>({id:'c_'+key,name,icon,color,type:'income',parent:null});
  return [
    E('super','Supermercado','🛒','#3FA34D'),E('comer','Comer fuera','🍽️','#E8833A'),E('cafe','Café','☕','#B0763C','comer'),E('rest','Restaurantes','🍝','#E8833A','comer'),
    E('transp','Transporte','🚌','#3B82C4'),E('gas','Gasolina','⛽','#3B82C4','transp'),E('publico','Transporte público','🚇','#3B82C4','transp'),E('taxi','Taxi y VTC','🚕','#3B82C4','transp'),
    E('viv','Vivienda','🏠','#7A5AF8'),E('fact','Facturas','💡','#E0B400'),E('subs','Suscripciones','📺','#C43B8A'),E('salud','Salud','💊','#E5484D'),
    E('compras','Compras','🛍️','#8E5BD1'),E('ocio','Ocio','🎬','#F0616D'),E('viajes','Viajes','✈️','#1BA6A6'),E('edu','Educación','🎓','#4C6EF5'),
    E('dep','Deporte','🏋️','#2E9E6B'),E('masc','Mascotas','🐾','#B0763C'),E('regalos','Regalos','🎁','#D9576F'),E('imp','Impuestos','🧾','#6B7280'),E('perdinv','Pérdidas de inversión','📉','#CF3640'),E('otros','Otros gastos','📦','#8A94A6'),
    I('nomina','Nómina','💼','#0F8A5C'),I('negocio','Negocio','🧑‍💻','#2748D9'),I('inv','Inversiones','📈','#13A3B4'),I('regrec','Regalos recibidos','🎉','#D9576F'),I('reemb','Reembolsos','↩️','#3B82C4'),I('otrosi','Otros ingresos','💰','#8A94A6')
  ];
}
function freshState(){
  return{v:1,
    settings:{currency:'EUR',accent:'#2748D9',theme:'auto',incognito:false,showFuture:false,txView:'regular',signed:true,amtColor:'income',payCycle:'monthly',payDay:1,payDay2:15,payAnchor:todayISO(),rates:{...DEFAULT_RATES},lock:null,spaceAuth:null,spaceName:'',priceApi:null,onboarded:false,demo:false},
    accounts:[
      {id:'a_cash',name:'Efectivo',type:'cash',currency:'EUR',initial:0,icon:'💵',color:'#3FA34D'},
      {id:'a_bank',name:'Cuenta principal',type:'bank',currency:'EUR',initial:0,icon:'🏦',color:'#2748D9'}],
    categories:defaultCategories(),tx:[],recurring:[],budgets:[],budgetMoves:[],goals:[],shortcuts:[],memory:{}};
}
/* ---------- espacios (Personal / Empresa) ---------- */
let SPACES=null,SPACE='personal',S=null,REV=0,MEMO={};
const SPACE_IDS=['personal','empresa'];
const SPACE_ICON={personal:'🏠',empresa:'💼'};
const SPACE_COLOR={personal:'#2748D9',empresa:'#0F8A5C'};
function spaceLabel(id,st){st=st||(SPACES&&SPACES[id]&&SPACES[id].settings);return(st&&st.spaceName)||(id==='empresa'?'Empresa':'Personal')}
function setS(newS){S=newS;if(SPACES)SPACES[SPACE]=S}
function migrate(state){
  const t=state||S,f=freshState();
  t.settings=Object.assign({},f.settings,t.settings||{});
  t.settings.rates=Object.assign({},DEFAULT_RATES,t.settings.rates||{});
  for(const k of['accounts','categories','tx','recurring','budgets','budgetMoves','goals','shortcuts'])if(!Array.isArray(t[k]))t[k]=f[k];
  if(!t.memory)t.memory={};
  for(const a of t.accounts){
    if(a.type!=='invest')continue;
    if(!Array.isArray(a.holdings)){
      a.holdings=(a.symbol?[{id:uid(),symbol:a.symbol,assetType:a.assetType==='stock'?'stock':'crypto',qty:a.qty||1}]:[]);
    }
    delete a.symbol;delete a.assetType;delete a.qty;
  }
  return t;
}
function loadState(){
  const raw=LS.get(KEY);
  if(raw){
    try{
      const d=JSON.parse(raw);
      if(d&&d.spaces&&d.spaces.personal&&d.spaces.empresa){
        SPACES={personal:d.spaces.personal,empresa:d.spaces.empresa};
        SPACE=d.active==='empresa'?'empresa':'personal';
        migrate(SPACES.personal);migrate(SPACES.empresa);
        S=SPACES[SPACE];
        return true;
      }
    }catch(e){}
  }
  const old=LS.get(KEY_OLD);
  if(old){
    try{
      const o=JSON.parse(old);
      SPACES={personal:o,empresa:freshState()};
      SPACE='personal';
      migrate(SPACES.personal);migrate(SPACES.empresa);
      S=SPACES.personal;
      flush();
      return true;
    }catch(e){}
  }
  SPACES={personal:freshState(),empresa:freshState()};SPACE='personal';S=SPACES.personal;
  return false;
}
let saveT=null,storageOK=true;
function flush(){clearTimeout(saveT);saveT=null;if(SPACES)SPACES[SPACE]=S;storageOK=LS.set(KEY,JSON.stringify({v:2,active:SPACE,spaces:SPACES}));sbAutoPush();return storageOK}
function save(){clearTimeout(saveT);saveT=setTimeout(()=>{if(!flush())toast('No se pudo guardar en este navegador. Haz una copia desde Ajustes → Datos.')},200)}
function commit(quiet){REV++;MEMO={};if(materialize()){REV++;MEMO={}}save();if(!quiet)renderAll()}
const memo=(k,fn)=>{const key=k+':'+REV+':'+todayISO();return key in MEMO?MEMO[key]:(MEMO[key]=fn())};

/* ---------- copia en la nube (Supabase) ---------- */
const SB_URL='https://ndgtelirnjbtxzmrgxjm.supabase.co';
const SB_ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kZ3RlbGlybmpidHh6bXJneGptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5NDM2NDIsImV4cCI6MjEwNTUxOTY0Mn0.xXRgbMo0M4VxkZNFlxKUHTTTF3RFXgbFQB83u7st9HU';
const SB_SESS_KEY='bolsillo.sbsession';
function sbSession(){try{const raw=LS.get(SB_SESS_KEY);return raw?JSON.parse(raw):null}catch(e){return null}}
function sbSetSession(sess){if(sess)LS.set(SB_SESS_KEY,JSON.stringify(sess));else LS.del(SB_SESS_KEY)}
function sbSignOut(){sbSetSession(null)}
async function sbFetch(path,opts){
  opts=opts||{};
  const headers=Object.assign({'apikey':SB_ANON,'Content-Type':'application/json'},opts.headers||{});
  let r;
  try{r=await fetch(SB_URL+path,Object.assign({},opts,{headers}))}
  catch(e){return{ok:false,error:'No se pudo conectar con Supabase (sin red o bloqueado)'}}
  let data=null;try{data=await r.json()}catch(e){}
  if(!r.ok)return{ok:false,error:(data&&(data.error_description||data.msg||data.message))||('Error '+r.status),status:r.status};
  return{ok:true,data};
}
function sbSessFromAuthResp(d,email){
  return{access_token:d.access_token,refresh_token:d.refresh_token,expires_at:Date.now()+((d.expires_in||3600)*1000),user_id:d.user&&d.user.id,email:(d.user&&d.user.email)||email};
}
async function sbSignUp(email,password){
  const r=await sbFetch('/auth/v1/signup',{method:'POST',body:JSON.stringify({email,password})});
  if(!r.ok)return r;
  if(r.data&&r.data.access_token){sbSetSession(sbSessFromAuthResp(r.data,email));return{ok:true,confirmed:true}}
  return{ok:true,confirmed:false};
}
async function sbSignIn(email,password){
  const r=await sbFetch('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});
  if(!r.ok)return r;
  sbSetSession(sbSessFromAuthResp(r.data,email));
  return{ok:true};
}
async function sbRefresh(){
  const sess=sbSession();if(!sess||!sess.refresh_token)return null;
  const r=await sbFetch('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:sess.refresh_token})});
  if(!r.ok){sbSetSession(null);return null}
  const ns=sbSessFromAuthResp(r.data,sess.email);sbSetSession(ns);return ns;
}
async function sbValidSession(){
  let sess=sbSession();if(!sess)return null;
  if(sess.expires_at-Date.now()<60000)sess=await sbRefresh();
  return sess;
}
async function sbRest(path,opts){
  const sess=await sbValidSession();
  if(!sess)return{ok:false,error:'No has iniciado sesión'};
  return sbFetch(path,Object.assign({},opts,{headers:Object.assign({'Authorization':'Bearer '+sess.access_token},(opts&&opts.headers)||{})}));
}
async function sbPull(){
  const sess=await sbValidSession();if(!sess)return{ok:false,error:'No has iniciado sesión'};
  const r=await sbRest('/rest/v1/bolsillo_state?user_id=eq.'+sess.user_id+'&select=data,updated_at');
  if(!r.ok)return r;
  const row=Array.isArray(r.data)&&r.data.length?r.data[0]:null;
  return{ok:true,row};
}
async function sbPush(blob){
  const sess=await sbValidSession();if(!sess)return{ok:false,error:'No has iniciado sesión'};
  return sbRest('/rest/v1/bolsillo_state?on_conflict=user_id',{method:'POST',headers:{'Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({user_id:sess.user_id,data:blob})});
}
let sbSyncing=false,sbSyncT=null,sbLastSync=null,sbSyncErr='';
function sbAutoPush(){
  if(!sbSession())return;
  clearTimeout(sbSyncT);
  sbSyncT=setTimeout(async()=>{
    if(sbSyncing)return;sbSyncing=true;
    const r=await sbPush({v:2,active:SPACE,spaces:SPACES});
    sbSyncing=false;
    if(r.ok){sbLastSync=Date.now();sbSyncErr=''}else{sbSyncErr=r.error||'Error al sincronizar'}
  },1500);
}
function applyCloudState(blob){
  if(!blob||!blob.spaces||!blob.spaces.personal||!blob.spaces.empresa){toast('Copia en la nube con formato inválido');return false}
  SPACES={personal:blob.spaces.personal,empresa:blob.spaces.empresa};
  SPACE=blob.active==='empresa'?'empresa':'personal';
  migrate(SPACES.personal);migrate(SPACES.empresa);
  S=SPACES[SPACE];
  flush();renderAll();
  return true;
}

/* ================= selectores ================= */
const main=()=>S.settings.currency;
const rate=c=>S.settings.rates[c]||1;
const conv=(v,from,to)=>from===to?v:v/rate(from)*rate(to);
const acc=id=>S.accounts.find(a=>a.id===id);
const NOCAT={id:'',name:'Sin categoría',icon:'❔',color:'#8A94A6',type:'expense',parent:null};
const cat=id=>S.categories.find(c=>c.id===id)||NOCAT;
const rootCat=id=>{const c=cat(id);return c.parent?cat(c.parent):c};
const catFull=id=>{const c=cat(id);return c.parent?cat(c.parent).name+' › '+c.name:c.name};
const childrenOf=id=>S.categories.filter(c=>c.parent===id);
const catWithChildren=id=>[id].concat(childrenOf(id).map(c=>c.id));
const activeAccounts=()=>S.accounts.filter(a=>!a.archived);
const txMain=t=>conv(t.amount,t.cur,main());
const currencies=()=>Object.keys(S.settings.rates);
const allTags=()=>{const m={};for(const t of S.tx)for(const g of(t.tags||[]))m[g]=(m[g]||0)+1;return Object.keys(m).sort((a,b)=>m[b]-m[a])};
const allPayees=()=>{const m={};for(const t of S.tx)if(t.payee)m[t.payee]=(m[t.payee]||0)+1;return Object.keys(m).sort((a,b)=>m[b]-m[a]).slice(0,60)};

function filterTx(f){
  f=f||{};const q=f.q?norm(f.q):'';const today=todayISO();const fut=S.settings.showFuture;
  const res=S.tx.filter(t=>{
    if(f.from&&t.date<f.from)return false;if(f.to&&t.date>f.to)return false;
    if(!fut&&t.date>today&&!f.all)return false;
    if(f.types&&f.types.length&&!f.types.includes(t.type))return false;
    if(f.accs&&f.accs.length&&!f.accs.includes(t.acc)&&!(t.type==='transfer'&&f.accs.includes(t.acc2)))return false;
    if(f.cats&&f.cats.length){
      const hitCat=Array.isArray(t.splits)&&t.splits.length?t.splits.some(s=>f.cats.includes(s.cat)):f.cats.includes(t.cat);
      if(!hitCat)return false;
    }
    if(f.tag&&!(t.tags||[]).includes(f.tag))return false;
    if(f.payee&&t.payee!==f.payee)return false;
    if(f.pending&&!t.pending)return false;
    if(f.stats&&t.excluded)return false;
    if(q){
      const catNames=Array.isArray(t.splits)&&t.splits.length?t.splits.map(s=>cat(s.cat).name).join(' '):cat(t.cat).name;
      const hay=norm([t.payee,t.note,catNames,(acc(t.acc)||{}).name,(t.tags||[]).join(' '),String(t.amount)].join(' '));if(!hay.includes(q))return false;
    }
    return true;
  });
  if(!f.nosort)res.sort((a,b)=>a.date<b.date?1:a.date>b.date?-1:(b.ts||0)-(a.ts||0));
  return res;
}
function balances(){return memo('bal',()=>{
  const b={};for(const a of S.accounts)b[a.id]=a.initial||0;
  const today=todayISO(),fut=S.settings.showFuture;
  for(const t of S.tx){
    if(!fut&&t.date>today)continue;const A=acc(t.acc);if(!A)continue;
    if(t.type==='transfer'){b[t.acc]-=conv(t.amount,t.cur,A.currency);const B=acc(t.acc2);if(B)b[t.acc2]+=t.amount2!=null?t.amount2:conv(t.amount,t.cur,B.currency)}
    else b[t.acc]+=(t.type==='income'?1:-1)*conv(t.amount,t.cur,A.currency);
  }
  return b})}
const netWorth=()=>{const b=balances();return activeAccounts().reduce((s,a)=>s+conv(b[a.id]||0,a.currency,main()),0)};
function netWorthSeries(dates){
  const A=activeAccounts(),ids=new Set(A.map(a=>a.id));
  let run=A.reduce((s,a)=>s+conv(a.initial||0,a.currency,main()),0);
  const ev=[];
  for(const t of S.tx){
    if(!ids.has(t.acc))continue;let v;
    if(t.type==='transfer'){const B=acc(t.acc2);v=-conv(t.amount,t.cur,main());if(B&&ids.has(t.acc2))v+=t.amount2!=null?conv(t.amount2,B.currency,main()):conv(t.amount,t.cur,main())}
    else v=(t.type==='income'?1:-1)*conv(t.amount,t.cur,main());
    ev.push([t.date,v]);
  }
  ev.sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
  const today=todayISO(),out=[];let i=0;
  for(const d of dates){while(i<ev.length&&ev[i][0]<=d&&(S.settings.showFuture||ev[i][0]<=today)){run+=ev[i][1];i++}out.push(run)}
  return out;
}

/* ---------- periodos (ciclo de cobro) ---------- */
function periodFor(ref,type){
  type=type||'cycle';const d=parseISO(ref),st=S.settings;
  if(type==='week'){const wd=(d.getDay()+6)%7;const s=addDays(ref,-wd);return{start:s,end:addDays(s,6),type}}
  if(type==='year')return{start:d.getFullYear()+'-01-01',end:d.getFullYear()+'-12-31',type};
  if(st.payCycle==='biweekly'){const a=st.payAnchor||'2024-01-01';const k=Math.floor(diffDays(a,ref)/14);const s=addDays(a,14*k);return{start:s,end:addDays(s,13),type}}
  const dd=st.payCycle==='twice'?[Math.min(st.payDay||1,st.payDay2||15),Math.max(st.payDay||1,st.payDay2||15)]:[st.payDay||1];
  let starts=[];
  for(let m=-2;m<=2;m++){const bd=new Date(d.getFullYear(),d.getMonth()+m,1);for(const x of dd)starts.push(iso(new Date(bd.getFullYear(),bd.getMonth(),Math.min(x,dim(bd.getFullYear(),bd.getMonth())))))}
  starts=[...new Set(starts)].sort();
  let s=starts[0],n=starts[1];
  for(let i=0;i<starts.length-1;i++){if(starts[i]<=ref){s=starts[i];n=starts[i+1]}}
  return{start:s,end:addDays(n,-1),type};
}
function shiftPeriod(p,n){let q=p;for(let i=0;i<Math.abs(n);i++)q=n>0?periodFor(addDays(q.end,1),p.type):periodFor(addDays(q.start,-1),p.type);return q}
const curPeriod=type=>periodFor(todayISO(),type);
function periodLabel(p){
  const s=parseISO(p.start),e=parseISO(p.end);
  if(p.type==='year')return String(s.getFullYear());
  if(s.getDate()===1&&e.getDate()===dim(e.getFullYear(),e.getMonth())&&s.getMonth()===e.getMonth()&&s.getFullYear()===e.getFullYear())return MONTHS[s.getMonth()]+' '+s.getFullYear();
  return fmtShort(p.start)+' – '+fmtShort(p.end);
}

/* ---------- presupuestos ---------- */
function budgetCats(b){if(b.kind==='total')return null;const set=new Set();for(const c of(b.cats||[]))catWithChildren(c).forEach(x=>set.add(x));return set}
function sumForCatSet(list,set){
  let s=0;
  for(const t of list){
    if(Array.isArray(t.splits)&&t.splits.length){
      for(const sp of t.splits){if(set&&!set.has(sp.cat))continue;s+=conv(sp.amount,t.cur,main())}
    }else{
      if(set&&!set.has(t.cat))continue;s+=txMain(t);
    }
  }
  return s;
}
function spentFor(b,p){
  const set=budgetCats(b);
  return sumForCatSet(filterTx({from:p.start,to:p.end,types:['expense'],stats:true,nosort:true}),set);
}
function budgetInfo(b,p){
  const type=b.period||'cycle';p=p||periodFor(todayISO(),type);
  const created=b.created||'2000-01-01';let chain=[p];
  if(b.carry){let q=p;for(let i=0;i<24;i++){const prev=shiftPeriod(q,-1);if(prev.end<created)break;chain.unshift(prev);q=prev}}
  let carry=0,info=null;
  for(const q of chain){
    const moved=S.budgetMoves.reduce((s,m)=>(m.period===q.start&&m.ptype===type)?s+(m.to===b.id?m.amount:0)-(m.from===b.id?m.amount:0):s,0);
    const avail=b.amount+moved+(b.carry?carry:0),spent=spentFor(b,q);
    info={avail,spent,carry:b.carry?carry:0,moved,base:b.amount,period:q};carry=Math.max(0,avail-spent);
  }
  info.remaining=info.avail-info.spent;
  info.pct=info.avail>0?info.spent/info.avail:(info.spent>0?1:0);
  return info;
}
function dailyLimit(b){
  const t=todayISO(),p=periodFor(t,b.period||'cycle');if(t<p.start||t>p.end)return null;
  const info=budgetInfo(b,p),left=diffDays(t,p.end)+1;
  const set=budgetCats(b);
  const today=sumForCatSet(filterTx({from:t,to:t,types:['expense'],stats:true,nosort:true}),set);
  const beforeToday=info.remaining+today;
  return{perDay:Math.max(0,beforeToday)/left,left,info,today,over:beforeToday<0};
}
const mainBudget=()=>S.budgets.find(b=>b.kind==='total')||null;

/* ---------- objetivos ---------- */
function goalInfo(g){
  const saved=(g.contribs||[]).reduce((s,c)=>s+c.amount,0);
  const pct=g.target>0?Math.max(0,Math.min(1,saved/g.target)):0;
  const rem=Math.max(0,g.target-saved);const out={saved,pct,rem,done:g.target>0&&saved>=g.target};
  const t=todayISO();
  if(g.date&&!out.done){out.days=diffDays(t,g.date);out.perMonth=rem/Math.max(out.days/30.44,.03);out.perWeek=rem/Math.max(out.days/7,.15)}
  const first=(g.contribs||[]).map(c=>c.date).sort()[0]||g.created;
  if(first){const span=Math.max(30,diffDays(first,t));out.pace=saved/span*30.44;if(!out.done&&out.pace>0)out.eta=addDays(t,Math.ceil(rem/(out.pace/30.44)))}
  return out;
}

/* ---------- pagos recurrentes ---------- */
function occ(r,n){const e=r.every||1;switch(r.freq){case'daily':return addDays(r.start,e*n);case'weekly':return addDays(r.start,7*e*n);case'biweekly':return addDays(r.start,14*e*n);case'yearly':return addMonths(r.start,12*e*n);default:return addMonths(r.start,e*n)}}
function nextDue(r){const d=occ(r,r.n||0);return(r.end&&d>r.end)?null:d}
function materialize(){
  const today=todayISO();let changed=false;
  for(const r of S.recurring){
    if(r.paused||r.auto===false)continue;let g=0;
    while(g++<800){
      const d=occ(r,r.n||0);if(d>today||(r.end&&d>r.end))break;
      S.tx.push({id:uid(),type:r.type,amount:r.amount,cur:r.cur,acc:r.acc,acc2:r.type==='transfer'?r.acc2:'',amount2:r.type==='transfer'?(r.amount2!=null?r.amount2:null):null,cat:r.cat,payee:r.payee||'',tags:[].concat(r.tags||[]),note:r.note||'',date:d,pending:false,excluded:false,recId:r.id,ts:Date.now()+g});
      r.n=(r.n||0)+1;changed=true;
    }
  }
  return changed;
}
function payBill(r){
  const d=nextDue(r);if(!d)return;
  S.tx.push({id:uid(),type:r.type,amount:r.amount,cur:r.cur,acc:r.acc,acc2:r.type==='transfer'?r.acc2:'',amount2:r.type==='transfer'?(r.amount2!=null?r.amount2:null):null,cat:r.cat,payee:r.payee||'',tags:[].concat(r.tags||[]),note:r.note||'',date:d<=todayISO()?d:todayISO(),pending:false,excluded:false,recId:r.id,ts:Date.now()});
  r.n=(r.n||0)+1;
}
const FREQ_M={daily:30.44,weekly:4.345,biweekly:2.1725,monthly:1,yearly:1/12};
const monthlyEq=r=>conv(r.amount,r.cur,main())*(FREQ_M[r.freq]||1)/(r.every||1);
function upcomingBills(days){
  const t=todayISO(),lim=addDays(t,days),out=[];
  for(const r of S.recurring){if(r.paused)continue;const d=nextDue(r);if(d&&d<=lim)out.push({r,d})}
  return out.sort((a,b)=>a.d<b.d?-1:1);
}

/* ---------- informes ---------- */
function rangeFor(key){
  const t=todayISO(),p=curPeriod();
  switch(key){
    case'period':return{from:p.start,to:p.end};
    case'30d':return{from:addDays(t,-29),to:t};
    case'3m':return{from:addMonths(t.slice(0,8)+'01',-2),to:t};
    case'6m':return{from:addMonths(t.slice(0,8)+'01',-5),to:t};
    case'year':return{from:t.slice(0,4)+'-01-01',to:t};
    default:{const all=S.tx.map(x=>x.date).sort();return{from:all[0]||t,to:t}}
  }
}
function monthsBetween(from,to){const out=[];let d=from.slice(0,7)+'-01';while(d.slice(0,7)<=to.slice(0,7)&&out.length<240){out.push(d.slice(0,7));d=addMonths(d,1)}return out}
function flowByMonth(from,to,accs,withInitial){
  const keys=monthsBetween(from,to),map={};keys.forEach(k=>map[k]={inc:0,exp:0});
  for(const t of filterTx({from,to,stats:true,nosort:true,accs})){
    if(t.type==='transfer')continue;const m=map[monthKey(t.date)];if(!m)continue;
    if(t.type==='income')m.inc+=txMain(t);else m.exp+=txMain(t);
  }
  if(withInitial&&keys.length){for(const a of activeAccounts()){if(accs&&accs.length&&!accs.includes(a.id))continue;const v=conv(a.initial||0,a.currency,main());if(v>0)map[keys[0]].inc+=v;else map[keys[0]].exp-=v}}
  return keys.map(k=>({key:k,inc:map[k].inc,exp:map[k].exp}));
}
function totalsBy(from,to,type,keyFn,accs){
  const m={};
  for(const t of filterTx({from,to,types:[type],stats:true,nosort:true,accs})){for(const k of keyFn(t)){m[k]=(m[k]||0)+txMain(t)}}
  return Object.keys(m).map(k=>({key:k,value:m[k]})).sort((a,b)=>b.value-a.value);
}
function catTotals(from,to,type,accs,byRoot){
  const m={};
  for(const t of filterTx({from,to,types:[type],stats:true,nosort:true,accs})){
    if(Array.isArray(t.splits)&&t.splits.length){
      for(const sp of t.splits){const k=byRoot?rootCat(sp.cat).id:sp.cat;m[k]=(m[k]||0)+conv(sp.amount,t.cur,main())}
    }else{
      const k=byRoot?rootCat(t.cat).id:t.cat;m[k]=(m[k]||0)+txMain(t);
    }
  }
  return Object.keys(m).map(k=>({key:k,value:m[k]})).sort((a,b)=>b.value-a.value);
}
'use strict';
/* ================= Entrada rápida: texto -> transacción ================= */
const KW={
  super:'mercadona lidl carrefour aldi supermercado super fruta frutas verdura verduras carniceria panaderia pescaderia hipercor eroski alcampo consum bonpreu',
  cafe:'cafe cafes cafeteria starbucks cortado capuchino',
  rest:'restaurante restaurantes cena cenas menu pizza pizzeria hamburguesa kebab sushi tapas',
  comer:'comida almuerzo desayuno bar cerveza cervezas copas vermut glovo ubereats mcdonalds burger',
  gas:'gasolina diesel gasolinera repsol cepsa',
  publico:'metro bus autobus tren renfe tmb abono cercanias',
  taxi:'taxi uber cabify bolt vtc',
  transp:'parking peaje coche moto itv',
  viv:'alquiler hipoteca comunidad casa hogar ikea',
  fact:'luz agua gas internet fibra movil telefono vodafone movistar orange iberdrola endesa factura',
  subs:'netflix spotify hbo disney youtube prime icloud suscripcion apple',
  salud:'farmacia medico dentista hospital gafas optica fisio psicologo',
  compras:'ropa zapatos zara amazon pccomponentes electronica tienda',
  regalos:'regalo regalos cumpleanos cumple detalle',
  ocio:'cine concierto teatro juego juegos steam discoteca fiesta museo',
  viajes:'vuelo vuelos hotel airbnb vacaciones viaje booking ryanair vueling',
  edu:'curso cursos libro libros universidad matricula udemy clase',
  dep:'gimnasio gym padel futbol crossfit',
  masc:'veterinario pienso mascota perro gato',
  imp:'impuesto impuestos hacienda irpf iva multa autonomo',
  nomina:'nomina sueldo salario',
  negocio:'factura cliente venta ventas vendi cobro',
  inv:'dividendo dividendos intereses',
  reemb:'reembolso devolucion'
};
const INCOME_RE=/\b(nomina|sueldo|salario|ingreso|ingrese|ingresos|cobro|cobre|cobrado|recibi|recibido|me pagaron|me han pagado|me ingresaron|venta|vendi|dividendo|dividendos|intereses|paga extra|reembolso|devolucion)\b/;
const TRANSFER_RE=/\b(transferencia|transferi|traspaso|traspase|movi)\b/;
const STOP=new Set(['con','en','de','a','el','la','los','las','por','para','un','una','al','del','y','mi','me','he','ha','fue','que','es','en la','desde','hacia']);
const WD={domingo:0,lunes:1,martes:2,miercoles:3,jueves:4,viernes:5,sabado:6};
const MN={enero:0,febrero:1,marzo:2,abril:3,mayo:4,junio:5,julio:6,agosto:7,septiembre:8,setiembre:8,sept:8,octubre:9,noviembre:10,diciembre:11};
const CUR_MAP={'€':'EUR',eur:'EUR',euro:'EUR',euros:'EUR','$':'USD',usd:'USD',dolar:'USD',dolares:'USD','£':'GBP',gbp:'GBP',libra:'GBP',libras:'GBP'};

function parseQuick(input){
  const t=String(input||'').normalize('NFC');
  let n=norm(t);const same=n.length===t.length;
  const used=new Array(n.length).fill(false);
  const R={raw:input,type:'expense',amount:null,cur:null,date:todayISO(),cat:null,acc:null,acc2:null,payee:'',tags:[],recur:null,found:{}};
  const eat=(re,cb)=>{const m=re.exec(n);if(!m)return null;let a=m.index,b=a+m[0].length;
    if(cb){const off=cb(m);if(off){a+=off[0];b-=off[1]}}
    for(let i=a;i<b;i++)used[i]=true;n=n.slice(0,a)+' '.repeat(b-a)+n.slice(b);return m};
  const today=todayISO();

  // etiquetas
  const tagRe=/#([\p{L}\p{N}_-]+)/gu;let tm;const tagsFound=[];
  while((tm=tagRe.exec(t))){tagsFound.push(tm[1].toLowerCase());for(let i=tm.index;i<tm.index+tm[0].length&&i<used.length;i++){used[i]=true;n=n.slice(0,i)+' '+n.slice(i+1)}}
  R.tags=tagsFound;

  // recurrencia
  let m=eat(/\b(cada\s+(?:mes|semana|ano|dia|quincena|dos semanas|2 semanas)|mensual(?:mente)?|semanal(?:mente)?|anual(?:mente)?|diari[ao]|quincenal(?:mente)?|todos los meses|todas las semanas|todos los anos|todos los dias)\b/);
  if(m){const w=m[1];R.recur={freq:/mes/.test(w)||/mensual/.test(w)?'monthly':/dos semanas|2 semanas|quincen/.test(w)?'biweekly':/semana/.test(w)?'weekly':/ano|anual/.test(w)?'yearly':'daily'};R.found.recur=true}

  // fechas
  const setD=(d,txt)=>{R.date=d;R.found.date=txt};
  if((m=eat(/\b(?:el\s+)?(?:dia\s+)?(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|sept|octubre|noviembre|diciembre)(?:\s+de\s+(\d{4}))?\b/))){
    const y=m[3]?+m[3]:new Date().getFullYear();let d=iso(new Date(y,MN[m[2]],Math.min(+m[1],dim(y,MN[m[2]]))));
    if(!m[3]&&d>today)d=iso(new Date(y-1,MN[m[2]],Math.min(+m[1],dim(y-1,MN[m[2]]))));
    setD(d,m[0].trim());
  }else if((m=eat(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/))&&+m[1]<=31&&+m[2]<=12){
    let y=m[3]?+m[3]:new Date().getFullYear();if(y<100)y+=2000;
    let d=iso(new Date(y,+m[2]-1,Math.min(+m[1],dim(y,+m[2]-1))));if(!m[3]&&d>today)d=iso(new Date(y-1,+m[2]-1,Math.min(+m[1],dim(y-1,+m[2]-1))));
    setD(d,m[0].trim());
  }else if((m=eat(/\bhace\s+(\d+)\s+(dias?|semanas?|meses|mes)\b/))){
    const k=+m[1],u=m[2];setD(/dia/.test(u)?addDays(today,-k):/semana/.test(u)?addDays(today,-7*k):addMonths(today,-k),m[0].trim());
  }else if((m=eat(/\b(?:el\s+)?(domingo|lunes|martes|miercoles|jueves|viernes|sabado)(?:\s+(pasado|que viene|proximo))?\b/))){
    const wd=WD[m[1]],cur=parseISO(today).getDay();let diff;
    if(m[2]==='que viene'||m[2]==='proximo'){diff=(wd-cur+7)%7;if(diff===0)diff=7}
    else{diff=-((cur-wd+7)%7);if(m[2]==='pasado'&&diff===0)diff=-7}
    setD(addDays(today,diff),m[0].trim());
  }else if((m=eat(/\b(la semana pasada|la semana que viene|la proxima semana|el mes pasado|el mes que viene|el proximo mes|el ano pasado)\b/))){
    const w=m[1];setD(/semana pasada/.test(w)?addDays(today,-7):/semana/.test(w)?addDays(today,7):/mes pasado/.test(w)?addMonths(today,-1):/mes/.test(w)?addMonths(today,1):addMonths(today,-12),m[0].trim());
  }else if((m=eat(/\b(anteayer|antes de ayer|pasado manana|ayer|hoy|manana)\b/))){
    const w=m[1];setD(/anteayer|antes de ayer/.test(w)?addDays(today,-2):w==='ayer'?addDays(today,-1):w==='hoy'?today:/pasado manana/.test(w)?addDays(today,2):addDays(today,1),m[0].trim());
  }else if((m=eat(/\b(?:el\s+dia|el|dia)\s+(\d{1,2})\b/))&&+m[1]>=1&&+m[1]<=31){
    const d0=parseISO(today);let dd=iso(new Date(d0.getFullYear(),d0.getMonth(),Math.min(+m[1],dim(d0.getFullYear(),d0.getMonth()))));if(dd>today){const pm=new Date(d0.getFullYear(),d0.getMonth()-1,1);dd=iso(new Date(pm.getFullYear(),pm.getMonth(),Math.min(+m[1],dim(pm.getFullYear(),pm.getMonth()))))}setD(dd,m[0].trim());
  }

  // tipo
  const plus=/(^|\s)\+\s*\d/.test(t),minus=/(^|\s)-\s*\d/.test(t);
  if(TRANSFER_RE.test(n))R.type='transfer';
  else if(INCOME_RE.test(n)||plus)R.type='income';
  if(minus&&R.type==='income'&&!INCOME_RE.test(n))R.type='expense';

  // cuentas
  const accs=activeAccounts().map(a=>({a,k:norm(a.name)})).filter(x=>x.k.length>=3).sort((x,y)=>y.k.length-x.k.length);
  const hits=[];
  for(const x of accs){const i=n.indexOf(x.k);if(i>-1&&/(^|\W)$/.test(n.slice(0,i)||' ')){hits.push({id:x.a.id,i});for(let j=i;j<i+x.k.length;j++){used[j]=true}n=n.slice(0,i)+' '.repeat(x.k.length)+n.slice(i+x.k.length)}}
  hits.sort((p,q)=>p.i-q.i);
  if(hits[0]){R.acc=hits[0].id;R.found.acc=true}
  if(hits[1]&&R.type==='transfer'){R.acc2=hits[1].id}
  if(!R.acc){
    if(eat(/\b(efectivo|cash|metalico)\b/)){const c=activeAccounts().find(a=>a.type==='cash');if(c){R.acc=c.id;R.found.acc=true}}
    else if(eat(/\b(tarjeta|visa|mastercard)\b/)){const c=activeAccounts().find(a=>a.type==='card')||activeAccounts().find(a=>a.type==='bank');if(c){R.acc=c.id;R.found.acc=true}}
  }
  if(R.type==='transfer'&&R.acc&&R.acc2&&/\bde\b/.test(n)===false){/* orden natural: primera=origen */}

  // importe
  const AMT=/(^|[^\w.,#])([€$£]\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(€|euros?|eur|\$|usd|dolares?|£|gbp|libras?)?(?![\w])/g;
  let best=null,am,idx=0;
  while((am=AMT.exec(n))){
    const cs=(am[2]||am[4]||'').trim();const v=parseNum(am[3]);if(!(v>0)){idx++;continue}
    const sc=(cs?3:0)+(/[.,]\d{1,2}$/.test(am[3])?2:0)+idx*.1;
    if(!best||sc>=best.sc)best={sc,v,cs,start:am.index+am[1].length,end:am.index+am[0].length};idx++;
    if(AMT.lastIndex===am.index)AMT.lastIndex++;
  }
  if(best){
    R.amount=r2(best.v);R.found.amount=true;
    const code=CUR_MAP[best.cs.replace(/\s/g,'')];if(code&&S.settings.rates[code])R.cur=code;
    for(let i=best.start;i<best.end&&i<used.length;i++)used[i]=true;
    n=n.slice(0,best.start)+' '.repeat(best.end-best.start)+n.slice(best.end);
  }

  // categoría
  const words=norm(t).split(/[^a-z0-9ñ]+/).filter(Boolean);
  const want=R.type==='income'?'income':'expense';
  const okCat=id=>{const c=S.categories.find(x=>x.id===id);return c&&c.type===want?id:null};
  if(R.type!=='transfer'){
    const byName=S.categories.filter(c=>c.type===want).map(c=>({c,k:norm(c.name)})).filter(x=>x.k.length>=3).sort((a,b)=>b.k.length-a.k.length);
    let hit=null;
    for(const x of byName){if(norm(t).includes(x.k)){hit=x.c.id;break}}
    if(!hit){for(const w of words){if(S.memory[w]&&okCat(S.memory[w])){hit=S.memory[w];break}}}
    if(!hit){
      const order=want==='income'?['nomina','negocio','inv','reemb']:['cafe','rest','gas','publico','taxi','super','comer','transp','viv','fact','subs','salud','regalos','compras','ocio','viajes','edu','dep','masc','imp'];
      outer:for(const k of order){const list=KW[k].split(' ');for(const w of words){if(list.includes(w)&&okCat('c_'+k)){hit='c_'+k;break outer}}}
    }
    if(hit){R.cat=hit;R.found.cat=true}
    else R.cat=okCat(want==='income'?'c_otrosi':'c_otros')||null;
  }

  // concepto
  const chars=[];
  if(same){for(let i=0;i<t.length;i++)if(!used[i])chars.push(t[i])}else chars.push(n);
  let parts=chars.join('').replace(/[\s,;:]+/g,' ').trim().split(' ').filter(Boolean);
  parts=parts.filter(x=>!/^[+\-–—]+$/.test(x));
  while(parts.length&&STOP.has(norm(parts[0])))parts.shift();
  while(parts.length&&STOP.has(norm(parts[parts.length-1])))parts.pop();
  R.payee=cap(parts.join(' ').slice(0,60));
  if(R.payee)R.found.payee=true;
  if(!R.acc){const d=defaultAcc();R.acc=d?d.id:null}
  if(R.type==='transfer'&&!R.acc2){const o=activeAccounts().find(a=>a.id!==R.acc);R.acc2=o?o.id:null}
  return R;
}
function defaultAcc(){const l=LS.get('bolsillo.lastacc');return activeAccounts().find(a=>a.id===l)||activeAccounts().find(a=>a.type==='bank')||activeAccounts()[0]||null}
'use strict';
/* ================= DOM helper ================= */
function h(tag,attrs){
  const el=document.createElement(tag);
  if(attrs)for(const k in attrs){
    const v=attrs[k];if(v==null||v===false)continue;
    if(k==='class')el.className=v;
    else if(k==='style'&&typeof v==='object')Object.assign(el.style,v);
    else if(k.slice(0,2)==='on')el.addEventListener(k.slice(2).toLowerCase(),v);
    else if(k==='html')el.innerHTML=v;
    else if(k==='value'){el.value=v}
    else el.setAttribute(k,v===true?'':v);
  }
  for(let i=2;i<arguments.length;i++){
    const kids=[].concat(arguments[i]).flat(Infinity);
    for(const c of kids){if(c==null||c===false)continue;el.append(c.nodeType?c:document.createTextNode(String(c)))}
  }
  return el;
}
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ICONS={
  home:'<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".6"/>',
  chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  gear:'<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff:'<path d="M3 3l18 18M10.6 5.1A9.6 9.6 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.6 6.7C3.9 8.5 2 12 2 12s4 7 10 7c1.6 0 3-.4 4.3-1M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  filter:'<path d="M3 5h18l-7 8v6l-4-2v-4z"/>',
  close:'<path d="M6 6l12 12M18 6L6 18"/>',
  back:'<path d="M15 5l-7 7 7 7"/>',
  chev:'<path d="M9 5l7 7-7 7"/>',
  left:'<path d="M15 5l-7 7 7 7"/>',
  right:'<path d="M9 5l7 7-7 7"/>',
  check:'<path d="M5 12l5 5L20 7"/>',
  trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  camera:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  trend:'<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
  mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  repeat:'<path d="M17 3l3 3-3 3M4 11V9a3 3 0 0 1 3-3h13M7 21l-3-3 3-3M20 13v2a3 3 0 0 1-3 3H4"/>',
  down:'<path d="M12 4v12M6 11l6 6 6-6M5 21h14"/>',
  up:'<path d="M12 20V8M6 13l6-6 6 6M5 3h14"/>',
  arrowup:'<path d="M12 19V5M6 11l6-6 6 6"/>',
  arrowdown:'<path d="M12 5v14M6 13l6 6 6-6"/>',
  more:'<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  swap:'<path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
  wallet:'<path d="M3 7a2 2 0 0 1 2-2h13v4"/><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M16 14h3"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  lock:'<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>'
};
const icon=(n,sz)=>h('span',{class:'ico',html:'<svg viewBox="0 0 24 24" width="'+(sz||22)+'" height="'+(sz||22)+'" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+ICONS[n]+'</svg>'});
const tile=(emoji,color,cls)=>h('span',{class:'tile'+(cls?' '+cls:''),style:{background:hexA(color||'#8A94A6',.16)}},emoji||'❔');
function hexA(hex,a){const m=/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex||'');if(!m)return'rgba(138,148,166,'+a+')';return'rgba('+parseInt(m[1],16)+','+parseInt(m[2],16)+','+parseInt(m[3],16)+','+a+')'}
function lighten(hex,f){const m=/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);if(!m)return hex;const c=[1,2,3].map(i=>Math.round(parseInt(m[i],16)+(255-parseInt(m[i],16))*f));return'#'+c.map(x=>pad2(x.toString(16))).join('')}
const pad2=s=>s.length<2?'0'+s:s;

/* ================= tema ================= */
function applyTheme(){
  const st=S.settings,root=document.documentElement;
  if(st.theme==='auto')root.removeAttribute('data-theme');else root.setAttribute('data-theme',st.theme);
  const dark=st.theme==='dark'||(st.theme==='auto'&&window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches);
  const a=dark?lighten(st.accent,.28):st.accent;
  root.style.setProperty('--accent',a);root.style.setProperty('--accent-soft',hexA(a,.15));
  root.style.setProperty('--accent-ink',dark&&isLight(a)?'#0B1020':'#fff');
  const mt=document.querySelector('meta[name=theme-color]');if(mt)mt.setAttribute('content',dark?'#080D1C':'#EBEFF6');
}
function isLight(hex){const m=/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);if(!m)return false;return(parseInt(m[1],16)*299+parseInt(m[2],16)*587+parseInt(m[3],16)*114)/1000>150}

/* ================= hojas modales ================= */
const OPEN=[];
/* El boton "atras" del movil cierra la hoja abierta en vez de salir de la app.
   Metemos como mucho UNA entrada en el historial mientras haya hojas abiertas:
   marker = esa entrada existe; pending = un history.back() nuestro en camino.
   Mientras hay uno en camino no tocamos el historial, para no adelantarnos a el
   y acabar saliendo de la app. */
let marker=false,pending=0;
const HIST=(()=>{try{return !!(window.history&&history.pushState)}catch(e){return false}})();
function syncHist(){
  if(!HIST||pending>0)return;
  if(OPEN.length&&!marker){try{history.pushState({bolsilloSheet:1},'');marker=true}catch(e){}}
  else if(!OPEN.length&&marker){marker=false;pending++;try{history.back()}catch(e){pending--}}
}
function openSheet(o){
  const back=h('div',{class:'sheet-back',role:'dialog','aria-modal':'true'});
  const body=h('div',{class:'sheet-body'});
  const titleEl=h('div',{class:'sheet-title'},o.title||'');
  let closed=false;
  const api={body,el:back,setTitle:t=>{titleEl.textContent=t},close:()=>close(),refresh,form:!!o.form,_pop:()=>close(true)};
  function refresh(){if(closed)return;const st=body.scrollTop;body.replaceChildren(o.build(api));body.scrollTop=st}
  function close(fromPop){
    if(closed)return;closed=true;const i=OPEN.indexOf(api);if(i>-1)OPEN.splice(i,1);
    back.classList.remove('in');setTimeout(()=>back.remove(),220);
    if(!OPEN.length)document.body.style.overflow='';
    if(!fromPop)syncHist();
    if(o.onClose)o.onClose();
  }
  const left=h('button',{class:'ibtn',onClick:()=>close(),'aria-label':'Cerrar'},icon(o.back?'back':'close',20));
  const actions=h('div',{class:'sheet-actions'},o.actions?o.actions(api):h('span',{style:{width:'42px'}}));
  const grab=h('div',{class:'sheet-grab','aria-hidden':'true'});
  const head=h('div',{class:'sheet-head'},left,titleEl,actions);
  const sheetEl=h('div',{class:'sheet'+(o.full?' full':'')},grab,head,body);
  back.append(sheetEl);
  back.addEventListener('click',e=>{if(e.target===back)close()});
  /* arrastrar hacia abajo para cerrar: desde la cabecera, o desde el contenido si ya esta arriba del todo */
  let y0=0,dy=0,drag=false;
  sheetEl.addEventListener('touchstart',e=>{
    if(e.touches.length!==1||closed)return;
    const t=e.target,inHead=head.contains(t)||t===grab;
    if(!inHead&&!(body.contains(t)&&body.scrollTop<=0))return;
    if(!inHead&&t.closest('input,textarea,select,button,.sw,.chips,.hints,.scrollx'))return;
    y0=e.touches[0].clientY;dy=0;drag=true;sheetEl.style.transition='none';
  },{passive:true});
  sheetEl.addEventListener('touchmove',e=>{
    if(!drag)return;
    dy=e.touches[0].clientY-y0;
    if(dy<=0){dy=0;sheetEl.style.transform='';back.style.opacity='';return}
    sheetEl.style.transform='translateY('+dy+'px)';
    back.style.opacity=String(Math.max(.15,1-dy/480));
  },{passive:true});
  const endDrag=()=>{
    if(!drag)return;drag=false;
    sheetEl.style.transition='';back.style.opacity='';
    if(dy>110){sheetEl.style.transform='';close()}else{sheetEl.style.transform=''}
    dy=0;
  };
  sheetEl.addEventListener('touchend',endDrag,{passive:true});
  sheetEl.addEventListener('touchcancel',endDrag,{passive:true});
  body.replaceChildren(o.build(api));
  document.body.append(back);document.body.style.overflow='hidden';
  OPEN.push(api);requestAnimationFrame(()=>requestAnimationFrame(()=>back.classList.add('in')));
  syncHist();
  if(o.focus){setTimeout(()=>{const el=body.querySelector(o.focus);if(el)el.focus()},260)}
  return api;
}
window.addEventListener('popstate',()=>{
  if(pending>0){pending--;syncHist();return}
  marker=false;
  if(OPEN.length)OPEN[OPEN.length-1]._pop();
  syncHist();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&OPEN.length&&!$('.lock'))OPEN[OPEN.length-1].close()});
function closeAllSheets(){while(OPEN.length)OPEN[OPEN.length-1].close()}
let toastT=null;
function toast(msg,o){
  o=o||{};const old=$('.toast');if(old)old.remove();clearTimeout(toastT);
  const t=h('div',{class:'toast',role:'status'},h('span',null,msg),o.undo?h('button',{onClick:()=>{o.undo();t.remove()}},'Deshacer'):null);
  document.body.append(t);requestAnimationFrame(()=>t.classList.add('in'));
  toastT=setTimeout(()=>{t.classList.remove('in');setTimeout(()=>t.remove(),250)},o.ms||3400);
}
function confirmBox(title,msg,ok,danger){
  return new Promise(res=>{
    let done=false;const fin=v=>{if(!done){done=true;res(v)}};
    openSheet({title,form:true,onClose:()=>fin(false),build:api=>h('div',{class:'pad'},
      h('p',{class:'muted',style:{margin:'4px 0 6px'}},msg),
      h('div',{class:'btnrow'},h('button',{class:'btn ghost',onClick:()=>{fin(false);api.close()}},'Cancelar'),h('button',{class:'btn'+(danger?' danger-fill':''),onClick:()=>{fin(true);api.close()}},ok||'Aceptar')))});
  });
}
function chooseBox(title,options,cur){
  return new Promise(res=>{
    let done=false;
    openSheet({title,form:true,onClose:()=>{if(!done){done=true;res(undefined)}},build:api=>h('div',null,h('div',{class:'grp plain',style:{marginTop:'8px'}},
      options.map(o=>h('button',{class:'row plain',onClick:()=>{done=true;res(o.value);api.close()}},h('div',{class:'grow t'},o.label),o.value===cur?icon('check',20):null))))});
  });
}

/* ================= gráficos SVG ================= */
function gaugeSVG(pct,color){
  const p=Math.max(0,Math.min(1,pct));
  return '<svg viewBox="0 0 200 112" width="100%" aria-hidden="true"><path d="M16 100A84 84 0 0 1 184 100" fill="none" stroke="var(--surface2)" stroke-width="16" stroke-linecap="round" pathLength="100"/><path d="M16 100A84 84 0 0 1 184 100" fill="none" stroke="'+color+'" stroke-width="16" stroke-linecap="round" pathLength="100" stroke-dasharray="'+(p*100).toFixed(2)+' 100" style="transition:stroke-dasharray .5s"/></svg>';
}
function ringSVG(pct,color,size){
  size=size||56;const r=size/2-5,c=2*Math.PI*r,p=Math.max(0,Math.min(1,pct));
  return '<svg viewBox="0 0 '+size+' '+size+'" width="'+size+'" height="'+size+'" style="transform:rotate(-90deg)" aria-hidden="true"><circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" fill="none" stroke="var(--surface2)" stroke-width="5"/><circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" fill="none" stroke="'+color+'" stroke-width="5" stroke-linecap="round" stroke-dasharray="'+(c*p).toFixed(2)+' '+c.toFixed(2)+'"/></svg>';
}
function donutSVG(items,size,thick){
  size=size||190;thick=thick||26;const r=(size-thick)/2,c=2*Math.PI*r,tot=items.reduce((a,i)=>a+i.value,0)||1;let off=0;
  const segs=items.map(i=>{const len=i.value/tot*c;const s='<circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" fill="none" stroke="'+i.color+'" stroke-width="'+thick+'" stroke-dasharray="'+Math.max(0,len-1.5).toFixed(2)+' '+c.toFixed(2)+'" stroke-dashoffset="'+(-off).toFixed(2)+'"/>';off+=len;return s}).join('');
  return '<svg viewBox="0 0 '+size+' '+size+'" width="100%" style="transform:rotate(-90deg)" aria-hidden="true"><circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" fill="none" stroke="var(--surface2)" stroke-width="'+thick+'"/>'+segs+'</svg>';
}
function barsSVG(data){
  const w=340,hg=176,pl=6,pr=6,pt=12,pb=24,max=Math.max(1,...data.flatMap(d=>[d.a,d.b]));
  const bw=(w-pl-pr)/Math.max(1,data.length),barW=Math.max(3,Math.min(14,bw*.34));let g='';
  [0.5,1].forEach(f=>{const y=pt+(hg-pt-pb)*(1-f);g+='<line x1="'+pl+'" x2="'+(w-pr)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)" stroke-dasharray="3 4"/>'});
  data.forEach((d,i)=>{
    const cx=pl+bw*i+bw/2,ha=(d.a/max)*(hg-pt-pb),hb=(d.b/max)*(hg-pt-pb);
    g+='<rect x="'+(cx-barW-1)+'" y="'+(hg-pb-ha)+'" width="'+barW+'" height="'+Math.max(ha,d.a>0?2:0)+'" rx="3" style="fill:var(--pos)"/>';
    g+='<rect x="'+(cx+1)+'" y="'+(hg-pb-hb)+'" width="'+barW+'" height="'+Math.max(hb,d.b>0?2:0)+'" rx="3" style="fill:var(--neg)"/>';
    if(data.length<=12||i%2===0)g+='<text x="'+cx+'" y="'+(hg-7)+'" text-anchor="middle" font-size="10" style="fill:var(--muted)">'+esc(d.label)+'</text>';
  });
  return '<svg viewBox="0 0 '+w+' '+hg+'" width="100%" role="img" aria-label="Ingresos y gastos por mes">'+g+'</svg>';
}
function lineSVG(vals,labels,o){
  o=o||{};const w=340,hg=o.h||150,pl=8,pr=8,pt=14,pb=o.labels===false?8:22;
  if(!vals.length)return'';
  let mn=Math.min(...vals,o.zero?0:Infinity),mx=Math.max(...vals,o.zero?0:-Infinity);if(mx-mn<1e-9){mx+=1;mn-=1}
  const X=i=>pl+(vals.length===1?(w-pl-pr)/2:i*(w-pl-pr)/(vals.length-1)),Y=v=>pt+(hg-pt-pb)*(1-(v-mn)/(mx-mn));
  const pts=vals.map((v,i)=>X(i).toFixed(1)+','+Y(v).toFixed(1));
  const col=o.color||'var(--accent)';let g='';
  if(mn<0&&mx>0)g+='<line x1="'+pl+'" x2="'+(w-pr)+'" y1="'+Y(0)+'" y2="'+Y(0)+'" stroke="var(--line)" stroke-dasharray="3 4"/>';
  if(o.area!==false)g+='<path d="M'+X(0).toFixed(1)+','+(hg-pb)+' L'+pts.join(' L')+' L'+X(vals.length-1).toFixed(1)+','+(hg-pb)+'Z" style="fill:'+col+';opacity:.12"/>';
  if(o.dashFrom!=null&&o.dashFrom>0&&o.dashFrom<vals.length){
    g+='<polyline points="'+pts.slice(0,o.dashFrom+1).join(' ')+'" fill="none" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" style="stroke:'+col+'"/>';
    g+='<polyline points="'+pts.slice(o.dashFrom).join(' ')+'" fill="none" stroke-width="2.4" stroke-dasharray="5 5" stroke-linecap="round" style="stroke:'+col+';opacity:.7"/>';
  }else g+='<polyline points="'+pts.join(' ')+'" fill="none" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" style="stroke:'+col+'"/>';
  const li=o.dashFrom!=null?o.dashFrom:vals.length-1;
  g+='<circle cx="'+X(li).toFixed(1)+'" cy="'+Y(vals[li]).toFixed(1)+'" r="4" style="fill:'+col+'"/>';
  if(labels&&o.labels!==false){const step=Math.ceil(labels.length/6);labels.forEach((l,i)=>{if(i%step===0||i===labels.length-1)g+='<text x="'+X(i).toFixed(1)+'" y="'+(hg-6)+'" text-anchor="'+(i===0?'start':i===labels.length-1?'end':'middle')+'" font-size="10" style="fill:var(--muted)">'+esc(l)+'</text>'});}
  return '<svg viewBox="0 0 '+w+' '+hg+'" width="100%" aria-hidden="true">'+g+'</svg>';
}
function sparkSVG(vals,color){return lineSVG(vals,null,{h:64,labels:false,color:color})}
function confetti(){
  if(matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const cv=h('canvas',{class:'confetti'});document.body.append(cv);const ctx=cv.getContext('2d');
  if(!ctx){cv.remove();return}
  const W=cv.width=innerWidth*devicePixelRatio,H=cv.height=innerHeight*devicePixelRatio;
  const cols=['#2748D9','#0F8A5C','#E0B400','#E5484D','#C43B8A','#13A3B4'];
  const P=Array.from({length:110},()=>({x:W/2+(Math.random()-.5)*W*.3,y:H*.55,vx:(Math.random()-.5)*16*devicePixelRatio,vy:(-Math.random()*17-6)*devicePixelRatio,s:(4+Math.random()*6)*devicePixelRatio,c:cols[Math.floor(Math.random()*cols.length)],r:Math.random()*6}));
  let f=0;(function tick(){ctx.clearRect(0,0,W,H);P.forEach(p=>{p.vy+=.5*devicePixelRatio;p.x+=p.vx;p.y+=p.vy;p.r+=.2;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.r);ctx.fillStyle=p.c;ctx.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);ctx.restore()});if(++f<110)requestAnimationFrame(tick);else cv.remove()})();
}

/* ================= piezas de formulario y selectores ================= */
function switchEl(on,cb){const s=h('button',{class:'sw'+(on?' on':''),role:'switch','aria-checked':on?'true':'false',onClick:()=>{on=!on;s.classList.toggle('on',on);s.setAttribute('aria-checked',on?'true':'false');cb(on)}});return s}
function selectEl(opts,val,cb,cls){
  const s=h('select',{class:cls||null},opts.map(o=>h('option',{value:o.value},o.label)));
  s.value=val;s.addEventListener('change',()=>cb(s.value));return s;
}
function segEl(opts,val,cb){
  const box=h('div',{class:'seg'});
  const draw=()=>{box.replaceChildren(...opts.map(o=>h('button',{class:o.value===val?'on':'',onClick:()=>{val=o.value;draw();cb(val)}},o.label)))};
  draw();return box;
}
const EMOJIS='💵 💶 💳 🏦 🐖 💰 💼 🧑‍💻 📈 📉 🪙 🧾 🛒 🥑 🍎 🍞 🥩 🍽️ 🍕 🍔 🍣 ☕ 🍺 🍷 🚌 🚇 🚕 🚗 ⛽ 🚲 🛵 ✈️ 🏠 🔑 💡 💧 🔥 📶 📱 💻 🎮 🎬 🎧 🎵 📺 📚 🎓 🏋️ ⚽ 🎾 🏊 💊 🩺 🦷 👓 🐾 🐶 🐱 🎁 🎉 🎂 👶 🧸 👕 👟 👜 💄 ✂️ 🧴 🧹 🔧 🛠️ 🌴 🏖️ 🏨 ⛰️ 🚀 ⭐ ❤️ 🔒 🎯 🏆 🧳 🏡 🚘 🛡️ 🌱 ♻️ 🕊️ 🍼 🎒 📦 🧠 ⚡'.split(' ');
function pickEmoji(cb){
  openSheet({title:'Icono',form:true,build:api=>{
    const inp=h('input',{placeholder:'Escribe o pega un emoji',style:{width:'100%',border:0,background:'transparent',fontSize:'22px',outline:0}});
    inp.addEventListener('input',()=>{const v=[...inp.value.trim()].slice(0,2).join('');if(v){cb(v);api.close()}});
    return h('div',null,h('div',{class:'grp',style:{padding:'10px 14px'}},inp),
      h('div',{class:'emojigrid'},EMOJIS.map(e=>h('button',{onClick:()=>{cb(e);api.close()}},e))));
  }});
}
function colorSwatches(val,cb){
  const box=h('div',{class:'swatches'});
  const draw=()=>{box.replaceChildren(...PALETTE.map(c=>h('button',{class:c===val?'on':'',style:{background:c},'aria-label':c,onClick:()=>{val=c;draw();cb(c)}})),
    h('input',{type:'color',value:val||'#2748D9','aria-label':'Color personalizado',style:{width:'32px',height:'32px',border:0,padding:0,background:'none'},onInput:e=>{val=e.target.value;cb(val)}}))};
  draw();return box;
}
function pickCategory(o){
  // o:{type,value,onPick,allowNone}
  openSheet({title:'Categoría',form:true,build:api=>{
    const wrap=h('div');let openRoot=null;
    const draw=()=>{
      const roots=S.categories.filter(c=>c.type===o.type&&!c.parent);
      const kids=openRoot?childrenOf(openRoot):[];
      wrap.replaceChildren(
        h('div',{class:'catgrid'},roots.map(c=>h('button',{class:(c.id===o.value||(openRoot===c.id))?'on':'',onClick:()=>{
          if(childrenOf(c.id).length){openRoot=openRoot===c.id?null:c.id;draw()}else{o.onPick(c.id);api.close()}}},tile(c.icon,c.color),c.name,childrenOf(c.id).length?h('span',{class:'muted small'},'▾ '+childrenOf(c.id).length):null))),
        openRoot?h('div',null,h('div',{class:'sectitle'},h('h2',null,cat(openRoot).name)),
          h('div',{class:'grp plain'},h('button',{class:'row plain',onClick:()=>{o.onPick(openRoot);api.close()}},tile(cat(openRoot).icon,cat(openRoot).color),h('div',{class:'grow t'},'Usar «'+cat(openRoot).name+'»'),o.value===openRoot?icon('check',20):null),
            kids.map(c=>h('button',{class:'row',onClick:()=>{o.onPick(c.id);api.close()}},tile(c.icon,c.color),h('div',{class:'grow t'},c.name),o.value===c.id?icon('check',20):null)))):null,
        h('div',{class:'grp',style:{marginTop:'8px'}},h('button',{class:'row',onClick:()=>{openCategoryForm(null,{type:o.type},nc=>{o.onPick(nc.id);api.close()})}},h('span',{class:'tile',style:{background:'var(--accent-soft)',color:'var(--accent)'}},'＋'),h('div',{class:'grow t',style:{color:'var(--accent)'}},'Nueva categoría'))));
    };
    draw();return wrap;
  }});
}
function pickAccount(o){
  openSheet({title:o.title||'Cuenta',form:true,build:api=>{
    const list=activeAccounts().filter(a=>(!o.exclude||a.id!==o.exclude)&&(!o.onlyTypes||o.onlyTypes.includes(a.type)));
    if(!list.length)return emptyBox('Sin cuentas','No tienes ninguna cuenta que encaje aquí.',h('button',{class:'btn',onClick:()=>{api.close();openAccountForm(null)}},'Nueva cuenta'));
    return h('div',{class:'grp',style:{marginTop:'8px'}},
      list.map(a=>h('button',{class:'row',onClick:()=>{o.onPick(a.id);api.close()}},tile(a.icon,a.color),h('div',{class:'grow'},h('div',{class:'t'},a.name),h('div',{class:'s'},ACC_TYPES[a.type].n+' · '+a.currency)),o.value===a.id?icon('check',20):null)));
  }});
}
function fieldRow(label,ctrl,cls){return h('div',{class:'field'+(cls?' '+cls:'')},h('label',null,label),ctrl)}
function tapRow(label,valueNode,onclick){return h('button',{class:'field',style:{width:'100%',textAlign:'left'},onClick:onclick},h('span',{class:'lab'},label),h('span',{class:'val'},valueNode,icon('chev',16)))}
function resizeImage(file,max,q){
  return new Promise((res,rej)=>{
    const url=URL.createObjectURL(file),img=new Image();
    img.onload=()=>{const k=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);c.toBlob(b=>b?res(b):rej(new Error('blob')),'image/jpeg',q)};
    img.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('img'))};img.src=url;
  });
}
/* fotos de recibos en IndexedDB */
const Photos={
  db:null,
  open(){return new Promise((res,rej)=>{if(this.db)return res(this.db);let r;try{r=indexedDB.open('bolsillo-photos',1)}catch(e){return rej(e)}r.onupgradeneeded=()=>r.result.createObjectStore('p');r.onsuccess=()=>{this.db=r.result;res(this.db)};r.onerror=()=>rej(r.error)})},
  async put(id,blob){const db=await this.open();return new Promise((res,rej)=>{const tx=db.transaction('p','readwrite');tx.objectStore('p').put(blob,id);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})},
  async get(id){const db=await this.open();return new Promise((res,rej)=>{const r=db.transaction('p').objectStore('p').get(id);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})},
  async del(id){try{const db=await this.open();db.transaction('p','readwrite').objectStore('p').delete(id)}catch(e){}},
  ok(){return typeof indexedDB!=='undefined'}
};
'use strict';
/* ================= Formulario de transacción / pago recurrente ================= */
function memoryKey(payee){const w=norm(payee).split(/[^a-z0-9]+/).filter(Boolean)[0];return w&&w.length>=4?w:null}
function learn(payee,catId){const k=memoryKey(payee);if(k&&catId)S.memory[k]=catId}
function openTxForm(orig,defs,mode){
  defs=defs||{};mode=mode||'tx';
  const isEdit=!!orig&&(mode==='rec'||S.tx.some(x=>x.id===orig.id));
  const src=orig?clone(orig):{};const da=defaultAcc();
  const sn=v=>v!=null&&v!==''?String(v).replace('.',','):'';
  const F={
    id:src.id||uid(),
    type:src.type||defs.type||'expense',
    amount:sn(src.amount!=null?src.amount:defs.amount),
    cur:src.cur||defs.cur||(da?da.currency:main()),
    acc:src.acc||defs.acc||(da&&da.id)||'',
    acc2:src.acc2||defs.acc2||'',
    amount2:sn(src.amount2),
    cat:src.cat!=null?src.cat:(defs.cat||''),
    payee:src.payee||defs.payee||'',
    tags:(src.tags||defs.tags||[]).join(', '),
    note:src.note||defs.note||'',
    date:(mode==='rec'?src.start:src.date)||defs.date||todayISO(),
    pending:!!src.pending,excluded:!!src.excluded,
    photo:!!src.photo,newPhoto:null,removePhoto:false,
    freq:mode==='rec'?(src.freq||defs.freq||'monthly'):(defs.freq||''),
    every:src.every||defs.every||1,auto:src.auto!==false,end:src.end||''
  };
  if(F.type!=='transfer'&&F.cat&&cat(F.cat).type!==F.type&&cat(F.cat).id)F.cat='';
  if((F.type==='transfer'||F.type==='invest')&&!F.acc2){
    const pool=(F.type==='invest'?activeAccounts().filter(a=>a.type==='invest'):activeAccounts()).filter(a=>a.id!==F.acc);
    F.acc2=pool[0]?pool[0].id:'';
  }
  F.split=mode==='tx'&&Array.isArray(src.splits)&&src.splits.length>0;
  F.splits=F.split?src.splits.map(s=>({cat:s.cat,amt:s.amount!=null?String(s.amount).replace('.',','):''})):[];
  const root=h('div');
  const titles={tx:isEdit?'Editar movimiento':'Nuevo movimiento',rec:isEdit?'Editar pago recurrente':'Nuevo pago recurrente'};
  let amtEl=null,recalcSplits=()=>{};

  function draw(){
    const isT=F.type==='transfer'||F.type==='invest';
    const A=acc(F.acc),B=acc(F.acc2);
    const types=[{value:'expense',label:'Gasto'},{value:'income',label:'Ingreso'},{value:'transfer',label:'Transferencia'},{value:'invest',label:'Inversión'}];
    amtEl=h('input',{type:'text',inputmode:'decimal',placeholder:'0,00',value:F.amount,'aria-label':'Importe',disabled:!isT&&F.split,onInput:e=>{F.amount=e.target.value;recalcSplits()}});
    const curSel=isT?h('span',{class:'muted',style:{fontWeight:'600'}},csym(A?A.currency:main())):selectEl(currencies().map(c=>({value:c,label:c})),F.cur,v=>{F.cur=v});
    const nodes=[
      segEl(types,F.type,v=>{
        if(v==='invest'&&!activeAccounts().some(a=>a.type==='invest')){toast('Crea antes una cuenta de tipo Inversión');return}
        F.type=v;if(v!=='transfer'&&v!=='invest'&&F.cat&&cat(F.cat).type!==v)F.cat='';
        if(v==='transfer'||v==='invest'){
          const pool=(v==='invest'?activeAccounts().filter(a=>a.type==='invest'):activeAccounts()).filter(a=>a.id!==F.acc);
          if(!F.acc2||!pool.some(a=>a.id===F.acc2))F.acc2=pool[0]?pool[0].id:'';
        }
        draw();
      }),
      h('div',{class:'bigamt'},amtEl,curSel)
    ];
    const g1=h('div',{class:'grp'});
    const dlP=h('datalist',{id:'dl-payees'},allPayees().map(p=>h('option',{value:p})));
    const pIn=h('input',{type:'text',placeholder:isT?(F.type==='invest'?'Ej. Aportación mensual':'Ej. Ahorro del mes'):(F.type==='income'?'Ej. Nómina':'Ej. Mercadona'),value:F.payee,list:'dl-payees',
      onInput:e=>{F.payee=e.target.value},
      onChange:e=>{const k=memoryKey(e.target.value);if(!isT&&!F.cat&&k&&S.memory[k]&&cat(S.memory[k]).type===F.type){F.cat=S.memory[k];draw()}}});
    g1.append(fieldRow('Concepto',pIn,'left'),dlP);
    if(isT){
      g1.append(tapRow('Desde',h('span',null,A?A.icon+' '+A.name:'Elegir'),()=>pickAccount({title:'Cuenta de origen',value:F.acc,exclude:F.acc2,onlyTypes:F.type==='invest'?ACCT_GROUPS.filter(g=>g.key!=='invest'&&g.key!=='loan').flatMap(g=>g.types):null,onPick:id=>{F.acc=id;draw()}})));
      g1.append(tapRow(F.type==='invest'?'Inversión':'Hacia',h('span',null,B?B.icon+' '+B.name:'Elegir'),()=>pickAccount({title:'Cuenta de destino',value:F.acc2,exclude:F.acc,onlyTypes:F.type==='invest'?['invest']:null,onPick:id=>{F.acc2=id;draw()}})));
      if(A&&B&&A.currency!==B.currency){
        const sug=parseNum(F.amount)>0?r2(conv(parseNum(F.amount),A.currency,B.currency)):'';
        g1.append(fieldRow('Recibe ('+B.currency+')',h('input',{type:'text',inputmode:'decimal',placeholder:sug!==''?String(sug).replace('.',','):'0,00',value:F.amount2,onInput:e=>{F.amount2=e.target.value}})));
      }
    }else{
      if(!F.split){
        const c=cat(F.cat);
        g1.append(tapRow('Categoría',F.cat?h('span',null,c.icon+' '+catFull(F.cat)):h('span',{class:'muted'},'Elegir'),()=>pickCategory({type:F.type,value:F.cat,onPick:id=>{F.cat=id;draw()}})));
      }
      g1.append(tapRow('Cuenta',h('span',null,A?A.icon+' '+A.name:'Elegir'),()=>pickAccount({value:F.acc,onPick:id=>{F.acc=id;const a=acc(id);if(a)F.cur=a.currency;draw()}})));
    }
    const dateIn=h('input',{type:'date',value:F.date,onChange:e=>{if(e.target.value)F.date=e.target.value}});
    g1.append(fieldRow(mode==='rec'?'Primer pago':'Fecha',dateIn));
    nodes.push(g1);
    if(!isT&&mode==='tx'){
      nodes.push(h('div',{class:'field',style:{padding:'2px 22px 10px'}},h('span',{style:{flex:1,fontSize:'14px'}},'Dividir en varias categorías'),
        switchEl(F.split,v=>{F.split=v;if(v&&!F.splits.length)F.splits=[{cat:F.cat||'',amt:F.amount||''},{cat:'',amt:''}];draw()})));
      if(F.split){
        const grpS=h('div',{class:'grp'});
        const remEl=h('p',{class:'muted small',style:{margin:'6px 22px 0'}});
        const recalc=()=>{
          const sum=F.splits.reduce((s,x)=>s+(parseNum(x.amt)||0),0);
          F.amount=sum?String(r2(sum)).replace('.',','):'';
          if(amtEl)amtEl.value=F.amount;
          remEl.textContent='Total dividido: '+money(r2(sum),undefined,{force:true})+' en '+F.splits.length+' categorías';
          return sum;
        };
        recalcSplits=recalc;
        F.splits.forEach((s,i)=>{
          const c=s.cat?cat(s.cat):null;
          const amtI=h('input',{type:'text',inputmode:'decimal',placeholder:'0,00',value:s.amt||'',style:{width:'92px',textAlign:'right'},onInput:e=>{s.amt=e.target.value;recalc()}});
          grpS.append(h('div',{class:'row plain',style:{gap:'8px'}},
            h('button',{class:'link',style:{flex:1,textAlign:'left'},onClick:()=>pickCategory({type:F.type,value:s.cat,onPick:id=>{s.cat=id;draw()}})},c?c.icon+' '+catFull(s.cat):'Elegir categoría'),
            amtI,
            F.splits.length>2?h('button',{class:'ibtn','aria-label':'Quitar división',onClick:()=>{F.splits.splice(i,1);draw()}},icon('close',16)):null));
        });
        grpS.append(h('button',{class:'row plain',onClick:()=>{F.splits.push({cat:'',amt:''});draw()}},h('span',{class:'grow t',style:{color:'var(--accent)'}},'+ Añadir división')));
        nodes.push(grpS,remEl);
        recalc();
      }
    }
    if(mode==='tx'&&!isEdit){nodes.push(h('div',{class:'chips'},[['Hoy',todayISO()],['Ayer',addDays(todayISO(),-1)],['Anteayer',addDays(todayISO(),-2)]].map(p=>h('button',{class:'chip'+(F.date===p[1]?' on':''),onClick:()=>{F.date=p[1];draw()}},p[0]))))}
    const g2=h('div',{class:'grp'});
    if(!isT){
      g2.append(fieldRow('Etiquetas',h('input',{type:'text',placeholder:'viaje, trabajo',value:F.tags,onInput:e=>{F.tags=e.target.value}})));
    }
    g2.append(fieldRow('Nota',h('input',{type:'text',placeholder:'Opcional',value:F.note,onInput:e=>{F.note=e.target.value}})));
    nodes.push(g2);
    const g3=h('div',{class:'grp'});
    if(mode==='tx'){
      g3.append(h('div',{class:'field'},h('span',{class:'grow',style:{flex:1}},'Pendiente'),switchEl(F.pending,v=>{F.pending=v})));
      g3.append(h('div',{class:'field'},h('span',{style:{flex:1}},'Excluir de informes'),switchEl(F.excluded,v=>{F.excluded=v})));
    }
    if((mode==='rec'||!isEdit)&&!(F.split&&mode==='tx')){
      g3.append(fieldRow('Repetir',selectEl([{value:'',label:'No'}].concat(Object.keys(FREQ).map(k=>({value:k,label:FREQ[k]}))),F.freq,v=>{F.freq=v;F.every=1;draw()})));
      if(F.freq&&mode==='rec'){
        g3.append(h('div',{class:'field'},h('span',{style:{flex:1}},'Registrar automáticamente'),switchEl(F.auto,v=>{F.auto=v})));
        g3.append(fieldRow('Hasta',h('input',{type:'date',value:F.end,onChange:e=>{F.end=e.target.value}})));
      }
    }
    if(g3.children.length)nodes.push(g3);
    if(mode==='rec'&&F.freq==='monthly'&&F.every>1)nodes.push(h('p',{class:'muted small',style:{margin:'-6px 22px 14px'}},'Se repetirá cada '+F.every+' meses ('+(F.every===3?'trimestral':F.every===6?'semestral':F.every===12?'anual':F.every+' meses')+'), según el patrón detectado. Para cambiarlo a otro ritmo, elige una frecuencia distinta arriba.'));
    if(mode==='tx'&&Photos.ok()&&!isT){
      const g4=h('div',{class:'grp'});
      const prev=h('div');
      const showPrev=async()=>{
        prev.replaceChildren();
        try{
          let blob=F.newPhoto;if(!blob&&F.photo&&!F.removePhoto)blob=await Photos.get(F.id);
          if(blob){const url=URL.createObjectURL(blob);prev.append(h('img',{class:'photo',src:url,alt:'Recibo',style:{maxHeight:'220px'}}))}
        }catch(e){}
      };
      const file=h('input',{type:'file',accept:'image/*',style:{display:'none'},onChange:async e=>{
        const f=e.target.files&&e.target.files[0];if(!f)return;
        try{F.newPhoto=await resizeImage(f,1000,.7);F.removePhoto=false;F.photo=true;draw()}catch(er){toast('No se pudo leer la imagen')}
      }});
      const has=(F.photo&&!F.removePhoto)||F.newPhoto;
      g4.append(h('div',{class:'field',style:{gap:'10px'}},file,h('button',{class:'link',style:{flex:1,textAlign:'left'},onClick:()=>file.click()},has?'Cambiar recibo':'Añadir foto del recibo'),
        has?h('button',{class:'link',style:{color:'var(--neg)'},onClick:()=>{F.newPhoto=null;F.removePhoto=true;draw()}},'Quitar'):null));
      g4.append(prev);nodes.push(g4);showPrev();
    }
    const actions=h('div',{class:'pad'},h('button',{class:'btn',onClick:doSave},'Guardar'),
      isEdit?h('div',{class:'btnrow'},mode==='tx'?h('button',{class:'btn ghost',onClick:()=>{closeThen(()=>openTxForm(null,Object.assign({},src,{date:todayISO(),photo:false,tags:src.tags||[]}),'tx'))}},'Duplicar'):null,h('button',{class:'btn danger',onClick:doDelete},'Eliminar')):null);
    nodes.push(actions);
    root.replaceChildren(...nodes);
  }
  let sheet=null;
  const closeThen=fn=>{sheet.close();setTimeout(fn,240)};
  async function doDelete(){
    if(mode==='rec'){
      if(!(await confirmBox('Eliminar pago recurrente','Se dejará de repetir. Los movimientos ya registrados se conservan.','Eliminar',true)))return;
      S.recurring=S.recurring.filter(r=>r.id!==orig.id);commit();sheet.close();toast('Pago recurrente eliminado');return;
    }
    const t=S.tx.find(x=>x.id===F.id);S.tx=S.tx.filter(x=>x.id!==F.id);commit();sheet.close();
    toast('Movimiento eliminado',{undo:()=>{if(t){S.tx.push(t);commit()}}});
  }
  function doSave(){
    const amt=parseNum(F.amount);
    if(!(amt>0)){toast('Introduce un importe mayor que 0');if(amtEl)amtEl.focus();return}
    const A=acc(F.acc);if(!A){toast('Elige una cuenta');return}
    const isT=F.type==='transfer'||F.type==='invest';
    if(isT&&(!F.acc2||F.acc2===F.acc||!acc(F.acc2))){toast('Elige dos cuentas distintas');return}
    if(F.type==='invest'&&(!acc(F.acc2)||acc(F.acc2).type!=='invest')){toast('Elige una cuenta de inversión de destino');return}
    const storedType=isT?'transfer':F.type;
    const tags=F.tags.split(/[,;\s]+/).map(x=>x.replace(/^#/,'').trim().toLowerCase()).filter(Boolean);
    const isSplit=!isT&&mode==='tx'&&F.split&&Array.isArray(F.splits)&&F.splits.filter(s=>parseNum(s.amt)>0).length>=2;
    if(F.split&&!isT&&mode==='tx'&&!isSplit){toast('Añade al menos 2 divisiones con importe');if(amtEl)amtEl.focus();return}
    const catId=(isT||isSplit)?'':(F.cat||(F.type==='income'?'c_otrosi':'c_otros'));
    const cur=isT?A.currency:F.cur;
    let amount2=null;
    if(isT){const B=acc(F.acc2);if(B&&B.currency!==A.currency){const v=parseNum(F.amount2);amount2=v>0?r2(v):r2(conv(amt,A.currency,B.currency))}}
    const splitsFinal=isSplit?F.splits.filter(s=>parseNum(s.amt)>0).map(s=>({cat:(s.cat&&cat(s.cat).type===F.type)?s.cat:(F.type==='income'?'c_otrosi':'c_otros'),amount:r2(parseNum(s.amt))})):null;
    if(mode==='rec'){
      const r={id:isEdit?orig.id:uid(),type:storedType,amount:r2(amt),cur,acc:F.acc,acc2:isT?F.acc2:'',amount2:isT?amount2:null,cat:catId,payee:F.payee.trim(),tags,note:F.note.trim(),start:F.date,freq:F.freq||'monthly',every:F.every||1,auto:F.auto,end:F.end||'',n:isEdit?(orig.n||0):0,paused:isEdit?!!orig.paused:false};
      if(isEdit)S.recurring=S.recurring.map(x=>x.id===r.id?r:x);else S.recurring.push(r);
      learn(r.payee,r.cat);LS.set('bolsillo.lastacc',F.acc);commit();sheet.close();toast(isEdit?'Cambios guardados':'Pago recurrente creado');return;
    }
    const prev=isEdit?S.tx.find(x=>x.id===F.id):null;
    const t={id:F.id,type:storedType,amount:r2(amt),cur,acc:F.acc,acc2:isT?F.acc2:'',amount2,cat:catId,payee:F.payee.trim(),tags,note:F.note.trim(),date:F.date,pending:F.pending,excluded:F.excluded,splits:splitsFinal||undefined,photo:!!((F.photo&&!F.removePhoto)||F.newPhoto),ts:prev?prev.ts:Date.now(),recId:prev?prev.recId:undefined};
    if(isEdit)S.tx=S.tx.map(x=>x.id===t.id?t:x);else S.tx.push(t);
    if(F.newPhoto)Photos.put(F.id,F.newPhoto).catch(()=>toast('No se pudo guardar la foto'));
    if(F.removePhoto)Photos.del(F.id);
    if(!isEdit&&F.freq&&!isSplit){const r={id:uid(),type:storedType,amount:r2(amt),cur,acc:F.acc,acc2:isT?F.acc2:'',amount2:isT?amount2:null,cat:catId,payee:t.payee,tags,note:t.note,start:F.date,freq:F.freq,every:1,auto:true,end:'',n:1};S.recurring.push(r);t.recId=r.id}
    learn(t.payee,t.cat);LS.set('bolsillo.lastacc',F.acc);
    commit();sheet.close();toast(isEdit?'Cambios guardados':'Movimiento guardado');
  }
  sheet=openSheet({title:titles[mode],full:true,form:true,build:()=>{draw();return root}});
  if(!isEdit&&amtEl&&!F.amount)setTimeout(()=>amtEl&&amtEl.focus(),300);
  return sheet;
}

/* ================= Entrada rápida ================= */
const QE_HINTS=['Café 2,50 ayer','Nómina 1.800 el viernes pasado','Supermercado 63,20 con tarjeta','Alquiler 750 cada mes','Transferencia 200 de Cuenta principal a Efectivo','Cena 45 #amigos el 12/09'];
function openQuickEntry(prefill){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  let ov={},adv=LS.get('bolsillo.qeadv')==='1',recog=null,listening=false;
  openSheet({title:'Entrada rápida',form:true,focus:'textarea',build:api=>{
    const ta=h('textarea',{rows:2,placeholder:QE_HINTS[Math.floor(Math.random()*QE_HINTS.length)],'aria-label':'Describe el movimiento',value:prefill||''});
    const chipsBox=h('div',{class:'chipsrow'});
    const saveBtn=h('button',{class:'btn',onClick:doSave},'Guardar');
    const formBtn=h('button',{class:'btn ghost',onClick:()=>{const P=cur();api.close();setTimeout(()=>openTxForm(null,{type:P.type,amount:P.amount,cur:P.cur,acc:P.acc,acc2:P.acc2,cat:P.cat,payee:P.payee,tags:P.tags,date:P.date,freq:P.recur?P.recur.freq:''}),250)}},'Abrir formulario');
    const micBtn=SR?h('button',{class:'ibtn','aria-label':'Dictar',onClick:toggleMic},icon('mic',20)):null;
    let R=parseQuick(ta.value);
    const cur=()=>Object.assign({},R,ov);
    function toggleMic(){
      try{
        if(listening&&recog){recog.stop();return}
        recog=new SR();recog.lang='es-ES';recog.interimResults=true;recog.continuous=false;
        recog.onresult=e=>{ta.value=[].map.call(e.results,r=>r[0].transcript).join(' ');update()};
        recog.onend=()=>{listening=false;micBtn.classList.remove('on')};
        recog.onerror=()=>{listening=false;micBtn.classList.remove('on');toast('No se pudo usar el micrófono aquí')};
        recog.start();listening=true;micBtn.classList.add('on');
      }catch(e){toast('El dictado no está disponible en este navegador')}
    }
    function chip(label,value,cls,onclick){
      const el=h(onclick?'button':'div',{class:'qc'+(cls?' '+cls:''),onClick:onclick||null},adv?h('small',null,label):null,h('span',null,value));return el;
    }
    function update(){
      R=parseQuick(ta.value);if(!ta.value.trim())ov={};
      const P=cur(),A=acc(P.acc),B=acc(P.acc2),C=cat(P.cat);
      const tl={expense:'Gasto',income:'Ingreso',transfer:'Transferencia'};
      const list=[];
      list.push(chip('Tipo',tl[P.type],'ok',()=>{const order=['expense','income','transfer'];ov.type=order[(order.indexOf(P.type)+1)%3];if(ov.type!=='transfer'){ov.cat=undefined;delete ov.cat}update()}));
      const cy=P.cur||(A?A.currency:main());
      list.push(P.amount>0?chip('Importe',money(P.amount,cy,{force:true}),'ok'):chip('Importe','Falta el importe','miss'));
      list.push(chip('Fecha',fmtDay(P.date)+(P.date!==todayISO()?' · '+fmtShort(P.date):''),R.found.date?'ok':'',()=>pickDate(P.date,d=>{ov.date=d;update()})));
      if(P.type!=='transfer'){
        const cc=P.cat&&cat(P.cat).type===P.type?C:null;
        list.push(chip('Categoría',cc?cc.icon+' '+catFull(P.cat):'Elegir categoría',R.found.cat||ov.cat?'ok':'miss',()=>pickCategory({type:P.type,value:P.cat,onPick:id=>{ov.cat=id;update()}})));
        list.push(chip('Cuenta',A?A.icon+' '+A.name:'Elegir cuenta',R.found.acc||ov.acc?'ok':'',()=>pickAccount({value:P.acc,onPick:id=>{ov.acc=id;update()}})));
      }else{
        list.push(chip('Origen',A?A.icon+' '+A.name:'Elegir',R.found.acc||ov.acc?'ok':'miss',()=>pickAccount({title:'Cuenta de origen',value:P.acc,exclude:P.acc2,onPick:id=>{ov.acc=id;update()}})));
        list.push(chip('Destino',B?B.icon+' '+B.name:'Elegir',P.acc2?'ok':'miss',()=>pickAccount({title:'Cuenta de destino',value:P.acc2,exclude:P.acc,onPick:id=>{ov.acc2=id;update()}})));
      }
      if(P.payee)list.push(chip('Concepto',P.payee,'ok'));
      if(P.tags&&P.tags.length)list.push(chip('Etiquetas',P.tags.map(x=>'#'+x).join(' '),'ok'));
      if(P.recur)list.push(chip('Repetir','🔁 '+FREQ[P.recur.freq],'ok'));
      chipsBox.replaceChildren(...list);
      saveBtn.disabled=!(P.amount>0)||(P.type==='transfer'&&(!P.acc||!P.acc2||P.acc===P.acc2));
      if(saveBtn.disabled)saveBtn.setAttribute('disabled','');else saveBtn.removeAttribute('disabled');
      saveBtn.classList.toggle('dis',saveBtn.disabled);
    }
    function doSave(){
      const P=cur();if(!(P.amount>0))return;
      const A=acc(P.acc);if(!A){toast('Elige una cuenta');return}
      const isT=P.type==='transfer';
      const catId=isT?'':((P.cat&&cat(P.cat).type===P.type)?P.cat:(P.type==='income'?'c_otrosi':'c_otros'));
      const curr=isT?A.currency:(P.cur||A.currency);
      const t={id:uid(),type:P.type,amount:r2(P.amount),cur:curr,acc:P.acc,acc2:isT?P.acc2:'',amount2:null,cat:catId,payee:P.payee||'',tags:P.tags||[],note:'',date:P.date,pending:false,excluded:false,ts:Date.now()};
      if(isT){const Bc=acc(P.acc2);if(Bc&&Bc.currency!==A.currency)t.amount2=r2(conv(t.amount,A.currency,Bc.currency))}
      if(P.recur&&!isT){const r={id:uid(),type:t.type,amount:t.amount,cur:t.cur,acc:t.acc,cat:t.cat,payee:t.payee,tags:t.tags,note:'',start:t.date,freq:P.recur.freq,every:1,auto:true,end:'',n:1};S.recurring.push(r);t.recId=r.id}
      S.tx.push(t);learn(t.payee,t.cat);LS.set('bolsillo.lastacc',t.acc);commit();api.close();
      toast((isT?'Transferencia':t.type==='income'?'Ingreso':'Gasto')+' guardado: '+money(t.amount,t.cur,{force:true}),{undo:()=>{S.tx=S.tx.filter(x=>x.id!==t.id);commit()}});
    }
    ta.addEventListener('input',update);
    ta.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();if(!saveBtn.disabled)doSave()}});
    const hints=h('div',{class:'hints'},QE_HINTS.slice(0,4).map(x=>h('button',{onClick:()=>{ta.value=x;ov={};update();ta.focus()}},x)));
    update();
    return h('div',{class:'qe'},h('div',{class:'inp'},ta,micBtn),chipsBox,hints,
      h('div',{class:'field',style:{padding:'8px 2px'}},h('span',{style:{flex:1,fontSize:'14px'}},'Mostrar qué se ha reconocido'),switchEl(adv,v=>{adv=v;LS.set('bolsillo.qeadv',v?'1':'0');update()})),
      h('div',{class:'btnrow'},formBtn,saveBtn));
  }});
}
function pickDate(val,cb){
  openSheet({title:'Fecha',form:true,build:api=>{
    const inp=h('input',{type:'date',value:val,style:{fontSize:'18px',width:'100%',border:0,background:'transparent',outline:0},onChange:e=>{if(e.target.value){cb(e.target.value);api.close()}}});
    return h('div',null,h('div',{class:'grp',style:{padding:'14px'}},inp),h('div',{class:'chips'},[['Hoy',todayISO()],['Ayer',addDays(todayISO(),-1)],['Anteayer',addDays(todayISO(),-2)],['Mañana',addDays(todayISO(),1)]].map(p=>h('button',{class:'chip',onClick:()=>{cb(p[1]);api.close()}},p[0]))));
  }});
}

/* ================= Cuentas ================= */
function openAccountForm(a,onSaved){
  const isEdit=!!a;
  const F=a?clone(a):{id:uid(),name:'',type:'bank',currency:main(),initial:0,icon:'🏦',color:PALETTE[(S.accounts.length*3+1)%PALETTE.length],closing:'',due:'',limit:'',rate:'',term:'',payDay:''};
  let initStr=F.initial?String((F.type==='card'||F.type==='loan')?Math.abs(F.initial):F.initial).replace('.',','):'';
  const root=h('div');
  const holdHints={},holdTimers={};
  function scheduleHoldLookup(hd,hintEl,delay){
    clearTimeout(holdTimers[hd.id]);
    const sym=hd.symbol,type=hd.assetType||'crypto';
    const canAuto=S.settings.priceApi&&S.settings.priceApi.url&&S.settings.priceApi.key;
    if(!sym||!canAuto){hintEl.textContent='';return}
    hintEl.textContent='Buscando…';
    holdTimers[hd.id]=setTimeout(async()=>{
      const r=await fetchPrice(sym,type,F.currency);
      if(hd.symbol!==sym||(hd.assetType||'crypto')!==type)return; // el usuario cambió el símbolo/tipo mientras tanto
      holdHints[hd.id]=r.ok?(r.name||''):'';
      hintEl.textContent=holdHints[hd.id];
    },delay==null?600:delay);
  }
  function draw(){
    const isDebt=F.type==='card'||F.type==='loan';
    const g=h('div',{class:'grp'});
    g.append(fieldRow('Nombre',h('input',{type:'text',placeholder:'Ej. Revolut',value:F.name,onInput:e=>{F.name=e.target.value}})));
    g.append(fieldRow('Tipo',selectEl(Object.keys(ACC_TYPES).map(k=>({value:k,label:ACC_TYPES[k].n})),F.type,v=>{F.type=v;if(!isEdit||F.icon===ACC_TYPES[a.type].i)F.icon=ACC_TYPES[v].i;draw()})));
    g.append(fieldRow('Divisa',selectEl(currencies().map(c=>({value:c,label:c})),F.currency,v=>{F.currency=v})));
    g.append(fieldRow(isDebt?(F.type==='loan'?'Cantidad pendiente':'Deuda inicial'):'Saldo inicial',h('input',{type:'text',inputmode:'decimal',placeholder:'0,00',value:initStr,onInput:e=>{initStr=e.target.value}})));
    const g2=h('div',{class:'grp'});
    g2.append(tapRow('Icono',h('span',{style:{fontSize:'20px'}},F.icon),()=>pickEmoji(e=>{F.icon=e;draw()})));
    g2.append(colorSwatches(F.color,c=>{F.color=c}));
    const nodes=[g,g2];
    if(F.type==='card'){
      const g3=h('div',{class:'grp'});
      g3.append(fieldRow('Día de cierre',h('input',{type:'number',min:1,max:31,placeholder:'Ej. 25',value:F.closing,onInput:e=>{F.closing=e.target.value}})));
      g3.append(fieldRow('Día de pago',h('input',{type:'number',min:1,max:31,placeholder:'Ej. 5',value:F.due,onInput:e=>{F.due=e.target.value}})));
      g3.append(fieldRow('Límite',h('input',{type:'text',inputmode:'decimal',placeholder:'Opcional',value:F.limit,onInput:e=>{F.limit=e.target.value}})));
      nodes.push(g3);
    }
    if(F.type==='loan'){
      const g3=h('div',{class:'grp'});
      g3.append(fieldRow('Interés anual (%)',h('input',{type:'text',inputmode:'decimal',placeholder:'Ej. 6,5',value:F.rate,onInput:e=>{F.rate=e.target.value;draw()}})));
      g3.append(fieldRow('Plazo (meses)',h('input',{type:'number',min:1,placeholder:'Ej. 60',value:F.term,onInput:e=>{F.term=e.target.value;draw()}})));
      g3.append(fieldRow('Día de pago',h('input',{type:'number',min:1,max:31,placeholder:'Ej. 5',value:F.payDay,onInput:e=>{F.payDay=e.target.value}})));
      nodes.push(g3);
      const pay=loanPayment(parseNum(initStr)||0,F.rate,F.term);
      if(pay>0)nodes.push(h('p',{class:'muted small',style:{margin:'-6px 22px 14px'}},'Cuota estimada (sistema francés): '+money(r2(pay),F.currency,{force:true})+' al mes.'));
    }
    if(F.type==='invest'){
      const g4=h('div',{class:'grp'});
      g4.append(fieldRow('Avisarme cada (días)',numInput(parseInt(F.checkDays,10)||30,1,365,v=>{F.checkDays=v})));
      nodes.push(g4,h('p',{class:'muted small',style:{margin:'-6px 22px 14px'}},'Cada este número de días, si tienes activos con símbolo, Bolsillo intentará consultar el precio solo al abrir la app. Si no puede, te avisará en Resumen para que lo hagas a mano.'));
      if(!Array.isArray(F.holdings))F.holdings=[];
      const g5=h('div',{class:'grp'});
      F.holdings.forEach((hd,i)=>{
        const hintEl=h('div',{class:'muted small',style:{padding:'0 2px',minHeight:'15px'}},holdHints[hd.id]||'');
        const symI=h('input',{type:'text',placeholder:'Símbolo: BTC, AAPL, VOO…',value:hd.symbol||'',style:{flex:1,minWidth:0,textTransform:'uppercase'},onInput:e=>{hd.symbol=e.target.value.toUpperCase();scheduleHoldLookup(hd,hintEl)}});
        const typeSel=selectEl([{value:'crypto',label:'Cripto'},{value:'stock',label:'Acción/ETF'}],hd.assetType||'crypto',v=>{hd.assetType=v;scheduleHoldLookup(hd,hintEl,0)});
        typeSel.style.flex='1';
        const qtyI=h('input',{type:'text',inputmode:'decimal',placeholder:'Unidades',value:hd.qty!=null?String(hd.qty).replace('.',','):'',style:{width:'84px',textAlign:'right'},onInput:e=>{hd.qty=e.target.value}});
        g5.append(h('div',{class:'row plain',style:{flexDirection:'column',alignItems:'stretch',gap:'6px'}},
          h('div',{style:{display:'flex',gap:'8px',alignItems:'center'}},symI,
            h('button',{class:'ibtn','aria-label':'Quitar activo',onClick:()=>{F.holdings.splice(i,1);draw()}},icon('close',16))),
          h('div',{style:{display:'flex',gap:'8px'}},typeSel,qtyI),
          hintEl));
        if(hd.symbol&&holdHints[hd.id]===undefined)scheduleHoldLookup(hd,hintEl,0);
      });
      g5.append(h('button',{class:'row plain',onClick:()=>{F.holdings.push({id:uid(),symbol:'',assetType:'crypto',qty:''});draw()}},h('span',{class:'grow t',style:{color:'var(--accent)'}},'+ Añadir activo')));
      nodes.push(g5,h('p',{class:'muted small',style:{margin:'-6px 22px 14px'}},'Opcional: añade cada activo que tengas en esta cuenta (símbolo + unidades). Con tu propia API de precios (Ajustes → Inversiones) podrás sumar el valor de todos automáticamente en vez de escribirlo a mano.'));
    }
    if(isEdit)nodes.push(h('div',{class:'grp'},h('div',{class:'field'},h('span',{style:{flex:1}},'Archivar cuenta'),switchEl(!!F.archived,v=>{F.archived=v}))));
    nodes.push(h('div',{class:'pad'},h('button',{class:'btn',onClick:doSave},'Guardar'),isEdit?h('div',{class:'btnrow'},h('button',{class:'btn danger',onClick:doDelete},'Eliminar cuenta')):null));
    root.replaceChildren(...nodes);
  }
  let sheet;
  async function doDelete(){
    const n=S.tx.filter(t=>t.acc===a.id||t.acc2===a.id).length;
    if(!(await confirmBox('Eliminar cuenta',n?'Se eliminarán también sus '+n+' movimientos (incluidas transferencias). Esta acción no se puede deshacer.':'Se eliminará la cuenta.','Eliminar',true)))return;
    S.accounts=S.accounts.filter(x=>x.id!==a.id);S.tx=S.tx.filter(t=>t.acc!==a.id&&t.acc2!==a.id);S.recurring=S.recurring.filter(r=>r.acc!==a.id);
    commit();sheet.close();closeAllSheets();toast('Cuenta eliminada');
  }
  function doSave(){
    if(!F.name.trim()){toast('Pon un nombre a la cuenta');return}
    const isDebt=F.type==='card'||F.type==='loan';
    const raw=initStr.trim()===''?0:parseNum(initStr);if(isNaN(raw)){toast('El saldo inicial no es válido');return}
    F.name=F.name.trim();F.initial=r2(isDebt?-Math.abs(raw):raw);
    if(F.type==='card'){F.limit=F.limit===''?'':(parseNum(F.limit)||'')}
    if(F.type==='loan'){F.rate=F.rate===''?'':(parseNum(F.rate)||0);F.term=F.term===''?'':(parseInt(F.term,10)||'');F.payDay=F.payDay===''?'':(parseInt(F.payDay,10)||'')}
    if(F.type==='invest'){
      F.checkDays=parseInt(F.checkDays,10)||30;if(!F.lastCheck)F.lastCheck=todayISO();
      F.holdings=(F.holdings||[]).map(hd=>{
        const symbol=(hd.symbol||'').trim().toUpperCase();if(!symbol)return null;
        const q=parseNum(hd.qty);
        return{id:hd.id||uid(),symbol,assetType:hd.assetType==='stock'?'stock':'crypto',qty:q>0?q:1};
      }).filter(Boolean);
    }
    if(isEdit)S.accounts=S.accounts.map(x=>x.id===F.id?F:x);else S.accounts.push(F);
    commit();sheet.close();if(onSaved)onSaved(F);toast(isEdit?'Cuenta actualizada':'Cuenta creada');
  }
  sheet=openSheet({title:isEdit?'Editar cuenta':'Nueva cuenta',full:true,form:true,build:()=>{draw();return root}});
}

/* ================= Categorías ================= */
function openCategoryForm(c,defs,onSaved){
  defs=defs||{};const isEdit=!!c;
  const F=c?clone(c):{id:'c_'+uid(),name:'',icon:'📦',color:PALETTE[S.categories.length%PALETTE.length],type:defs.type||'expense',parent:defs.parent||null};
  const root=h('div');let sheet;
  function draw(){
    const g=h('div',{class:'grp'});
    g.append(fieldRow('Nombre',h('input',{type:'text',placeholder:'Ej. Gimnasio',value:F.name,onInput:e=>{F.name=e.target.value}})));
    if(!isEdit)g.append(fieldRow('Tipo',selectEl([{value:'expense',label:'Gasto'},{value:'income',label:'Ingreso'}],F.type,v=>{F.type=v;F.parent=null;draw()})));
    const roots=S.categories.filter(x=>x.type===F.type&&!x.parent&&x.id!==F.id&&!(isEdit&&childrenOf(F.id).length));
    g.append(fieldRow('Subcategoría de',selectEl([{value:'',label:'— Ninguna —'}].concat(roots.map(r=>({value:r.id,label:r.name}))),F.parent||'',v=>{F.parent=v||null})));
    const g2=h('div',{class:'grp'});
    g2.append(tapRow('Icono',h('span',{style:{fontSize:'20px'}},F.icon),()=>pickEmoji(e=>{F.icon=e;draw()})));
    g2.append(colorSwatches(F.color,x=>{F.color=x}));
    const nodes=[g,g2,h('div',{class:'pad'},h('button',{class:'btn',onClick:doSave},'Guardar'),
      isEdit?h('div',{class:'btnrow'},h('button',{class:'btn ghost',onClick:doMerge},'Fusionar con…'),h('button',{class:'btn danger',onClick:doDelete},'Eliminar')):null)];
    root.replaceChildren(...nodes);
  }
  function options(){return S.categories.filter(x=>x.type===F.type&&x.id!==F.id&&x.parent!==F.id).map(x=>({value:x.id,label:(x.parent?'   ':'')+x.icon+' '+catFull(x.id)}))}
  function moveAll(to){
    const ids=[F.id].concat(childrenOf(F.id).map(x=>x.id));
    S.tx.forEach(t=>{if(ids.includes(t.cat))t.cat=to;if(Array.isArray(t.splits))t.splits.forEach(sp=>{if(ids.includes(sp.cat))sp.cat=to})});S.recurring.forEach(r=>{if(ids.includes(r.cat))r.cat=to});
    S.budgets.forEach(b=>{if(b.cats)b.cats=[...new Set(b.cats.map(x=>ids.includes(x)?to:x))]});
    Object.keys(S.memory).forEach(k=>{if(ids.includes(S.memory[k]))S.memory[k]=to});
    S.categories=S.categories.filter(x=>!ids.includes(x.id));
  }
  async function doMerge(){
    const to=await chooseBox('Fusionar en…',options());if(!to)return;
    if(!(await confirmBox('Fusionar categorías','Todos los movimientos de «'+F.name+'» pasarán a «'+catFull(to)+'» y esta categoría desaparecerá.','Fusionar')))return;
    moveAll(to);commit();sheet.close();toast('Categorías fusionadas');
  }
  async function doDelete(){
    const to=await chooseBox('Mover sus movimientos a…',options());if(!to)return;
    if(!(await confirmBox('Eliminar categoría','Los movimientos de «'+F.name+'» pasarán a «'+catFull(to)+'».','Eliminar',true)))return;
    moveAll(to);commit();sheet.close();toast('Categoría eliminada');
  }
  function doSave(){
    F.name=F.name.trim();if(!F.name){toast('Pon un nombre a la categoría');return}
    if(F.parent){const p=cat(F.parent);F.type=p.type}
    if(isEdit)S.categories=S.categories.map(x=>x.id===F.id?F:x);else S.categories.push(F);
    commit();sheet.close();if(onSaved)onSaved(F);
  }
  sheet=openSheet({title:isEdit?'Editar categoría':'Nueva categoría',full:true,form:true,build:()=>{draw();return root}});
}

/* ================= Presupuestos ================= */
function openBudgetForm(b){
  const isEdit=!!b;
  const F=b?clone(b):{id:uid(),kind:'category',name:'',icon:'',amount:'',period:'cycle',cats:[],carry:false,created:todayISO()};
  let amtStr=F.amount?String(F.amount).replace('.',','):'';
  const root=h('div');let sheet;
  function draw(){
    const nodes=[segEl([{value:'category',label:'Por categorías'},{value:'total',label:'Total'}],F.kind,v=>{F.kind=v;draw()})];
    const g=h('div',{class:'grp'});
    g.append(fieldRow('Nombre',h('input',{type:'text',placeholder:F.kind==='total'?'Presupuesto total':'Ej. Supermercado',value:F.name,onInput:e=>{F.name=e.target.value}})));
    g.append(fieldRow('Importe ('+csym(main())+')',h('input',{type:'text',inputmode:'decimal',placeholder:'0,00',value:amtStr,onInput:e=>{amtStr=e.target.value}})));
    g.append(fieldRow('Periodo',selectEl([{value:'cycle',label:'Mi ciclo de cobro'},{value:'week',label:'Semanal'},{value:'year',label:'Anual'}],F.period,v=>{F.period=v})));
    g.append(h('div',{class:'field'},h('span',{style:{flex:1}},'Arrastrar lo no gastado'),switchEl(F.carry,v=>{F.carry=v})));
    nodes.push(g);
    if(F.kind==='category'){
      const roots=S.categories.filter(c=>c.type==='expense'&&!c.parent);
      const rows=[];
      const toggle=id=>{const i=F.cats.indexOf(id);if(i>-1)F.cats.splice(i,1);else F.cats.push(id);draw()};
      for(const r of roots){
        rows.push(h('button',{class:'row',onClick:()=>toggle(r.id)},tile(r.icon,r.color),h('div',{class:'grow t'},r.name),h('span',{class:'sel'+(F.cats.includes(r.id)?' on':'')},F.cats.includes(r.id)?icon('check',14):null)));
        for(const k of childrenOf(r.id))rows.push(h('button',{class:'row',style:{paddingLeft:'38px'},onClick:()=>toggle(k.id)},tile(k.icon,k.color,'sm'),h('div',{class:'grow t'},k.name),h('span',{class:'sel'+(F.cats.includes(k.id)?' on':'')},F.cats.includes(k.id)?icon('check',14):null)));
      }
      nodes.push(h('div',{class:'sectitle'},h('h2',null,'Categorías incluidas')));
      nodes.push(h('div',{class:'grp'},rows));
      nodes.push(h('p',{class:'muted small',style:{margin:'-8px 22px 14px'}},'Elegir una categoría incluye sus subcategorías.'));
    }
    nodes.push(h('div',{class:'pad'},h('button',{class:'btn',onClick:doSave},'Guardar'),isEdit?h('div',{class:'btnrow'},h('button',{class:'btn danger',onClick:doDelete},'Eliminar presupuesto')):null));
    root.replaceChildren(...nodes);
  }
  async function doDelete(){
    if(!(await confirmBox('Eliminar presupuesto','Tus movimientos no se tocan.','Eliminar',true)))return;
    S.budgets=S.budgets.filter(x=>x.id!==b.id);S.budgetMoves=S.budgetMoves.filter(m=>m.from!==b.id&&m.to!==b.id);commit();sheet.close();closeAllSheets();toast('Presupuesto eliminado');
  }
  function doSave(){
    const amt=parseNum(amtStr);if(!(amt>0)){toast('Introduce un importe mayor que 0');return}
    if(F.kind==='category'&&!F.cats.length){toast('Elige al menos una categoría');return}
    F.amount=r2(amt);
    if(!F.name.trim())F.name=F.kind==='total'?'Presupuesto total':(cat(F.cats[0]).name+(F.cats.length>1?' y otras':''));else F.name=F.name.trim();
    F.icon=F.kind==='total'?'🎯':cat(F.cats[0]).icon;
    if(F.kind==='total')F.cats=[];
    if(isEdit)S.budgets=S.budgets.map(x=>x.id===F.id?F:x);else S.budgets.push(F);
    commit();sheet.close();toast(isEdit?'Presupuesto actualizado':'Presupuesto creado');
  }
  sheet=openSheet({title:isEdit?'Editar presupuesto':'Nuevo presupuesto',full:true,form:true,build:()=>{draw();return root}});
}
function openMoveBudget(from){
  const list=S.budgets;if(list.length<2){toast('Necesitas al menos dos presupuestos');return}
  let f=from?from.id:list[0].id,t=list.find(x=>x.id!==f).id,amt='';
  openSheet({title:'Mover dinero',form:true,build:api=>{
    const root=h('div');
    const draw=()=>{
      const F=list.find(x=>x.id===f),T=list.find(x=>x.id===t);
      const infoF=budgetInfo(F);
      root.replaceChildren(
        h('div',{class:'grp'},
          fieldRow('De',selectEl(list.map(x=>({value:x.id,label:x.icon+' '+x.name})),f,v=>{f=v;if(t===f)t=list.find(x=>x.id!==f).id;draw()})),
          fieldRow('A',selectEl(list.filter(x=>x.id!==f).map(x=>({value:x.id,label:x.icon+' '+x.name})),t,v=>{t=v})),
          fieldRow('Importe',h('input',{type:'text',inputmode:'decimal',placeholder:'0,00',value:amt,onInput:e=>{amt=e.target.value}}))),
        h('p',{class:'muted small',style:{margin:'0 22px 12px'}},'Disponible en «'+F.name+'»: '+money(Math.max(0,infoF.remaining))+'. El cambio solo afecta al periodo actual.'),
        h('div',{class:'pad'},h('button',{class:'btn',onClick:()=>{
          const v=parseNum(amt);if(!(v>0)){toast('Introduce un importe');return}
          const p=periodFor(todayISO(),F.period||'cycle');
          S.budgetMoves.push({id:uid(),from:f,to:t,amount:r2(v),period:p.start,ptype:F.period||'cycle'});
          commit();api.close();toast('Dinero movido de «'+F.name+'» a «'+T.name+'»');
        }},'Mover')));
    };
    draw();return root;
  }});
}
function openReadjust(){
  const cb=S.budgets.filter(b=>b.kind==='category');if(!cb.length){toast('No hay presupuestos por categorías');return}
  const rows=cb.map(b=>{
    const type=b.period||'cycle';let p=periodFor(todayISO(),type),sum=0,k=0;
    for(let i=0;i<3;i++){p=shiftPeriod(p,-1);sum+=spentFor(b,p);k++}
    return{b,avg:sum/k};
  });
  const totalOld=cb.reduce((s,b)=>s+b.amount,0),totalAvg=rows.reduce((s,r)=>s+r.avg,0);
  const scale=totalAvg>0?totalOld/totalAvg:1;
  const prop=rows.map(r=>({b:r.b,now:r.b.amount,next:Math.max(5,Math.round(r.avg*scale/5)*5)}));
  openSheet({title:'Reajustar presupuestos',form:true,build:api=>h('div',null,
    h('p',{class:'muted small',style:{margin:'4px 22px 10px'}},'Reparto propuesto según tu gasto medio de los 3 últimos periodos, manteniendo el total en '+money(totalOld,undefined,{force:true})+'.'),
    h('div',{class:'grp plain'},prop.map(x=>h('div',{class:'row plain'},h('div',{class:'grow t'},x.b.icon+' '+x.b.name),h('span',{class:'muted num'},money(x.now,undefined,{force:true})),h('span',{class:'muted'},' → '),h('b',{class:'num'},money(x.next,undefined,{force:true}))))),
    h('div',{class:'pad'},h('button',{class:'btn',onClick:()=>{prop.forEach(x=>{x.b.amount=x.next});commit();api.close();toast('Presupuestos reajustados')}},'Aplicar reparto')))});
}

/* ================= Objetivos ================= */
function openGoalForm(g){
  const isEdit=!!g;
  const F=g?clone(g):{id:uid(),name:'',icon:'🎯',color:'#2748D9',target:'',cur:main(),date:'',contribs:[],created:todayISO()};
  let tStr=F.target?String(F.target).replace('.',','):'',iStr='';
  const root=h('div');let sheet;
  function draw(){
    const gp=h('div',{class:'grp'});
    gp.append(fieldRow('Nombre',h('input',{type:'text',placeholder:'Ej. Viaje a Japón',value:F.name,onInput:e=>{F.name=e.target.value}})));
    gp.append(fieldRow('Meta',h('input',{type:'text',inputmode:'decimal',placeholder:'0,00',value:tStr,onInput:e=>{tStr=e.target.value}})));
    gp.append(fieldRow('Divisa',selectEl(currencies().map(c=>({value:c,label:c})),F.cur,v=>{F.cur=v})));
    gp.append(fieldRow('Fecha objetivo',h('input',{type:'date',value:F.date,onChange:e=>{F.date=e.target.value}})));
    if(!isEdit)gp.append(fieldRow('Ya ahorrado',h('input',{type:'text',inputmode:'decimal',placeholder:'0,00',value:iStr,onInput:e=>{iStr=e.target.value}})));
    const g2=h('div',{class:'grp'});
    g2.append(tapRow('Icono',h('span',{style:{fontSize:'20px'}},F.icon),()=>pickEmoji(e=>{F.icon=e;draw()})));
    g2.append(colorSwatches(F.color,c=>{F.color=c}));
    root.replaceChildren(gp,g2,h('div',{class:'pad'},h('button',{class:'btn',onClick:doSave},'Guardar'),isEdit?h('div',{class:'btnrow'},h('button',{class:'btn danger',onClick:doDelete},'Eliminar objetivo')):null));
  }
  async function doDelete(){if(!(await confirmBox('Eliminar objetivo','Se perderá su historial de aportaciones.','Eliminar',true)))return;S.goals=S.goals.filter(x=>x.id!==g.id);commit();sheet.close();closeAllSheets();toast('Objetivo eliminado')}
  function doSave(){
    const tg=parseNum(tStr);if(!F.name.trim()){toast('Pon un nombre al objetivo');return}if(!(tg>0)){toast('Introduce la meta a ahorrar');return}
    F.name=F.name.trim();F.target=r2(tg);
    if(!isEdit){const i=parseNum(iStr);if(i>0)F.contribs.push({id:uid(),date:todayISO(),amount:r2(i),note:'Ahorro inicial'})}
    if(isEdit)S.goals=S.goals.map(x=>x.id===F.id?F:x);else S.goals.push(F);
    commit();sheet.close();toast(isEdit?'Objetivo actualizado':'Objetivo creado');
  }
  sheet=openSheet({title:isEdit?'Editar objetivo':'Nuevo objetivo',full:true,form:true,build:()=>{draw();return root}});
}
function openContribution(g,sign){
  let amt='',note='',date=todayISO();
  openSheet({title:sign>0?'Aportar al objetivo':'Retirar del objetivo',form:true,focus:'input[inputmode]',build:api=>h('div',null,
    h('div',{class:'grp'},
      fieldRow('Importe ('+csym(g.cur)+')',h('input',{type:'text',inputmode:'decimal',placeholder:'0,00',onInput:e=>{amt=e.target.value}})),
      fieldRow('Fecha',h('input',{type:'date',value:date,onChange:e=>{if(e.target.value)date=e.target.value}})),
      fieldRow('Nota',h('input',{type:'text',placeholder:'Opcional',onInput:e=>{note=e.target.value}}))),
    h('div',{class:'pad'},h('button',{class:'btn',onClick:()=>{
      const v=parseNum(amt);if(!(v>0)){toast('Introduce un importe mayor que 0');return}
      const before=goalInfo(g).done;
      g.contribs.push({id:uid(),date,amount:r2(v)*sign,note:note.trim()});
      const after=goalInfo(g);commit();api.close();
      if(!before&&after.done&&!g.celebrated){g.celebrated=true;save();confetti();toast('🎉 ¡Objetivo «'+g.name+'» conseguido!',{ms:5000})}
      else toast(sign>0?'Aportación guardada':'Retirada guardada');
    }},'Guardar')))});
}
'use strict';
/* ================= navegación y render ================= */
const UI={tab:'resumen',off:0,bud:'presu',budOff:0,rep:'flow',range:'6m',from:'',to:'',repInit:false,repAccs:[],repType:'expense',q:'',
  filt:{types:[],accs:[],cats:[],pending:false,tag:'',from:'',to:''},sel:new Set(),selMode:false,limit:150,
  movView:'list',calMonth:todayISO().slice(0,8)+'01',calDay:''};
const TABS=[{id:'resumen',l:'Resumen',i:'home'},{id:'movs',l:'Movimientos',i:'list'},{id:'add'},{id:'presu',l:'Presupuestos',i:'target'},{id:'informes',l:'Informes',i:'chart'}];
function renderTabs(){
  const nav=$('#tabs');
  nav.replaceChildren(...TABS.map(t=>t.id==='add'
    ?h('button',{class:'tab add','aria-label':'Nueva entrada rápida',onClick:()=>openQuickEntry()},h('span',{class:'plus'},icon('plus',26)))
    :h('button',{class:'tab'+(UI.tab===t.id?' on':''),'aria-current':UI.tab===t.id?'page':null,onClick:()=>go(t.id)},icon(t.i,23),t.l)));
}
function openInvestContribute(accId){
  if(!activeAccounts().some(a=>a.type==='invest')){toast('Crea antes una cuenta de tipo Inversión');openAccountForm(null);return}
  openTxForm(null,{type:'invest',acc2:accId||''});
}
function go(tab){if(UI.tab!==tab){UI.tab=tab;UI.selMode=false;UI.sel.clear();renderView();window.scrollTo(0,0)}else window.scrollTo({top:0,behavior:'smooth'})}
const VIEWS={};
function renderView(){
  const v=$('#view'),y=window.scrollY;
  let node;try{node=VIEWS[UI.tab]()}catch(e){console.error(e);node=h('div',{class:'empty'},h('b',null,'Algo ha fallado'),String(e.message||e))}
  v.replaceChildren(node);renderTabs();window.scrollTo(0,y);
}
function renderAll(){applyTheme();renderView();for(const s of OPEN.slice())if(!s.form)s.refresh()}
function header(title,sub,tools){return h('div',{class:'top'},h('div',null,h('h1',null,title),sub?h('div',{class:'sub'},sub):null),h('div',{class:'tools'},tools))}
function secTitle(t,linkText,onclick){return h('div',{class:'sectitle'},h('h2',null,t),linkText?h('button',{class:'link',onClick:onclick},linkText):null)}
function groupHead(label,amt){return h('div',{class:'subhead'},h('span',null,label),amt!=null?h('span',{class:'num'},amt):null)}
const ACCT_GROUPS=[{key:'cash',label:'Efectivo',types:['cash']},{key:'bank',label:'Cuentas',types:['bank','savings','card','other']},{key:'invest',label:'Inversión',types:['invest']},{key:'loan',label:'Préstamos',types:['loan']}];
function acctGroups(list){
  const bal=balances();
  return ACCT_GROUPS.map(g=>{
    const items=list.filter(a=>g.types.includes(a.type));
    const sub=items.reduce((s,a)=>s+conv(bal[a.id]||0,a.currency,main()),0);
    return{key:g.key,label:g.label,items,sub};
  }).filter(g=>g.items.length);
}
/* ---------- revisión periódica de inversiones ---------- */
function investCheckInfo(a){
  const days=parseInt(a.checkDays,10)||30;
  const last=a.lastCheck||null;
  const since=last?diffDays(last,todayISO()):Infinity;
  return{days,last,since,stale:since>=days};
}
function staleInvestments(){return activeAccounts().filter(a=>a.type==='invest'&&investCheckInfo(a).stale)}
async function autoCheckInvestments(){
  if(!S||S.settings.demo)return;
  const targets=activeAccounts().filter(a=>a.type==='invest'&&(a.holdings||[]).length&&investCheckInfo(a).stale);
  if(!targets.length||!S.settings.priceApi||!S.settings.priceApi.url||!S.settings.priceApi.key)return;
  let changed=false,updated=0;
  for(const a of targets){
    let r;try{r=await fetchHoldingsValue(a)}catch(e){continue}
    if(!r.ok)continue; // deja la cuenta como pendiente si falla algún activo; el usuario la revisa a mano
    const curBal=balances()[a.id]||0,diff=r2(r.total-curBal);
    a.lastCheck=todayISO();changed=true;updated++;
    if(diff!==0){
      const gain=diff>0;
      S.tx.push({id:uid(),type:gain?'income':'expense',amount:Math.abs(diff),cur:a.currency,acc:a.id,acc2:'',amount2:null,cat:gain?'c_inv':'c_perdinv',payee:'',tags:[],note:'Ajuste de valor (automático)',date:todayISO(),pending:false,excluded:false,photo:false,ts:Date.now()});
    }
  }
  if(changed){commit();if(updated===1)toast('Inversión actualizada automáticamente');else toast(updated+' cuentas de inversión actualizadas automáticamente')}
}
async function fetchPrice(symbol,assetType,curHint,opts){
  const api=S.settings.priceApi;
  if(!api||!api.url||!api.key)return{ok:false,error:'API de precios no configurada'};
  if(!symbol)return{ok:false,error:'Falta el símbolo'};
  const cur=(curHint||main()||'EUR');
  let url=api.url.replace(/\/+$/,'')+'/api/price?symbol='+encodeURIComponent(symbol)+'&type='+encodeURIComponent(assetType||'crypto')+'&currency='+encodeURIComponent(cur.toLowerCase());
  if(opts&&opts.div)url+='&div=1';
  let r,data;
  try{
    r=await fetch(url,{headers:{'x-api-key':api.key}});
    data=await r.json();
  }catch(e){
    return{ok:false,error:'No se pudo conectar con la API (red bloqueada o URL incorrecta)'};
  }
  if(!r.ok||!data||data.ok===false)return{ok:false,error:(data&&data.error)||('Error del servidor ('+r.status+')')};
  if(!(data.price>0))return{ok:false,error:'La API no devolvió un precio válido'};
  // Las acciones/ETFs devuelven el precio en su divisa nativa (ignoran ?currency=), no en `cur`.
  // Convertimos siempre con la divisa que diga la API, nunca asumimos que ya coincide.
  return{ok:true,price:data.price,currency:(data.currency||cur).toUpperCase(),name:data.name||null,dividends:Array.isArray(data.dividends)?data.dividends:null,asOf:data.asOf||new Date().toISOString()};
}
// A partir del historial de dividendos (más reciente primero), estima cada cuántos meses
// se reparte («every», usado con freq:'monthly' en pagos recurrentes: every=3 → trimestral,
// every=6 → semestral, every=12 → anual) y calcula la próxima fecha futura de pago.
function inferDividendPlan(dividends){
  if(!Array.isArray(dividends)||dividends.length<1)return null;
  const sorted=[...dividends].sort((a,b)=>a.date<b.date?1:-1); // más reciente primero
  const last=sorted[0];
  let every=12; // sin suficiente historial, asumimos anual (la opción más conservadora)
  if(sorted.length>=2){
    const gaps=[];
    for(let i=0;i<Math.min(sorted.length-1,4);i++)gaps.push(diffDays(sorted[i+1].date,sorted[i].date));
    const avg=gaps.reduce((s,x)=>s+x,0)/gaps.length;
    every=avg<=45?1:avg<=135?3:avg<=270?6:12;
  }
  const label={1:'mensual',3:'trimestral',6:'semestral',12:'anual'}[every];
  let next=addMonths(last.date,every),today=todayISO();
  while(next<=today)next=addMonths(next,every);
  return{last,every,label,next,perShare:last.amount};
}
async function fetchHoldingsValue(a){
  const list=a.holdings||[];
  if(!list.length)return{ok:false,error:'Esta cuenta no tiene activos con símbolo'};
  const details=await Promise.all(list.map(async hd=>{
    const r=await fetchPrice(hd.symbol,hd.assetType||'crypto',a.currency);
    if(!r.ok)return{holding:hd,ok:false,error:r.error};
    const qty=parseNum(hd.qty)||0;
    const valueAcc=r2(conv(r.price,r.currency,a.currency)*qty);
    return{holding:hd,ok:true,price:r.price,priceCur:r.currency,name:r.name,qty,valueAcc,asOf:r.asOf};
  }));
  const okAll=details.every(x=>x.ok);
  const total=r2(details.reduce((s,x)=>s+(x.ok?x.valueAcc:0),0));
  return{ok:okAll,total,details,asOf:new Date().toISOString()};
}
function openPriceApiSettings(parentApi){
  const cur=S.settings.priceApi||{};
  let url=cur.url||'',key=cur.key||'',testMsg='',testing=false;
  openSheet({title:'API de precios',form:true,build:api=>{
    return h('div',null,
      h('p',{class:'muted small',style:{margin:'4px 22px 12px'}},'Conecta tu propia API (la que te he preparado para desplegar en Vercel) para consultar precios de cripto y acciones al actualizar tus inversiones. Es opcional: sin ella, sigues pudiendo escribir el valor a mano.'),
      h('div',{class:'grp'},
        fieldRow('URL',h('input',{type:'text',placeholder:'https://tu-proyecto.vercel.app',value:url,onInput:e=>{url=e.target.value}})),
        fieldRow('Clave (BOLSILLO_API_KEY)',h('input',{type:'text',placeholder:'La que pusiste en Vercel',value:key,onInput:e=>{key=e.target.value}}))),
      h('div',{class:'pad'},h('button',{class:'btn ghost',disabled:testing,onClick:async()=>{
        if(!url.trim()||!key.trim()){testMsg='Rellena URL y clave primero';api.refresh();return}
        testing=true;testMsg='Probando…';api.refresh();
        const prevApi=S.settings.priceApi;S.settings.priceApi={url:url.trim().replace(/\/+$/,''),key:key.trim()};
        const r=await fetchPrice('BTC','crypto');
        S.settings.priceApi=prevApi;testing=false;
        testMsg=r.ok?('Conexión OK · BTC = '+num(r.price)+' '+main()):('Fallo: '+r.error);
        api.refresh();
      }},testing?'Probando…':'Probar conexión')),
      testMsg?h('p',{class:'muted small',style:{margin:'0 22px 10px'}},testMsg):null,
      h('div',{class:'pad'},h('button',{class:'btn',onClick:()=>{
        S.settings.priceApi=url.trim()?{url:url.trim().replace(/\/+$/,''),key:key.trim()}:null;
        commit();api.close();if(parentApi)parentApi.refresh();toast('API guardada');
      }},'Guardar'),
      cur.url?h('div',{class:'btnrow'},h('button',{class:'btn ghost',onClick:async()=>{
        if(!(await confirmBox('Desconectar API','Se dejará de poder consultar precios automáticamente. Podrás volver a conectarla cuando quieras.','Desconectar')))return;
        S.settings.priceApi=null;commit();api.close();if(parentApi)parentApi.refresh();toast('API desconectada');
      }},'Desconectar')):null));
  }});
}
function openCloudSync(parentApi){
  let email='',password='',msg='',busy=false;
  async function resolveFirstLink(api){
    const r=await sbPull();
    if(!r.ok){toast('Conectado, pero no se pudo comprobar la nube: '+r.error);api.refresh();return}
    if(!r.row){
      const pr=await sbPush({v:2,active:SPACE,spaces:SPACES});
      if(pr.ok){sbLastSync=Date.now();toast('Cuenta conectada. Copia inicial subida a la nube.')}
      else toast('Cuenta conectada, pero falló la copia inicial: '+pr.error);
      api.refresh();return;
    }
    const when=new Date(r.row.updated_at).toLocaleString('es-ES',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit',year:'numeric'});
    const choice=await chooseBox('Ya hay una copia en la nube',[
      {value:'cloud',label:'Usar la de la nube (de '+when+') — sustituye lo de este dispositivo'},
      {value:'local',label:'Usar lo que tengo en este dispositivo — sustituye la nube'}
    ]);
    if(choice==='cloud'){applyCloudState(r.row.data);toast('Datos cargados desde la nube')}
    else if(choice==='local'){
      const pr=await sbPush({v:2,active:SPACE,spaces:SPACES});
      if(pr.ok){sbLastSync=Date.now();toast('Este dispositivo ha sustituido la copia de la nube')}
      else toast('Fallo al subir: '+pr.error);
    }
    api.refresh();if(parentApi)parentApi.refresh();
  }
  async function doAuth(kind,api){
    if(!email.trim()||!password){msg='Rellena email y contraseña';api.refresh();return}
    if(password.length<6){msg='La contraseña debe tener al menos 6 caracteres';api.refresh();return}
    busy=true;msg='Un momento…';api.refresh();
    const r=kind==='signup'?await sbSignUp(email.trim(),password):await sbSignIn(email.trim(),password);
    busy=false;
    if(!r.ok){msg='Fallo: '+r.error;api.refresh();return}
    if(kind==='signup'&&!r.confirmed){msg='Cuenta creada. Revisa tu email para confirmarla y luego inicia sesión aquí con la misma contraseña.';api.refresh();return}
    msg='';api.refresh();
    await resolveFirstLink(api);
  }
  openSheet({title:'Copia en la nube',form:true,build:api=>{
    if(!sbSession()){
      return h('div',null,
        h('p',{class:'muted small',style:{margin:'4px 22px 12px'}},'Crea una cuenta gratuita para que Bolsillo suba una copia de tus datos automáticamente cada vez que algo cambie, y puedas recuperarlos si cambias de móvil o borras el navegador. Es opcional: sin ella, tus datos siguen guardándose solo en este dispositivo.'),
        h('div',{class:'grp'},
          fieldRow('Email',h('input',{type:'email',autocomplete:'email',value:email,onInput:e=>{email=e.target.value}})),
          fieldRow('Contraseña',h('input',{type:'password',autocomplete:'new-password',value:password,onInput:e=>{password=e.target.value}}))),
        h('div',{class:'btnrow',style:{padding:'10px 16px'}},
          h('button',{class:'btn ghost',disabled:busy,onClick:()=>doAuth('signup',api)},'Crear cuenta'),
          h('button',{class:'btn',disabled:busy,onClick:()=>doAuth('signin',api)},'Iniciar sesión')),
        msg?h('p',{class:'muted small',style:{margin:'0 22px 10px'}},msg):null);
    }
    const s=sbSession();
    return h('div',null,
      h('p',{class:'muted small',style:{margin:'4px 22px 4px'}},'Conectado como '+s.email+'.'),
      h('p',{class:'muted small',style:{margin:'0 22px 12px'}},sbLastSync?('Última subida en esta sesión: '+new Date(sbLastSync).toLocaleString('es-ES',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'})):'Los cambios se suben solos en segundo plano.'),
      sbSyncErr?h('p',{class:'muted small',style:{margin:'-6px 22px 12px',color:'var(--warn)'}},'Último error al sincronizar: '+sbSyncErr):null,
      h('div',{class:'pad'},h('button',{class:'btn ghost',disabled:busy,onClick:async()=>{
        busy=true;api.refresh();const r=await sbPush({v:2,active:SPACE,spaces:SPACES});busy=false;
        if(r.ok){sbLastSync=Date.now();sbSyncErr='';toast('Copia subida')}else{sbSyncErr=r.error;toast('Fallo: '+r.error)}
        api.refresh();
      }},'Subir copia ahora')),
      h('div',{class:'pad'},h('button',{class:'btn ghost',onClick:async()=>{
        if(!(await confirmBox('Descargar de la nube','Esto sustituye los datos de este dispositivo por la última copia guardada en la nube. Lo que tengas aquí sin subir se perderá.','Descargar',true)))return;
        busy=true;api.refresh();const r=await sbPull();busy=false;
        if(!r.ok){toast('Fallo: '+r.error);api.refresh();return}
        if(!r.row){toast('No hay ninguna copia en la nube todavía');api.refresh();return}
        applyCloudState(r.row.data);toast('Datos restaurados desde la nube');api.close();if(parentApi)parentApi.refresh();
      }},'Descargar de la nube')),
      h('div',{class:'pad'},h('button',{class:'btn ghost',onClick:()=>{sbSignOut();toast('Sesión cerrada (tus datos siguen en la nube)');api.refresh();if(parentApi)parentApi.refresh()}},'Cerrar sesión')));
  }});
}
function investBadge(a){return a.type==='invest'&&investCheckInfo(a).stale?h('span',{class:'badge warn'},'Revisar'):null}
function openInvestReview(){
  openSheet({title:'Revisar inversiones',form:true,full:true,build:api=>{
    const list=activeAccounts().filter(a=>a.type==='invest');
    if(!list.length)return emptyBox('Sin cuentas de inversión','Crea una cuenta de tipo Inversión para hacer seguimiento.',h('button',{class:'btn',onClick:()=>{api.close();openAccountForm(null,()=>{})}},'Nueva cuenta'));
    const bal=balances();
    return h('div',null,
      h('p',{class:'muted small',style:{margin:'4px 22px 12px'}},'Toca una cuenta para actualizar su valor. La frecuencia del aviso se ajusta desde Editar cuenta.'),
      h('div',{class:'grp'},list.map(a=>{
        const ci=investCheckInfo(a);
        return h('button',{class:'row',onClick:()=>openInvestUpdate(a,api)},tile(a.icon,a.color),
          h('div',{class:'grow'},h('div',{class:'t'},a.name,investBadge(a)),
            h('div',{class:'s'},ci.last?('Revisado hace '+ci.since+(ci.since===1?' día':' días')):'Nunca revisado')),
          h('div',{class:'amt',style:ci.stale?{color:'var(--warn)'}:null},money(bal[a.id]||0,a.currency)));
      })));
  }});
}
function emptyBox(title,text,btn){return h('div',{class:'empty'},h('b',null,title),text,btn?h('div',{style:{marginTop:'14px'}},btn):null)}

/* ================= filas ================= */
function amtClass(t){
  const m=S.settings.amtColor;
  if(t.type==='income')return m!=='none'?'pos':'';
  if(t.type==='expense')return m==='both'?'neg':'';
  return '';
}
function amtText(t){
  const s=S.settings.signed;
  const v=money(t.amount,t.cur);
  if(t.type==='income')return(s?'+':'')+v;
  if(t.type==='expense')return(s?'−':'')+v;
  return v;
}
function txRow(t,o){
  o=o||{};const C=cat(t.cat),A=acc(t.acc),B=acc(t.acc2),slim=o.slim!=null?o.slim:S.settings.txView==='slim',isT=t.type==='transfer';
  const isInv=isT&&B&&B.type==='invest';
  const isSplit=!isT&&Array.isArray(t.splits)&&t.splits.length>0;
  const splitLabel=isSplit?t.splits.map(s=>cat(s.cat).name).join(', '):'';
  const base=isInv?'Aportación a «'+B.name+'»':isT?'Transferencia':(t.note||(isSplit?'Varias categorías':C.name));
  const title=t.payee||base;
  const bits=[];
  if(!isT){if(isSplit)bits.push(splitLabel);else if(t.payee||t.note)bits.push(C.name)}
  else if(t.payee)bits.push(base);
  if(isT)bits.push((A?A.name:'?')+' → '+(B?B.name:'?'));else if(A&&!o.hideAcc)bits.push(A.name);
  if(t.pending)bits.push('Pendiente');if(t.excluded)bits.push('Excluido');if(t.recId)bits.push('🔁');if(t.photo)bits.push('📎');
  const conv2=t.cur!==main()&&!isT?'≈ '+money(txMain(t)):'';
  const selEl=o.selectable?h('span',{class:'sel'+(UI.sel.has(t.id)?' on':'')},UI.sel.has(t.id)?icon('check',14):null):null;
  return h('button',{class:'row'+(slim?' slim':''),onClick:()=>(o.onclick?o.onclick(t):openTxDetail(t.id))},
    selEl,isInv?tile(B.icon,B.color):isT?tile('⇄','#2748D9'):isSplit?tile('🧩','#6B7280'):tile(C.icon,C.color),
    h('div',{class:'grow'},h('div',{class:'t'},title),slim?null:h('div',{class:'s'},bits.join(' · '))),
    h('div',{class:'amt '+amtClass(t)},amtText(t),conv2&&!slim?h('small',null,conv2):null));
}

/* ================= RESUMEN ================= */
function periodTotals(p,accs){
  let inc=0,exp=0;
  for(const t of filterTx({from:p.start,to:p.end,stats:true,nosort:true,accs})){if(t.type==='income')inc+=txMain(t);else if(t.type==='expense')exp+=txMain(t)}
  return{inc,exp,bal:inc-exp};
}
VIEWS.resumen=function(){
  const box=h('div'),today=todayISO();
  const tools=[h('button',{class:'ibtn','aria-label':'Cambiar de espacio: '+spaceLabel(SPACE),onClick:()=>openSpaceSwitcher()},h('span',{style:{fontSize:'18px'}},SPACE_ICON[SPACE])),
    h('button',{class:'ibtn'+(S.settings.incognito?' on':''),'aria-label':'Ocultar importes',onClick:()=>{S.settings.incognito=!S.settings.incognito;commit()}},icon(S.settings.incognito?'eyeoff':'eye',20)),
    h('button',{class:'ibtn','aria-label':'Ajustes',onClick:()=>openSettings()},icon('gear',20))];
  box.append(header('Resumen',spaceLabel(SPACE)+' · '+cap(fmtDay(today)==='Hoy'?DAYS[new Date().getDay()]+', '+fmtShort(today):fmtDay(today)),tools));
  if(S.settings.demo)box.append(h('div',{class:'banner'},h('span',null,'Modo demo · tus datos reales están a salvo'),h('button',{style:{color:'#fff',textDecoration:'underline'},onClick:exitDemo},'Salir')));
  const staleInv=S.settings.demo?[]:staleInvestments();
  if(staleInv.length){
    box.append(h('div',{class:'callout'},
      staleInv.length===1?'Toca revisar el valor de «'+staleInv[0].name+'».':'Tienes '+staleInv.length+' inversiones por revisar.',
      ' ',h('button',{class:'link',onClick:()=>openInvestReview()},'Revisar ahora')));
  }
  if(!S.tx.length&&!S.budgets.length&&!S.goals.length){
    box.append(h('div',{class:'grp'},emptyBox('Empieza en dos segundos','Pulsa + y escribe algo como «café 2,50 ayer». Bolsillo detecta importe, fecha, categoría y cuenta.',h('div',null,h('button',{class:'btn',onClick:()=>openQuickEntry()},'Escribir el primer movimiento'),h('button',{class:'btn ghost',style:{marginTop:'10px'},onClick:()=>enterDemo()},'Probar con datos de ejemplo')))));
  }
  // atajos
  if(S.shortcuts.length){
    box.append(secTitle('Atajos','Gestionar',()=>openShortcutsList()));
    box.append(h('div',{class:'chips',style:{gap:'10px',paddingBottom:'16px'}},S.shortcuts.map(s=>h('button',{class:'card',style:{margin:0,minWidth:'82px',textAlign:'center',flex:'none',padding:'14px 8px'},onClick:()=>runShortcut(s)},
      h('div',{style:{fontSize:'24px',marginBottom:'6px'}},s.icon),
      h('div',{class:'t',style:{fontWeight:'600',fontSize:'12px',lineHeight:'1.2'}},s.label)))));
  }
  // patrimonio neto
  const nw=netWorth();
  const dates=[];for(let i=11;i>=1;i--){const d=addMonths(today.slice(0,8)+'01',-i+1);dates.push(addDays(d,-1))}dates.push(today);
  const ser=netWorthSeries(dates),prev30=netWorthSeries([addDays(today,-30)])[0],delta=nw-prev30;
  box.append(h('div',{class:'hero'},h('div',{class:'lbl'},'Patrimonio neto'),h('div',{class:'big'},money(nw)),
    h('div',{class:'delta '+(delta>=0?'pos':'neg')},(delta>=0?'+':'−')+money(Math.abs(delta))+' en 30 días'),
    h('div',{html:sparkSVG(ser,'var(--accent)'),style:{marginTop:'6px'}})));
  // periodo
  const p=shiftPeriod(curPeriod(),UI.off),tot=periodTotals(p);
  box.append(h('div',{class:'pnav'},h('button',{'aria-label':'Periodo anterior',onClick:()=>{UI.off--;renderView()}},icon('left',20)),h('b',null,periodLabel(p)),h('button',{'aria-label':'Periodo siguiente',disabled:UI.off>=0,onClick:()=>{UI.off++;renderView()}},icon('right',20))));
  box.append(h('div',{class:'split3'},
    h('div',null,h('div',{class:'l'},'Ingresos'),h('div',{class:'v pos'},money(tot.inc))),
    h('div',null,h('div',{class:'l'},'Gastos'),h('div',{class:'v'},money(tot.exp))),
    h('div',null,h('div',{class:'l'},'Balance'),h('div',{class:'v '+(tot.bal>=0?'pos':'neg')},money(tot.bal)))));
  // insight
  if(UI.off===0&&tot.exp>0){
    const el=diffDays(p.start,today),pv=shiftPeriod(p,-1),to=addDays(pv.start,el)>pv.end?pv.end:addDays(pv.start,el);
    const pe=periodTotals({start:pv.start,end:to}).exp;
    if(pe>0){const d=(tot.exp-pe)/pe*100;box.append(h('div',{class:'callout'},'A estas alturas llevas gastado ',h('b',null,money(tot.exp)),', un ',h('b',null,Math.abs(Math.round(d))+'% '+(d>=0?'más':'menos')),' que en el periodo anterior.'))}
  }
  // límite diario
  const mb=mainBudget();
  if(mb&&UI.off===0){
    const dl=dailyLimit(mb);
    if(dl){
      const pct=dl.perDay>0?Math.min(1,dl.today/(dl.perDay||1)):(dl.today>0?1:0);
      box.append(h('div',{class:'card'},h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'baseline'}},h('h3',null,'Límite diario'),h('span',{class:'muted small'},dl.left+(dl.left===1?' día restante':' días restantes'))),
        dl.over?h('div',{class:'neg',style:{fontWeight:'600',margin:'2px 0 8px'}},'Te has pasado del presupuesto de este periodo'):h('div',{class:'num',style:{fontSize:'26px',fontWeight:'700',margin:'2px 0 8px'}},money(dl.perDay),h('span',{class:'muted',style:{fontSize:'14px',fontWeight:'500'}},' al día')),
        h('div',{class:'bar'+(pct>=1?' over':pct>.8?' warn':'')},h('i',{style:{width:Math.round(pct*100)+'%'}})),
        h('div',{class:'muted small',style:{marginTop:'6px'}},'Hoy has gastado '+money(dl.today))));
    }
  }
  // tu dinero y la hucha
  box.append(myMoneyCard());
  box.append(savingsCard());
  // presupuestos
  if(S.budgets.length){
    box.append(secTitle('Presupuestos','Ver todos',()=>go('presu')));
    const items=S.budgets.map(b=>({b,i:budgetInfo(b)})).sort((a,b)=>b.i.pct-a.i.pct).slice(0,3);
    box.append(h('div',{class:'grp'},items.map(x=>budgetRow(x.b,x.i))));
  }
  // cuentas
  box.append(secTitle('Cuentas','Añadir',()=>openAccountForm(null)));
  const bal=balances();
  for(const g of acctGroups(activeAccounts())){
    box.append(g.key==='invest'?secTitle(g.label+' · '+money(g.sub),'Aportar',()=>openInvestContribute()):groupHead(g.label,money(g.sub)));
    box.append(h('div',{class:'grp'},g.items.map(a=>h('button',{class:'row',onClick:()=>openAccountDetail(a.id)},tile(a.icon,a.color),
      h('div',{class:'grow'},h('div',{class:'t'},a.name,investBadge(a)),h('div',{class:'s'},ACC_TYPES[a.type].n+(a.currency!==main()?' · '+a.currency:''))),
      h('div',{class:'amt '+((bal[a.id]||0)<0?'neg':'')},money(bal[a.id]||0,a.currency),a.currency!==main()?h('small',null,'≈ '+money(conv(bal[a.id]||0,a.currency,main()))):null)))));
  }
  // pagos próximos
  const ub=upcomingBills(30).slice(0,4);
  if(ub.length){
    box.append(secTitle('Suscripciones y pagos','Ver todos',()=>{UI.bud='bills';go('presu')}));
    box.append(h('div',{class:'grp'},ub.map(u=>billRow(u.r,u.d))));
  }
  // objetivos
  if(S.goals.length){
    box.append(secTitle('Objetivos','Ver todos',()=>{UI.bud='goals';go('presu')}));
    box.append(h('div',{class:'chips',style:{gap:'12px',paddingBottom:'16px'}},S.goals.map(g=>{const i=goalInfo(g);return h('button',{class:'card',style:{margin:0,minWidth:'132px',textAlign:'center',flex:'none'},onClick:()=>openGoalDetail(g.id)},
      h('div',{style:{position:'relative',width:'56px',height:'56px',margin:'0 auto 6px'}},h('div',{html:ringSVG(i.pct,g.color,56)}),h('div',{style:{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px'}},g.icon)),
      h('div',{class:'t',style:{fontWeight:'600',fontSize:'13.5px'}},g.name),h('div',{class:'muted small'},Math.round(i.pct*100)+'%'))}))); }
  // últimos
  const rec=filterTx({}).slice(0,5);
  if(rec.length){box.append(secTitle('Últimos movimientos','Ver todos',()=>go('movs')));box.append(h('div',{class:'grp'},rec.map(t=>txRow(t))))}
  return box;
};
/* ================= TODO MI DINERO =================
   Suma del dinero que tienes a mano ahora mismo: efectivo, cuentas, ahorro y
   otras. No entra lo invertido (no es dinero disponible) ni las deudas
   (tarjetas y préstamos), que se ven aparte y ya cuentan en el patrimonio. */
const LIQUID_TYPES=['cash','bank','savings','other'];
const liquidAccounts=()=>activeAccounts().filter(a=>LIQUID_TYPES.indexOf(a.type)>-1);
function sumAccounts(list){const b=balances();return list.reduce((s,a)=>s+conv(b[a.id]||0,a.currency,main()),0)}
const liquidTotal=()=>sumAccounts(liquidAccounts());
function myMoneyCard(){
  const accs=liquidAccounts();
  if(!accs.length)return h('div');
  const tot=liquidTotal(),sav=savingsTotal();
  const box=h('div');
  box.append(secTitle('Tu dinero','Ver detalle',()=>openMyMoney()));
  box.append(h('button',{class:'hero',style:{display:'block',width:'calc(100% - 32px)',textAlign:'left'},onClick:()=>openMyMoney()},
    h('div',{class:'lbl'},'Tengo disponible'),
    h('div',{class:'big'},money(tot)),
    h('div',{class:'delta muted'},'En '+accs.length+(accs.length===1?' cuenta':' cuentas')+(sav?' · '+money(sav)+' en la hucha':''))));
  return box;
}
function openMyMoney(){
  openSheet({title:'Tu dinero',full:true,build:api=>{
    const bal=balances(),box=h('div'),go2=id=>{api.close();setTimeout(()=>openAccountDetail(id),240)};
    box.append(h('div',{class:'hero'},h('div',{class:'lbl'},'Tengo disponible'),h('div',{class:'big'},money(liquidTotal())),
      h('div',{class:'delta muted'},'Efectivo, cuentas y ahorro. Sin contar lo invertido ni las deudas.')));
    const row=a=>h('button',{class:'row',onClick:()=>go2(a.id)},tile(a.icon,a.color),
      h('div',{class:'grow'},h('div',{class:'t'},a.name),h('div',{class:'s'},ACC_TYPES[a.type].n+(a.currency!==main()?' · '+a.currency:''))),
      h('div',{class:'amt '+((bal[a.id]||0)<0?'neg':'')},money(bal[a.id]||0,a.currency),a.currency!==main()?h('small',null,'≈ '+money(conv(bal[a.id]||0,a.currency,main()))):null));
    for(const t of LIQUID_TYPES){
      const list=liquidAccounts().filter(a=>a.type===t);
      if(!list.length)continue;
      box.append(groupHead(ACC_TYPES[t].n,money(sumAccounts(list))));
      box.append(h('div',{class:'grp'},list.map(row)));
    }
    const inv=activeAccounts().filter(a=>a.type==='invest'),deb=activeAccounts().filter(a=>a.type==='card'||a.type==='loan');
    if(inv.length){
      box.append(groupHead('Invertido (no disponible)',money(sumAccounts(inv))));
      box.append(h('div',{class:'grp'},inv.map(row)));
    }
    if(deb.length){
      box.append(groupHead('Lo que debes',money(sumAccounts(deb))));
      box.append(h('div',{class:'grp'},deb.map(row)));
    }
    if(inv.length||deb.length){
      box.append(h('div',{class:'callout'},'Sumando todo, tu patrimonio neto es ',h('b',null,money(netWorth())),'.'));
    }
    return box;
  }});
}

/* ================= DINERO AHORRADO =================
   Se apoya en las cuentas de tipo "Ahorro": lo que ahorras es una transferencia
   hacia una de ellas y lo que sacas, una transferencia de vuelta. Así el saldo
   de las cuentas y el patrimonio siguen cuadrando solos. */
const savingsAccounts=()=>activeAccounts().filter(a=>a.type==='savings');
function savingsTotal(){const b=balances();return savingsAccounts().reduce((s,a)=>s+conv(b[a.id]||0,a.currency,main()),0)}
/* Efecto de un movimiento sobre el ahorro, en moneda principal (+ entra, − sale) */
function savingsDelta(t,ids){
  let v=0;const A=acc(t.acc),B=acc(t.acc2);
  if(t.type==='transfer'){
    if(A&&ids.has(t.acc))v-=conv(t.amount,t.cur,main());
    if(B&&ids.has(t.acc2))v+=t.amount2!=null?conv(t.amount2,B.currency,main()):conv(t.amount,t.cur,main());
  }else if(A&&ids.has(t.acc))v+=(t.type==='income'?1:-1)*conv(t.amount,t.cur,main());
  return v;
}
function savingsMoves(o){
  o=o||{};const ids=new Set(savingsAccounts().map(a=>a.id));
  if(!ids.size)return[];
  const today=todayISO(),out=[];
  for(const t of S.tx){
    if(!S.settings.showFuture&&t.date>today)continue;
    if(o.from&&t.date<o.from)continue;
    if(o.to&&t.date>o.to)continue;
    const v=savingsDelta(t,ids);
    if(v)out.push({t,v});
  }
  out.sort((a,b)=>a.t.date<b.t.date?1:a.t.date>b.t.date?-1:(b.t.ts||0)-(a.t.ts||0));
  return out;
}
const savingsNet=(from,to)=>savingsMoves({from,to}).reduce((s,x)=>s+x.v,0);
function needSavingsAccount(){
  return new Promise(async res=>{
    if(savingsAccounts().length)return res(true);
    if(!(await confirmBox('Aún no tienes hucha','Creo una cuenta «Ahorro» y ahí se irá guardando lo que apartes.','Crear hucha')))return res(false);
    S.accounts.push({id:uid(),name:'Ahorro',type:'savings',currency:main(),initial:0,icon:'🐖',color:'#0F8A5C'});
    commit();res(true);
  });
}
async function addToSavings(){
  if(!(await needSavingsAccount()))return;
  const sav=savingsAccounts(),from=activeAccounts().filter(a=>a.type!=='savings'&&a.type!=='loan')[0]||defaultAcc();
  openTxForm(null,{type:'transfer',acc:from?from.id:'',acc2:sav[0].id,payee:'Ahorro de '+MONTHS[parseISO(todayISO()).getMonth()],cur:from?from.currency:main()});
}
async function takeFromSavings(){
  if(!(await needSavingsAccount()))return;
  const sav=savingsAccounts(),to=activeAccounts().filter(a=>a.type!=='savings'&&a.type!=='loan')[0]||defaultAcc();
  openTxForm(null,{type:'transfer',acc:sav[0].id,acc2:to?to.id:'',payee:'',cur:sav[0].currency});
}
function savingsButtons(){
  return h('div',{class:'btnrow',style:{margin:'0 16px 16px'}},
    h('button',{class:'btn',onClick:addToSavings},'Ahorrar'),
    h('button',{class:'btn ghost',onClick:takeFromSavings},'Sacar'));
}
/* Tarjeta del Resumen */
function savingsCard(){
  const accs=savingsAccounts();
  const p=curPeriod(),net=accs.length?savingsNet(p.start,p.end):0;
  const box=h('div');
  box.append(secTitle('Dinero ahorrado',accs.length?'Ver todo':null,accs.length?()=>openSavings():null));
  if(!accs.length){
    box.append(h('div',{class:'grp'},emptyBox('Tu hucha, aparte','Aparta cada mes lo que te sobre y míralo crecer. Si un mes lo necesitas, lo sacas y queda anotado.',
      h('button',{class:'btn',onClick:addToSavings},'Empezar a ahorrar'))));
    return box;
  }
  const tot=savingsTotal();
  box.append(h('button',{class:'hero',style:{display:'block',width:'calc(100% - 32px)',textAlign:'left'},onClick:()=>openSavings()},
    h('div',{class:'lbl'},'Dinero ahorrado'),
    h('div',{class:'big'},money(tot)),
    h('div',{class:'delta '+(net>0?'pos':net<0?'neg':'muted')},
      net===0?'Este periodo no has movido la hucha':(net>0?'+':'−')+money(Math.abs(net))+' en '+periodLabel(p))));
  box.append(savingsButtons());
  return box;
}
/* Hoja completa, mes a mes */
function openSavings(){
  openSheet({title:'Dinero ahorrado',full:true,build:api=>{
    const accs=savingsAccounts(),bal=balances(),box=h('div');
    if(!accs.length)return h('div',null,h('div',{class:'grp'},emptyBox('Sin hucha todavía','Crea una y empieza a apartar lo que te sobre cada mes.',h('button',{class:'btn',onClick:async()=>{api.close();setTimeout(addToSavings,240)}},'Empezar a ahorrar'))));
    box.append(h('div',{class:'hero'},h('div',{class:'lbl'},'Total ahorrado'),h('div',{class:'big'},money(savingsTotal()))));
    box.append(savingsButtons());
    if(accs.length>1||accs[0].currency!==main()){
      box.append(groupHead('Dónde está'));
      box.append(h('div',{class:'grp'},accs.map(a=>h('button',{class:'row',onClick:()=>{api.close();setTimeout(()=>openAccountDetail(a.id),240)}},tile(a.icon,a.color),
        h('div',{class:'grow'},h('div',{class:'t'},a.name),h('div',{class:'s'},ACC_TYPES[a.type].n)),
        h('div',{class:'amt'},money(bal[a.id]||0,a.currency))))));
    }
    const moves=savingsMoves();
    if(!moves.length){
      box.append(h('div',{class:'grp'},emptyBox('Aún no hay movimientos','Pulsa «Ahorrar» para apartar lo primero.')));
      return box;
    }
    /* resumen de los últimos 6 meses */
    const today=todayISO(),bars=[];
    for(let i=5;i>=0;i--){
      const m=addMonths(today.slice(0,8)+'01',-i),ini=m.slice(0,8)+'01',fin=addDays(addMonths(ini,1),-1);
      bars.push({label:MONTHS[parseISO(ini).getMonth()].slice(0,3),v:savingsNet(ini,fin)});
    }
    const mx=Math.max(1,...bars.map(b=>Math.abs(b.v)));
    box.append(h('div',{class:'card'},h('h3',null,'Últimos 6 meses'),
      h('div',{style:{display:'flex',alignItems:'flex-end',gap:'8px',height:'92px',marginTop:'10px'}},bars.map(b=>h('div',{style:{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',height:'100%',justifyContent:'flex-end'}},
        h('div',{class:'small num',style:{color:b.v<0?'var(--neg)':'var(--muted)'}},b.v?money(b.v,undefined,{int:true}):''),
        h('div',{style:{width:'100%',height:Math.max(3,Math.round(Math.abs(b.v)/mx*52))+'px',borderRadius:'6px',background:b.v<0?'var(--neg)':'var(--pos)',opacity:b.v?1:.25}}),
        h('div',{class:'small muted'},b.label))))));
    /* mes a mes */
    const byMonth={};
    for(const x of moves){const k=x.t.date.slice(0,7);(byMonth[k]=byMonth[k]||[]).push(x)}
    for(const k of Object.keys(byMonth).sort().reverse()){
      const list=byMonth[k],net=list.reduce((s,x)=>s+x.v,0);
      const d=parseISO(k+'-01');
      box.append(groupHead(cap(MONTHS[d.getMonth()])+' '+d.getFullYear(),(net>=0?'+':'−')+money(Math.abs(net))));
      box.append(h('div',{class:'grp'},list.map(x=>h('button',{class:'row',onClick:()=>{api.close();setTimeout(()=>openTxDetail(x.t.id),240)}},
        tile(x.v>=0?'🐖':'↩︎',x.v>=0?'#0F8A5C':'#CF3640'),
        h('div',{class:'grow'},h('div',{class:'t'},x.t.payee||(x.v>=0?'Ahorro':'Sacado del ahorro')),h('div',{class:'s'},fmtDay(x.t.date))),
        h('div',{class:'amt '+(x.v>=0?'pos':'neg')},(x.v>=0?'+':'−')+money(Math.abs(x.v)))))));
    }
    return box;
  }});
}

function budgetRow(b,i,onclick){
  const cls=i.pct>=1?' over':i.pct>.8?' warn':'';
  return h('button',{class:'row',onClick:onclick||(()=>openBudgetDetail(b.id))},tile(b.icon,b.kind==='total'?'#2748D9':cat(b.cats[0]).color),
    h('div',{class:'grow'},h('div',{style:{display:'flex',justifyContent:'space-between',gap:'8px'}},h('span',{class:'t',style:{flex:'1',minWidth:0}},b.name),h('span',{class:'num muted small',style:{whiteSpace:'nowrap'}},money(i.spent,undefined,{int:i.avail>=1000})+' / '+money(i.avail,undefined,{int:i.avail>=1000}))),
      h('div',{class:'bar'+cls,style:{margin:'6px 0 4px'}},h('i',{style:{width:Math.min(100,Math.round(i.pct*100))+'%'}})),
      h('div',{class:'s'+(i.remaining<0?' neg':'')},i.remaining>=0?'Quedan '+money(i.remaining):'Te pasas '+money(-i.remaining))));
}
function billRow(r,d){
  const isT=r.type==='transfer';
  const dest=isT?acc(r.acc2):null;
  const ic=isT?(dest?dest.icon:'🔁'):cat(r.cat).icon,color=isT?(dest?dest.color:'#8A94A6'):cat(r.cat).color;
  const label=isT?(dest?'Transferencia a '+dest.name:'Transferencia'):cat(r.cat).name;
  const overdue=d<todayISO();
  return h('button',{class:'row',onClick:()=>openTxForm(r,{},'rec')},tile(ic,color),
    h('div',{class:'grow'},h('div',{class:'t'},r.payee||label),h('div',{class:'s'+(overdue?' neg':'')},(overdue?'Vencido · ':'')+fmtDay(d)+' · '+FREQ[r.freq]+(r.paused?' · en pausa':''))),
    r.auto===false&&d?h('span',{class:'chip on',onClick:e=>{e.stopPropagation();payBill(r);commit();toast('Pago registrado')}},'Pagar'):null,
    h('div',{class:'amt'},money(r.amount,r.cur)));
}

/* ================= MOVIMIENTOS ================= */
function filterCount(){const f=UI.filt;return(f.types.length?1:0)+(f.accs.length?1:0)+(f.cats.length?1:0)+(f.pending?1:0)+(f.tag?1:0)+(f.from||f.to?1:0)}
function currentFilter(extra){
  const f=UI.filt,cats=[];f.cats.forEach(c=>catWithChildren(c).forEach(x=>cats.push(x)));
  return Object.assign({q:UI.q,types:f.types,accs:f.accs,cats,pending:f.pending,tag:f.tag,from:f.from,to:f.to},extra||{});
}
function calGrid(list){
  const m=UI.calMonth,d0=parseISO(m),y=d0.getFullYear(),mo=d0.getMonth();
  const startOffset=(new Date(y,mo,1).getDay()+6)%7; // lunes=0
  const total=dim(y,mo);
  const nRows=Math.ceil((startOffset+total)/7);
  const first=iso(new Date(y,mo,1));
  const cells=[];
  for(let i=0;i<nRows*7;i++){const off=i-startOffset;cells.push({date:addDays(first,off),out:off<0||off>=total})}
  const byDay={};
  for(const t of list){if(t.excluded)continue;const d=byDay[t.date]||(byDay[t.date]={net:0,n:0});d.n++;if(t.type==='income')d.net+=txMain(t);else if(t.type==='expense')d.net-=txMain(t)}
  const today=todayISO();
  const WD=['L','M','X','J','V','S','D'];
  return h('div',null,
    h('div',{class:'pnav'},h('button',{'aria-label':'Mes anterior',onClick:()=>{UI.calMonth=addMonths(UI.calMonth,-1);UI.calDay='';renderView()}},icon('left',20)),
      h('b',null,cap(MONTHS[mo]+' '+y)),h('button',{'aria-label':'Mes siguiente',onClick:()=>{UI.calMonth=addMonths(UI.calMonth,1);UI.calDay='';renderView()}},icon('right',20))),
    h('div',{class:'calgrid'},WD.map(w=>h('div',{class:'cwd'},w)).concat(cells.map(c=>{
      const info=byDay[c.date],isToday=c.date===today,isSel=UI.calDay===c.date;
      const cls=[c.out?'out':'',isToday?'today':'',isSel?'sel':''].filter(Boolean).join(' ');
      const kids=[h('span',null,String(parseISO(c.date).getDate()))];
      if(info&&!c.out){
        if(info.net!==0)kids.push(h('span',{class:'damt',style:isSel?null:{color:info.net>0?'var(--pos)':'var(--neg)'}},(info.net>0?'+':'−')+Math.round(Math.abs(info.net))));
        else kids.push(h('span',{class:'dot',style:{position:'static',background:isSel?'currentColor':'var(--muted)'}}));
      }
      return h('button',{class:cls,onClick:()=>{UI.calDay=isSel?'':c.date;renderView()}},...kids);
    }))));
}
VIEWS.movs=function(){
  const box=h('div'),n=filterCount(),isCal=UI.movView==='cal';
  const tools=[
    h('button',{class:'ibtn'+(isCal?' on':''),'aria-label':isCal?'Ver como lista':'Ver como calendario',onClick:()=>{UI.movView=isCal?'list':'cal';UI.calDay='';renderView()}},icon('calendar',20)),
    h('button',{class:'ibtn'+(UI.selMode?' on':''),'aria-label':'Seleccionar',onClick:()=>{UI.selMode=!UI.selMode;UI.sel.clear();renderView()}},icon('check',20)),
    h('button',{class:'ibtn'+(n?' on':''),'aria-label':'Filtros',onClick:openFilters},icon('filter',20))];
  box.append(header('Movimientos',null,tools));
  const inp=h('input',{type:'search',placeholder:'Buscar por concepto, nota, categoría…',value:UI.q,'aria-label':'Buscar'});
  box.append(h('div',{class:'searchbox'},icon('search',18),inp));
  const calEl=h('div'),sumEl=h('div',{class:'split3'}),listEl=h('div');
  if(isCal)box.append(calEl);
  box.append(sumEl,listEl);
  function fill(){
    let list;
    if(isCal){
      const monthList=filterTx(currentFilter({from:UI.calMonth,to:addDays(addMonths(UI.calMonth,1),-1)}));
      calEl.replaceChildren(calGrid(monthList));
      list=UI.calDay?monthList.filter(t=>t.date===UI.calDay):monthList;
    }else list=filterTx(currentFilter());
    let inc=0,exp=0;for(const t of list){if(t.excluded)continue;if(t.type==='income')inc+=txMain(t);else if(t.type==='expense')exp+=txMain(t)}
    sumEl.replaceChildren(h('div',null,h('div',{class:'l'},'Movimientos'),h('div',{class:'v'},String(list.length))),h('div',null,h('div',{class:'l'},'Ingresos'),h('div',{class:'v pos'},money(inc))),h('div',null,h('div',{class:'l'},'Gastos'),h('div',{class:'v'},money(exp))));
    if(!list.length){listEl.replaceChildren(h('div',{class:'grp'},emptyBox(S.tx.length?'Sin resultados':'Aún no hay movimientos',isCal&&UI.calDay?'Ningún movimiento este día.':S.tx.length?'Prueba con otra búsqueda o quita filtros.':'Pulsa + para añadir el primero.')));return}
    const slice=list.slice(0,UI.limit),groups=[];let last=null;
    for(const t of slice){if(!last||last.date!==t.date){last={date:t.date,items:[]};groups.push(last)}last.items.push(t)}
    const nodes=[];
    for(const g of groups){
      let net=0;for(const t of g.items){if(t.excluded)continue;if(t.type==='income')net+=txMain(t);else if(t.type==='expense')net-=txMain(t)}
      nodes.push(h('div',{class:'dayhead'},h('span',null,fmtDay(g.date)),h('span',{class:'num'},net===0?'':(net>0?'+':'−')+money(Math.abs(net)))));
      nodes.push(h('div',{class:'grp tight'},g.items.map(t=>txRow(t,UI.selMode?{selectable:true,onclick:x=>{if(UI.sel.has(x.id))UI.sel.delete(x.id);else UI.sel.add(x.id);renderView()}}:{}))));
    }
    if(list.length>slice.length)nodes.push(h('div',{style:{padding:'8px 16px'}},h('button',{class:'btn ghost',onClick:()=>{UI.limit+=150;fill()}},'Mostrar más ('+(list.length-slice.length)+')')));
    listEl.replaceChildren(...nodes);
  }
  let dt=null;inp.addEventListener('input',()=>{clearTimeout(dt);dt=setTimeout(()=>{UI.q=inp.value;UI.limit=150;fill()},180)});
  fill();
  if(UI.selMode){
    const ids=[...UI.sel];
    box.append(h('div',{class:'selbar'},
      h('span',{style:{padding:'9px 10px',fontWeight:'700'}},String(ids.length)),
      h('button',{onClick:bulkCategory},'Categoría'),h('button',{onClick:bulkAccount},'Cuenta'),h('button',{onClick:bulkExclude},'Excluir'),h('button',{style:{color:'#ff8a92'},onClick:bulkDelete},'Eliminar')));
  }
  return box;
};
function selectedTx(){return S.tx.filter(t=>UI.sel.has(t.id))}
function endSel(){UI.sel.clear();UI.selMode=false}
function needSel(){if(!UI.sel.size){toast('Selecciona al menos un movimiento');return false}return true}
function bulkCategory(){
  if(!needSel())return;const sel=selectedTx().filter(t=>t.type!=='transfer');if(!sel.length){toast('Las transferencias no tienen categoría');return}
  const types=new Set(sel.map(t=>t.type));if(types.size>1){toast('Selecciona solo gastos o solo ingresos');return}
  pickCategory({type:sel[0].type,onPick:id=>{sel.forEach(t=>{t.cat=id});const n=sel.length;endSel();commit();toast(n+' movimientos recategorizados')}});
}
function bulkAccount(){
  if(!needSel())return;pickAccount({onPick:id=>{const a=acc(id);const sel=selectedTx();sel.forEach(t=>{if(t.type!=='transfer'){t.acc=id;if(a)t.cur=t.cur||a.currency}});endSel();commit();toast('Cuenta actualizada')}});
}
function bulkExclude(){if(!needSel())return;const sel=selectedTx();const v=!sel.every(t=>t.excluded);sel.forEach(t=>{t.excluded=v});endSel();commit();toast(v?'Excluidos de informes':'Incluidos en informes')}
async function bulkDelete(){
  if(!needSel())return;const n=UI.sel.size;
  if(!(await confirmBox('Eliminar '+n+' movimientos','No se puede deshacer.','Eliminar',true)))return;
  const del=selectedTx();S.tx=S.tx.filter(t=>!UI.sel.has(t.id));endSel();commit();toast(n+' movimientos eliminados',{undo:()=>{S.tx.push(...del);commit()}});
}
function openFilters(){
  openSheet({title:'Filtros',form:true,full:true,build:api=>{
    const root=h('div'),f=UI.filt;
    const draw=()=>{
      const toggleIn=(arr,v)=>{const i=arr.indexOf(v);if(i>-1)arr.splice(i,1);else arr.push(v)};
      root.replaceChildren(
        secTitle('Tipo'),h('div',{class:'chips'},[['expense','Gastos'],['income','Ingresos'],['transfer','Transferencias']].map(p=>h('button',{class:'chip'+(f.types.includes(p[0])?' on':''),onClick:()=>{toggleIn(f.types,p[0]);draw()}},p[1]))),
        secTitle('Cuentas'),h('div',{class:'chips',style:{flexWrap:'wrap'}},activeAccounts().map(a=>h('button',{class:'chip'+(f.accs.includes(a.id)?' on':''),onClick:()=>{toggleIn(f.accs,a.id);draw()}},a.icon+' '+a.name))),
        secTitle('Categorías'),h('div',{class:'chips',style:{flexWrap:'wrap'}},S.categories.filter(c=>!c.parent).map(c=>h('button',{class:'chip'+(f.cats.includes(c.id)?' on':''),onClick:()=>{toggleIn(f.cats,c.id);draw()}},c.icon+' '+c.name))),
        allTags().length?[secTitle('Etiqueta'),h('div',{class:'chips',style:{flexWrap:'wrap'}},allTags().slice(0,20).map(g=>h('button',{class:'chip'+(f.tag===g?' on':''),onClick:()=>{f.tag=f.tag===g?'':g;draw()}},'#'+g)))]:null,
        h('div',{class:'grp'},
          fieldRow('Desde',h('input',{type:'date',value:f.from,onChange:e=>{f.from=e.target.value}})),
          fieldRow('Hasta',h('input',{type:'date',value:f.to,onChange:e=>{f.to=e.target.value}})),
          h('div',{class:'field'},h('span',{style:{flex:1}},'Solo pendientes'),switchEl(f.pending,v=>{f.pending=v}))),
        h('div',{class:'pad'},h('button',{class:'btn',onClick:()=>{UI.limit=150;api.close();renderView()}},'Aplicar'),h('div',{class:'btnrow'},h('button',{class:'btn ghost',onClick:()=>{UI.filt={types:[],accs:[],cats:[],pending:false,tag:'',from:'',to:''};UI.q='';api.close();renderView()}},'Quitar filtros'))));
    };
    draw();return root;
  }});
}

/* ================= detalle de movimiento / cuenta ================= */
function openTxDetail(id){
  openSheet({title:'Movimiento',build:api=>{
    const t=S.tx.find(x=>x.id===id);if(!t){setTimeout(()=>api.close(),0);return h('div')}
    const C=cat(t.cat),A=acc(t.acc),B=acc(t.acc2),isT=t.type==='transfer';
    const isInv=isT&&B&&B.type==='invest';
    const g=h('div',{class:'grp plain'});
    const line=(l,v)=>v?h('div',{class:'row plain'},h('span',{class:'muted',style:{width:'96px'}},l),h('div',{class:'grow',style:{textAlign:'right'}},v)):null;
    g.append(line('Fecha',fmtLong(t.date)+' ('+DAYS[parseISO(t.date).getDay()]+')'));
    if(!isT){
      if(Array.isArray(t.splits)&&t.splits.length){
        g.append(h('div',{class:'row plain'},h('span',{class:'muted',style:{width:'96px'}},'Dividido en'),h('div',{class:'grow',style:{textAlign:'right'}},t.splits.length+' categorías')));
        t.splits.forEach(sp=>g.append(h('div',{class:'row plain'},h('span',{class:'muted',style:{width:'96px'}},cat(sp.cat).icon+' '+cat(sp.cat).name),h('div',{class:'grow',style:{textAlign:'right'}},money(sp.amount,t.cur)))));
      }else g.append(line('Categoría',C.icon+' '+catFull(t.cat)));
      g.append(line('Cuenta',A?A.icon+' '+A.name:'—'));
    }
    else{g.append(line('Desde',A?A.icon+' '+A.name:'—'));g.append(line('Hacia',B?B.icon+' '+B.name:'—'));if(t.amount2!=null&&B)g.append(line('Recibe',money(t.amount2,B.currency)))}
    g.append(line('Concepto',t.payee));
    g.append(line('Etiquetas',(t.tags||[]).map(x=>'#'+x).join(' ')));
    g.append(line('Nota',t.note));
    if(t.cur!==main()&&!isT)g.append(line('En '+main(),'≈ '+money(txMain(t))));
    if(t.pending)g.append(line('Estado','Pendiente'));
    if(t.excluded)g.append(line('Informes','Excluido'));
    if(t.recId)g.append(line('Repetición','Generado por un pago recurrente'));
    const prev=h('div');
    if(t.photo)Photos.get(t.id).then(b=>{if(b)prev.append(h('img',{class:'photo',src:URL.createObjectURL(b),alt:'Recibo'}))}).catch(()=>{});
    return h('div',null,
      h('div',{style:{textAlign:'center',padding:'6px 16px 14px'}},h('div',{class:'num '+amtClass(t),style:{fontSize:'40px',fontWeight:'700'}},amtText(t)),h('div',{class:'muted'},isInv?'Aportación a inversión':isT?'Transferencia':t.type==='income'?'Ingreso':'Gasto')),
      g,prev,
      h('div',{class:'pad'},h('button',{class:'btn',onClick:()=>{api.close();setTimeout(()=>openTxForm(t),240)}},'Editar'),
        h('div',{class:'btnrow'},h('button',{class:'btn ghost',onClick:()=>{api.close();setTimeout(()=>openTxForm(null,Object.assign({},t,{date:todayISO(),photo:false})),240)}},'Duplicar'),
          h('button',{class:'btn danger',onClick:async()=>{if(!(await confirmBox('Eliminar movimiento','No se puede deshacer, salvo desde el aviso posterior.','Eliminar',true)))return;const x=t;S.tx=S.tx.filter(y=>y.id!==t.id);commit();api.close();toast('Movimiento eliminado',{undo:()=>{S.tx.push(x);commit()}})}},'Eliminar'))),
      Array.isArray(t.splits)&&t.splits.length?null:h('div',{class:'pad',style:{paddingTop:0}},h('button',{class:'btn ghost',onClick:()=>{api.close();setTimeout(()=>openShortcutForm(null,{label:t.payee||C.name||'Atajo',icon:isT?'🔁':C.icon,color:isT?'#2748D9':C.color,type:t.type,amount:t.amount,cur:t.cur,acc:t.acc,acc2:t.acc2||'',cat:isT?'':t.cat,payee:t.payee||'',tags:t.tags||[],note:''}),240)}},'Guardar como atajo')));
  }});
}
/* ================= Atajos de entrada rápida ================= */
function runShortcut(s){
  let A=acc(s.acc);if(!A)A=activeAccounts()[0];
  if(!A){toast('Añade una cuenta primero');return}
  const isT=s.type==='transfer';
  if(isT){
    const B=acc(s.acc2);
    if(!B||B.id===A.id){toast('El atajo no tiene una cuenta de destino válida. Edítalo.');return}
  }else if(!s.cat||!cat(s.cat).id){toast('El atajo no tiene categoría. Edítalo.');return}
  if(!(parseNum(s.amount)>0)){
    openTxForm(null,{type:s.type,cur:s.cur||A.currency,acc:A.id,acc2:isT?s.acc2:'',cat:isT?'':s.cat,payee:s.payee,tags:s.tags,note:s.note});
    return;
  }
  const curr=isT?A.currency:(s.cur||A.currency);
  const t={id:uid(),type:s.type,amount:r2(parseNum(s.amount)),cur:curr,acc:A.id,acc2:isT?s.acc2:'',amount2:null,cat:isT?'':(s.cat||(s.type==='income'?'c_otrosi':'c_otros')),payee:s.payee||'',tags:s.tags||[],note:s.note||'',date:todayISO(),pending:false,excluded:false,ts:Date.now()};
  if(isT){const B=acc(s.acc2);if(B&&B.currency!==A.currency)t.amount2=r2(conv(t.amount,A.currency,B.currency))}
  S.tx.push(t);if(!isT)learn(t.payee,t.cat);LS.set('bolsillo.lastacc',t.acc);commit();
  toast(s.label+' · '+money(t.amount,t.cur,{force:true}),{undo:()=>{S.tx=S.tx.filter(x=>x.id!==t.id);commit()}});
}
function openShortcutForm(s,defs,onSaved){
  defs=defs||{};const isEdit=!!s;
  const F=s?clone(s):Object.assign({id:uid(),label:'',icon:'⚡',color:PALETTE[S.shortcuts.length%PALETTE.length],type:'expense',amount:'',cur:main(),acc:LS.get('bolsillo.lastacc')||(activeAccounts()[0]||{}).id||'',acc2:'',cat:'',payee:'',tags:[],note:''},defs);
  let amtStr=F.amount?String(F.amount).replace('.',','):'';
  const root=h('div');let sheet;
  function draw(){
    const isT=F.type==='transfer';
    const g=h('div',{class:'grp'});
    g.append(fieldRow('Nombre',h('input',{type:'text',placeholder:'Ej. Café',value:F.label,onInput:e=>{F.label=e.target.value}})));
    g.append(fieldRow('Tipo',segEl([{value:'expense',label:'Gasto'},{value:'income',label:'Ingreso'},{value:'transfer',label:'Transferencia'}],F.type,v=>{F.type=v;draw()})));
    const g2=h('div',{class:'grp'});
    g2.append(tapRow('Icono',h('span',{style:{fontSize:'20px'}},F.icon),()=>pickEmoji(e=>{F.icon=e;draw()})));
    g2.append(colorSwatches(F.color,x=>{F.color=x}));
    const g3=h('div',{class:'grp'});
    g3.append(fieldRow('Importe fijo (opcional)',h('input',{type:'text',inputmode:'decimal',placeholder:'Vacío = abrir formulario',value:amtStr,onInput:e=>{amtStr=e.target.value}})));
    if(!isT){
      const C=F.cat?cat(F.cat):null;
      g3.append(tapRow('Categoría',C&&C.id?C.icon+' '+catFull(F.cat):'Elegir categoría',()=>pickCategory({type:F.type,value:F.cat,onPick:id=>{F.cat=id;draw()}})));
    }
    const A=F.acc?acc(F.acc):null;
    g3.append(tapRow(isT?'Desde':'Cuenta',A?A.icon+' '+A.name:'Elegir cuenta',()=>pickAccount({value:F.acc,exclude:isT?F.acc2:null,onPick:id=>{F.acc=id;draw()}})));
    if(isT){
      const B=F.acc2?acc(F.acc2):null;
      g3.append(tapRow('Hacia',B?B.icon+' '+B.name:'Elegir cuenta',()=>pickAccount({title:'Cuenta de destino',value:F.acc2,exclude:F.acc,onPick:id=>{F.acc2=id;draw()}})));
    }
    g3.append(fieldRow('Concepto (opcional)',h('input',{type:'text',placeholder:'Ej. Bar de la esquina',value:F.payee,onInput:e=>{F.payee=e.target.value}}),'left'));
    const nodes=[g,g2,g3,h('div',{class:'pad'},h('button',{class:'btn',onClick:doSave},'Guardar'),
      isEdit?h('div',{class:'btnrow'},h('button',{class:'btn danger',onClick:doDelete},'Eliminar')):null)];
    root.replaceChildren(...nodes);
  }
  function doSave(){
    F.label=F.label.trim();if(!F.label){toast('Pon un nombre al atajo');return}
    if(!F.acc){toast('Elige una cuenta');return}
    const isT=F.type==='transfer';
    if(isT){if(!F.acc2||F.acc2===F.acc){toast('Elige una cuenta de destino distinta');return}F.cat=''}
    else if(!F.cat){toast('Elige una categoría');return}
    F.amount=amtStr?(parseNum(amtStr)||''):'';
    F.cur=(acc(F.acc)||{}).currency||main();
    if(isEdit)S.shortcuts=S.shortcuts.map(x=>x.id===F.id?F:x);else S.shortcuts.push(F);
    commit();sheet.close();if(onSaved)onSaved(F);
  }
  async function doDelete(){
    if(!(await confirmBox('Eliminar atajo','No se puede deshacer.','Eliminar',true)))return;
    S.shortcuts=S.shortcuts.filter(x=>x.id!==F.id);commit();sheet.close();toast('Atajo eliminado');
  }
  sheet=openSheet({title:isEdit?'Editar atajo':'Nuevo atajo',full:true,form:true,build:()=>{draw();return root}});
}
function openShortcutsList(){
  openSheet({title:'Atajos',form:true,full:true,
    actions:api=>h('button',{class:'ibtn','aria-label':'Nuevo atajo',onClick:()=>openShortcutForm(null,{},()=>api.refresh())},icon('plus',20)),
    build:api=>{
      if(!S.shortcuts.length)return emptyBox('Sin atajos','Crea accesos directos para tus movimientos habituales: un toque y listo.',h('button',{class:'btn',onClick:()=>openShortcutForm(null,{},()=>api.refresh())},'Crear el primero'));
      return h('div',null,h('div',{class:'grp',style:{marginTop:'8px'}},S.shortcuts.map(s=>h('button',{class:'row',onClick:()=>openShortcutForm(s,{},()=>api.refresh())},
        tile(s.icon,s.color),h('div',{class:'grow'},h('div',{class:'t'},s.label),h('div',{class:'s'},s.amount?money(s.amount,s.cur,{force:true}):'Abre el formulario')),icon('chev',16)))));
    }});
}
function openAccountDetail(id){
  openSheet({title:'Cuenta',full:true,build:api=>{
    const a=acc(id);if(!a){setTimeout(()=>api.close(),0);return h('div')}
    const bal=balances()[id]||0,list=filterTx({accs:[id]});
    const nodes=[h('div',{style:{textAlign:'center',padding:'4px 16px 14px'}},tile(a.icon,a.color,'lg'),h('div',{class:'muted',style:{marginTop:'6px'}},a.name+' · '+ACC_TYPES[a.type].n,investBadge(a)),h('div',{class:'num',style:{fontSize:'38px',fontWeight:'700'}},money(bal,a.currency)),a.currency!==main()?h('div',{class:'muted small'},'≈ '+money(conv(bal,a.currency,main()))):null)];
    if(a.type==='card'){
      const lim=parseNum(a.limit);const g=h('div',{class:'grp plain'});
      if(lim>0)g.append(h('div',{class:'row plain'},h('span',{class:'muted'},'Crédito disponible'),h('div',{class:'grow',style:{textAlign:'right'}},money(Math.max(0,lim+bal),a.currency))));
      const cd=parseInt(a.closing,10),dd=parseInt(a.due,10);
      if(cd){
        const t=todayISO(),d=parseISO(t);let cs=new Date(d.getFullYear(),d.getMonth(),cd);if(cs>=d){cs=new Date(d.getFullYear(),d.getMonth()-1,cd)}
        const start=addDays(iso(cs),1);const cyc=filterTx({accs:[id],from:start,types:['expense'],stats:true,nosort:true}).reduce((s,x)=>s+conv(x.amount,x.cur,a.currency),0);
        g.append(h('div',{class:'row plain'},h('span',{class:'muted'},'Gasto del ciclo actual'),h('div',{class:'grow',style:{textAlign:'right'}},money(cyc,a.currency))));
        g.append(h('div',{class:'row plain'},h('span',{class:'muted'},'Cierra el día'),h('div',{class:'grow',style:{textAlign:'right'}},String(cd))));
      }
      if(dd)g.append(h('div',{class:'row plain'},h('span',{class:'muted'},'Pago el día'),h('div',{class:'grow',style:{textAlign:'right'}},String(dd))));
      if(g.children.length)nodes.push(g);
    }
    if(a.type==='loan'){
      const g=h('div',{class:'grp plain'});
      const pay=loanPayment(bal,a.rate,a.term);
      if(a.rate)g.append(h('div',{class:'row plain'},h('span',{class:'muted'},'Interés anual'),h('div',{class:'grow',style:{textAlign:'right'}},num(parseNum(a.rate),1)+' %')));
      if(a.term)g.append(h('div',{class:'row plain'},h('span',{class:'muted'},'Plazo'),h('div',{class:'grow',style:{textAlign:'right'}},a.term+' meses')));
      if(pay>0)g.append(h('div',{class:'row plain'},h('span',{class:'muted'},'Cuota estimada'),h('div',{class:'grow',style:{textAlign:'right'}},money(pay,a.currency))));
      if(g.children.length)nodes.push(g);
      const loanBtns=[h('button',{class:'btn ghost',onClick:()=>openLoanSchedule(a)},'Cuadro de amortización')];
      if(pay>0)loanBtns.push(h('button',{class:'btn ghost',onClick:()=>openLoanRecurring(a,pay)},'Crear cuota recurrente'));
      nodes.push(h('div',{class:'btnrow',style:{padding:'0 16px 6px'}},loanBtns));
    }
    if(a.type==='invest'){
      const ci=investCheckInfo(a);
      const g=h('div',{class:'grp plain'});
      g.append(h('div',{class:'row plain'},h('span',{class:'muted'},'Última revisión'),h('div',{class:'grow',style:{textAlign:'right',color:ci.stale?'var(--warn)':null}},ci.last?('hace '+ci.since+(ci.since===1?' día':' días')):'nunca')));
      g.append(h('div',{class:'row plain'},h('span',{class:'muted'},'Aviso cada'),h('div',{class:'grow',style:{textAlign:'right'}},ci.days+' días')));
      nodes.push(g);
      nodes.push(h('div',{class:'btnrow',style:{padding:'0 16px 6px'}},h('button',{class:'btn ghost',onClick:()=>openInvestUpdate(a,api)},'Actualizar valor'),h('button',{class:'btn ghost',onClick:()=>openInvestContribute(a.id)},'Aportar')));
      const stockHoldings=(a.holdings||[]).filter(hd=>hd.assetType==='stock');
      const divBtns=[h('button',{class:'btn ghost',onClick:()=>openTxForm(null,{type:'income',acc:a.id,cur:a.currency,cat:'c_inv',payee:'',note:''})},'Registrar ingreso (dividendo, interés…)')];
      if(stockHoldings.length)divBtns.push(h('button',{class:'btn ghost',onClick:()=>openDividendScan(a)},'Detectar dividendos'));
      nodes.push(h('div',{class:'btnrow',style:{padding:'0 16px 6px'}},divBtns));
    }
    nodes.push(h('div',{class:'btnrow',style:{padding:'0 16px 14px'}},h('button',{class:'btn ghost',onClick:()=>openTxForm(null,{acc:id,cur:a.currency})},'Añadir movimiento'),h('button',{class:'btn ghost',onClick:()=>openAccountForm(a)},'Editar')));
    nodes.push(secTitle('Movimientos'));
    nodes.push(list.length?h('div',{class:'grp'},list.slice(0,60).map(t=>txRow(t,{hideAcc:true}))):h('div',{class:'grp'},emptyBox('Sin movimientos','Esta cuenta aún no tiene actividad.')));
    return h('div',null,nodes);
  }});
}
function openDividendScan(a){
  const holdings=(a.holdings||[]).filter(hd=>hd.assetType==='stock'&&hd.symbol);
  const canAuto=S.settings.priceApi&&S.settings.priceApi.url&&S.settings.priceApi.key;
  let results=null,loading=false,loaded=false;
  openSheet({title:'Dividendos',full:true,build:api=>{
    const nodes=[h('p',{class:'muted small',style:{margin:'4px 22px 12px'}},'Busca el historial real de dividendos de cada acción/ETF de «'+a.name+'» (fuente: Yahoo Finance) y te propone un pago recurrente ya calculado con tus unidades, para no tener que ir añadiéndolos a mano. Solo encontrará algo en activos que reparten en efectivo — un fondo de acumulación no tiene nada que mostrar aquí, se reinvierte solo.')];
    if(!canAuto){nodes.push(h('div',{class:'grp'},emptyBox('Falta la API de precios','Configúrala en Ajustes → Inversiones para poder consultar el historial.')));return h('div',null,nodes)}
    if(!holdings.length){nodes.push(h('div',{class:'grp'},emptyBox('Sin acciones/ETF en esta cuenta','Añade alguna en Editar cuenta (como tipo «Acción/ETF»).')));return h('div',null,nodes)}
    if(!loaded){
      nodes.push(h('div',{class:'pad'},h('button',{class:'btn ghost',disabled:loading,onClick:async()=>{
        loading=true;api.refresh();
        results=await Promise.all(holdings.map(async hd=>{
          const r=await fetchPrice(hd.symbol,'stock',a.currency,{div:true});
          if(!r.ok)return{holding:hd,ok:false,error:r.error};
          const plan=inferDividendPlan(r.dividends);
          if(!plan)return{holding:hd,ok:true,plan:null};
          const qty=parseNum(hd.qty)||0;
          const perPaymentAcc=r2(conv(r2(plan.perShare*qty),r.currency,a.currency));
          return{holding:hd,ok:true,plan,priceCur:r.currency,perPaymentAcc};
        }));
        loading=false;loaded=true;api.refresh();
      }},loading?'Buscando…':'Buscar dividendos ('+holdings.length+(holdings.length===1?' activo':' activos')+')')));
    }else{
      nodes.push(h('div',{class:'grp'},results.map(x=>{
        const hd=x.holding;
        if(!x.ok)return h('div',{class:'row plain'},h('span',{class:'grow t'},hd.symbol),h('span',{class:'s'},x.error));
        if(!x.plan)return h('div',{class:'row plain'},h('span',{class:'grow t'},hd.symbol),h('span',{class:'s'},'Sin repartos recientes (¿de acumulación?)'));
        const already=S.recurring.some(r=>r.acc===a.id&&r.payee===hd.symbol+' · dividendo'&&!r.paused);
        return h('div',{class:'row plain',style:{flexDirection:'column',alignItems:'stretch',gap:'4px'}},
          h('div',{style:{display:'flex',justifyContent:'space-between',gap:'8px'}},h('span',{class:'t'},hd.symbol),h('span',{class:'amt'},money(x.perPaymentAcc,a.currency,{force:true}))),
          h('div',{class:'s'},'Último reparto: '+fmtShort(x.plan.last.date)+' · '+num(x.plan.perShare,4)+' '+x.priceCur+'/ud · patrón '+x.plan.label),
          already?h('div',{class:'s pos'},'Ya tienes un pago recurrente para este activo'):h('button',{class:'link',style:{textAlign:'left',marginTop:'2px'},onClick:()=>{
            closeAllSheets();
            setTimeout(()=>openTxForm(null,{type:'income',acc:a.id,cur:a.currency,cat:'c_inv',payee:hd.symbol+' · dividendo',note:'Estimado a partir del historial de '+hd.symbol,amount:x.perPaymentAcc,date:x.plan.next,freq:'monthly',every:x.plan.every},'rec'),240);
          }},'Crear pago recurrente'));
      })));
      nodes.push(h('div',{class:'pad'},h('button',{class:'btn ghost',onClick:()=>{loaded=false;results=null;api.refresh()}},'Volver a buscar')));
    }
    return h('div',null,nodes);
  }});
}
function openInvestUpdate(a,parentApi){
  const curBal=balances()[a.id]||0;
  let val=curBal?num(curBal):'';
  let fetchMsg='',fetching=false,details=null;
  openSheet({title:'Actualizar valor',form:true,build:api=>{
    const inp=h('input',{type:'text',inputmode:'decimal',placeholder:'0,00',value:val,style:{textAlign:'right'},onInput:e=>{val=e.target.value}});
    const holdings=a.holdings||[];
    const canAuto=holdings.length&&S.settings.priceApi&&S.settings.priceApi.url&&S.settings.priceApi.key;
    const nodes=[h('p',{class:'muted small',style:{margin:'4px 22px 12px'}},'Indica el valor actual de «'+a.name+'». Se registra la diferencia con el saldo actual ('+money(curBal,a.currency,{force:true})+') como un movimiento de inversión, sin tocar el resto de cuentas.')];
    if(canAuto){
      nodes.push(h('div',{class:'pad',style:{paddingBottom:0}},h('button',{class:'btn ghost',disabled:fetching,onClick:async()=>{
        fetching=true;fetchMsg='Consultando '+holdings.length+(holdings.length===1?' activo…':' activos…');api.refresh();
        const r=await fetchHoldingsValue(a);
        fetching=false;details=r.details;
        if(!r.details.some(x=>x.ok)){fetchMsg='No se pudo consultar ningún precio: '+r.details.map(x=>x.holding.symbol+' ('+x.error+')').join(', ');api.refresh();return}
        val=String(r.total).replace('.',',');
        fetchMsg=r.ok?'Consultado a las '+new Date(r.asOf).toLocaleString('es-ES',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'}):'Consultado parcialmente — fallaron: '+r.details.filter(x=>!x.ok).map(x=>x.holding.symbol+' ('+x.error+')').join(', ');
        api.refresh();
      }},fetching?'Consultando…':'Consultar precios ('+holdings.length+(holdings.length===1?' activo':' activos')+')')));
      if(fetchMsg)nodes.push(h('p',{class:'muted small',style:{margin:'8px 22px 0'}},fetchMsg));
      if(details&&details.some(x=>x.ok))nodes.push(h('div',{class:'grp tight',style:{margin:'10px 16px'}},details.map(d=>h('div',{class:'row plain'},h('div',{class:'grow'},h('div',{class:'t'},d.holding.symbol),d.ok&&d.name?h('div',{class:'s'},d.name):null),h('span',{class:'s'},d.ok?(num(d.qty)+' × '+num(d.price)+' '+d.priceCur):d.error),d.ok?h('span',{class:'amt'},money(d.valueAcc,a.currency,{force:true})):null))));
    }else if(holdings.length){
      nodes.push(h('p',{class:'muted small',style:{margin:'-6px 22px 12px'}},'Tiene '+holdings.length+' activo(s) con símbolo pero no hay ninguna API de precios conectada — configúrala en Ajustes → Inversiones para sumar su valor automáticamente.'));
    }
    nodes.push(h('div',{class:'grp'},fieldRow('Valor actual',inp)));
    nodes.push(h('div',{class:'pad'},h('button',{class:'btn',onClick:()=>{
      const nv=parseNum(val);if(!isFinite(nv)){toast('Valor no válido');return}
      const diff=r2(nv-curBal);
      a.lastCheck=todayISO();
      if(diff===0){commit();api.close();if(parentApi)parentApi.refresh();toast('Sin cambios · revisión registrada');return}
      const gain=diff>0;
      S.tx.push({id:uid(),type:gain?'income':'expense',amount:Math.abs(diff),cur:a.currency,acc:a.id,acc2:'',amount2:null,cat:gain?'c_inv':'c_perdinv',payee:'',tags:[],note:'Ajuste de valor',date:todayISO(),pending:false,excluded:false,photo:false,ts:Date.now()});
      commit();api.close();if(parentApi)parentApi.refresh();toast('Valor actualizado');
    }},'Guardar')));
    return h('div',null,nodes);
  }});
}
function openLoanSchedule(a){
  openSheet({title:'Amortización',full:true,build:()=>{
    const bal=Math.abs(balances()[a.id]||0);
    const rows=loanSchedule(bal,a.rate,a.term,todayISO());
    if(!rows.length)return h('div',{class:'grp'},emptyBox('Faltan datos','Añade el interés anual y el plazo en meses desde Editar cuenta.',h('button',{class:'btn',onClick:()=>openAccountForm(a)},'Editar cuenta')));
    const pay=loanPayment(bal,a.rate,a.term),totalInt=rows.reduce((s,r)=>s+r.interest,0);
    const box=h('div');
    box.append(h('p',{class:'muted small',style:{margin:'4px 22px 12px'}},'Proyección desde hoy sobre el pendiente actual de «'+a.name+'», sistema de cuota fija (francés).'));
    box.append(h('div',{class:'split3'},h('div',null,h('div',{class:'l'},'Cuota'),h('div',{class:'v'},money(pay,a.currency))),h('div',null,h('div',{class:'l'},'Meses'),h('div',{class:'v'},String(rows.length))),h('div',null,h('div',{class:'l'},'Interés total'),h('div',{class:'v'},money(r2(totalInt),a.currency)))));
    box.append(h('div',{class:'scrollx'},h('table',{class:'mp'},
      h('tr',null,['#','Fecha','Cuota','Capital','Interés','Pendiente'].map(x=>h('th',null,x))),
      rows.map(r=>h('tr',null,h('td',null,String(r.n)),h('td',null,fmtShort(r.date)),h('td',null,num(r.payment)),h('td',null,num(r.principal)),h('td',null,num(r.interest)),h('td',null,num(r.balance)))))));
    box.append(exportBtn('amortizacion',['Mes','Fecha','Cuota','Capital','Interés','Pendiente'],rows.map(r=>[r.n,r.date,r.payment,r.principal,r.interest,r.balance])));
    return box;
  }});
}
function openLoanRecurring(a,pay){
  const others=activeAccounts().filter(x=>x.id!==a.id&&x.type!=='loan');
  if(!others.length){toast('Necesitas otra cuenta desde la que pagar la cuota');return}
  openSheet({title:'Cuota recurrente',form:true,build:api=>{
    let from=others.find(o=>o.type==='bank')?.id||others[0].id;
    const day=parseInt(a.payDay,10)||1,t=todayISO(),d=parseISO(t);
    let s=new Date(d.getFullYear(),d.getMonth(),Math.min(day,dim(d.getFullYear(),d.getMonth())));if(iso(s)<=t)s=new Date(d.getFullYear(),d.getMonth()+1,Math.min(day,dim(d.getFullYear(),d.getMonth()+1)));
    const start=iso(s);
    return h('div',null,
      h('p',{class:'muted small',style:{margin:'4px 22px 12px'}},'Se creará un pago recurrente mensual de '+money(pay,a.currency,{force:true})+' hacia «'+a.name+'», empezando el '+fmtLong(start)+'.'),
      h('div',{class:'grp'},fieldRow('Desde',selectEl(others.map(o=>({value:o.id,label:o.icon+' '+o.name})),from,v=>{from=v}))),
      h('div',{class:'pad'},h('button',{class:'btn',onClick:()=>{
        const A=acc(from),same=A.currency===a.currency;
        const r={id:uid(),type:'transfer',amount:same?r2(pay):r2(conv(pay,a.currency,A.currency)),cur:A.currency,acc:from,acc2:a.id,amount2:same?null:r2(pay),cat:'',payee:'Cuota · '+a.name,tags:[],note:'',start,freq:'monthly',every:1,auto:true,end:'',n:0,paused:false};
        S.recurring.push(r);commit();api.close();toast('Cuota recurrente creada');
      }},'Crear pago recurrente')));
  }});
}

/* ================= PRESUPUESTOS · OBJETIVOS · PAGOS ================= */
VIEWS.presu=function(){
  const box=h('div');
  const addBtn=h('button',{class:'ibtn on','aria-label':'Añadir',onClick:()=>{UI.bud==='presu'?openBudgetForm():UI.bud==='goals'?openGoalForm():openTxForm(null,{},'rec')}},icon('plus',20));
  box.append(header(UI.bud==='presu'?'Presupuestos':UI.bud==='goals'?'Objetivos':'Pagos',null,[addBtn]));
  box.append(segEl([{value:'presu',label:'Presupuestos'},{value:'goals',label:'Objetivos'},{value:'bills',label:'Suscripciones'}],UI.bud,v=>{UI.bud=v;renderView()}));
  if(UI.bud==='presu')box.append(budgetsSection());else if(UI.bud==='goals')box.append(goalsSection());else box.append(billsSection());
  return box;
};
function budgetsSection(){
  const box=h('div');
  if(!S.budgets.length){box.append(h('div',{class:'grp'},emptyBox('Crea tu primer presupuesto','Un presupuesto total controla todo el gasto del periodo; los de categorías te dicen dónde se va el dinero.',h('button',{class:'btn',onClick:()=>openBudgetForm()},'Nuevo presupuesto'))));return box}
  const p=shiftPeriod(curPeriod(),UI.budOff);
  box.append(h('div',{class:'pnav'},h('button',{'aria-label':'Periodo anterior',onClick:()=>{UI.budOff--;renderView()}},icon('left',20)),h('b',null,periodLabel(p)),h('button',{'aria-label':'Periodo siguiente',disabled:UI.budOff>=0,onClick:()=>{UI.budOff++;renderView()}},icon('right',20))));
  const infos=S.budgets.map(b=>({b,i:budgetInfo(b,shiftPeriod(periodFor(todayISO(),b.period||'cycle'),UI.budOff))}));
  const tot=infos.filter(x=>x.b.kind==='total');
  const cats=infos.filter(x=>x.b.kind!=='total');
  if(tot.length)box.append(h('div',{class:'grp'},tot.map(x=>budgetRow(x.b,x.i))));
  if(cats.length){box.append(secTitle('Por categorías'));box.append(h('div',{class:'grp'},cats.map(x=>budgetRow(x.b,x.i))))}
  box.append(h('div',{class:'chips'},h('button',{class:'chip',onClick:()=>openMoveBudget()},'Mover dinero'),h('button',{class:'chip',onClick:openReadjust},'Reajustar'),h('button',{class:'chip',onClick:()=>openBudgetForm()},'+ Nuevo')));
  return box;
}
function openBudgetDetail(id){
  openSheet({title:'Presupuesto',full:true,build:api=>{
    const b=S.budgets.find(x=>x.id===id);if(!b){setTimeout(()=>api.close(),0);return h('div')}
    const type=b.period||'cycle',p=shiftPeriod(periodFor(todayISO(),type),UI.budOff),i=budgetInfo(b,p);
    const col=i.pct>=1?'var(--neg)':i.pct>.8?'var(--warn)':'var(--accent)';
    const set=budgetCats(b);
    const txs=filterTx({from:p.start,to:p.end,types:['expense'],stats:true}).filter(t=>!set||set.has(t.cat));
    const g=h('div',{class:'grp plain'});
    const line=(l,v,c)=>h('div',{class:'row plain'},h('span',{class:'muted'},l),h('div',{class:'grow num '+(c||''),style:{textAlign:'right'}},v));
    g.append(line('Presupuesto base',money(i.base)));
    if(b.carry)g.append(line('Arrastrado de periodos anteriores','+'+money(i.carry)));
    if(i.moved)g.append(line('Movido entre presupuestos',(i.moved>0?'+':'−')+money(Math.abs(i.moved))));
    g.append(line('Disponible',money(i.avail)));g.append(line('Gastado',money(i.spent)));
    const dl=periodFor(todayISO(),type).start===p.start?dailyLimit(b):null;
    if(dl&&!dl.over)g.append(line('Puedes gastar al día',money(dl.perDay)+' ('+dl.left+' d)'));
    return h('div',null,
      h('div',{class:'gauge'},h('div',{html:gaugeSVG(i.pct,col)}),h('div',{class:'mid'},h('span',{class:'num '+(i.remaining<0?'neg':'')},money(Math.abs(i.remaining))),h('span',{class:'muted small'},i.remaining>=0?'restante · '+periodLabel(p):'por encima · '+periodLabel(p)))),
      h('div',{style:{height:'14px'}}),g,
      h('div',{class:'btnrow',style:{padding:'0 16px 6px'}},h('button',{class:'btn ghost',onClick:()=>openMoveBudget(b)},'Mover dinero'),h('button',{class:'btn ghost',onClick:()=>openBudgetForm(b)},'Editar')),
      secTitle('Movimientos incluidos ('+txs.length+')'),
      txs.length?h('div',{class:'grp'},txs.slice(0,60).map(t=>txRow(t))):h('div',{class:'grp'},emptyBox('Sin gastos','Aún no hay gastos que encajen en este periodo.')));
  }});
}
function goalsSection(){
  const box=h('div');
  if(!S.goals.length){box.append(h('div',{class:'grp'},emptyBox('Ahorra con un propósito','Fija una meta, una fecha y aporta poco a poco. Te diré cuánto necesitas al mes.',h('button',{class:'btn',onClick:()=>openGoalForm()},'Nuevo objetivo'))));return box}
  const act=S.goals.filter(g=>!goalInfo(g).done),done=S.goals.filter(g=>goalInfo(g).done);
  const row=g=>{const i=goalInfo(g);return h('button',{class:'row',onClick:()=>openGoalDetail(g.id)},
    h('div',{style:{position:'relative',width:'48px',height:'48px',flex:'none'}},h('div',{html:ringSVG(i.pct,g.color,48)}),h('div',{style:{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'19px'}},g.icon)),
    h('div',{class:'grow'},h('div',{class:'t'},g.name),h('div',{class:'s'},i.done?'¡Conseguido!':(g.date?'Hasta el '+fmtShort(g.date)+' · ':'')+'faltan '+money(i.rem,g.cur))),
    h('div',{class:'amt'},Math.round(i.pct*100)+'%',h('small',null,money(i.saved,g.cur))))};
  if(act.length)box.append(h('div',{class:'grp'},act.map(row)));
  if(done.length){box.append(secTitle('Conseguidos'));box.append(h('div',{class:'grp'},done.map(row)))}
  return box;
}
function openGoalDetail(id){
  openSheet({title:'Objetivo',full:true,build:api=>{
    const g=S.goals.find(x=>x.id===id);if(!g){setTimeout(()=>api.close(),0);return h('div')}
    const i=goalInfo(g);
    const coach=[];
    coach.push(['Progreso',i.done?'Meta alcanzada: '+money(i.saved,g.cur)+' ahorrados.':'Llevas '+Math.round(i.pct*100)+'%: te faltan '+money(i.rem,g.cur)+'.']);
    if(!i.done){
      if(g.date){
        if(i.days<0)coach.push(['Tiempo','La fecha objetivo ya pasó hace '+Math.abs(i.days)+' días. Puedes ampliarla al editar.']);
        else coach.push(['Tiempo','Quedan '+i.days+' días. Necesitas ahorrar '+money(i.perMonth,g.cur)+' al mes (unos '+money(i.perWeek,g.cur)+' por semana).']);
      }else coach.push(['Tiempo','Sin fecha objetivo. Añade una para calcular cuánto ahorrar al mes.']);
      if(i.eta)coach.push(['Ritmo',(g.date&&i.eta>g.date?'Al ritmo actual llegarías el '+fmtShort(i.eta)+', después de tu fecha objetivo.':'Al ritmo actual ('+money(i.pace,g.cur)+'/mes) llegarías el '+fmtShort(i.eta)+'.')]);
      coach.push(['Siguiente paso',g.date&&i.perMonth?'Aporta '+money(Math.ceil(i.perMonth/5)*5,g.cur)+' este mes para mantenerte en el plan.':'Haz tu primera aportación para arrancar.']);
    }
    const hist=[...(g.contribs||[])].sort((a,b)=>a.date<b.date?1:-1);
    return h('div',null,
      h('div',{style:{textAlign:'center',padding:'4px 16px 12px'}},
        h('div',{style:{position:'relative',width:'120px',height:'120px',margin:'0 auto 8px'}},h('div',{html:ringSVG(i.pct,g.color,120)}),h('div',{style:{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'44px'}},g.icon)),
        h('h2',{style:{fontSize:'22px'}},g.name),h('div',{class:'num',style:{fontSize:'30px',fontWeight:'700',marginTop:'4px'}},money(i.saved,g.cur),h('span',{class:'muted',style:{fontSize:'15px',fontWeight:'500'}},' de '+money(g.target,g.cur)))),
      h('div',{class:'btnrow',style:{padding:'0 16px 12px'}},h('button',{class:'btn',onClick:()=>openContribution(g,1)},'Aportar'),h('button',{class:'btn ghost',onClick:()=>openContribution(g,-1)},'Retirar')),
      h('div',{class:'card'},h('h3',null,'Goal Coach'),coach.map(c=>h('p',{style:{margin:'8px 0'}},h('b',{style:{fontFamily:'var(--f-d)'}},c[0]+': '),c[1]))),
      secTitle('Aportaciones',null),
      hist.length?h('div',{class:'grp plain'},hist.map(c=>h('button',{class:'row plain',onClick:async()=>{if(await confirmBox('Eliminar aportación','Se restará del objetivo.','Eliminar',true)){g.contribs=g.contribs.filter(x=>x.id!==c.id);commit()}}},h('div',{class:'grow'},h('div',{class:'t'},c.amount>=0?'Aportación':'Retirada'),h('div',{class:'s'},fmtDay(c.date)+(c.note?' · '+c.note:''))),h('div',{class:'amt '+(c.amount>=0?'pos':'')},(c.amount>=0?'+':'−')+money(Math.abs(c.amount),g.cur))))):h('div',{class:'grp'},emptyBox('Sin aportaciones','Pulsa «Aportar» para registrar la primera.')),
      h('div',{class:'pad'},h('button',{class:'btn ghost',onClick:()=>openGoalForm(g)},'Editar objetivo')));
  }});
}
function billsSection(){
  const box=h('div');
  if(!S.recurring.length){box.append(h('div',{class:'grp'},emptyBox('Controla lo que se repite','Alquiler, suscripciones, nómina… Añádelos una vez y se registrarán solos en su fecha.',h('button',{class:'btn',onClick:()=>openTxForm(null,{},'rec')},'Nuevo pago recurrente'))));return box}
  const exp=S.recurring.filter(r=>r.type==='expense'&&!r.paused),inc=S.recurring.filter(r=>r.type==='income'&&!r.paused);
  const me=exp.reduce((s,r)=>s+monthlyEq(r),0),mi=inc.reduce((s,r)=>s+monthlyEq(r),0);
  box.append(h('div',{class:'split3'},h('div',null,h('div',{class:'l'},'Gastos fijos/mes'),h('div',{class:'v'},money(me))),h('div',null,h('div',{class:'l'},'Ingresos fijos/mes'),h('div',{class:'v pos'},money(mi))),h('div',null,h('div',{class:'l'},'Al año (gastos)'),h('div',{class:'v'},money(me*12)))));
  const up=upcomingBills(30);
  if(up.length){box.append(secTitle('Próximos 30 días'));box.append(h('div',{class:'grp'},up.map(u=>billRow(u.r,u.d))))}
  box.append(secTitle('Todos'));
  box.append(h('div',{class:'grp'},[...S.recurring].sort((a,b)=>(nextDue(a)||'9999')<(nextDue(b)||'9999')?-1:1).map(r=>billRow(r,nextDue(r)||todayISO()))));
  return box;
}

/* ================= INFORMES ================= */
const REPORTS=[['flow','Ingresos vs gastos'],['cats','Categorías'],['payees','Conceptos'],['tags','Etiquetas'],['nw','Patrimonio'],['proj','Proyección anual'],['fixed','Gastos fijos']];
const RANGES=[['period','Este periodo'],['30d','30 días'],['3m','3 meses'],['6m','6 meses'],['year','Este año'],['all','Todo'],['custom','Personalizado']];
function repRange(){return UI.range==='custom'&&UI.from&&UI.to?{from:UI.from,to:UI.to}:rangeFor(UI.range==='custom'?'6m':UI.range)}
VIEWS.informes=function(){
  const box=h('div');
  box.append(header('Informes',null,[]));
  box.append(h('div',{class:'chips'},REPORTS.map(r=>h('button',{class:'chip'+(UI.rep===r[0]?' on':''),onClick:()=>{UI.rep=r[0];renderView()}},r[1]))));
  if(UI.rep!=='fixed'&&UI.rep!=='proj'){
    box.append(h('div',{class:'chips'},RANGES.map(r=>h('button',{class:'chip'+(UI.range===r[0]?' on':''),onClick:()=>{if(r[0]==='custom')openRangePicker();else{UI.range=r[0];renderView()}}},r[1]==='Personalizado'&&UI.range==='custom'&&UI.from?fmtShort(UI.from)+' – '+fmtShort(UI.to):r[1]))));
    const opts=[h('button',{class:'chip'+(UI.repAccs.length?' on':''),onClick:openRepAccounts},UI.repAccs.length?UI.repAccs.length+' cuentas':'Todas las cuentas')];
    if(UI.rep==='flow')opts.push(h('button',{class:'chip'+(UI.repInit?' on':''),onClick:()=>{UI.repInit=!UI.repInit;renderView()}},'Incluir montos iniciales'));
    box.append(h('div',{class:'chips'},opts));
  }
  const fn={flow:repFlow,cats:repCats,payees:()=>repGroup('payees'),tags:()=>repGroup('tags'),nw:repNW,proj:repProj,fixed:repFixed}[UI.rep];
  box.append(fn());
  return box;
};
function openRangePicker(){
  let f=UI.from||addDays(todayISO(),-29),t=UI.to||todayISO();
  openSheet({title:'Rango personalizado',form:true,build:api=>h('div',null,h('div',{class:'grp'},fieldRow('Desde',h('input',{type:'date',value:f,onChange:e=>{if(e.target.value)f=e.target.value}})),fieldRow('Hasta',h('input',{type:'date',value:t,onChange:e=>{if(e.target.value)t=e.target.value}}))),
    h('div',{class:'pad'},h('button',{class:'btn',onClick:()=>{if(f>t){toast('La fecha inicial debe ser anterior a la final');return}UI.from=f;UI.to=t;UI.range='custom';api.close();renderView()}},'Aplicar'))) });
}
function openRepAccounts(){
  openSheet({title:'Cuentas del informe',form:true,build:api=>{const root=h('div');const draw=()=>root.replaceChildren(h('div',{class:'grp',style:{marginTop:'8px'}},activeAccounts().map(a=>h('button',{class:'row',onClick:()=>{const i=UI.repAccs.indexOf(a.id);if(i>-1)UI.repAccs.splice(i,1);else UI.repAccs.push(a.id);draw()}},tile(a.icon,a.color),h('div',{class:'grow t'},a.name),h('span',{class:'sel'+(UI.repAccs.includes(a.id)?' on':'')},UI.repAccs.includes(a.id)?icon('check',14):null)))),
    h('div',{class:'pad'},h('button',{class:'btn',onClick:()=>{api.close();renderView()}},'Aplicar'),h('div',{class:'btnrow'},h('button',{class:'btn ghost',onClick:()=>{UI.repAccs=[];api.close();renderView()}},'Todas'))));draw();return root}});
}
function exportBtn(name,header,rows){return h('div',{class:'pad'},h('button',{class:'btn ghost',onClick:()=>saveFile('bolsillo-'+name+'-'+todayISO()+'.csv',toCSV([header].concat(rows)))},'Exportar informe (CSV)'))}
function repFlow(){
  const r=repRange(),data=flowByMonth(r.from,r.to,UI.repAccs,UI.repInit);
  const box=h('div');const inc=data.reduce((s,d)=>s+d.inc,0),exp=data.reduce((s,d)=>s+d.exp,0);
  box.append(h('div',{class:'split3'},h('div',null,h('div',{class:'l'},'Ingresos'),h('div',{class:'v pos'},money(inc))),h('div',null,h('div',{class:'l'},'Gastos'),h('div',{class:'v'},money(exp))),h('div',null,h('div',{class:'l'},'Ahorro'),h('div',{class:'v '+(inc-exp>=0?'pos':'neg')},money(inc-exp)))));
  if(!data.length||(!inc&&!exp))return h('div',null,box,h('div',{class:'grp'},emptyBox('Sin datos','No hay movimientos en este rango.')));
  box.append(h('div',{class:'card chart'},h('div',{html:barsSVG(data.map(d=>({label:monthLabel(d.key),a:d.inc,b:d.exp})))}),h('div',{class:'muted small',style:{textAlign:'center'}},h('span',{class:'pos'},'■ Ingresos  '),h('span',{class:'neg'},'■ Gastos'))));
  if(inc>0)box.append(h('div',{class:'callout'},'Tasa de ahorro del rango: ',h('b',null,Math.round((inc-exp)/inc*100)+'%')));
  box.append(h('div',{class:'grp plain'},[...data].reverse().map(d=>h('div',{class:'row plain'},h('div',{class:'grow'},h('div',{class:'t',style:{textTransform:'capitalize'}},MONTHS[+d.key.slice(5,7)-1]+' '+d.key.slice(0,4)),h('div',{class:'s'},'Ingresos '+money(d.inc)+' · Gastos '+money(d.exp))),h('div',{class:'amt '+(d.inc-d.exp>=0?'pos':'neg')},money(d.inc-d.exp))))));
  box.append(exportBtn('ingresos-gastos',['Mes','Ingresos','Gastos','Balance'],data.map(d=>[d.key,r2(d.inc),r2(d.exp),r2(d.inc-d.exp)])));
  return box;
}
function typeSeg(){return segEl([{value:'expense',label:'Gastos'},{value:'income',label:'Ingresos'}],UI.repType,v=>{UI.repType=v;renderView()})}
function repCats(){
  const r=repRange(),box=h('div');box.append(typeSeg());
  const rows=catTotals(r.from,r.to,UI.repType,UI.repAccs,true);const tot=rows.reduce((s,x)=>s+x.value,0);
  if(!rows.length)return h('div',null,box,h('div',{class:'grp'},emptyBox('Sin datos','No hay movimientos de este tipo en el rango.')));
  box.append(h('div',{class:'card'},h('div',{class:'donutbox'},h('div',{html:donutSVG(rows.map(x=>({value:x.value,color:cat(x.key).color})),190,28)}),h('div',{class:'mid'},h('span',{class:'muted small'},UI.repType==='expense'?'Gastado':'Ingresado'),h('span',{class:'num',style:{fontSize:'20px',fontWeight:'700'}},money(tot,undefined,{int:tot>=1000}))))));
  box.append(h('div',{class:'grp'},rows.map(x=>{const c=cat(x.key);return h('button',{class:'row',onClick:()=>openCatDrill(x.key,r)},tile(c.icon,c.color),h('div',{class:'grow'},h('div',{class:'t'},c.name),h('div',{class:'bar',style:{marginTop:'5px',height:'5px'}},h('i',{style:{width:Math.round(x.value/tot*100)+'%',background:c.color}}))),h('div',{class:'amt'},money(x.value),h('small',null,(x.value/tot*100).toFixed(1).replace('.',',')+'%')))})));
  box.append(exportBtn('categorias',['Categoría','Importe','Porcentaje'],rows.map(x=>[cat(x.key).name,r2(x.value),r2(x.value/tot*100)])));
  return box;
}
function openCatDrill(rootId,r){
  openSheet({title:cat(rootId).name,full:true,build:()=>{
    const ids=catWithChildren(rootId);const list=filterTx({from:r.from,to:r.to,cats:ids,stats:true,accs:UI.repAccs});
    const subs=catTotals(r.from,r.to,UI.repType,UI.repAccs,false).filter(x=>ids.includes(x.key));
    return h('div',null,subs.length>1?h('div',{class:'grp'},subs.map(x=>h('div',{class:'row'},tile(cat(x.key).icon,cat(x.key).color),h('div',{class:'grow t'},cat(x.key).name),h('div',{class:'amt'},money(x.value))))):null,
      secTitle('Movimientos ('+list.length+')'),h('div',{class:'grp'},list.slice(0,80).map(t=>txRow(t))));
  }});
}
function repGroup(kind){
  const r=repRange(),box=h('div');box.append(typeSeg());
  const rows=(kind==='payees'?totalsBy(r.from,r.to,UI.repType,t=>t.payee?[t.payee]:[],UI.repAccs):totalsBy(r.from,r.to,UI.repType,t=>t.tags||[],UI.repAccs)).slice(0,40);
  if(!rows.length)return h('div',null,box,h('div',{class:'grp'},emptyBox('Sin datos',kind==='payees'?'Pon un concepto a tus movimientos para verlos agrupados aquí.':'Añade etiquetas (#viaje) a tus movimientos para verlas aquí.')));
  const mx=rows[0].value;
  box.append(h('div',{class:'grp'},rows.map(x=>h('button',{class:'row',onClick:()=>{UI.filt=Object.assign({types:[],accs:[],cats:[],pending:false,tag:'',from:r.from,to:r.to});if(kind==='tags')UI.filt.tag=x.key;else UI.q=x.key;UI.tab='movs';renderView();window.scrollTo(0,0)}},
    h('span',{class:'tile',style:{background:'var(--accent-soft)',color:'var(--accent)'}},kind==='tags'?'#':'👤'),
    h('div',{class:'grow'},h('div',{class:'t'},x.key),h('div',{class:'bar',style:{marginTop:'5px',height:'5px'}},h('i',{style:{width:Math.round(x.value/mx*100)+'%'}}))),h('div',{class:'amt'},money(x.value))))));
  box.append(exportBtn(kind==='payees'?'conceptos':'etiquetas',[kind==='payees'?'Concepto':'Etiqueta','Importe'],rows.map(x=>[x.key,r2(x.value)])));
  return box;
}
function repNW(){
  const r=repRange(),box=h('div'),today=todayISO();
  const keys=monthsBetween(r.from,r.to),dates=keys.map(k=>{const e=addDays(addMonths(k+'-01',1),-1);return e>today?today:e});
  const ser=netWorthSeries(dates);
  if(ser.length<2)return h('div',null,h('div',{class:'grp'},emptyBox('Faltan datos','Amplía el rango para ver la evolución de tu patrimonio.')));
  const ch=ser[ser.length-1]-ser[0];
  box.append(h('div',{class:'split3'},h('div',null,h('div',{class:'l'},'Ahora'),h('div',{class:'v'},money(ser[ser.length-1]))),h('div',null,h('div',{class:'l'},'Inicio'),h('div',{class:'v'},money(ser[0]))),h('div',null,h('div',{class:'l'},'Cambio'),h('div',{class:'v '+(ch>=0?'pos':'neg')},(ch>=0?'+':'−')+money(Math.abs(ch))))));
  box.append(h('div',{class:'card chart'},h('div',{html:lineSVG(ser,keys.map(monthLabel),{h:170})})));
  const bal=balances();
  box.append(h('div',{class:'grp'},activeAccounts().map(a=>h('div',{class:'row'},tile(a.icon,a.color),h('div',{class:'grow t'},a.name),h('div',{class:'amt '+((bal[a.id]||0)<0?'neg':'')},money(conv(bal[a.id]||0,a.currency,main())))))));
  box.append(exportBtn('patrimonio',['Mes','Patrimonio'],keys.map((k,i)=>[k,r2(ser[i])])));
  return box;
}
function repProj(){
  const box=h('div'),today=todayISO(),y=+today.slice(0,4),jan=y+'-01-01';
  const monthsDone=Math.max(1,parseISO(today).getMonth()+parseISO(today).getDate()/dim(y,parseISO(today).getMonth()));
  const ytd=periodTotals({start:jan,end:today});
  const back=addMonths(today.slice(0,8)+'01',-3),rec=periodTotals({start:back,end:addDays(today.slice(0,8)+'01',-1)});
  const hasRec=S.tx.some(t=>t.date>=back&&t.date<today.slice(0,8)+'01');
  const mInc=hasRec?rec.inc/3:ytd.inc/monthsDone,mExp=hasRec?rec.exp/3:ytd.exp/monthsDone;
  if(!S.tx.length)return h('div',null,h('div',{class:'grp'},emptyBox('Sin datos para proyectar','Necesito algunos movimientos para estimar cómo acabarás el año.')));
  const mLeft=12-monthsDone,projInc=ytd.inc+mInc*mLeft,projExp=ytd.exp+mExp*mLeft,nw=netWorth();
  const endNW=nw+(mInc-mExp)*mLeft;
  const pts=[nw],labels=[monthLabel(today.slice(0,7))];
  for(let m=parseISO(today).getMonth()+1;m<12;m++){pts.push(nw+(mInc-mExp)*(m-parseISO(today).getMonth()));labels.push(MON[m])}
  pts.push(endNW);labels.push('dic');
  box.append(h('div',{class:'split3'},h('div',null,h('div',{class:'l'},'Ingresos '+y),h('div',{class:'v pos'},money(projInc))),h('div',null,h('div',{class:'l'},'Gastos '+y),h('div',{class:'v'},money(projExp))),h('div',null,h('div',{class:'l'},'Ahorro '+y),h('div',{class:'v '+(projInc-projExp>=0?'pos':'neg')},money(projInc-projExp)))));
  box.append(h('div',{class:'card chart'},h('h3',{style:{padding:'0 6px'}},'Patrimonio proyectado a diciembre'),h('div',{html:lineSVG(pts,labels,{h:160,dashFrom:0})}),h('div',{style:{textAlign:'center',padding:'4px'}},h('span',{class:'num',style:{fontSize:'22px',fontWeight:'700'}},money(endNW)))));
  box.append(h('div',{class:'callout'},'Estimación con tu media mensual reciente: ingresas ',h('b',null,money(mInc)),' y gastas ',h('b',null,money(mExp)),' al mes. Es una proyección lineal, no una promesa.'));
  return box;
}
function repFixed(){
  const box=h('div'),exp=S.recurring.filter(r=>r.type==='expense'&&!r.paused).sort((a,b)=>monthlyEq(b)-monthlyEq(a));
  if(!exp.length)return h('div',null,h('div',{class:'grp'},emptyBox('Sin gastos fijos','Añade pagos recurrentes en Presupuestos → Suscripciones.',h('button',{class:'btn',onClick:()=>openTxForm(null,{},'rec')},'Nuevo pago recurrente'))));
  const me=exp.reduce((s,r)=>s+monthlyEq(r),0);
  box.append(h('div',{class:'split3'},h('div',null,h('div',{class:'l'},'Al mes'),h('div',{class:'v'},money(me))),h('div',null,h('div',{class:'l'},'Al año'),h('div',{class:'v'},money(me*12))),h('div',null,h('div',{class:'l'},'Pagos'),h('div',{class:'v'},String(exp.length)))));
  box.append(h('div',{class:'grp'},exp.map(r=>{const c=cat(r.cat);return h('button',{class:'row',onClick:()=>openTxForm(r,{},'rec')},tile(c.icon,c.color),h('div',{class:'grow'},h('div',{class:'t'},r.payee||c.name),h('div',{class:'s'},FREQ[r.freq]+' · '+money(r.amount,r.cur))),h('div',{class:'amt'},money(monthlyEq(r)),h('small',null,'al mes')))})));
  box.append(exportBtn('gastos-fijos',['Pago','Frecuencia','Importe','Mensual equivalente'],exp.map(r=>[r.payee||cat(r.cat).name,FREQ[r.freq],r2(r.amount),r2(monthlyEq(r))])));
  return box;
}
/* ================= CSV / copia de seguridad / demo ================= */
let REAL_MEM=null;
function demoGuard(){if(S.settings.demo){toast('Sal del modo demo para hacer esto con tus datos reales');return true}return false}

/* ---------- CSV ---------- */
function csvCell(v){
  if(v==null)return '';
  if(typeof v==='number')return String(v).replace('.',',');
  v=String(v);return /[";\r\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;
}
const toCSV=rows=>'\ufeff'+rows.map(r=>r.map(csvCell).join(';')).join('\r\n');
function parseCSV(text){
  text=String(text||'').replace(/^\ufeff/,'');
  const head=text.split(/\r?\n/,1)[0]||'';
  let d=';',best=-1;
  for(const c of[';','\t',',']){let n=0,q=false;for(const ch of head){if(ch==='"')q=!q;else if(!q&&ch===c)n++}if(n>best){best=n;d=c}}
  const rows=[];let row=[],cur='',q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(q){if(c==='"'){if(text[i+1]==='"'){cur+='"';i++}else q=false}else cur+=c}
    else if(c==='"')q=true;
    else if(c===d){row.push(cur);cur=''}
    else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cur);cur='';if(row.some(x=>x.trim()!==''))rows.push(row);row=[]}
    else cur+=c;
  }
  row.push(cur);if(row.some(x=>x.trim()!==''))rows.push(row);
  return rows.map(r=>r.map(x=>x.trim()));
}
function parseDateLoose(s,mdy){
  s=String(s||'').trim();let y,m,d,x;
  if((x=s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/))){y=+x[1];m=+x[2];d=+x[3]}
  else if((x=s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/))){y=+x[3];if(y<100)y+=2000;if(mdy){m=+x[1];d=+x[2]}else{d=+x[1];m=+x[2]}}
  else return null;
  if(m<1||m>12||d<1||y<1990||y>2100||d>dim(y,m-1))return null;
  return y+'-'+pad(m)+'-'+pad(d);
}
function guessCat(text,type){
  const want=type==='income'?'income':'expense',t=norm(text);if(!t)return null;
  const okCat=id=>{const c=S.categories.find(x=>x.id===id);return c&&c.type===want?id:null};
  const byName=S.categories.filter(c=>c.type===want).map(c=>({c,k:norm(c.name)})).filter(x=>x.k.length>=3).sort((a,b)=>b.k.length-a.k.length);
  for(const x of byName)if(t.includes(x.k))return x.c.id;
  const words=t.split(/[^a-z0-9ñ]+/).filter(Boolean);
  for(const w of words)if(S.memory[w]&&okCat(S.memory[w]))return S.memory[w];
  const order=want==='income'?['nomina','negocio','inv','reemb']:['cafe','rest','gas','publico','taxi','super','comer','transp','viv','fact','subs','salud','compras','ocio','viajes','edu','dep','masc','imp'];
  for(const k of order){const list=(KW[k]||'').split(' ');for(const w of words)if(list.includes(w)&&okCat('c_'+k))return 'c_'+k}
  return null;
}

/* ---------- guardar / descargar un archivo ---------- */
async function saveFile(name,data){
  let dl=null;
  try{if(window.claude&&typeof window.claude.use==='function')dl=await window.claude.use('downloads')}catch(e){dl=null}
  if(dl){
    try{await dl.save({filename:name,data});toast('Archivo listo: '+name);return true}
    catch(e){
      const code=e&&e.code;
      if(code==='declined')return false;
      if(code==='rate_limited'){toast('Espera un momento y vuelve a intentarlo');return false}
    }
  }else if(!window.claude){
    try{
      const url=URL.createObjectURL(new Blob([data],{type:'text/plain;charset=utf-8'}));
      const a=h('a',{href:url,download:name});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);
      toast('Descargando '+name);return true;
    }catch(e){}
  }
  showTextExport(name,data);return false;
}
function showTextExport(name,data){
  openSheet({title:name,form:true,build:api=>{
    const ta=h('textarea',{class:'bulk',readonly:true,style:{minHeight:'220px'}});ta.value=data;
    return h('div',null,
      h('p',{class:'muted small',style:{margin:'4px 22px 10px'}},'Este entorno no permite guardar archivos directamente. Copia el contenido y pégalo en un archivo nuevo con el nombre indicado.'),
      ta,h('div',{class:'pad'},h('button',{class:'btn',onClick:async()=>{
        try{await navigator.clipboard.writeText(data);toast('Copiado al portapapeles')}
        catch(e){ta.removeAttribute('readonly');ta.select();try{document.execCommand('copy');toast('Copiado al portapapeles')}catch(_){toast('Selecciona el texto y cópialo manualmente')}ta.setAttribute('readonly','')}
      }},'Copiar')));
  }});
}
function readFileText(accept){
  return new Promise(res=>{
    const inp=h('input',{type:'file',accept:accept||'',style:{display:'none'}});
    inp.addEventListener('change',async()=>{const f=inp.files&&inp.files[0];inp.remove();if(!f)return res(null);try{res(await f.text())}catch(e){res(null)}});
    document.body.append(inp);inp.click();
  });
}

/* ---------- exportar ---------- */
function exportTxCSV(){
  const rows=[['Fecha','Tipo','Importe','Moneda','Cuenta','Cuenta destino','Categoría','Concepto','Etiquetas','Nota','Pendiente']];
  for(const t of filterTx({all:true})){
    const isT=t.type==='transfer',sign=t.type==='expense'?-1:1;
    if(!isT&&Array.isArray(t.splits)&&t.splits.length){
      for(const sp of t.splits)rows.push([t.date,t.type==='income'?'Ingreso':'Gasto',r2(sign*sp.amount),t.cur,(acc(t.acc)||{}).name||'','',catFull(sp.cat),t.payee||'',(t.tags||[]).join(' '),t.note||'',t.pending?'sí':'']);
      continue;
    }
    rows.push([t.date,isT?'Transferencia':t.type==='income'?'Ingreso':'Gasto',r2(sign*t.amount),t.cur,(acc(t.acc)||{}).name||'',isT?((acc(t.acc2)||{}).name||''):'',isT?'':catFull(t.cat),t.payee||'',(t.tags||[]).join(' '),t.note||'',t.pending?'sí':'']);
  }
  if(rows.length===1){toast('Todavía no hay movimientos que exportar');return}
  return saveFile('bolsillo-movimientos-'+todayISO()+'.csv',toCSV(rows));
}
function backupJSON(){return JSON.stringify({app:'bolsillo',version:1,exported:new Date().toISOString(),data:S},null,1)}
function exportBackup(){
  if(demoGuard())return;flush();
  return saveFile('bolsillo-copia-'+todayISO()+'.json',backupJSON());
}
function openRestore(){
  if(demoGuard())return;
  openSheet({title:'Restaurar copia',form:true,build:api=>{
    let text='';
    const ta=h('textarea',{class:'bulk',placeholder:'…o pega aquí el contenido del archivo .json',onInput:e=>{text=e.target.value}});
    return h('div',null,
      h('p',{class:'muted small',style:{margin:'4px 22px 12px'}},'Reemplaza todos los datos actuales por los de una copia de seguridad de Bolsillo. Las fotos de recibos no se incluyen en la copia.'),
      h('div',{class:'pad'},h('button',{class:'btn',onClick:async()=>{const t=await readFileText('.json,application/json');if(t)applyBackup(t)}},'Elegir archivo .json')),
      h('div',{style:{height:'12px'}}),ta,
      h('div',{class:'pad'},h('button',{class:'btn ghost',onClick:()=>{if(!text.trim()){toast('Pega primero el contenido');return}applyBackup(text)}},'Restaurar desde el texto')));
  }});
}
async function applyBackup(text){
  let o;try{o=JSON.parse(text)}catch(e){toast('El archivo no es un JSON válido');return}
  const d=o&&o.app==='bolsillo'?o.data:o;
  if(!d||!Array.isArray(d.tx)||!Array.isArray(d.accounts)){toast('No parece una copia de Bolsillo');return}
  if(!(await confirmBox('Restaurar copia','Se reemplazarán tus datos actuales ('+S.tx.length+' movimientos) por los de la copia ('+d.tx.length+' movimientos). Esta acción no se puede deshacer.','Restaurar',true)))return;
  const lock=S.settings.lock;
  setS(d);migrate();S.settings.demo=false;S.settings.lock=lock;S.settings.onboarded=true;
  flush();applyTheme();closeAllSheets();UI.tab='resumen';commit();toast('Copia restaurada');
}
async function resetAll(){
  if(demoGuard())return;
  if(!(await confirmBox('Borrar todos los datos','Se eliminan cuentas, movimientos, presupuestos, objetivos y ajustes de «'+spaceLabel(SPACE)+'» (este espacio). El otro espacio no se ve afectado. Antes de seguir, considera exportar una copia.','Continuar',true)))return;
  if(!(await confirmBox('¿Seguro del todo?','No hay vuelta atrás.','Borrar todo',true)))return;
  try{if(Photos.db){Photos.db.close();Photos.db=null}indexedDB.deleteDatabase('bolsillo-photos')}catch(e){}
  LS.del(realKey());LS.del('bolsillo.lastacc');
  setS(freshState());flush();applyTheme();closeAllSheets();UI.tab='resumen';UI.off=0;commit();toast('Datos borrados');
}

/* ---------- importar CSV ---------- */
const CSV_FIELDS=[['date','Fecha'],['amount','Importe'],['debit','Cargo (gasto)'],['credit','Abono (ingreso)'],['type','Tipo'],['payee','Concepto'],['cat','Categoría'],['acc','Cuenta'],['acc2','Cuenta destino'],['cur','Moneda'],['tags','Etiquetas'],['note','Nota']];
const CSV_GUESS=[['acc2',/destino|transfer.*to|to.?account/],['date',/^(fecha|date|dia|day|f\.? ?oper|f\.? ?valor)/],['debit',/^(cargo|debe|debit|salida|retiro|gasto)s?$/],['credit',/^(abono|haber|credit|entrada|deposito|ingreso)s?$/],['amount',/importe|amount|cantidad|monto|valor|total|quantity/],['type',/^(tipo|type)/],['cat',/categ/],['acc',/cuenta|account|banco|wallet|monedero/],['cur',/moneda|divisa|currency/],['tags',/etiq|tag/],['note',/^(nota|notas|note|notes|comentario|observ)/],['payee',/concepto|descrip|benefic|payee|comercio|detalle|movimiento|merchant|titulo/]];
function csvAutoMap(header){
  const m={},used=new Set();
  for(const[f,re]of CSV_GUESS){const i=header.findIndex((c,i)=>!used.has(i)&&re.test(norm(c)));if(i>-1){m[f]=i;used.add(i)}}
  return m;
}
function csvSniff(row){
  const m={};
  row.forEach((c,i)=>{if(m.date==null&&parseDateLoose(c))m.date=i});
  row.forEach((c,i)=>{if(i!==m.date&&m.amount==null&&/^[-+]?[\d.,\s€$£]+$/.test(c)&&isFinite(parseNum(c)))m.amount=i});
  row.forEach((c,i)=>{if(i!==m.date&&i!==m.amount&&m.payee==null&&/[a-zA-ZÀ-ÿ]/.test(c))m.payee=i});
  return m;
}
function openImportCSV(){
  if(demoGuard())return;
  let rows=null,hasHead=true,map={};
  const opt={acc:(defaultAcc()||{}).id,mdy:false,invert:false,skipDup:true};
  let sheet;
  const ans=async()=>{const t=await readFileText('.csv,.txt,text/csv,text/plain');if(t!=null)load(t)};
  function load(text){
    const r=parseCSV(text);
    if(r.length<1||r[0].length<2){toast('No he podido leer columnas en ese texto');return}
    rows=r;hasHead=r.length>1&&!r[0].some(c=>parseDateLoose(c));
    map=hasHead?csvAutoMap(r[0]):csvSniff(r[0]);
    sheet.refresh();
  }
  function convertRow(r){
    const g=f=>map[f]!=null&&map[f]>-1?(r[map[f]]==null?'':r[map[f]]):'';
    const date=parseDateLoose(g('date'),opt.mdy);if(!date)return null;
    let amount,type;
    const hasDC=(map.debit!=null&&map.debit>-1)||(map.credit!=null&&map.credit>-1);
    if(hasDC){
      const d=Math.abs(parseNum(g('debit')))||0,c=Math.abs(parseNum(g('credit')))||0;
      amount=c-d;if(opt.invert)amount=-amount;
    }else{
      amount=parseNum(g('amount'));if(!isFinite(amount))return null;if(opt.invert)amount=-amount;
    }
    if(!isFinite(amount)||amount===0)return null;
    type=amount>0?'income':'expense';const signType=type;
    const tk=norm(g('type'));
    if(tk){
      if(/transf|traspaso/.test(tk))type='transfer';
      else if(/ingreso|income|abono|entrada|cobro|deposit/.test(tk))type='income';
      else if(/gasto|expense|cargo|salida|pago|retiro/.test(tk))type='expense';
    }
    amount=Math.abs(amount);
    const acc2=g('acc2');if(type==='transfer'&&!acc2)type=signType;
    const cur=g('cur').toUpperCase().trim();
    return{date,type,amount:r2(amount),payee:g('payee').slice(0,80),catName:g('cat'),accName:g('acc'),acc2Name:acc2,cur:S.settings.rates[cur]?cur:'',tags:g('tags').split(/[,;\s]+/).map(x=>x.replace(/^#/,'').toLowerCase()).filter(Boolean),note:g('note').slice(0,200)};
  }
  function analyze(){
    const body=hasHead?rows.slice(1):rows,out=[];let bad=0,dups=0;
    const seen=new Set(S.tx.map(t=>t.date+'|'+Math.round(t.amount*100)+'|'+norm(t.payee||'').slice(0,20)+'|'+t.type));
    for(const r of body){
      const x=convertRow(r);if(!x){bad++;continue}
      const k=x.date+'|'+Math.round(x.amount*100)+'|'+norm(x.payee).slice(0,20)+'|'+x.type;
      if(opt.skipDup&&seen.has(k)){dups++;continue}
      seen.add(k);out.push(x);
    }
    return{out,bad,dups};
  }
  function doImport(list){
    const newAcc=[],newCat=[],newTx=[],accCache={};
    const resolveAcc=name=>{
      if(!name)return opt.acc;
      const k=norm(name);if(k in accCache)return accCache[k];
      let a=S.accounts.find(x=>norm(x.name)===k)||S.accounts.find(x=>{const n=norm(x.name);return n.length>=4&&(n.includes(k)||k.includes(n))});
      if(!a){a={id:uid(),name:name.slice(0,40),type:'bank',currency:main(),initial:0,icon:'🏦',color:PALETTE[S.accounts.length%PALETTE.length]};S.accounts.push(a);newAcc.push(a.id)}
      accCache[k]=a.id;return a.id;
    };
    const resolveCat=(name,type,payee)=>{
      if(type==='transfer')return '';
      if(name){
        const leaf=name.split(/[›>/]/).pop().trim(),k=norm(leaf);
        if(k){
          let c=S.categories.find(x=>norm(x.name)===k&&x.type===type)||S.categories.find(x=>norm(x.name)===k);
          if(!c){c={id:'c_'+uid(),name:leaf.slice(0,40),icon:'🏷️',color:PALETTE[S.categories.length%PALETTE.length],type,parent:null};S.categories.push(c);newCat.push(c.id)}
          return c.id;
        }
      }
      return guessCat(payee,type)||(type==='income'?'c_otrosi':'c_otros');
    };
    list.forEach((x,i)=>{
      const accId=resolveAcc(x.accName),A=acc(accId);
      let type=x.type,acc2='';
      if(type==='transfer'){acc2=resolveAcc(x.acc2Name);if(!acc2||acc2===accId)type='expense'}
      const t={id:uid(),type,amount:x.amount,cur:x.cur||(A?A.currency:main()),acc:accId,acc2:type==='transfer'?acc2:'',amount2:null,cat:resolveCat(x.catName,type,x.payee),payee:x.payee,tags:x.tags,note:x.note,date:x.date,pending:false,excluded:false,photo:false,ts:Date.now()+i};
      S.tx.push(t);newTx.push(t.id);
      if(x.catName&&t.cat&&x.payee)learn(x.payee,t.cat);
    });
    commit();sheet.close();
    const ids=new Set(newTx);
    toast(newTx.length+' movimientos importados',{ms:6000,undo:()=>{S.tx=S.tx.filter(t=>!ids.has(t.id));S.accounts=S.accounts.filter(a=>!newAcc.includes(a.id));S.categories=S.categories.filter(c=>!newCat.includes(c.id));commit()}});
  }
  sheet=openSheet({title:'Importar CSV',full:true,form:true,build:api=>{
    if(!rows){
      let text='';
      return h('div',null,
        h('p',{class:'muted small',style:{margin:'4px 22px 12px'}},'Sube un CSV exportado de tu banco u otra app (incluido el de Bolsillo). Detecto separador, columnas y formato de fecha; podrás revisarlo antes de importar.'),
        h('div',{class:'pad'},h('button',{class:'btn',onClick:ans},'Elegir archivo CSV')),
        h('div',{style:{height:'12px'}}),
        h('textarea',{class:'bulk',placeholder:'…o pega aquí las filas',onInput:e=>{text=e.target.value}}),
        h('div',{class:'pad'},h('button',{class:'btn ghost',onClick:()=>{if(!text.trim()){toast('Pega primero algunas filas');return}load(text)}},'Analizar texto')));
    }
    const ncol=Math.max(...rows.map(r=>r.length));
    const colName=i=>hasHead&&rows[0][i]?rows[0][i]:'Columna '+(i+1);
    const colOpts=[{value:-1,label:'— ninguna —'}].concat(Array.from({length:ncol},(_,i)=>({value:i,label:colName(i)})));
    const g1=h('div',{class:'grp'});
    g1.append(h('div',{class:'field'},h('span',{style:{flex:1}},'La primera fila son cabeceras'),switchEl(hasHead,v=>{hasHead=v;map=hasHead?csvAutoMap(rows[0]):csvSniff(rows[0]);sheet.refresh()})));
    const g2=h('div',{class:'grp'});
    for(const[f,label]of CSV_FIELDS){
      const cur=map[f]!=null?map[f]:-1;
      const sel=h('select',null,colOpts.map(o=>h('option',{value:String(o.value)},o.label)));sel.value=String(cur);
      sel.addEventListener('change',()=>{const v=+sel.value;if(v<0)delete map[f];else map[f]=v;sheet.refresh()});
      g2.append(fieldRow(label,sel));
    }
    const g3=h('div',{class:'grp'});
    g3.append(fieldRow('Cuenta por defecto',selectEl(activeAccounts().map(a=>({value:a.id,label:a.name})),opt.acc,v=>{opt.acc=v})));
    g3.append(fieldRow('Formato de fecha',selectEl([{value:'dmy',label:'Día/mes/año'},{value:'mdy',label:'Mes/día/año'}],opt.mdy?'mdy':'dmy',v=>{opt.mdy=v==='mdy';sheet.refresh()})));
    g3.append(h('div',{class:'field'},h('span',{style:{flex:1}},'Invertir signo de los importes'),switchEl(opt.invert,v=>{opt.invert=v;sheet.refresh()})));
    g3.append(h('div',{class:'field'},h('span',{style:{flex:1}},'Omitir duplicados'),switchEl(opt.skipDup,v=>{opt.skipDup=v;sheet.refresh()})));
    const A=analyze();
    const prev=h('div',{class:'scrollx'},h('table',{class:'mp'},
      h('tr',null,['Fecha','Tipo','Importe','Concepto','Categoría'].map(x=>h('th',null,x))),
      A.out.slice(0,6).map(x=>h('tr',null,h('td',null,x.date),h('td',null,x.type==='income'?'Ingreso':x.type==='transfer'?'Transf.':'Gasto'),h('td',null,num(x.amount)),h('td',null,x.payee||'—'),h('td',null,x.catName||cat(guessCat(x.payee,x.type)||'').name)))));
    return h('div',null,g1,
      h('div',{class:'sectitle'},h('h2',null,'Columnas')),g2,
      h('div',{class:'sectitle'},h('h2',null,'Opciones')),g3,
      h('div',{class:'sectitle'},h('h2',null,'Vista previa')),prev,
      h('p',{class:'muted small',style:{margin:'0 22px 12px'}},A.out.length+' movimientos listos · '+A.bad+' filas descartadas'+(A.dups?' · '+A.dups+' duplicados omitidos':'')+'. Si una cuenta o categoría del archivo no existe, se creará.'),
      h('div',{class:'pad'},h('button',{class:'btn',disabled:!A.out.length,onClick:()=>{if(!A.out.length)return;doImport(A.out)}},A.out.length?'Importar '+A.out.length+' movimientos':'Nada que importar')));
  }});
}

/* ---------- modo demo ---------- */
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function buildDemo(){
  const D=freshState(),R=mulberry(20260920);
  const rnd=(a,b)=>a+R()*(b-a),pick=a=>a[Math.floor(R()*a.length)],m2=v=>Math.round(v*100)/100;
  D.settings.demo=true;D.settings.onboarded=true;D.settings.lock=S&&S.settings?S.settings.lock:null;
  D.settings.theme=S&&S.settings?S.settings.theme:'auto';D.settings.accent=S&&S.settings?S.settings.accent:'#2748D9';
  D.accounts=[
    {id:'a_cash',name:'Efectivo',type:'cash',currency:'EUR',initial:140,icon:'💵',color:'#3FA34D'},
    {id:'a_bank',name:'Cuenta nómina',type:'bank',currency:'EUR',initial:1850,icon:'🏦',color:'#2748D9'},
    {id:'a_card',name:'Visa',type:'card',currency:'EUR',initial:0,icon:'💳',color:'#E8833A',closing:25,due:5,limit:2500},
    {id:'a_sav',name:'Ahorro',type:'savings',currency:'EUR',initial:3900,icon:'🐖',color:'#0F8A5C'}];
  const t=todayISO(),start=addDays(t,-145);
  const push=o=>D.tx.push(Object.assign({id:uid(),tags:[],note:'',pending:false,excluded:false,photo:false,acc2:'',amount2:null,cur:'EUR',payee:'',ts:Date.now()+D.tx.length},o));
  const exp=(date,c,payee,amount,a,tags)=>push({type:'expense',date,cat:c,payee,amount:m2(amount),acc:a,tags:tags||[]});
  for(let i=0;i<=145;i++){
    const d=addDays(start,i),wd=parseISO(d).getDay();
    if(i%3===0||R()<.12)exp(d,'c_super',pick(['Mercadona','Mercadona','Carrefour','Lidl','Dia']),rnd(11,64),R()<.6?'a_card':'a_bank');
    if(wd>0&&wd<6&&R()<.6)exp(d,'c_cafe',pick(['Café Marina','Starbucks','Federal Café']),rnd(1.4,3.4),R()<.7?'a_cash':'a_card');
    if((wd===5||wd===6||wd===0)&&R()<.55)exp(d,'c_rest',pick(['La Taberna','Sushi Zen','Pizzería Napoli','El Rincón']),rnd(14,52),'a_card',R()<.2?['amigos']:[]);
    if(R()<.035)exp(d,'c_taxi',pick(['Cabify','Uber','Taxi']),rnd(7,24),'a_card');
    if(i%12===5)exp(d,'c_gas','Repsol',rnd(34,62),'a_card');
    if(R()<.11)exp(d,'c_compras',pick(['Amazon','Zara','Decathlon','IKEA']),rnd(14,110),'a_card');
    if(R()<.08)exp(d,'c_ocio',pick(['Cine Yelmo','Concierto','Bolera']),rnd(8,42),'a_card');
    if(R()<.05)exp(d,'c_salud','Farmacia',rnd(5,28),'a_cash');
  }
  // trabajos freelance
  push({type:'income',date:addDays(t,-96),cat:'c_negocio',payee:'Cliente web',amount:450,acc:'a_bank',tags:['freelance']});
  push({type:'income',date:addDays(t,-41),cat:'c_negocio',payee:'Cliente web',amount:720,acc:'a_bank',tags:['freelance']});
  // pago mensual de la tarjeta y ahorro
  const mo=n=>{const d=parseISO(t);return new Date(d.getFullYear(),d.getMonth()+n,1)};
  for(let n=-4;n<=-1;n++){
    const b=mo(n),key=b.getFullYear()+'-'+pad(b.getMonth()+1);
    const spent=D.tx.filter(x=>x.acc==='a_card'&&x.type==='expense'&&x.date.slice(0,7)===key).reduce((s,x)=>s+x.amount,0);
    const nx=mo(n+1),pd=nx.getFullYear()+'-'+pad(nx.getMonth()+1)+'-05';
    if(spent>0&&pd<=t&&pd>=start)push({type:'transfer',date:pd,cat:'',amount:m2(spent),acc:'a_bank',acc2:'a_card',note:'Pago de la tarjeta'});
  }
  for(let n=-4;n<=0;n++){const b=mo(n),d=b.getFullYear()+'-'+pad(b.getMonth()+1)+'-02';if(d<=t&&d>=start)push({type:'transfer',date:d,cat:'',amount:250,acc:'a_bank',acc2:'a_sav',note:'Ahorro mensual'})}
  // pagos recurrentes (materialize() genera el histórico)
  const b0=mo(-4);
  const rec=(type,c,payee,amount,day,a)=>D.recurring.push({id:uid(),type,amount,cur:'EUR',acc:a,cat:c,payee,tags:[],note:'',start:iso(new Date(b0.getFullYear(),b0.getMonth(),day)),freq:'monthly',every:1,auto:true,end:'',n:0,paused:false});
  rec('income','c_nomina','Nómina',2350,1,'a_bank');
  rec('expense','c_viv','Alquiler',780,3,'a_bank');
  rec('expense','c_publico','Abono transporte',40,2,'a_bank');
  rec('expense','c_dep','Gimnasio',29.9,5,'a_bank');
  rec('expense','c_subs','Netflix',12.99,8,'a_bank');
  rec('expense','c_fact','Iberdrola',62,12,'a_bank');
  rec('expense','c_fact','Movistar',39.9,15,'a_bank');
  rec('expense','c_subs','Spotify',10.99,20,'a_bank');
  // presupuestos
  const cr=addDays(t,-150);
  const bud=(kind,name,icon,amount,cats,carry)=>({id:uid(),kind,name,icon,amount,period:'cycle',cats,carry:!!carry,created:cr});
  D.budgets=[bud('total','Presupuesto total','🎯',2100,[]),bud('category','Supermercado','🛒',420,['c_super'],true),bud('category','Comer fuera','🍽️',320,['c_comer']),bud('category','Ocio','🎬',90,['c_ocio']),bud('category','Transporte','🚌',130,['c_transp'])];
  // objetivos
  const cb=(days,amount,note)=>({id:uid(),date:addDays(t,-days),amount,note:note||''});
  D.goals=[
    {id:uid(),name:'Viaje a Japón',icon:'✈️',color:'#1BA6A6',target:3200,cur:'EUR',date:addMonths(t,7),created:addDays(t,-120),contribs:[cb(110,220),cb(85,250),cb(60,200),cb(35,300),cb(8,260)]},
    {id:uid(),name:'Fondo de emergencia',icon:'🛡️',color:'#0F8A5C',target:6000,cur:'EUR',date:'',created:addDays(t,-150),contribs:[cb(150,3900,'Ahorro inicial'),cb(100,300),cb(70,300),cb(40,250)]}];
  D.memory={mercadona:'c_super',carrefour:'c_super',lidl:'c_super',repsol:'c_gas',starbucks:'c_cafe',cabify:'c_taxi',netflix:'c_subs',spotify:'c_subs'};
  return D;
}
function enterDemo(){
  if(S.settings.demo)return;
  flush();REAL_MEM=JSON.stringify(S);LS.set(realKey(),REAL_MEM);
  closeAllSheets();setS(buildDemo());UI.tab='resumen';UI.off=0;
  applyTheme();flush();commit();toast('Modo demo: datos de ejemplo. Tus datos reales están a salvo.',{ms:4200});
}
async function exitDemo(){
  if(!S.settings.demo)return;
  if(!(await confirmBox('Salir del modo demo','Se descartan los datos de ejemplo y vuelves a tus datos.','Salir')))return;
  let real=null;
  try{const raw=LS.get(realKey())||REAL_MEM;real=raw?JSON.parse(raw):null}catch(e){real=null}
  closeAllSheets();
  setS(real&&Array.isArray(real.tx)?real:freshState());migrate();S.settings.demo=false;
  LS.del(realKey());REAL_MEM=null;UI.tab='resumen';UI.off=0;
  applyTheme();flush();commit();toast('Datos reales restaurados');
}
/* ================= PIN / bloqueo ================= */
async function pinHash(pin,salt){
  try{
    const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(salt+':'+pin));
    return[...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
  }catch(e){
    let x=5381;const s=salt+':'+pin;for(let i=0;i<s.length;i++)x=((x<<5)+x+s.charCodeAt(i))|0;
    return 'x'+(x>>>0).toString(16);
  }
}
let pinFails=0,pinBlockUntil=0;
const checkPin=async p=>{
  const L=S.settings.lock;if(!L)return true;
  if(Date.now()<pinBlockUntil)return 'Demasiados intentos. Espera '+Math.ceil((pinBlockUntil-Date.now())/1000)+' s';
  if((await pinHash(p,L.salt))===L.hash){pinFails=0;return true}
  pinFails++;if(pinFails>=5){pinFails=0;pinBlockUntil=Date.now()+30000;return 'Demasiados intentos. Espera 30 s'}
  return 'PIN incorrecto';
};
function pinPad(o){
  return new Promise(res=>{
    let pin='',busy=false;
    const dots=h('div',{class:'dots','aria-hidden':'true'});
    const msg=h('div',{class:'small',role:'status',style:{minHeight:'20px',color:'var(--muted)',textAlign:'center',padding:'0 24px'}},o.sub||'');
    const draw=()=>dots.replaceChildren(...[0,1,2,3].map(i=>h('i',{class:i<pin.length?'f':''})));
    const box=h('div',{class:'lock',role:'dialog','aria-modal':'true','aria-label':o.title});
    const onKey=e=>{if(/^\d$/.test(e.key))press(e.key);else if(e.key==='Backspace')back()};
    const finish=v=>{document.removeEventListener('keydown',onKey);box.remove();res(v)};
    const submit=async()=>{
      busy=true;const p=pin;const r=o.check?await o.check(p):true;
      if(r===true){finish(p);return}
      msg.textContent=r||'Incorrecto';msg.style.color='var(--neg)';pin='';draw();busy=false;
      box.classList.add('shake');setTimeout(()=>box.classList.remove('shake'),420);
    };
    function press(d){if(busy||pin.length>=4)return;pin+=d;draw();if(pin.length===4)submit()}
    function back(){if(busy)return;pin=pin.slice(0,-1);draw()}
    const keys=['1','2','3','4','5','6','7','8','9',o.cancel?'Cancelar':'','0','⌫'];
    const pad_=h('div',{class:'keypad'},keys.map(k=>k===''?h('span'):h('button',{'aria-label':k==='⌫'?'Borrar':k,style:k==='Cancelar'?{fontSize:'14px'}:null,onClick:()=>{if(k==='⌫')back();else if(k==='Cancelar')finish(null);else press(k)}},k)));
    box.append(h('div',{style:{fontFamily:'var(--f-d)',fontSize:'24px',fontWeight:'600'}},o.title),msg,dots,pad_);
    if(o.forgot){
      let armed=false,t=null;
      const b=h('button',{class:'link',style:{marginTop:'6px',fontSize:'13px'},onClick:()=>{
        if(!armed){armed=true;b.textContent='Toca otra vez para borrar TODOS los datos de este dispositivo';b.style.color='var(--neg)';t=setTimeout(()=>{armed=false;b.textContent='¿Olvidaste el PIN?';b.style.color=''},6000);return}
        clearTimeout(t);o.forgot();finish('forgot');
      }},'¿Olvidaste el PIN?');
      box.append(b);
    }
    document.body.append(box);draw();document.addEventListener('keydown',onKey);
  });
}
async function unlockApp(){
  if(!S.settings.lock||$('.lock'))return;
  const r=await pinPad({title:'Bolsillo',sub:'Introduce tu PIN',check:checkPin,forgot:()=>{
    try{if(Photos.db){Photos.db.close();Photos.db=null}indexedDB.deleteDatabase('bolsillo-photos')}catch(e){}
    LS.del(realKey());setS(freshState());flush();applyTheme();closeAllSheets();commit();
  }});
  return r;
}
async function setPin(){
  const a=await pinPad({title:'Nuevo PIN',sub:'Elige 4 dígitos',cancel:true});if(a==null)return false;
  const b=await pinPad({title:'Repite el PIN',sub:'Para confirmar',cancel:true,check:p=>p===a?true:'No coincide, inténtalo de nuevo'});if(b==null)return false;
  const salt=uid();S.settings.lock={salt,hash:await pinHash(a,salt)};commit();toast('PIN activado');return true;
}
async function verifyPin(title){const r=await pinPad({title:title||'Introduce tu PIN',cancel:true,check:checkPin});return r!=null}
let hiddenAt=0;
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){hiddenAt=Date.now();if(S)flush()}
  else if(S&&S.settings.lock&&hiddenAt&&Date.now()-hiddenAt>30000)unlockApp();
});

/* ================= Espacios (Personal / Empresa) ================= */
function credPad(o){
  return new Promise(res=>{
    let user='',pass='',busy=false,show=false;
    const box=h('div',{class:'lock',role:'dialog','aria-modal':'true','aria-label':o.title});
    const msg=h('div',{class:'small',role:'status',style:{minHeight:'20px',color:'var(--muted)',textAlign:'center',padding:'0 24px'}},o.sub||'');
    const finish=v=>{box.remove();res(v)};
    const uInp=o.userOnly===false?null:h('input',{class:'credinp',type:'text',autocomplete:'username',placeholder:'Usuario',autocapitalize:'off',onKeydown:e=>{if(e.key==='Enter')pInp.focus()},onInput:e=>{user=e.target.value}});
    const pInp=h('input',{class:'credinp',type:'password',autocomplete:'current-password',placeholder:'Contraseña',onKeydown:e=>{if(e.key==='Enter')submit()},onInput:e=>{pass=e.target.value}});
    const eye=h('button',{class:'credeye',type:'button','aria-label':'Mostrar contraseña',onClick:()=>{show=!show;pInp.type=show?'text':'password'}},icon(show?'eyeoff':'eye',16));
    const btn=h('button',{class:'btn',style:{width:'240px'},onClick:submit},'Entrar');
    async function submit(){
      if(busy)return;busy=true;btn.textContent='…';
      const r=o.check?await o.check(user,pass):true;
      if(r===true){finish({user,pass});return}
      msg.textContent=r||'Incorrecto';msg.style.color='var(--neg)';box.classList.add('shake');setTimeout(()=>box.classList.remove('shake'),420);
      busy=false;btn.textContent='Entrar';
    }
    const fields=[uInp,h('div',{class:'credwrap'},pInp,eye)].filter(Boolean);
    box.append(h('div',{style:{fontFamily:'var(--f-d)',fontSize:'22px',fontWeight:'600',textAlign:'center',padding:'0 24px'}},o.title),msg,
      h('div',{style:{display:'flex',flexDirection:'column',gap:'10px',alignItems:'center'}},...fields,btn,
        o.cancel?h('button',{class:'btn ghost',style:{width:'240px'},onClick:()=>finish(null)},'Cancelar'):null));
    if(o.forgot){
      let armed=false,t=null;
      const b=h('button',{class:'link',style:{marginTop:'2px',fontSize:'13px'},onClick:()=>{
        if(!armed){armed=true;b.textContent=o.forgotArmedText||'Toca otra vez para borrar los datos de este espacio';b.style.color='var(--neg)';t=setTimeout(()=>{armed=false;b.textContent=o.forgotText||'¿Olvidaste la contraseña?';b.style.color=''},6000);return}
        clearTimeout(t);o.forgot();finish('forgot');
      }},o.forgotText||'¿Olvidaste la contraseña?');
      box.append(b);
    }
    document.body.append(box);
    setTimeout(()=>{(uInp||pInp).focus()},50);
  });
}
let credFails=0,credBlockUntil=0;
async function checkSpaceAuth(target,user,pass){
  const L=target.settings.spaceAuth;if(!L)return true;
  if(Date.now()<credBlockUntil)return 'Demasiados intentos. Espera '+Math.ceil((credBlockUntil-Date.now())/1000)+' s';
  const h1=await pinHash((user||'').trim().toLowerCase()+'|'+pass,L.salt);
  if(h1===L.hash){credFails=0;return true}
  credFails++;if(credFails>=5){credFails=0;credBlockUntil=Date.now()+30000;return 'Demasiados intentos. Espera 30 s'}
  return 'Usuario o contraseña incorrectos';
}
async function setSpaceAuth(){
  const a=await credPad({title:'Proteger espacio',sub:'Crea un usuario y una contraseña',cancel:true});
  if(!a)return false;
  if(!a.user.trim()||!a.pass){toast('Rellena usuario y contraseña');return false}
  const salt=uid();
  S.settings.spaceAuth={user:a.user.trim(),salt,hash:await pinHash(a.user.trim().toLowerCase()+'|'+a.pass,salt)};
  commit();toast('Espacio protegido');return true;
}
async function verifySpaceAuth(title){const r=await credPad({title:title||'Confirma tu acceso',cancel:true,check:(u,p)=>checkSpaceAuth(S,u,p)});return r!=null}
async function gateSpace(id,cancelable){
  const target=SPACES[id];
  if(!target.settings.spaceAuth)return true;
  const r=await credPad({title:spaceLabel(id,target.settings),sub:'Usuario y contraseña de este espacio',cancel:cancelable!==false,
    check:(u,p)=>checkSpaceAuth(target,u,p),
    forgotText:'¿Olvidaste la contraseña?',forgotArmedText:'Toca otra vez para borrar TODOS los datos de «'+spaceLabel(id,target.settings)+'»',
    forgot:()=>wipeSpace(id)});
  return r!=null;
}
function wipeSpace(id){
  SPACES[id]=freshState();
  if(SPACE===id){S=SPACES[id];flush();applyTheme();closeAllSheets();UI.tab='resumen';UI.off=0;commit()}
  else flush();
  toast('Datos de «'+spaceLabel(id)+'» borrados');
}
async function switchSpace(id){
  if(id===SPACE)return;
  if(demoGuard())return;
  const ok=await gateSpace(id);if(!ok)return;
  flush();
  SPACE=id;S=SPACES[id];migrate();
  applyTheme();closeAllSheets();UI.tab='resumen';UI.off=0;UI.q='';UI.selMode=false;UI.sel.clear();
  UI.filt={types:[],accs:[],cats:[],pending:false,tag:'',from:'',to:''};
  commit();toast('Espacio: '+spaceLabel(id));
}
function promptRenameSpace(parentApi){
  let val=spaceLabel(SPACE);
  openSheet({title:'Nombre del espacio',form:true,build:api=>{
    const inp=h('input',{type:'text',value:val,placeholder:SPACE==='empresa'?'Empresa':'Personal',style:{fontSize:'18px',width:'100%',border:0,background:'transparent',outline:0,padding:'14px'},onInput:e=>{val=e.target.value}});
    return h('div',null,h('div',{class:'grp'},inp),h('div',{class:'pad'},h('button',{class:'btn',onClick:()=>{
      S.settings.spaceName=val.trim();commit();api.close();if(parentApi)parentApi.refresh();
    }},'Guardar')));
  }});
}
function openSpaceSwitcher(){
  openSheet({title:'Cambiar de espacio',form:true,build:api=>{
    const g=h('div',{class:'grp'});
    for(const id of SPACE_IDS){
      const sp=SPACES[id],st=sp.settings;
      g.append(h('button',{class:'row',onClick:async()=>{api.close();await switchSpace(id)}},
        tile(SPACE_ICON[id],SPACE_COLOR[id]),
        h('div',{class:'grow'},h('div',{class:'t'},spaceLabel(id,st)),h('div',{class:'s'},sp.accounts.length+' cuentas · '+sp.tx.length+' movimientos')),
        id===SPACE?icon('check',20):(st.spaceAuth?icon('lock',18):null)));
    }
    return h('div',null,g,h('p',{class:'muted small',style:{margin:'10px 22px 0'}},'Cada espacio tiene sus propias cuentas, categorías, movimientos, presupuestos, objetivos y atajos.'));
  }});
}

/* ================= Ajustes ================= */
function numInput(val,min,max,cb){
  return h('input',{type:'number',min,max,inputmode:'numeric',value:String(val),style:{textAlign:'right',width:'80px'},onChange:e=>{const v=Math.round(+e.target.value);if(!(v>=min&&v<=max)){e.target.value=String(val);return}val=v;cb(v)}});
}
function openSettings(){
  openSheet({title:'Ajustes',full:true,form:true,build:api=>{
    const st=S.settings,N=[];
    const sw=(label,key,extra)=>h('div',{class:'field'},h('span',{style:{flex:1}},label),switchEl(!!st[key],v=>{st[key]=v;commit();if(extra)api.refresh()}));
    const note=t=>h('p',{class:'muted small',style:{margin:'-6px 22px 14px'}},t);

    N.push(secTitle('Espacio'));
    const gE=h('div',{class:'grp'});
    gE.append(tapRow('Espacio actual',h('span',null,SPACE_ICON[SPACE]+' '+spaceLabel(SPACE)),()=>openSpaceSwitcher()));
    gE.append(tapRow('Nombre de este espacio',h('span',null,spaceLabel(SPACE)),()=>promptRenameSpace(api)));
    if(st.spaceAuth){
      gE.append(tapRow('Usuario protegido',h('span',null,st.spaceAuth.user),async()=>{if(await verifySpaceAuth('Contraseña actual'))if(await setSpaceAuth())api.refresh()}));
      gE.append(tapRow('Quitar protección','',async()=>{if(await verifySpaceAuth('Contraseña actual')){st.spaceAuth=null;commit();api.refresh();toast('Protección eliminada')}}));
    }else gE.append(tapRow('Proteger con usuario y contraseña','',async()=>{if(await setSpaceAuth())api.refresh()}));
    N.push(gE,note('Personal y Empresa son espacios completamente separados: cada uno con sus cuentas, movimientos, presupuestos, objetivos y atajos. La protección es un candado local en este navegador (usuario + contraseña), no cifra los datos ni sustituye una cuenta real.'));

    N.push(secTitle('Apariencia'));
    const gA=h('div',{class:'grp'});
    gA.append(fieldRow('Tema',segEl([{value:'auto',label:'Auto'},{value:'light',label:'Claro'},{value:'dark',label:'Oscuro'}],st.theme,v=>{st.theme=v;commit()})));
    gA.append(h('div',{class:'swatches',role:'group','aria-label':'Color de acento'},ACCENTS.map(c=>h('button',{class:c===st.accent?'on':'',style:{background:c},'aria-label':'Acento '+c,onClick:()=>{st.accent=c;commit();api.refresh()}}))));
    N.push(gA);

    N.push(secTitle('General'));
    const gG=h('div',{class:'grp'});
    gG.append(tapRow('Moneda principal',h('span',null,st.currency+' · '+csym(st.currency)),async()=>{
      const v=await chooseBox('Moneda principal',currencies().map(c=>({value:c,label:c+' · '+csym(c)})),st.currency);
      if(!v||v===st.currency)return;
      if(!(await confirmBox('Cambiar moneda principal','Totales e informes se mostrarán en '+v+'. Los importes de presupuestos y objetivos no se convierten: revísalos después.','Cambiar')))return;
      st.currency=v;commit();api.refresh();
    }));
    gG.append(tapRow('Divisas y tipos de cambio',h('span',null,String(currencies().length)),()=>openRates()));
    N.push(gG);

    N.push(secTitle('Ciclo de cobro'));
    const gC=h('div',{class:'grp'});
    gC.append(fieldRow('Cobro',selectEl([{value:'monthly',label:'Una vez al mes'},{value:'twice',label:'Dos veces al mes'},{value:'biweekly',label:'Cada 14 días'}],st.payCycle,v=>{st.payCycle=v;commit();api.refresh()})));
    if(st.payCycle==='monthly')gC.append(fieldRow('Día de cobro',numInput(st.payDay||1,1,31,v=>{st.payDay=v;commit()})));
    if(st.payCycle==='twice'){
      gC.append(fieldRow('Primer cobro (día)',numInput(st.payDay||1,1,31,v=>{st.payDay=v;commit()})));
      gC.append(fieldRow('Segundo cobro (día)',numInput(st.payDay2||15,1,31,v=>{st.payDay2=v;commit()})));
    }
    if(st.payCycle==='biweekly')gC.append(tapRow('Fecha de un cobro',h('span',null,fmtLong(st.payAnchor)),()=>pickDate(st.payAnchor,d=>{st.payAnchor=d;commit();api.refresh()})));
    N.push(gC,note('Presupuestos, resumen e informes del «periodo» siguen este ciclo.'));

    N.push(secTitle('Movimientos'));
    const gM=h('div',{class:'grp'});
    gM.append(sw('Mostrar movimientos futuros','showFuture'));
    gM.append(sw('Signo + / − en los importes','signed'));
    gM.append(fieldRow('Lista',segEl([{value:'regular',label:'Normal'},{value:'slim',label:'Compacta'}],st.txView,v=>{st.txView=v;commit()})));
    gM.append(fieldRow('Color',selectEl([{value:'income',label:'Solo ingresos'},{value:'both',label:'Ingresos y gastos'},{value:'none',label:'Sin color'}],st.amtColor,v=>{st.amtColor=v;commit()})));
    N.push(gM,note('Los movimientos futuros incluyen pagos recurrentes ya programados y no cuentan en tu saldo hasta su fecha, salvo que los muestres.'));

    N.push(secTitle('Privacidad'));
    const gP=h('div',{class:'grp'});
    gP.append(sw('Modo incógnito (ocultar importes)','incognito'));
    if(st.lock){
      gP.append(tapRow('Cambiar PIN','',async()=>{if(await verifyPin('PIN actual'))setPin()}));
      gP.append(tapRow('Quitar PIN','',async()=>{if(await verifyPin('PIN actual')){st.lock=null;commit();api.refresh();toast('PIN eliminado')}}));
    }else gP.append(tapRow('Activar PIN de 4 dígitos','',async()=>{if(await setPin())api.refresh()}));
    N.push(gP,note('El PIN oculta la app al abrirla y tras 30 s en segundo plano. No cifra los datos guardados en el dispositivo.'));

    N.push(secTitle('Gestión'));
    const gS=h('div',{class:'grp'});
    gS.append(tapRow('Cuentas',h('span',null,String(S.accounts.length)),()=>openAccountsList()));
    const nInv=S.accounts.filter(x=>x.type==='invest').length;
    if(nInv)gS.append(tapRow('Revisar inversiones',h('span',null,String(staleInvestments().length)+' / '+nInv),()=>openInvestReview()));
    gS.append(tapRow('API de precios',h('span',null,(st.priceApi&&st.priceApi.url)?'Conectada':'No conectada'),()=>openPriceApiSettings(api)));
    gS.append(tapRow('Categorías',h('span',null,String(S.categories.length)),()=>openCategoriesList()));
    gS.append(tapRow('Atajos',h('span',null,String(S.shortcuts.length)),()=>openShortcutsList()));
    N.push(gS);

    N.push(secTitle('Datos'));
    const gD=h('div',{class:'grp'});
    gD.append(tapRow('Copia en la nube',h('span',null,sbSession()?sbSession().email:'No conectada'),()=>openCloudSync(api)));
    gD.append(tapRow('Exportar movimientos (CSV)','',()=>exportTxCSV()));
    gD.append(tapRow('Importar movimientos (CSV)','',()=>openImportCSV()));
    gD.append(tapRow('Copia de seguridad (JSON)','',()=>exportBackup()));
    gD.append(tapRow('Restaurar copia','',()=>openRestore()));
    gD.append(tapRow(st.demo?'Salir del modo demo':'Cargar datos de ejemplo','',()=>st.demo?exitDemo():enterDemo()));
    N.push(gD,note(S.tx.length+' movimientos · '+S.accounts.length+' cuentas. '+(sbSession()?'Se guarda en este dispositivo y se sube automáticamente a tu copia en la nube.':'Todo se guarda solo en este dispositivo, sin cuenta ni servidor: activa la copia en la nube o haz copias de seguridad de vez en cuando.')+(storageOK?'':' ⚠️ El navegador no está permitiendo guardar.')));
    N.push(h('div',{class:'pad'},h('button',{class:'btn danger',onClick:resetAll},'Borrar todos los datos')));
    N.push(h('p',{class:'muted small',style:{textAlign:'center',margin:'6px 0 26px'}},'Bolsillo · v1'));
    return h('div',null,N);
  }});
}

/* ---------- cuentas y categorías ---------- */
function openAccountsList(){
  openSheet({title:'Cuentas',form:true,full:true,
    actions:api=>h('button',{class:'ibtn','aria-label':'Nueva cuenta',onClick:()=>openAccountForm(null,()=>api.refresh())},icon('plus',20)),
    build:api=>{
      const bal=balances();
      if(!S.accounts.length)return emptyBox('Sin cuentas','Añade una con el botón +.');
      const box=h('div');
      for(const g of acctGroups(S.accounts)){
        box.append(groupHead(g.label,money(g.sub)));
        box.append(h('div',{class:'grp'},g.items.map(a=>h('button',{class:'row',onClick:()=>openAccountForm(a,()=>api.refresh())},
          tile(a.icon,a.color),h('div',{class:'grow'},h('div',{class:'t'},a.name+(a.archived?' (archivada)':''),investBadge(a)),h('div',{class:'s'},ACC_TYPES[a.type].n+' · '+a.currency)),h('div',{class:'amt'},money(bal[a.id]||0,a.currency))))));
      }
      return box;
    }});
}
function openCategoriesList(){
  let type='expense';
  openSheet({title:'Categorías',form:true,full:true,
    actions:api=>h('button',{class:'ibtn','aria-label':'Nueva categoría',onClick:()=>openCategoryForm(null,{type},()=>api.refresh())},icon('plus',20)),
    build:api=>{
      const count=id=>S.tx.reduce((n,t)=>n+(t.cat===id?1:0),0);
      const row=(c,child)=>h('button',{class:'row',style:child?{paddingLeft:'38px'}:null,onClick:()=>openCategoryForm(c,{},()=>api.refresh())},
        tile(c.icon,c.color,child?'sm':undefined),h('div',{class:'grow'},h('div',{class:'t'},c.name)),h('span',{class:'muted small'},count(c.id)+' mov.'));
      const rows=[];
      for(const r of S.categories.filter(c=>c.type===type&&!c.parent)){rows.push(row(r,false));for(const k of childrenOf(r.id))rows.push(row(k,true))}
      return h('div',null,
        h('div',{class:'pad',style:{paddingBottom:'4px'}},segEl([{value:'expense',label:'Gastos'},{value:'income',label:'Ingresos'}],type,v=>{type=v;api.refresh()})),
        h('div',{class:'grp'},rows));
    }});
}

/* ---------- divisas ---------- */
function openRates(){
  openSheet({title:'Divisas y cambio',form:true,full:true,build:api=>{
    const st=S.settings,g=h('div',{class:'grp'});
    for(const c of currencies()){
      const fixed=c==='EUR';
      const inp=h('input',{type:'text',inputmode:'decimal',value:String(st.rates[c]).replace('.',','),disabled:fixed,style:{textAlign:'right',width:'120px'},
        onChange:e=>{const v=parseNum(e.target.value);if(!(v>0)){e.target.value=String(st.rates[c]).replace('.',',');return}st.rates[c]=v;commit()}});
      g.append(fieldRow(c+' · '+csym(c),inp));
    }
    let code='',rt='';
    const add=h('div',{class:'grp'},
      fieldRow('Código',h('input',{type:'text',placeholder:'Ej. SEK',maxlength:6,style:{textTransform:'uppercase',textAlign:'right'},onInput:e=>{code=e.target.value.toUpperCase().replace(/[^A-Z]/g,'')}})),
      fieldRow('Por 1 EUR',h('input',{type:'text',inputmode:'decimal',placeholder:'0,00',style:{textAlign:'right'},onInput:e=>{rt=e.target.value}})));
    return h('div',null,
      h('p',{class:'muted small',style:{margin:'4px 22px 10px'}},'Unidades de cada divisa por 1 EUR. Son valores orientativos y se editan a mano; se usan para convertir a tu moneda principal.'),
      g,h('div',{class:'sectitle'},h('h2',null,'Añadir divisa')),add,
      h('div',{class:'pad'},h('button',{class:'btn',onClick:()=>{
        const v=parseNum(rt);if(code.length<2||!(v>0)){toast('Indica un código y un cambio válidos');return}
        st.rates[code]=v;commit();api.refresh();toast(code+' añadida');
      }},'Añadir'),h('div',{class:'btnrow'},h('button',{class:'btn ghost',onClick:async()=>{
        if(!(await confirmBox('Restablecer cambios','Vuelven los valores por defecto de las divisas predefinidas. Las que añadiste se mantienen.','Restablecer')))return;
        Object.assign(st.rates,DEFAULT_RATES);commit();api.refresh();
      }},'Restablecer valores'))));
  }});
}

/* ================= Bienvenida ================= */
function guessCurrency(){
  const reg=((navigator.language||'es-ES').split('-')[1]||'').toUpperCase();
  const M={MX:'MXN',CO:'COP',AR:'ARS',CL:'CLP',PE:'PEN',UY:'UYU',BR:'BRL',US:'USD',GB:'GBP',CH:'CHF',JP:'JPY',CA:'CAD',AU:'AUD',CN:'CNY',MA:'MAD',TR:'TRY'};
  return M[reg]||'EUR';
}
function openOnboarding(){
  let cur=guessCurrency(),cash='',bank='',started=false;
  openSheet({title:'Bienvenido',full:true,form:true,
    onClose:()=>{if(!S.settings.onboarded){S.settings.onboarded=true;save()}},
    build:api=>h('div',null,
      h('div',{style:{padding:'8px 22px 4px'}},
        h('h2',{style:{fontFamily:'var(--f-d)',fontSize:'26px',margin:'0 0 8px'}},'Tu dinero, sin fricción'),
        h('p',{class:'muted',style:{margin:'0 0 14px'}},'Registra gastos escribiendo una frase, controla presupuestos y sigue tus objetivos. Los datos se quedan en este dispositivo.')),
      h('div',{class:'grp'},
        fieldRow('Moneda',selectEl(currencies().map(c=>({value:c,label:c+' · '+csym(c)})),cur,v=>{cur=v})),
        fieldRow('Efectivo actual',h('input',{type:'text',inputmode:'decimal',placeholder:'0,00',style:{textAlign:'right'},onInput:e=>{cash=e.target.value}})),
        fieldRow('Saldo del banco',h('input',{type:'text',inputmode:'decimal',placeholder:'0,00',style:{textAlign:'right'},onInput:e=>{bank=e.target.value}}))),
      h('p',{class:'muted small',style:{margin:'-6px 22px 14px'}},'Puedes dejar los saldos vacíos y cambiarlo todo más tarde en Ajustes.'),
      h('div',{class:'pad'},
        h('button',{class:'btn',onClick:()=>{
          if(started)return;started=true;
          const st=S.settings;st.currency=cur;st.onboarded=true;
          for(const a of S.accounts){a.currency=cur}
          const c=parseNum(cash),b=parseNum(bank);
          const A=S.accounts.find(a=>a.id==='a_cash'),B=S.accounts.find(a=>a.id==='a_bank');
          if(A&&isFinite(c))A.initial=r2(c);if(B&&isFinite(b))B.initial=r2(b);
          commit();api.close();toast('Todo listo. Pulsa + para registrar tu primer movimiento.',{ms:4200});
        }},'Empezar'),
        h('div',{class:'btnrow'},h('button',{class:'btn ghost',onClick:()=>{api.close();setTimeout(enterDemo,240)}},'Probar con datos de ejemplo'))))
  });
}
/* ================= arranque ================= */
(async function boot(){
  loadState();
  applyTheme();
  try{
    const mq=matchMedia('(prefers-color-scheme: dark)'),f=()=>{if(S.settings.theme==='auto')applyTheme()};
    if(mq.addEventListener)mq.addEventListener('change',f);else if(mq.addListener)mq.addListener(f);
  }catch(e){}
  window.addEventListener('pagehide',()=>{if(S)flush()});
  window.addEventListener('error',e=>console.error(e.error||e.message));
  window.addEventListener('unhandledrejection',e=>console.error(e.reason));
  const gateP=(async()=>{if(S.settings.lock)await unlockApp();if(S.settings.spaceAuth)await gateSpace(SPACE,false)})();
  commit(true);
  renderAll();
  await gateP;
  if(!S.settings.onboarded&&!S.tx.length&&!S.settings.demo)setTimeout(openOnboarding,350);
  setTimeout(()=>{autoCheckInvestments().catch(()=>{})},900);
})();
