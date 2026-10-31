import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'

test('public controls are composed from the component library', async () => {
  const names = await readdir(
    new URL('../src/components/statistics/', import.meta.url)
  )
  const paths = [
    'src/views/PublicStatistics.tsx',
    'src/views/Methodology.tsx',
    ...names.map((name) => `src/components/statistics/${name}`),
    'stats/app/methodology/page.tsx'
  ]
  const nativeControls = new Set([
    'button',
    'input',
    'select',
    'textarea',
    'dialog',
    'a'
  ])
  for (const path of paths) {
    const source = await readFile(
      new URL('../' + path, import.meta.url),
      'utf8'
    )
    const syntax = ts.createSourceFile(
      path,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    )
    const visit = (node) => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node))
        assert.equal(
          nativeControls.has(node.tagName.getText(syntax)),
          false,
          `${path}: native ${node.tagName.getText(syntax)}`
        )
      ts.forEachChild(node, visit)
    }
    visit(syntax)
  }
})
