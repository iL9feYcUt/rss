import { load } from 'cheerio'
import webpush from 'web-push'

const DEBUG = process.env.SCRAPE_DEBUG === '1' || process.env.SCRAPE_DEBUG === 'true'
async function scrapeIphoneMania(){
  const url = 'https://iphone-mania.jp/'
  const res = await fetch(url, { headers: { 'User-Agent': 'rss-pwa-bot/1.0' } })
  if (!res.ok) throw new Error('Fetch failed: ' + res.status)
  const html = await res.text()
  if (DEBUG) console.log('--- HTML snippet (first 2000 chars) ---\n' + html.slice(0, 2000))
  const $ = load(html)
  const items = []
  $('article').each((i, el) => {
    const title = $(el).find('h2, .entry-title').first().text().trim()
    let link = $(el).find('a').first().attr('href') || ''
    if (link && link.startsWith('/')) link = new URL(link, url).toString()
    const date = $(el).find('time, .entry-date').first().text().trim()
    if (title || link) items.push({ title, link, date })
  })
  if (DEBUG) console.log(`Found ${items.length} items (returning)`)
  return items
}

async function upsertArticles(items){
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing')
  const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/articles`
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify(items)
  })
  const text = await res.text()
  if (!res.ok) throw new Error('Supabase upsert failed: ' + res.status + ' ' + text)
  if (DEBUG) console.log('Upsert response:', text)
  return text
}

async function fetchExistingLinks(links){
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const existing = new Set()
  if (!supabaseUrl || !serviceKey) throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing')
  for (const l of links){
    if (!l) continue
    const q = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/articles?link=eq.${encodeURIComponent(l)}&select=link`
    try{
      const r = await fetch(q, { headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` } })
      if (r.ok){
        const js = await r.json()
        if (Array.isArray(js) && js.length > 0) existing.add(l)
      }
    }catch(e){ if (DEBUG) console.warn('check existing failed for', l, e) }
  }
  return existing
}

async function fetchSubscriptions(){
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing')
  const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/push_subscriptions?select=subscription`
  const res = await fetch(endpoint, { headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` } })
  if (!res.ok) throw new Error('Failed to fetch subscriptions: ' + res.status)
  const js = await res.json()
  return js.map(r => r.subscription).filter(Boolean)
}

async function sendNotifications(items){
  const vapidPublic = process.env.VAPID_PUBLIC_KEY
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY
  if (!vapidPublic || !vapidPrivate) throw new Error('VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY missing')
  webpush.setVapidDetails('mailto:admin@example.com', vapidPublic, vapidPrivate)
  const subs = await fetchSubscriptions()
  if (!Array.isArray(subs) || subs.length === 0) return console.log('No push subscriptions')
  for (const item of items){
    const payload = { title: item.title || '新着記事', body: item.title || item.link || '', url: item.link || '/' }
    const bodyStr = JSON.stringify(payload)
    for (const s of subs){
      try{
        await webpush.sendNotification(s, bodyStr)
      }catch(e){ console.warn('push failed for', s && s.endpoint, e && e.message) }
    }
  }
}

async function main(){
  try{
    console.log('Scraping...')
    const items = await scrapeIphoneMania()
    console.log('Found', items.length, 'items')
    if (DEBUG && items.length > 0) console.log('Items preview:', JSON.stringify(items.slice(0, 10), null, 2))
    if (items.length === 0) return console.log('No items to upsert')
    // Determine which links are new
    const links = items.map(i => i.link).filter(Boolean)
    const existing = await fetchExistingLinks(links)
    const newItems = items.filter(i => i.link && !existing.has(i.link))
    console.log('New items:', newItems.length)
    console.log('Upserting to Supabase...')
    const r = await upsertArticles(items)
    console.log('Upsert result:', r)
    if (newItems.length > 0){
      console.log('Sending notifications for', newItems.length, 'items')
      await sendNotifications(newItems)
      console.log('Notifications attempted')
    } else {
      console.log('No new items to notify')
    }
  }catch(e){
    console.error('Error:', e.message || e)
    process.exit(1)
  }
}

main()
