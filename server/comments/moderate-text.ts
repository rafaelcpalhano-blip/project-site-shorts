export type TextFlag = 'threat' | 'hate' | 'offensive-language' | 'spam'
/** Conservative local triage, not a semantic classifier or guarantee of safety. */
export function moderateText(content: string): { status: 'approved' | 'pending'; flags: TextFlag[] } {
  const text = content.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u206f]/g, '')
    .replace(/[013457@$]/g, value => ({'0':'o','1':'i','3':'e','4':'a','5':'s','7':'t','@':'a','$':'s'}[value]!))
  // Analyze bounded alternate views; never alter the stored/displayed original.
  // Punctuation inside words and isolated spelled letters are common evasions.
  const separated = text.replace(/(?<=\p{L})[._*·-]+(?=\p{L})/gu, '')
    .replace(/(?<![\p{L}\p{N}])(?:\p{L}[ ._*·-]+){2,}\p{L}(?![\p{L}\p{N}])/gu, word => word.replace(/[ ._*·-]+/g, ''))
  const views = [text, separated].map(value => value.replace(/\s+/gu, ' '))
  const flags: TextFlag[] = []
  if (views.some(value => /\b(vou te (matar|espancar|esfaquear)|vou matar (voce|voces|sua familia)|se mata|morte aos?)\b/.test(value))) flags.push('threat')
  if (views.some(value => /\b(odeio (negros|gays|judeus)|negros? (sao|sao todos) inferiores|heil hitler)\b/.test(value))) flags.push('hate')
  if (views.some(value => /(?<![\p{L}\p{N}])(porra|caralho|merda|puta|puto|foder|foda|fdp|pqp|cu|cacete|buceta|arrombado|otario|idiota|imbecil|retardado|vagabundo|vagabunda|desgracado|viado|bicha|bosta|boiola|caganera)s?(?![\p{L}\p{N}])/u.test(value))) flags.push('offensive-language')
  const words = text.match(/[\p{L}\p{N}]+/gu) ?? []
  const repeated = words.length >= 6 && new Set(words).size <= Math.ceil(words.length / 4)
  if (/https?:\/\/|www\.|(.)\1{9,}/u.test(text) || repeated) flags.push('spam')
  return { status: flags.length ? 'pending' : 'approved', flags }
}
