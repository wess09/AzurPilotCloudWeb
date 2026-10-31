'use client'

import { useEffect, useState } from 'react'
import { Button } from '@cloudflare/kumo/components/button'
import { Empty } from '@cloudflare/kumo/components/empty'
import { Select } from '@cloudflare/kumo/components/select'
import { Surface } from '@cloudflare/kumo/components/surface'
import { Table } from '@cloudflare/kumo/components/table'
import { Text } from '@cloudflare/kumo/components/text'
import { ArrowClockwise } from '@phosphor-icons/react'
import { Metric } from '../components/statistics/Metric'
import { Cl1Chart } from '../components/statistics/Cl1Chart'
import { cl1StatisticsSchema, shanghaiMonth, type Cl1Metrics, type Cl1Statistics as Statistics } from '../cl1-statistics'

const API = process.env.NEXT_PUBLIC_STATS_API_BASE || 'https://api.azurpilot.com'
const number = (value: number | undefined, digits = 0) => value === undefined ? '—' : value.toLocaleString('zh-CN', { maximumFractionDigits: digits })
const percent = (value: number | undefined) => number(value === undefined ? undefined : value * 100, 2)

const columns: { title: string; key: keyof Cl1Metrics; unit?: string; ratio?: boolean; digits?: number }[] = [
  { title: '上报设备', key: 'devices', unit: '台' },
  { title: '战斗次数', key: 'battle_count', unit: '场' },
  { title: '出击轮数', key: 'battle_rounds', unit: '轮' },
  { title: '明石遭遇次数', key: 'akashi_encounters', unit: '次' },
  { title: '明石遭遇率', key: 'akashi_probability', ratio: true },
  { title: '平均每次购买', key: 'average_ap', unit: '点/次', digits: 2 },
  { title: '购买行动力', key: 'akashi_ap', unit: '点' },
  { title: '行动力消耗', key: 'ap_cost', unit: '点' },
  { title: '行动力净收益', key: 'net_ap', unit: '点' },
  { title: '循环效率', key: 'cycle_efficiency', ratio: true }
]

function metricValue(metrics: Cl1Metrics | undefined, column: typeof columns[number]) {
  if (!metrics) return '—'
  if ((column.key === 'akashi_probability' || column.key === 'cycle_efficiency') && !metrics.battle_rounds) return '—'
  if (column.key === 'average_ap' && !metrics.akashi_encounters) return '—'
  return column.ratio ? percent(metrics[column.key]) : number(metrics[column.key], column.digits)
}

export function Cl1Statistics() {
  const [data, setData] = useState<Statistics | null>(null)
  const [scope, setScope] = useState('total')
  const [month, setMonth] = useState('')
  const [tick, setTick] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setMonth(shanghaiMonth())
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        setMonth(shanghaiMonth())
        setTick(value => value + 1)
      }
    }, 30000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    let alive = true
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000)
    setLoading(true)
    setError('')
    void fetch(`${API}/api/v3/get/cl1`, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('侵蚀 1 统计读取失败')
      const body = cl1StatisticsSchema.parse(await response.json())
      if (alive) setData(body.result)
    }).catch(() => {
      if (alive) setError('侵蚀 1 统计读取失败')
    }).finally(() => {
      clearTimeout(timer)
      if (alive) setLoading(false)
    })
    return () => { alive = false; clearTimeout(timer); controller.abort() }
  }, [tick])

  const selectedMonth = scope === 'current' ? month : scope
  const metrics = scope === 'total' ? data?.total : data?.history.find(row => row.month === selectedMonth)
  const items = [
    { value: 'total', label: '累计' },
    { value: 'current', label: '本月' },
    ...(data?.history ?? []).filter(row => row.month !== month).map(row => ({ value: row.month, label: row.month }))
  ]
  const updated = data?.updated_at ? new Date(data.updated_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : ''

  return <>
    <div className="page-heading">
      <Text as="h1" variant="heading" size="lg">侵蚀 1</Text>
      <Button variant="secondary" disabled={loading} onClick={() => setTick(value => value + 1)}><ArrowClockwise size={16} />刷新</Button>
    </div>
    <div className="table-toolbar">
      <Select aria-label="统计月份" value={scope} items={items} onValueChange={value => setScope(value ?? 'total')} />
      <Text variant="secondary" role="status">{loading ? '加载中…' : error || (updated ? `数据更新 ${updated}` : '')}</Text>
    </div>
    <div className="metric-grid" aria-label="侵蚀 1 概览" aria-busy={loading}>
      {columns.map(column => <Metric key={column.key} title={column.title} value={metricValue(metrics, column)} suffix={column.ratio ? '%' : column.unit ?? ''} />)}
    </div>
    {!loading && !error && (!data?.history.length || (scope !== 'total' && !metrics)) && <Empty size="sm" title={scope === 'current' ? '本月暂无上报数据' : '暂无上报数据'} />}
    {!!data?.history.length && <>
      <Surface className="chart-panel">
        <div className="section-heading"><Text as="h2" variant="heading">行动力月度收益</Text></div>
        <Cl1Chart history={data.history} />
      </Surface>
      <Surface className="data-panel">
        <div className="table-toolbar"><Text as="h2" variant="heading">月度明细</Text></div>
        <div className="table-scroll"><Table>
          <Table.Header><Table.Row><Table.Head>月份</Table.Head>{columns.map(column => <Table.Head key={column.key} className="numeric-cell">{column.title}{column.ratio ? '（%）' : column.unit ? `（${column.unit}）` : ''}</Table.Head>)}</Table.Row></Table.Header>
          <Table.Body>{data.history.map(row => <Table.Row key={row.month}><Table.Cell>{row.month}</Table.Cell>{columns.map(column => <Table.Cell key={column.key} className="numeric-cell">{metricValue(row, column)}</Table.Cell>)}</Table.Row>)}</Table.Body>
        </Table></div>
      </Surface>
    </>}
  </>
}
