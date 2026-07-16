<script setup lang="ts">
import { DatabaseBackup, AlertTriangle } from 'lucide-vue-next'

type Job = { kind: string; message: string } | null
type HistoryRow = {
  id: string
  type: string
  ok: boolean
  name: string | null
  error: string | null
  createdAt: string
}
type BackupRow = { name: string; size: number; modifiedAt?: string }
type Status = {
  schedule: string
  destinationType: string
  passwordSet: boolean
  includeUploads: boolean
  running: Job
  lastBackup: (HistoryRow & { size: number | null }) | null
}

const SCHEDULE_LABELS: Record<string, string> = {
  off: 'Off (manual only)',
  '2h': 'Every 2 hours',
  '6h': 'Every 6 hours',
  daily: 'Daily at 03:00',
  weekly: 'Weekly (Sun 03:00)',
}

const status = ref<Status | null>(null)
const backups = ref<BackupRow[]>([])
const backupsError = ref('')
const history = ref<HistoryRow[]>([])

const form = reactive({
  schedule: 'off',
  retention: 14,
  includeUploads: true,
  password: '',
  destType: 'local' as 'local' | 's3',
  localPath: '',
  s3: {
    endpoint: '',
    region: 'auto',
    bucket: '',
    forcePathStyle: false,
    accessKeyId: '',
    secretAccessKey: '',
  },
})

const saving = ref(false)
const saveMsg = ref('')
const saveError = ref('')
const backingUp = ref(false)

const fmtSize = (n: number) =>
  n > 1024 ** 3
    ? (n / 1024 ** 3).toFixed(2) + ' GB'
    : n > 1024 ** 2
      ? (n / 1024 ** 2).toFixed(1) + ' MB'
      : Math.max(1, Math.round(n / 1024)) + ' KB'
const fmtDate = (s?: string | null) => (s ? new Date(s).toLocaleString() : '—')

async function loadStatus() {
  status.value = await $fetch<Status>('/api/backup/status')
}
async function loadConfig() {
  const c = await $fetch<{
    schedule: string
    retention: number
    includeUploads: boolean
    password: string
    destination: { type: 'local' | 's3'; localPath: string; s3: typeof form.s3 }
  }>('/api/backup/config')
  form.schedule = c.schedule
  form.retention = c.retention
  form.includeUploads = c.includeUploads
  form.password = c.password
  form.destType = c.destination.type
  form.localPath = c.destination.localPath
  Object.assign(form.s3, c.destination.s3)
}
async function loadBackups() {
  backupsError.value = ''
  try {
    backups.value = await $fetch<BackupRow[]>('/api/backup/list')
  } catch (e) {
    backups.value = []
    backupsError.value =
      (e as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Could not list backups.'
  }
}
async function loadHistory() {
  history.value = await $fetch<HistoryRow[]>('/api/backup/history').catch(() => [])
}
async function refresh() {
  await Promise.all([loadStatus(), loadBackups(), loadHistory()])
}

onMounted(async () => {
  await loadConfig().catch(() => {})
  await refresh()
  if (status.value?.running) pollWhileRunning()
})

async function save() {
  saving.value = true
  saveMsg.value = ''
  saveError.value = ''
  try {
    await $fetch('/api/backup/config', {
      method: 'PUT',
      body: {
        schedule: form.schedule,
        retention: Number(form.retention) || 14,
        includeUploads: form.includeUploads,
        password: form.password,
        destination: {
          type: form.destType,
          localPath: form.localPath.trim(),
          s3: {
            endpoint: form.s3.endpoint.trim(),
            region: form.s3.region.trim() || 'auto',
            bucket: form.s3.bucket.trim(),
            forcePathStyle: form.s3.forcePathStyle,
            accessKeyId: form.s3.accessKeyId.trim(),
            secretAccessKey: form.s3.secretAccessKey,
          },
        },
      },
    })
    saveMsg.value = 'Settings saved.'
    await Promise.all([loadStatus(), loadConfig(), loadBackups()])
  } catch (e) {
    saveError.value =
      (e as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Save failed.'
  } finally {
    saving.value = false
  }
}

async function backupNow() {
  backingUp.value = true
  saveError.value = ''
  try {
    await $fetch('/api/backup/run', { method: 'POST', body: {} })
    pollWhileRunning()
  } catch (e) {
    saveError.value =
      (e as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Backup failed to start.'
  } finally {
    backingUp.value = false
  }
}

let pollTimer: ReturnType<typeof setInterval> | null = null
function pollWhileRunning() {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = setInterval(async () => {
    await loadStatus().catch(() => {})
    if (!status.value?.running) {
      if (pollTimer) clearInterval(pollTimer)
      pollTimer = null
      await refresh()
    }
  }, 2000)
}
onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer)
})

