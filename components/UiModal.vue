<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })

function close() {
  open.value = false
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}
watch(open, (v) => {
  if (import.meta.server) return
  if (v) document.addEventListener('keydown', onKey)
  else document.removeEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  if (import.meta.client) document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-150"
      leave-to-class="opacity-0"
    >
      <div v-if="open" class="fixed inset-0 z-50 grid place-items-center p-4">
        <div class="absolute inset-0 bg-black/40" @click="close" />
        <Transition appear enter-active-class="transition duration-200 ease-snap" enter-from-class="scale-95 opacity-0">
          <div
            class="relative z-10 w-full max-w-md rounded-card border border-border bg-surface p-5 shadow-card"
            role="dialog"
            aria-modal="true"
          >
            <slot :close="close" />
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
