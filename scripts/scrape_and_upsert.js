import fetch from 'node-fetch'
import cheerio from 'cheerio'

async function scrapeIphoneMania(){
  const url = 'https://iphone-mania.jp/'
  const res = await fetch(url, { headers: { 'User-Agent': 'rss-pwa-bot/1.0' } })
  if (!res.ok) throw new Error('Fetch failed: ' + res.status)
  const html = await res.text()
  const $ = cheerio.load(html)
  const items = []
  $('article').each((i, el) => {
    const title = $(el).find('h2, .entry-title').first().text().trim()
    let link = $(el).find('a').first().attr('href') || ''
    if (link && link.startsWith('/')) link = new URL(link, url).toString()
    const date = $(el).find('time, .entry-date').first().text().trim()
    if (title || link) items.push({ title, link, date })
  })
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
  return text
}

async function main(){
  try{
    console.log('Scraping...')
    const items = await scrapeIphoneMania()
    console.log('Found', items.length, 'items')
    if (items.length === 0) return console.log('No items to upsert')
    console.log('Upserting to Supabase...')
    const r = await upsertArticles(items)
    console.log('Upsert result:', r)
  }catch(e){
    console.error('Error:', e.message || e)
    process.exit(1)
  }
}

main()
