<script setup lang="ts">
definePageMeta({ layout: 'auth' })
useHead({ title: 'Reset password · Notebook++' })

const email = ref('')
const loading = ref(false)
const sent = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/auth/forgot', { method: 'POST', body: { email: email.value } })
    sent.value = true
  } catch (e) {
    error.value = errorMessage(e, 'Something went wrong. Please try again.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="mb-1 text-lg font-semibold text-heading">Reset your password</h1>
    <p class="mb-6 text-sm text-text-muted">We'll email you a link to set a new one.</p>

    <div
      v-if="sent"
      class="rounded-input border border-primary/20 bg-primary-subtle px-3 py-3 text-sm text-primary-subtle-fg"
      role="status"
    >
      If an account exists for that email, a reset link is on its way. It expires in 1 hour.
    </div>

    <form v-else class="space-y-4" novalidate @submit.prevent="submit">
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
      <p
        v-if="error"
        class="rounded-input border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger"
        role="alert"
      >
        {{ error }}
      </p>
      <UiButton type="submit" :loading="loading" block>Send reset link</UiButton>
    </form>

    <p class="mt-5 text-center text-sm text-text-muted">
      <NuxtLink
        to="/login"
        class="font-medium text-primary transition-colors hover:text-primary-hover"
      >
        Back to sign in
      </NuxtLink>
    </p>
  </div>
</template>
