// Supabase Edge Function (Deno)
// Expects JSON body: { url, listSelector, mapping: { title, link, date } }
export default async function handler(req: Request) {
  // Basic CORS support for browser preview requests
  const corsHeaders = {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'Content-Type, Authorization'
  }
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })

  try {
    const body = await req.json()
    const { url, listSelector, mapping } = body
    if (!url || !listSelector) return new Response(JSON.stringify({ error: 'missing parameters' }), { status: 400, headers: corsHeaders })

    const res = await fetch(url, { headers: { 'User-Agent': 'rss-pwa/1.0' } })
    const html = await res.text()

    const doc = new DOMParser().parseFromString(html, 'text/html')
    const nodes = Array.from(doc.querySelectorAll(listSelector))
    const items = nodes.map((el: any) => {
      const title = mapping?.title ? (el.querySelector(mapping.title)?.textContent || '') : ''
      const link = mapping?.link ? (el.querySelector(mapping.link)?.getAttribute('href') || '') : ''
      const date = mapping?.date ? (el.querySelector(mapping.date)?.textContent || '') : ''
      return { title, link, date }
    })

    const snippet = nodes.slice(0,5).map(n=>n.outerHTML).join('\n')
    return new Response(JSON.stringify({ items, htmlSnippet: snippet }), { headers: corsHeaders })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders })
  }
}
