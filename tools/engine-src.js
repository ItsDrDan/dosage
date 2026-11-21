/* Dose Right! question engine. No page code here, so tools/check.js can run every generator in Node.
   Conventions follow CHEM 3A textbook 1.4.4, 1.4.5, 11.3, 11.4: start with the term that stands alone, label units
   with the substance, 1 kg = 2.2046 lb, carry unrounded values, round once at the end.
   All drug names, orders and ranges are invented for math practice. */
const CP=globalThis.ChemParse;
const LB=2.2046;
const rnd=(a,b)=>a+Math.floor(Math.random()*(b-a+1)),pick=a=>a[Math.floor(Math.random()*a.length)],shuf=a=>a.map(x=>[Math.random(),x]).sort((p,q)=>p[0]-q[0]).map(x=>x[1]);
const f=(x,s=3)=>CP.fmt(x,s);
const DRUGS=['Zenoprin','Calvexa','Lumarel','Brixolin','Velquine','Morvatil','Sorenext','Quilbane'];
const NAMES=['Ana','Luis','Mai','Pao','Jasmine','Noah','Simran','Elena','Tou','Marcus'];
/* A rounding tie (2.25 to 2 sig figs) has no single fair answer, so those numbers are redrawn. */
function isTie(x,s){if(!x)return false;const e=Math.floor(Math.log10(Math.abs(x)+1e-12)),v=Math.abs(x)/10**(e-s+1);return Math.abs(v-Math.floor(v)-.5)<1e-6}
function draw(make,tries=60){let q;for(let i=0;i<tries;i++){q=make();if(q&&!(q.sf&&isTie(q.answer,q.sf))&&!(q.type==='num'&&String(q.show).includes('×'))&&!(q.whole&&Math.abs(q.exact-Math.floor(q.exact)-.5)<1e-6))return q}throw new Error('no clean draw')}
const fr=(n,d)=>`<span class="fr"><span>${n}</span><span>${d}</span></span>`;
const line=(...p)=>`<div class="work">${p.join(' <span class="op">×</span> ')}</div>`;
const res=(work,out)=>work.replace(/<\/div>$/,` <span class="op">=</span> <b>${out}</b></div>`);
const SLIPS={
 lbkg:['Skipped the lb → kg step','The order is per <b>kg</b>, but that answer used the weight in <b>pounds</b>. Convert first: divide lb by 2.2046.'],
 lbx:['Multiplied by 2.2046','You multiplied by 2.2046. A person weighs a <b>smaller</b> number of kg than lb, so put lb on the bottom and divide.'],
 unit:['Missed a g ↔ mg step','That answer is off by a factor of 1000. Check the <b>g ↔ mg</b> step: the order and the label must use the same unit.'],
 flip:['Flipped a factor','A factor is upside down. Put the unit you want to cancel on the <b>bottom</b>.'],
 novol:['Stopped at "how many units"','You found how many label amounts you need. The label amount is in a volume, so multiply by that volume too.'],
 perday:['Missed doses per day','Check the <b>per dose</b> and <b>per day</b> wording. The number of doses each day is a conversion factor.'],
 min:['Missed h → min','The rate is per hour, but the answer is per <b>minute</b>. Use 1 h / 60 min.'],
 dropf:['Missed the drop factor','The tubing delivers a set number of drops per mL. Include the <b>gtt/mL</b> factor.'],
 pct:['Used the percent as a plain number','A percent is <b>out of 100</b>: 0.90% means 0.90 g per 100 mL.'],
 dil:['Set up the dilution backward','In M₁V₁ = M₂V₂, the stock is more concentrated, so its volume must be <b>smaller</b> than the final volume.'],
 down:['Rounded up past a limit','Rounding up would pass the maximum. For a limit, round <b>down</b> to the last full cartridge.'],
 total:['Used the total as the water','V₂ is the <b>total</b> final volume. Water to add = V₂ − V₁.']};
const slip=(v,code)=>({v,code});
function cleanSlips(ans,list){const out=[];for(const s of list){if(!Number.isFinite(s.v)||s.v<=0)continue;if(Math.abs(s.v-ans)<=Math.abs(ans)*.03)continue;if(out.some(o=>Math.abs(o.v-s.v)<=Math.abs(s.v)*.012))continue;out.push(s)}return out}
function num(o){const q=Object.assign({type:'num'},o);q.slips=cleanSlips(q.answer,o.slips||[]);q.show=q.whole?String(q.answer):f(q.answer,q.sf);return q}

/* ---------- typed-answer and lab grading (pure, tested in check.js) ---------- */
function gradeNum(q,raw){const v=CP.parseValue(raw);if(!String(raw).trim())return{kind:'empty',msg:'Type your answer first.'};
 if(Number.isNaN(v))return{kind:'nan',msg:CP.notNumberMsg(raw,'12.5')};
 if(q.whole){if(Math.abs(v-q.answer)<1e-9)return{kind:'right',ok:true};if(Math.abs(v-q.exact)<.5&&v!==Math.round(v))return{kind:'round',msg:`Your math is right. Now round to the <b>nearest whole ${q.wholeName||'number'}</b>.`}}
 else if(Math.abs(v-q.answer)<=Math.abs(q.answer)*.006||Math.abs(v-Number(q.answer.toPrecision(q.sf)))<=Math.abs(q.answer)*1e-9){if(CP.sfCount(raw)!==q.sf)return{kind:'sf',msg:CP.sfCloseMsg(raw,q.sf,q.show)};return{kind:'right',ok:true}}
 for(const s of q.slips||[])if(Math.abs(v-s.v)<=Math.abs(s.v)*.012)return{kind:'slip',code:s.code,msg:SLIPS[s.code][1]};
 return{kind:'wrong',msg:'Not quite. Tap <b>Hint</b> for the next step, and check that every unit cancels.'}}
