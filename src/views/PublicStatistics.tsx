'use client'

/* Hierarchy: primary = target resource and efficiency; secondary = filters and
   sample evidence; tertiary = methodology. One primary action: choose resource.
   Kumo tokens, 4px spacing scale, 12/14/16/20/28 type scale, 6px corners.
   Grayscale hierarchy is established before adding the orange selection accent. */
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { StatisticsShell } from '../components/statistics/StatisticsShell'
import { ProjectDetail } from '../components/statistics/ProjectDetail'
import { Metric } from '../components/statistics/Metric'
import { Button } from '@cloudflare/kumo/components/button'
import {
  Flask,
  Compass,
  ChartBar,
  ArrowUpRight,
  CaretRight,
  CaretDown,
  MagnifyingGlass,
  DownloadSimple,
  ArrowClockwise,
  Info,
  Stack,
  Cube,
  Coins,
  Drop,
  Lightning,
  List,
  ArrowDown,
  ArrowUp,
  Funnel,
  Database,
  Check,
  Trophy,
  Clock
} from '@phosphor-icons/react'
import {
  analysisSchema,
  categoryName,
  CATALOG,
  csvExport,
  durationName,
  format,
  sortGroups,
  targetsFor,
  type Analysis,
  type Group,
  type Scene,
  type SortKey
} from '../statistics'

type Filters = {
  target: string
  server: string
  days: string
  series: string
  category: string
  duration: string
  group_by: string
  start: string
  end: string
}
const defaults = (scene: Scene): Filters => ({
  target: scene === 'research' ? 'category:blueprint-rainbow' : 'category:cube',
  server: '',
  days: '30',
  series: '',
  category: '',
  duration: '',
  group_by: 'project',
  start: '',
  end: ''
})
const iconFor = (id: string) =>
  id.startsWith('blueprint') || id.startsWith('gear')
    ? Stack
    : id === 'coins'
      ? Coins
      : id === 'oil'
        ? Drop
        : id === 'cube'
          ? Cube
          : Lightning
const API =
  process.env.NEXT_PUBLIC_STATS_API_BASE || 'https://api.azurpilot.com'

