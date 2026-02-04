// Supabase Edge Function (Deno) - send Web Push notifications
import * as webpush from 'https://esm.sh/web-push@3.5.0'

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') || ''
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') || ''
if (VAPID_PUBLIC && VAPID_PRIVATE) {
  try { webpush.setVapidDetails('mailto:admin@example.com', VAPID_PUBLIC, VAPID_PRIVATE) } catch (e) { console.warn('vapid set failed', e) }
}

export default async function handler(req: Request) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })

  try {
    const body = await req.json()
    const { subscription, payload } = body
    if (!subscription) return new Response(JSON.stringify({ error: 'missing subscription' }), { status: 400, headers: corsHeaders })

    const p = payload || { title: 'テスト通知', body: '通知のテストです', url: '/' }
    await webpush.sendNotification(subscription, JSON.stringify(p))
    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders })
  }
}
