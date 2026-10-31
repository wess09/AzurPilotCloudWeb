import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { createHash, webcrypto } from 'node:crypto'
import ts from 'typescript'

globalThis.crypto ??= webcrypto
const source = await readFile(new URL('../src/screenshots.ts', import.meta.url), 'utf8')
const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText
const { readScreenshot } = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`)

test('reassembles original image through template WS chunks and verifies every byte', async () => {
  const png = Buffer.alloc(500000, 70)
  const sha256 = createHash('sha256').update(png).digest('hex')
  const calls = []
  const rpc = { request: async (method, params) => {
    calls.push([method, params])
    return { offset: params.offset, total_size: png.length, media_type: 'image/png', data_base64: png.subarray(params.offset, params.offset + params.length).toString('base64') }
  } }
  const blob = await readScreenshot(rpc, sha256)
  assert.deepEqual(Buffer.from(await blob.arrayBuffer()), png)
  assert.equal(calls.length, 3)
  assert.ok(calls.every(([method]) => method === 'screenshots.get'))
})

test('rejects invalid or corrupted chunks and stops loading after cancellation', async () => {
  const rpc = { request: async () => ({ offset: 0, total_size: 1, media_type: 'image/png', data_base64: 'eA==' }) }
  await assert.rejects(readScreenshot(rpc, '0'.repeat(64)), /校验失败/)
  rpc.request = async () => ({ offset: 5, total_size: 1, media_type: 'image/png', data_base64: 'eA==' })
  await assert.rejects(readScreenshot(rpc, '0'.repeat(64)), /响应无效/)
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(readScreenshot(rpc, '0'.repeat(64), controller.signal), { name: 'AbortError' })
})

test('admin CSP permits private blob image previews and keeps backend connections on WS', async () => {
  const headers = await readFile(new URL('../admin/public/_headers', import.meta.url), 'utf8')
  assert.match(headers, /img-src[^;]*blob:/)
  assert.match(headers, /connect-src 'self' wss:\/\/api\.azurpilot\.com wss:\/\/templates-api\.azurpilot\.com;/)
})
