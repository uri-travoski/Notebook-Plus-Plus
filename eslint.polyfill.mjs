// Node 20 lacks Object.groupBy (added in Node 21). eslint-flat-config-utils
// (pulled in by @nuxt/eslint) calls it during config resolution. Polyfill it
// before the flat config is built. Imported first in eslint.config.mjs.
if (typeof Object.groupBy !== 'function') {
  Object.defineProperty(Object, 'groupBy', {
    value(items, keyFn) {
      const out = Object.create(null)
      let i = 0
      for (const item of items) {
        const key = keyFn(item, i++)
        ;(out[key] ??= []).push(item)
      }
      return out
    },
    writable: true,
    configurable: true,
  })
}
