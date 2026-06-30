import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-01',
  devtools: { enabled: true },

  modules: ['@nuxt/eslint', 'nuxt-auth-utils'],

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  runtimeConfig: {
    databaseUrl: '', // NUXT_DATABASE_URL
    sessionPassword: '', // NUXT_SESSION_PASSWORD (nuxt-auth-utils)
    encryptionKey: '', // ENCRYPTION_KEY (AES-256-GCM, 32 bytes)
    smtpUrl: '', // SMTP_URL
    allowRegistration: 'true', // ALLOW_REGISTRATION
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
