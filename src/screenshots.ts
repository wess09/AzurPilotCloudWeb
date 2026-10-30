import type { RPCClient } from './rpc'

type Chunk = { data_base64: string; offset: number; total_size: number; media_type: string }

export async function readScreenshot(rpc: Pick<RPCClient, 'request'>, sha256: string, signal?: AbortSignal): Promise<Blob> {
  const parts: ArrayBuffer[] = []
  let offset = 0
  let total = 1
  while (offset < total) {
    signal?.throwIfAborted()
    const chunk = await rpc.request<Chunk>('screenshots.get', { sha256, offset, length: 192 * 1024 })
    if (chunk.offset !== offset || !Number.isInteger(chunk.total_size) || chunk.total_size < 1 || chunk.total_size > 4 * 1024 * 1024 || chunk.media_type !== 'image/png' || (offset > 0 && chunk.total_size !== total)) throw new Error('原图分块响应无效')
    total = chunk.total_size
    const bytes = Uint8Array.from(atob(chunk.data_base64), value => value.charCodeAt(0))
    if (!bytes.length || bytes.length > 192 * 1024 || offset + bytes.length > total) throw new Error('原图分块长度无效')
    parts.push(bytes.buffer)
    offset += bytes.length
  }
  signal?.throwIfAborted()
  const blob = new Blob(parts, { type: 'image/png' })
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  const actual = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
  if (actual !== sha256) throw new Error('原图校验失败，请重新读取')
  return blob
}
