export default defineNuxtPlugin((nuxt) => {
  nuxt.vueApp.directive('focus', {
    mounted: (el: HTMLElement) => el.focus(),
  })
})
