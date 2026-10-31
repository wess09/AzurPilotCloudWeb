import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: '科研产物分析 · AzurPilot', template: '%s · AzurPilot' },
  description:
    '碧蓝航线科研与军事委托产物统计。按真实样本比较蓝图、装备设计图与资源的获取效率。'
}
export default function Layout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" data-mode="light" data-theme="kumo">
      <body>{children}</body>
    </html>
  )
}
