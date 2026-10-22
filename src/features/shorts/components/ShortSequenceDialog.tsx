import {useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react'
import {Modal} from '../../../components/ui/Modal'
import {playback} from '../../players/services/playback'
import {validThumbnail} from '../../../lib/validation/thumbnail'
import {sequenceTarget,keyDirection,createWheelNavigation} from '../services/sequence-navigation'
import type {Direction} from '../services/sequence-navigation'
import type {Short} from '../types/models'
import {FirestoreShortContent} from './FirestoreShortDialog'
import styles from './ShortSequenceDialog.module.css'
export function ShortSequenceDialog({short,items,onNavigate,onClose,onLikeCount,onModerated}:{short:Short;items:Short[];onNavigate:(short:Short)=>void;onClose:()=>void;onLikeCount:(id:string,count:number)=>void;onModerated:()=>void}){
 const [busy,setBusy]=useState(false),[pending,setPending]=useState<Direction|null>(null),[transition,setTransition]=useState<{direction:Direction;previous:Short}|null>(null)
 const content=useRef<HTMLDivElement>(null),controls=useRef<HTMLElement>(null),cancel=useRef<HTMLButtonElement>(null),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),moving=useRef(false)
 const busyNow=useRef(false)
 const reportBusy=useCallback((value:boolean)=>{busyNow.current=value;setBusy(value)},[])
 const wheel=useRef(createWheelNavigation()),moveRef=useRef<(direction:Direction)=>void>(()=>{})
 const previous=sequenceTarget(items,short.id,-1),next=sequenceTarget(items,short.id,1),position=items.findIndex(item=>item.id===short.id)
 const move=(direction:Direction,discard=false)=>{
  if(busyNow.current||moving.current)return
  const target=sequenceTarget(items,short.id,direction);if(!target)return
  const draft=Array.from(content.current?.querySelectorAll<HTMLInputElement|HTMLTextAreaElement>('textarea,input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"])')??[]).some(field=>field.value.trim())
  if(draft&&!discard){setPending(direction);return}
  const owner=playback.getSnapshot();if(owner)playback.release(owner)
  moving.current=true;setPending(null);setTransition({direction,previous:short});onNavigate(target)
  timer.current=setTimeout(()=>{moving.current=false;setTransition(null)},240)
  requestAnimationFrame(()=>{content.current?.closest('dialog')?.scrollTo({top:0});content.current?.focus({preventScroll:true})})
 }
 useLayoutEffect(()=>{moveRef.current=move})
 useEffect(()=>{if(pending!==null)cancel.current?.focus()},[pending])
 useEffect(()=>()=>{clearTimeout(timer.current)},[])
 useEffect(()=>{
  const node=controls.current!
  const onWheel=(event:WheelEvent)=>{if(busy||moving.current||pending!==null)return;const direction=wheel.current(event);if(direction!==null&&sequenceTarget(items,short.id,direction)){event.preventDefault();moveRef.current(direction)}}
  node.addEventListener('wheel',onWheel,{passive:false});return()=>node.removeEventListener('wheel',onWheel)
 },[busy,items,short.id,pending])
 const ghost=transition&&validThumbnail(transition.previous.thumbnail,transition.previous.platform,transition.previous.identity)
 return <Modal title={short.title} wide closeDisabled={busy} onClose={()=>{if(!busyNow.current)onClose()}} onKeyDown={event=>{
  const editing=!!(event.target as HTMLElement).closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),iframe,form,[data-short-interactions]')
  const direction=keyDirection(event,editing);if(direction===null||busyNow.current||pending!==null||moving.current)return
  if(sequenceTarget(items,short.id,direction)){event.preventDefault();move(direction)}
 }}>
 <div className={styles.viewer}>
 <nav ref={controls} className={styles.controls} aria-label="Sequência de vídeos da página atual">
 <button type="button" className={styles.previous} aria-label="Vídeo anterior" disabled={!previous||busy||!!transition||pending!==null} onClick={()=>move(-1)}>←</button>
 <p className={styles.position} role="status">{position>=0?'Vídeo '+(position+1)+' de '+items.length:'Vídeo selecionado'}<small>Role sobre esta faixa para trocar de vídeo.</small></p>
 <button type="button" className={styles.next} aria-label="Próximo vídeo" disabled={!next||busy||!!transition||pending!==null} onClick={()=>move(1)}>→</button>
 </nav>
 {pending!==null&&<div className="inset" role="group" aria-label="Confirmar troca de vídeo"><p>Trocar de vídeo e descartar o texto não enviado?</p><div className="actions"><button ref={cancel} type="button" onClick={()=>{setPending(null);requestAnimationFrame(()=>content.current?.focus({preventScroll:true}))}}>Continuar neste vídeo</button><button type="button" onClick={()=>move(pending,true)}>Descartar e trocar</button></div></div>}
 <div className={styles.stage}>
 {transition&&<div aria-hidden="true" className={transition.direction===1?styles.outLeft:styles.outRight}>{ghost&&<img src={ghost.url} alt="" referrerPolicy="no-referrer" onError={event=>{event.currentTarget.hidden=true}}/>}<p>{transition.previous.title}</p></div>}
 <div ref={content} key={short.id} tabIndex={-1} className={transition?(transition.direction===1?styles.inRight:styles.inLeft):undefined}>
 <FirestoreShortContent short={short} onLikeCount={onLikeCount} onModerated={onModerated} onBusyChange={reportBusy}/>
 </div>
 </div>
 <p className="muted">A sequência usa somente os vídeos desta página, na ordem e no filtro atuais.</p>
 </div>
 </Modal>
}
