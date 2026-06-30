<script setup lang="ts">
import { Download, Upload } from 'lucide-vue-next'
useHead({ title: 'Settings · Notebook++' })

// Load the tree client-side (onMounted) so a hard SSR load of /settings doesn't 401 on /api/tree.
const { tree, ensure, refresh } = useTree()
onMounted(ensure)

const notebookOptions = computed(() => {
  const opts: { id: string; label: string }[] = []
  for (const p of tree.value?.projects ?? []) {
    for (const nb of p.notebooks) opts.push({ id: nb.id, label: `${p.name} / ${nb.name}` })
  }
  return opts
})
const target = ref('')

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
  <AppPage title="Settings" subtitle="AI providers, and Markdown import / export.">
    <div class="space-y-5">
      <PreferencesPanel />

      <AiKeysManager />

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
              Download every note as Markdown in a <code class="text-xs">.zip</code>, mirroring your
              Projects and Notebooks.
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

      <SecurityPanel />
    </div>
  </AppPage>
</template>
