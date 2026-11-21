/* node tools/check.js: runs every generator many times and recomputes the graded answers. */
const fs=require('fs'),p=require('path'),vm=require('vm');
const ctx={console,Math,Number,String,Object,Array,JSON,Set};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
const parse=[p.join(__dirname,'..','..','games','brand','chemparse.v2.js')];vm.runInContext(fs.readFileSync(parse[0],'utf8'),ctx);
if(!ctx.ChemParse&&ctx.window.ChemParse)ctx.ChemParse=ctx.window.ChemParse;
vm.runInContext(fs.readFileSync(p.join(__dirname,'engine-src.js'),'utf8')+';globalThis.E={GEN_SETUP,syringeQ,W,IV,P,CASES,QUIZ_PLAN,TOPICS,SLIPS,gradeNum,gradeSet,gradeSetup,solution,valueOf,isTie,LB,quizMsg,CATCH,CATCH_ALL,catchQ,SENSE,labelQ,labelRead,noteQ,NOTE,PATHS,TOPIC_GEN,MODE_GEN,bsaOf,mcgRate};',ctx);
const {GEN_SETUP,syringeQ,W,IV,P,CASES,QUIZ_PLAN,TOPICS,SLIPS,gradeNum,gradeSet,gradeSetup,solution,isTie,quizMsg,CATCH_ALL,catchQ,SENSE,labelQ,labelRead,noteQ,PATHS,TOPIC_GEN,MODE_GEN,bsaOf,mcgRate}=ctx.E,CP=ctx.ChemParse;
const RETRY=/\bhint\b|\btap\b|adjust|remove it|now round|try again|recheck/i;
function checkQuizWords(q,k){const rs=[];
 if(q.type==='num'){rs.push(gradeNum(q,String(q.answer*7.3)));for(const s of q.slips)rs.push(gradeNum(q,String(s.v)));rs.push(q.whole?gradeNum(q,String(q.answer+.25)):gradeNum(q,q.answer.toPrecision(q.sf+1)))}
 if(q.type==='syringe'||q.type==='pump')rs.push(gradeSet(q,q.answer>q.step?q.answer-q.step:q.answer+q.step));
 if(q.type==='setup'){const sol=solution(q),off=q.tiles.find(t=>t.off);rs.push(gradeSetup(q,[...sol,{id:off.id,flip:false}]),gradeSetup(q,sol.slice(1)),gradeSetup(q,sol.map(c=>({...c,flip:!c.flip}))))}
 if(q.type==='mc')for(const o of q.options)if(!o.ok)rs.push({kind:'wrong',msg:o.w});
 for(const r of rs)if(!r.ok)ok(!RETRY.test(quizMsg(q,r)),k+':quiz retry wording',quizMsg(q,r))}
let n=0;const bad={},fail=(k,x)=>{bad[k]=bad[k]||{count:0,x};bad[k].count++},ok=(c,k,x)=>{n++;if(!c)fail(k,x)};
const REAL=/\b(acetaminophen|ibuprofen|amoxicillin|morphine|insulin|heparin|albuterol|lidocaine|fentanyl)\b/i;
function common(q,k){ok(q.prompt&&q.why&&q.hints&&q.hints.length,k+':text',q.prompt);ok(TOPICS[q.topic],k+':topic',q.topic);ok(!/undefined|NaN|null/.test(q.prompt+q.why+q.hints.join('')),k+':bad text',q.prompt+q.why);ok(!REAL.test(q.prompt),k+':real drug',q.prompt);for(const s of q.slips||[])ok(SLIPS[s.code],k+':slip code',s.code)}
function checkQ(q,k){common(q,k);
 if(q.type==='num'){ok(Number.isFinite(q.answer)&&q.answer>0,k+':answer',q.answer);if(q.whole){ok(q.answer===Math.round(q.answer),k+':whole',q.answer);ok(gradeNum(q,String(q.answer)).ok,k+':whole passes',q)}else{ok(CP.sfCount(q.show)===q.sf,k+':shown sf',q.show);ok(!q.show.includes('×'),k+':sci answer',q.show);ok(!isTie(q.answer,q.sf),k+':tie',q.answer);ok(gradeNum(q,q.show.replace(' × 10','E')).ok,k+':show passes',q.show)}
  for(const s of q.slips){const r=gradeNum(q,String(s.v));ok(!r.ok,k+':slip accepted',s);ok(r.kind==='slip'&&r.code,k+':slip recognized',s)}}
 if(q.type==='setup'){const sol=solution(q);const r=gradeSetup(q,sol);ok(r.ok,k+':solution',{r,p:q.prompt});if(q.tiles.some(t=>t.upside)){const wrong=sol.map(c=>({...c,flip:!c.flip}));ok(!gradeSetup(q,wrong).ok,k+':all flipped passes',q.prompt)}const off=q.tiles.find(t=>t.off);ok(off&&!gradeSetup(q,[...sol,{id:off.id,flip:false}]).ok,k+':distractor passes',q.prompt);ok(!gradeSetup(q,sol.slice(1)).ok,k+':partial passes',q.prompt)}
 if(q.type==='syringe'){ok(q.answer>0&&q.answer<=q.cap,k+':fits syringe',q);ok(Math.abs(q.answer/q.step-Math.round(q.answer/q.step))<1e-6,k+':on a line',q.answer);ok(gradeSet(q,q.answer).ok,k+':set',q);ok(!gradeSet(q,q.answer+q.step).ok,k+':one line off',q);for(const x of q.slips){ok(Math.abs(x.v/q.step-Math.round(x.v/q.step))<1e-6,k+':slip on a line',x);if(x.code==='decimal')ok(Math.abs(x.v/q.answer-10)<1e-6||Math.abs(q.answer/x.v-10)<1e-6,k+':decimal slip is tenfold',x)}}
 if(q.type==='pump'){ok(q.answer===Math.round(q.answer)&&q.answer>0&&q.answer<=q.max&&q.answer%5===0,k+':pump range',q.answer);ok(Math.abs(q.vol/q.answer-q.vol/q.answer)<1e-9&&gradeSet(q,q.answer).ok,k+':pump',q)}
 if(q.type==='mc'){ok(q.options.filter(o=>o.ok).length===1,k+':one right',q.prompt);ok(new Set(q.options.map(o=>o.t)).size===q.options.length,k+':dup',q.prompt);ok(q.options.filter(o=>!o.ok).every(o=>o.w),k+':wrong reason',q.prompt)}}
