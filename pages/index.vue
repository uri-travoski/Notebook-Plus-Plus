<script setup lang="ts">
useHead({ title: 'Notebook++' })

const { user, clear } = useUserSession()
const loggingOut = ref(false)

async function logout() {
  loggingOut.value = true
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
    await clear()
    await navigateTo('/login')
  } finally {
    loggingOut.value = false
  }
}

type Health = { app: string; database: 'ok' | 'error'; time: string }
const { data: health } = await useFetch<Health>('/api/health')
</script>

<template>
  <div class="min-h-full">
    <header class="flex h-14 items-center justify-between border-b border-border bg-surface px-5">
      <div class="flex items-center gap-2">
        <span class="inline-block h-6 w-1.5 rounded-pill bg-primary" aria-hidden="true" />
        <span class="font-bold text-heading">Notebook++</span>
      </div>
      <div class="flex items-center gap-3 text-sm">
        <span class="text-text-muted">
          Signed in as <span class="font-medium text-heading">{{ user?.username }}</span>
        </span>
        <UiButton variant="ghost" :loading="loggingOut" @click="logout">Log out</UiButton>
      </div>
    </header>

    <main class="mx-auto max-w-2xl px-5 py-10">
      <h1 class="text-2xl font-bold text-heading">
        Welcome<span v-if="user?.displayName">, {{ user.displayName }}</span
        >.
      </h1>
      <p class="mt-2 text-text-muted">
        Your knowledge base is ready. The sidebar, editor, and everything else arrive in the next
        build phases.
      </p>

      <div
        class="mt-6 inline-flex items-center gap-2 rounded-box border border-border bg-surface-subtle px-3 py-2 text-sm"
      >
        <span
          class="h-2 w-2 rounded-full"
          :class="health?.database === 'ok' ? 'bg-success' : 'bg-danger'"
          aria-hidden="true"
        />
        <span class="text-text-muted">
          Database {{ health?.database === 'ok' ? 'connected' : 'unavailable' }}
        </span>
      </div>
    </main>
  </div>
</template>
