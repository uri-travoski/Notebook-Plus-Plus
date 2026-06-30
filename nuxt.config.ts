import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-01',
  devtools: { enabled: true },

  modules: ['@nuxt/eslint', 'nuxt-auth-utils'],

  css: ['~/assets/css/main.css'],

  vite: {
    // React (BlockNote/Excalidraw island) JSX is processed ONLY under editor/.
    // Everything else stays Vue. esbuild-based plugin-react@5 works with Vite 8.
    plugins: [tailwindcss(), react({ include: /\/editor\// })],
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
    // nuxt-auth-utils sealed-session cookie. Secure cookies are dropped by browsers
    // over plain http on a LAN IP (only localhost/HTTPS are "secure contexts"), so
    // default off for LAN/HTTP access; set NUXT_SESSION_COOKIE_SECURE=true behind HTTPS.
    session: {
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
      ],
    },
  },
})
