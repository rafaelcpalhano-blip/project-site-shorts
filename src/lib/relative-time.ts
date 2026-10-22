const minute=60000,hour=60*minute,day=24*hour,month=30*day
export function relativeTime(createdAt:number,now=Date.now()):string {
 if(!Number.isSafeInteger(createdAt)||createdAt<0||!Number.isSafeInteger(now)||now<0||!Number.isFinite(new Date(createdAt).getTime())||!Number.isFinite(new Date(now).getTime()))return 'Data indisponível'
 const elapsed=Math.max(0,now-createdAt)
 if(elapsed<minute)return 'agora'
 const [unit,singular,plural]:[number,string,string]=elapsed<60*minute?[minute,'minuto','minutos']:elapsed<day?[hour,'hora','horas']:elapsed<month?[day,'dia','dias']:[month,'mês','meses']
 const count=Math.floor(elapsed/unit)
 return 'há '+count+' '+(count===1?singular:plural)
}
