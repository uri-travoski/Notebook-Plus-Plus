<script setup lang="ts">
const form = reactive({ currentPassword: '', newPassword: '', confirm: '' })
const saving = ref(false)
const message = ref('')
const error = ref('')

async function submit() {
  error.value = ''
  message.value = ''
  if (form.newPassword.length < 8) {
    error.value = 'New password must be at least 8 characters.'
    return
  }
  if (form.newPassword !== form.confirm) {
    error.value = 'New passwords do not match.'
    return
  }
  saving.value = true
  try {
    await $fetch('/api/me/password', {
      method: 'POST',
      body: { currentPassword: form.currentPassword, newPassword: form.newPassword },
    })
    message.value = 'Password updated.'
    form.currentPassword = ''
    form.newPassword = ''
    form.confirm = ''
  } catch (e) {
    error.value =
      (e as { data?: { statusMessage?: string } })?.data?.statusMessage ||
      'Could not update password.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="rounded-box border border-border bg-surface p-5">
    <h2 class="text-base font-semibold text-heading">Security</h2>
    <p class="mt-1 text-sm text-text-muted">Change your password.</p>
    <form class="mt-4 grid max-w-md gap-3" @submit.prevent="submit">
      <FormField id="current-password" label="Current password">
        <UiInput
          id="current-password"
          v-model="form.currentPassword"
          type="password"
          autocomplete="current-password"
        />
      </FormField>
      <FormField id="new-password" label="New password">
        <UiInput
          id="new-password"
          v-model="form.newPassword"
          type="password"
          autocomplete="new-password"
        />
      </FormField>
      <FormField id="confirm-password" label="Confirm new password">
        <UiInput
          id="confirm-password"
          v-model="form.confirm"
          type="password"
          autocomplete="new-password"
        />
      </FormField>
      <div class="flex items-center gap-3">
        <UiButton type="submit" :loading="saving">Update password</UiButton>
        <p v-if="message" class="text-sm text-success">{{ message }}</p>
        <p v-if="error" class="text-sm text-danger">{{ error }}</p>
      </div>
    </form>
  </section>
</template>
