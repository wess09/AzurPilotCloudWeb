import type { Metadata } from 'next'
import { Cl1Statistics } from '../../../src/views/Cl1Statistics'

export const metadata: Metadata = {
  title: { absolute: 'AzurPilot 碧蓝统计署 | 侵蚀 1 统计' },
  description: '碧蓝航线侵蚀 1 战斗、明石遭遇与行动力收益的月度统计。',
  alternates: { canonical: 'https://stats.azurpilot.com/erosion/' },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    siteName: 'AzurPilot 碧蓝统计署',
    title: 'AzurPilot 碧蓝统计署 | 侵蚀 1 统计',
    url: 'https://stats.azurpilot.com/erosion/',
    images: [{ url: '/logo.png', width: 512, height: 512, alt: 'AzurPilot' }]
  },
  twitter: {
    card: 'summary',
    title: 'AzurPilot 碧蓝统计署 | 侵蚀 1 统计',
    images: ['/logo.png']
  }
}

export default function Page() {
  return <Cl1Statistics />
}
