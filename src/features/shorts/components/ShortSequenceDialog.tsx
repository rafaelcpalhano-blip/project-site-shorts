import {createSwipeNavigation} from '../services/mobile-navigation'
import {useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react'
import {Modal} from '../../../components/ui/Modal'
import {playback} from '../../players/services/playback'
import {validThumbnail} from '../../../lib/validation/thumbnail'
import {sequenceTarget,keyDirection,createWheelNavigation,hasUnsavedViewerFields} from '../services/sequence-navigation'
import type {Direction} from '../services/sequence-navigation'
import type {Short} from '../types/models'
import {FirestoreShortContent} from './FirestoreShortDialog'
import styles from './ShortSequenceDialog.module.css'
export function ShortSequenceDialog({short,items,onNavigate,onClose,onLikeCount,onCommentCount,onModerated,hasPreviousPage=false,hasNextPage=false,onBoundary}:{short:Short;items:Short[];onNavigate:(short:Short)=>void;onClose:()=>void;onLikeCount:(id:string,count:number)=>void;onCommentCount?:(id:string,count:number)=>void;onModerated:()=>void;hasPreviousPage?:boolean;hasNextPage?:boolean;onBoundary?:(direction:Direction)=>Promise<Short|null>}){
 const [busy,setBusy]=useState(false),[pending,setPending]=useState<Direction|null>(null),[transition,setTransition]=useState<{direction:Direction;previous:Short}|null>(null)
 const [crossing,setCrossing]=useState(false),[failure,setFailure]=useState(''),[end,setEnd]=useState<{id:string;direction:Direction}|null>(null)
 const content=useRef<HTMLDivElement>(null),controls=useRef<HTMLElement>(null),cancel=useRef<HTMLButtonElement>(null),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),moving=useRef(false),live=useRef(true)
 const busyNow=useRef(false),swipe=useRef(createSwipeNavigation()),wheel=useRef(createWheelNavigation()),moveRef=useRef<(direction:Direction)=>void>(()=>{}),canWheel=useRef<(direction:Direction)=>boolean>(()=>false)
 const reportBusy=useCallback((value:boolean)=>{busyNow.current=value;setBusy(value)},[])
 const canMove=(direction:Direction)=>!!sequenceTarget(items,short.id,direction)||!!onBoundary&&(direction===1?hasNextPage:hasPreviousPage)&&!(end?.id===short.id&&end.direction===direction)
 const move=async(direction:Direction,discard=false)=>{
  if(busyNow.current||moving.current||pending!==null&&!discard||!canMove(direction))return
  const draft=hasUnsavedViewerFields(Array.from(content.current?.querySelectorAll<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>('textarea,input,select')??[]).map(field=>({tagName:field.tagName,type:field.type,value:field.value,disabled:field.matches(':disabled')})))
  if(draft&&!discard){setPending(direction);return}
  moving.current=true;setPending(null);setFailure('')
  let target=sequenceTarget(items,short.id,direction)
  try {
   if(!target&&onBoundary){setCrossing(true);target=await onBoundary(direction)}
   if(!live.current)return
   setCrossing(false)
   if(!target){moving.current=false;setEnd({id:short.id,direction});return}
   const owner=playback.getSnapshot();if(owner)playback.release(owner)
   setTransition({direction,previous:short});onNavigate(target)
   timer.current=setTimeout(()=>{moving.current=false;setTransition(null)},240)
   requestAnimationFrame(()=>{content.current?.closest('dialog')?.scrollTo({top:0});content.current?.focus({preventScroll:true})})
  }catch(reason){if(live.current){moving.current=false;setCrossing(false);if(!(reason instanceof DOMException&&reason.name==='AbortError'))setFailure('Não foi possível carregar os próximos vídeos. Seu vídeo foi mantido. Tente a seta novamente.')}}
 }
 useLayoutEffect(()=>{moveRef.current=direction=>void move(direction);canWheel.current=direction=>!busy&&pending===null&&canMove(direction)})
 useEffect(()=>{if(pending!==null)cancel.current?.focus()},[pending])
 useEffect(()=>{live.current=true;return()=>{live.current=false;clearTimeout(timer.current)}},[])
 useEffect(()=>{
  const node=controls.current!
  const onWheel=(event:WheelEvent)=>{if(busyNow.current||moving.current)return;const direction=wheel.current(event);if(direction!==null&&canWheel.current(direction)){event.preventDefault();moveRef.current(direction)}}
  node.addEventListener('wheel',onWheel,{passive:false});return()=>node.removeEventListener('wheel',onWheel)
 },[short.id])
 const navigation=<nav ref={controls} className={styles.controls} aria-label="Navegação entre vídeos" onPointerDown={event=>{if((event.target as HTMLElement).closest('button,a,input,textarea,select')||busy||moving.current||pending!==null){swipe.current.cancel();return}swipe.current.start({pointerId:event.pointerId,pointerType:event.pointerType,isPrimary:event.isPrimary,clientX:event.clientX,clientY:event.clientY,time:performance.now(),viewportWidth:innerWidth})}} onPointerMove={event=>swipe.current.move(event)} onPointerCancel={()=>swipe.current.cancel()} onPointerUp={event=>{const direction=swipe.current.end({pointerId:event.pointerId,clientX:event.clientX,clientY:event.clientY,time:performance.now()});if(direction!==null&&canMove(direction)){event.preventDefault();void move(direction)}}}>
  <button type="button" aria-label="Vídeo anterior" disabled={!canMove(-1)||busy||!!transition||crossing||pending!==null} onClick={()=>void move(-1)}>←</button>
  <span className={styles.gesture} aria-hidden="true"/>
  <button type="button" aria-label="Próximo vídeo" disabled={!canMove(1)||busy||!!transition||crossing||pending!==null} onClick={()=>void move(1)}>→</button>
 </nav>
 const ghost=transition&&validThumbnail(transition.previous.thumbnail,transition.previous.platform,transition.previous.identity)
 return <Modal title="Visualizador de short" wide viewer closeDisabled={busy} onClose={()=>{if(!busyNow.current)onClose()}} onKeyDown={event=>{
  const editing=!!(event.target as HTMLElement).closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),iframe,form,[data-short-interactions]')
  const direction=keyDirection(event,editing);if(direction===null||busyNow.current||pending!==null||moving.current)return
  if(canMove(direction)){event.preventDefault();void move(direction)}
 }}>
 <div className={styles.viewer}>
 {crossing&&<p className={styles.loading} role="status">Carregando…</p>}
 {failure&&<p role="alert">{failure}</p>}
 {pending!==null&&<div className="inset" role="group" aria-label="Confirmar troca de vídeo"><p>Trocar de vídeo e descartar o texto não enviado?</p><div className="actions"><button ref={cancel} type="button" onClick={()=>{setPending(null);requestAnimationFrame(()=>content.current?.focus({preventScroll:true}))}}>Continuar neste vídeo</button><button type="button" onClick={()=>void move(pending,true)}>Descartar e trocar</button></div></div>}
 <div className={styles.stage}>
 {transition&&<div aria-hidden="true" className={transition.direction===1?styles.outLeft:styles.outRight}>{ghost&&<img src={ghost.url} alt="" referrerPolicy="no-referrer" onError={event=>{event.currentTarget.hidden=true}}/>}<p>{transition.previous.title}</p></div>}
 <div ref={content} key={short.id} tabIndex={-1} className={transition?(transition.direction===1?styles.inRight:styles.inLeft):undefined}>
 <FirestoreShortContent short={short} navigation={navigation} onLikeCount={onLikeCount} onCommentCount={onCommentCount} onModerated={onModerated} onBusyChange={reportBusy}/>
 </div>
 </div>
 </div>
 </Modal>
}