/* Restore wizard */
const restoreOpen = ref(false)
const restoreName = ref('')
const restorePassword = ref('')
const restoreConfirm = ref('')
const restoreCheck = reactive({ msg: '', ok: false })
const passwordValid = ref(false)
const restoring = ref(false)

function openRestore(name: string) {
  restoreName.value = name
  restorePassword.value = ''
  restoreConfirm.value = ''
  restoreCheck.msg = ''
  passwordValid.value = false
  restoreOpen.value = true
}

let validateTimer: ReturnType<typeof setTimeout> | null = null
watch(restorePassword, (pw) => {
  if (validateTimer) clearTimeout(validateTimer)
  passwordValid.value = false
  restoreCheck.msg = ''
  if (!pw) return
  validateTimer = setTimeout(async () => {
    restoreCheck.msg = 'Checking password…'
    restoreCheck.ok = false
    try {
      const { valid } = await $fetch<{ valid: boolean }>('/api/backup/restore/validate', {
        method: 'POST',
        body: { name: restoreName.value, password: pw },
      })
      passwordValid.value = valid
      restoreCheck.ok = valid
      restoreCheck.msg = valid ? 'Password OK.' : 'Wrong password.'
    } catch (e) {
      restoreCheck.ok = false
      restoreCheck.msg =
        (e as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Could not check.'
    }
  }, 500)
})

const canRestore = computed(() => passwordValid.value && restoreConfirm.value === 'RESTORE')

async function doRestore() {
  restoring.value = true
  try {
    await $fetch('/api/backup/restore', {
      method: 'POST',
      body: {
        name: restoreName.value,
        password: restorePassword.value,
        confirm: restoreConfirm.value,
      },
    })
    restoreOpen.value = false
    pollWhileRunning()
  } catch (e) {
    restoreCheck.ok = false
    restoreCheck.msg =
      (e as { data?: { statusMessage?: string } })?.data?.statusMessage ||
      'Restore failed to start.'
  } finally {
    restoring.value = false
  }
}

const inputClass =
  'w-full rounded-input border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary'
</script>

<template>
  <section class="rounded-box border border-border bg-surface p-5">
    <div class="flex items-start gap-3">
      <DatabaseBackup class="mt-0.5 h-5 w-5 shrink-0 text-text-muted" />
      <div class="min-w-0 flex-1">
        <h2 class="text-base font-semibold text-heading">Backup</h2>
        <p class="mt-1 text-sm text-text-muted">
          Encrypted, scheduled backups of your database and uploads to a local folder or S3 (R2 / B2
          / MinIO). Restores happen in place — no downtime.
        </p>

        <!-- Status pills -->
        <div v-if="status" class="mt-4 flex flex-wrap items-center gap-2">
          <span class="rounded-pill border border-border bg-surface-subtle px-2.5 py-0.5 text-xs">
            schedule: {{ status.schedule }}
          </span>
          <span class="rounded-pill border border-border bg-surface-subtle px-2.5 py-0.5 text-xs">
            destination: {{ status.destinationType }}
          </span>
          <span
            class="rounded-pill border px-2.5 py-0.5 text-xs"
            :class="
              status.passwordSet
                ? 'border-border bg-surface-subtle'
                : 'border-danger/30 bg-danger/10 text-danger'
            "
          >
            password {{ status.passwordSet ? 'set' : 'not set' }}
          </span>
        </div>
        <p v-if="status?.lastBackup" class="mt-2 text-sm text-text-muted">
          Last backup:
          <span class="font-medium text-heading">{{ status.lastBackup.name }}</span> ({{
            fmtSize(status.lastBackup.size ?? 0)
          }}, {{ fmtDate(status.lastBackup.createdAt) }})
        </p>
        <p v-else-if="status" class="mt-2 text-sm text-text-muted">No successful backup yet.</p>

        <!-- Running banner -->
        <div
          v-if="status?.running"
          class="mt-4 flex items-center gap-2 rounded-input bg-primary-subtle px-3 py-2 text-sm text-primary-subtle-fg"
        >
          <span
            class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
          {{ status.running.kind === 'restore' ? 'Restore' : 'Backup' }}:
          {{ status.running.message }}
        </div>

        <!-- Settings form -->
        <form
          class="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-2"
          @submit.prevent="save"
        >
          <label class="block">
            <span class="mb-1 block text-xs font-medium text-text-muted">Schedule</span>
            <select v-model="form.schedule" :class="inputClass">
              <option v-for="(label, val) in SCHEDULE_LABELS" :key="val" :value="val">
                {{ label }}
              </option>
            </select>
          </label>
          <label class="block">
            <span class="mb-1 block text-xs font-medium text-text-muted">Keep last N backups</span>
            <input
              v-model.number="form.retention"
              type="number"
              min="1"
              max="365"
              :class="inputClass"
            />
          </label>

          <label class="block sm:col-span-2">
            <span class="mb-1 block text-xs font-medium text-text-muted">
              Backup password (encrypts every backup — store it somewhere safe)
            </span>
            <input
              v-model="form.password"
              type="password"
              autocomplete="new-password"
              placeholder="required before the first backup"
              :class="inputClass"
            />
          </label>

          <label class="flex items-center gap-2 sm:col-span-2">
            <input v-model="form.includeUploads" type="checkbox" class="accent-primary" />
            <span class="text-sm text-text">Include the uploads folder (attachments)</span>
          </label>

          <label class="block sm:col-span-2">
            <span class="mb-1 block text-xs font-medium text-text-muted">Destination</span>
            <select v-model="form.destType" :class="inputClass">
              <option value="local">Local folder</option>
              <option value="s3">S3 compatible (R2 / B2 / MinIO / S3)</option>
            </select>
          </label>

          <div v-if="form.destType === 'local'" class="sm:col-span-2">
            <span class="mb-1 block text-xs font-medium text-text-muted"
              >Local backup directory</span
            >
            <input
              v-model="form.localPath"
              placeholder="empty → .data/backups (dev) or /backups (container)"
              :class="inputClass"
            />
            <p class="mt-1 text-xs text-text-subtle">
              Backups land in <code class="text-xs">&lt;dir&gt;/notebookpp/</code>. In Docker, mount
              a host folder and set it here.
            </p>
          </div>

          <template v-else>
            <label class="block">
              <span class="mb-1 block text-xs font-medium text-text-muted">Endpoint URL</span>
              <input
                v-model="form.s3.endpoint"
                placeholder="https://<accountid>.r2.cloudflarestorage.com"
                :class="inputClass"
              />
            </label>
            <label class="block">
              <span class="mb-1 block text-xs font-medium text-text-muted">Region</span>
              <input v-model="form.s3.region" :class="inputClass" />
            </label>
            <label class="block">
              <span class="mb-1 block text-xs font-medium text-text-muted">Bucket</span>
              <input v-model="form.s3.bucket" :class="inputClass" />
            </label>
            <label class="block">
              <span class="mb-1 block text-xs font-medium text-text-muted">Force path style</span>
              <select v-model="form.s3.forcePathStyle" :class="inputClass">
                <option :value="false">No (R2 / S3)</option>
                <option :value="true">Yes (MinIO / B2)</option>
              </select>
            </label>
            <label class="block">
              <span class="mb-1 block text-xs font-medium text-text-muted">Access key ID</span>
              <input v-model="form.s3.accessKeyId" autocomplete="off" :class="inputClass" />
            </label>
            <label class="block">
              <span class="mb-1 block text-xs font-medium text-text-muted">Secret access key</span>
              <input
                v-model="form.s3.secretAccessKey"
                type="password"
                autocomplete="off"
                :class="inputClass"
              />
            </label>
            <p class="text-xs text-text-subtle sm:col-span-2">
              Stored under the <code class="text-xs">notebookpp/</code> folder in the bucket.
            </p>
          </template>

          <div class="flex flex-wrap items-center gap-3 sm:col-span-2">
            <UiButton type="submit" :loading="saving">Save settings</UiButton>
            <UiButton
              type="button"
              variant="subtle"
              :loading="backingUp"
              :disabled="!!status?.running"
              @click="backupNow"
            >
              Back up now
            </UiButton>
            <p v-if="saveMsg" class="text-sm text-success">{{ saveMsg }}</p>
            <p v-if="saveError" class="text-sm text-danger">{{ saveError }}</p>
          </div>
        </form>

        <!-- Backups -->
        <div class="mt-6 border-t border-border pt-5">
          <h3 class="text-sm font-semibold text-heading">Backups</h3>
          <p v-if="backupsError" class="mt-2 text-sm text-danger">{{ backupsError }}</p>
          <EmptyState
            v-else-if="!backups.length"
            class="mt-3"
            title="No backups yet"
            hint="Set a password and destination, then Back up now."
          />
          <table v-else class="mt-3 w-full border-collapse text-sm">
            <thead>
              <tr
                class="border-b border-border text-left text-xs uppercase tracking-[0.06em] text-text-muted"
              >
                <th class="py-1.5 pr-3 font-medium">Name</th>
                <th class="px-3 py-1.5 font-medium">Size</th>
                <th class="px-3 py-1.5 font-medium">Date</th>
                <th class="py-1.5" />
              </tr>
            </thead>
            <tbody>
              <tr v-for="b in backups" :key="b.name" class="border-b border-border">
                <td class="py-2 pr-3 font-mono text-xs text-text">{{ b.name }}</td>
                <td class="px-3 py-2 text-text-muted">{{ fmtSize(b.size) }}</td>
                <td class="px-3 py-2 text-text-muted">{{ fmtDate(b.modifiedAt) }}</td>
                <td class="py-2 text-right">
                  <button
                    type="button"
                    class="rounded-input px-2 py-1 text-xs font-medium text-text-muted hover:bg-surface-subtle hover:text-heading focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
                    :disabled="!!status?.running"
                    @click="openRestore(b.name)"
                  >
                    Restore…
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- History -->
        <div v-if="history.length" class="mt-6 border-t border-border pt-5">
          <h3 class="text-sm font-semibold text-heading">History</h3>
          <table class="mt-3 w-full border-collapse text-sm">
            <thead>
              <tr
                class="border-b border-border text-left text-xs uppercase tracking-[0.06em] text-text-muted"
              >
                <th class="py-1.5 pr-3 font-medium">When</th>
                <th class="px-3 py-1.5 font-medium">Job</th>
                <th class="px-3 py-1.5 font-medium">Result</th>
                <th class="py-1.5 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="h in history" :key="h.id" class="border-b border-border">
                <td class="py-2 pr-3 text-text-muted">{{ fmtDate(h.createdAt) }}</td>
                <td class="px-3 py-2 text-text-muted">{{ h.type }}</td>
                <td class="px-3 py-2 font-medium" :class="h.ok ? 'text-success' : 'text-danger'">
                  {{ h.ok ? 'ok' : 'failed' }}
                </td>
                <td class="py-2 text-text-muted">
                  <span class="font-mono text-xs">{{ h.error ?? h.name ?? '' }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>

  <!-- Restore dialog -->
  <UiModal v-model:open="restoreOpen">
    <div class="flex items-start gap-3">
      <span
        class="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-danger/10 text-danger"
      >
        <AlertTriangle class="h-4.5 w-4.5" />
      </span>
      <div class="min-w-0 flex-1">
        <h2 class="text-base font-semibold text-heading">Restore backup</h2>
        <p class="mt-0.5 truncate font-mono text-xs text-text-muted">{{ restoreName }}</p>
      </div>
    </div>
    <p class="mt-3 text-sm text-text">
      This <strong>replaces the current database</strong> and, if the backup includes them, your
      uploads. It cannot be undone. Everything not in this backup is lost.
    </p>
    <label class="mt-4 block">
      <span class="mb-1 block text-xs font-medium text-text-muted">Backup password</span>
      <input v-model="restorePassword" type="password" autocomplete="off" :class="inputClass" />
    </label>
    <p
      v-if="restoreCheck.msg"
      class="mt-1.5 text-xs font-medium"
      :class="restoreCheck.ok ? 'text-success' : 'text-danger'"
    >
      {{ restoreCheck.msg }}
    </p>
    <label class="mt-3 block">
      <span class="mb-1 block text-xs font-medium text-text-muted">Type RESTORE to confirm</span>
      <input v-model="restoreConfirm" autocomplete="off" :class="inputClass" />
    </label>
    <div class="mt-5 flex items-center justify-end gap-3">
      <UiButton variant="ghost" @click="restoreOpen = false">Cancel</UiButton>
      <UiButton variant="danger" :loading="restoring" :disabled="!canRestore" @click="doRestore">
        Restore
      </UiButton>
    </div>
  </UiModal>
</template>
