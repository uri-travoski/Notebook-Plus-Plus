<script setup lang="ts">
useHead({ title: 'Overview · Notebook++' })
const { user } = useUserSession()
const { data: recent } = await useFetch('/api/documents', { query: { view: 'recent' } })
const { data: starred } = await useFetch('/api/documents', { query: { view: 'starred' } })
</script>

<template>
  <AppPage title="Overview" :subtitle="`Welcome back, ${user?.displayName || user?.username}.`">
    <div class="space-y-8">
      <section>
        <h2 class="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-text-muted">
          Recent
        </h2>
        <DocList v-if="recent?.length" :docs="recent" />
        <EmptyState
          v-else
          title="No notes yet"
          hint="Create a project and notebook in the sidebar, then add your first page or canvas."
        />
      </section>
      <section>
        <h2 class="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-text-muted">
          Starred
        </h2>
        <DocList v-if="starred?.length" :docs="starred" />
        <EmptyState
          v-else
          title="Nothing starred"
          hint="Star a note from its menu to pin it here."
        />
      </section>
    </div>
  </AppPage>
</template>