function gradeSet(q,v){if(Math.abs(v-q.answer)<q.step/2)return{kind:'right',ok:true};
 for(const s of q.slips||[])if(Math.abs(v-s.v)<q.step/2)return{kind:'slip',code:s.code,msg:SLIPS[s.code][1]};
 const pct=Math.round(Math.abs(v-q.answer)/q.answer*100);return{kind:'wrong',msg:`${v<q.answer?'That is too little':'That is too much'}${pct>=1?`, off by about ${pct}%`:''}. Recheck your setup, then adjust.`}}
/* Skill Check allows one try, so a miss is explained as a review, never as a next step. */
function quizMsg(q,r){const see='Compare your work with the solution below.';
 if(r.kind==='round')return`Your math was right, but this answer needed rounding to the nearest whole ${q.wholeName||'number'}. ${see}`;
 if(r.kind==='sf')return`Your value was right, but this answer needed <b>${q.sf}</b> significant figures. ${see}`;
 if(q.type==='setup'){if(r.code==='extra')return`One factor did not belong in this setup. ${see}`;if(r.code==='flip')return`A factor was upside down, so its unit did not cancel. ${see}`;if(r.kind==='open')return`Not all of the units canceled to give the unit asked for. ${see}`;return`The units worked, but the value did not. ${see}`}
 if(r.kind==='slip')return r.msg;
 if(r.kind==='wrong'&&(q.type==='syringe'||q.type==='pump'))return r.msg.replace('Recheck your setup, then adjust.',see);
 if(r.kind==='wrong'&&q.type==='num')return`That is not the correct value. ${see}`;
 return r.msg}
/* Factor Builder: the chain must leave exactly the wanted units and give the right value. */
function unitsOf(q,chain){const m={},add=(u,k)=>{if(u)m[u]=(m[u]||0)+k};add(q.start.nu,1);add(q.start.du,-1);for(const c of chain){const t=q.tiles.find(x=>x.id===c.id),up=c.flip?-1:1;add(t.nu,up);add(t.du,-up)}for(const k in m)if(!m[k])delete m[k];return m}
function valueOf(q,chain){let v=q.start.v;for(const c of chain){const t=q.tiles.find(x=>x.id===c.id);v*=c.flip?t.dv/t.nv:t.nv/t.dv}return v}
function gradeSetup(q,chain){if(!chain.length)return{kind:'empty',msg:'Tap a factor from the tray to add it.'};
 const bad=chain.map(c=>q.tiles.find(x=>x.id===c.id)).find(t=>t.off);if(bad)return{kind:'slip',code:'extra',msg:`<b>${bad.nl} / ${bad.dl}</b> does not belong on the path from ${q.start.label} to ${q.wantLabel}. Remove it.`};
 const m=unitsOf(q,chain),want={};want[q.want.nu]=1;if(q.want.du)want[q.want.du]=-1;
 const doubled=Object.keys(m).find(u=>Math.abs(m[u])>=2);if(doubled)return{kind:'slip',code:'flip',msg:`<b>${doubled}</b> is not canceling because it is on the same side twice. Tap <b>Flip</b> on that factor.`};
 const left=Object.keys(m).filter(u=>m[u]!==want[u]),miss=Object.keys(want).filter(u=>m[u]!==want[u]);
 if(left.length||miss.length){const u=left[0]||miss[0];return{kind:'open',msg:left.length?`<b>${u}</b> is still left over. Add or flip a factor so it cancels.`:`You still need <b>${u}</b> in the answer. Add the factor that has it.`}}
 if(Math.abs(valueOf(q,chain)-q.answer)>Math.abs(q.answer)*1e-6)return{kind:'wrong',msg:'The units work, but the value does not. Check the factors you picked.'};return{kind:'right',ok:true}}
function solution(q){return q.tiles.filter(t=>!t.off).map(t=>({id:t.id,flip:!!t.upside}))}

/* ---------- number pools ---------- */
const LABELS=[[125,5],[250,5],[100,5],[50,1],[40,2],[80,2],[160,5],[20,1]];
const lbl=l=>`${f(l[0],3)} mg per ${f(l[1],3)} mL`;
const lbs=()=>rnd(96,228);
function tile(id,nv,ns,nu,dv,ds,du,x={}){const up=x.upside??Math.random()<.5,base={id,nv,dv,nu,du,nl:`${ns} ${nu}`,dl:`${ds} ${du}`,off:!!x.off};
 /* upside=true: the tile is shown the wrong way up in the tray, so the right answer needs one Flip */
 return up?Object.assign(base,{nv:dv,dv:nv,nu:du,du:nu,nl:`${ds} ${du}`,dl:`${ns} ${nu}`,upside:true}):Object.assign(base,{upside:false})}

