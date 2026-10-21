export const TITLE_SEARCH_VERSION=1
export function normalizeTitle(value:string):string {
 return value.normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('pt-BR').replace(/\s+/gu,' ').trim()
}
export function titleSearchFields(title:string) {
 if(typeof title!=='string'||!title.trim()||title.length>500)throw new Error('invalid-search-title')
 const points=[...normalizeTitle(title)],fragments=new Set<string>()
 for(let size=1;size<=3;size++)for(let offset=0;offset+size<=points.length;offset++)fragments.add(points.slice(offset,offset+size).join(''))
 return {searchFragments:[...fragments],titleSearchVersion:TITLE_SEARCH_VERSION}
}

export interface TitleSearchCursor {time:string;id:string;query:string;gameId:string|null;order:'recent'}
