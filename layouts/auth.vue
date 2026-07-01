<template>
  <div class="grid min-h-full place-items-center bg-[#EDF2F9] px-4 py-10">
    <div class="w-full max-w-sm">
      <div class="mb-6 flex items-center justify-center gap-2.5">
        <AppMark class="h-7 w-7 text-primary" />
        <span class="text-lg font-bold text-heading">Notebook++</span>
      </div>
      <div class="rounded-card border border-border bg-surface p-7 shadow-card">
        <slot />
      </div>
    </div>
  </div>
</template>
