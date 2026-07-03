<script setup lang="ts">
import AppMark from '~/components/AppMark.vue'
useHead({ title: 'Trash · Notebook++' })

type Doc = { id: string; title: string; type: 'page' | 'canvas'; updatedAt: string; isStarred?: boolean }
const { data: trash, refresh } = await useFetch<{
  notebooks: { id: string; name: string }[]
  documents: Doc[]
}>('/api/trash')
const { refresh: refreshTree } = useTree()

const hasAny = computed(
  () => !!trash.value && trash.value.notebooks.length + trash.value.documents.length > 0,
)

async function act(kind: 'notebooks' | 'documents', id: string, restore: boolean) {
  if (restore) await $fetch(`/api/${kind}/${id}`, { method: 'PATCH', body: { deleted: false } })
  else await $fetch(`/api/${kind}/${id}`, { method: 'DELETE' })
  await Promise.all([refresh(), refreshTree()])
}
</script>

<template>
  <AppPage title="Trash" subtitle="Restore items, or delete them permanently.">
    <div v-if="hasAny" class="space-y-8">
      <section v-if="trash!.notebooks.length">
        <h2 class="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-text-muted">
          Notebooks
        </h2>
        <ul
          class="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface"
        >
          <li v-for="n in trash!.notebooks" :key="n.id" class="flex items-center gap-3 px-4 py-3">
            <AppMark class="h-[18px] w-[18px] shrink-0 text-text-subtle" />
            <span class="min-w-0 flex-1 truncate text-sm font-medium text-heading">{{ n.name }}</span>
            <div class="flex shrink-0 items-center gap-1">
              <UiButton variant="ghost" @click="act('notebooks', n.id, true)">Restore</UiButton>
              <UiButton
                variant="ghost"
                class="!text-danger hover:!bg-danger-bg"
                @click="act('notebooks', n.id, false)"
                >Delete</UiButton
              >
            </div>
          </li>
        </ul>
      </section>

      <section v-if="trash!.documents.length">
        <h2 class="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-text-muted">Notes</h2>
        <DocList :docs="trash!.documents" :linkable="false">
          <template #actions="{ doc }">
            <div class="flex items-center gap-1">
              <UiButton variant="ghost" @click="act('documents', doc.id, true)">Restore</UiButton>
              <UiButton
                variant="ghost"
                class="!text-danger hover:!bg-danger-bg"
                @click="act('documents', doc.id, false)"
                >Delete</UiButton
              >
            </div>
          </template>
        </DocList>
      </section>
    </div>
    <EmptyState
      v-else
      title="Trash is empty"
      hint="Notebooks and notes you move to Trash appear here until deleted permanently."
    />
  </AppPage>
</template>
