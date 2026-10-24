import {thumbnailUrl} from '../../../lib/validation/thumbnail.ts'
// Only the known unsigned JPEG pair with matching 16:9 framing is eligible.
export function youtubeCardImage(url:string,identity:string,failed:(url:string)=>boolean){
 if(thumbnailUrl(url,'YouTube',identity)!==url)return
 const original=new URL(url)
 if(original.search||!/^\/vi\/[\w-]{11}\/maxresdefault\.jpg$/.test(original.pathname))return
 const medium=new URL(original);medium.pathname=medium.pathname.replace('/maxresdefault.jpg','/mqdefault.jpg')
 if(failed(medium.href))return
 return {medium:medium.href,srcSet:medium.href+' 320w, '+url+' 1280w',sizes:'(max-width: 450px) calc(100vw - 34px), 320px'}
}
/** YouTube can answer with a small 4:3 placeholder instead of an HTTP error. */
export function unusableMediumImage(width:number,height:number){return width<=0||height<=0||Math.abs(width/height-16/9)>0.05}
// Keep valid portrait/4:3 sources untouched; only the tiny known maxres placeholder fails.
export function unusableMaxresImage(width:number,height:number){return width<=0||height<=0||(width<=120&&height<=90&&Math.abs(width/height-4/3)<0.05)}
