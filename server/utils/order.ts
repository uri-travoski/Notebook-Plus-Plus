import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing'

export { generateKeyBetween, generateNKeysBetween }

/** Position key for appending after the current last sibling (or first if none). */
export function keyAfter(last: string | null): string {
  return generateKeyBetween(last, null)
}

/** Position key for prepending before the current first sibling. */
export function keyBefore(first: string | null): string {
  return generateKeyBetween(null, first)
}
