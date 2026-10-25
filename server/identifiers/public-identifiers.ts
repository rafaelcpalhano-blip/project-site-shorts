import type {AtomicTransaction,RecordData} from '../firestore/atomic-store.ts'
export type IdentifierKind='manual-game'|'comment'
export function formatPublicIdentifier(kind:IdentifierKind,sequence:number):string {
 if(!Number.isSafeInteger(sequence)||sequence<0)throw Error('invalid-identifier-sequence')
 if(kind==='manual-game')return 'mn'+String(sequence).padStart(4,'0')
 let remaining=sequence
 for(let letters=0;letters<=9;letters++){
  const digits=9-letters,range=26**letters*10**digits
  if(remaining>=range){remaining-=range;continue}
  const number=remaining%10**digits
  let prefix='',value=Math.floor(remaining/10**digits)
  for(let n=0;n<letters;n++){prefix=String.fromCharCode(65+value%26)+prefix;value=Math.floor(value/26)}
  return 'co'+prefix+(digits?String(number).padStart(digits,'0'):'')
 }
 throw Error('identifier-space-exhausted')
}
export function identifierFields(data:RecordData,kind:IdentifierKind):{publicId?:string}{
 const id=data.publicId
 return typeof id==='string'&&(kind==='manual-game'?/^mn\d{4,16}$/.test(id):/^co[A-Z0-9]{9}$/.test(id))?{publicId:id}:{}
}
// Prepare all reads before applying writes inside the caller's existing transaction.
export async function preparePublicIdentifier(tx:AtomicTransaction,kind:IdentifierKind,internalId:string,now:Date){
 const path='publicIdentifierCounters/'+kind,state=await tx.get(path),next=state?.next??0
 if(!Number.isSafeInteger(next)||Number(next)<0||Number(next)>=Number.MAX_SAFE_INTEGER)throw Error('invalid-identifier-counter')
 const publicId=formatPublicIdentifier(kind,Number(next)),reservation=await tx.get('publicIdentifiers/'+publicId)
 if(reservation)throw Error('identifier-reservation-conflict')
 return {publicId,apply(){tx.create('publicIdentifiers/'+publicId,{kind,internalId,createdAt:now});tx.set(path,{next:Number(next)+1,updatedAt:now})}}
}
