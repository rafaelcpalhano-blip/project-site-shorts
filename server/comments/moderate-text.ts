export type TextFlag = 'threat' | 'hate' | 'offensive-language' | 'spam'
/** Conservative local triage, not a semantic classifier or guarantee of safety. */
export function moderateText(content: string): { status: 'approved' | 'pending'; flags: TextFlag[] } {
  const text = content.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u206f]/g, '')
    .replace(/[013457]/g, value => ({'0':'o','1':'i','3':'e','4':'a','5':'s','7':'t'}[value]!))
  const flags: TextFlag[] = []
  if (/\b(vou te (matar|espancar|esfaquear)|vou matar (voce|voces|sua familia)|se mata|morte aos?)\b/.test(text)) flags.push('threat')
  if (/\b(odeio (negros|gays|judeus)|negros? (sao|sao todos) inferiores|heil hitler)\b/.test(text)) flags.push('hate')
  if (/\b(porra|caralho|merda|puta|puto|foder|foda|fdp|pqp|cu|cacete|buceta|arrombado|otario|idiota|imbecil|retardado|vagabundo|vagabunda|desgracado|viado|bicha)s?\b/.test(text)) flags.push('offensive-language')
  const words = text.match(/[\p{L}\p{N}]+/gu) ?? []
  const repeated = words.length >= 6 && new Set(words).size <= Math.ceil(words.length / 4)
  if (/https?:\/\/|www\.|(.)\1{9,}/u.test(text) || repeated) flags.push('spam')
  return { status: flags.length ? 'pending' : 'approved', flags }
}
