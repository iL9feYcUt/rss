export default async function handler(req: Request) {
  const headers = {
    'content-type': 'application/json',
    'access-control-allow-origin': '*'
  }
  return new Response(JSON.stringify({ ok: true, now: new Date().toISOString() }), { headers })
}
