import { z } from 'zod'

const count = z.number().int().nonnegative()
const metricsSchema = z.object({
  devices: count,
  battle_count: count,
  battle_rounds: count,
  akashi_encounters: count,
  akashi_ap: count,
  ap_cost: count,
  net_ap: z.number().int(),
  akashi_probability: z.number(),
  average_ap: z.number(),
  cycle_efficiency: z.number()
})
export const cl1StatisticsSchema = z.object({
  schema_version: z.literal(3),
  result: z.object({
    total: metricsSchema,
    history: z.array(metricsSchema.extend({ month: z.string().regex(/^\d{4}-\d{2}$/) })),
    updated_at: z.string().nullable()
  })
})
export type Cl1Metrics = z.infer<typeof metricsSchema>
export type Cl1Statistics = z.infer<typeof cl1StatisticsSchema>['result']

export function shanghaiMonth() {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit' }).formatToParts(new Date())
  return `${parts.find(part => part.type === 'year')?.value}-${parts.find(part => part.type === 'month')?.value}`
}
