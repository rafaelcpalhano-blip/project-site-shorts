import { Readable } from 'node:stream'

// Local HTTPS bridge: fixed authority prevents Host/forwarded-header trust.
export function localApiBridge(api, origin) {
  const authority = new URL(origin).host
  return async (incoming, outgoing, next) => {
    if (incoming.headers.host !== authority || !incoming.url?.startsWith('/') || incoming.url.startsWith('//')) {
      outgoing.writeHead(403).end()
      return
    }
    if (!incoming.url.split('?')[0].startsWith('/api/')) { next(); return }
    try {
      const headers = new Headers()
      for (let i = 0; i < incoming.rawHeaders.length; i += 2) {
        headers.append(incoming.rawHeaders[i], incoming.rawHeaders[i + 1])
      }
      const hasBody = incoming.method !== 'GET' && incoming.method !== 'HEAD'
      const request = new Request(origin + incoming.url, {
        method: incoming.method, headers,
        ...(hasBody ? { body: Readable.toWeb(incoming), duplex: 'half' } : {}),
      })
      const response = await api(request)
      outgoing.writeHead(response.status, Object.fromEntries(response.headers))
      outgoing.end(Buffer.from(await response.arrayBuffer()))
    } catch {
      outgoing.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      outgoing.end('{"error":"unavailable"}')
    }
  }
}
