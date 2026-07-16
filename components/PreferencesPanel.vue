<script setup lang="ts">
import { Sun, Moon, Monitor } from 'lucide-vue-next'
import { BODY_FONTS, MONO_FONTS, FONT_SIZE } from '~/composables/useAppearance'

const { prefs, ensure, patch } = usePreferences()
onMounted(ensure)

function get(key: string, def: string): string {
  const v = prefs.value[key]
  return typeof v === 'string' ? v : def
}
async function set(key: string, value: string) {
  await patch({ [key]: value })
  applyAppearance(prefs.value)
}

const THEMES = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]
</script>

<template>
  <section class="rounded-box border border-border bg-surface p-5">
    <h2 class="text-base font-semibold text-heading">Preferences</h2>
    <p class="mt-1 text-sm text-text-muted">Theme, fonts, and the editor reading width.</p>

    <!-- Theme -->
    <div class="mt-4">
      <span class="mb-1.5 block text-xs font-medium text-text-muted">Theme</span>
      <div class="inline-flex rounded-input border border-border p-0.5">
        <button
          v-for="t in THEMES"
          :key="t.value"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
          :class="
            get('theme', 'system') === t.value
              ? 'bg-primary-subtle text-primary-subtle-fg'
              : 'text-text-muted hover:text-heading'
          "
          @click="set('theme', t.value)"
        >
          <component :is="t.icon" class="h-4 w-4" />
          {{ t.label }}
        </button>
      </div>
    </div>

    <!-- Fonts -->
    <div class="mt-5 grid gap-4 sm:grid-cols-3">
      <label class="block">
        <span class="mb-1 block text-xs font-medium text-text-muted">Body font</span>
        <select
          :value="get('bodyFont', 'noto')"
          class="w-full rounded-input border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus-visible:outline-2 focus-visible:outline-primary"
          @change="set('bodyFont', ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="(f, key) in BODY_FONTS" :key="key" :value="key">{{ f.label }}</option>
        </select>
      </label>
      <label class="block">
        <span class="mb-1 block text-xs font-medium text-text-muted">Code font</span>
        <select
          :value="get('monoFont', 'jetbrains')"
          class="w-full rounded-input border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus-visible:outline-2 focus-visible:outline-primary"
          @change="set('monoFont', ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="(f, key) in MONO_FONTS" :key="key" :value="key">{{ f.label }}</option>
        </select>
      </label>
      <label class="block">
        <span class="mb-1 block text-xs font-medium text-text-muted">Font size (px)</span>
        <input
          type="number"
          :min="FONT_SIZE.min"
          :max="FONT_SIZE.max"
          :value="get('fontSize', String(FONT_SIZE.default))"
          class="w-full rounded-input border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus-visible:outline-2 focus-visible:outline-primary"
          @change="set('fontSize', ($event.target as HTMLInputElement).value)"
        />
      </label>
    </div>

    <!-- Live preview (uses the app font vars, so it updates instantly) -->
    <div class="mt-4 rounded-input border border-border bg-surface-subtle p-4">
      <p
        class="leading-relaxed text-heading"
        :style="{ fontSize: 'var(--reading-font-size, 14px)' }"
      >
        The quick brown fox jumps over the lazy dog — your notes render in this font.
      </p>
      <pre
        class="mt-2 overflow-x-auto rounded bg-surface px-3 py-2 text-[13px] text-text"
      ><code>const note = "code blocks use your code font";</code></pre>
    </div>

    <!-- Editor width -->
    <label class="mt-5 block max-w-[240px]">
      <span class="mb-1 block text-xs font-medium text-text-muted">Editor width</span>
      <select
        :value="get('editorWidth', 'normal')"
        class="w-full rounded-input border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus-visible:outline-2 focus-visible:outline-primary"
        @change="set('editorWidth', ($event.target as HTMLSelectElement).value)"
      >
        <option value="normal">Normal (760px)</option>
        <option value="wide">Wide (920px)</option>
        <option value="wider">Wider (1100px)</option>
      </select>
    </label>
  </section>
</template>
