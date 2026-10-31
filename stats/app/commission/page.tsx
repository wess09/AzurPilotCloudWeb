import type { Metadata } from 'next'
import { PublicStatistics } from '../../../src/views/PublicStatistics'
export const metadata: Metadata = { title: '军事委托分析' }
export default function Page() {
  return <PublicStatistics scene="commission" />
}
