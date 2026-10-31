import { useState } from 'react'
import { Badge } from '@cloudflare/kumo/components/badge'
import { Banner } from '@cloudflare/kumo/components/banner'
import { Button } from '@cloudflare/kumo/components/button'
import { Dialog } from '@cloudflare/kumo/components/dialog'
import { Input } from '@cloudflare/kumo/components/input'
import { Link } from '@cloudflare/kumo/components/link'
import { Table } from '@cloudflare/kumo/components/table'
import { api } from '../api'
import { MAINTENANCE_SERVERS, SERVER_LABELS } from '../types'
import type { Maintenance, MaintenanceServer } from '../types'
import { Card, useAction, useLoad } from '../ui'
import { formatTime } from './AnnouncementView'

function toInput(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function ServerCard({ server, plan, onChanged }: { server: MaintenanceServer; plan: Maintenance | undefined; onChanged: () => void }) {
  const [form, setForm] = useState({ name: '', startsAt: '', endsAt: '' })
  const [editing, setEditing] = useState(false)
  const [removing, setRemoving] = useState(false)
  const action = useAction()
  const edit = () => {
    setForm({ name: plan?.name ?? '', startsAt: toInput(plan?.starts_at ?? null), endsAt: toInput(plan?.ends_at ?? null) })
    setEditing(true)
  }
  const save = () => action.run(async () => {
    const payload: { name: string; starts_at: string; ends_at?: string } = { name: form.name.trim(), starts_at: new Date(form.startsAt).toISOString() }
    if (form.endsAt) payload.ends_at = new Date(form.endsAt).toISOString()
    await api.saveMaintenance(server, payload)
    setEditing(false)
    onChanged()
    return '维护计划已保存'
  })
  const remove = () => action.run(async () => {
    await api.deleteMaintenance(server)
    setRemoving(false)
    onChanged()
    return '维护计划已删除'
  })

  return (
    <>
      <Card title={SERVER_LABELS[server]} extra={<Button onClick={edit}>{plan?.source === 'official' ? '人工覆盖' : plan ? '编辑' : '设置'}</Button>}>
        <div className="admin-table-scroll"><Table><Table.Body>
          <Table.Row><Table.Head>来源</Table.Head><Table.Cell>{plan?.source === 'official' ? <Link href={plan.source_url} target="_blank" rel="noreferrer">官方公告</Link> : plan ? '人工录入' : '—'}</Table.Cell></Table.Row>
          <Table.Row><Table.Head>名称</Table.Head><Table.Cell>{plan?.name || '—'}</Table.Cell></Table.Row>
          <Table.Row><Table.Head>开始</Table.Head><Table.Cell>{plan ? formatTime(plan.starts_at) : '—'}</Table.Cell></Table.Row>
          <Table.Row><Table.Head>结束</Table.Head><Table.Cell>{plan?.ends_at ? formatTime(plan.ends_at) : plan ? '未确定' : '—'}</Table.Cell></Table.Row>
        </Table.Body></Table></div>
        {!editing && !removing && action.message && <Banner variant={action.message.kind === 'err' ? 'error' : 'secondary'}>{action.message.text}</Banner>}
        {plan && plan.source !== 'official' && <div className="admin-actions"><Button variant="secondary-destructive" disabled={action.running} onClick={() => setRemoving(true)}>{server === 'cn' ? '删除人工覆盖' : '删除计划'}</Button></div>}
      </Card>
      <Dialog.Root open={editing} onOpenChange={value => { if (!action.running) setEditing(value) }}>
        <Dialog size="lg" className="admin-dialog">
          <Dialog.Title>{SERVER_LABELS[server]}维护计划</Dialog.Title>
          <form className="admin-form" onSubmit={event => { event.preventDefault(); void save() }}>
            <Input label="名称" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} required />
            <Input label="开始时间" type="datetime-local" value={form.startsAt} onChange={event => setForm({ ...form, startsAt: event.target.value })} required />
            <Input label="结束时间（可选）" type="datetime-local" value={form.endsAt} min={form.startsAt || undefined} onChange={event => setForm({ ...form, endsAt: event.target.value })} />
            {action.message?.kind === 'err' && <Banner variant="error">{action.message.text}</Banner>}
            <div className="admin-actions admin-actions-end"><Button onClick={() => setEditing(false)} disabled={action.running}>取消</Button><Button type="submit" variant="primary" loading={action.running} disabled={!form.name.trim() || !form.startsAt}>保存</Button></div>
          </form>
        </Dialog>
      </Dialog.Root>
      <Dialog.Root open={removing} onOpenChange={value => { if (!action.running) setRemoving(value) }}>
        <Dialog className="admin-dialog">
          <Dialog.Title>删除维护计划</Dialog.Title>
          <Dialog.Description>删除{SERVER_LABELS[server]}的人工维护计划？{server === 'cn' ? '删除后恢复官方计划。' : ''}</Dialog.Description>
          {action.message?.kind === 'err' && <Banner variant="error">{action.message.text}</Banner>}
          <div className="admin-actions admin-actions-end"><Button onClick={() => setRemoving(false)} disabled={action.running}>取消</Button><Button variant="destructive" loading={action.running} onClick={() => void remove()}>删除</Button></div>
        </Dialog>
      </Dialog.Root>
    </>
  )
}

