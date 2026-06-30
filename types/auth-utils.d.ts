// Augments nuxt-auth-utils session types.
declare module '#auth-utils' {
  interface User {
    id: string
    username: string
    email: string
    displayName: string | null
    avatarUrl: string | null
    tokenVersion: number
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface UserSession {}

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface SecureSessionData {}
}

export {}
