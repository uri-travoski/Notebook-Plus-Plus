<script setup lang="ts">
import { FileText, PenTool, X } from 'lucide-vue-next'

const { tabs, activeId, closeTab, reorderTabs } = useTabs()

const dragIdx = ref<number | null>(null)
const dropIdx = ref<number | null>(null)

function onDragStart(e: DragEvent, idx: number) {
  dragIdx.value = idx
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}
function onDragOver(e: DragEvent, idx: number) {
  if (dragIdx.value === null || dragIdx.value === idx) return
  e.preventDefault()
  dropIdx.value = idx
}
function onDrop() {
  if (dragIdx.value !== null && dropIdx.value !== null) {
    reorderTabs(dragIdx.value, dropIdx.value)
  }
  dragIdx.value = null
  dropIdx.value = null
}
</script>

<template>
  <div
    v-if="tabs.length"
    class="hidden shrink-0 items-center gap-0.5 border-b border-border bg-sidebar px-2 md:flex"
    role="tablist"
    aria-label="Open documents"
  >
    <div
      v-for="(tab, idx) in tabs"
      :key="tab.id"
      role="tab"
      :aria-selected="activeId === tab.id"
      :draggable="true"
      class="group flex h-9 cursor-pointer select-none items-center gap-1.5 rounded-t-md border-b-2 px-3 text-sm transition-colors"
      :class="[
        activeId === tab.id
          ? 'border-primary bg-surface text-heading'
          : 'border-transparent text-text-muted hover:bg-row-hover hover:text-text',
        dropIdx === idx && dragIdx !== null ? 'ring-2 ring-primary/40' : '',
      ]"
      @click="navigateTo(`/doc/${tab.id}`)"
      @dragstart="onDragStart($event, idx)"
      @dragover="onDragOver($event, idx)"
      @dragleave="dropIdx = null"
      @drop.prevent="onDrop"
      @dragend="dragIdx = null; dropIdx = null"
    >
      <component
        :is="tab.type === 'canvas' ? PenTool : FileText"
        class="h-3.5 w-3.5 shrink-0"
        :class="activeId === tab.id ? 'text-primary' : 'text-text-subtle'"
      />
      <span class="max-w-[160px] truncate">{{ tab.title || 'Untitled' }}</span>
      <button
        type="button"
        class="ml-1 shrink-0 rounded p-0.5 text-text-subtle opacity-0 transition-opacity hover:bg-surface-subtle hover:text-heading group-hover:opacity-100"
        :class="{ 'opacity-100': activeId === tab.id }"
        aria-label="Close tab"
        @click.stop="closeTab(tab.id)"
      >
        <X class="h-3.5 w-3.5" />
      </button>
    </div>
  </div>
</template>
