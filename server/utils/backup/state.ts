// In-process single-job guard. Nitro runs one Node process, so a module-level flag is enough to
// serialise backup/restore (manual + scheduled) and to surface progress to the status endpoint.
export type Job = { kind: 'backup' | 'restore'; startedAt: number; message: string }

let current: Job | null = null

export function currentJob(): Job | null {
  return current
}

// Claim the slot; returns false if a job is already running.
export function startJob(kind: Job['kind'], message: string): boolean {
  if (current) return false
  current = { kind, startedAt: Date.now(), message }
  return true
}

export function setJobMessage(message: string): void {
  if (current) current.message = message
}

export function endJob(): void {
  current = null
}
