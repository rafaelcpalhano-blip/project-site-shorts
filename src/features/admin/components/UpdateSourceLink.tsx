import {parseVideoUrl} from '../../../lib/validation/video-url'
export function UpdateSourceLink({source,platform}:{source:string|null;platform:string}){
 let url:string|undefined
 try{const parsed=parseVideoUrl(source??'');if(parsed.platform===platform)url=parsed.url}catch{/* Omit untrusted or incompatible source URLs. */}
 return url?<a href={url} target="_blank" rel="noopener noreferrer">Abrir na fonte original ↗</a>:null
}
