<script setup lang="ts">
import { Trash2, Copy, Check, KeyRound } from 'lucide-vue-next'

type Token = {
  id: string
  name: string
  prefix: string
  lastUsedAt: string | null
  createdAt: string
}

// useFetch forwards the session cookie during SSR (raw $fetch does not).
const {
  data: tokensData,
  refresh,
  pending,
} = await useFetch<Token[]>('/api/me/api-tokens', { default: () => [] })
const tokens = computed<Token[]>(() => tokensData.value ?? [])

const name = ref('')
const creating = ref(false)
const createError = ref('')
const newToken = ref<string | null>(null) // shown exactly once
const copied = ref(false)

async function createToken() {
  creating.value = true
  createError.value = ''
  newToken.value = null
  try {
    const res = await $fetch<{ token: string }>('/api/me/api-tokens', {
      method: 'POST',
      body: { name: name.value },
    })
    newToken.value = res.token
    name.value = ''
    await refresh()
  } catch (e) {
    createError.value =
      (e as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Could not create token.'
  } finally {
    creating.value = false
  }
}
async function copyToken() {
  if (!newToken.value) return
  try {
    await navigator.clipboard.writeText(newToken.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    // clipboard needs a secure context (https/localhost); the token is selectable to copy manually
  }
}
async function revoke(t: Token) {
  if (!confirm(`Revoke "${t.name}"? Any agent using it will stop working.`)) return
  await $fetch(`/api/me/api-tokens/${t.id}`, { method: 'DELETE' })
  await refresh()
}
const fmt = (d: string) => new Date(d).toLocaleDateString()

const methodClass = (m: string) =>
  ({ GET: 'text-success', POST: 'text-primary', PATCH: 'text-warning', DELETE: 'text-danger' })[m] ||
  'text-text-muted'

const API_GROUPS: { group: string; items: { m: string; p: string; d: string }[] }[] = [
  {
    group: 'Notes & structure',
    items: [
      { m: 'GET', p: '/api/tree', d: 'Notebooks → notes tree' },
      { m: 'POST', p: '/api/notebooks', d: 'Create a notebook' },
      { m: 'PATCH', p: '/api/notebooks/:id', d: 'Rename / archive / trash' },
      { m: 'DELETE', p: '/api/notebooks/:id', d: 'Delete permanently' },
      { m: 'GET', p: '/api/documents', d: 'List documents' },
      { m: 'POST', p: '/api/documents', d: 'Create a note (page/canvas)' },
      { m: 'GET', p: '/api/documents/:id', d: 'Get a note + content' },
      { m: 'PATCH', p: '/api/documents/:id', d: 'Update title / content / flags' },
      { m: 'DELETE', p: '/api/documents/:id', d: 'Delete permanently' },
      { m: 'GET', p: '/api/documents/:id/markdown', d: 'Export a note as Markdown' },
      { m: 'GET', p: '/api/documents/:id/versions', d: 'Version history' },
    ],
  },
  {
    group: 'Databases (tables)',
    items: [
      { m: 'POST', p: '/api/databases', d: 'Create a database block' },
      { m: 'GET', p: '/api/databases/:id', d: 'Get columns + rows' },
      { m: 'PATCH', p: '/api/databases/:id', d: 'Update name / columns' },
      { m: 'POST', p: '/api/databases/:id/rows', d: 'Add a row' },
      { m: 'PATCH', p: '/api/databases/:id/rows/:rowId', d: 'Update a row' },
      { m: 'DELETE', p: '/api/databases/:id/rows/:rowId', d: 'Delete a row' },
    ],
  },
  {
    group: 'Attachments',
    items: [
      { m: 'POST', p: '/api/attachments', d: 'Upload a file (multipart)' },
      { m: 'GET', p: '/api/attachments/:id', d: 'Download (Range supported)' },
    ],
  },
  {
    group: 'Search & views',
    items: [
      { m: 'GET', p: '/api/search?q=', d: 'Full-text search' },
      { m: 'GET', p: '/api/stats', d: 'Notebook / note counts' },
      { m: 'GET', p: '/api/trash', d: 'Trashed items' },
    ],
  },
  {
    group: 'Import / export',
    items: [
      { m: 'POST', p: '/api/import/markdown', d: 'Import .md files or a .zip' },
      { m: 'POST', p: '/api/export/markdown', d: 'Start a workspace export job' },
      { m: 'GET', p: '/api/export/markdown/:id', d: 'Download an export job result' },
    ],
  },
  {
    group: 'AI',
    items: [
      { m: 'POST', p: '/api/ai/complete', d: 'Editor AI completion (streamed)' },
      { m: 'GET', p: '/api/ai/keys', d: 'List AI provider keys' },
      { m: 'POST', p: '/api/ai/keys', d: 'Add an AI provider key' },
    ],
  },
  {
    group: 'Account & settings',
    items: [
      { m: 'GET', p: '/api/me/preferences', d: 'Get preferences' },
      { m: 'PATCH', p: '/api/me/preferences', d: 'Update preferences' },
      { m: 'GET', p: '/api/me/api-tokens', d: 'List API tokens' },
      { m: 'POST', p: '/api/me/api-tokens', d: 'Create an API token' },
      { m: 'DELETE', p: '/api/me/api-tokens/:id', d: 'Revoke an API token' },
    ],
  },
]
</script>

<template>
  <section class="rounded-box border border-border bg-surface p-5">
    <h2 class="text-base font-semibold text-heading">API</h2>
    <p class="mt-1 text-sm text-text-muted">
      Create a token so an agent or script can call the API as you. Send it as
      <code class="rounded bg-surface-subtle px-1 py-0.5 text-xs">Authorization: Bearer &lt;token&gt;</code>.
      A token has full access to your account — treat it like a password.
    </p>

    <!-- one-time reveal -->
    <div v-if="newToken" class="mt-4 rounded-input border border-warning bg-warning-bg p-3">
      <p class="text-xs font-medium text-heading">
        Copy your token now — it won't be shown again.
      </p>
      <div class="mt-2 flex items-center gap-2">
        <code
          class="min-w-0 flex-1 truncate rounded bg-surface px-2 py-1.5 font-mono text-xs text-text"
          >{{ newToken }}</code
        >
        <button
          type="button"
          class="shrink-0 rounded-input border border-border px-2 py-1.5 text-xs text-text-muted hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-primary"
          title="Copy"
          @click="copyToken"
        >
          <Check v-if="copied" class="h-4 w-4 text-success" />
          <Copy v-else class="h-4 w-4" />
        </button>
      </div>
    </div>

    <!-- create -->
    <form class="mt-4 flex flex-wrap items-end gap-3" @submit.prevent="createToken">
      <label class="block min-w-[200px] flex-1">
        <span class="mb-1 block text-xs font-medium text-text-muted">Token name</span>
        <input
          v-model="name"
          placeholder="e.g. My agent"
          class="w-full rounded-input border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus-visible:outline-2 focus-visible:outline-primary"
        />
      </label>
      <UiButton type="submit" :loading="creating">Create token</UiButton>
      <p v-if="createError" class="text-sm text-danger">{{ createError }}</p>
    </form>

    <!-- existing tokens -->
    <div v-if="pending" class="mt-4 text-sm text-text-muted">Loading…</div>
    <ul v-else-if="tokens.length" class="mt-4 divide-y divide-border rounded-input border border-border">
      <li v-for="t in tokens" :key="t.id" class="flex items-center gap-3 p-3">
        <KeyRound class="h-4 w-4 shrink-0 text-text-subtle" />
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-heading">
            {{ t.name }}
            <span class="ml-1 font-mono text-xs font-normal text-text-muted">{{ t.prefix }}…</span>
          </p>
          <p class="truncate text-xs text-text-muted">
            Created {{ fmt(t.createdAt) }} ·
            {{ t.lastUsedAt ? 'last used ' + fmt(t.lastUsedAt) : 'never used' }}
          </p>
        </div>
        <button
          type="button"
          class="shrink-0 rounded-input p-1.5 text-text-muted hover:bg-danger/10 hover:text-danger focus-visible:outline-2 focus-visible:outline-danger"
          title="Revoke token"
          @click="revoke(t)"
        >
          <Trash2 class="h-4 w-4" />
        </button>
      </li>
    </ul>
    <p v-else class="mt-4 text-sm text-text-muted">No tokens yet.</p>

    <!-- endpoint reference -->
    <div class="mt-6 border-t border-border pt-5">
      <h3 class="text-sm font-semibold text-heading">API endpoints</h3>
      <p class="mt-1 text-xs text-text-muted">
        Every endpoint accepts the bearer token above (or a logged-in session). Base URL is your
        instance's origin.
      </p>
      <div v-for="g in API_GROUPS" :key="g.group" class="mt-4">
        <p class="text-xs font-semibold uppercase tracking-[0.06em] text-text-muted">
          {{ g.group }}
        </p>
        <ul class="mt-1.5 divide-y divide-border overflow-hidden rounded-input border border-border">
          <li
            v-for="e in g.items"
            :key="e.m + e.p"
            class="flex items-baseline gap-3 px-3 py-1.5 text-xs"
          >
            <span class="w-14 shrink-0 font-mono font-semibold" :class="methodClass(e.m)">{{
              e.m
            }}</span>
            <code class="shrink-0 font-mono text-text">{{ e.p }}</code>
            <span class="min-w-0 flex-1 truncate text-text-muted">{{ e.d }}</span>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