/* ---------- Factor Builder ---------- */
function setupQ(o){const tiles=shuf(o.tiles);let v=o.start.v;for(const t of tiles)if(!t.off)v*=t.upside?t.dv/t.nv:t.nv/t.dv;
 return{topic:'setup',type:'setup',video:o.video||'routine',prompt:o.prompt,given:o.given,start:o.start,want:o.want,wantLabel:o.wantLabel,tiles,answer:v,sf:o.sf||3,show:f(v,o.sf||3),unit:o.wantLabel,
  hints:['Start with the term that stands alone: <b>'+o.start.label+'</b>.',o.hint,'Each factor goes with the old unit on the <b>bottom</b>. Tap <b>Flip</b> if it is on top.'],why:o.why}}
const GEN_SETUP=[
 ()=>{const d=pick(DRUGS),l=pick(LABELS),vol=rnd(12,48)/10*l[1]/5+.0,g=l[0]/l[1]*vol/1000;
  return setupQ({prompt:`Order: <b>${f(g,3)} g</b> of ${d}. On hand: <b>${lbl(l)}</b>. Build the setup for the volume.`,given:'',start:{v:g,label:`${f(g,3)} g drug`,nv:f(g,3),nu:'g drug'},want:{nu:'mL'},wantLabel:'mL',
   tiles:[tile('a',1000,'1000','mg drug',1,'1','g drug'),tile('b',l[1],f(l[1],3),'mL',l[0],f(l[0],3),'mg drug'),tile('x',60,'60','min',1,'1','h',{off:true})],hint:'The order is in g and the label is in mg, so go through 1 g = 1000 mg.',
   why:`Grams cancel, then mg drug cancels, leaving mL.`})},
 ()=>{const w=lbs(),o=pick([2,2.5,4,5,7.5,10]),d=pick(DRUGS);
  return setupQ({prompt:`A patient weighs <b>${w} lb</b>. ${d} is ordered at <b>${f(o,3)} mg per kg</b>. Build the setup for the dose in mg.`,start:{v:w,label:`${w} lb body`,nu:'lb body'},want:{nu:'mg drug'},wantLabel:'mg drug',
   tiles:[tile('a',1,'1','kg body',LB,'2.2046','lb body'),tile('b',o,f(o,3),'mg drug',1,'1','kg body'),tile('x',1000,'1000','mL',1,'1','L',{off:true})],video:'weight',hint:'The order is per kg, so change lb to kg first.',why:'lb body cancels, then kg body cancels, leaving mg drug.'})},
 ()=>{const w=lbs(),o=pick([2,4,5,8]),l=pick(LABELS),d=pick(DRUGS);
  return setupQ({prompt:`${d} is ordered at <b>${f(o,3)} mg/kg</b> for a <b>${w} lb</b> patient. On hand: <b>${lbl(l)}</b>. Build the setup for the volume.`,start:{v:w,label:`${w} lb body`,nu:'lb body'},want:{nu:'mL'},wantLabel:'mL',
   tiles:[tile('a',1,'1','kg body',LB,'2.2046','lb body'),tile('b',o,f(o,3),'mg drug',1,'1','kg body'),tile('c',l[1],f(l[1],3),'mL',l[0],f(l[0],3),'mg drug'),tile('x',24,'24','h',1,'1','day',{off:true})],video:'weight',hint:'Go lb → kg → mg → mL.',why:'Each unit cancels in turn: lb body, kg body, mg drug.'})},
 ()=>{const r=pick([50,75,100,125,150,200]),df=pick([10,15,20,60]);
  return setupQ({prompt:`A pump would run at <b>${f(r,3)} mL/h</b>. The tubing delivers <b>${df} gtt/mL</b>. Build the setup for drops per minute.`,start:{v:r,label:`${f(r,3)} mL/h`,nu:'mL',du:'h'},want:{nu:'gtt',du:'min'},wantLabel:'gtt/min',
   tiles:[tile('a',df,String(df),'gtt',1,'1','mL'),tile('b',1,'1','h',60,'60','min'),tile('x',1000,'1000','mg drug',1,'1','g drug',{off:true})],video:'routine',sf:3,hint:'mL must cancel with the drop factor, and h must cancel with 60 min.',why:'mL cancels with the drop factor, and h cancels with 1 h / 60 min.'})},
 ()=>{const d=pick(DRUGS),t=pick([125,250,325,500]),n=pick([1,2,3,4]),g=t*n/1000;
  return setupQ({prompt:`Order: <b>${f(g,3)} g</b> of ${d}. Each tablet has <b>${f(t,3)} mg</b>. Build the setup for the number of tablets.`,start:{v:g,label:`${f(g,3)} g drug`,nu:'g drug'},want:{nu:'tablet'},wantLabel:'tablet',
   tiles:[tile('a',1000,'1000','mg drug',1,'1','g drug'),tile('b',1,'1','tablet',t,f(t,3),'mg drug'),tile('x',1,'1','kg body',LB,'2.2046','lb body',{off:true})],hint:'"Each tablet has" is a conversion factor.',why:'g drug cancels, then mg drug cancels, leaving tablets.'})}];

