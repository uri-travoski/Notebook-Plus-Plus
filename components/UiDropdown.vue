<script setup lang="ts">
withDefaults(defineProps<{ label?: string }>(), { label: 'More actions' })
const open = ref(false)
const root = ref<HTMLElement | null>(null)
onClickOutside(root, () => (open.value = false))
</script>

<template>
  <div ref="root" class="relative inline-flex">
    <button
      type="button"
      :aria-label="label"
      :aria-expanded="open"
      aria-haspopup="menu"
      class="inline-flex items-center justify-center rounded-md p-1 text-text-muted transition-colors hover:bg-row-hover hover:text-text focus-visible:outline-2 focus-visible:outline-primary"
      @click.stop.prevent="open = !open"
    >
      <slot name="trigger" />
    </button>
    <div
      v-if="open"
      role="menu"
      class="absolute right-0 top-full z-30 mt-1 min-w-44 rounded-input border border-border bg-surface py-1 shadow-card"
      @click="open = false"
    >
      <slot />
    </div>
  </div>
</template>
