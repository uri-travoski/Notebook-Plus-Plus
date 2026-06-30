<script setup lang="ts">
useHead({ title: 'Settings · Notebook++' })
</script>

<template>
  <AppPage title="Settings" subtitle="Account, preferences, AI keys, and appearance.">
    <EmptyState
      title="Settings are coming soon"
      hint="Profile, theme, fonts (separate body + code fonts), AI keys, and import/export land in a later phase. The font picker writes to your preferences and the whole app already keys off those CSS variables."
    />
  </AppPage>
</template>
