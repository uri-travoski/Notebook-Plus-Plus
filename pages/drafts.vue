<script setup lang="ts">
import { PencilLine } from 'lucide-vue-next'
useHead({ title: 'Drafts · Notebook++' })
const { data: docs } = await useFetch<DocSummary[]>('/api/documents', { query: { view: 'drafts' } })
</script>

<template>
  <AppPage title="Drafts" subtitle="Unfiled notes not yet placed in a notebook.">
    <DocList v-if="docs?.length" :docs="docs" />
    <EmptyState
      v-else
      :icon="PencilLine"
      title="No drafts"
      hint="New notes created outside a notebook show up here."
    />
  </AppPage>
</template>
