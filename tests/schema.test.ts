import { describe, it, expect } from 'vitest'
import * as schema from '../server/db/schema'

describe('db schema', () => {
  it('exports all core tables', () => {
    const tables = [
      'users',
      'passwordResetTokens',
      'notebooks',
      'documents',
      'documentVersions',
      'databases',
      'databaseRows',
      'attachments',
      'aiKeys',
      'backupSettings',
      'backupHistory',
    ]
    for (const t of tables) {
      expect(schema, `missing table: ${t}`).toHaveProperty(t)
    }
  })

  it('defines the doc_type and ai_provider enums', () => {
    expect(schema.docType.enumValues).toEqual(['page', 'canvas'])
    expect(schema.aiProvider.enumValues).toEqual([
      'anthropic',
      'openai',
      'google',
      'openrouter',
      'groq',
    ])
  })
})
