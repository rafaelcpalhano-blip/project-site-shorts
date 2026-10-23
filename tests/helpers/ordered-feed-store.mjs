export function orderedFeedStore({count=45,delay=0,queryDelay=0,mixed=false}={}){
 const at=new Date('2026-10-23T12:00:00Z'),epoch='b'.repeat(32),generationId='a'.repeat(32),docs=new Map(),stats={gets:0,pages:0,candidates:0,active:0,maxActive:0,paths:[],queries:[]}
 for(let g=0;g<5;g++)docs.set('games/g'+g,{officialName:'Jogo '+g,status:mixed&&g>1?['hidden','banned','inactive'][g-2]:'active',source:'manual',reviewStatus:g===1?'provisional':'approved'})
 for(let i=0;i<count;i++)docs.set('shorts/s'+String(i).padStart(3,'0'),{gameId:'g'+i%5,title:'Jogada '+i,platform:'Twitch',platformVideoId:'FeedWindow'+i,normalizedUrl:'https://clips.twitch.tv/FeedWindow'+i,channelName:'Canal',moderationStatus:mixed&&i%7===0?'removed':'published',createdAt:new Date(at-3600000-Math.floor(i/3)*1000),likeCount:i%4,commentCount:i%3})
 docs.set('rankingState/current',{version:1,generationId,computedAt:new Date(at-1000),metricsEpoch:epoch})
 docs.set('rankingState/metrics',{version:1,ready:true,epoch})
 const snapshots=new Map(),pause=ms=>ms?new Promise(resolve=>setTimeout(resolve,ms)):Promise.resolve()
 const store={
  get:async path=>{stats.gets++;stats.paths.push(path);stats.active++;stats.maxActive=Math.max(stats.maxActive,stats.active);try{await pause(typeof delay==='function'?delay(path):delay);return structuredClone(docs.get(path)??null)}finally{stats.active--}},
  rankingPage:async query=>{
   stats.pages++;stats.queries.push(structuredClone(query));await pause(queryDelay)
   const scope=query.mode+':'+(query.gameId??'*'),key=scope+':'+(query.readTime??at.toISOString())
   if(!snapshots.has(key)){
    const rows=[...docs].filter(([p,d])=>p.startsWith('shorts/')&&d.moderationStatus==='published'&&(!query.gameId||d.gameId===query.gameId)).map(([p,data])=>({id:p.slice(7),data:structuredClone(data)}))
    rows.sort((a,b)=>query.mode==='oldest'?a.data.createdAt-b.data.createdAt||a.id.localeCompare(b.id):query.mode==='likes'?b.data.likeCount-a.data.likeCount||b.data.createdAt-a.data.createdAt||b.id.localeCompare(a.id):query.mode==='relevant'?(Number(b.id.slice(1))%6)-(Number(a.id.slice(1))%6)||b.data.createdAt-a.data.createdAt||b.id.localeCompare(a.id):b.data.createdAt-a.data.createdAt||b.id.localeCompare(a.id))
    snapshots.set(key,query.mode==='relevant'?rows.map(row=>({id:'rank-'+row.id,data:{shortId:row.id,createdAt:row.data.createdAt,score:Number(row.id.slice(1))%6,generationId}})):rows)
   }
   const rows=snapshots.get(key),start=query.cursor?rows.findIndex(row=>row.id===query.cursor.id)+1:0,items=rows.slice(start,start+query.limit)
   stats.candidates+=items.length;return {items:structuredClone(items),readTime:query.readTime??at.toISOString()}
  },
  transact:async()=>{throw Error('no-writes-in-feed-test')},
 }
 return {store,docs,stats,now:()=>new Date(at),snapshots}
}
