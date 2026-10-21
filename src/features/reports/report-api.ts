import { validateReportInput } from '../../lib/validation/report-input.ts'
export function createReportClient(fetcher: typeof fetch = fetch) {
  return async (input: { shortId: string; reason: string }) => {
    validateReportInput(input)
    for (const path of ['/api/session', '/api/reports']) {
      const response = await fetcher(path, { method: 'POST', credentials: 'same-origin', redirect: 'error',
        headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(20000),
        ...(path === '/api/reports' ? { body: JSON.stringify(input) } : {}),
      })
      if (!response.ok) {
        if (response.status === 429) throw new Error('Muitas tentativas. Aguarde antes de denunciar novamente.')
        if (response.status === 404) throw new Error('Este vídeo não está mais disponível.')
        throw new Error('Não foi possível confirmar a denúncia. Tente novamente mais tarde.')
      }
      if (path === '/api/reports') {
        const data = await response.json()
        if (response.status !== 200 || data?.received !== true || typeof data.duplicate !== 'boolean') throw new Error('Resposta inesperada. Não foi possível confirmar a denúncia.')
        return { duplicate: data.duplicate as boolean }
      }
    }
    throw new Error('Não foi possível confirmar a denúncia.')
  }
}