/* ---------- Syringe Lab ---------- */
const SYR=[{cap:1,step:.01,major:.1,every:2,lo:10,hi:95},{cap:3,step:.1,major:.5,every:1,lo:4,hi:28},{cap:5,step:.2,major:1,every:1,lo:3,hi:24},{cap:10,step:.2,major:2,every:1,lo:6,hi:48}];
function syringeQ(extra={}){return draw(()=>{const s=extra.syr||pick(SYR),k=extra.k??rnd(s.lo,s.hi),vol=+(k*s.step).toFixed(2),conc=extra.conc??pick([2,4,5,10,20,25,40,50]),mg=conc*vol,d=extra.drug||pick(DRUGS),useG=!extra.conc&&mg>=100&&Math.random()<.5;if(isTie(mg,3))return null;
 const shown=useG?`${f(mg/1000,3)} g`:`${f(mg,3)} mg`;
 return{topic:'syringe',type:'syringe',video:'routine',prompt:extra.prompt||`Order: <b>${shown}</b> of ${d}. The vial is <b>${f(conc,3)} mg/mL</b>. Draw up the dose.`,cap:s.cap,step:s.step,major:s.major,every:s.every,answer:vol,show:vol.toFixed(s.step<.1?2:1),unit:'mL',
  slips:cleanSlips(vol,[slip(+(Math.round(mg*conc/s.step)*s.step).toFixed(2),'flip'),slip(+(vol/10).toFixed(2),'unit'),slip(+(vol*10).toFixed(2),'unit')]).filter(x=>x.v<=s.cap),
  hints:[useG?'Change the order to mg first: 1 g = 1000 mg.':'Start with the ordered amount, the term that stands alone.','Use the vial strength with <b>mg on the bottom</b>: 1 mL / '+f(conc,3)+' mg.',`Each small line on this syringe is <b>${s.step} mL</b>.`],
  why:res(line(`${f(mg,3)} mg`,fr('1 mL',`${f(conc,3)} mg`)),`${vol.toFixed(s.step<.1?2:1)} mL`)}})}

/* ---------- Weight Dosing ---------- */
const W={
 kg(){return draw(()=>{const w=lbs(),a=w/LB;return num({topic:'kg',video:'weight',prompt:`A patient weighs <b>${w} lb</b>. What is the weight in kg?`,answer:a,sf:3,unit:'kg',slips:[slip(w*LB,'lbx')],hints:['Use 1 kg = 2.2046 lb.','Put lb on the bottom so it cancels.'],why:res(line(`${w} lb`,fr('1 kg','2.2046 lb')),`${f(a,3)} kg`)})})},
 dose(){return draw(()=>{const w=lbs(),o=pick([1.5,2,2.5,4,5,7.5,10]),a=w/LB*o,d=pick(DRUGS);return num({topic:'dose',video:'weight',prompt:`${d} is ordered at <b>${f(o,3)} mg/kg</b>. The patient weighs <b>${w} lb</b>. What dose, in mg?`,answer:a,sf:3,unit:'mg',slips:[slip(w*o,'lbkg'),slip(w*LB*o,'lbx')],hints:['Start with the weight, the term that stands alone.','Change lb to kg with 1 kg / 2.2046 lb.',`Then multiply by ${f(o,3)} mg / 1 kg.`],why:res(line(`${w} lb`,fr('1 kg','2.2046 lb'),fr(`${f(o,3)} mg`,'1 kg')),`${f(a,3)} mg`)})})},
 vol(){return draw(()=>{const k=rnd(420,980)/10,o=pick([2,2.5,4,5]),l=pick(LABELS),mg=k*o,a=mg*l[1]/l[0],d=pick(DRUGS);return num({topic:'vol',video:'weight',prompt:`${d} is ordered at <b>${f(o,3)} mg/kg</b> for a <b>${f(k,3)} kg</b> patient. On hand: <b>${lbl(l)}</b>. What volume, in mL?`,answer:a,sf:3,unit:'mL',slips:[slip(mg,'novol'),slip(mg/l[0],'novol'),slip(mg*l[0]/l[1],'flip')],hints:['Find the dose in mg first.',`Then use the label with mg on the bottom: ${f(l[1],3)} mL / ${f(l[0],3)} mg.`],why:res(line(`${f(k,3)} kg`,fr(`${f(o,3)} mg`,'1 kg'),fr(`${f(l[1],3)} mL`,`${f(l[0],3)} mg`)),`${f(a,3)} mL`)})})},
 divided(){return draw(()=>{const k=rnd(120,420)/10,o=pick([15,20,30,40,45,60]),n=pick([2,3,4]),a=k*o/n,d=pick(DRUGS);return num({topic:'divided',video:'weight',prompt:`${d} is ordered at <b>${f(o,3)} mg/kg/day</b>, divided into <b>${n} equal doses</b>. The child weighs <b>${f(k,3)} kg</b>. How many mg per dose?`,answer:a,sf:3,unit:'mg/dose',slips:[slip(k*o,'perday'),slip(k*o*n,'perday')],hints:['Find the total mg per day first.',`Then use 1 day / ${n} doses.`],why:res(line(`${f(k,3)} kg`,fr(`${f(o,3)} mg`,'1 kg·day'),fr('1 day',`${n} doses`)),`${f(a,3)} mg/dose`)})})},
 bottle(){return draw(()=>{const w=lbs(),o=pick([2,2.5,4,5]),n=pick([2,3]),b=pick([5,8,10,12,15])*1000,day=w/LB*o*n,a=b/day,d=pick(DRUGS);return num({topic:'bottle',video:'weight',prompt:`${d} is ordered at <b>${f(o,3)} mg/kg per dose</b>, <b>${n} times a day</b>. The patient weighs <b>${w} lb</b>. A bottle holds <b>${f(b,3)}</b> mg. How many days will it last?`,answer:a,sf:3,unit:'days',slips:[slip(b/(w/LB*o),'perday'),slip(b/(w*o*n),'lbkg')],hints:['This has two stand-alone terms, so use two setups.','Setup 1: weight → mg per day. Keep the unrounded value.','Setup 2: bottle mg × (1 day / mg per day).'],why:res(line(`${w} lb`,fr('1 kg','2.2046 lb'),fr(`${f(o,3)} mg`,'1 kg·dose'),fr(`${n} doses`,'1 day')),`${f(day,4)} mg/day`)+res(line(`${f(b,3)} mg`,fr('1 day',`${f(day,4)} mg`)),`${f(a,3)} days`)})})},
 range(){const k=rnd(180,620)/10,lo=pick([10,15,20]),hi=lo*2,n=pick([2,3,4]),kind=pick(['below','within','above']),target=kind==='below'?lo*k*.72:kind==='above'?hi*k*1.28:(lo+hi)/2*k,per=Math.round(target/n/5)*5,day=per*n,d=pick(DRUGS),L=lo*k,H=hi*k,got=day<L?'below':day>H?'above':'within';
  const T={below:'Below the safe range',within:'Within the safe range',above:'Above the safe range'},W2={below:`${f(day,3)} mg/day is not below ${f(L,3)} mg/day.`,within:`${f(day,3)} mg/day is not between ${f(L,3)} and ${f(H,3)} mg/day.`,above:`${f(day,3)} mg/day is not above ${f(H,3)} mg/day.`};
  const options=shuf(['below','within','above']).map(x=>({t:T[x],ok:x===got,w:W2[x]}));
  return{topic:'range',type:'mc',video:'weight',prompt:`The made-up label for ${d} lists a range of <b>${lo}–${hi} mg/kg/day</b>. A <b>${f(k,3)} kg</b> patient is ordered <b>${per} mg, ${n} times a day</b>. How does the order compare?`,options,hints:[`Range: multiply ${lo} and ${hi} by the weight.`,`Ordered per day: ${per} mg × ${n}.`],why:`Range: <b>${f(L,3)}–${f(H,3)} mg/day</b>. Ordered: ${per} × ${n} = <b>${f(day,3)} mg/day</b>. That is <b>${got==='within'?'within':got}</b> the range.`}}
};

