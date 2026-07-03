<script setup lang="ts">
import type { Component } from 'vue'
defineProps<{ title: string; hint?: string; icon?: Component }>()
</script>

<template>
  <div
    class="rounded-card border border-dashed border-border bg-surface-subtle px-6 py-12 text-center"
  >
    <div
      v-if="icon"
      class="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-surface text-text-subtle ring-1 ring-border"
    >
      <component :is="icon" class="h-5 w-5" />
    </div>
    <p class="text-sm font-medium text-heading">{{ title }}</p>
    <p v-if="hint" class="mx-auto mt-1 max-w-sm text-sm text-text-muted">{{ hint }}</p>
    <div v-if="$slots.default" class="mt-4 flex justify-center">
      <slot />
    </div>
  </div>
</template>
