import type { MetadataRoute } from 'next'

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  const buildDate = new Date()
  return [
    {
      url: 'https://stats.azurpilot.com/',
      lastModified: buildDate,
      changeFrequency: 'daily',
      priority: 1.0
    },
    {
      url: 'https://stats.azurpilot.com/commission/',
      lastModified: buildDate,
      changeFrequency: 'daily',
      priority: 0.9
    },
    {
      url: 'https://stats.azurpilot.com/methodology/',
      lastModified: buildDate,
      changeFrequency: 'monthly',
      priority: 0.5
    }
  ]
}
