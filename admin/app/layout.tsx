import type { Metadata } from 'next'
import '../../src/styles.css'
export const metadata: Metadata = {
  icons: { icon: '/logo.png', apple: '/logo.png' },
  title: 'AzurPilot 管理后台',
  robots: { index: false, follow: false }
}
export default function Layout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
