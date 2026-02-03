// Minimal Supabase Edge Function for health check / troubleshooting
export default async function handler(req: Request) {
  const corsHeaders = {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'Content-Type, Authorization'
  }

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })

  try {
    return new Response(JSON.stringify({ ok: true, function: 'fetch_and_parse', now: new Date().toISOString() }), { headers: corsHeaders })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders })
  }
}
