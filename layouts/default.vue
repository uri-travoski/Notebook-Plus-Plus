<script setup lang="ts">
import { Menu, LogOut, Settings as SettingsIcon, Search } from 'lucide-vue-next'

const drawerOpen = ref(false)
const route = useRoute()
const router = useRouter()
const { user, clear } = useUserSession()
const { open: paletteOpen } = useCommandPalette()

watch(
  () => route.fullPath,
  () => (drawerOpen.value = false),
)

const initial = computed(() =>
  (user.value?.displayName || user.value?.username || '?').charAt(0).toUpperCase(),
)

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clear()
  await navigateTo('/login')
}
</script>

<template>
  <div class="flex h-full">
    <aside class="hidden w-[280px] shrink-0 md:block">
      <AppSidebar />
    </aside>

    <div v-if="drawerOpen" class="fixed inset-0 z-40 md:hidden">
      <div class="absolute inset-0 bg-black/30" @click="drawerOpen = false" />
      <aside class="absolute inset-y-0 left-0 w-[280px] shadow-xl">
        <AppSidebar />
      </aside>
    </div>

    <div class="flex min-w-0 flex-1 flex-col">
      <header class="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface px-4">
        <button
          type="button"
          class="rounded-md p-2 text-text hover:bg-row-hover md:hidden"
          aria-label="Open menu"
          @click="drawerOpen = true"
        >
          <Menu class="h-5 w-5" />
        </button>
        <span class="font-bold text-heading md:hidden">Notebook++</span>

        <div class="ml-auto flex items-center gap-1">
          <button
            type="button"
            class="rounded-md p-2 text-text-muted transition-colors hover:bg-row-hover hover:text-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label="Search notes (Ctrl or Cmd K)"
            title="Search (⌘K)"
            @click="paletteOpen = true"
          >
            <Search class="h-5 w-5" />
          </button>
          <UiDropdown label="Account menu">
            <template #trigger>
              <span class="flex items-center gap-2 px-1">
                <span
                  class="grid h-7 w-7 place-items-center rounded-full bg-primary-subtle text-xs font-semibold text-primary-subtle-fg"
                  >{{ initial }}</span
                >
                <span class="hidden text-sm text-text sm:inline">{{
                  user?.displayName || user?.username
                }}</span>
              </span>
            </template>
            <UiMenuItem @click="router.push('/settings')"><SettingsIcon />Settings</UiMenuItem>
            <UiMenuItem danger @click="logout"><LogOut />Log out</UiMenuItem>
          </UiDropdown>
        </div>
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
