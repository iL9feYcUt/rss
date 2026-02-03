import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

const root = createRoot(document.getElementById('root'))
root.render(<App />)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const base = import.meta.env.VITE_BASE || import.meta.env.BASE_URL || '/'
      const swUrl = new URL('sw.js', base).href
      await navigator.serviceWorker.register(swUrl, { scope: base })
      console.log('Service Worker registered at', swUrl, 'scope', base)
    } catch (e) {
      console.warn('SW registration failed', e)
    }
  })
}
