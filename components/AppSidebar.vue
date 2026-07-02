<script setup lang="ts">
import {
  Plus,
  ChevronRight,
  MoreHorizontal,
  Archive,
  Trash2,
  Settings,
  Pencil,
  BookPlus,
  FilePlus,
  Upload,
  Search,
  PenTool,
  LogOut,
} from 'lucide-vue-next'
import IconOverview from '~/components/IconOverview.vue'
import IconStarred from '~/components/IconStarred.vue'
import IconArchive from '~/components/IconArchive.vue'
import IconTrash from '~/components/IconTrash.vue'
import type { TreeNote } from '~/composables/useTree'

const {
  tree,
  loaded,
  ensure,
  refresh,
  createProject,
  updateProject,
  deleteProject,
  createNotebook,
  updateNotebook,
  deleteNotebook,
  createNote,
  moveNoteToNotebook,
  reorderNotebook,
  moveNotebookToProject,
  reorderProject,
} = useTree()
const { user, clear } = useUserSession()
const userName = computed(() => user.value?.displayName || user.value?.username || 'Account')
async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clear()
  await navigateTo('/login')
}

async function addCanvas(notebookId: string) {
  expand(notebookId)
  const d = await createNote(notebookId, 'canvas', 'Untitled canvas')
  await navigateTo(`/doc/${d.id}`)
}

// Import Markdown / text notes into a notebook (via its "…" menu).
const importInput = ref<HTMLInputElement | null>(null)
const importTargetNb = ref<string | null>(null)
function startImport(notebookId: string) {
  importTargetNb.value = notebookId
  importInput.value?.click()
}
async function onImportFiles(e: Event) {
  const input = e.target as HTMLInputElement
  const list = input.files
  if (!list || !list.length || !importTargetNb.value) return
  const files = await Promise.all(
    Array.from(list).map(async (f) => ({ name: f.name, markdown: await f.text() })),
  )
  const nbId = importTargetNb.value
  try {
    await $fetch('/api/import/markdown', {
      method: 'POST',
      body: { notebookId: nbId, files },
    })
    expand(nbId)
    await refresh()
  } finally {
    input.value = ''
    importTargetNb.value = null
  }
}
const {
  prefs,
  loaded: prefsLoaded,
  ensure: ensurePrefs,
  isCollapsed,
  toggleCollapse,
  expand,
} = usePreferences()
const { start: startNewDoc } = useNewDoc()
const route = useRoute()

onMounted(() => {
  ensure()
  ensurePrefs()
})

// Default sidebar state: collapse everything except the path (project -> notebook ->
// ancestors) to the most-recently-edited note, so opening the app focuses on recent
// work. Runs once per load (client-only); manual toggles take over from there.
let defaultApplied = false
watchEffect(() => {
  if (defaultApplied || !loaded.value || !prefsLoaded.value) return
  const t = tree.value
  if (!t) return
  defaultApplied = true

  const parentOf = new Map<string, string | null>()
  let last: { id: string; notebookId: string; projectId: string; updatedAt: string } | null = null
  for (const p of t.projects) {
    for (const nb of p.notebooks) {
      for (const n of nb.notes) {
        parentOf.set(n.id, n.parentDocumentId)
        if (n.updatedAt && (!last || n.updatedAt > last.updatedAt)) {
          last = { id: n.id, notebookId: nb.id, projectId: p.id, updatedAt: n.updatedAt }
        }
      }
    }
  }

  const keep = new Set<string>()
  if (last) {
    keep.add(last.projectId)
    keep.add(last.notebookId)
    keep.add(last.id)
    let cur = parentOf.get(last.id) ?? null
    while (cur) {
      keep.add(cur)
      cur = parentOf.get(cur) ?? null
    }
  }

  const collapsed: string[] = []
  for (const p of t.projects) {
    if (!keep.has(p.id)) collapsed.push(p.id)
    for (const nb of p.notebooks) {
      if (!keep.has(nb.id)) collapsed.push(nb.id)
      for (const n of nb.notes) if (!keep.has(n.id)) collapsed.push(n.id)
    }
  }
  prefs.value = { ...prefs.value, sidebarCollapsed: collapsed }
})

const editing = ref<{ kind: 'project' | 'notebook'; id: string } | null>(null)
const draft = ref('')
function startRename(kind: 'project' | 'notebook', id: string, current: string) {
  editing.value = { kind, id }
  draft.value = current
}
async function commitRename() {
  const e = editing.value
  if (!e) return
  editing.value = null
  const t = draft.value.trim()
  if (!t) return
  if (e.kind === 'project') await updateProject(e.id, { name: t })
  else await updateNotebook(e.id, { name: t })
}

