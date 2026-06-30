<script setup lang="ts">
import { Check, AlertTriangle, Trash2, RefreshCw } from 'lucide-vue-next'

type AiKey = {
  id: string
  provider: string
  label: string | null
  model: string | null
  baseUrl: string | null
  priority: number
  enabled: boolean
  lastOkAt: string | null
  lastError: string | null
  preview: string
}

const PROVIDERS = ['anthropic', 'openai', 'google', 'openrouter', 'groq']

// useFetch forwards the session cookie during SSR (raw $fetch does not -> 401 on hard load).
const {
  data: keysData,
  refresh,
  pending,
} = await useFetch<AiKey[]>('/api/ai/keys', {
  default: () => [],
})
const keys = computed<AiKey[]>(() => keysData.value ?? [])

const form = reactive({
  provider: 'anthropic',
  label: '',
  key: '',
  model: '',
  baseUrl: '',
  priority: 0,
})
const adding = ref(false)
const addError = ref('')
const addNote = ref('')
async function addKey() {
  if (!form.key.trim()) {
    addError.value = 'Enter a key.'
    return
  }
  adding.value = true
  addError.value = ''
  addNote.value = ''
  try {
    const res = await $fetch<{ valid: boolean; lastError: string | null }>('/api/ai/keys', {
      method: 'POST',
      body: { ...form },
    })
    addNote.value = res.valid
      ? 'Key added and validated.'
      : `Key saved, but validation failed: ${res.lastError ?? 'unknown error'}`
    form.key = ''
    form.label = ''
    form.model = ''
    form.baseUrl = ''
    await refresh()
  } catch (e) {
    addError.value =
      (e as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Could not add key.'
  } finally {
    adding.value = false
  }
}

const busy = ref<string | null>(null)
async function validateKey(k: AiKey) {
  busy.value = k.id
  try {
    await $fetch(`/api/ai/keys/${k.id}/validate`, { method: 'POST' })
    await refresh()
  } finally {
    busy.value = null
  }
}
async function toggleKey(k: AiKey) {
  await $fetch(`/api/ai/keys/${k.id}`, { method: 'PATCH', body: { enabled: !k.enabled } })
  await refresh()
}
async function removeKey(k: AiKey) {
  await $fetch(`/api/ai/keys/${k.id}`, { method: 'DELETE' })
  await refresh()
}

const showBaseUrl = computed(() => form.provider === 'openai' || form.provider === 'openrouter')
</script>

<template>
  <section class="rounded-box border border-border bg-surface p-5">
    <h2 class="text-base font-semibold text-heading">AI providers</h2>
    <p class="mt-1 text-sm text-text-muted">
      Bring your own keys. They are encrypted at rest and only used server-side. When a request
      fails, Notebook++ falls through to the next enabled key by priority (lowest first).
    </p>

    <!-- Existing keys -->
    <div v-if="pending" class="mt-4 text-sm text-text-muted">Loading…</div>
    <EmptyState
      v-else-if="!keys.length"
      class="mt-4"
      title="No AI keys yet"
      hint="Add a provider key below to enable the editor's AI actions."
    />
    <ul v-else class="mt-4 divide-y divide-border rounded-input border border-border">
      <li v-for="k in keys" :key="k.id" class="flex items-center gap-3 p-3">
        <span
          class="grid h-7 w-7 shrink-0 place-items-center rounded-full"
          :class="
            k.lastError
              ? 'bg-danger/10 text-danger'
              : k.lastOkAt
                ? 'bg-success/10 text-success'
                : 'bg-surface-subtle text-text-muted'
          "
          :title="k.lastError || (k.lastOkAt ? 'Validated' : 'Not validated')"
        >
          <AlertTriangle v-if="k.lastError" class="h-4 w-4" />
          <Check v-else-if="k.lastOkAt" class="h-4 w-4" />
        </span>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-heading">
            {{ k.label || k.provider }}
            <span class="ml-1 text-xs font-normal text-text-muted">{{ k.provider }}</span>
          </p>
          <p class="truncate text-xs text-text-muted">
            {{ k.preview }} · {{ k.model || 'default model' }} · priority {{ k.priority }}
            <span v-if="k.lastError" class="text-danger"> · {{ k.lastError }}</span>
          </p>
        </div>
        <label class="flex shrink-0 items-center gap-1.5 text-xs text-text-muted">
          <input
            type="checkbox"
            :checked="k.enabled"
            class="accent-primary"
            @change="toggleKey(k)"
          />
          Enabled
        </label>
        <button
          type="button"
          class="rounded-input p-1.5 text-text-muted hover:bg-surface-subtle hover:text-heading focus-visible:outline-2 focus-visible:outline-primary"
          title="Re-validate"
          :disabled="busy === k.id"
          @click="validateKey(k)"
        >
          <RefreshCw class="h-4 w-4" :class="busy === k.id ? 'animate-spin' : ''" />
        </button>
        <button
          type="button"
          class="rounded-input p-1.5 text-text-muted hover:bg-danger/10 hover:text-danger focus-visible:outline-2 focus-visible:outline-danger"
          title="Delete key"
          @click="removeKey(k)"
        >
          <Trash2 class="h-4 w-4" />
        </button>
      </li>
    </ul>

    <!-- Add key -->
    <form
      class="mt-5 grid gap-3 border-t border-border pt-5 sm:grid-cols-2"
      @submit.prevent="addKey"
    >
      <label class="block">
        <span class="mb-1 block text-xs font-medium text-text-muted">Provider</span>
        <select
          v-model="form.provider"
          class="w-full rounded-input border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus-visible:outline-2 focus-visible:outline-primary"
        >
          <option v-for="p in PROVIDERS" :key="p" :value="p">{{ p }}</option>
        </select>
      </label>
      <label class="block">
        <span class="mb-1 block text-xs font-medium text-text-muted">Label (optional)</span>
        <input
          v-model="form.label"
          placeholder="e.g. Work key"
          class="w-full rounded-input border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus-visible:outline-2 focus-visible:outline-primary"
        />
      </label>
      <label class="block sm:col-span-2">
        <span class="mb-1 block text-xs font-medium text-text-muted">API key</span>
        <input
          v-model="form.key"
          type="password"
          autocomplete="off"
          placeholder="sk-…"
          class="w-full rounded-input border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus-visible:outline-2 focus-visible:outline-primary"
        />
      </label>
      <label class="block">
        <span class="mb-1 block text-xs font-medium text-text-muted">Model (optional)</span>
        <input
          v-model="form.model"
          placeholder="provider default"
          class="w-full rounded-input border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus-visible:outline-2 focus-visible:outline-primary"
        />
      </label>
      <label class="block">
        <span class="mb-1 block text-xs font-medium text-text-muted">Priority</span>
        <input
          v-model.number="form.priority"
          type="number"
          class="w-full rounded-input border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus-visible:outline-2 focus-visible:outline-primary"
        />
      </label>
      <label v-if="showBaseUrl" class="block sm:col-span-2">
        <span class="mb-1 block text-xs font-medium text-text-muted">
          Custom base URL (optional — for OpenAI-compatible endpoints)
        </span>
        <input
          v-model="form.baseUrl"
          placeholder="https://…/v1"
          class="w-full rounded-input border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus-visible:outline-2 focus-visible:outline-primary"
        />
      </label>
      <div class="flex items-center gap-3 sm:col-span-2">
        <UiButton type="submit" :loading="adding">Add key</UiButton>
        <p v-if="addNote" class="text-sm text-text-muted">{{ addNote }}</p>
        <p v-if="addError" class="text-sm text-danger">{{ addError }}</p>
      </div>
    </form>
  </section>
</template>
