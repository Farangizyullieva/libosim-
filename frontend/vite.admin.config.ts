import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// The admin panel is a separate app with its own address (port 5174 in
// development, dist-admin/ when built), so it has its own session and is
// never mixed into the public site. It reuses the same src/ code.
function serveAdminHtml(): Plugin {
  const rewrite = (url: string | undefined) =>
    url && !url.includes('.') && !url.startsWith('/@') && !url.startsWith('/node_modules')
      ? '/admin.html'
      : url
  return {
    name: 'serve-admin-html',
    configureServer(server) {
      // Registered before Vite's own middlewares: every page route
      // (/, /users, /donations…) is answered with admin.html.
      server.middlewares.use((req, _res, next) => {
        if (req.headers.accept?.includes('text/html')) req.url = rewrite(req.url)
        next()
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.headers.accept?.includes('text/html')) req.url = rewrite(req.url)
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), serveAdminHtml()],
  server: { port: 5174, strictPort: true },
  preview: { port: 4174, strictPort: true },
  build: {
    outDir: 'dist-admin',
    rollupOptions: { input: 'admin.html' },
  },
})
