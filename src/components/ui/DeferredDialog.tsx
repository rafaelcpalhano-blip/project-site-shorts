import {useEffect,useState} from 'react'
import type {ComponentType} from 'react'
import {Modal} from './Modal'

// Only the shell mounts while loading. Closing it invalidates the pending result.
export function DeferredDialog<P extends object>({load,dialogProps,title,onClose}:{load:()=>Promise<ComponentType<P>>;dialogProps:P;title:string;onClose:()=>void}) {
  const [Content,setContent]=useState<ComponentType<P>|null>(null)
  const [failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0)
  useEffect(()=>{
    let active=true
    load().then(component=>{if(active)setContent(()=>component)},()=>{if(active)setFailed(true)})
    return()=>{active=false}
  },[load,attempt])
  if(Content)return <Content {...dialogProps}/>
  return <Modal title={title} onClose={onClose}>
    {failed?<div role="alert"><p>Não foi possível abrir o vídeo. Tente novamente.</p><button type="button" onClick={()=>{setFailed(false);setAttempt(value=>value+1)}}>Tentar novamente</button></div>:<p role="status">Carregando vídeo...</p>}
  </Modal>
}
