interface LikeCountItem {id:string;likeCount?:number}
export function updateItemLikeCount<T extends LikeCountItem>(item:T,id:string,count:number):T{
 return item.id===id&&item.likeCount!==count?{...item,likeCount:count}:item
}
/** Preserve page identity when a state read confirms the count already displayed. */
export function updatePageLikeCount<T extends {items:LikeCountItem[]}>(page:T,id:string,count:number):T{
 if(!page.items.some(item=>item.id===id&&item.likeCount!==count))return page
 return {...page,items:page.items.map(item=>updateItemLikeCount(item,id,count))}
}
