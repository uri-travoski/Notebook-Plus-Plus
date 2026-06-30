// Page-level guard. Unauthenticated users are sent to /login; authenticated users
// are kept out of the auth pages.
const PUBLIC_PAGES = ['/login', '/register', '/forgot']

export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useUserSession()
  const isPublic = PUBLIC_PAGES.includes(to.path) || to.path.startsWith('/reset/')

  if (!loggedIn.value && !isPublic) {
    return navigateTo('/login')
  }
  if (loggedIn.value && isPublic) {
    return navigateTo('/')
  }
})
