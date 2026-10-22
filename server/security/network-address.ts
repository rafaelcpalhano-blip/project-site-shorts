import {isIP} from 'node:net'
/** Input is supplied by the trusted transport, never by request headers. */
export function networkAddress(value:unknown):string {
 if(typeof value!=='string'||value.length>64||value.includes('%')||!isIP(value))throw Error('network-address-unavailable')
 if(isIP(value)===4)return value
 const mapped=/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(value)
 if(mapped)return mapped[1]
 let text=value.toLowerCase()
 const tail=text.match(/(\d+\.\d+\.\d+\.\d+)$/)
 if(tail){const bytes=tail[1].split('.').map(Number);text=text.slice(0,-tail[1].length)+((bytes[0]<<8)+bytes[1]).toString(16)+':'+((bytes[2]<<8)+bytes[3]).toString(16)}
 const halves=text.split('::'),left=halves[0]?halves[0].split(':'):[],right=halves.length===2&&halves[1]?halves[1].split(':'):[]
 const parts=halves.length===2?[...left,...Array(8-left.length-right.length).fill('0'),...right]:left
 const words=parts.map(part=>parseInt(part,16))
 if(words.length!==8)throw Error('network-address-unavailable')
 if(words.slice(0,5).every(word=>word===0)&&words[5]===65535)return [words[6]>>8,words[6]&255,words[7]>>8,words[7]&255].join('.')
 // Group temporary IPv6 interface addresses within one /64; this is a network signal, not a person.
 return words.slice(0,4).map(word=>word.toString(16)).join(':')+'::/64'
}