/* ---------- IV Pump ---------- */
const IV={
 pump(){const [v,h]=pick([[1000,8],[1000,10],[1000,4],[500,4],[500,5],[250,2],[250,5],[100,2],[750,6],[1000,5]]),a=v/h,V=v===1000?'1.00 L':`${v}. mL`;return{topic:'pump',type:'pump',video:'routine',prompt:`Infuse <b>${V}</b> of 0.90% saline over <b>${f(h,2)} h</b>. Set the pump in mL/h.`,vol:v,max:300,step:1,answer:a,show:String(a),unit:'mL/h',slips:cleanSlips(a,[slip(h/v*1000,'flip'),slip(v/h/60,'min')]).filter(x=>x.v>=1&&x.v<=300),hints:[v===1000?'Change 1.00 L to 1000 mL.':'Pump rate = volume ÷ time.','mL/h means mL on top and h on the bottom.'],why:res(line(fr(`${v} mL`,`${h} h`)),`${a} mL/h`)}},
 gtt(){return draw(()=>{const [v,h]=pick([[1000,8],[1000,6],[500,4],[500,3],[250,2],[1000,12],[100,1]]),df=pick([10,15,20,60]),x=v/h/60*df,a=Math.round(x),V=v===1000?'1.00 L':`${v}. mL`;return num({topic:'gtt',video:'routine',prompt:`Infuse <b>${V}</b> over <b>${f(h,2)} h</b> with <b>${df} gtt/mL</b> tubing. How many drops per minute? Round to the nearest whole drop.`,answer:a,exact:x,whole:true,wholeName:'drop',unit:'gtt/min',slips:[slip(v/h,'dropf'),slip(v/h*df,'min'),slip(v/h/60,'dropf')],hints:['Start with mL per hour.',`Multiply by ${df} gtt / 1 mL.`,'Multiply by 1 h / 60 min.'],why:res(line(fr(`${v} mL`,`${h} h`),fr(`${df} gtt`,'1 mL'),fr('1 h','60 min')),`${f(x,4)} → ${a} gtt/min`)})})},
 time(){return draw(()=>{const v=pick([250,500,1000]),r=pick([40,60,75,80,120,125,150]),a=v/r,V=v===1000?'1.00 L':`${v}. mL`;return num({topic:'time',video:'routine',prompt:`A <b>${V}</b> bag runs at <b>${f(r,3)} mL/h</b>. How many hours until it is empty?`,answer:a,sf:3,unit:'h',slips:[slip(r/v,'flip'),slip(v/r*60,'min')],hints:['Start with the bag volume.','Use the rate with mL on the bottom: 1 h / '+f(r,3)+' mL.'],why:res(line(`${v} mL`,fr('1 h',`${f(r,3)} mL`)),`${f(a,3)} h`)})})},
 watch(){const v=pick([500,1000]),a=pick([50,60,75,100]),b=a*2;const O=[['It is cut in half',1,''],['It doubles',0,'A faster pump empties the bag sooner, so the time cannot go up.'],['It stays the same',0,'The bag lasted a different time at each setting. Watch the readout.'],['It drops to one fourth',0,'Rate doubled, so time is divided by 2, not 4.']];
  return{topic:'watch',type:'mc',video:'routine',prompt:`Set the pump to <b>${a} mL/h</b>, then to <b>${b} mL/h</b>. Watch "bag lasts." What happens to the time when the rate doubles?`,sim:{kind:'pump',vol:v,max:300,start:Math.max(10,a-25),need:[a,b]},options:shuf(O.map(o=>({t:o[0],ok:!!o[1],w:o[2]}))),hints:[`Move the pump to ${a}, then to ${b}.`,'Time = volume ÷ rate.'],why:`Time = volume ÷ rate. ${v} mL lasts <b>${f(v/a,3)} h</b> at ${a} mL/h and <b>${f(v/b,3)} h</b> at ${b} mL/h. Rate and time are inversely related.`}}
};

