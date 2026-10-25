export type UpdateCategory='published'|'reports'|'playback'
export function updateFields(category:UpdateCategory,data:{shortId:string;title:unknown;platform:unknown;gameName?:unknown}){
 return {notificationChannel:'updates',notificationKind:category,shortId:data.shortId,title:typeof data.title==='string'?data.title:'Vídeo',platform:typeof data.platform==='string'?data.platform:'',gameName:typeof data.gameName==='string'?data.gameName:''}
}
