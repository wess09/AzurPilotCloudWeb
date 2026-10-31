import type { Metadata } from 'next'
import { PublicStatistics } from '../../src/views/PublicStatistics'
import { JsonLd } from '../../src/components/seo/JsonLd'

export const metadata: Metadata = {
  title: { absolute: 'AzurPilot 碧蓝统计署 | 科研统计' },
  description:
    '碧蓝航线历期科研项目（一期至七期）真实产物掉落统计分析。提供决战方案舰与最高方案舰蓝图、天雷等装备设计图、心智单元的命中概率、单次产出及每小时产量排行。',
  keywords: [
    '碧蓝航线科研',
    '科研蓝图',
    '决战方案舰',
    '最高方案舰',
    '科研装备设计图',
    '科研掉率',
    '科研收益排行',
    '天雷设计图',
    '埃吉尔蓝图'
  ],
  alternates: {
    canonical: 'https://stats.azurpilot.com/'
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    siteName: 'AzurPilot 碧蓝统计署',
    title: 'AzurPilot 碧蓝统计署 | 科研统计',
    description:
      '真实样本科研统计：决战/最高方案舰蓝图掉率、彩装设计图产出与每小时收益排行。',
    url: 'https://stats.azurpilot.com/',
    images: [
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: 'AzurPilot 科研产物统计'
      }
    ]
  },
  twitter: {
    card: 'summary',
    title: 'AzurPilot 碧蓝统计署 | 科研统计',
    description:
      '真实样本科研统计：决战/最高方案舰蓝图掉率、彩装设计图产出与每小时收益排行。',
    images: ['/logo.png']
  }
}

const datasetSchema = {
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: '碧蓝航线科研产物与蓝图掉落分析数据集',
  description:
    '基于真实完成记录计算的碧蓝航线历期科研项目样本、命中概率、最小/最大数量、单次及每小时平均产量统计数据。',
  url: 'https://stats.azurpilot.com/',
  keywords: ['碧蓝航线', '科研蓝图', '装备设计图', '心智单元', '收益率'],
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
      name: '科研产物',
      item: 'https://stats.azurpilot.com/'
    }
  ]
}

export default function Page() {
  return (
    <>
      <JsonLd data={datasetSchema} />
      <JsonLd data={breadcrumbSchema} />
      <PublicStatistics scene="research" />
    </>
  )
}
