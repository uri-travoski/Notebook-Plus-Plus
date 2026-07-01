<script setup lang="ts">
import { Menu } from 'lucide-vue-next'

const drawerOpen = ref(false)
const route = useRoute()

watch(
  () => route.fullPath,
  () => (drawerOpen.value = false),
)
</script>

<template>
  <div class="flex h-full">
    <aside class="hidden w-[280px] shrink-0 md:block">
      <AppSidebar />
    </aside>

    <!-- Mobile drawer -->
    <div v-if="drawerOpen" class="fixed inset-0 z-40 md:hidden">
      <div class="absolute inset-0 bg-black/40" @click="drawerOpen = false" />
      <aside class="absolute inset-y-0 left-0 w-[86vw] max-w-[330px] shadow-2xl">
        <AppSidebar />
      </aside>
    </div>

    <div class="flex min-w-0 flex-1 flex-col">
      <!-- Compact top bar: mobile only (the sidebar carries search + account on desktop). -->
      <header
        class="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface px-3 md:hidden"
      >
        <button
          type="button"
          class="rounded-md p-2 text-text hover:bg-row-hover"
          aria-label="Open menu"
          @click="drawerOpen = true"
        >
          <Menu class="h-6 w-6" />
        </button>
        <span class="font-bold text-heading">Notebook++</span>
      </header>
      <!-- tabindex makes the scroll region keyboard-accessible (axe scrollable-region-focusable). -->
      <main tabindex="0" class="min-h-0 flex-1 overflow-y-auto outline-none">
        <slot />
      </main>
    </div>

    <NewDocChooser />
    <CommandPalette />
    <OfflineBanner />
  </div>
</template>
