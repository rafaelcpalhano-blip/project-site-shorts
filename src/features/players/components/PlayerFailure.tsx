import {useRef,useState,useEffect} from 'react'
import {reportPlaybackFailure} from '../services/playback-failure-api'
import styles from './PlayerFailure.module.css'
// Slot reserved for an approved maintenance illustration; retain the existing Clipper identity.
const maintenanceArtwork:string|null=null
export function PlayerFailure({shortId,received,onRetry}:{shortId:string;received:boolean;onRetry:()=>void}){
 const [sent,setSent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(false)
 const active=useRef(true),lock=useRef(false)
 useEffect(()=>{active.current=true;return()=>{active.current=false}},[])
 const report=async()=>{if(lock.current)return;lock.current=true;setBusy(true);setError(false);const ok=await reportPlaybackFailure(shortId,'manual');if(active.current){setSent(ok);setError(!ok);setBusy(false)}lock.current=false}
 return <div className={styles.failure} data-short-interactions>
  <img src={maintenanceArtwork??'/clipper/load-failure.webp'} width="112" height="168" alt="Clipper tentando resolver uma falha de carregamento" decoding="async"/>
  <h3>Ops! Não consegui reproduzir este vídeo por aqui.</h3>
  <p role="alert">Pode ser uma indisponibilidade temporária ou uma restrição da plataforma.</p>
  <button type="button" onClick={onRetry}>Tentar carregar novamente</button>
  {received||sent?<p role="status">O problema foi sinalizado para análise.</p>:<button type="button" disabled={busy} onClick={()=>void report()}>{busy?'Enviando…':'Sinalizar que o vídeo não carregou'}</button>}
  {error&&<p role="alert">Não foi possível enviar o aviso. Tente novamente mais tarde.</p>}
 </div>
}
