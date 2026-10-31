import type { Metadata } from 'next'
import { PublicStatistics } from '../../../src/views/PublicStatistics'
import { JsonLd } from '../../../src/components/seo/JsonLd'

export const metadata: Metadata = {
  title: '军事委托产物与资源收益统计',
  description:
    '碧蓝航线日常委托、紧急委托与夜间委托产物统计。对比心智魔方、物资、石油、快速完成工具与舰娘经验的获取效率与极值分布。',
  keywords: [
    '碧蓝航线委托',
    '军事委托',
    '心智魔方委托',
    '魔方收益',
    '委托石油',
    '委托物资',
    '委托效率统计',
    '紧急委托掉落'
  ],
  alternates: {
    canonical: 'https://stats.azurpilot.com/commission/'
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    siteName: 'AzurPilot 统计平台',
    title: '军事委托产物与资源收益统计 · AzurPilot',
    description:
      '全服真实委托记录：心智魔方、物资、石油等核心资源的每小时平均产出与概率分析。',
    url: 'https://stats.azurpilot.com/commission/',
    images: [
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: 'AzurPilot 军事委托统计'
      }
    ]
  },
  twitter: {
    card: 'summary',
    title: '军事委托产物与资源收益统计 · AzurPilot',
    description:
      '全服真实委托记录：心智魔方、物资、石油等核心资源的每小时平均产出与概率分析。',
    images: ['/logo.png']
  }
}

const datasetSchema = {
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: '碧蓝航线军事委托产物与资源收益统计数据集',
  description:
    '基于真实完成记录计算的碧蓝航线军事委托（日常/紧急/夜间）样本量、心智魔方、物资、石油掉落概率与每小时产出效率统计数据。',
  url: 'https://stats.azurpilot.com/commission/',
  keywords: ['碧蓝航线', '军事委托', '心智魔方', '石油收益', '物资收益'],
  license: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
  isAccessibleForFree: true,
  creator: {
    '@type': 'Organization',
    name: 'AzurPilot',
    url: 'https://stats.azurpilot.com/'
  },
  distribution: [
    {
      '@type': 'DataDownload',
      encodingFormat: 'text/csv',
      contentUrl: 'https://api.azurpilot.com/api/v3/get/analysis'
    }
  ]
}

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: '首页',
      item: 'https://stats.azurpilot.com/'
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: '军事委托',
      item: 'https://stats.azurpilot.com/commission/'
    }
  ]
}

export default function Page() {
  return (
    <>
      <JsonLd data={datasetSchema} />
      <JsonLd data={breadcrumbSchema} />
      <PublicStatistics scene="commission" />
    </>
  )
}
