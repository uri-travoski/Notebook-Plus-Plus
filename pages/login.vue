<script setup lang="ts">
definePageMeta({ layout: 'auth' })
useHead({ title: 'Sign in · Notebook++' })

// Fresh install (no accounts yet): send the first visitor straight to registration.
const { data: setup } = await useFetch<{ needsSetup: boolean }>('/api/auth/needs-setup')
if (setup.value?.needsSetup) await navigateTo('/register')

const { fetch: refreshSession } = useUserSession()
const identifier = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { username: identifier.value, password: password.value },
    })
    await refreshSession()
    await navigateTo('/')
  } catch (e) {
    error.value = errorMessage(e, 'Could not sign in. Please try again.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="mb-6 text-lg font-semibold text-heading">Please login</h1>

    <form class="space-y-4" novalidate @submit.prevent="submit">
      <UiInput
        id="identifier"
        v-model="identifier"
        autocomplete="username"
        placeholder="Username or email"
        aria-label="Username or email"
        required
      />
      <UiInput
        id="password"
        v-model="password"
        type="password"
        autocomplete="current-password"
        placeholder="Password"
        aria-label="Password"
        required
      />

      <p
        v-if="error"
        class="rounded-input border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger"
        role="alert"
      >
        {{ error }}
      </p>

      <UiButton type="submit" :loading="loading" block>Sign in</UiButton>
    </form>

    <div class="mt-5 flex items-center justify-between text-sm">
      <NuxtLink to="/forgot" class="text-text-muted transition-colors hover:text-primary">
        Forgot password?
      </NuxtLink>
      <NuxtLink
        to="/register"
        class="font-medium text-primary transition-colors hover:text-primary-hover"
      >
        Create account
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
/* Login inputs + Sign in button: block padding (scoped so shared UiInput/UiButton are untouched). */
form :deep(input) {
  padding-block: calc(var(--spacing) * 3);
  background: #f4f6fb;
}
form :deep(button) {
  padding-block: calc(var(--spacing) * 3);
}
</style>
