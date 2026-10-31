import { Badge } from '@cloudflare/kumo/components/badge'
import { Banner } from '@cloudflare/kumo/components/banner'
import { Button } from '@cloudflare/kumo/components/button'
import { Table } from '@cloudflare/kumo/components/table'
import { Text } from '@cloudflare/kumo/components/text'
import { api } from '../api'
import { Card, useLoad } from '../ui'
import { formatTime } from './AnnouncementView'

const WORKERS = [{ key: 'ap-notice', label: '公告' }, { key: 'ap-update-policy', label: '更新策略' }]

export function PublishStatusView() {
  const load = useLoad(() => api.publishStatus(), [])
  const history = load.data?.publish_history ?? {}
  return (
    <Card title="Worker 发布记录" extra={<Button disabled={load.loading} onClick={load.reload}>刷新</Button>}>
      {load.error && <Banner variant="error">{load.error}</Banner>}
      <div className="admin-table-scroll"><Table>
        <Table.Header><Table.Row><Table.Head>Worker</Table.Head><Table.Head>状态</Table.Head><Table.Head>内容摘要</Table.Head><Table.Head>时间</Table.Head><Table.Head>错误</Table.Head></Table.Row></Table.Header>
        <Table.Body>{WORKERS.map(worker => {
          const record = history[worker.key]
          return <Table.Row key={worker.key}>
            <Table.Cell><Text>{worker.label}</Text><Text variant="secondary">{worker.key}</Text></Table.Cell>
            <Table.Cell>{record ? <Badge variant={record.status === 'success' ? 'success' : record.status === 'failed' ? 'error' : 'warning'}>{record.status === 'success' ? '成功' : record.status === 'failed' ? '失败' : '仅本地'}</Badge> : load.loading ? '加载中…' : '未发布'}</Table.Cell>
            <Table.Cell><code>{record?.content_hash || '—'}</code></Table.Cell>
            <Table.Cell>{record ? formatTime(record.created_at) : '—'}</Table.Cell><Table.Cell className="admin-pre">{record?.error || '—'}</Table.Cell>
          </Table.Row>
        })}</Table.Body>
      </Table></div>
    </Card>
  )
}
