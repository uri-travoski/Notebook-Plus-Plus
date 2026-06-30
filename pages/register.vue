<script setup lang="ts">
definePageMeta({ layout: 'auth' })
useHead({ title: 'Create account · Notebook++' })

const { fetch: refreshSession } = useUserSession()
const email = ref('')
const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/auth/register', {
      method: 'POST',
      body: { email: email.value, username: username.value, password: password.value },
    })
    await refreshSession()
    await navigateTo('/')
  } catch (e) {
    error.value = errorMessage(e, 'Could not create your account. Please try again.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="mb-1 text-lg font-semibold text-heading">Create your account</h1>
    <p class="mb-6 text-sm text-text-muted">One account — this notebook is just for you.</p>

    <form class="space-y-4" novalidate @submit.prevent="submit">
      <FormField id="email" label="Email">
        <UiInput
          id="email"
          v-model="email"
          type="email"
          autocomplete="email"
          placeholder="you@example.com"
          required
        />
      </FormField>
      <FormField id="username" label="Username">
        <UiInput
          id="username"
          v-model="username"
          autocomplete="username"
          placeholder="yourname"
          required
        />
      </FormField>
      <FormField id="password" label="Password" hint="At least 8 characters.">
        <UiInput
          id="password"
          v-model="password"
          type="password"
          autocomplete="new-password"
          placeholder="••••••••"
          required
        />
      </FormField>

      <p
        v-if="error"
        class="rounded-input border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger"
        role="alert"
      >
        {{ error }}
      </p>

      <UiButton type="submit" :loading="loading" block>Create account</UiButton>
    </form>

    <p class="mt-5 text-center text-sm text-text-muted">
      Already have an account?
      <NuxtLink
        to="/login"
        class="font-medium text-primary transition-colors hover:text-primary-hover"
      >
        Sign in
      </NuxtLink>
    </p>
  </div>
</template>
