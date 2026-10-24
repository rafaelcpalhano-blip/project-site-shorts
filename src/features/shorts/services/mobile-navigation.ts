import type {Direction} from './sequence-navigation.ts'
export function createSwipeNavigation(){
 let start:{id:number;x:number;y:number;at:number}|null=null,vertical=false
 return {
  start(e:{pointerId:number;pointerType:string;isPrimary:boolean;clientX:number;clientY:number;time:number;viewportWidth:number}){start=e.isPrimary&&e.pointerType!=='mouse'&&e.clientX>24&&e.clientX<e.viewportWidth-24?{id:e.pointerId,x:e.clientX,y:e.clientY,at:e.time}:null;vertical=false},
  move(e:{pointerId:number;clientX:number;clientY:number}){if(start?.id===e.pointerId&&Math.abs(e.clientY-start.y)>16&&Math.abs(e.clientY-start.y)>Math.abs(e.clientX-start.x))vertical=true},
  cancel(){start=null},
  end(e:{pointerId:number;clientX:number;clientY:number;time:number}):Direction|null{
   const from=start;start=null;if(!from||from.id!==e.pointerId||vertical||e.time-from.at>900)return null
   const x=e.clientX-from.x,y=e.clientY-from.y
   return Math.abs(x)>=60&&Math.abs(x)>Math.abs(y)*1.8?(x<0?1:-1):null
  },
 }
}
/** Relative lateral tilt, low-pass + dwell + neutral rearm. No sample leaves memory. */
export function createTiltNavigation(){
 let samples:number[]=[],since=0,baseline:number|null=null,filtered=0,armed=true,last=-Infinity,candidate:Direction|null=null,candidateAt=0,neutralAt:number|null=null
 const reset=()=>{samples=[];since=0;baseline=null;filtered=0;armed=true;last=-Infinity;candidate=null;neutralAt=null}
 return {reset,suspend:()=>{candidate=null;armed=false;neutralAt=null},observe(value:number,time:number):{calibrated:boolean;direction:Direction|null}{
  if(!Number.isFinite(value)||!Number.isFinite(time))return {calibrated:baseline!==null,direction:null}
  if(baseline===null){if(!samples.length)since=time;samples.push(value);if(samples.length>=8&&time-since>=350){baseline=samples.reduce((a,b)=>a+b,0)/samples.length;samples=[]}return {calibrated:baseline!==null,direction:null}}
  const delta=((value-baseline+540)%360)-180
  if(Math.abs(delta)>70){reset();return {calibrated:false,direction:null}}
  filtered+=.25*(delta-filtered)
  if(!armed){if(Math.abs(filtered)<6){neutralAt??=time;if(time-neutralAt>=200&&time-last>=1200){armed=true;neutralAt=null}}else neutralAt=null;return {calibrated:true,direction:null}}
  if(time-last<1200||Math.abs(filtered)<22){candidate=null;return {calibrated:true,direction:null}}
  const direction:Direction=filtered>0?1:-1
  if(candidate!==direction){candidate=direction;candidateAt=time;return {calibrated:true,direction:null}}
  if(time-candidateAt<180)return {calibrated:true,direction:null}
  armed=false;last=time;candidate=null;return {calibrated:true,direction}
 }}
}
export function lateralTilt(beta:number|null,gamma:number|null,angle:number):number|null{
 if(beta===null||gamma===null||![beta,gamma,angle].every(Number.isFinite))return null
 const radians=angle*Math.PI/180
 return gamma*Math.cos(radians)+beta*Math.sin(radians)
}
