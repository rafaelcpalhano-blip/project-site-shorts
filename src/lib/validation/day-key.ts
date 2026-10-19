const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
})
// Call with the trusted server clock; never accept the visitor's date for quotas.
export function saoPauloDayKey(date: Date): string {
  if (!Number.isFinite(date.getTime())) throw new Error('Data inválida')
  const parts = dateFormatter.formatToParts(date)
  const get = (type: string) => parts.find(part => part.type === type)!.value
  return get('year') + '-' + get('month') + '-' + get('day')
}

