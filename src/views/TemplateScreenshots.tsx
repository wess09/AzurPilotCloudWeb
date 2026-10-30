import { useEffect, useState } from 'react'
import { templateRPC } from '../rpc'
import { readScreenshot } from '../screenshots'
import { Card, useLoad } from '../ui'

type Screenshot = { sha256: string; scene: string; created_at: string; width: number; height: number; bounds: [number, number, number, number] }

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
  return <Card title={`原始截图 · ${identity}`}>
    {rows.error && <p role="alert" className="banner">{rows.error}</p>}
    {error && <p role="alert" className="banner">{error}</p>}
    {!rows.loading && rows.data?.items.length === 0 && <p className="muted">尚未收到原图。旧版本只上传了小图；客户端更新后，再次遇到这个未知物品时会自动补传完整截图。</p>}
    <div className="form-actions">{rows.data?.items.map((row, index) => <button key={`${row.sha256}-${row.bounds.join('-')}`} type="button" className="ghost" aria-pressed={selected === row} onClick={() => setChosen(row)}>截图 {offset + index + 1} · {row.scene === 'commission' ? '委托' : row.scene === 'research' ? '科研' : row.scene}</button>)}</div>
    {selected && <>
      <p className="muted">上传时间：{new Date(selected.created_at).toLocaleString()} · 完整分辨率 {selected.width}×{selected.height} · 红框标出当前物品。</p>
      {!url && !error && <p role="status">正在通过模板管理连接读取原图…</p>}
      {url && <>
        <svg viewBox={`0 0 ${selected.width} ${selected.height}`} width="100%" role="img" aria-label={`${identity} 的完整奖励截图，红框标记物品位置`}>
          <image href={url} width={selected.width} height={selected.height} />
          <rect x={selected.bounds[0]} y={selected.bounds[1]} width={selected.bounds[2] - selected.bounds[0]} height={selected.bounds[3] - selected.bounds[1]} fill="none" stroke="#ff3b30" strokeWidth={3} />
        </svg>
        <p><a href={url} target="_blank" rel="noreferrer">打开完整原图</a> · <a href={url} download={`${identity}-${selected.sha256}.png`}>下载 PNG 原图</a></p>
      </>}
    </>}
    <div className="form-actions"><button type="button" className="ghost" disabled={!offset} onClick={() => { setChosen(null); setOffset(value => Math.max(0, value - 10)) }}>上一页原图</button><span className="muted">第 {offset / 10 + 1} 页</span><button type="button" className="ghost" disabled={(rows.data?.items.length ?? 0) < 10} onClick={() => { setChosen(null); setOffset(value => value + 10) }}>下一页原图</button></div>
  </Card>
}
