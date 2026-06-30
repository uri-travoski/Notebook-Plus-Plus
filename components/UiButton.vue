<script setup lang="ts">
withDefaults(
  defineProps<{
    type?: 'button' | 'submit'
    variant?: 'primary' | 'ghost' | 'danger' | 'subtle'
    loading?: boolean
    disabled?: boolean
    block?: boolean
  }>(),
  { type: 'button', variant: 'primary' },
)
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="inline-flex items-center justify-center gap-2 rounded-input px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
    :class="[
      block ? 'w-full' : '',
      variant === 'primary'
        ? 'bg-primary text-primary-contrast hover:bg-primary-hover active:bg-primary-active focus-visible:outline-primary'
        : '',
      variant === 'subtle'
        ? 'bg-primary-subtle text-primary-subtle-fg hover:brightness-95 focus-visible:outline-primary'
        : '',
      variant === 'ghost' ? 'text-text hover:bg-row-hover focus-visible:outline-primary' : '',
      variant === 'danger'
        ? 'bg-danger text-white hover:opacity-90 focus-visible:outline-danger'
        : '',
    ]"
  >
    <span
      v-if="loading"
      class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden="true"
    />
    <slot />
  </button>
</template>
