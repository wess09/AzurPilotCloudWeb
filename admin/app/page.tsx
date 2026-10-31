'use client'
import dynamic from 'next/dynamic'
const Admin = dynamic(
  () => import('../../src/App').then((module) => module.App),
  { ssr: false, loading: () => <p role="status">正在加载管理面板…</p> }
)
export default function Page() {
  return <Admin />
}
