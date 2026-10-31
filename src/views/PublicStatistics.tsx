'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@cloudflare/kumo/components/button'
import { Combobox } from '@cloudflare/kumo/components/combobox'
import { Empty } from '@cloudflare/kumo/components/empty'
import { Input } from '@cloudflare/kumo/components/input'
import { Pagination } from '@cloudflare/kumo/components/pagination'
import { Select } from '@cloudflare/kumo/components/select'
import { Surface } from '@cloudflare/kumo/components/surface'
import { Table } from '@cloudflare/kumo/components/table'
import { Tabs } from '@cloudflare/kumo/components/tabs'
import { Text } from '@cloudflare/kumo/components/text'
import {
  ArrowDown,
  ArrowUp,
  ArrowsDownUp,
  DownloadSimple,
  ArrowClockwise
} from '@phosphor-icons/react'
import { ProjectDetail } from '../components/statistics/ProjectDetail'
import { Metric } from '../components/statistics/Metric'
import { YieldChart } from '../components/statistics/YieldChart'
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
const API =
  process.env.NEXT_PUBLIC_STATS_API_BASE || 'https://api.azurpilot.com'
const PAGE_SIZE = 12

export function PublicStatistics({ scene }: { scene: Scene }) {
  const [filters, setFilters] = useState<Filters>(() => defaults(scene))
  const [ready, setReady] = useState(false)
  const [response, setResponse] = useState<Analysis | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const [updated, setUpdated] = useState('')
  const [mode, setMode] = useState('category')
  const [sort, setSort] = useState<SortKey>('per_hour')
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc')
  const [view, setView] = useState('table')
  const [page, setPage] = useState(0)
  const [detail, setDetail] = useState<Group | null>(null)
  const targets = useMemo(() => targetsFor(scene), [scene])
  const update = (key: keyof Filters, value: string) => {
    setFilters((previous) => ({ ...previous, [key]: value }))
    setPage(0)
    setDetail(null)
  }

  useEffect(() => {
    const read = () => {
      const params = new URLSearchParams(window.location.search),
        next = defaults(scene)
      for (const key of Object.keys(next) as (keyof Filters)[])
        if (params.has(key)) next[key] = params.get(key) ?? ''
      if (
        !targets.categories.some(
          (category) => `category:${category.id}` === next.target
        ) &&
        !targets.items.some((item) => `item:${item.id}` === next.target)
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
          throw new Error('统计响应无效')
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
              ? '查询超时'
              : reason.message === 'Failed to fetch'
                ? '无法连接统计服务'
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

  const target = filters.target.startsWith('item:')
    ? targets.items.find((item) => `item:${item.id}` === filters.target)
    : targets.categories.find(
        (category) => `category:${category.id}` === filters.target
      )
  const label = target?.name || '产物',
    unit = target?.unit || ''
  const groups = sortGroups(response?.result.groups || [], sort, direction)
  const chartGroups = sortGroups(
    response?.result.groups || [],
    'per_hour',
    'desc'
  )
    .filter((group) => group.per_hour !== null)
    .slice(0, 6)
  const metrics = response?.result
  const options =
    scene === 'research'
      ? Object.values(CATALOG.research)
      : Object.values(CATALOG.commission)
  const names = targets.items.map((item) => item.name)
  const sortItems = {
    per_hour: '每小时平均产量',
    average: '单次平均产量',
    drop_rate: '掉落概率',
    samples: '样本数量',
    amount: '总产出',
    min: '最小数量',
    max: '最大数量',
    ...(scene === 'research'
      ? { extra_amount: 'BONUS 产出' }
      : { success_amount: '大成功产出' })
  }
  const nameFor = (group: Group) =>
    filters.group_by === 'category'
      ? categoryName(scene, group.name)
      : group.name
  const sortColumn = (key: SortKey) => {
    if (sort === key)
      setDirection((previous) => (previous === 'desc' ? 'asc' : 'desc'))
    else {
      setSort(key)
      setDirection('desc')
    }
    setPage(0)
  }
  const sortHeader = (key: SortKey, title: string) => (
    <Table.Head
      aria-sort={
        sort === key
          ? direction === 'desc'
            ? 'descending'
            : 'ascending'
          : 'none'
      }
      className="numeric-cell"
    >
      <Button variant="ghost" onClick={() => sortColumn(key)}>
        {title}
        {sort === key ? (
          direction === 'desc' ? (
            <ArrowDown size={14} />
          ) : (
            <ArrowUp size={14} />
          )
        ) : (
          <ArrowsDownUp size={14} />
        )}
      </Button>
    </Table.Head>
  )
  const exportData = () => {
    const url = URL.createObjectURL(
      new Blob([csvExport(groups, scene, unit)], {
        type: 'text/csv;charset=utf-8'
      })
    )
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `AzurPilot-${scene}-${label}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="page-heading">
        <Text as="h1" variant="heading" size="lg">
          {scene === 'research' ? '科研产物分析' : '军事委托分析'}
        </Text>
        <Button
          variant="secondary"
          onClick={exportData}
          disabled={!groups.length || loading || Boolean(rangeError)}
        >
          <DownloadSimple size={16} />
          导出数据
        </Button>
      </div>

      <Surface className="target-panel">
        <div className="section-heading">
          <Text as="h2" variant="heading">
            产物
          </Text>
          <Tabs
            value={mode}
            indicatorClassName="motion-reduce:transition-none"
            tabs={[
              { value: 'category', label: '分类汇总' },
              { value: 'item', label: '单项查询' }
            ]}
            onValueChange={(value) => {
              setMode(value)
              if (value === 'category') {
                const item = targets.items.find(
                  (item) => `item:${item.id}` === filters.target
                )
                if (item) update('target', `category:${item.category}`)
              }
            }}
          />
        </div>
        {mode === 'category' ? (
          <Tabs
            value={filters.target}
            tabs={targets.categories.map((category) => ({
              value: `category:${category.id}`,
              label: category.name
            }))}
            labels={{scrollStart: '向左查看更多分类', scrollEnd: '向右查看更多分类'}}
            onValueChange={(value) => update('target', value)}
            indicatorClassName="motion-reduce:transition-none"
          />
        ) : (
          <Combobox<string>
            items={names}
            value={filters.target.startsWith('item:') ? label : null}
            onValueChange={(value) => {
              if (typeof value === 'string') {
                const item = targets.items.find((item) => item.name === value)
                if (item) update('target', `item:${item.id}`)
              }
            }}
          >
            <Combobox.TriggerInput
              aria-label="搜索具体产物"
              placeholder="搜索产物"
              className="w-full"
            />
            <Combobox.Content>
              <Combobox.Empty>无匹配项</Combobox.Empty>
              <Combobox.List>
                {(name: string) => (
                  <Combobox.Item key={name} value={name}>
                    {name}
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Content>
          </Combobox>
        )}
      </Surface>

      <Surface className="filter-panel">
        <div className="section-heading">
          <Text as="h2" variant="heading">
            筛选
          </Text>
          <Button
            variant="ghost"
            onClick={() => {
              setFilters((previous) => ({
                ...defaults(scene),
                target: previous.target
              }))
              setDetail(null)
            }}
          >
            重置
          </Button>
        </div>
        <div className="filter-grid">
          <Select
            label="区服"
            value={filters.server}
            onValueChange={(value) => update('server', value ?? '')}
            items={{
              '': '全部区服',
              cn: '国服安卓',
              cn_ios: '国服 iOS',
              cn_channel: '国服渠道',
              en: '国际服',
              jp: '日服',
              tw: '台服'
            }}
          />
          <Select
            label="统计范围"
            value={filters.days}
            onValueChange={(value) => update('days', value ?? '30')}
            items={{
              '7': '最近 7 天',
              '30': '最近 30 天',
              '90': '最近 90 天',
              '366': '最近 366 天',
              custom: '自定义日期'
            }}
          />
          {scene === 'research' && (
            <Select
              label="科研期数"
              value={filters.series}
              onValueChange={(value) => update('series', value ?? '')}
              items={{
                '': '全部期数',
                ...Object.fromEntries(
                  [
                    ...new Set(
                      Object.values(CATALOG.research).map(
                        (project) => project.series
                      )
                    )
                  ]
                    .filter(Boolean)
                    .sort((a, b) => a - b)
                    .map((series) => [String(series), `第 ${series} 期`])
                )
              }}
            />
          )}
          <Select
            label={scene === 'research' ? '项目类别' : '委托类型'}
            value={filters.category}
            onValueChange={(value) => update('category', value ?? '')}
            items={{
              '': '全部类别',
              ...Object.fromEntries(
                [...new Set(options.map((project) => project.category))]
                  .sort()
                  .map((category) => [category, categoryName(scene, category)])
              )
            }}
          />
          <Select
            label="任务时长"
            value={filters.duration}
            onValueChange={(value) => update('duration', value ?? '')}
            items={{
              '': '全部时长',
              ...Object.fromEntries(
                [...new Set(options.map((project) => project.duration))]
                  .filter((duration) => duration > 0)
                  .sort((a, b) => a - b)
                  .map((duration) => [String(duration), durationName(duration)])
              )
            }}
          />
          <Select
            label="分组方式"
            value={filters.group_by}
            onValueChange={(value) => update('group_by', value ?? 'project')}
            items={{
              project: scene === 'research' ? '按科研项目' : '按委托项目',
              ...(scene === 'research' ? { series: '按科研期数' } : {}),
              category: '按类别',
              duration: '按时长'
            }}
          />
          {filters.days === 'custom' && (
            <>
              <Input
                label="开始日期"
                type="date"
                value={filters.start}
                onChange={(event) => update('start', event.target.value)}
              />
              <Input
                label="结束日期"
                type="date"
                value={filters.end}
                onChange={(event) => update('end', event.target.value)}
              />
            </>
          )}
        </div>
      </Surface>

      {(rangeError || error) && (
        <Surface className="error-banner" role="alert">
          <Text variant="error">{rangeError || error}</Text>
          {error && (
            <Button
              variant="secondary"
              onClick={() => setTick((previous) => previous + 1)}
            >
              重试
            </Button>
          )}
        </Surface>
      )}
      <div className="results-heading">
        <div className="target-tag">
          <Text as="h2" variant="heading">
            {label}
          </Text>
        </div>
        <div className="update-controls">
          <Text variant="secondary">
            {loading ? '加载中…' : updated ? `更新 ${updated}` : ''}
          </Text>
          <Button
            variant="ghost"
            shape="square"
            aria-label="刷新统计"
            disabled={loading || Boolean(rangeError)}
            onClick={() => setTick((previous) => previous + 1)}
          >
            <ArrowClockwise size={16} />
          </Button>
        </div>
      </div>
      <div className="metric-grid" aria-label="产量概览" aria-busy={loading}>
        <Metric
          title="有效样本"
          value={format(metrics?.samples, 0)}
          suffix="次"
        />
        <Metric
          title="总产出"
          value={format(metrics?.amount, 0)}
          suffix={unit}
        />
        <Metric
          title="掉落概率"
          value={metrics ? format(metrics.drop_rate * 100, 2) : '—'}
          suffix="%"
        />
        <Metric
          title="每小时平均产量"
          value={format(metrics?.per_hour)}
          suffix={`${unit}/时`}
        />
      </div>

      {chartGroups.length > 0 && !rangeError && (
        <Surface className="chart-panel">
          <div className="section-heading">
            <Text as="h3" variant="heading">
              每小时产量排行
            </Text>
            <Text variant="secondary">{unit}/小时</Text>
          </div>
          <YieldChart groups={chartGroups} unit={unit} nameFor={nameFor} />
        </Surface>
      )}

      <Surface className="data-panel">
        <div className="table-toolbar">
          <Text as="h3" variant="heading">
            项目收益
          </Text>
          <div className="table-controls">
            <Select
              aria-label="排序指标"
              value={sort}
              onValueChange={(value) => {
                if (value) setSort(value as SortKey)
                setPage(0)
              }}
              items={sortItems}
            />
            <Button
              variant="secondary"
              shape="square"
              aria-label={direction === 'desc' ? '切换为升序' : '切换为降序'}
              onClick={() => {
                setDirection((previous) =>
                  previous === 'desc' ? 'asc' : 'desc'
                )
                setPage(0)
              }}
            >
              {direction === 'desc' ? (
                <ArrowDown size={16} />
              ) : (
                <ArrowUp size={16} />
              )}
            </Button>
            <Tabs
              value={view}
              indicatorClassName="motion-reduce:transition-none"
              onValueChange={setView}
              tabs={[
                { value: 'table', label: '表格' },
                { value: 'ranking', label: '排行榜' }
              ]}
            />
          </div>
        </div>
        {groups.length > 0 && !rangeError ? (
          view === 'table' ? (
            <div className="table-scroll">
              <Table>
                <caption className="sr-only">
                  {label}项目收益比较，单位{unit}
                </caption>
                <Table.Header>
                  <Table.Row>
                    <Table.Head>
                      {scene === 'research' ? '科研项目' : '委托项目'}
                    </Table.Head>
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
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {groups
                    .slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
                    .map((group) => (
                      <Table.Row key={group.id}>
                        <Table.Cell>
                          <Button
                            variant="ghost"
                            onClick={() => setDetail(group)}
                            className="project-button"
                          >
                            <span>
                              {nameFor(group)}
                              <Text as="small" variant="secondary">
                                {group.series ? `第 ${group.series} 期 · ` : ''}
                                {filters.group_by === 'project'
                                  ? durationName(group.duration)
                                  : ''}
                              </Text>
                            </span>
                          </Button>
                        </Table.Cell>
                        <Table.Cell className="numeric-cell">
                          {format(group.samples, 0)}
                        </Table.Cell>
                        <Table.Cell className="numeric-cell">
                          {format(group.drop_rate * 100, 2)}%
                        </Table.Cell>
                        <Table.Cell className="numeric-cell">
                          {format(group.min)}
                        </Table.Cell>
                        <Table.Cell className="numeric-cell">
                          {format(group.max)}
                        </Table.Cell>
                        <Table.Cell className="numeric-cell">
                          {format(group.average)}
                        </Table.Cell>
                        <Table.Cell className="numeric-cell">
                          {format(group.per_hour)}
                        </Table.Cell>
                        <Table.Cell className="numeric-cell">
                          {format(
                            scene === 'research'
                              ? group.extra_amount
                              : group.success_amount
                          )}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                </Table.Body>
              </Table>
            </div>
          ) : (
            <div className="table-scroll">
              <Table className="ranking-list">
                <Table.Header>
                  <Table.Row>
                    <Table.Head>排名</Table.Head>
                    <Table.Head>项目</Table.Head>
                    <Table.Head className="numeric-cell">
                      {sortItems[sort as keyof typeof sortItems]}
                    </Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {groups
                    .slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
                    .map((group, index) => (
                      <Table.Row key={group.id}>
                        <Table.Cell>{page * PAGE_SIZE + index + 1}</Table.Cell>
                        <Table.Cell>
                          <Button
                            variant="ghost"
                            onClick={() => setDetail(group)}
                          >
                            {nameFor(group)}
                          </Button>
                        </Table.Cell>
                        <Table.Cell className="numeric-cell">
                          {sort === 'drop_rate'
                            ? `${format(group.drop_rate * 100, 2)}%`
                            : format(group[sort])}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                </Table.Body>
              </Table>
            </div>
          )
        ) : (
          <div role="status">
            <Empty
              size="sm"
              title={
                rangeError
                  ? '日期无效'
                  : loading
                    ? '加载中…'
                    : error
                      ? '查询失败'
                      : '暂无数据'
              }
            />
          </div>
        )}
        {groups.length > PAGE_SIZE && (
          <div className="table-pagination">
            <Pagination
              page={page + 1}
              setPage={(value) => setPage(value - 1)}
              perPage={PAGE_SIZE}
              totalCount={groups.length}
              labels={{
                navigation: '分页',
                previousPage: '上一页',
                nextPage: '下一页'
              }}
            >
              <Pagination.Info>
                {({ pageShowingRange, totalCount }) =>
                  `${pageShowingRange} / ${totalCount}`
                }
              </Pagination.Info>
              <Pagination.Controls controls="simple" />
            </Pagination>
          </div>
        )}
      </Surface>
      <ProjectDetail
        group={detail}
        scene={scene}
        unit={unit}
        label={label}
        onClose={() => setDetail(null)}
      />
    </>
  )
}
