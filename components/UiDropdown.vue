<script setup lang="ts">
withDefaults(
  defineProps<{ label?: string; up?: boolean; block?: boolean; triggerClass?: string }>(),
  { label: 'More actions', up: false, block: false, triggerClass: '' },
)
const open = ref(false)
const root = ref<HTMLElement | null>(null)
onClickOutside(root, () => (open.value = false))
</script>

<template>
  <div ref="root" :class="block ? 'relative flex w-full' : 'relative inline-flex'">
    <button
      type="button"
      :aria-label="label"
      :aria-expanded="open"
      aria-haspopup="menu"
      :class="[
        triggerClass ||
          'inline-flex items-center justify-center rounded-md p-1 text-text-muted transition-colors hover:bg-row-hover hover:text-text focus-visible:outline-2 focus-visible:outline-primary',
        block ? 'w-full' : '',
      ]"
      @click.stop.prevent="open = !open"
    >
      <slot name="trigger" />
    </button>
    <div
      v-if="open"
      role="menu"
      :class="[
        'absolute z-30 min-w-44 rounded-input border border-border bg-surface py-1 shadow-card',
        up ? 'bottom-full left-0 mb-1' : 'right-0 top-full mt-1',
      ]"
      @click="open = false"
    >
      <slot />
    </div>
  </div>
</template>
