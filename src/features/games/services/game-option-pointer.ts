export interface OptionPointer {pointerId:number;pointerType:string;isPrimary:boolean;clientX:number;clientY:number;id:string;scrollTop:number;time:number}
/** Resolve taps before compatibility click/focus changes; a pan/cancel never selects. */
export function createOptionPointer(){
 let current:OptionPointer|null=null,moved=false,suppressClick=false
 return {
  get active(){return current!==null},
  start(input:OptionPointer){current=input.isPrimary?input:null;moved=false;suppressClick=input.pointerType!=='mouse'},
  move(input:{pointerId:number;clientX:number;clientY:number}){if(current?.pointerId===input.pointerId&&(Math.abs(input.clientX-current.clientX)>10||Math.abs(input.clientY-current.clientY)>10))moved=true},
  end(input:{pointerId:number;clientX:number;clientY:number;scrollTop:number;time:number}){
   const start=current;if(!start||start.pointerId!==input.pointerId)return null
   current=null
   return start.pointerType!=='mouse'&&!moved&&Math.abs(input.clientX-start.clientX)<=10&&Math.abs(input.clientY-start.clientY)<=10&&Math.abs(input.scrollTop-start.scrollTop)<2&&input.time-start.time<700?start.id:null
  },
  cancel(){current=null;moved=true},
  click(detail:number){return detail===0||!suppressClick},
 }
}