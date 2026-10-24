// Public support contact. Authentication and service credentials are configured separately.
export const supportContact = { email: 'clipzone.suporte@gmail.com', operational: true } as const

interface SupportContact {email:string;operational:boolean}
export function supportEmailForDisplay(development:boolean,contact:SupportContact=supportContact):string|undefined {
 if(!development&&(!contact.operational||contact.email.trim().toLowerCase()==='teste.suporte@clipzone.com'))return
 return contact.email
}
