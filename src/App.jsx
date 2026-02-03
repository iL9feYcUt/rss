import React, {useState, useRef, useEffect} from 'react'
import { supabase } from './supabaseClient'

const DEFAULT_FUNCTION_URL = (import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || 'https://umflrvoyqlsgqyorbafo.functions.supabase.co') + '/fetch_and_parse'
const FUNCTIONS_BASE = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || 'https://umflrvoyqlsgqyorbafo.functions.supabase.co'

export default function App(){
  const [url,setUrl] = useState('https://iphone-mania.jp/')
  const [listSel,setListSel] = useState('article')
  const [titleSel,setTitleSel] = useState('h2, .entry-title')
  const [linkSel,setLinkSel] = useState('a')
  const [dateSel,setDateSel] = useState('.entry-date')
  const [preview, setPreview] = useState(null)
  const [rawHtml, setRawHtml] = useState('')
  const previewRef = useRef(null)
  const lastHighlightRef = useRef(null)
  const [lastSelector, setLastSelector] = useState('')
  const [articles, setArticles] = useState([])
  const [pushSubscribed, setPushSubscribed] = useState(false)

  useEffect(()=>{
    fetchArticles()
  },[])

  async function fetchArticles(){
    try{
      const { data, error } = await supabase.from('articles').select('*').order('published_at', { ascending: false }).limit(50)
      if (error) { console.warn('supabase fetch error', error); return }
      setArticles(data || [])
    }catch(e){ console.warn(e) }
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async function subscribePush(){
    try{
      if (!('serviceWorker' in navigator)) return alert('Service Worker 非対応のブラウザです')
      const reg = await navigator.serviceWorker.ready
      const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''
      if (!publicKey) return alert('VAPID 公開鍵が設定されていません')
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) })
      const json = sub.toJSON()
      // 保存: Supabase の push_subscriptions テーブルへ
      await supabase.from('push_subscriptions').upsert([{ endpoint: json.endpoint, keys: JSON.stringify(json.keys), subscription: json }], { onConflict: 'endpoint' })
      setPushSubscribed(true)
      alert('購読しました')
    }catch(e){
      console.warn(e)
      alert('購読に失敗しました')
    }
  }

  async function sendTestPush(){
    try{
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (!sub) return alert('購読されていません')
      const fnBase = FUNCTIONS_BASE
      const res = await fetch(fnBase + '/send_push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: sub.toJSON(), payload: { title: 'テスト通知', body: 'フロントエンドからのテスト通知', url: window.location.href } }) })
      if (!res.ok) throw new Error('送信失敗')
      alert('テスト通知を送信しました')
    }catch(e){ console.warn(e); alert('送信に失敗しました') }
  }

  async function handlePreview(){
    const endpoint = DEFAULT_FUNCTION_URL
    const body = {url, listSelector: listSel, mapping:{title:titleSel, link:linkSel, date:dateSel}}
    const res = await fetch(endpoint, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)})
    if (!res.ok) return alert('フェッチ失敗: '+res.status)
    const j = await res.json()
    setPreview(j.items || [])
    setRawHtml(j.htmlSnippet || '')
  }

  function clearLastHighlight(){
    if (lastHighlightRef.current) {
      try { lastHighlightRef.current.style.outline = '' } catch(e){}
      lastHighlightRef.current = null
    }
  }

  function computeRelativeSelector(itemRoot, el){
    if (el === itemRoot) return ':scope'
    const parts = []
    let cur = el
    while (cur && cur !== itemRoot && cur !== null) {
      let part = cur.tagName.toLowerCase()
      if (cur.id) {
        part += `#${cur.id}`
        parts.unshift(part)
        break
      }
      const cls = (cur.className && typeof cur.className === 'string') ? cur.className.trim().split(/\s+/).join('.') : ''
      if (cls) part += `.${cls}`
      const parent = cur.parentElement
      if (parent) {
        const idx = Array.prototype.indexOf.call(parent.children, cur) + 1
        part += `:nth-child(${idx})`
      }
      parts.unshift(part)
      cur = cur.parentElement
    }
    return parts.join(' > ')
  }

  function handlePreviewClick(e){
    if (!previewRef.current) return
    // find the clicked element inside preview container
    const target = e.target
    e.preventDefault()
    // find which child (item root) contains this target
    let itemRoot = null
    for (const child of Array.from(previewRef.current.children)){
      if (child.contains(target)) { itemRoot = child; break }
    }
    if (!itemRoot) return
    const selector = computeRelativeSelector(itemRoot, target)
    clearLastHighlight()
    try { target.style.outline = '3px solid #f39c12' } catch(e){}
    lastHighlightRef.current = target
    setLastSelector(selector)
  }

  return (
    <div style={{padding:20,fontFamily:'Arial'}}>
      <h1>監視サイトを追加</h1>
      <label>URL<br/><input style={{width:'60%'}} value={url} onChange={e=>setUrl(e.target.value)}/></label>
      <div style={{marginTop:8}}>
        <label>リストセレクタ (例: article)<br/><input value={listSel} onChange={e=>setListSel(e.target.value)}/></label>
      </div>
      <div style={{marginTop:8}}>
        <label>タイトルセレクタ (相対)<br/><input value={titleSel} onChange={e=>setTitleSel(e.target.value)}/></label>
      </div>
      <div style={{marginTop:8}}>
        <label>リンクセレクタ (相対)<br/><input value={linkSel} onChange={e=>setLinkSel(e.target.value)}/></label>
      </div>
      <div style={{marginTop:8}}>
        <label>日付セレクタ (相対)<br/><input value={dateSel} onChange={e=>setDateSel(e.target.value)}/></label>
      </div>
      <div style={{marginTop:12}}>
        <button onClick={handlePreview}>プレビュー取得（サーバー経由）</button>
      </div>

      <h2>抽出プレビュー</h2>
      <div>
        {preview && preview.length === 0 && <div>項目がありません（プレビューを取得してください）</div>}
        <ul>
          {preview && preview.map((it,idx)=> (
            <li key={idx} style={{marginBottom:8}}>
              <strong>{it.title}</strong><br/>
              <a href={it.link} target="_blank" rel="noreferrer">{it.link}</a><br/>
              <small>{it.date}</small>
            </li>
          ))}
        </ul>
      </div>

      <h2>記事一覧（最新）</h2>
      <div style={{border:'1px solid #eee', padding:8, marginTop:8}}>
        <div style={{marginBottom:8}}>
          <button onClick={fetchArticles}>再読み込み</button>
          <button style={{marginLeft:8}} onClick={subscribePush}>プッシュ購読</button>
          <button style={{marginLeft:8}} onClick={sendTestPush}>テスト通知送信</button>
        </div>
        <ul>
          {articles && articles.map((a, i) => (
            <li key={i} style={{marginBottom:6}}>
              <a href={a.link} target="_blank" rel="noreferrer"><strong>{a.title}</strong></a>
              <div style={{fontSize:12,color:'#666'}}>{a.published_at || a.date || ''}</div>
            </li>
          ))}
        </ul>
      </div>

      <h2>取得したHTML（抜粋）</h2>
      <div>
        <div style={{marginBottom:8}}>
          <small>要素をクリックして、抽出用セレクタを決定できます。クリック後に「タイトル/リンク/日付に設定」を押してください。</small>
        </div>
        <div ref={previewRef} onClick={handlePreviewClick} style={{border:'1px solid #ccc', padding:8, maxHeight:300, overflow:'auto'}} dangerouslySetInnerHTML={{__html: rawHtml}} />

        {lastSelector && (
          <div style={{marginTop:8, padding:8, border:'1px dashed #bbb', background:'#fff'}}>
            <div>選択されたセレクタ: <code>{lastSelector}</code></div>
            <div style={{marginTop:6}}>
              <button onClick={()=>{ setTitleSel(lastSelector); setLastSelector(''); clearLastHighlight()}}>タイトルに設定</button>
              <button style={{marginLeft:8}} onClick={()=>{ setLinkSel(lastSelector); setLastSelector(''); clearLastHighlight()}}>リンクに設定</button>
              <button style={{marginLeft:8}} onClick={()=>{ setDateSel(lastSelector); setLastSelector(''); clearLastHighlight()}}>日付に設定</button>
              <button style={{marginLeft:8}} onClick={()=>{ setLastSelector(''); clearLastHighlight()}}>キャンセル</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
