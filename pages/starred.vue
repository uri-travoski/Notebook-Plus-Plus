<script setup lang="ts">
import { Star } from 'lucide-vue-next'
useHead({ title: 'Starred · Notebook++' })
const { data: docs } = await useFetch('/api/documents', { query: { view: 'starred' } })
</script>

<template>
  <AppPage title="Starred" subtitle="Notes you've pinned for quick access.">
    <DocList v-if="docs?.length" :docs="docs" />
    <EmptyState
      v-else
      :icon="Star"
      title="Nothing starred yet"
      hint="Star a note from its menu in the sidebar."
    />
  </AppPage>
</template>
