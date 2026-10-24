import {useEffect,useEffectEvent,useRef} from 'react'
export function useAdminListRefresh(revision:number|undefined,busy:boolean,refresh:()=>void){
 const consumed=useRef(revision),refreshLatest=useEffectEvent(refresh)
 useEffect(()=>{if(busy||consumed.current===revision)return;consumed.current=revision;refreshLatest()},[revision,busy])
}
