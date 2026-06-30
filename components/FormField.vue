<script setup lang="ts">
defineProps<{ id: string; label: string; error?: string; hint?: string }>()
</script>

<template>
  <div class="space-y-1.5">
    <label :for="id" class="block text-sm font-medium text-heading">{{ label }}</label>
    <slot />
    <p v-if="error" class="text-xs text-danger">{{ error }}</p>
    <p v-else-if="hint" class="text-xs text-text-muted">{{ hint }}</p>
  </div>
</template>
