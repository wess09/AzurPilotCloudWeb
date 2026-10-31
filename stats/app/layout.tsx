import type { Metadata, Viewport } from 'next'
import './globals.css'
import { StatisticsShell } from '../../src/components/statistics/StatisticsShell'
import { JsonLd } from '../../src/components/seo/JsonLd'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' }
  ]
}

export const metadata: Metadata = {
  metadataBase: new URL('https://stats.azurpilot.com'),
  title: {
    default: '碧蓝航线科研产物与军事委托统计 · AzurPilot',
    template: '%s · AzurPilot'
  },
  description:
    '碧蓝航线全服真实样本统计分析平台。提供科研项目蓝图掉率、定向装备设计图产出、军事委托资源收益（心智魔方、物资、石油）每小时效率与极值数据，基于真实完成记录计算。',
  keywords: [
    '碧蓝航线',
    '碧蓝航线统计',
    '科研产物',
    '蓝图掉落',
    '军事委托',
    '心智魔方',
    '装备设计图',
    '掉落概率',
    'AzurPilot',
    'Azur Lane'
  ],
  authors: [{ name: 'AzurPilot Team', url: 'https://stats.azurpilot.com' }],
  creator: 'AzurPilot',
  publisher: 'AzurPilot',
  formatDetection: {
    email: false,
    address: false,
    telephone: false
  },
  alternates: {
    canonical: 'https://stats.azurpilot.com/'
  },
  icons: { icon: '/logo.png', apple: '/logo.png' },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: 'https://stats.azurpilot.com/',
    siteName: 'AzurPilot 统计平台',
    title: '碧蓝航线科研与委托产物大数据统计 · AzurPilot',
    description:
      '基于全服玩家真实样本的碧蓝航线科研与委托效率分析，实时对比蓝图、设计图及资源产出。',
    images: [{ url: '/logo.png', width: 512, height: 512, alt: 'AzurPilot Logo' }]
  },
  twitter: {
    card: 'summary',
    title: '碧蓝航线科研与委托产物大数据统计 · AzurPilot',
    description:
      '基于全服玩家真实样本的碧蓝航线科研与委托效率分析，实时对比蓝图、设计图及资源产出。',
    images: ['/logo.png']
  }
}

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'AzurPilot',
  alternateName: '碧蓝航线大数据统计平台',
  url: 'https://stats.azurpilot.com/',
  description: '碧蓝航线科研与军事委托真实样本统计分析平台',
  inLanguage: 'zh-CN',
  publisher: {
    '@type': 'Organization',
    name: 'AzurPilot',
    url: 'https://stats.azurpilot.com/',
    logo: {
      '@type': 'ImageObject',
      url: 'https://stats.azurpilot.com/logo.png'
    }
  }
}

export default function Layout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" data-mode="light" data-theme="kumo">
      <head>
        <JsonLd data={websiteSchema} />
      </head>
      <body><StatisticsShell>{children}</StatisticsShell></body>
    </html>
  )
}
