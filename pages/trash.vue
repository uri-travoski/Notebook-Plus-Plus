<script setup lang="ts">
useHead({ title: 'Trash · Notebook++' })
const { data: docs, refresh } = await useFetch('/api/documents', { query: { view: 'trashed' } })
const { refresh: refreshTree } = useTree()

async function restore(id: string) {
  await $fetch(`/api/documents/${id}`, { method: 'PATCH', body: { deleted: false } })
  await Promise.all([refresh(), refreshTree()])
}
async function purge(id: string) {
  await $fetch(`/api/documents/${id}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <AppPage title="Trash" subtitle="Restore notes, or delete them permanently.">
    <DocList v-if="docs?.length" :docs="docs" :linkable="false">
      <template #actions="{ doc }">
        <div class="flex items-center gap-1">
          <UiButton variant="ghost" @click="restore(doc.id)">Restore</UiButton>
          <UiButton variant="ghost" class="!text-danger hover:!bg-danger-bg" @click="purge(doc.id)"
            >Delete</UiButton
          >
        </div>
      </template>
    </DocList>
    <EmptyState
      v-else
      title="Trash is empty"
      hint="Notes you move to Trash appear here until purged."
    />
  </AppPage>
</template>
