import { validateCommentSubmission } from '../../../lib/validation/comment-input.ts'
export interface CommentResult { id: string; status: 'approved' | 'pending' | 'rejected' | 'removed'; repeated: boolean; firstPublished: boolean }
const messages: Record<string,string> = {
  'invalid-input':'Confira seu comentário (até 500 caracteres).',
  'invalid-session':'Não foi possível validar a sessão. Tente novamente.',
  'short-unavailable':'Este vídeo não está mais disponível para comentários.',
  'abuse-limit':'Muitas tentativas de comentário. Aguarde antes de tentar novamente.',
  'duplicate-comment':'Você acabou de enviar esse mesmo comentário. Atualize a lista antes de tentar novamente.',
  'request-conflict':'Esta tentativa já foi usada com outro texto. Edite o comentário e tente novamente.',
}
export function createCommentClient(fetcher:typeof fetch=fetch) {
  return async (input: ReturnType<typeof validateCommentSubmission>): Promise<CommentResult> => {
    const body=validateCommentSubmission(input)
    const post=async(path:string,value?:unknown)=>{
      const response=await fetcher(path,{method:'POST',credentials:'same-origin',redirect:'error',
        headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(20000),
        ...(value ? {body:JSON.stringify(value)} : {})})
      if(!response.ok){
        let code=''
        try { const data=await response.json(); code=typeof data?.error==='string'?data.error:'' } catch { /* Never display server markup/errors. */ }
        throw new Error(messages[code] || 'Não foi possível confirmar o envio. Seu texto foi preservado; atualize os comentários antes de tentar novamente.')
      }
      return response
    }
    await post('/api/session')
    // Keep the same requestId on manual retry; never repeat a POST automatically.
    const response=await post('/api/comments',body)
    const data=await response.json()
    if(!data || !/^[a-f0-9]{64}$/.test(data.id) || !['approved','pending','rejected','removed'].includes(data.status) ||
       typeof data.repeated!=='boolean' || typeof data.firstPublished!=='boolean' || data.firstPublished&&(data.repeated||data.status!=='approved') || response.status !== (data.repeated ? 200 : data.status==='approved' ? 201 : 202)) {
      throw new Error('Resposta inesperada. Seu texto foi preservado; atualize os comentários antes de tentar novamente.')
    }
    return {id:data.id,status:data.status,repeated:data.repeated,firstPublished:data.firstPublished}
  }
}
