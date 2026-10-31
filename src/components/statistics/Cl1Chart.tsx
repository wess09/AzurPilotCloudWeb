'use client'
import { Chart } from '@cloudflare/kumo/components/chart'
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, AriaComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { Cl1Statistics } from '../../cl1-statistics'

echarts.use([BarChart, GridComponent, TooltipComponent, LegendComponent, AriaComponent, CanvasRenderer])

export function Cl1Chart({ history }: { history: Cl1Statistics['history'] }) {
  const months = [...history].reverse()
  return <Chart echarts={echarts} height={300} options={{
    animation: false,
    aria: { enabled: true },
    tooltip: { trigger: 'axis', confine: true },
    legend: { bottom: 0 },
    grid: { left: 80, right: 24, top: 16, bottom: 64 },
    xAxis: { type: 'category', data: months.map(row => row.month) },
    yAxis: { type: 'value', name: '行动力' },
    series: [
      { name: '购买行动力', type: 'bar', data: months.map(row => row.akashi_ap) },
      { name: '出击消耗', type: 'bar', data: months.map(row => row.ap_cost) },
      { name: '净收益', type: 'bar', data: months.map(row => row.net_ap) }
    ]
  }} />
}
