<script setup lang="ts">
// useFetch forwards the session cookie on SSR (see gotchas — never raw $fetch an authed
// route at SSR setup).
const { data, refresh } = await useFetch<{ enabled: boolean }>('/api/settings/registration')
const enabled = computed(() => !!data.value?.enabled)
const saving = ref(false)

async function toggle() {
  saving.value = true
  try {
    await $fetch('/api/settings/registration', { method: 'PATCH', body: { enabled: !enabled.value } })
    await refresh()
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="rounded-box border border-border bg-surface p-5">
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0">
        <h2 class="text-base font-semibold text-heading">Registration</h2>
        <p class="mt-1 text-sm text-text-muted">
          Allow new accounts to be created on the sign-up page. Turn this off once your account
          exists to keep the app private.
        </p>
        <p class="mt-2 text-sm text-text-muted">
          New registration is currently
          <strong :class="enabled ? 'text-primary' : 'text-heading'">{{
            enabled ? 'enabled' : 'disabled'
          }}</strong
          >.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        :aria-checked="enabled"
        :aria-label="enabled ? 'Disable registration' : 'Enable registration'"
        :disabled="saving"
        class="relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
        :class="enabled ? 'bg-primary' : 'bg-border-strong'"
        @click="toggle"
      >
        <span
          class="inline-block h-5 w-5 rounded-full bg-surface shadow transition-transform"
          :class="enabled ? 'translate-x-[22px]' : 'translate-x-0.5'"
        />
      </button>
    </div>
  </section>
</template>
