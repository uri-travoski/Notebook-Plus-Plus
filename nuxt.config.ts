import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-01',
  devtools: { enabled: true },

  modules: ['@nuxt/eslint', 'nuxt-auth-utils', '@vite-pwa/nuxt'],

  css: ['~/assets/css/main.css'],

  typescript: {
    // Nuxt 4 turns on `noUncheckedIndexedAccess` by default. This codebase was written under
    // `strict` without it; keep the original policy for the version upgrade rather than rewrite
    // ~150 safe array/tuple accesses. Adopting it is a separate hardening task.
    tsConfig: {
      compilerOptions: {
        noUncheckedIndexedAccess: false,
      },
    },
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Notebook++',
      short_name: 'Notebook++',
      description: 'Your self-hosted notes & knowledge base.',
      theme_color: '#0E9F8E',
      background_color: '#EEF2F7',
      display: 'standalone',
      start_url: '/',
      icons: [
        { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: '/maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      // Single live user → data must stay fresh: network-first for the API, precache the shell.
      navigateFallback: undefined,
      globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      runtimeCaching: [
        {
          urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith('/api'),
          handler: 'NetworkFirst',
          options: { cacheName: 'api', networkTimeoutSeconds: 5 },
        },
      ],
    },
    client: { installPrompt: true },
    devOptions: { enabled: false },
  },

  vite: {
    plugins: [tailwindcss()],
    // No @vitejs/plugin-react: the editor React island (editor/*.tsx) is written with
    // `createElement` (no JSX — see docs/gotchas.md), so Vite/esbuild transpiles it natively.
    // plugin-react only added React Fast Refresh, whose runtime is incompatible with Nuxt 4's
    // rolldown-based dev bundler ("Missing field moduleType") and 500'd every dev page. Dropping
    // it fixes dev SSR; the editor still builds and runs, it just doesn't hot-reload (it mounts
    // client-only via a dynamic import, so a manual refresh picks up editor edits).
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-dom/client'],
    },
  },

  runtimeConfig: {
    databaseUrl: '', // NUXT_DATABASE_URL
    sessionPassword: '', // NUXT_SESSION_PASSWORD (nuxt-auth-utils)
    encryptionKey: '', // ENCRYPTION_KEY (AES-256-GCM, 32 bytes)
    smtpUrl: '', // SMTP_URL
    allowRegistration: 'true', // ALLOW_REGISTRATION
    uploadDir: '', // NUXT_UPLOAD_DIR — attachment storage dir (default: <cwd>/.data/uploads)
    // NUXT_PG_BIN_DIR — dir holding pg_dump/pg_restore for the backup subsystem. Empty → use
    // PATH (the container installs postgresql-client-18). Only needed for local dev on a host
    // without a PG18 client; a lib/ subdir there is added to LD_LIBRARY_PATH.
    pgBinDir: '',
    // nuxt-auth-utils sealed-session cookie. Secure cookies are dropped by browsers
    // over plain http on a LAN IP (only localhost/HTTPS are "secure contexts"), so
    // default off for LAN/HTTP access; set NUXT_SESSION_COOKIE_SECURE=true behind HTTPS.
    session: {
      password: '', // overridden by NUXT_SESSION_PASSWORD at runtime
      cookie: {
        secure: false,
        sameSite: 'lax',
      },
    },
    public: {
      appUrl: 'http://localhost:3000', // NUXT_PUBLIC_APP_URL
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Notebook++',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#0E9F8E' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-title', content: 'Notebook++' },
      ],
      link: [
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
        { rel: 'icon', type: 'image/svg+xml', href: '/icon.svg' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
    },
  },
})
