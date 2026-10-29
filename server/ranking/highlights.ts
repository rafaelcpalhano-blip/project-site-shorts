import {timestamp} from './metrics.ts'
export const highlightsPolicy=Object.freeze({maximumItems:15,intervalMs:45*60000})
export interface RankingCandidate {shortId:string;gameId:string;score:number;createdAt:Date}
/** Keep up to fifteen per game, once per short. The global top fifteen is always
 * contained in this union, so the reader can serve either scope without copies.
 * Score, creation time and document ID follow the same descending indexed order. */
export function selectRankingHighlights<T extends RankingCandidate>(frames:readonly T[]):T[]{
 const counts=new Map<string,number>()
 return [...frames].sort((a,b)=>b.score-a.score||timestamp(b.createdAt)-timestamp(a.createdAt)||(a.shortId===b.shortId?0:a.shortId<b.shortId?1:-1)).filter(frame=>{const n=counts.get(frame.gameId)??0;if(n>=highlightsPolicy.maximumItems)return false;counts.set(frame.gameId,n+1);return true})
}
export function isRankingHighlightsSelection(frames:readonly Pick<RankingCandidate,'gameId'>[]):boolean{
 const counts=new Map<string,number>()
 for(const frame of frames){const n=(counts.get(frame.gameId)??0)+1;if(n>highlightsPolicy.maximumItems)return false;counts.set(frame.gameId,n)}
 return true
}
