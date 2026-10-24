import {useEffect,useState,useSyncExternalStore} from 'react'
import {clipperMessages} from './messages'
import {createClipperInteraction} from './interaction'
import styles from './ClipperCommunity.module.css'
const frames=['/clipper/tickle-1.webp','/clipper/tickle-2.webp','/clipper/tickle-3.webp'] as const
export function ClipperCommunity(){
 const [interaction]=useState(()=>createClipperInteraction({messages:clipperMessages})),state=useSyncExternalStore(interaction.subscribe,interaction.getSnapshot,interaction.getSnapshot)
 const [loaded,setLoaded]=useState(0),[failed,setFailed]=useState(false),ready=loaded===7&&!failed
 useEffect(()=>{interaction.activate();return()=>interaction.dispose()},[interaction])
 return <section className={styles.community} aria-label="Converse e brinque com o Clipper">
  {state.messages.map((message,index)=><button key={index} type="button" className={styles.bubble+' '+styles['bubble'+index]+(state.waiting[index]?' '+styles.waiting:'')} aria-label={state.waiting[index]?'Preparando nova mensagem do Clipper':'Trocar mensagem: '+message} aria-disabled={state.waiting[index]} onClick={()=>interaction.pop(index)}><span className={styles.message} key={message}>{message}</span>{state.waiting[index]&&<span className={styles.dots} aria-hidden="true">…</span>}</button>)}
  <button className={styles.mascot+(state.laughing?' '+styles.tickled:'')} type="button" aria-label="Fazer cócegas no Clipper" onKeyDown={event=>{if(event.repeat&&(event.key==='Enter'||event.key===' '))event.preventDefault()}} onClick={()=>interaction.tickle()}>
   <span className={styles.art} data-ready={ready}>
    <img className={state.laughing&&ready?styles.inactive:styles.visible} src="/clipper/welcome.webp" width="512" height="768" alt="" loading="lazy" decoding="async"/>
    {state.hasInteracted&&frames.map((src,index)=><img key={src} src={src} width="320" height="480" alt="" decoding="async" className={ready&&state.laughing&&state.frame===index+1?styles.visible:styles.inactive} onLoad={()=>setLoaded(value=>value|(1<<index))} onError={event=>{event.currentTarget.hidden=true;setFailed(true)}}/>)}
   </span>
   <span className={styles.laugh+(state.laughing?' '+styles.laughing:'')} aria-hidden="true">HaHaHA!</span>
  </button>
  <p className={styles.hint}>Toque nos balões para trocar as mensagens ou faça cócegas no Clipper.</p>
 </section>
}
