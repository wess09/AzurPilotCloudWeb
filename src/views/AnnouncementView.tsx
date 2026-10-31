import { useEffect, useState } from 'react'
import { Banner } from '@cloudflare/kumo/components/banner'
import { Button } from '@cloudflare/kumo/components/button'
import { Dialog } from '@cloudflare/kumo/components/dialog'
import { Empty } from '@cloudflare/kumo/components/empty'
import { Input, InputArea } from '@cloudflare/kumo/components/input'
import { Link } from '@cloudflare/kumo/components/link'
import { Table } from '@cloudflare/kumo/components/table'
import { api } from '../api'
import type { PublishResult } from '../types'
import { Card, PublishBadge, useAction, useLoad } from '../ui'

export function AnnouncementView() {
  const load = useLoad(() => api.getAnnouncement(), [])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [url, setUrl] = useState('')
  const [withdrawing, setWithdrawing] = useState(false)
  const action = useAction()
  const [lastPublish, setLastPublish] = useState<PublishResult | null>(null)
  const current = load.data?.announcement

  useEffect(() => {
    if (current) {
      setTitle(current.title)
      setContent(current.content ?? '')
      setUrl(current.url ?? '')
    }
  }, [current?.id])

  const publish = () => action.run(async () => {
    const payload: { title: string; content?: string; url?: string } = { title: title.trim() }
    if (content.trim()) payload.content = content.trim()
    if (url.trim()) payload.url = url.trim()
    const result = await api.publishAnnouncement(payload)
    setLastPublish(result.publish)
    load.reload()
    return `公告 ${result.announcement.id} 已保存`
  })

  const withdraw = () => action.run(async () => {
    const result = await api.withdrawAnnouncement()
    setLastPublish(result.publish)
    load.reload()
    setTitle('')
    setContent('')
    setUrl('')
    setWithdrawing(false)
    return '公告已撤回'
  })

  return (
    <>
      {load.error && <Banner variant="error">{load.error}</Banner>}
      {action.message && <Banner variant={action.message.kind === 'err' ? 'error' : 'secondary'}>{action.message.text}</Banner>}
      <PublishBadge publish={lastPublish} />
      <div className="admin-columns">
        <Card title="编辑公告">
          <form className="admin-form" onSubmit={event => { event.preventDefault(); void publish() }}>
            <Input label="标题" value={title} onChange={event => setTitle(event.target.value)} required />
            <InputArea label="内容" rows={6} value={content} onChange={event => setContent(event.target.value)} />
            <Input label="链接" type="url" value={url} onChange={event => setUrl(event.target.value)} placeholder="https://" />
            <div className="admin-actions">
              <Button type="submit" variant="primary" loading={action.running} disabled={!title.trim() || (!content.trim() && !url.trim())}>保存并发布</Button>
              {current && <Button variant="secondary-destructive" disabled={action.running} onClick={() => setWithdrawing(true)}>撤回公告</Button>}
            </div>
          </form>
        </Card>
        <Card title="当前公告">
          {current ? <div className="admin-table-scroll"><Table><Table.Body>
            <Table.Row><Table.Head>标题</Table.Head><Table.Cell>{current.title}</Table.Cell></Table.Row>
            <Table.Row><Table.Head>内容</Table.Head><Table.Cell className="admin-pre">{current.content || '—'}</Table.Cell></Table.Row>
            <Table.Row><Table.Head>链接</Table.Head><Table.Cell>{current.url ? <Link href={current.url} target="_blank" rel="noreferrer">{current.url}</Link> : '—'}</Table.Cell></Table.Row>
            <Table.Row><Table.Head>公告 ID</Table.Head><Table.Cell><code>{current.id}</code></Table.Cell></Table.Row>
            <Table.Row><Table.Head>更新时间</Table.Head><Table.Cell>{formatTime(current.updated_at)}</Table.Cell></Table.Row>
          </Table.Body></Table></div> : <Empty title={load.loading ? '加载中…' : '无有效公告'} />}
        </Card>
      </div>
      <Dialog.Root open={withdrawing} onOpenChange={setWithdrawing}>
        <Dialog className="admin-dialog">
          <Dialog.Title>撤回公告</Dialog.Title>
          <Dialog.Description>撤回“{current?.title}”？</Dialog.Description>
          <div className="admin-actions admin-actions-end"><Button onClick={() => setWithdrawing(false)} disabled={action.running}>取消</Button><Button variant="destructive" loading={action.running} onClick={() => void withdraw()}>撤回</Button></div>
          {action.message?.kind === 'err' && <Banner variant="error">{action.message.text}</Banner>}
        </Dialog>
      </Dialog.Root>
    </>
  )
}

export function formatTime(iso: string): string {
  if (!iso || iso.startsWith('0001-')) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('zh-CN', { hour12: false })
}