export function PublicStatistics({ scene }: { scene: Scene }) {
  const [filters, setFilters] = useState<Filters>(() => defaults(scene))
  const [ready, setReady] = useState(false)
  const [response, setResponse] = useState<Analysis | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const [updated, setUpdated] = useState('')
  const [mode, setMode] = useState<'category' | 'item'>('category')
  const [search, setSearch] = useState('')
  const [picker, setPicker] = useState(false)
  const [sort, setSort] = useState<SortKey>('per_hour')
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc')
  const [view, setView] = useState<'table' | 'ranking'>('table')
  const [page, setPage] = useState(0)
  const [detail, setDetail] = useState<Group | null>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const targets = useMemo(() => targetsFor(scene), [scene])
  const update = (key: keyof Filters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }))
    setPage(0)
    setDetail(null)
  }
  useEffect(() => {
    const read = () => {
      const params = new URLSearchParams(window.location.search),
        next = defaults(scene)
      for (const key of Object.keys(next) as (keyof Filters)[])
        if (params.has(key)) next[key] = params.get(key)!
      if (
        !targets.categories.some((c) => `category:${c.id}` === next.target) &&
        !targets.items.some((i) => `item:${i.id}` === next.target)
      )
        next.target = defaults(scene).target
      if (!['7', '30', '90', '366', 'custom'].includes(next.days))
        next.days = '30'
      if (
        ![
          'project',
          'category',
          'duration',
          ...(scene === 'research' ? ['series'] : [])
        ].includes(next.group_by)
      )
        next.group_by = 'project'
      setFilters(next)
      setMode(next.target.startsWith('item:') ? 'item' : 'category')
      setReady(true)
    }
    read()
    window.addEventListener('popstate', read)
    return () => window.removeEventListener('popstate', read)
  }, [scene, targets])
  const rangeError =
    filters.days === 'custom' &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(filters.start) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(filters.end) ||
      !Number.isFinite(Date.parse(filters.start)) ||
      !Number.isFinite(Date.parse(filters.end)) ||
      filters.end < filters.start ||
      (Date.parse(filters.end) - Date.parse(filters.start)) / 86400000 >= 366)
      ? '请选择有效的起止日期，范围最多 366 天。'
      : ''
  useEffect(() => {
    if (!ready) return
    if (rangeError) {
      setResponse(null)
      setLoading(false)
      return
    }
    const controller = new AbortController(),
      timeout = setTimeout(() => controller.abort('timeout'), 25000)
    const params = new URLSearchParams({
      scene,
      target: filters.target,
      group_by: filters.group_by,
      timezone: 'Asia/Shanghai'
    })
    let to = new Date(),
      from: Date
    if (filters.days === 'custom') {
      from = new Date(`${filters.start}T00:00:00+08:00`)
      to = new Date(
        new Date(`${filters.end}T00:00:00+08:00`).getTime() + 86400000
      )
    } else from = new Date(to.getTime() - Number(filters.days) * 86400000)
    params.set('from', from.toISOString())
    params.set('to', to.toISOString())
    for (const key of ['server', 'series', 'category', 'duration'] as const)
      if (filters[key]) params.set(key, filters[key])
    const url = new URLSearchParams()
    for (const [key, value] of Object.entries(filters))
      if (value && value !== defaults(scene)[key as keyof Filters])
        url.set(key, value)
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${url.size ? '?' + url : ''}`
    )
    setLoading(true)
    setResponse(null)
    setError('')
    setDetail(null)
    setPage(0)
    void fetch(`${API}/api/v3/get/analysis?${params}`, {
      credentials: 'omit',
      signal: controller.signal
    })
      .then(async (result) => {
        const body = await result.json()
        if (!result.ok)
          throw new Error(body.error?.message || `查询失败（${result.status}）`)
        const parsed = analysisSchema.safeParse(body)
        if (
          !parsed.success ||
          parsed.data.scene !== scene ||
          parsed.data.target !== filters.target
        )
          throw new Error('统计响应不符合当前查询，请更新统计服务后重试。')
        if (!controller.signal.aborted) {
          setResponse(parsed.data)
          setUpdated(
            new Date().toLocaleTimeString('zh-CN', {
              timeZone: 'Asia/Shanghai',
              hour: '2-digit',
              minute: '2-digit'
            })
          )
        }
      })
      .catch((reason: Error) => {
        if (
          !controller.signal.aborted ||
          controller.signal.reason === 'timeout'
        )
          setError(
            controller.signal.reason === 'timeout'
              ? '查询超时，请缩小时间范围后重试。'
              : reason.message === 'Failed to fetch'
                ? '暂时无法连接统计服务，请稍后重试。'
                : reason.message
          )
      })
      .finally(() => {
        clearTimeout(timeout)
        if (
          !controller.signal.aborted ||
          controller.signal.reason === 'timeout'
        )
          setLoading(false)
      })
    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [scene, filters, ready, tick, rangeError])
  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) setPicker(false)
    }
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPicker(false)
        setDetail(null)
      }
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', escape)
    }
  }, [])
  const target = filters.target.startsWith('item:')
    ? targets.items.find((i) => `item:${i.id}` === filters.target)
    : targets.categories.find((i) => `category:${i.id}` === filters.target)
  const label = target?.name || '选择产物',
    unit = target?.unit || ''
  const groups = sortGroups(response?.result.groups || [], sort, direction)
  const chartGroups = sortGroups(
    response?.result.groups || [],
    'per_hour',
    'desc'
  )
    .filter((g) => g.per_hour !== null)
    .slice(0, 6)
  const metrics = response?.result
  const options =
    scene === 'research'
      ? Object.values(CATALOG.research)
      : Object.values(CATALOG.commission)
  const sortColumn = (key: SortKey) => {
    if (sort === key) setDirection((d) => (d === 'desc' ? 'asc' : 'desc'))
    else {
      setSort(key)
      setDirection('desc')
    }
    setPage(0)
  }
  const chooseItem = (id: string) => {
    update('target', `item:${id}`)
    setSearch('')
    setPicker(false)
    setMode('item')
  }
  const exportData = () => {
    const url = URL.createObjectURL(
      new Blob([csvExport(groups, scene, unit)], {
        type: 'text/csv;charset=utf-8'
      })
    )
    const a = document.createElement('a')
    a.href = url
    a.download = `AzurPilot-${scene}-${label}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
  const nameFor = (g: Group) =>
    filters.group_by === 'category' ? categoryName(scene, g.name) : g.name
  const sortHeader = (key: SortKey, title: string) => (
    <th
      aria-sort={
        sort === key
          ? direction === 'desc'
            ? 'descending'
            : 'ascending'
          : 'none'
      }
    >
      <button
        onClick={() => sortColumn(key)}
        className={sort === key ? 'sorted' : ''}
      >
        {title}
        {sort === key ? (
          direction === 'desc' ? (
            <ArrowDown size={12} />
          ) : (
            <ArrowUp size={12} />
          )
        ) : (
          <CaretDown size={11} />
        )}
      </button>
    </th>
  )
  return (
    <StatisticsShell scene={scene}>
      <div className="page-heading">
        <div>
          <div className="eyebrow">RESOURCE ANALYTICS</div>
          <h1>{scene === 'research' ? '科研产物分析' : '军事委托分析'}</h1>
          <p>
            从目标产物出发，找到更高效的
            {scene === 'research' ? '科研项目' : '军事委托'}。
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={exportData}
          disabled={!groups.length || loading || !!rangeError}
        >
          <DownloadSimple size={16} />
          导出数据
        </Button>
      </div>
      <div className="scene-tabs">
        <Link href="/" className={scene === 'research' ? 'active' : ''}>
          <Flask size={17} />
          科研
        </Link>
        <Link
          href="/commission/"
          className={scene === 'commission' ? 'active' : ''}
        >
          <Compass size={17} />
          军事委托
        </Link>
        <span>
          <Database size={13} />
          真实样本 · 统一统计口径
        </span>
      </div>
      <section className="target-panel" aria-labelledby="target-heading">
        <div className="section-title">
          <h2 id="target-heading">
            <span className="step-number">01</span>选择目标产物
          </h2>
          <div className="segmented" aria-label="产物选择方式">
            <button
              aria-pressed={mode === 'category'}
              onClick={() => {
                setMode('category')
                const item = targets.items.find(
                  (i) => 'item:' + i.id === filters.target
                )
                if (item) update('target', 'category:' + item.category)
              }}
            >
              分类汇总
            </button>
            <button
              aria-pressed={mode === 'item'}
              onClick={() => {
                setMode('item')
                setPicker(true)
              }}
            >
              单项查询
            </button>
          </div>
        </div>
        {mode === 'category' ? (
          <div className="resource-grid">
            {targets.categories.map((c) => {
              const Icon = iconFor(c.id)
              return (
                <button
                  key={c.id}
                  className={`resource-chip ${filters.target === `category:${c.id}` ? 'active' : ''}`}
                  aria-pressed={filters.target === `category:${c.id}`}
                  onClick={() => update('target', `category:${c.id}`)}
                >
                  <Icon size={18} />
                  <span>{c.name}</span>
                  {filters.target === `category:${c.id}` && (
                    <Check size={13} weight="bold" />
                  )}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="item-picker" ref={pickerRef}>
            <MagnifyingGlass size={18} />
            <input
              aria-label="搜索具体产物"
              role="combobox"
              aria-expanded={picker}
              aria-controls="item-options"
              aria-autocomplete="list"
              autoComplete="off"
              value={search}
              placeholder={
                filters.target.startsWith('item:')
                  ? label
                  : '搜索舰船蓝图、装备设计图或资源名称…'
              }
              onFocus={() => setPicker(true)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setPicker(true)
                  pickerRef.current
                    ?.querySelector<HTMLButtonElement>('[role=option]')
                    ?.focus()
                }
                if (e.key === 'Enter' && picker) {
                  e.preventDefault()
                  pickerRef.current
                    ?.querySelector<HTMLButtonElement>('[role=option]')
                    ?.click()
                }
              }}
              onChange={(e) => {
                setSearch(e.target.value)
                setPicker(true)
              }}
            />
            <CaretDown size={14} />
            {picker && (
              <div
                className="item-options"
                id="item-options"
                role="listbox"
                aria-label="具体产物"
              >
                <div className="picker-note">
                  选择物品，只统计该物品的已知图标变体
                </div>
                {targets.items
                  .filter((i) =>
                    `${i.name} ${i.id}`
                      .toLowerCase()
                      .includes(search.toLowerCase())
                  )
                  .slice(0, 60)
                  .map((i) => (
                    <button
                      key={i.id}
                      role="option"
                      aria-selected={filters.target === `item:${i.id}`}
                      onClick={() => chooseItem(i.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                          e.preventDefault()
                          const next =
                            e.key === 'ArrowDown'
                              ? e.currentTarget.nextElementSibling
                              : e.currentTarget.previousElementSibling
                          if (next instanceof HTMLButtonElement) next.focus()
                          else if (e.key === 'ArrowUp')
                            pickerRef.current?.querySelector('input')?.focus()
                        }
                      }}
                    >
                      <span>{i.name}</span>
                      <small>
                        {
                          targets.categories.find((c) => c.id === i.category)
                            ?.name
                        }
                      </small>
                      {filters.target === `item:${i.id}` && <Check size={14} />}
                    </button>
                  ))}
                {!targets.items.some((i) =>
                  `${i.name} ${i.id}`
                    .toLowerCase()
                    .includes(search.toLowerCase())
                ) && (
                  <p className="picker-note">未找到物品，试试其他关键词。</p>
                )}
              </div>
            )}
          </div>
        )}
        <div className="selection-note">
          <Info size={14} />
          <span>
            当前目标：<strong>{label}</strong>
            {filters.target.startsWith('category:')
              ? ` · 合并同类别、同计量单位的产物（${unit}）`
              : ` · 仅统计指定物品（${unit}）`}
          </span>
        </div>
      </section>
      <section className="filter-panel" aria-label="分组筛选">
        <div className="filter-title">
          <Funnel size={15} />
          <strong>筛选与分组</strong>
          <button
            onClick={() => {
              setFilters((f) => ({ ...defaults(scene), target: f.target }))
              setDetail(null)
            }}
          >
            重置
          </button>
        </div>
        <div className="filter-grid">
          <label>
            区服
            <select
              value={filters.server}
              onChange={(e) => update('server', e.target.value)}
            >
              <option value="">全部区服</option>
              <option value="cn">国服安卓</option>
              <option value="cn_ios">国服 iOS</option>
              <option value="cn_channel">国服渠道</option>
              <option value="en">国际服</option>
              <option value="jp">日服</option>
              <option value="tw">台服</option>
            </select>
          </label>
          <label>
            统计范围
            <select
              value={filters.days}
              onChange={(e) => update('days', e.target.value)}
            >
              <option value="7">最近 7 天</option>
              <option value="30">最近 30 天</option>
              <option value="90">最近 90 天</option>
              <option value="366">最近 366 天</option>
              <option value="custom">自定义日期</option>
            </select>
          </label>
          {scene === 'research' && (
            <label>
              科研期数
              <select
                value={filters.series}
                onChange={(e) => update('series', e.target.value)}
              >
                <option value="">全部期数</option>
                {[
                  ...new Set(
                    Object.values(CATALOG.research).map((p) => p.series)
                  )
                ]
                  .filter(Boolean)
                  .sort((a, b) => a - b)
                  .map((s) => (
                    <option key={s} value={s}>
                      第 {s} 期
                    </option>
                  ))}
              </select>
            </label>
          )}
          <label>
            {scene === 'research' ? '项目类别' : '委托类型'}
            <select
              value={filters.category}
              onChange={(e) => update('category', e.target.value)}
            >
              <option value="">全部类别</option>
              {[...new Set(options.map((p) => p.category))].sort().map((c) => (
                <option key={c} value={c}>
                  {c} · {categoryName(scene, c)}
                </option>
              ))}
            </select>
          </label>
          <label>
            任务时长
            <select
              value={filters.duration}
              onChange={(e) => update('duration', e.target.value)}
            >
              <option value="">全部时长</option>
              {[...new Set(options.map((p) => p.duration))]
                .filter((d) => d > 0)
                .sort((a, b) => a - b)
                .map((d) => (
                  <option key={d} value={d}>
                    {durationName(d)}
                  </option>
                ))}
            </select>
          </label>
          <label>
            分组方式
            <select
              value={filters.group_by}
              onChange={(e) => update('group_by', e.target.value)}
            >
              <option value="project">
                按{scene === 'research' ? '科研项目' : '委托项目'}
              </option>
              {scene === 'research' && (
                <option value="series">按科研期数</option>
              )}
              <option value="category">按类别</option>
              <option value="duration">按时长</option>
            </select>
          </label>
          {filters.days === 'custom' && (
            <>
              <label>
                开始日期
                <input
                  type="date"
                  value={filters.start}
                  onChange={(e) => update('start', e.target.value)}
                />
              </label>
              <label>
                结束日期
                <input
                  type="date"
                  value={filters.end}
                  onChange={(e) => update('end', e.target.value)}
                />
              </label>
            </>
          )}
        </div>
      </section>
      {rangeError && (
        <div role="alert" className="error-banner">
          <Info size={17} />
          {rangeError}
        </div>
      )}
      {error && (
        <div role="alert" className="error-banner">
          <Info size={17} />
          <div>
            <strong>统计暂不可用</strong>
            <p>{error} 页面不会使用演示数据替代真实统计。</p>
          </div>
          <Button variant="secondary" onClick={() => setTick((t) => t + 1)}>
            重试
          </Button>
        </div>
      )}
      <div className="results-heading">
        <h2>
          <span className="step-number">02</span>比较获取效率
          <span className="target-tag">{label}</span>
        </h2>
        <div aria-live="polite">
          {loading
            ? '正在计算真实样本…'
            : response
              ? `更新于 ${updated} · 北京时间`
              : '等待统计服务'}
          <button
            className="icon-button"
            aria-label="刷新统计"
            disabled={loading || !!rangeError}
            onClick={() => setTick((t) => t + 1)}
          >
            <ArrowClockwise size={15} className={loading ? 'refreshing' : ''} />
          </button>
        </div>
      </div>
      <section
        className={`metric-grid ${loading ? 'is-loading' : ''}`}
        aria-label="产量概览"
        aria-busy={loading}
      >
        <Metric
          title="有效样本"
          value={format(metrics?.samples, 0)}
          suffix="次"
          note="包含目标产物零掉落的完成记录"
        />
        <Metric
          title="目标总产出"
          value={format(metrics?.amount, 0)}
          suffix={unit}
          note={
            scene === 'research'
              ? `其中 BONUS ${format(metrics?.extra_amount, 0)} ${unit}`
              : `大成功记录 ${format(metrics?.success_samples, 0)} 次`
          }
        />
        <Metric
          title="掉落概率"
          value={metrics ? format(metrics.drop_rate * 100, 2) : '—'}
          suffix="%"
          note={`获得目标的记录 ${format(metrics?.occurrences, 0)} 次`}
        />
        <Metric
          title="每小时平均产量"
          value={format(metrics?.per_hour)}
          suffix={`${unit}/时`}
          note={
            metrics?.unknown_durations
              ? `${format(metrics.unknown_durations)} 条记录时长未知，暂不计算`
              : '总产出 ÷ 样本任务总耗时'
          }
          accent
        />
      </section>
      <section className="comparison-grid">
        <div className="chart-panel">
          <div className="panel-heading">
            <div>
              <h3>
                <ChartBar size={17} />
                每小时产量排行
              </h3>
              <p>按相同任务总耗时，比较产物获取效率</p>
            </div>
            <span className="chart-unit">{unit} / 小时 · TOP 6</span>
          </div>
          {chartGroups.length > 0 && !rangeError ? (
            <div
              className="bar-chart"
              role="img"
              aria-label={`${label}每小时产量前六名`}
            >
              {chartGroups.map((g, i) => (
                <div className="chart-row" key={g.id}>
                  <div className="chart-name">
                    <span>{String(i + 1).padStart(2, '0')}</span>
                    <button onClick={() => setDetail(g)} title={g.name}>
                      {nameFor(g)}
                    </button>
                  </div>
                  <div className="chart-track">
                    <div
                      className={i === 0 ? 'chart-bar best' : 'chart-bar'}
                      style={{
                        width: `${(g.per_hour! / (chartGroups[0].per_hour || 1)) * 100}%`
                      }}
                    />
                  </div>
                  <strong>{format(g.per_hour)}</strong>
                </div>
              ))}
              <div className="chart-axis">
                <span>0</span>
                <span>{format((chartGroups[0].per_hour || 0) / 2)}</span>
                <span>{format(chartGroups[0].per_hour)}</span>
              </div>
            </div>
          ) : (
            <div className="chart-empty">
              <ChartBar size={32} weight="light" />
              <span>
                {loading
                  ? '正在汇总样本产出'
                  : '有足够样本后，在这里比较项目效率'}
              </span>
              <small>不会根据奖励预览推算掉落概率</small>
            </div>
          )}
        </div>
        <div className="insight-panel">
          <span className="insight-label">
            <Trophy size={16} />
            效率观察
          </span>
          {chartGroups[0] && !rangeError ? (
            <>
              <h3>{nameFor(chartGroups[0])}</h3>
              <p>
                在当前已公开的样本中，获取<strong>{label}</strong>
                的每小时平均产量最高。
              </p>
              <div className="insight-value">
                {format(chartGroups[0].per_hour)}
                <span>{unit} / 小时</span>
              </div>
              <div className="insight-evidence">
                <span>{format(chartGroups[0].samples)} 次样本</span>
                <span>
                  {format(chartGroups[0].drop_rate * 100, 2)}% 掉落概率
                </span>
              </div>
            </>
          ) : (
            <>
              <h3>让每一小时都有方向</h3>
              <p>
                选定产物后，按每小时产量寻找高效项目；也可以关注单次收益和掉落概率。
              </p>
              <div className="insight-placeholder">
                <Clock size={25} weight="light" />
                <span>等待真实样本</span>
              </div>
            </>
          )}
          <Link href="/methodology/">
            查看统计口径 <ArrowUpRight size={13} />
          </Link>
        </div>
      </section>
      <section className="data-panel" aria-labelledby="table-heading">
        <div className="table-toolbar">
          <div>
            <h3 id="table-heading">
              项目收益比较<span>{format(groups.length, 0)} 个分组</span>
            </h3>
            <p>点击表头排序，点击项目查看消耗与奖励明细</p>
          </div>
          <div className="table-controls">
            <label className="sr-only" htmlFor="sort-metric">
              排序指标
            </label>
            <select
              id="sort-metric"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as SortKey)
                setPage(0)
              }}
            >
              <option value="per_hour">每小时平均产量</option>
              <option value="average">单次平均产量</option>
              <option value="drop_rate">掉落概率</option>
              <option value="samples">样本数量</option>
              <option value="amount">总产出</option>
              <option value="min">最小数量</option>
              <option value="max">最大数量</option>
              {scene === 'research' ? (
                <option value="extra_amount">BONUS 产出</option>
              ) : (
                <option value="success_amount">大成功产出</option>
              )}
            </select>
            <button
              className="icon-button order-button"
              aria-label={direction === 'desc' ? '切换为升序' : '切换为降序'}
              onClick={() => {
                setDirection((d) => (d === 'desc' ? 'asc' : 'desc'))
                setPage(0)
              }}
            >
              {direction === 'desc' ? (
                <ArrowDown size={16} />
              ) : (
                <ArrowUp size={16} />
              )}
            </button>
            <div className="segmented view-toggle">
              <button
                aria-label="表格视图"
                aria-pressed={view === 'table'}
                onClick={() => setView('table')}
              >
                <List size={16} />
              </button>
              <button
                aria-label="排行榜视图"
                aria-pressed={view === 'ranking'}
                onClick={() => setView('ranking')}
              >
                <ChartBar size={16} />
              </button>
            </div>
          </div>
        </div>
        {groups.length > 0 && !rangeError ? (
          view === 'table' ? (
            <div className="table-scroll">
              <table>
                <caption className="sr-only">
                  {label}项目收益比较，单位{unit}
                </caption>
                <thead>
                  <tr>
                    <th className="project-col">
                      {scene === 'research' ? '科研项目' : '委托项目'}
                    </th>
                    {sortHeader('samples', '样本数')}
                    {sortHeader('drop_rate', '掉落概率')}
                    {sortHeader('min', '最小')}
                    {sortHeader('max', '最大')}
                    {sortHeader('average', '单次平均')}
                    {sortHeader('per_hour', '每小时平均')}
                    {sortHeader(
                      scene === 'research' ? 'extra_amount' : 'success_amount',
                      scene === 'research' ? 'BONUS 产出' : '大成功产出'
                    )}
                  </tr>
                </thead>
                <tbody>
                  {groups.slice(page * 12, page * 12 + 12).map((g, i) => (
                    <tr key={g.id}>
                      <td>
                        <button
                          className="project-button"
                          onClick={() => setDetail(g)}
                        >
                          <span className="project-letter">
                            {filters.group_by === 'project' ? (
                              scene === 'research' ? (
                                g.name[0]
                              ) : (
                                <Compass size={16} />
                              )
                            ) : (
                              <Stack size={16} />
                            )}
                          </span>
                          <span>
                            <strong>{nameFor(g)}</strong>
                            <small>
                              {g.series ? `第 ${g.series} 期 · ` : ''}
                              {g.category
                                ? categoryName(scene, g.category) + ' · '
                                : ''}
                              {filters.group_by === 'project'
                                ? durationName(g.duration)
                                : '按样本总量重新计算'}
                            </small>
                          </span>
                          <CaretRight size={12} />
                        </button>
                      </td>
                      <td>{format(g.samples, 0)}</td>
                      <td>
                        {format(g.drop_rate * 100, 2)}
                        <span className="unit-inline">%</span>
                      </td>
                      <td>{format(g.min)}</td>
                      <td>{format(g.max)}</td>
                      <td>{format(g.average)}</td>
                      <td className="efficiency-cell">
                        {format(g.per_hour)}
                        {sort === 'per_hour' &&
                          direction === 'desc' &&
                          i === 0 &&
                          page === 0 &&
                          g.per_hour !== null && (
                            <span className="best-tag">最高</span>
                          )}
                      </td>
                      <td>
                        {format(
                          scene === 'research'
                            ? g.extra_amount
                            : g.success_amount
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <ol className="ranking-list">
              {groups.slice(page * 12, page * 12 + 12).map((g, i) => (
                <li key={g.id}>
                  <span>{String(page * 12 + i + 1).padStart(2, '0')}</span>
                  <button onClick={() => setDetail(g)}>
                    {nameFor(g)}
                    <small>
                      {format(g.samples)} 次样本 · {durationName(g.duration)}
                    </small>
                  </button>
                  <strong>
                    {sort === 'drop_rate'
                      ? format(g.drop_rate * 100, 2)
                      : format(g[sort])}
                    <small>
                      {sort === 'per_hour'
                        ? `${unit}/时`
                        : sort === 'drop_rate'
                          ? '%'
                          : sort === 'samples'
                            ? '次'
                            : unit}
                    </small>
                  </strong>
                </li>
              ))}
            </ol>
          )
        ) : (
          <div className="empty-state" role="status">
            <span className="empty-icon">
              <Database size={29} weight="light" />
            </span>
            <h3>
              {rangeError
                ? '请完善日期范围'
                : loading
                  ? '正在计算项目收益'
                  : error
                    ? '连接统计服务后显示收益比较'
                    : '当前条件下暂无公开样本'}
            </h3>
            <p>
              {scene === 'commission' && !error && !loading
                ? '委托分组需超过 50 个有效样本后公开展示。可以扩大时间范围或放宽筛选。'
                : '你可以切换产物、扩大时间范围，或在更多完成记录上传后再次查看。'}
            </p>
            {!loading && !error && (
              <Button
                variant="secondary"
                onClick={() =>
                  setFilters((f) => ({
                    ...defaults(scene),
                    target: f.target,
                    days: '90'
                  }))
                }
              >
                扩大至最近 90 天
              </Button>
            )}
          </div>
        )}
        <div className="table-footer">
          <span>
            <Info size={13} />
            零掉落计入样本 · 产量包含实际观测的额外奖励
          </span>
          <div>
            <span>
              {groups.length
                ? `${page * 12 + 1}–${Math.min((page + 1) * 12, groups.length)} / ${groups.length}`
                : '0 个分组'}
            </span>
            <button
              aria-label="上一页"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              ‹
            </button>
            <button
              aria-label="下一页"
              disabled={(page + 1) * 12 >= groups.length}
              onClick={() => setPage((p) => p + 1)}
            >
              ›
            </button>
          </div>
        </div>
      </section>
      <div className="method-note">
        <Info size={17} />
        <p>
          <strong>如何理解这些数据？</strong> 每小时产量 = 目标总产出 ÷
          所有有效样本的任务总耗时。分组后重新计算，少量样本可能产生较大波动。
          {scene === 'commission'
            ? '“大成功产出”是大成功记录中的目标产出，不推算额外增量。'
            : 'BONUS 单独列示，追赶与活动奖励可在项目明细中查看。'}
        </p>
        <Link href="/methodology/">
          了解更多
          <ArrowUpRight size={12} />
        </Link>
      </div>
      {detail && (
        <ProjectDetail
          group={detail}
          scene={scene}
          unit={unit}
          label={label}
          onClose={() => setDetail(null)}
        />
      )}
    </StatisticsShell>
  )
}
