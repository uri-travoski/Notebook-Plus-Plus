<script setup lang="ts">
defineProps<{ title: string; subtitle?: string }>()
</script>

<template>
  <div class="mx-auto max-w-3xl px-6 py-8">
    <header class="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-heading">{{ title }}</h1>
        <p v-if="subtitle" class="mt-1 text-sm text-text-muted">{{ subtitle }}</p>
      </div>
      <div class="shrink-0">
        <slot name="actions" />
      </div>
    </header>
    <slot />
  </div>
</template>
