import type { Metadata } from 'next'
import { Cl1Statistics } from '../../../src/views/Cl1Statistics'

export const metadata: Metadata = {
  title: '侵蚀 1 统计',
  description: '碧蓝航线侵蚀 1 通关、明石遭遇与行动力收益的月度统计。',
  alternates: { canonical: 'https://stats.azurpilot.com/erosion/' }
}

export default function Page() {
  return <Cl1Statistics />
}
