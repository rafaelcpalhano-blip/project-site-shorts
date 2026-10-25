/** Zero-based positions, only destinations whose cursor is already available. No reads. */
export function paginationWindow(current:number,available:number){
 if(!Number.isSafeInteger(current)||!Number.isSafeInteger(available)||available<1||current<0||current>=available)throw Error('Paginação inválida.')
 const first=Math.max(0,current-2),last=Math.min(available-1,current+2)
 return {pages:Array.from({length:last-first+1},(_,i)=>first+i),previousJump:current>=5?current-5:null,nextJump:current+5<available?current+5:null,before:first>0,after:last<available-1}
}
