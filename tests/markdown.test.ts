import { describe, it, expect } from 'vitest'
import { blocksToMarkdown, markdownToBlocks, documentToMarkdown } from '../server/utils/markdown'

describe('markdown', () => {
  it('round-trips standard content through blocks and back', async () => {
    const md = '# Title\n\n## Section\n\nHello **bold** text.\n\n- one\n- two\n'
    const blocks = await markdownToBlocks(md)
    expect(blocks.length).toBeGreaterThan(0)
    const back = await blocksToMarkdown(blocks)
    expect(back).toContain('# Title')
    expect(back).toContain('## Section')
    expect(back).toContain('**bold**')
    expect(back).toMatch(/[-*] one/)
    expect(back).toMatch(/[-*] two/)
  })

  it('degrades a callout block to a labelled blockquote', async () => {
    const blocks = [
      {
        type: 'callout',
        props: { kind: 'warning' },
        content: [{ type: 'text', text: 'Heads up', styles: {} }],
      },
    ]
    const md = await blocksToMarkdown(blocks)
    expect(md).toContain('>')
    expect(md).toContain('warning')
    expect(md).toContain('Heads up')
  })

  it('serialises a canvas document to a stub', async () => {
    const md = await documentToMarkdown({ title: 'Board', type: 'canvas', content: {} })
    expect(md).toContain('# Board')
    expect(md).toContain('Canvas document')
  })
})
