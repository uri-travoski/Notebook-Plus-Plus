<script setup lang="ts">
import { WifiOff } from 'lucide-vue-next'

// v1 has no offline editing (no CRDT) — just a clear indicator that saves are paused.
const online = ref(true)
function update() {
  online.value = navigator.onLine
}
onMounted(() => {
  update()
  window.addEventListener('online', update)
  window.addEventListener('offline', update)
})
onBeforeUnmount(() => {
  window.removeEventListener('online', update)
  window.removeEventListener('offline', update)
})
</script>

<template>
  <Transition
    enter-active-class="transition duration-200"
    enter-from-class="translate-y-2 opacity-0"
    leave-active-class="transition duration-200"
    leave-to-class="translate-y-2 opacity-0"
  >
    <div
      v-if="!online"
      class="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-box border border-warning/40 bg-warning-bg px-4 py-2 text-sm text-warning shadow-lg motion-reduce:transition-none"
      role="status"
    >
      <WifiOff class="h-4 w-4 shrink-0" />
      You're offline — changes won't be saved until you reconnect.
    </div>
  </Transition>
</template>
