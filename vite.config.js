import { defineConfig } from 'vite'

// Set base via VITE_BASE env var (use "/<repo>/" for project pages), default '/'
export default defineConfig({
  base: process.env.VITE_BASE || '/'
})
