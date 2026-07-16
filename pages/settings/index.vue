<script setup lang="ts">
import {
  Download,
  Upload,
  SlidersHorizontal,
  Sparkles,
  Code2,
  DatabaseBackup,
  ArrowDownUp,
  UserPlus,
  ShieldCheck,
} from 'lucide-vue-next'
useHead({ title: 'Settings · Notebook++' })

// Vertical tabs. Persist the choice in the URL hash so a tab is deep-linkable and survives reload.
const TABS = [
  { id: 'preferences', label: 'Preferences', icon: SlidersHorizontal },
  { id: 'ai', label: 'AI providers', icon: Sparkles },
  { id: 'api', label: 'API', icon: Code2 },
  { id: 'backup', label: 'Backup', icon: DatabaseBackup },
  { id: 'data', label: 'Import / Export', icon: ArrowDownUp },
  { id: 'registration', label: 'Registration', icon: UserPlus },
  { id: 'security', label: 'Security', icon: ShieldCheck },
] as const
const route = useRoute()
const activeTab = ref<string>(
  TABS.some((t) => t.id === route.hash.slice(1)) ? route.hash.slice(1) : 'preferences',
)
function selectTab(id: string) {
  activeTab.value = id
  if (import.meta.client) history.replaceState(history.state, '', `#${id}`)
}

// Load the tree client-side (onMounted) so a hard SSR load of /settings doesn't 401 on /api/tree.
const { tree, ensure, refresh } = useTree()
onMounted(ensure)

const notebookOptions = computed(() =>
  (tree.value?.notebooks ?? []).map((nb) => ({ id: nb.id, label: nb.name })),
)
const target = ref('')

