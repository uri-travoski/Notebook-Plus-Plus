<script setup lang="ts">
import {
  FileText,
  PenTool,
  Star,
  MoreHorizontal,
  ChevronRight,
  Archive,
  Trash2,
  Pencil,
  FolderInput,
  Download,
} from 'lucide-vue-next'
import type { TreeNote } from '~/composables/useTree'

const props = defineProps<{
  note: TreeNote
  childrenMap: Map<string, TreeNote[]>
  depth: number
}>()

const { updateNote, reorderNote } = useTree()
const { isCollapsed, toggleCollapse } = usePreferences()
const route = useRoute()

// Drag-reorder (desktop). dragId is shared across all SidebarNote rows.
const dragId = useState<string | null>('sidebar-drag-id', () => null)
const dragOver = ref(false)
function onDragStart(e: DragEvent) {
  dragId.value = props.note.id
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}
function onDragOver() {
  if (dragId.value && dragId.value !== props.note.id) dragOver.value = true
}
async function onDrop() {
  dragOver.value = false
  const dragged = dragId.value
  dragId.value = null
  if (dragged && dragged !== props.note.id) await reorderNote(dragged, props.note.id)
}

const children = computed(() => props.childrenMap.get(props.note.id) ?? [])
const hasChildren = computed(() => children.value.length > 0)
const collapsed = computed(() => isCollapsed(props.note.id))
const active = computed(() => route.path === `/doc/${props.note.id}`)

const editing = ref(false)
const draft = ref(props.note.title)
function startRename() {
  draft.value = props.note.title
  editing.value = true
}
async function commitRename() {
  if (!editing.value) return
  editing.value = false
  const t = draft.value.trim()
  if (t && t !== props.note.title) await updateNote(props.note.id, { title: t })
}
const toggleStar = () => updateNote(props.note.id, { isStarred: !props.note.isStarred })
function exportNote() {
  const a = document.createElement('a')
  a.href = `/api/documents/${props.note.id}/markdown`
  a.download = `${props.note.title || 'untitled'}.md`
  document.body.appendChild(a)
  a.click()
  a.remove()
}
const archive = () => updateNote(props.note.id, { archived: true })
const trash = () => updateNote(props.note.id, { deleted: true })
const showMove = ref(false)
</script>

<template>
  <li>
    <div
      class="group flex items-center gap-1 rounded-md pr-1"
      :class="[
        active ? 'bg-row-selected' : 'hover:bg-row-hover',
        dragOver ? 'shadow-[inset_0_2px_0_0_var(--color-primary)]' : '',
      ]"
      :style="{ paddingLeft: `${depth * 12 + 6}px` }"
      :draggable="!editing"
      @dragstart="onDragStart"
      @dragend="dragId = null"
      @dragover.prevent="onDragOver"
      @dragleave="dragOver = false"
      @drop.prevent="onDrop"
    >
      <button
        v-if="hasChildren"
        type="button"
        class="shrink-0 rounded p-0.5 text-text-subtle hover:text-text"
        :aria-label="collapsed ? 'Expand' : 'Collapse'"
        @click="toggleCollapse(note.id)"
      >
        <ChevronRight
          class="h-3.5 w-3.5 transition-transform"
          :class="collapsed ? '' : 'rotate-90'"
        />
      </button>
      <span v-else class="w-[18px] shrink-0" />

      <component
        :is="note.type === 'canvas' ? PenTool : FileText"
        class="h-4 w-4 shrink-0"
        :class="active ? 'text-primary' : 'text-text-subtle'"
      />

      <input
        v-if="editing"
        v-model="draft"
        v-focus
        class="min-w-0 flex-1 rounded border border-primary bg-surface px-1 py-0.5 text-sm text-text"
        @keydown.enter="commitRename"
        @keydown.esc="editing = false"
        @blur="commitRename"
      />
      <NuxtLink
        v-else
        :to="`/doc/${note.id}`"
        :draggable="false"
        class="min-w-0 flex-1 truncate py-1 text-sm"
        :class="active ? 'font-medium text-heading' : 'text-text'"
      >
        {{ note.title || 'Untitled' }}
      </NuxtLink>

      <Star
        v-if="note.isStarred && !editing"
        class="h-3.5 w-3.5 shrink-0 text-primary"
        aria-label="Starred"
      />

      <UiDropdown
        v-if="!editing"
        class="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
      >
        <template #trigger><MoreHorizontal class="h-4 w-4" /></template>
        <UiMenuItem @click="toggleStar"
          ><Star />{{ note.isStarred ? 'Unstar' : 'Star' }}</UiMenuItem
        >
        <UiMenuItem @click="startRename"><Pencil />Rename</UiMenuItem>
        <UiMenuItem @click="exportNote"><Download />Export note</UiMenuItem>
        <UiMenuItem @click="archive"><Archive />Archive</UiMenuItem>
        <UiMenuItem @click="showMove = true"><FolderInput />Move to…</UiMenuItem>
        <UiMenuItem danger @click="trash"><Trash2 />Move to Trash</UiMenuItem>
      </UiDropdown>
    </div>

    <MoveNoteDialog v-model:open="showMove" :note="note" />

    <ul v-if="hasChildren && !collapsed">
      <SidebarNote
        v-for="child in children"
        :key="child.id"
        :note="child"
        :children-map="childrenMap"
        :depth="depth + 1"
      />
    </ul>
  </li>
</template>
