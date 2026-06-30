<script setup lang="ts">
const route = useRoute()
const { data: doc, error } = await useFetch(`/api/documents/${route.params.id}`)
useHead({ title: () => `${doc.value?.title || 'Untitled'} · Notebook++` })
</script>

<template>
  <div v-if="error" class="mx-auto max-w-3xl px-6 py-10">
    <EmptyState title="Note not found" hint="It may have been deleted or moved to Trash." />
  </div>
  <article v-else class="mx-auto max-w-[720px] px-6 py-10">
    <h1 class="text-[32px] font-bold leading-tight text-heading">{{ doc?.title }}</h1>
    <p class="mt-4 text-text-muted">
      The {{ doc?.type }} editor arrives in the next phase. This note exists and is saved.
    </p>
  </article>
</template>
