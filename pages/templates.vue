<script setup lang="ts">
useHead({ title: 'Templates · Notebook++' })
const { data: docs } = await useFetch('/api/documents', { query: { view: 'templates' } })
</script>

<template>
  <AppPage title="Templates" subtitle="Reusable starting points for new notes.">
    <DocList v-if="docs?.length" :docs="docs" />
    <EmptyState
      v-else
      title="No templates yet"
      hint="Mark a note as a template to reuse its structure."
    />
  </AppPage>
</template>
