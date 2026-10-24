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
