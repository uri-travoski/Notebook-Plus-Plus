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
    <aside class="hidden w-[252px] shrink-0 md:block">
      <AppSidebar />
    </aside>

    <!-- Mobile drawer: backdrop fades, panel slides in on the iOS drawer curve -->
    <Transition
      enter-active-class="transition-opacity duration-200 ease-snap"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-200 ease-snap"
      leave-to-class="opacity-0"
    >
      <div
        v-if="drawerOpen"
        class="fixed inset-0 z-40 bg-black/40 md:hidden"
        @click="drawerOpen = false"
      />
    </Transition>
    <Transition
      enter-active-class="transition-transform duration-300 ease-drawer"
      enter-from-class="-translate-x-full"
      leave-active-class="transition-transform duration-200 ease-drawer"
      leave-to-class="-translate-x-full"
    >
      <aside
        v-if="drawerOpen"
        class="fixed inset-y-0 left-0 z-40 w-[86vw] max-w-[330px] shadow-2xl md:hidden"
      >
        <AppSidebar />
      </aside>
    </Transition>

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
      <TabBar />
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
