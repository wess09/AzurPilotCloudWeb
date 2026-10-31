import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test, beforeEach } from 'node:test'
import ts from 'typescript'

const source = await readFile(new URL('../src/rpc.ts', import.meta.url), 'utf8')
const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText
const { RPCClient, setToken, getToken } = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`)
const flush = () => new Promise(resolve => setImmediate(resolve))

class Socket {
  static OPEN = 1
  static instances = []
  static state = { revision: 1 }
  readyState = 0
  sent = []
  constructor(url) {
    this.url = url
    Socket.instances.push(this)
    queueMicrotask(() => { if (this.readyState === 0) { this.readyState = 1; this.onopen?.() } })
  }
  receive(message) { this.onmessage?.({ data: JSON.stringify(message) }) }
  send(text) {
    const message = JSON.parse(text)
    this.sent.push(message)
    if (message.type === 'auth') queueMicrotask(() => this.receive({ type: 'authenticated' }))
    if (message.method === 'state.subscribe') queueMicrotask(() => this.receive({ type: 'result', id: message.id, data: Socket.state }))
  }
  close() {
    if (this.readyState === 3) return
    this.readyState = 3
    this.onclose?.()
  }
}

beforeEach(() => {
  Socket.instances = []
  Socket.state = { revision: 1 }
  const values = new Map()
  globalThis.localStorage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
  globalThis.window = new EventTarget()
  globalThis.WebSocket = Socket
  setToken('test-management-token')
})

test('authenticates in a frame, shares one subscription, and applies state pushes', async () => {
  const client = new RPCClient('wss://templates-api.azurpilot.com/internal/v1/templates/ws', 'templates')
  let changes = 0
  window.addEventListener('ap:templates-state', () => changes++)
  try {
    const [first, second] = await Promise.all([client.state(), client.state()])
    assert.equal(first, second)
    const socket = Socket.instances[0]
    assert.equal(Socket.instances.length, 1)
    assert.equal(socket.url.includes('test-management-token'), false)
    assert.deepEqual(socket.sent[0], { type: 'auth', token: 'test-management-token' })
    assert.equal(socket.sent.filter(message => message.method === 'state.subscribe').length, 1)
    socket.receive({ type: 'event', topic: 'state', data: { revision: 2 } })
    assert.deepEqual(await client.state(), { revision: 2 })
    assert.equal(changes, 2)
  } finally { client.close() }
})

test('correlates out-of-order responses and preserves structured command errors', async () => {
  const client = new RPCClient('wss://api.azurpilot.com/api/v1/admin/ws', 'main')
  try {
    await client.state()
    const first = client.request('announcement.get')
    const second = client.request('maintenance.list')
    await flush()
    const socket = Socket.instances[0]
    const commands = socket.sent.slice(-2)
    socket.receive({ type: 'result', id: commands[1].id, data: ['cn'] })
    socket.receive({ type: 'result', id: commands[0].id, data: { title: 'notice' } })
    assert.deepEqual(await first, { title: 'notice' })
    assert.deepEqual(await second, ['cn'])
    const failed = client.request('mappings.save', {})
    const rejected = assert.rejects(failed, error => error.status === 422 && error.code === 'VALIDATION_ERROR')
    await flush()
    socket.receive({ type: 'error', id: socket.sent.at(-1).id, error: { status: 422, code: 'VALIDATION_ERROR', message: 'Invalid mapping' } })
    await rejected
  } finally { client.close() }
})

test('reconnects and refreshes subscribers without replaying interrupted writes', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const client = new RPCClient('wss://api.azurpilot.com/api/v1/admin/ws', 'main')
  let changes = 0
  window.addEventListener('ap:main-state', () => changes++)
  try {
    await client.state()
    const mutation = client.request('announcement.publish', { title: 'publish once' })
    const rejected = assert.rejects(mutation, error => error.code === 'DISCONNECTED')
    await flush()
    Socket.instances[0].close()
    await rejected
    Socket.state = { revision: 9 }
    t.mock.timers.tick(1000)
    await flush()
    assert.equal(Socket.instances.length, 2)
    assert.deepEqual(await client.state(), { revision: 9 })
    assert.equal(Socket.instances[1].sent.some(message => message.method === 'announcement.publish'), false)
    assert.equal(changes, 2)
  } finally { client.close() }
})

test('logout rejects in-flight work and cancels scheduled reconnects', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const client = new RPCClient('wss://api.azurpilot.com/api/v1/admin/ws', 'main')
  await client.state()
  const request = client.request('publish')
  const rejected = assert.rejects(request, error => error.code === 'DISCONNECTED')
  await flush()
  Socket.instances[0].close()
  client.close()
  await rejected
  t.mock.timers.tick(30000)
  await flush()
  assert.equal(Socket.instances.length, 1)
  assert.equal(getToken(), 'test-management-token')
})

test('management source has no HTTP client or polling and public HTTP is isolated', async () => {
  assert.equal(/\bfetch\s*\(|XMLHttpRequest|setInterval\s*\(/.test(source), false)
  const api = await readFile(new URL('../src/api.ts', import.meta.url), 'utf8')
  assert.equal(/\bfetch\s*\(/.test(api), false)
  const statistics = await readFile(new URL('../src/views/PublicStatistics.tsx', import.meta.url), 'utf8')
  assert.match(statistics, /https:\/\/api\.azurpilot\.com/)
  assert.match(statistics, /\/api\/v3\/get\/analysis/)
  assert.match(statistics, /credentials: 'omit'/)
  assert.equal(/getToken|mainRPC|templateRPC|\/api\/v2\//.test(statistics), false)
})
