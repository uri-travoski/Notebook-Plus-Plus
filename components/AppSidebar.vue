<script setup lang="ts">
import {
  Plus,
  Folder,
  BookText,
  ChevronRight,
  MoreHorizontal,
  House,
  Star,
  FileStack,
  LayoutTemplate,
  Archive,
  Trash2,
  Settings,
  Pencil,
  BookPlus,
  FilePlus,
  Upload,
} from 'lucide-vue-next'
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
} = useTree()

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
  try {
    await $fetch('/api/import/markdown', {
      method: 'POST',
      body: { notebookId: importTargetNb.value, files },
    })
    await refresh()
  } finally {
    input.value = ''
    importTargetNb.value = null
  }
}
const { ensure: ensurePrefs, isCollapsed, toggleCollapse } = usePreferences()
const { start: startNewDoc } = useNewDoc()
const route = useRoute()

onMounted(() => {
  ensure()
  ensurePrefs()
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
  const n = await createNotebook(projectId)
  startRename('notebook', n.id, n.name)
}
function addNote(notebookId: string) {
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

const navItems = [
  { to: '/', label: 'Overview', icon: House },
  { to: '/starred', label: 'Starred', icon: Star },
  { to: '/drafts', label: 'Drafts', icon: FileStack },
]
const systemItems = [
  { to: '/templates', label: 'Templates', icon: LayoutTemplate },
  { to: '/archive', label: 'Archive', icon: Archive },
  { to: '/trash', label: 'Trash', icon: Trash2 },
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
    <div class="px-3 pb-2 pt-3">
      <div class="flex items-center gap-2 px-1 py-1">
        <svg
          class="h-6 w-6 shrink-0 text-primary"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 256 256"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            d="M208,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM80,208H48V48H80Zm96-56H112a8,8,0,0,1,0-16h64a8,8,0,0,1,0,16Zm0-32H112a8,8,0,0,1,0-16h64a8,8,0,0,1,0,16Z"
          />
        </svg>
        <span class="font-bold text-heading">Notebook++</span>
      </div>
    </div>

    <nav class="flex-1 overflow-y-auto px-2 pb-4" aria-label="Sidebar">
      <ul class="space-y-0.5">
        <li v-for="item in navItems" :key="item.to">
          <NuxtLink
            :to="item.to"
            class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm"
            :class="navClass(item.to)"
          >
            <component
              :is="item.icon"
              class="h-4 w-4"
              :class="route.path === item.to ? 'text-primary' : 'text-text-subtle'"
            />
            {{ item.label }}
          </NuxtLink>
        </li>
      </ul>

      <div class="mb-1 mt-5 px-2">
        <span class="text-xs font-semibold uppercase tracking-[0.06em] text-text-muted"
          >Workspace</span
        >
      </div>

      <p v-if="loaded && !decoratedProjects.length" class="px-2 py-3 text-sm text-text-muted">
        No projects yet.
        <button class="font-medium text-primary hover:underline" @click="addProject">
          Create your first project.
        </button>
      </p>

      <ul v-else class="space-y-0.5">
        <li v-for="project in decoratedProjects" :key="project.id">
          <div class="group flex items-center gap-1 rounded-md pr-1 hover:bg-row-hover">
            <button
              type="button"
              class="shrink-0 rounded p-0.5 text-text-subtle hover:text-text"
              :aria-label="isCollapsed(project.id) ? 'Expand' : 'Collapse'"
              @click="toggleCollapse(project.id)"
            >
              <ChevronRight
                class="h-3.5 w-3.5 transition-transform"
                :class="isCollapsed(project.id) ? '' : 'rotate-90'"
              />
            </button>
            <Folder class="h-4 w-4 shrink-0 text-text-subtle" />
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
              class="min-w-0 flex-1 truncate py-1 text-left text-sm font-medium text-heading"
              @click="toggleCollapse(project.id)"
            >
              {{ project.name }}
            </button>
            <button
              type="button"
              class="shrink-0 rounded p-1 text-text-muted opacity-0 transition-opacity hover:bg-row-hover hover:text-text group-hover:opacity-100"
              aria-label="Add notebook"
              @click="addNotebook(project.id)"
            >
              <Plus class="h-4 w-4" />
            </button>
            <UiDropdown class="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
              <template #trigger><MoreHorizontal class="h-4 w-4" /></template>
              <UiMenuItem @click="startRename('project', project.id, project.name)"
                ><Pencil />Rename</UiMenuItem
              >
              <UiMenuItem @click="addNotebook(project.id)"><BookPlus />New notebook</UiMenuItem>
              <UiMenuItem @click="updateProject(project.id, { archived: true })"
                ><Archive />Archive</UiMenuItem
              >
              <UiMenuItem danger @click="deleteProject(project.id)"
                ><Trash2 />Delete project</UiMenuItem
              >
            </UiDropdown>
          </div>

          <ul v-if="!isCollapsed(project.id)" class="space-y-0.5">
            <li v-if="!project.notebooks.length" class="py-1 pl-8 text-xs text-text-muted">
              No notebooks yet
            </li>
            <li v-for="nb in project.notebooks" :key="nb.id">
              <div class="group flex items-center gap-1 rounded-md pr-1 pl-3.5 hover:bg-row-hover">
                <button
                  type="button"
                  class="shrink-0 rounded p-0.5 text-text-subtle hover:text-text"
                  :aria-label="isCollapsed(nb.id) ? 'Expand' : 'Collapse'"
                  @click="toggleCollapse(nb.id)"
                >
                  <ChevronRight
                    class="h-3.5 w-3.5 transition-transform"
                    :class="isCollapsed(nb.id) ? '' : 'rotate-90'"
                  />
                </button>
                <BookText class="h-4 w-4 shrink-0 text-text-subtle" />
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
                  class="min-w-0 flex-1 truncate py-1 text-left text-sm text-text"
                  @click="toggleCollapse(nb.id)"
                >
                  {{ nb.name }}
                </button>
                <button
                  type="button"
                  class="shrink-0 rounded p-1 text-text-muted opacity-0 transition-opacity hover:bg-row-hover hover:text-text group-hover:opacity-100"
                  aria-label="Add note"
                  @click="addNote(nb.id)"
                >
                  <Plus class="h-4 w-4" />
                </button>
                <UiDropdown class="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
                  <template #trigger><MoreHorizontal class="h-4 w-4" /></template>
                  <UiMenuItem @click="startRename('notebook', nb.id, nb.name)"
                    ><Pencil />Rename</UiMenuItem
                  >
                  <UiMenuItem @click="addNote(nb.id)"><FilePlus />New note</UiMenuItem>
                  <UiMenuItem @click="startImport(nb.id)"><Upload />Import note</UiMenuItem>
                  <UiMenuItem @click="updateNotebook(nb.id, { archived: true })"
                    ><Archive />Archive</UiMenuItem
                  >
                  <UiMenuItem danger @click="deleteNotebook(nb.id)"
                    ><Trash2 />Delete notebook</UiMenuItem
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

      <div class="mb-1 mt-5 px-2">
        <span class="text-xs font-semibold uppercase tracking-[0.06em] text-text-muted"
          >System</span
        >
      </div>
      <ul class="space-y-0.5">
        <li v-for="item in systemItems" :key="item.to">
          <NuxtLink
            :to="item.to"
            class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm"
            :class="navClass(item.to)"
          >
            <component
              :is="item.icon"
              class="h-4 w-4"
              :class="route.path === item.to ? 'text-primary' : 'text-text-subtle'"
            />
            {{ item.label }}
          </NuxtLink>
        </li>
      </ul>
    </nav>

    <div class="border-t border-border px-2 py-2">
      <NuxtLink
        to="/settings"
        class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm"
        :class="navClass('/settings')"
      >
        <Settings class="h-4 w-4 text-text-subtle" /> Settings
      </NuxtLink>
    </div>
  </div>
</template>
