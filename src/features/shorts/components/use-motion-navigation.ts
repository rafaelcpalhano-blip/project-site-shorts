import {useEffect,useEffectEvent,useRef,useState} from 'react'
import {createTiltNavigation,lateralTilt} from '../services/mobile-navigation'
import type {Direction} from '../services/sequence-navigation'
type OrientationAPI=typeof DeviceOrientationEvent&{requestPermission?:()=>Promise<string>}
export function useMotionNavigation(move:(direction:Direction)=>void,blocked:boolean){
 const [enabled,setEnabled]=useState(false),[requesting,setRequesting]=useState(false),[message,setMessage]=useState('Movimento opcional, desativado. Gestos e botões continuam disponíveis.')
 const live=useRef(true),generation=useRef(0),detector=useRef(createTiltNavigation()),lastSample=useRef(-Infinity)
 useEffect(()=>{live.current=true;return()=>{live.current=false}},[])
 const stop=()=>{generation.current++;setEnabled(false);setRequesting(false);setMessage('Navegação por movimento desativada.')}
 const toggle=async()=>{
  if(enabled||requesting){stop();return}
  if(!window.isSecureContext||typeof window.DeviceOrientationEvent==='undefined'){setMessage('Sensores indisponíveis neste navegador ou endereço. Use os gestos e botões.');return}
  const request=++generation.current;setRequesting(true)
  try{
   const api=window.DeviceOrientationEvent as OrientationAPI
   const permission=api.requestPermission?await api.requestPermission():'granted'
   if(!live.current||request!==generation.current)return
   if(permission!=='granted'){setMessage('Permissão dos sensores não concedida. Gestos e botões continuam disponíveis.');return}
   detector.current.reset();lastSample.current=-Infinity;setMessage('Calibrando: mantenha o celular na posição inicial por um instante.');setEnabled(true)
  }catch{if(live.current&&request===generation.current)setMessage('Não foi possível ativar os sensores. Use os gestos e botões.')}
  finally{if(live.current&&request===generation.current)setRequesting(false)}
 }
 const observe=useEffectEvent((event:DeviceOrientationEvent)=>{
  if(blocked||document.visibilityState==='hidden'||document.activeElement?.matches('input,textarea,select,[contenteditable="true"]')){detector.current.suspend();return false}
  const time=performance.now();if(time-lastSample.current<45)return false;lastSample.current=time
  const angle=screen.orientation?.angle??0,value=lateralTilt(event.beta,event.gamma,angle)
  if(value===null)return false
  const result=detector.current.observe(value,time)
  if(result.calibrated)setMessage('Movimento ativo: incline à direita para avançar ou à esquerda para voltar; retorne ao centro entre vídeos.')
  if(result.direction!==null)move(result.direction)
  return true
 })
 useEffect(()=>{
  if(!enabled)return
  let received=false
  const unavailable=setTimeout(()=>{if(!received){setEnabled(false);setMessage('Nenhuma leitura utilizável dos sensores. Use os gestos e botões.')}},3500)
  const onData=(event:DeviceOrientationEvent)=>{if(observe(event))received=true}
  const calibrate=()=>{detector.current.reset();lastSample.current=-Infinity;setMessage('Orientação alterada. Mantenha a nova posição para recalibrar.')}
  const hide=()=>{if(document.visibilityState==='hidden'){setEnabled(false);setMessage('Movimento desativado ao sair da página.')}}
  window.addEventListener('deviceorientation',onData);screen.orientation?.addEventListener('change',calibrate);window.addEventListener('orientationchange',calibrate);document.addEventListener('visibilitychange',hide)
  return()=>{clearTimeout(unavailable);window.removeEventListener('deviceorientation',onData);screen.orientation?.removeEventListener('change',calibrate);window.removeEventListener('orientationchange',calibrate);document.removeEventListener('visibilitychange',hide)}
 },[enabled])
 return {enabled,requesting,message,toggle}
}
