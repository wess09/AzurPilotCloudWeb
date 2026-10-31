import { isAdminPreview } from './preview-mode'

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message) }
  get isAuthError(): boolean { return this.status === 401 }
}

const TOKEN_KEY = 'ap_admin_token'
let authErrorHandler: (() => void) | null = null
export const getToken = () => localStorage.getItem(TOKEN_KEY) ?? ''
export const setToken = (token: string) => { localStorage.setItem(TOKEN_KEY, token) }
export const setAuthErrorHandler = (handler: () => void) => { authErrorHandler = handler }

type Pending = { resolve: (value: unknown) => void; reject: (reason: Error) => void; timer: ReturnType<typeof setTimeout> }
type Envelope = { type: string; id?: string; data?: unknown; error?: { status?: number; code?: string; message?: string } }

export class RPCClient {
  private socket: WebSocket | null = null
  private connecting: Promise<void> | null = null
  private authenticated = false
  private stopped = false
  private retry = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private pending = new Map<string, Pending>()
  private serial = 0
  private snapshot: unknown = undefined
  private subscription: Promise<unknown> | null = null

  constructor(private url: string, readonly source: 'main' | 'templates') {}

  close() {
    this.stopped = true
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    const socket = this.socket
    this.socket = null
    this.authenticated = false
    this.connecting = null
    socket?.close()
    for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(new ApiError(0, 'DISCONNECTED', '管理连接已关闭')) }
    this.pending.clear()
    this.snapshot = undefined
    this.subscription = null
  }

  private changed() { window.dispatchEvent(new Event(`ap:${this.source}-state`)) }

  private connect(): Promise<void> {
    if (this.authenticated && this.socket?.readyState === WebSocket.OPEN) return Promise.resolve()
    if (this.connecting) return this.connecting
    const token = getToken()
    if (!token) return Promise.reject(new ApiError(401, 'UNAUTHORIZED', '请先登录'))
    this.stopped = false
    const socket = new WebSocket(this.url)
    this.socket = socket
    this.connecting = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => { reject(new ApiError(0, 'TIMEOUT', '管理连接超时')); socket.close() }, 10000)
      socket.onopen = () => socket.send(JSON.stringify({ type: 'auth', token }))
      socket.onmessage = event => {
        if (this.socket !== socket) return
        let message: Envelope
        try { message = JSON.parse(String(event.data)) as Envelope } catch { socket.close(); return }
        if (message.type === 'authenticated') {
          clearTimeout(timeout)
          this.authenticated = true
          this.retry = 0
          resolve()
          return
        }
        if (message.type === 'event') { this.snapshot = message.data; this.changed(); return }
        if (message.type === 'error') {
          const error = new ApiError(message.error?.status ?? 500, message.error?.code ?? 'INTERNAL', message.error?.message ?? '操作失败')
          if (!message.id) {
            clearTimeout(timeout)
            reject(error)
            if (error.status === 401) { localStorage.removeItem(TOKEN_KEY); authErrorHandler?.() }
          } else {
            const pending = this.pending.get(message.id)
            if (pending) { clearTimeout(pending.timer); pending.reject(error); this.pending.delete(message.id) }
          }
          return
        }
        if (message.id) {
          const pending = this.pending.get(message.id)
          if (pending) { clearTimeout(pending.timer); pending.resolve(message.data); this.pending.delete(message.id) }
        }
      }
      socket.onerror = () => { clearTimeout(timeout); reject(new ApiError(0, 'NETWORK', `${this.source === 'templates' ? '模板服务' : '主服务'}连接失败`)) }
      socket.onclose = () => {
        clearTimeout(timeout)
        reject(new ApiError(0, 'DISCONNECTED', '管理连接已断开'))
        if (this.socket !== socket) return
        this.socket = null
        this.connecting = null
        this.authenticated = false
        this.snapshot = undefined
        this.subscription = null
        for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(new ApiError(0, 'DISCONNECTED', '连接中断，请重新连接后核对操作结果')) }
        this.pending.clear()
        if (!this.stopped && getToken()) {
          const delay = Math.min(30000, 1000 * 2 ** Math.min(this.retry++, 5))
          this.reconnectTimer = setTimeout(() => { void this.state().catch(() => undefined) }, delay)
        }
      }
    })
    return this.connecting
  }

  async request<T>(method: string, params: unknown = {}): Promise<T> {
    if (process.env.NODE_ENV === 'development' && isAdminPreview()) {
      const { previewRequest } = await import('./preview/admin-data')
      return await previewRequest(this.source, method, params) as T
    }
    await this.connect()
    const socket = this.socket
    if (!socket || !this.authenticated) throw new ApiError(0, 'DISCONNECTED', '管理连接已断开')
    const id = String(++this.serial)
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new ApiError(0, 'TIMEOUT', '操作超时，请核对服务端状态')) }, 105000)
      this.pending.set(id, { resolve: value => resolve(value as T), reject, timer })
      socket.send(JSON.stringify({ id, method, params }))
    })
  }

  async state<T>(): Promise<T> {
    if (process.env.NODE_ENV === 'development' && isAdminPreview()) return this.request<T>('state.subscribe')
    if (this.snapshot !== undefined) return this.snapshot as T
    if (!this.subscription) this.subscription = this.request<unknown>('state.subscribe').then(value => { this.snapshot = value; this.changed(); return value }).catch(error => { this.subscription = null; throw error })
    return await this.subscription as T
  }
}

export const mainRPC = new RPCClient('wss://api.azurpilot.com/api/v1/admin/ws', 'main')
export const templateRPC = new RPCClient('wss://templates-api.azurpilot.com/internal/v1/templates/ws', 'templates')
export function clearToken() { localStorage.removeItem(TOKEN_KEY); mainRPC.close(); templateRPC.close() }
