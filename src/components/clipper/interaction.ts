export function createMessageDeck(messages:readonly string[],random:()=>number=Math.random){
 const phrases=[...new Set(messages)];if(phrases.length<8)throw Error('At least eight distinct messages are required')
 let bag:string[]=[],recent:string[]=[]
 const shuffle=()=>{bag=[...phrases];for(let i=bag.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]]}}
 return {draw(excluded:Iterable<string>=[]){
  const blocked=new Set(excluded)
  if(!bag.some(message=>!blocked.has(message)))shuffle()
  const eligible=bag.filter(message=>!blocked.has(message)),fresh=eligible.filter(message=>!recent.includes(message)),next=(fresh.length?fresh:eligible)[0]
  if(next===undefined)throw Error('No eligible message')
  bag.splice(bag.indexOf(next),1);recent=[...recent.slice(-3),next];return next
 }}
}
export interface ClipperSnapshot {messages:string[];waiting:boolean[];laughing:boolean;frame:number;count:number}
export function createClipperInteraction(options:{messages:readonly string[];random?:()=>number;now?:()=>number;schedule?:typeof setTimeout;cancel?:typeof clearTimeout}){
 const deck=createMessageDeck(options.messages,options.random),now=options.now??Date.now,schedule=options.schedule??setTimeout,cancel=options.cancel??clearTimeout
 const initial:string[]=[];for(let i=0;i<4;i++)initial.push(deck.draw(initial))
 let state:ClipperSnapshot={messages:initial,waiting:[false,false,false,false],laughing:false,frame:0,count:0},alive=true,lastClick=0,frameTimer:ReturnType<typeof setTimeout>|undefined,returnTimer:ReturnType<typeof setTimeout>|undefined
 const bubbleTimers=new Map<number,ReturnType<typeof setTimeout>>(),listeners=new Set<()=>void>()
 const emit=(patch:Partial<ClipperSnapshot>)=>{if(!alive)return;state={...state,...patch};listeners.forEach(listener=>listener())}
 const clearBubbles=()=>{bubbleTimers.forEach(timer=>cancel(timer));bubbleTimers.clear()}
 const pop=(index:number)=>{
  if(!alive||index<0||index>3||state.waiting[index])return
  emit({waiting:state.waiting.map((value,i)=>i===index?true:value)})
  bubbleTimers.set(index,schedule(()=>{bubbleTimers.delete(index);if(!alive)return;const messages=[...state.messages];messages[index]=deck.draw(state.messages);emit({messages,waiting:state.waiting.map((value,i)=>i===index?false:value)})},2500))
 }
 const popAll=()=>{
  clearBubbles();emit({waiting:[true,true,true,true]})
  bubbleTimers.set(-1,schedule(()=>{bubbleTimers.delete(-1);if(!alive)return;const previous=[...state.messages],messages:string[]=[];for(let i=0;i<4;i++)messages.push(deck.draw([...previous,...messages]));emit({messages,waiting:[false,false,false,false]})},2500))
 }
 const animate=()=>{
  frameTimer=undefined;if(!alive)return
  if(now()-lastClick>=400){returnTimer=schedule(()=>{returnTimer=undefined;emit({laughing:false,frame:0})},2000);return}
  emit({frame:state.frame%3+1});frameTimer=schedule(animate,160)
 }
 return {
  getSnapshot:()=>state,
  subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener)}},
  activate:()=>{alive=true},
  pop,
  tickle:()=>{if(!alive)return;lastClick=now();cancel(returnTimer);returnTimer=undefined;const count=state.count+1;emit({laughing:true,frame:state.frame||1,count});if(frameTimer===undefined)frameTimer=schedule(animate,160);if(count%15===0)popAll()},
  dispose:()=>{alive=false;clearBubbles();cancel(frameTimer);cancel(returnTimer);frameTimer=undefined;returnTimer=undefined;listeners.clear()},
 }
}
