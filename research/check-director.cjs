// Audit one reviewed source module in a VM: no imports, filesystem, network or subprocess in VM.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'director-reviewed.js'),'utf8').replace(/^import .*;\n/,'').replaceAll('export const ','const ').replaceAll('export function ','function ');
let crops=[];
const canvas={width:800,height:600,getContext:()=>({clearRect(){}})};
const story={style:{}};
const stage={hudViewport:()=>({top:0,bottom:0}),setCrop:(z,x,y)=>{crops.push({z,x,y});return {z:1,x0:0,y0:0}}};
const sandbox={Math,innerWidth:800,innerHeight:600,window:{__STAGE:stage},document:{querySelector:()=>null,getElementById:()=>null},clamp01:x=>Math.max(0,Math.min(1,x)),easeOutExpo:x=>x===1?1:1-Math.pow(2,-10*x),fmt:String,hash:x=>(Math.sin(x)*10000)%1,smooth:x=>x};
const make=vm.runInNewContext(source+'\ncreateDirector;',sandbox,{timeout:1000});
const app={insertAdjacentHTML(){},querySelector:s=>s==='.dir-glitch'?canvas:s==='.dir-story'?story:{style:{}}};
const cfg={duration:10,stages:[],story:[],director:{enabled:true,bpm:120,drop:8,shots:[{z:2,f:0}],shake:0,flash:0,glitch:0}};
function draw(d,t){d.pre(t);d.post(t,{foci:[{x:100+t*50,y:300}]});return crops.at(-1).x}
let d=make(app,cfg);draw(d,0);const first=draw(d,1);draw(d,2);const replay=draw(d,1);
assert.notEqual(first,replay);
const result={pin:'e627941543d9988b155dc610bb9cc0115a5e365e',file:'sims/kit/director.js',scope:'source-module with stub DOM/stage; not full-render or pixel test',sequence:[0,1,2,1],focus_x_at_first_t1:first,focus_x_at_replay_t1:replay,order_dependency_confirmed:true,qualification:'Only when returned foci vary by time and director uses a tight shot. Not every sim is affected. No production project was executed or changed.'};
fs.writeFileSync(require('node:path').join(__dirname,'director-audit.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
