'use client'
import dynamic from 'next/dynamic'
import { Text } from '@cloudflare/kumo/components/text'
const Admin = dynamic(
  () => import('../../src/App').then((module) => module.App),
  { ssr: false, loading: () => <div className="admin-login" role="status"><Text>加载中…</Text></div> }
)
export default function Page() {
  return <Admin />
}
