import {createVideoLinkClient} from './video-link-api.ts'
import { validateSubmissionInput } from '../../../lib/validation/public-input.ts'
export interface SubmissionResult { id: string; status: 'published' | 'pending'; remaining: number }
const messages: Record<string, string> = {
  'duplicate-video': 'Este vídeo já foi enviado.',
  'daily-limit': 'Você atingiu o limite de cinco publicações hoje.',
  'abuse-limit': 'Muitas tentativas. Aguarde antes de tentar novamente.',
  'invalid-game': 'Selecione um jogo disponível no catálogo.',
  'video-not-found': 'O vídeo não foi encontrado.',
  'verification-incomplete': 'Não foi possível confirmar os requisitos técnicos do vídeo. Tente novamente mais tarde; a tentativa não consumiu sua cota.',
  'embedding-disabled': 'A fonte não permite incorporar este vídeo. Escolha outro vídeo.',
  'not-a-short': 'O vídeo não possui um formato curto aceito.',
  'invalid-session': 'Não foi possível validar sua sessão. Tente novamente.',
  'invalid-input': 'Confira o link, o jogo e o nome do canal.',
}
export function createSubmissionClient(fetcher: typeof fetch = fetch) {
  return async (input: { url: string; gameId: string; channelName: string; title?: string }): Promise<SubmissionResult> => {
    input={...input,url:await createVideoLinkClient(fetcher)(input.url,new AbortController().signal)}
    validateSubmissionInput(input)
    const post = async (path: string, body?: unknown) => {
      const response = await fetcher(path, { method: 'POST', credentials: 'same-origin', redirect: 'error',
        headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(20000),
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
      if (!response.ok) {
        let code = ''
        try { const data = await response.json(); code = typeof data?.error === 'string' ? data.error : '' } catch { /* Static hosting can return HTML. */ }
        throw new Error(messages[code] || 'Publicação indisponível no momento. Seus campos foram preservados.')
      }
      return response
    }
    // No automatic retry: a lost response may follow a successfully committed submission.
    await post('/api/session')
    const response = await post('/api/shorts', input)
    const result = await response.json()
    if (!result || !/^[a-f0-9]{64}$/.test(result.id) || !['published', 'pending'].includes(result.status) ||
        !Number.isInteger(result.remaining) || result.remaining < 0 || result.remaining > 5 ||
        response.status !== (result.status === 'published' ? 201 : 202)) throw new Error('Resposta de envio inesperada. Atualize o feed antes de tentar novamente.')
    return { id: result.id, status: result.status, remaining: result.remaining }
  }
}

