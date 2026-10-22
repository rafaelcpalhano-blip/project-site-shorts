import { buildEmbed } from '../services/embed'
import type { Short } from '../../shorts/types/models'
function sourcePlan(short: Short) {
  return buildEmbed(short, { origin: '', width: 0, height: 0 })
}
export function VideoSourceLink({ short }: { short: Short }) {
  const plan = sourcePlan(short)
  return plan.source ? <a href={plan.source} target="_blank" rel="noopener noreferrer">Assistir na plataforma ↗</a> : null
}
export function PlayerInformation({ short }: { short: Short }) {
  const plan = sourcePlan(short)
  return plan.source ? <details><summary>Sobre a reprodução em {plan.platform}</summary>
    <p className="muted">Ao abrir este vídeo, você se conecta a {plan.platform}. Reprodução, cookies e eventuais restrições são tratados pela plataforma. Vídeos privados, removidos ou restritos podem não estar disponíveis aqui.</p>
  </details> : null
}
