<script setup lang="ts">
const model = defineModel<string>()
withDefaults(
  defineProps<{
    id?: string
    type?: string
    placeholder?: string
    autocomplete?: string
    required?: boolean
    invalid?: boolean
  }>(),
  { type: 'text' },
)
</script>

<template>
  <input
    :id="id"
    v-model="model"
    :type="type"
    :placeholder="placeholder"
    :autocomplete="autocomplete"
    :required="required"
    :aria-invalid="invalid || undefined"
    class="w-full rounded-input border bg-surface px-3 py-2 text-sm text-text transition-colors placeholder:text-text-muted focus:border-primary focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primary"
    :class="invalid ? 'border-danger' : 'border-border'"
  />
</template>