const R=Number(process.argv[2]||4000);
for(let i=0;i<R;i++){GEN_SETUP.forEach((g,j)=>checkQ(g(),'setup'+j));checkQ(syringeQ(),'syringe');for(const[o,l]of[[W,'W'],[IV,'IV'],[P,'P']])for(const k of Object.keys(o))checkQ(o[k](),l+'.'+k);QUIZ_PLAN.forEach((g,j)=>{const q=g();checkQ(q,'quiz'+j);checkQuizWords(q,'quiz'+j)});for(const c of CASES){const parts=c.build();ok(parts.length>=3,c.id+':parts',parts.length);ok(PATHS.some(x=>x[0]===c.path),c.id+':path',c.path);parts.forEach((q,j)=>{checkQ(q,c.id+j);if(q.panel)ok(!/undefined|NaN|null/.test(q.panel),c.id+':panel',q.panel)})}
 for(const k of CATCH_ALL){const q=catchQ([k]);checkQ(q,'catch.'+k);checkQuizWords(q,'catch.'+k);ok(Math.abs(q.meta.good-q.meta.bad)>Math.abs(q.meta.good)*.05,'catch.'+k+':error changes answer',q.meta);ok(q.options.find(o=>o.ok).t==='There is no mistake'?!q.meta.hasErr:q.meta.hasErr,'catch.'+k+':key',q.options);ok(!/undefined|NaN|null/.test(q.panel),'catch.'+k+':panel',q.panel)}
 for(const k of Object.keys(SENSE)){const q=SENSE[k]();checkQ(q,'sense.'+k);checkQuizWords(q,'sense.'+k)}
 for(const g of [labelQ,labelRead,noteQ]){const q=g();checkQ(q,'new.'+q.topic);checkQuizWords(q,'new.'+q.topic);if(q.panel)ok(/Made up for practice/.test(q.panel),'label:practice note',q.panel)}
 for(const m of Object.keys(MODE_GEN))checkQ(MODE_GEN[m](),'mode.'+m);
 for(const t of Object.keys(TOPICS)){ok(TOPIC_GEN[t],'topic gen:'+t,t);const q=TOPIC_GEN[t]();checkQ(q,'review.'+t);ok(q.topic===t,'review topic:'+t,q.topic)}}
/* Independent recomputation of the book's worked examples */
const near=(a,b,t=.005)=>Math.abs(a-b)<=Math.abs(b)*t;
ok(near(.2*1000*5/125,8),'book 1.4.4 ex3');ok(near(154/2.2046*4*3,838.2,.001),'book 1.4.4 ex5 part1');ok(near(15000/(154/2.2046*4*3),17.9),'book 1.4.4 ex5 part2');ok(near(.9*1000/100,9),'0.90% in 1 L');ok(near(bsaOf(100,25),.8333,.001),'Mosteller');ok(near(mcgRate(5,70,400,250),13.125,.001),'mcg/kg/min rate');ok(CASES.length===11,'case count',CASES.length);ok(QUIZ_PLAN.length===10,'quiz length',QUIZ_PLAN.length);
const keys=Object.keys(bad);console.log(`${n.toLocaleString()} checks, ${keys.length} failing kinds`);for(const k of keys.slice(0,25))console.log(' FAIL',k,bad[k].count,JSON.stringify(bad[k].x).slice(0,260));process.exit(keys.length?1:0);
