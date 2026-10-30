import { useEffect, useState } from 'react'
import { Logo } from '../ui'
import './PublicStatistics.css'

type Item = { item: string; tag: string; amount: number; occurrences: number; drop_rate: number; average_per_sample: number; amount_per_hour: number | null }
type Group = { comm?: string; name?: string; status?: number; series?: number; project?: string; samples: number; items: Item[] }
type Summary = { from: string; to: string; groups: Group[] }
const number = (value: number) => value.toLocaleString('zh-CN', { maximumFractionDigits: 3 })

export function PublicStatistics() {
  const [scene, setScene] = useState('commission')
  const [server, setServer] = useState('')
  const [days, setDays] = useState(30)
  const [filter, setFilter] = useState('')
  const [series, setSeries] = useState('')
  const [status, setStatus] = useState('')
  const [query, setQuery] = useState({ scene: 'commission', values: new URLSearchParams({ timezone: 'Asia/Shanghai' }).toString() })
  const [summary, setSummary] = useState<Summary | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    void fetch(`https://api.azurpilot.com/api/v3/get/${query.scene}?${query.values}`, { signal: controller.signal, credentials: 'omit' })
      .then(async response => { const value = await response.json(); if (!response.ok) throw new Error(value.error?.message ?? `查询失败 ${response.status}`); return value as Summary })
      .then(value => { setSummary(value); setError('') })
      .catch((reason: Error) => { if (!controller.signal.aborted) setError(reason.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [query])
  const search = () => {
    const to = new Date()
    const from = new Date(to.getTime() - days * 86400000)
    const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString(), timezone: 'Asia/Shanghai' })
    if (server) params.set('server', server)
    if (filter.trim()) params.set(scene === 'commission' ? 'comm' : 'project', filter.trim())
    if (scene === 'research' && series) params.set('series', series)
    if (scene === 'commission' && status) params.set('status', status)
    setQuery({ scene, values: params.toString() })
  }
  return <div className="public-page">
    <header className="public-header"><a href="https://azurpilot.com"><Logo /><strong>AzurPilot 统计</strong></a><a href="https://admin.azurpilot.com">管理后台</a></header>
    <main className="public-main">
      <section className="public-card"><h1>委托与科研统计</h1><p>客户端上报结构化收益，按已发布物品映射统计。</p>
        <form className="form-actions" onSubmit={event => { event.preventDefault(); search() }}>
          <label>统计类型<select value={scene} onChange={event => { setScene(event.target.value); setFilter('') }}><option value="commission">委托</option><option value="research">科研</option></select></label>
          <label>区服<select value={server} onChange={event => setServer(event.target.value)}><option value="">全部区服</option>{['cn', 'cn_ios', 'cn_channel', 'en', 'jp', 'tw'].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
          <label>最近天数<input type="number" min={1} max={366} required value={days} onChange={event => setDays(Number(event.target.value))} /></label>
          <label>{scene === 'commission' ? '委托标识' : '科研项目'}<input value={filter} onChange={event => setFilter(event.target.value)} /></label>
          {scene === 'research' ? <label>期数<input type="number" min={1} max={100} value={series} onChange={event => setSeries(event.target.value)} /></label> : <label>完成状态<select value={status} onChange={event => setStatus(event.target.value)}><option value="">全部</option><option value="0">完成</option><option value="1">大成功</option></select></label>}
          <button disabled={loading}>查询</button>
        </form>
      </section>
      {error && <p role="alert" className="banner">{error}</p>}
      {loading && <p role="status">正在查询…</p>}
      {summary && <p className="public-note">范围：{new Date(summary.from).toLocaleString()} — {new Date(summary.to).toLocaleString()}</p>}
      {summary?.groups.map((group, index) => <section className="public-card" key={index}>
        <h2>{query.scene === 'commission' ? `${group.name || group.comm} · ${group.status === 1 ? '大成功' : '完成'}` : `${group.series} 期 · ${group.project}`}</h2>
        <p>有效样本 {number(group.samples)}</p>
        <div className="table-wrap"><table><thead><tr><th>物品</th><th>标签</th><th>总数量</th><th>出现次数</th><th>出现率</th><th>每样本平均</th><th>每小时数量</th></tr></thead><tbody>{group.items.map((item, row) => <tr key={row}><td>{item.item}</td><td>{item.tag || '—'}</td><td>{number(item.amount)}</td><td>{number(item.occurrences)}</td><td>{number(item.drop_rate * 100)}%</td><td>{number(item.average_per_sample)}</td><td>{item.amount_per_hour === null ? '—' : number(item.amount_per_hour)}</td></tr>)}</tbody></table></div>
      </section>)}
      {!loading && summary?.groups.length === 0 && <section className="public-card"><p>当前条件下暂无可展示的统计。</p><p>委托统计需要超过 50 个样本；未映射物品会保留原始记录，发布正式映射后重新统计。</p></section>}
    </main>
  </div>
}
