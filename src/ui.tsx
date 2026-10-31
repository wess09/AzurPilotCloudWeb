import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Badge } from '@cloudflare/kumo/components/badge'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import { Text } from '@cloudflare/kumo/components/text'

// 带加载与错误状态的通用数据拉取钩子。
export function useLoad<T>(loader: () => Promise<T>, deps: unknown[], source: 'main' | 'templates' = 'main'): {
  data: T | null
  error: string | null
  loading: boolean
  reload: () => void
} {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const changed = () => setTick(value => value + 1)
    window.addEventListener(`ap:${source}-state`, changed)
    return () => window.removeEventListener(`ap:${source}-state`, changed)
  }, [source])

  useEffect(() => {
    let alive = true
    setLoading(true)
    loader()
      .then((d) => {
        if (alive) {
          setData(d)
          setError(null)
        }
      })
      .catch((e: Error) => {
        if (alive) setError(e.message)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  return { data, error, loading, reload: () => setTick((t) => t + 1) }
}

export { Logo } from './components/Logo'

// 一次性的操作状态提示。
export function useAction(): {
  running: boolean
  message: { kind: 'ok' | 'err'; text: string } | null
  run: (fn: () => Promise<string>) => Promise<void>
} {
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const run = async (fn: () => Promise<string>) => {
    setRunning(true)
    setMessage(null)
    try {
      const text = await fn()
      setMessage({ kind: 'ok', text })
    } catch (e) {
      setMessage({ kind: 'err', text: (e as Error).message })
    } finally {
      setRunning(false)
    }
  }
  return { running, message, run }
}

// 发布结果渲染：区分「已发布并确认 / 仅本地生成 / 失败」。
export function PublishBadge({ publish }: { publish: { success: boolean; skipped: boolean; error: string } | null | undefined }) {
  if (!publish) return null
  if (publish.error) {
    return <Badge variant="error">发布失败：{publish.error}</Badge>
  }
  if (publish.skipped) {
    return <Badge variant="warning">仅本地生成</Badge>
  }
  return <Badge variant={publish.success ? 'success' : 'error'}>{publish.success ? '已发布' : '未发布'}</Badge>
}

export function Card({ title, children, extra }: { title: string; children: ReactNode; extra?: ReactNode }) {
  return (
    <LayerCard className="admin-card">
      <LayerCard.Secondary className="admin-card-heading">
        <Text as="h2" variant="heading">{title}</Text>
        {extra}
      </LayerCard.Secondary>
      <LayerCard.Primary className="admin-card-body">{children}</LayerCard.Primary>
    </LayerCard>
  )
}
