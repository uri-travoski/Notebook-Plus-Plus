<script setup lang="ts">
import { FileText, PenTool, Star } from 'lucide-vue-next'

type Doc = {
  id: string
  title: string
  type: 'page' | 'canvas'
  updatedAt: string
  isStarred?: boolean
}
defineProps<{ docs: Doc[]; linkable?: boolean }>()

function fmt(d: string) {
  return new Date(d).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
</script>

<template>
  <ul class="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
    <li
      v-for="doc in docs"
      :key="doc.id"
      class="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-row-hover"
    >
      <component
        :is="doc.type === 'canvas' ? PenTool : FileText"
        class="h-4 w-4 shrink-0 text-text-subtle"
      />
      <component
        :is="linkable === false ? 'span' : 'NuxtLink'"
        :to="linkable === false ? undefined : `/doc/${doc.id}`"
        class="min-w-0 flex-1 truncate text-sm font-medium text-heading"
        :class="linkable === false ? '' : 'hover:text-primary'"
      >
        {{ doc.title || 'Untitled' }}
      </component>
      <Star v-if="doc.isStarred" class="h-3.5 w-3.5 shrink-0 text-primary" aria-label="Starred" />
      <span class="shrink-0 text-xs text-text-muted">{{ fmt(doc.updatedAt) }}</span>
      <div class="shrink-0">
        <slot name="actions" :doc="doc" />
      </div>
    </li>
  </ul>
</template>