/* ---------- Percent & Dilution ---------- */
const FLUIDS=[['0.90% NaCl',.9,2,'NaCl'],['0.45% NaCl',.45,2,'NaCl'],['5.0% dextrose',5,2,'dextrose'],['10.0% dextrose',10,3,'dextrose']];
const vText=v=>v===1000?'1.00 L':`${v}. mL`;
const P={
 grams(){return draw(()=>{const [n,p,s,x]=pick(FLUIDS),v=pick([100,200,250,500,1000]),a=p*v/100;return num({topic:'grams',video:'percent',prompt:`How many grams of ${x} are in a <b>${vText(v)}</b> bag of <b>${n}</b> (m/v)?`,answer:a,sf:s,unit:`g ${x}`,slips:[slip(p*v,'pct'),slip(v/p,'flip')],hints:[`${p}% (m/v) means ${p} g per 100 mL.`,v===1000?'Change 1.00 L to 1000 mL first.':'Start with the volume.'],why:res(line(`${v} mL`,fr(`${f(p,s)} g ${x}`,'100 mL')),`${f(a,s)} g ${x}`)})})},
 volume(){return draw(()=>{const [n,p,s,x]=pick(FLUIDS.slice(2)),g=pick([5,10,12.5,20,25,40]),a=g*100/p;if(a>1000)return null;return num({topic:'volume',video:'percent',prompt:`A patient needs <b>${f(g,3)} g</b> of ${x}. What volume of <b>${n}</b> (m/v) holds it?`,answer:a,sf:Math.min(s,3),unit:'mL',slips:[slip(g*p/100,'flip'),slip(g/p,'pct')],hints:['Write the percent as a fraction over 100 mL.','The grams are given, so flip it: g on the bottom.'],why:res(line(`${f(g,3)} g`,fr('100 mL',`${f(p,s)} g`)),`${f(a,Math.min(s,3))} mL`)})})},
 dilute(){return draw(()=>{const c1=pick([10,20,25,50]),c2=pick([1,2,2.5,5]),v2=pick([100,200,250,500]),a=c2*v2/c1;if(c2>=c1)return null;return num({topic:'dilute',video:'dilution',prompt:`How many mL of a <b>${f(c1,3)}%</b> stock are needed to make <b>${v2}. mL</b> of <b>${f(c2,3)}%</b> solution?`,answer:a,sf:3,unit:'mL',slips:[slip(c1*v2/c2,'dil'),slip(c1*c2/v2,'dil')],hints:['Use M₁V₁ = M₂V₂. Any concentration unit works if it matches.','Solve for V₁ = (C₂ × V₂) ÷ C₁.'],why:`V₁ = (${f(c2,3)}% × ${v2}. mL) ÷ ${f(c1,3)}% = <b>${f(a,3)} mL</b>`})})},
 water(){return draw(()=>{const c1=pick([10,20,25,50]),c2=pick([2,5]),v2=pick([100,200,500]),v1=c2*v2/c1,a=v2-v1;if(c2>=c1||v1!==Math.round(v1))return null;return num({topic:'water',video:'dilution',prompt:`You dilute <b>${f(c1,3)}%</b> stock to make <b>${v2}. mL</b> of <b>${f(c2,3)}%</b>. How many mL of <b>water</b> do you add? Round to the nearest whole mL.`,answer:a,exact:a,whole:true,wholeName:'mL',unit:'mL water',slips:[slip(v1,'total'),slip(v2,'total')],hints:['Find V₁, the volume of stock.','V₂ is the total. Water = V₂ − V₁.'],why:`V₁ = (${f(c2,3)} × ${v2}) ÷ ${f(c1,3)} = ${v1} mL. Water = ${v2} − ${v1} = <b>${a} mL</b>`})})},
 stock(){const t=pick([5,10,20]),good=t*pick([2,2.5,5]),o=[[good,1],[t,0],[t/2,0],[t/5,0]];return{topic:'stock',type:'mc',video:'dilution',prompt:`You must make a <b>${f(t,3)}%</b> solution by adding water. Which stock can you use?`,options:shuf(o.map(([c,ok])=>({t:`${f(c,3)}% stock`,ok:!!ok,w:c===t?'This is already the target strength, so adding water would make it too weak.':'Adding water only lowers concentration, so a weaker stock can never reach the target.'}))),hints:['Water can only make a solution weaker.'],why:`Dilution only goes down, so the stock must be stronger than ${f(t,3)}%. <b>${f(good,3)}%</b> works.`}}
};