async function addProject() {
  const p = await createProject()
  startRename('project', p.id, p.name)
}
async function addNotebook(projectId: string) {
  expand(projectId)
  const n = await createNotebook(projectId)
  startRename('notebook', n.id, n.name)
}
function addNote(notebookId: string) {
  expand(notebookId)
  startNewDoc(notebookId)
}

function buildChildrenMap(notes: TreeNote[]) {
  const map = new Map<string, TreeNote[]>()
  for (const n of notes) {
    if (!n.parentDocumentId) continue
    const l = map.get(n.parentDocumentId)
    if (l) l.push(n)
    else map.set(n.parentDocumentId, [n])
  }
  return map
}
const decoratedProjects = computed(() =>
  (tree.value?.projects ?? []).map((p) => ({
    ...p,
    notebooks: p.notebooks.map((nb) => ({
      ...nb,
      top: nb.notes.filter((n) => !n.parentDocumentId),
      childrenMap: buildChildrenMap(nb.notes),
    })),
  })),
)

// Drag & drop: reorder within a list, or move a note into a notebook / a notebook into a project.
const drag = useState<{ kind: 'note' | 'notebook' | 'project'; id: string } | null>(
  'sidebar-drag',
  () => null,
)
const overId = ref<string | null>(null)
function onProjectDragStart(e: DragEvent, id: string) {
  drag.value = { kind: 'project', id }
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}
function onProjectDragOver(id: string) {
  const d = drag.value
  if (d && (d.kind === 'notebook' || (d.kind === 'project' && d.id !== id))) overId.value = id
}
async function onProjectDrop(id: string) {
  overId.value = null
  const d = drag.value
  drag.value = null
  if (d?.kind === 'notebook') await moveNotebookToProject(d.id, id)
  else if (d?.kind === 'project' && d.id !== id) await reorderProject(d.id, id)
}
function onNotebookDragStart(e: DragEvent, id: string) {
  drag.value = { kind: 'notebook', id }
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}
function onNotebookDragOver(id: string) {
  const d = drag.value
  if (d && (d.kind === 'note' || (d.kind === 'notebook' && d.id !== id))) overId.value = id
}
async function onNotebookDrop(id: string) {
  overId.value = null
  const d = drag.value
  drag.value = null
  if (d?.kind === 'note') await moveNoteToNotebook(d.id, id)
  else if (d?.kind === 'notebook' && d.id !== id) await reorderNotebook(d.id, id)
}

const navItems = [
  { to: '/', label: 'Overview', icon: IconOverview },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/starred', label: 'Starred', icon: IconStarred },
]
const systemItems = [
  { to: '/archive', label: 'Archive', icon: IconArchive },
  { to: '/trash', label: 'Trash', icon: IconTrash },
]
const navClass = (to: string) =>
  route.path === to ? 'bg-row-selected font-medium text-heading' : 'text-text hover:bg-row-hover'
</script>

