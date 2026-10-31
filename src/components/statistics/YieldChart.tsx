'use client'
import { Chart } from '@cloudflare/kumo/components/chart'
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  AriaComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { Group } from '../../statistics'

echarts.use([
  BarChart,
  GridComponent,
  TooltipComponent,
  AriaComponent,
  CanvasRenderer
])

export function YieldChart({
  groups,
  unit,
  nameFor
}: {
  groups: Group[]
  unit: string
  nameFor: (group: Group) => string
}) {
  return (
    <Chart
      echarts={echarts}
      height={Math.max(160, groups.length * 40 + 48)}
      options={{
        animation: false,
        aria: { enabled: true },
        grid: { left: 140, right: 56, top: 8, bottom: 32 },
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'value', name: unit, axisLabel: { fontSize: 14 } },
        yAxis: {
          type: 'category',
          inverse: true,
          data: groups.map(nameFor),
          axisLabel: { fontSize: 14, width: 128, overflow: 'truncate' }
        },
        series: [
          {
            type: 'bar',
            barMaxWidth: 20,
            data: groups.map((group) => group.per_hour),
            label: { show: true, position: 'right', fontSize: 14 }
          }
        ]
      }}
    />
  )
}
