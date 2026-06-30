<script setup lang="ts">
definePageMeta({ layout: 'auth' })
useHead({ title: 'Set a new password · Notebook++' })

const route = useRoute()
const token = computed(() => String(route.params.token || ''))
const password = ref('')
const confirm = ref('')
const loading = ref(false)
const error = ref('')
const done = ref(false)

async function submit() {
  error.value = ''
  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters.'
    return
  }
  if (password.value !== confirm.value) {
    error.value = 'Passwords do not match.'
    return
  }
  loading.value = true
  try {
    await $fetch('/api/auth/reset', {
      method: 'POST',
      body: { token: token.value, password: password.value },
    })
    done.value = true
  } catch (e) {
    error.value = errorMessage(e, 'This reset link is invalid or has expired.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="mb-1 text-lg font-semibold text-heading">Set a new password</h1>
    <p class="mb-6 text-sm text-text-muted">Choose a strong password you'll remember.</p>

    <div v-if="done" class="space-y-4">
      <div
        class="rounded-input border border-primary/20 bg-primary-subtle px-3 py-3 text-sm text-primary-subtle-fg"
        role="status"
      >
        Your password has been updated.
      </div>
      <UiButton block @click="navigateTo('/login')">Go to sign in</UiButton>
    </div>

    <form v-else class="space-y-4" novalidate @submit.prevent="submit">
      <FormField id="password" label="New password" hint="At least 8 characters.">
        <UiInput
          id="password"
          v-model="password"
          type="password"
          autocomplete="new-password"
          placeholder="••••••••"
          required
        />
      </FormField>
      <FormField id="confirm" label="Confirm password">
        <UiInput
          id="confirm"
          v-model="confirm"
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
      <UiButton type="submit" :loading="loading" block>Update password</UiButton>
    </form>
  </div>
</template>
