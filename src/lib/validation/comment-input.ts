import { validateCommentInput } from './public-input.ts'
export function validateCommentSubmission(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Comentário inválido.')
  const input = value as Record<string, unknown>
  if (Object.keys(input).some(key => !['shortId', 'content', 'requestId'].includes(key)) ||
      typeof input.requestId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(input.requestId)) {
    throw new Error('Dados do comentário inválidos.')
  }
  return { ...validateCommentInput({ shortId: input.shortId, content: input.content }), requestId: input.requestId.toLowerCase() }
}
