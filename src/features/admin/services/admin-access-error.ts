/** Only a server rejection of the presented token permits one fresh-token verification. */
export class AdminAccessError extends Error {
  readonly code: string
  constructor(code: string, message: string) { super(message); this.code = code }
}
