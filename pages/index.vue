<script setup lang="ts">
type Health = { app: string; database: 'ok' | 'error'; time: string }
const { data: health, pending } = await useFetch<Health>('/api/health')
</script>

<template>
  <main class="grid min-h-full place-items-center p-6">
    <section
      class="w-full max-w-md rounded-card border border-border bg-surface p-8 shadow-card"
      aria-labelledby="app-title"
    >
      <div class="mb-6 flex items-center gap-2.5">
        <span class="inline-block h-6 w-1.5 rounded-pill bg-primary" aria-hidden="true" />
        <h1 id="app-title" class="text-2xl font-bold text-heading">Notebook++</h1>
      </div>

      <p class="mb-6 text-text-muted">Self-hosted notes &amp; knowledge base.</p>

      <div class="rounded-box border border-border bg-surface-subtle p-4 text-sm">
        <h2 class="mb-3 text-xs font-semibold uppercase tracking-[0.06em] text-text-subtle">
          System health
        </h2>
        <dl class="space-y-1.5">
          <div class="flex items-center justify-between">
            <dt class="text-text-muted">App</dt>
            <dd class="font-medium text-success">online</dd>
          </div>
          <div class="flex items-center justify-between">
            <dt class="text-text-muted">Database</dt>
            <dd>
              <span v-if="pending" class="text-text-subtle">checking…</span>
              <span v-else-if="health?.database === 'ok'" class="font-medium text-success">
                connected
              </span>
              <span v-else class="font-medium text-danger">unavailable</span>
            </dd>
          </div>
        </dl>
      </div>
    </section>
  </main>
</template>
