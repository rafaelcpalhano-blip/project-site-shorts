import {cleanupNetworkAbuse} from '../server/security/network-retention.ts'
// Local-only bounded maintenance. No cloud scheduler, public endpoint or TTL billing.
export function startLocalNetworkRetention(store){
 let stopped=false,timer
 const tick=async()=>{try{await cleanupNetworkAbuse({store,now:()=>new Date()})}catch{console.log('Retenção de proteção de rede adiada; nenhuma autorização alterada.')}finally{if(!stopped){timer=setTimeout(()=>void tick(),600000);timer.unref()}}}
 void tick()
 return ()=>{stopped=true;clearTimeout(timer)}
}
