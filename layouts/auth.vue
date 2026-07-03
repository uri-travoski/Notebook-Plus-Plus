<template>
  <div class="grid min-h-full place-items-center bg-[#EDF2F9] px-4 py-10">
    <div class="w-full max-w-sm">
      <div class="mb-6 flex items-center justify-center gap-2.5">
        <AppLogo class="h-9 w-9 text-primary" />
        <span class="text-2xl font-bold text-heading">Notebook++</span>
      </div>
      <div class="rounded-card border border-border bg-surface p-7 shadow-card">
        <slot />
      </div>
    </div>
  </div>
</template>
