import { z } from 'zod'
import catalog from './data/catalog.json'
export type Scene = 'research' | 'commission'
export const CATALOG = catalog
export const categoryName = (scene: Scene, id: string) =>
  (scene === 'research'
    ? ({
        C: '基础研究',
        D: '定向研究',
        E: '装备研发',
        G: '资金募集',
        H: '魔方解析',
        Q: '样本采集',
        T: '舰装解析',
        B: '数据收集',
        A: '心智补全'
      } as Record<string, string>)
    : ({
        '1': '额外委托',
        '2': '紧急委托',
        '3': '长期军事委托',
        '4': '日常委托',
        '5': '夜间委托',
        '6': '高阶战术研发',
        unknown: '未收录类型'
      } as Record<string, string>))[id] ||
  id ||
  '未分类'
const metricFields = {
  samples: z.number().int().nonnegative(),
  occurrences: z.number().int().nonnegative(),
  amount: z.number().nonnegative(),
  min: z.number().nonnegative(),
  max: z.number().nonnegative(),
  extra_amount: z.number().nonnegative(),
  other_amount: z.number().nonnegative(),
  success_samples: z.number().int().nonnegative(),
  success_amount: z.number().nonnegative(),
  total_seconds: z.number().nonnegative(),
  unknown_durations: z.number().nonnegative(),
  drop_rate: z.number().min(0).max(1),
  average: z.number().nonnegative(),
  per_hour: z.number().nonnegative().nullable()
}
export const analysisSchema = z.object({
  schema_version: z.literal(3),
  from: z.string(),
  to: z.string(),
  scene: z.enum(['research', 'commission']),
  target: z.string(),
  result: z.object({
    ...metricFields,
    unit: z.string(),
    groups: z.array(
      z.object({
        ...metricFields,
        id: z.string(),
        name: z.string(),
        series: z.number(),
        category: z.string(),
        duration: z.number(),
        condition: z.string(),
        costs: z
          .array(z.object({ name: z.string(), amount: z.number() }))
          .nullable()
      })
    )
  })
})
export type Analysis = z.infer<typeof analysisSchema>
export type Group = Analysis['result']['groups'][number]
export type SortKey =
  | 'per_hour'
  | 'average'
  | 'drop_rate'
  | 'samples'
  | 'amount'
  | 'min'
  | 'max'
  | 'extra_amount'
  | 'success_amount'
export const format = (v: number | null | undefined, digits = 3) =>
  v == null ? '—' : v.toLocaleString('zh-CN', { maximumFractionDigits: digits })
export const durationName = (s: number) =>
  s
    ? s < 3600
      ? `${format(s / 60)} 分钟`
      : `${format(s / 3600)} 小时`
    : '时长未知'
export function sortGroups(
  groups: Group[],
  key: SortKey,
  direction: 'asc' | 'desc'
) {
  return [...groups].sort((a, b) => {
    const av = a[key],
      bv = b[key]
    if (av == null) return bv == null ? a.id.localeCompare(b.id) : 1
    if (bv == null) return -1
    return (direction === 'asc' ? av - bv : bv - av) || a.id.localeCompare(b.id)
  })
}
export function csvExport(groups: Group[], scene: Scene, unit: string) {
  const cell = (v: string | number | null) => {
    const s = String(v ?? '')
    return `"${(/^[=+@\-\t\r]/.test(s) ? "'" + s : s).replaceAll('"', '""')}"`
  }
  return (
    '\uFEFF' +
    [
      [
        '项目',
        '期数',
        '类型',
        '时长（秒）',
        '样本数',
        '掉落次数',
        `总产出（${unit}）`,
        '掉落概率',
        '最小数量',
        '最大数量',
        '单次平均',
        '每小时平均',
        '科研 BONUS',
        '追赶/活动奖励',
        '大成功样本数',
        '大成功记录产出',
        '样本总耗时（秒）'
      ],
      ...groups.map((g) => [
        g.name,
        g.series || '',
        categoryName(scene, g.category),
        g.duration || '',
        g.samples,
        g.occurrences,
        g.amount,
        g.drop_rate,
        g.min,
        g.max,
        g.average,
        g.per_hour,
        g.extra_amount,
        g.other_amount,
        g.success_samples,
        g.success_amount,
        g.total_seconds
      ])
    ]
      .map((row) => row.map(cell).join(','))
      .join('\r\n')
  )
}
export type CatalogItem = typeof catalog.items[number] & { series?: number; version?: string; game_id?: string; faction?: string; subtype?: string }
export const itemCatalogSchema = z.object({ items: z.array(z.object({
  id: z.string(), name: z.string(), category: z.string(), unit: z.string(), rarity: z.number(),
  aliases: z.array(z.string()).nullish().transform(value => value ?? []), scenes: z.array(z.string()),
  series: z.number().optional(), version: z.string().optional(), game_id: z.string().optional(), faction: z.string().optional(), subtype: z.string().optional()
})) })
export function targetsFor(scene: Scene, available: CatalogItem[] = CATALOG.items) {
  const items = available.filter((i) => i.scenes.includes(scene))
  return {
    items,
    categories: CATALOG.categories.filter((c) =>
      items.some((i) => i.category === c.id)
    )
  }
}