/* ---------- Patient Cases ---------- */
const CASES=[
 {id:'mateo',title:'Mateo: asthma flare',story:'Mateo Herrera, 34, is an irrigation technician on a Fresno County almond orchard. He comes in with an asthma flare.',build(){const w=pick([165,172,178,187]),kg=w/LB,o=pick([2,2.5]),c=50,mg=kg*o,v=mg/c,sv=Math.round(v*10)/10,rate=pick([125,250]),h=1000/rate;return[
  num({topic:'kg',video:'weight',prompt:`Mateo weighs <b>${w} lb</b>. What is his weight in kg?`,answer:kg,sf:3,unit:'kg',slips:[slip(w*LB,'lbx')],hints:['1 kg = 2.2046 lb.'],why:res(line(`${w} lb`,fr('1 kg','2.2046 lb')),`${f(kg,3)} kg`)}),
  num({topic:'dose',video:'weight',prompt:`The made-up drug Zenoprin is ordered at <b>${f(o,3)} mg/kg</b>. Using ${f(kg,3)} kg, what dose in mg?`,answer:mg,sf:3,unit:'mg',slips:[slip(w*o,'lbkg')],hints:['Multiply kg by mg/kg.'],why:res(line(`${f(kg,3)} kg`,fr(`${f(o,3)} mg`,'1 kg')),`${f(mg,3)} mg`)}),
  {topic:'syringe',type:'syringe',video:'routine',prompt:`The vial is <b>${c}.0 mg/mL</b>. Draw up the dose, rounded to the nearest <b>0.1 mL</b>.`,cap:5,step:.1,major:1,every:1,answer:sv,show:sv.toFixed(1),unit:'mL',slips:[],hints:['Dose ÷ vial strength.',`${f(mg,3)} mg × (1 mL / ${c}.0 mg).`],why:res(line(`${f(mg,3)} mg`,fr('1 mL',`${c}.0 mg`)),`${sv.toFixed(1)} mL`)},
  {topic:'pump',type:'pump',video:'routine',prompt:`He also gets <b>1.00 L</b> of 0.90% saline over <b>${f(h,2)} h</b>. Set the pump.`,vol:1000,max:300,step:1,answer:rate,show:String(rate),unit:'mL/h',slips:[],hints:['1.00 L = 1000 mL.','Rate = volume ÷ time.'],why:res(line(fr('1000 mL',`${h} h`)),`${rate} mL/h`)}]}},
 {id:'child',title:'Sofia: oral suspension',story:'Sofia is 6 years old and needs a liquid medicine at home. Her parent wants to know how much to give and how long the bottle lasts.',build(){return draw(()=>{const w=pick([44,48,50,53,57]),kg=w/LB,o=pick([30,40]),n=3,day=kg*o,per=day/n,l=pick([[125,5],[250,5]]),ml=per*l[1]/l[0],b=150,doses=b/ml,days=doses/n;return{sf:3,answer:days,parts:[
  num({topic:'kg',video:'weight',prompt:`Sofia weighs <b>${w} lb</b>. What is her weight in kg?`,answer:kg,sf:3,unit:'kg',slips:[slip(w*LB,'lbx')],hints:['1 kg = 2.2046 lb.'],why:res(line(`${w} lb`,fr('1 kg','2.2046 lb')),`${f(kg,3)} kg`)}),
  num({topic:'divided',video:'weight',prompt:`The order is <b>${f(o,3)} mg/kg/day</b> in <b>${n} equal doses</b>. How many mg per dose?`,answer:per,sf:3,unit:'mg/dose',slips:[slip(day,'perday')],hints:['mg/day first, then ÷ doses.'],why:res(line(`${f(kg,3)} kg`,fr(`${f(o,3)} mg`,'1 kg·day'),fr('1 day','3 doses')),`${f(per,3)} mg/dose`)}),
  num({topic:'vol',video:'weight',prompt:`The bottle is <b>${lbl(l)}</b>. How many mL per dose?`,answer:ml,sf:3,unit:'mL',slips:[slip(per*l[0]/l[1],'flip')],hints:['Put mg on the bottom of the label factor.'],why:res(line(`${f(per,3)} mg`,fr(`${f(l[1],3)} mL`,`${f(l[0],3)} mg`)),`${f(ml,3)} mL`)}),
  num({topic:'bottle',video:'weight',prompt:`The bottle holds <b>150. mL</b>. How many days will it last at ${n} doses a day?`,answer:days,sf:3,unit:'days',slips:[slip(doses,'perday')],hints:['Bottle ÷ mL per dose = doses.','Doses ÷ 3 per day = days.'],why:res(line('150. mL',fr('1 dose',`${f(ml,3)} mL`),fr('1 day','3 doses')),`${f(days,3)} days`)})]}}).parts}},
 {id:'heat',title:'Rosalba: Valley heat',story:'Rosalba, 52, works a summer grape harvest near Fresno. She arrives dehydrated after a long shift in the heat.',build(){const v=1000,[h,df]=pick([[4,10],[4,20],[5,10],[5,15],[5,20],[8,10],[8,15],[8,20]]),r=v/h,x=r/60*df,a=Math.round(x);return[
  num({topic:'grams',video:'percent',prompt:'She gets <b>1.00 L</b> of <b>0.90% NaCl</b> (m/v). How many grams of NaCl is that?',answer:9,sf:2,unit:'g NaCl',slips:[slip(900,'pct')],hints:['0.90 g per 100 mL.','1.00 L = 1000 mL.'],why:res(line('1000 mL',fr('0.90 g NaCl','100 mL')),'9.0 g NaCl')}),
  {topic:'pump',type:'pump',video:'routine',prompt:`Infuse the bag over <b>${f(h,2)} h</b>. Set the pump.`,vol:v,max:300,step:1,answer:r,show:String(r),unit:'mL/h',slips:[],hints:['Rate = volume ÷ time.'],why:res(line(fr('1000 mL',`${h} h`)),`${r} mL/h`)},
  draw(()=>num({topic:'gtt',video:'routine',prompt:`The pump fails, so gravity tubing is used: <b>${df} gtt/mL</b>. At ${r} mL/h, how many drops per minute? Round to the nearest whole drop.`,answer:a,exact:x,whole:true,wholeName:'drop',unit:'gtt/min',slips:[slip(r*df,'min'),slip(r/60,'dropf')],hints:['Multiply by the drop factor.','Multiply by 1 h / 60 min.'],why:res(line(fr(`${r} mL`,'1 h'),fr(`${df} gtt`,'1 mL'),fr('1 h','60 min')),`${f(x,4)} → ${a} gtt/min`)}))]}},
 {id:'dental',title:'Dental: anesthetic cartridges',story:'A dental hygiene student prepares a local anesthetic. The product and its limit below are made up for math practice.',build(){const p=2,mlc=1.7,mgc=p*10*mlc,w=pick([132,143,154,165]),kg=w/LB,lim=4,max=kg*lim,c=Math.floor(max/mgc);return[
  num({topic:'grams',video:'percent',prompt:'A cartridge holds <b>1.70 mL</b> of a <b>2.00%</b> (m/v) anesthetic. How many mg are in one cartridge?',answer:mgc,sf:3,unit:'mg',slips:[slip(3.4,'pct'),slip(.034,'unit')],hints:['2.00% = 2.00 g per 100 mL.','Change g to mg.'],why:res(line('1.70 mL',fr('2.00 g','100 mL'),fr('1000 mg','1 g')),'34.0 mg')}),
  num({topic:'dose',video:'weight',prompt:`The made-up limit is <b>4.00 mg/kg</b>. For a <b>${w} lb</b> patient, what is the maximum in mg?`,answer:max,sf:3,unit:'mg',slips:[slip(w*lim,'lbkg')],hints:['Change lb to kg first.'],why:res(line(`${w} lb`,fr('1 kg','2.2046 lb'),fr('4.00 mg','1 kg')),`${f(max,3)} mg`)}),
  num({topic:'bottle',video:'routine',prompt:'How many <b>full</b> cartridges stay at or under that maximum?',answer:c,exact:c,whole:true,wholeName:'cartridge',unit:'cartridges',slips:[slip(c+1,'down')],hints:['Maximum ÷ 34.0 mg per cartridge.','Round <b>down</b>: rounding up would pass the limit.'],why:`${f(max,3)} mg ÷ 34.0 mg = ${f(max/mgc,3)}. Round <b>down</b> to <b>${c} full cartridges</b>, since rounding up would pass the limit.`})]}}
];

const TOPICS={setup:['Factor Builder','setup'],syringe:['Syringe draws','syringe'],kg:['Pounds to kilograms','weight'],dose:['Weight-based doses','weight'],vol:['Dose to volume','weight'],divided:['Divided daily doses','weight'],bottle:['How long it lasts','weight'],range:['Safe range checks','weight'],pump:['Pump rates','iv'],gtt:['Drip rates','iv'],time:['Infusion time','iv'],watch:['Rate and time','iv'],grams:['Grams in a solution','percent'],volume:['Volume from a percent','percent'],dilute:['Dilutions','percent'],water:['Water to add','percent'],stock:['Choosing a stock','percent']};
const MODE_GEN={setup:()=>pick(GEN_SETUP)(),syringe:()=>syringeQ(),weight:()=>W[pick(Object.keys(W))](),iv:()=>IV[pick(Object.keys(IV))](),percent:()=>P[pick(Object.keys(P))]()};
const QUIZ_PLAN=[()=>pick(GEN_SETUP)(),()=>syringeQ(),W.dose,W.vol,W.range,IV.pump,IV.gtt,IV.time,P.grams,P.dilute];
