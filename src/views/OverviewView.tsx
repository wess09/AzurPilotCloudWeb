import { Badge } from '@cloudflare/kumo/components/badge'
import { Banner } from '@cloudflare/kumo/components/banner'
import { Button } from '@cloudflare/kumo/components/button'
import { Empty } from '@cloudflare/kumo/components/empty'
import { Table } from '@cloudflare/kumo/components/table'
import { Text } from '@cloudflare/kumo/components/text'
import { api } from '../api'
import type { Maintenance, PublishRecord } from '../types'
import { SERVER_LABELS, MAINTENANCE_SERVERS } from '../types'
import { Card, useLoad } from '../ui'
import { formatTime } from './AnnouncementView'

export function OverviewView({ onNavigate }: { onNavigate: (section: string) => void }) {
  const announcement = useLoad(() => api.getAnnouncement(), [])
  const policy = useLoad(() => api.getUpdatePolicy(), [])
  const maintenance = useLoad(() => api.listMaintenance(), [])
  const publish = useLoad(() => api.publishStatus(), [])
  const current = announcement.data?.announcement
  const plans = (maintenance.data?.maintenances ?? []).filter((plan: Maintenance) =>
    MAINTENANCE_SERVERS.includes(plan.server as (typeof MAINTENANCE_SERVERS)[number]) && (!plan.ends_at || new Date(plan.ends_at) >= new Date())
  )
  const records: PublishRecord[] = Object.values(publish.data?.publish_history ?? {}).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return (
    <>
      {[announcement.error, policy.error, maintenance.error, publish.error].filter(Boolean).map((error, index) => <Banner key={index} variant="error">{error}</Banner>)}
      <div className="admin-summary-grid">
        <Card title="公告">
          <Text>{announcement.loading && !announcement.data ? '加载中…' : current?.title || '无有效公告'}</Text>
          {current && <Text variant="secondary">{formatTime(current.updated_at)}</Text>}
        </Card>
        <Card title="更新策略">
          {policy.data ? <Badge variant={policy.data.force_update ? 'warning' : 'success'}>{policy.data.force_update ? '强制更新' : '正常更新'}</Badge> : <Text variant="secondary">{policy.loading ? '加载中…' : '—'}</Text>}
        </Card>
        <Card title="维护计划">
          <Text>{maintenance.data ? `${plans.length} 个区服` : maintenance.loading ? '加载中…' : '—'}</Text>
          {plans.length > 0 && <Text variant="secondary">{plans.map(plan => SERVER_LABELS[plan.server as keyof typeof SERVER_LABELS] ?? plan.server).join('、')}</Text>}
        </Card>
      </div>
      <Card title="最近发布" extra={<Button variant="ghost" onClick={() => onNavigate('publish')}>查看全部</Button>}>
        {records.length ? <div className="admin-table-scroll"><Table>
          <Table.Header><Table.Row><Table.Head>Worker</Table.Head><Table.Head>状态</Table.Head><Table.Head>内容摘要</Table.Head><Table.Head>时间</Table.Head></Table.Row></Table.Header>
          <Table.Body>{records.map(record => <Table.Row key={record.worker}>
            <Table.Cell>{record.worker}</Table.Cell>
            <Table.Cell><Badge variant={record.status === 'success' ? 'success' : record.status === 'failed' ? 'error' : 'warning'}>{record.status === 'success' ? '成功' : record.status === 'failed' ? '失败' : '仅本地'}</Badge></Table.Cell>
            <Table.Cell><code>{record.content_hash || '—'}</code></Table.Cell><Table.Cell>{formatTime(record.created_at)}</Table.Cell>
          </Table.Row>)}</Table.Body>
        </Table></div> : <Empty title={publish.loading ? '加载中…' : '暂无发布记录'} />}
      </Card>
    </>
  )
}
