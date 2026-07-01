<script setup lang="ts">
import IconFolder from '~/components/IconFolder.vue'
import AppMark from '~/components/AppMark.vue'
import { FileText } from 'lucide-vue-next'
useHead({ title: 'Overview · Notebook++' })
const { user } = useUserSession()
const { data: stats } = await useFetch('/api/stats')
const { data: recent } = await useFetch('/api/documents', { query: { view: 'recent' } })
const { data: starred } = await useFetch('/api/documents', { query: { view: 'starred' } })

// Stat tiles use the same icons as the sidebar (project folder, notebook mark, page).
const cards = computed(() => [
  { label: 'Projects', value: stats.value?.projects ?? 0, icon: IconFolder },
  { label: 'Notebooks', value: stats.value?.notebooks ?? 0, icon: AppMark },
  { label: 'Notes', value: stats.value?.notes ?? 0, icon: FileText },
])
// Overview shows only the 10 most recent notes.
const recent10 = computed(() => (recent.value ?? []).slice(0, 10))
</script>

<template>
  <AppPage title="Overview" :subtitle="`Welcome back, ${user?.displayName || user?.username}.`">
    <div class="space-y-8">
      <section aria-label="At a glance">
        <dl class="grid grid-cols-3 gap-3 sm:gap-4">
          <div
            v-for="c in cards"
            :key="c.label"
            class="rounded-card border border-border bg-sidebar px-3 py-4 sm:px-5 sm:py-5"
          >
            <dt
              class="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.06em] text-text-muted"
            >
              <component :is="c.icon" class="h-[18px] w-[18px] shrink-0 text-text-subtle" />
              {{ c.label }}
            </dt>
            <dd class="mt-1 text-2xl font-bold tabular-nums text-heading sm:text-3xl">
              {{ c.value }}
            </dd>
          </div>
        </dl>
      </section>

      <div class="grid gap-8 md:grid-cols-2">
        <section>
          <h2 class="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-text-muted">
            Recent
          </h2>
          <DocList v-if="recent10.length" :docs="recent10" />
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
    </div>
  </AppPage>
</template>