<template>
  <div class="flex h-full flex-col bg-sidebar">
    <input
      ref="importInput"
      type="file"
      accept=".md,.txt,text/markdown,text/plain"
      multiple
      class="hidden"
      @change="onImportFiles"
    />
    <div class="border-b border-border px-3 pb-2 pt-3">
      <div class="flex items-center gap-2 px-1 pt-1">
        <AppMark class="h-7 w-7 shrink-0 text-primary md:h-6 md:w-6" />
        <span class="text-lg font-bold text-heading">Notebook++</span>
      </div>
    </div>

    <nav class="flex-1 overflow-y-auto px-2 pb-4 pt-[10px]" aria-label="Sidebar">
      <ul class="space-y-0.5">
        <li v-for="item in navItems" :key="item.to">
          <NuxtLink
            :to="item.to"
            class="flex items-center gap-3 rounded-md px-2.5 py-1 text-[15px] md:gap-2 md:px-2 md:py-1 md:text-sm"
            :class="navClass(item.to)"
          >
            <component
              :is="item.icon"
              class="h-5 w-5 shrink-0 md:h-4 md:w-4"
              :class="route.path === item.to ? 'text-primary' : 'text-text-subtle'"
            />
            {{ item.label }}
          </NuxtLink>
        </li>
      </ul>

      <div class="mb-1 mt-4 flex items-center justify-between border-t border-border px-2 pt-4">
        <span class="text-xs font-semibold uppercase tracking-[0.06em] text-text-muted"
          >Projects</span
        >
        <button
          type="button"
          class="shrink-0 rounded p-0.5 text-primary transition-colors hover:bg-row-hover hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
          aria-label="Add project"
          title="Add project"
          @click="addProject"
        >
          <Plus class="h-4 w-4" />
        </button>
      </div>

      <p v-if="loaded && !decoratedProjects.length" class="px-2 py-3 text-sm text-text-muted">
        No projects yet.
        <button class="font-medium text-primary hover:underline" @click="addProject">
          Create your first project.
        </button>
      </p>

      <ul v-else class="space-y-0.5">
        <li v-for="project in decoratedProjects" :key="project.id">
          <div
            class="group flex items-center gap-1 rounded-md pr-1 hover:bg-row-hover"
            :class="overId === project.id ? 'shadow-[inset_0_0_0_2px_var(--color-primary)]' : ''"
            :draggable="!(editing?.kind === 'project' && editing?.id === project.id)"
            @dragstart="onProjectDragStart($event, project.id)"
            @dragend="drag = null"
            @dragover.prevent="onProjectDragOver(project.id)"
            @dragleave="overId = null"
            @drop.prevent="onProjectDrop(project.id)"
          >
            <button
              type="button"
              class="shrink-0 rounded p-1 text-text-subtle hover:text-text md:p-0.5"
              :aria-label="isCollapsed(project.id) ? 'Expand' : 'Collapse'"
              @click="toggleCollapse(project.id)"
            >
              <ChevronRight
                class="h-4 w-4 transition-transform md:h-3.5 md:w-3.5"
                :class="isCollapsed(project.id) ? '' : 'rotate-90'"
              />
            </button>
            <IconFolder
              class="h-[20px] w-[20px] shrink-0 text-text-subtle md:h-[20px] md:w-[20px]"
            />
            <input
              v-if="editing?.kind === 'project' && editing.id === project.id"
              v-model="draft"
              v-focus
              class="min-w-0 flex-1 rounded border border-primary bg-surface px-1 py-0.5 text-sm text-text"
              @keydown.enter="commitRename"
              @keydown.esc="editing = null"
              @blur="commitRename"
            />
            <button
              v-else
              type="button"
              class="min-w-0 flex-1 truncate py-1.5 text-left text-[15px] font-medium text-heading md:py-1 md:text-sm"
              @click="toggleCollapse(project.id)"
            >
              {{ project.name }}
            </button>
            <button
              type="button"
              class="shrink-0 rounded p-1.5 text-text-muted opacity-100 transition-opacity hover:bg-row-hover hover:text-text md:p-1 md:opacity-0 md:group-hover:opacity-100"
              aria-label="Add notebook"
              @click="addNotebook(project.id)"
            >
              <Plus class="h-4 w-4" />
            </button>
            <UiDropdown
              class="shrink-0 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
            >
              <template #trigger><MoreHorizontal class="h-4 w-4" /></template>
              <UiMenuItem @click="startRename('project', project.id, project.name)"
                ><Pencil />Rename</UiMenuItem
              >
              <UiMenuItem @click="addNotebook(project.id)"><BookPlus />New notebook</UiMenuItem>
              <UiMenuItem @click="updateProject(project.id, { archived: true })"
                ><Archive />Archive</UiMenuItem
              >
              <UiMenuItem danger @click="deleteProject(project.id)"
                ><Trash2 />Move to Trash</UiMenuItem
              >
            </UiDropdown>
          </div>

          <ul v-if="!isCollapsed(project.id)" class="space-y-0.5">
            <li v-for="nb in project.notebooks" :key="nb.id">
              <div
                class="group flex items-center gap-1 rounded-md pr-1 pl-3.5 hover:bg-row-hover"
                :class="overId === nb.id ? 'shadow-[inset_0_0_0_2px_var(--color-primary)]' : ''"
                :draggable="!(editing?.kind === 'notebook' && editing?.id === nb.id)"
                @dragstart="onNotebookDragStart($event, nb.id)"
                @dragend="drag = null"
                @dragover.prevent="onNotebookDragOver(nb.id)"
                @dragleave="overId = null"
                @drop.prevent="onNotebookDrop(nb.id)"
              >
                <button
                  type="button"
                  class="shrink-0 rounded p-1 text-text-subtle hover:text-text md:p-0.5"
                  :aria-label="isCollapsed(nb.id) ? 'Expand' : 'Collapse'"
                  @click="toggleCollapse(nb.id)"
                >
                  <ChevronRight
                    class="h-4 w-4 transition-transform md:h-3.5 md:w-3.5"
                    :class="isCollapsed(nb.id) ? '' : 'rotate-90'"
                  />
                </button>
                <AppMark
                  class="h-[20px] w-[20px] shrink-0 text-text-subtle md:h-[20px] md:w-[20px]"
                />
                <input
                  v-if="editing?.kind === 'notebook' && editing.id === nb.id"
                  v-model="draft"
                  v-focus
                  class="min-w-0 flex-1 rounded border border-primary bg-surface px-1 py-0.5 text-sm text-text"
                  @keydown.enter="commitRename"
                  @keydown.esc="editing = null"
                  @blur="commitRename"
                />
                <button
                  v-else
                  type="button"
                  class="min-w-0 flex-1 truncate py-1.5 text-left text-[15px] text-text md:py-1 md:text-sm"
                  @click="toggleCollapse(nb.id)"
                >
                  {{ nb.name }}
                </button>
                <button
                  type="button"
                  class="shrink-0 rounded p-1.5 text-text-muted opacity-100 transition-opacity hover:bg-row-hover hover:text-text md:p-1 md:opacity-0 md:group-hover:opacity-100"
                  aria-label="Add note"
                  @click="addNote(nb.id)"
                >
                  <Plus class="h-4 w-4" />
                </button>
                <UiDropdown
                  class="shrink-0 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
                >
                  <template #trigger><MoreHorizontal class="h-4 w-4" /></template>
                  <UiMenuItem @click="startRename('notebook', nb.id, nb.name)"
                    ><Pencil />Rename</UiMenuItem
                  >
                  <UiMenuItem @click="addNote(nb.id)"><FilePlus />New note</UiMenuItem>
                  <UiMenuItem @click="addCanvas(nb.id)"><PenTool />New canvas</UiMenuItem>
                  <UiMenuItem @click="startImport(nb.id)"><Upload />Import note</UiMenuItem>
                  <UiMenuItem @click="updateNotebook(nb.id, { archived: true })"
                    ><Archive />Archive</UiMenuItem
                  >
                  <UiMenuItem danger @click="deleteNotebook(nb.id)"
                    ><Trash2 />Move to Trash</UiMenuItem
                  >
                </UiDropdown>
              </div>
              <ul v-if="!isCollapsed(nb.id)">
                <li v-if="!nb.notes.length" class="py-1 pl-[34px] text-xs text-text-muted">
                  No notes yet
                </li>
                <SidebarNote
                  v-for="note in nb.top"
                  :key="note.id"
                  :note="note"
                  :children-map="nb.childrenMap"
                  :depth="2"
                />
              </ul>
            </li>
          </ul>
        </li>
      </ul>

    </nav>

    <!-- System — pinned to the bottom, above the account area -->
    <div class="shrink-0 border-t border-border px-2 pb-2 pt-2">
      <div class="mb-1 px-2">
        <span class="text-xs font-semibold uppercase tracking-[0.06em] text-text-muted"
          >System</span
        >
      </div>
      <ul class="space-y-0.5">
        <li v-for="item in systemItems" :key="item.to">
          <NuxtLink
            :to="item.to"
            class="flex items-center gap-3 rounded-md px-2.5 py-1 text-[15px] md:gap-2 md:px-2 md:py-1 md:text-sm"
            :class="navClass(item.to)"
          >
            <component
              :is="item.icon"
              class="h-5 w-5 shrink-0 md:h-4 md:w-4"
              :class="route.path === item.to ? 'text-primary' : 'text-text-subtle'"
            />
            {{ item.label }}
          </NuxtLink>
        </li>
      </ul>
    </div>

    <div class="shrink-0 border-t border-border px-2 py-1">
      <UiDropdown
        up
        block
        label="Account menu"
        trigger-class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-row-hover focus-visible:outline-2 focus-visible:outline-primary"
      >
        <template #trigger>
          <span
            class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-subtle text-primary-subtle-fg"
          >
            <IconUser class="h-[18px] w-[18px]" />
          </span>
          <span class="min-w-0 flex-1 truncate text-[15px] font-medium text-heading md:text-sm">{{
            userName
          }}</span>
          <ChevronRight class="h-4 w-4 shrink-0 -rotate-90 text-text-subtle md:h-3.5 md:w-3.5" />
        </template>
        <UiMenuItem @click="navigateTo('/settings')"><Settings />Settings</UiMenuItem>
        <UiMenuItem danger @click="logout"><LogOut />Log out</UiMenuItem>
      </UiDropdown>
    </div>
  </div>
</template>
