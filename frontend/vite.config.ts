import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { defineConfig, Plugin } from 'vite'
import { ViteEjsPlugin } from 'vite-plugin-ejs'
// import obfuscatorPlugin from 'vite-plugin-javascript-obfuscator'
// import { visualizer } from 'rollup-plugin-visualizer'
// import deadFile from 'vite-plugin-deadfile'
import removeConsole from 'vite-plugin-remove-console'
import webfontDownload from 'vite-plugin-webfont-dl'
import 'dotenv/config'

const SUB_PAGE_SERVER = 'http://127.0.0.1:3010'

// Dev only: /<shortUuid> shows that real user's data and main colour, taken from the sub page's server
// (npm run dev in backend/), on Vite's live-reloading page.
const realUserInDev = (): Plugin => ({
    name: 'real-user-in-dev',
    apply: 'serve',
    configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
            const shortUuid = req.url?.match(/^\/([\w-]+)\/?$/)?.[1]
            if (!shortUuid) return next()

            try {
                const page = await fetch(`${SUB_PAGE_SERVER}/${shortUuid}`, {
                    headers: {
                        accept: req.headers.accept ?? '',
                        'user-agent': req.headers['user-agent'] ?? ''
                    }
                })
                const real = await page.text()
                const take = (attribute: string) =>
                    `${attribute}="${real.match(new RegExp(`${attribute}="([^"]*)"`))?.[1] ?? ''}"`

                const html = await server.transformIndexHtml(
                    req.url!,
                    readFileSync('index.html', 'utf8')
                )

                res.setHeader('set-cookie', page.headers.getSetCookie())
                res.setHeader('content-type', 'text/html')
                res.end(
                    html
                        .replace(/data-panel="[^"]*"/, take('data-panel'))
                        .replace(/data-accent="[^"]*"/, take('data-accent'))
                )
            } catch {
                // The server hangs up on unknown users, so both failures end up here.
                res.statusCode = 502
                res.end(`No page for "${shortUuid}". Is "npm run dev" running in backend/?`)
            }
        })
    }
})

export default defineConfig({
    plugins: [
        react(),
        realUserInDev(),
        removeConsole(),
        webfontDownload(undefined, {}),
        ViteEjsPlugin((viteConfig) => {
            if (process.env.NODE_ENV === 'production') {
                return {
                    root: viteConfig.root,
                    panelData: '<%- panelData %>',
                    accentColor: '<%= accentColor %>',
                    metaDescription: '<%= metaDescription %>',
                    metaTitle: '<%= metaTitle %>'
                }
            }
            return {
                root: viteConfig.root,
                panelData: process.env.PANEL_DATA,
                accentColor: process.env.ACCENT_COLOR ?? 'rose',
                metaDescription: process.env.META_DESCRIPTION,
                metaTitle: process.env.META_TITLE
            }
        })
    ],
    optimizeDeps: {
        include: ['html-parse-stringify']
    },
    build: {
        target: 'esnext',
        outDir: 'dist',
        rollupOptions: {
            output: {
                codeSplitting: {
                    groups: [
                        {
                            name: 'icons',
                            test: /node_modules[\\/](react-icons|@tabler[\\/]icons-react)[\\/]/
                        },
                        {
                            name: 'date',
                            test: /node_modules[\\/]dayjs[\\/]/
                        },
                        {
                            name: 'react',
                            test: /node_modules[\\/](react|zustand|react-dom|react-router|react-error-boundary)[\\/]/
                        },
                        {
                            name: 'mantine',
                            test: /node_modules[\\/]@mantine[\\/](core|hooks|nprogress|notifications|modals)[\\/]/
                        },
                        {
                            name: 'i18n',
                            test: /node_modules[\\/](i18next-browser-languagedetector|@umiji[\\/](backend-contract|subscription-page-types))[\\/]/
                        }
                    ]
                }
            }
        }
    },
    server: {
        host: '0.0.0.0',
        port: 3334,
        cors: false,
        strictPort: true,
        allowedHosts: true,
        proxy: { '/assets/.app-config-v2.json': SUB_PAGE_SERVER }
    },
    resolve: { tsconfigPaths: true }
})
