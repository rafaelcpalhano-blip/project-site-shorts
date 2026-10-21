// Deliberately conservative, versioned comparison; not a universal Unicode spoof detector.
const similar: Record<string,string> = { 'а':'a','е':'e','о':'o','р':'p','с':'c','х':'x','у':'y','і':'i','ј':'j','ѕ':'s','к':'k','м':'m','т':'t','в':'b','н':'h','α':'a','ο':'o','ρ':'p','ι':'i','κ':'k','τ':'t','χ':'x' }
export function normalizedGameName(value: unknown) {
 if(typeof value!=='string')throw new Error('invalid-game-name')
 const name=value.normalize('NFC').trim()
 if(!name||name.length>500||/[\p{C}]/u.test(name))throw new Error('invalid-game-name')
 const normalizedName=name.normalize('NFKD').replace(/\p{M}/gu,'').toLocaleLowerCase('pt-BR').replace(/\s+/gu,' ')
 const skeleton=[...normalizedName].map(char=>similar[char]??char).join('').replace(/[013457]/g,char=>({'0':'o','1':'i','3':'e','4':'a','5':'s','7':'t'}[char]!)).replace(/[^\p{L}\p{N}]/gu,'')
 if(!skeleton)throw new Error('invalid-game-name')
 return {name,normalizedName,skeleton}
}
