import {useLayoutEffect,useRef} from 'react'
/** Scroll only explicit pagination; initial load, viewer navigation and route restoration keep their own position. */
export function useFeedPageScroll(loading:boolean,current:number,context:unknown){
 const heading=useRef<HTMLHeadingElement>(null)
 const pending=useRef<{page:number;context:unknown}|null>(null)
 const requestScroll=(page:number)=>{pending.current={page,context}}
 useLayoutEffect(()=>{
  const target=pending.current
  if(!target)return
  if(target.context!==context){pending.current=null;return}
  if(loading||target.page!==current)return
  pending.current=null
  // Moving focus off the clicked paginator prevents focus/scroll anchoring to its new position.
  heading.current?.focus({preventScroll:true})
  heading.current?.scrollIntoView({block:'start',behavior:'instant'})
 },[loading,current,context])
 return {heading,requestScroll}
}
