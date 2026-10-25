export type ReadFailureKind = 'unavailable' | 'session' | 'rate-limit' | 'request'

export class PublicReadFailure extends Error {
  readonly kind: ReadFailureKind
  constructor(message: string, kind: ReadFailureKind = 'request') {
    super(message)
    this.name = 'PublicReadFailure'
    this.kind = kind
  }
}

export function readFailureMessage(failure: unknown, fallback: string): string {
  if (failure instanceof PublicReadFailure) return failure.message
  if (failure instanceof Error && failure.name === 'TimeoutError') return 'A consulta demorou mais que o esperado. Tente novamente.'
  if (failure instanceof TypeError) return 'Não foi possível conectar. Verifique sua conexão e tente novamente.'
  return fallback
}

export function sessionReadFailure(status:number):PublicReadFailure {
  return status===429
    ? new PublicReadFailure('Por segurança, o limite de novas sessões foi atingido. Aguarde e tente novamente mais tarde. Fechar e reabrir a janela anônima não libera esse limite.', 'rate-limit')
    : new PublicReadFailure('Não foi possível iniciar a consulta. Aguarde e tente novamente.', 'session')
}
