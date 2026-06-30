<template>
  <div class="grid min-h-full place-items-center px-4 py-10">
    <div class="w-full max-w-sm">
      <div class="mb-6 flex items-center justify-center gap-2.5">
        <span class="inline-block h-7 w-1.5 rounded-pill bg-primary" aria-hidden="true" />
        <span class="text-xl font-bold text-heading">Notebook++</span>
      </div>
      <div class="rounded-card border border-border bg-surface p-7 shadow-card">
        <slot />
      </div>
    </div>
  </div>
</template>
