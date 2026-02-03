import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

const root = createRoot(document.getElementById('root'))
root.render(<App />)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      let base = import.meta.env.VITE_BASE || import.meta.env.BASE_URL || '/'
      if (!base.endsWith('/')) base = base + '/'
      // new URL requires an absolute base; if base is a path like '/rss/', make it absolute
      const absoluteBase = /^[a-zA-Z]+:\/\//.test(base) ? base : `${location.origin}${base}`
      const swUrl = new URL('sw.js', absoluteBase).href
      const scopePath = new URL(absoluteBase).pathname
      await navigator.serviceWorker.register(swUrl, { scope: scopePath })
      console.log('Service Worker registered at', swUrl, 'scope', scopePath)
    } catch (e) {
      console.warn('SW registration failed', e)
    }
  })
}
