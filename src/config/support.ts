// Development placeholder. Replace and verify before any approved public deployment.
export const supportContact = { email: 'teste.suporte@clipzone.com', operational: false } as const

interface SupportContact {email:string;operational:boolean}
export function supportEmailForDisplay(development:boolean,contact:SupportContact=supportContact):string|undefined {
 if(!development&&(!contact.operational||contact.email.trim().toLowerCase()==='teste.suporte@clipzone.com'))return
 return contact.email
}
