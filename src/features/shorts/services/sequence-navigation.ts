export type Direction=-1|1
export function sequenceTarget<T extends {id:string}>(items:T[],currentId:string,direction:Direction):T|null{
 const index=items.findIndex(item=>item.id===currentId)
 return index<0?null:items[index+direction]??null
}
export function keyDirection(event:{key:string;repeat?:boolean;altKey?:boolean;ctrlKey?:boolean;metaKey?:boolean;shiftKey?:boolean},editing:boolean):Direction|null{
 if(editing||event.repeat||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return null
 return event.key==='ArrowLeft'?-1:event.key==='ArrowRight'?1:null
}
/** One change per wheel gesture; rearm only after a quiet interval. */
export function createWheelNavigation(now:()=>number=Date.now){
 let last=-Infinity,total=0,fired=false
 return (event:{deltaY:number;deltaX?:number;deltaMode?:number;ctrlKey?:boolean;metaKey?:boolean}):Direction|null=>{
  if(event.ctrlKey||event.metaKey||!Number.isFinite(event.deltaY)||Math.abs(event.deltaX??0)>Math.abs(event.deltaY))return null
  const time=now();if(time-last>300){total=0;fired=false}last=time
  if(fired)return null
  const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?600:1)
  if(Math.sign(total)!==Math.sign(delta))total=0
  total+=delta;if(Math.abs(total)<80)return null
  fired=true;return total>0?1:-1
 }
}

export function hasUnsavedViewerFields(fields:Iterable<{tagName:string;type?:string;value:string;disabled?:boolean}>):boolean{
 for(const field of fields){
  if(field.disabled||['hidden','checkbox','radio','button','submit','reset'].includes(field.type??''))continue
  if(['INPUT','TEXTAREA','SELECT'].includes(field.tagName.toUpperCase())&&field.value.trim())return true
 }
 return false
}
