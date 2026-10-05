import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function contentMeta(): Plugin {
  return {
    name: 'content-meta',
    transformIndexHtml(html) {
      const { identity } = JSON.parse(readFileSync('src/content/content.json', 'utf8'))
      const name = String(identity.name ?? '').trim()
      const title = name ? `${name}'s Workspace` : 'Workspace'
      return html.replaceAll('%TITLE%', esc(title)).replaceAll('%DESCRIPTION%', esc(String(identity.description ?? '').trim()))
    },
  }
}

export default defineConfig({
  plugins: [react(), contentMeta()],
  build: { sourcemap: false, chunkSizeWarningLimit: 1500 },
})
