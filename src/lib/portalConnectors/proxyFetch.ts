// When a portal's own network blocks this server's IP (common after a
// university WAF flags the scheduled scan as bot traffic), route that
// portal's requests through a Cloudflare Worker relay instead — the Worker
// makes the actual request from Cloudflare's edge and streams the response
// back, so the target site sees Cloudflare's IP rather than ours.
export function createFetch(useProxy: boolean): typeof fetch {
  if (!useProxy) return fetch

  const proxyUrl = process.env.PORTAL_PROXY_URL
  const proxySecret = process.env.PORTAL_PROXY_SECRET
  if (!proxyUrl || !proxySecret) {
    throw new Error('Portal is set to scan via proxy, but PORTAL_PROXY_URL / PORTAL_PROXY_SECRET are not configured')
  }

  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const targetUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url
    const headers = new Headers(init?.headers)
    headers.set('X-Target-Url', targetUrl)
    headers.set('X-Proxy-Secret', proxySecret)

    return fetch(proxyUrl, {
      method: init?.method || 'GET',
      headers,
      body: init?.body as BodyInit | undefined,
      redirect: 'manual',
    })
  }) as typeof fetch
}
