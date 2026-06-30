<script setup lang="ts">
useHead({ title: 'Archive · Notebook++' })
const { data: docs, refresh } = await useFetch('/api/documents', { query: { view: 'archived' } })
const { refresh: refreshTree } = useTree()

async function restore(id: string) {
  await $fetch(`/api/documents/${id}`, { method: 'PATCH', body: { archived: false } })
  await Promise.all([refresh(), refreshTree()])
}
</script>

<template>
  <AppPage title="Archive" subtitle="Archived notes are hidden from the sidebar but kept.">
    <DocList v-if="docs?.length" :docs="docs" :linkable="false">
      <template #actions="{ doc }">
        <UiButton variant="ghost" @click="restore(doc.id)">Restore</UiButton>
      </template>
    </DocList>
    <EmptyState
      v-else
      title="Archive is empty"
      hint="Archive a note from its menu to move it here."
    />
  </AppPage>
</template>
