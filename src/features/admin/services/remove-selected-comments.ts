export interface SelectedComment {id:string;content:string}
/** Reuse one revision-checked transaction per comment; never retry a completed deletion. */
export async function removeSelectedComments<T extends SelectedComment>(items:SelectedComment[],read:(id:string)=>Promise<T>,remove:(item:T)=>Promise<unknown>,canContinue:()=>boolean=()=>true){
 if(items.length<1||items.length>20||new Set(items.map(item=>item.id)).size!==items.length)throw Error('Seleção inválida de comentários.')
 const removed:string[]=[]
 for(const item of items){
  if(!canContinue())return {removed,error:Error('Operação interrompida.')}
  try{
   const current=await read(item.id)
   if(current.id!==item.id||current.content!==item.content)throw Error('O comentário mudou. Atualize a lista antes de tentar novamente.')
   if(!canContinue())return {removed,error:Error('Operação interrompida.')}
   await remove(current);removed.push(item.id)
  }catch(error){return {removed,error}}
 }
 return {removed,error:null}
}
