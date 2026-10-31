import type { Metadata } from 'next'
import { Methodology } from '../../../src/views/Methodology'
import { JsonLd } from '../../../src/components/seo/JsonLd'

export const metadata: Metadata = {
  title: { absolute: 'AzurPilot 碧蓝统计署 | 统计口径' },
  description:
    'AzurPilot 统计平台计算规则与指标定义：有效样本门槛、同任务多产物命中去重、单次与每小时平均产量计算公式、额外奖励与大成功处理口径。',
  keywords: [
    'AzurPilot统计口径',
    '掉落率计算规则',
    '每小时产量算法',
    '样本筛选门槛',
    '碧蓝航线数据来源'
  ],
  alternates: {
    canonical: 'https://stats.azurpilot.com/methodology/'
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    siteName: 'AzurPilot 碧蓝统计署',
    title: 'AzurPilot 碧蓝统计署 | 统计口径',
    description:
      '详细说明 AzurPilot 统计指标计算公式、样本去重与极值统计规则，公开透明的数据处理标准。',
    url: 'https://stats.azurpilot.com/methodology/',
    images: [
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: 'AzurPilot 统计口径'
      }
    ]
  },
  twitter: {
    card: 'summary',
    title: 'AzurPilot 碧蓝统计署 | 统计口径',
    description:
      '详细说明 AzurPilot 统计指标计算公式、样本去重与极值统计规则，公开透明的数据处理标准。',
    images: ['/logo.png']
  }
}

const techArticleSchema = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: 'AzurPilot 统计口径、计算规则与数据来源',
  description:
    'AzurPilot 统计平台针对碧蓝航线科研与委托产物统计的定义、样本筛选门槛、每小时产量与极值计算公式。',
  url: 'https://stats.azurpilot.com/methodology/',
  inLanguage: 'zh-CN',
  articleSection: '游戏数据统计与数据挖掘算法',
  about: ['碧蓝航线', '掉落率统计', '样本门槛', '极值分析'],
  author: {
    '@type': 'Organization',
    name: 'AzurPilot',
    url: 'https://stats.azurpilot.com/'
  },
  publisher: {
    '@type': 'Organization',
    name: 'AzurPilot',
    logo: {
      '@type': 'ImageObject',
      url: 'https://stats.azurpilot.com/logo.png'
    }
  }
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
      name: '统计口径',
      item: 'https://stats.azurpilot.com/methodology/'
    }
  ]
}

export default function Page() {
  return (
    <>
      <JsonLd data={techArticleSchema} />
      <JsonLd data={breadcrumbSchema} />
      <Methodology />
    </>
  )
}
