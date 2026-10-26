/** Dynamic API responses only; static assets keep their own cache/header policy.
 * HSTS matches the existing one-day static policy, without includeSubDomains/preload.
 * Trust the request URL, never a browser-supplied forwarded-proto assertion.
 */
export function workerApiHeaders(request: Pick<Request, 'url'>): Record<string, string> {
  const headers: Record<string, string> = {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  }
  if (request.url.startsWith('https:')) headers['Strict-Transport-Security'] = 'max-age=86400'
  return headers
}
