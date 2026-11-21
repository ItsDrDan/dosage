/* node tools/build.js -> ../index.html (page-src.html + engine-src.js) */
const fs=require('fs'),p=require('path');
const page=fs.readFileSync(p.join(__dirname,'page-src.html'),'utf8'),eng=fs.readFileSync(p.join(__dirname,'engine-src.js'),'utf8');
if(!page.includes('/*@ENGINE@*/'))throw new Error('no engine slot');
fs.writeFileSync(p.join(__dirname,'..','index.html'),page.replace('/*@ENGINE@*/',()=>eng));console.log('wrote index.html');
