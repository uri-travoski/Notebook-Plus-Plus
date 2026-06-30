<script setup lang="ts">
defineProps<{ danger?: boolean }>()
</script>

<template>
  <button
    type="button"
    role="menuitem"
    class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-row-hover focus-visible:bg-row-hover focus-visible:outline-none [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0 [&_svg]:text-text-subtle"
    :class="danger ? 'text-danger [&_svg]:text-danger' : 'text-text'"
  >
    <slot />
  </button>
</template>