// Zip import (top-level folders -> notebooks)
const importingZip = ref(false)
const zipInput = ref<HTMLInputElement | null>(null)
function toBase64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf)
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk)
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  return btoa(bin)
}
async function onZip(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  importingZip.value = true
  importMsg.value = ''
  importError.value = ''
  try {
    const zip = toBase64(await file.arrayBuffer())
    const res = await $fetch<{ created: unknown[]; notebooks: string[] }>('/api/import/markdown', {
      method: 'POST',
      body: { zip },
    })
    const n = res.created.length
    importMsg.value = `Imported ${n} note${n === 1 ? '' : 's'} into ${res.notebooks.length} notebook${res.notebooks.length === 1 ? '' : 's'}.`
    await refresh()
  } catch (e) {
    importError.value =
      (e as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Zip import failed.'
  } finally {
    importingZip.value = false
    input.value = ''
  }
}

// Export all as a Markdown zip (pg-boss job, then download).
const exporting = ref(false)
const exportError = ref('')
async function exportAll() {
  exporting.value = true
  exportError.value = ''
  try {
    const { id } = await $fetch<{ id: string }>('/api/export/markdown', { method: 'POST' })
    for (let i = 0; i < 80; i++) {
      const s = await $fetch<{ status: string; filename?: string; error?: string }>(
        `/api/export/markdown/${id}`,
      )
      if (s.status === 'done') {
        const a = document.createElement('a')
        a.href = `/api/export/markdown/${id}?download=1`
        a.download = s.filename || 'notebookpp-export.zip'
        document.body.appendChild(a)
        a.click()
        a.remove()
        return
      }
      if (s.status === 'error') {
        exportError.value = s.error || 'Export failed.'
        return
      }
      await new Promise((r) => setTimeout(r, 700))
    }
    exportError.value = 'Export timed out. Try again.'
  } catch (e) {
    exportError.value =
      (e as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Export failed.'
  } finally {
    exporting.value = false
  }
}

// Import one or more .md files into a notebook (or Drafts).
const importing = ref(false)
const importMsg = ref('')
const importError = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
async function onFiles(e: Event) {
  const input = e.target as HTMLInputElement
  const list = input.files
  if (!list || !list.length) return
  importing.value = true
  importMsg.value = ''
  importError.value = ''
  try {
    const files = await Promise.all(
      Array.from(list).map(async (f) => ({ name: f.name, markdown: await f.text() })),
    )
    const res = await $fetch<{ created: unknown[] }>('/api/import/markdown', {
      method: 'POST',
      body: { notebookId: target.value || null, files },
    })
    const n = res.created.length
    importMsg.value = `Imported ${n} note${n === 1 ? '' : 's'}${target.value ? '' : ' into Drafts'}.`
    await refresh()
  } catch (e) {
    importError.value =
      (e as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Import failed.'
  } finally {
    importing.value = false
    input.value = ''
  }
}
</script>

<template>
  <AppPage title="Settings" subtitle="Preferences, AI providers, backups, and more.">
    <div class="flex flex-col gap-5 md:flex-row md:gap-8">
      <!-- Vertical tab navigation (scrolls horizontally on mobile) -->
      <nav aria-label="Settings sections" class="md:w-56 md:shrink-0">
        <ul
          class="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 md:sticky md:top-6 md:mx-0 md:flex-col md:gap-0.5 md:overflow-visible md:px-0 md:pb-0"
        >
          <li v-for="t in TABS" :key="t.id" class="shrink-0">
            <button
              type="button"
              :aria-current="activeTab === t.id ? 'page' : undefined"
              class="flex w-full items-center gap-2.5 whitespace-nowrap rounded-input px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
              :class="
                activeTab === t.id
                  ? 'bg-primary-subtle text-primary-subtle-fg'
                  : 'text-text-muted hover:bg-row-hover hover:text-heading'
              "
              @click="selectTab(t.id)"
            >
              <component :is="t.icon" class="h-4 w-4 shrink-0" />
              {{ t.label }}
            </button>
          </li>
        </ul>
      </nav>

      <!-- Tab panels (kept mounted via v-show so each panel loads its data once) -->
      <div class="min-w-0 flex-1">
        <div v-show="activeTab === 'preferences'"><PreferencesPanel /></div>
        <div v-show="activeTab === 'ai'"><AiKeysManager /></div>
        <div v-show="activeTab === 'api'"><ApiSettings /></div>
        <div v-show="activeTab === 'backup'"><BackupManager /></div>
        <div v-show="activeTab === 'registration'"><RegistrationSetting /></div>
        <div v-show="activeTab === 'security'"><SecurityPanel /></div>
        <div v-show="activeTab === 'data'" class="space-y-5">
          <section class="rounded-box border border-border bg-surface p-5">
            <div class="flex items-start gap-3">
              <Upload class="mt-0.5 h-5 w-5 shrink-0 text-text-muted" />
              <div class="min-w-0 flex-1">
                <h2 class="text-base font-semibold text-heading">Import Markdown</h2>
                <p class="mt-1 text-sm text-text-muted">
                  Bring in one or more <code class="text-xs">.md</code> files. A leading
                  <code class="text-xs"># Heading</code> becomes the note title.
                </p>

                <div class="mt-4 flex flex-wrap items-end gap-3">
                  <label class="block">
                    <span class="mb-1 block text-xs font-medium text-text-muted">Add to</span>
                    <select
                      v-model="target"
                      class="rounded-input border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
                    >
                      <option value="">Drafts (no notebook)</option>
                      <option v-for="o in notebookOptions" :key="o.id" :value="o.id">
                        {{ o.label }}
                      </option>
                    </select>
                  </label>

                  <input
                    ref="fileInput"
                    type="file"
                    accept=".md,text/markdown"
                    multiple
                    class="hidden"
                    @change="onFiles"
                  />
                  <UiButton variant="subtle" :loading="importing" @click="fileInput?.click()">
                    Choose .md files
                  </UiButton>
                </div>

                <div class="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4">
                  <div>
                    <span class="mb-1 block text-xs font-medium text-text-muted"
                      >Or import a .zip</span
                    >
                    <input
                      ref="zipInput"
                      type="file"
                      accept=".zip"
                      class="hidden"
                      @change="onZip"
                    />
                    <UiButton variant="subtle" :loading="importingZip" @click="zipInput?.click()">
                      Choose .zip
                    </UiButton>
                  </div>
                </div>
                <p class="mt-1 text-xs text-text-subtle">
                  Top-level folders in the zip become notebooks; each
                  <code class="text-xs">.md</code>
                  becomes a note.
                </p>

                <p v-if="importMsg" class="mt-3 text-sm text-success">{{ importMsg }}</p>
                <p v-if="importError" class="mt-3 text-sm text-danger">{{ importError }}</p>
              </div>
            </div>
          </section>

          <section class="rounded-box border border-border bg-surface p-5">
            <div class="flex items-start gap-3">
              <Download class="mt-0.5 h-5 w-5 shrink-0 text-text-muted" />
              <div class="min-w-0 flex-1">
                <h2 class="text-base font-semibold text-heading">Export all</h2>
                <p class="mt-1 text-sm text-text-muted">
                  Download every note as Markdown in a <code class="text-xs">.zip</code>, mirroring
                  your Notebooks.
                </p>
                <div class="mt-4">
                  <UiButton :loading="exporting" @click="exportAll">
                    {{ exporting ? 'Preparing zip…' : 'Export Markdown (.zip)' }}
                  </UiButton>
                </div>
                <p v-if="exportError" class="mt-3 text-sm text-danger">{{ exportError }}</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  </AppPage>
</template>
