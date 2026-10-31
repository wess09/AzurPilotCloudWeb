import { useEffect, useState } from 'react'
import { Banner } from '@cloudflare/kumo/components/banner'
import { Empty } from '@cloudflare/kumo/components/empty'
import { Link } from '@cloudflare/kumo/components/link'
import { Pagination } from '@cloudflare/kumo/components/pagination'
import { Tabs } from '@cloudflare/kumo/components/tabs'
import { Text } from '@cloudflare/kumo/components/text'
import { templateRPC } from '../rpc'
import { readScreenshot } from '../screenshots'
import { useLoad } from '../ui'
import { formatTime } from './AnnouncementView'

type Screenshot = { sha256: string; scene: string; created_at: string; width: number; height: number; bounds: [number, number, number, number] }
const keyFor = (row: Screenshot) => `${row.sha256}:${row.bounds.join('-')}`

export function TemplateScreenshots({ identity }: { identity: string }) {
  const [offset, setOffset] = useState(0)
  const [chosen, setChosen] = useState<Screenshot | null>(null)
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const rows = useLoad(() => templateRPC.request<{ items: Screenshot[] }>('screenshots.list', { identity_id: identity, limit: 10, offset }), [identity, offset], 'templates')
  const selected = chosen ?? rows.data?.items[0]
  const sha256 = selected?.sha256

  useEffect(() => {
    const controller = new AbortController()
    let objectUrl = ''
    setUrl('')
    setError('')
    if (sha256) void readScreenshot(templateRPC, sha256, controller.signal).then(blob => {
      if (!controller.signal.aborted) { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl) }
    }).catch((reason: Error) => { if (!controller.signal.aborted) setError(reason.message) })
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [sha256])

  return (
    <section className="admin-screenshots">
      <Text as="h3" variant="heading">原始截图</Text>
      {rows.error && <Banner variant="error">{rows.error}</Banner>}
      {error && <Banner variant="error">{error}</Banner>}
      {!rows.loading && rows.data?.items.length === 0 && <Empty title="暂无原图" />}
      <Tabs
        value={selected ? keyFor(selected) : ''}
        tabs={(rows.data?.items ?? []).map((row, index) => ({ value: keyFor(row), label: `截图 ${offset + index + 1} · ${row.scene === 'commission' ? '委托' : row.scene === 'research' ? '科研' : row.scene}` }))}
        onValueChange={value => setChosen(rows.data?.items.find(row => keyFor(row) === value) ?? null)}
        labels={{ scrollStart: '向左查看更多截图', scrollEnd: '向右查看更多截图' }}
        indicatorClassName="motion-reduce:transition-none"
      />
      {selected && <>
        <Text variant="secondary">{formatTime(selected.created_at)} · {selected.width} × {selected.height}</Text>
        {!url && !error && <Text role="status">读取原图…</Text>}
        {url && <>
          <svg viewBox={`0 0 ${selected.width} ${selected.height}`} width="100%" role="img" aria-label={`${identity} 的完整奖励截图，红框标记物品位置`}>
            <image href={url} width={selected.width} height={selected.height} />
            <rect x={selected.bounds[0]} y={selected.bounds[1]} width={selected.bounds[2] - selected.bounds[0]} height={selected.bounds[3] - selected.bounds[1]} fill="none" stroke="var(--color-red-500)" strokeWidth={3} />
          </svg>
          <div className="admin-actions"><Link href={url} target="_blank" rel="noreferrer">打开原图</Link><Link href={url} download={`${identity}-${selected.sha256}.png`}>下载 PNG</Link></div>
        </>}
      </>}
      {(offset > 0 || (rows.data?.items.length ?? 0) === 10) && <Pagination page={offset / 10 + 1} perPage={10} hasNextPage={(rows.data?.items.length ?? 0) === 10} setPage={page => { setChosen(null); setOffset((page - 1) * 10) }} labels={{ previousPage: '上一页原图', nextPage: '下一页原图' }} controls="simple" />}
    </section>
  )
}
