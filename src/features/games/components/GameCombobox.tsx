import { useEffect, useId, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Ref } from 'react'
import styles from './GameCombobox.module.css'
export interface GameOption { id:string; name:string }
import { filterGameOptions } from '../services/game-options'
export function GameCombobox({games,value,onChange,disabled=false,loading=false,controlRef,onAdvance}:{games:GameOption[];value:string;onChange:(id:string)=>void;disabled?:boolean;loading?:boolean;controlRef?:Ref<HTMLButtonElement>;onAdvance?:()=>void}){
  const uid=useId(),listId=uid+'-list',labelId=uid+'-label',valueId=uid+'-value'
  const trigger=useRef<HTMLButtonElement>(null),search=useRef<HTMLInputElement>(null),panel=useRef<HTMLDivElement>(null),list=useRef<HTMLUListElement>(null)
  useImperativeHandle(controlRef,()=>trigger.current!,[])
  const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[active,setActive]=useState('')
  const [position,setPosition]=useState({top:0,left:0,width:0,height:0})
  const options=useMemo(()=>filterGameOptions(games,query),[games,query])
  const selected=games.find(game=>game.id===value)
  function close(focus=true){setOpen(false);if(focus)trigger.current?.focus()}
  function show(){if(disabled||loading)return;setQuery('');setActive(value||filterGameOptions(games,'')[0]?.id||'');setOpen(true)}
  function select(id:string){onChange(id);close();onAdvance?.()}
  useLayoutEffect(()=>{
    if(!open)return
    const place=()=>{
      const rect=trigger.current?.getBoundingClientRect();if(!rect)return
      const viewport=window.visualViewport,bottom=(viewport?.height??innerHeight)+(viewport?.offsetTop??0),top=viewport?.offsetTop??0
      const below=bottom-rect.bottom-12,above=rect.top-top-12,up=below<358&&above>below,available=Math.max(0,up?above:below),height=Math.min(358,available)
      setPosition({top:up?Math.max(top+8,rect.top-height-4):rect.bottom+4,left:Math.max(8,rect.left),width:Math.min(rect.width,innerWidth-16),height})
    }
    place();search.current?.focus({preventScroll:true})
    const scroll=(event:Event)=>{if(!panel.current?.contains(event.target as Node))place()}
    window.addEventListener('resize',place);window.addEventListener('scroll',scroll,true);window.visualViewport?.addEventListener('resize',place)
    return()=>{window.removeEventListener('resize',place);window.removeEventListener('scroll',scroll,true);window.visualViewport?.removeEventListener('resize',place)}
  },[open])
  useEffect(()=>{
    if(!open)return
    const outside=(event:PointerEvent)=>{if(!panel.current?.contains(event.target as Node)&&!trigger.current?.contains(event.target as Node))setOpen(false)}
    document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside)
  },[open])
  useLayoutEffect(()=>{
    if(!open)return
    const option=[...(list.current?.children??[])].find(node=>node.getAttribute('data-game-id')===active) as HTMLElement|undefined
    const container=list.current;if(!option||!container)return
    if(option.offsetTop<container.scrollTop)container.scrollTop=option.offsetTop
    else if(option.offsetTop+option.offsetHeight>container.scrollTop+container.clientHeight)container.scrollTop=option.offsetTop+option.offsetHeight-container.clientHeight
  },[open,active,position.height])
  const highlighted=options.find(game=>game.id===active)?.id
  return <div className={styles.root}>
    <label id={labelId} htmlFor={uid}>Jogo <span aria-hidden="true">*</span></label>
    <button id={uid} type="button" ref={trigger} className={styles.trigger} disabled={disabled||loading} aria-labelledby={labelId+' '+valueId} aria-haspopup="listbox" aria-describedby={uid+"-hint"} aria-expanded={open} aria-controls={open?listId:undefined} onClick={()=>open?close():show()} onKeyDown={event=>{
      if(event.nativeEvent.isComposing)return
      if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();show()}
    }}><span id={valueId}>{loading?'Carregando jogos...':selected?.name||'Selecione um jogo'}</span><span aria-hidden="true">▾</span></button>
    <span id={uid+"-hint"} hidden>Seleção obrigatória. Abra para pesquisar jogos cadastrados.</span>
    <select hidden aria-hidden="true" tabIndex={-1} required disabled={disabled||loading} value={selected?.id||''} onChange={()=>{}} onInvalid={event=>{event.preventDefault();show()}}><option value=""/>{selected&&<option value={selected.id}>{selected.name}</option>}</select>
    {open&&!disabled&&!loading&&<div ref={panel} className={styles.panel} style={{top:position.top,left:position.left,width:position.width,maxHeight:position.height}} onBlur={event=>{if(event.relatedTarget&&!event.currentTarget.contains(event.relatedTarget as Node)&&event.relatedTarget!==trigger.current)setOpen(false)}}>
      <input ref={search} role="combobox" aria-required="true" aria-label="Pesquisar jogos cadastrados" aria-expanded="true" aria-controls={listId} aria-autocomplete="list" aria-activedescendant={highlighted?uid+'-option-'+highlighted:undefined} autoComplete="off" placeholder="Pesquisar jogo..." value={query} onChange={event=>{setQuery(event.target.value);setActive(filterGameOptions(games,event.target.value)[0]?.id||'')}} onKeyDown={event=>{
        if(event.nativeEvent.isComposing)return
        if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close()}
        else if(event.key==='Tab'){close()}
        else if(event.key==='Enter'){event.preventDefault();if(highlighted)select(highlighted)}
        else if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();const index=options.findIndex(game=>game.id===active),next=event.key==='ArrowDown'?Math.min(options.length-1,index+1):Math.max(0,index-1);setActive(options[next]?.id||'')}
      }}/>
      <ul ref={list} id={listId} role="listbox" aria-labelledby={labelId} className={styles.list}>
        {options.map(game=><li id={uid+'-option-'+game.id} key={game.id} data-game-id={game.id} role="option" aria-selected={value===game.id} className={(active===game.id?styles.active:'')+' '+(value===game.id?styles.selected:'')} onPointerDown={event=>{if(event.pointerType==='mouse')event.preventDefault()}} onClick={()=>select(game.id)}>{game.name}{value===game.id&&<span aria-hidden="true"> ✓</span>}</li>)}
      </ul>
      <span className={styles.status} role="status">{options.length?options.length+' jogos encontrados':'Nenhum jogo encontrado'}</span>
    </div>}
  </div>
}