export function MaintenanceView() {
  const load = useLoad(() => api.listMaintenance(), [])
  const source = useLoad(() => api.maintenanceSource(), [])
  const action = useAction()
  const sync = () => action.run(async () => {
    try { await api.syncMaintenance(); return '官方公告同步完成' }
    finally { source.reload(); load.reload() }
  })
  const byServer = new Map<string, Maintenance>()
  for (const plan of load.data?.maintenances ?? []) byServer.set(plan.server, plan)

  return (
    <>
      {load.error && <Banner variant="error">{load.error}</Banner>}
      <Card title="国服官方公告" extra={<div className="admin-actions"><Button disabled={load.loading} onClick={load.reload}>刷新</Button><Button loading={action.running} disabled={source.loading || source.data?.running} onClick={() => void sync()}>立即同步</Button></div>}>
        {source.data && <div className="admin-table-scroll"><Table><Table.Body>
          <Table.Row><Table.Head>自动同步</Table.Head><Table.Cell><Badge variant={source.data.enabled ? 'success' : 'secondary'}>{source.data.enabled ? `每 ${source.data.interval_seconds / 60} 分钟` : '已关闭'}</Badge></Table.Cell></Table.Row>
          <Table.Row><Table.Head>最新公告</Table.Head><Table.Cell><Link href={source.data.url} target="_blank" rel="noreferrer">{source.data.title || '官方公告'}</Link></Table.Cell></Table.Row>
          <Table.Row><Table.Head>最近检查</Table.Head><Table.Cell>{source.data.checked_at ? formatTime(source.data.checked_at) : '—'}</Table.Cell></Table.Row>
          <Table.Row><Table.Head>最近成功</Table.Head><Table.Cell>{source.data.synced_at ? formatTime(source.data.synced_at) : '—'}</Table.Cell></Table.Row>
          <Table.Row><Table.Head>状态</Table.Head><Table.Cell>{source.data.error || (source.data.running ? '同步中' : source.data.synced_at ? '正常' : '等待同步')}</Table.Cell></Table.Row>
        </Table.Body></Table></div>}
        {source.error && <Banner variant="error">{source.error}</Banner>}
        {action.message && <Banner variant={action.message.kind === 'err' ? 'error' : 'secondary'}>{action.message.text}</Banner>}
      </Card>
      <div className="admin-columns">{MAINTENANCE_SERVERS.map(server => <ServerCard key={server} server={server} plan={byServer.get(server)} onChanged={load.reload} />)}</div>
    </>
  )
}
