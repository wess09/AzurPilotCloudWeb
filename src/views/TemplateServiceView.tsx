import { useState } from 'react'
import { Badge } from '@cloudflare/kumo/components/badge'
import { Banner } from '@cloudflare/kumo/components/banner'
import { Button } from '@cloudflare/kumo/components/button'
import { Dialog } from '@cloudflare/kumo/components/dialog'
import { Empty } from '@cloudflare/kumo/components/empty'
import { Input } from '@cloudflare/kumo/components/input'
import { Link } from '@cloudflare/kumo/components/link'
import { Pagination } from '@cloudflare/kumo/components/pagination'
import { Select } from '@cloudflare/kumo/components/select'
import { Table } from '@cloudflare/kumo/components/table'
import { Tabs } from '@cloudflare/kumo/components/tabs'
import { Text } from '@cloudflare/kumo/components/text'
import { X } from '@phosphor-icons/react'
import { templateRPC } from '../rpc'
import { Card, useAction, useLoad } from '../ui'
import { TemplateScreenshots } from './TemplateScreenshots'
import { formatTime } from './AnnouncementView'

type Mapping = { item_id: string; name: string; tag: string }
type Template = { id: string; canonical_id: string; name: string; tag: string; kind: 'formal' | 'temporary'; hits: number; image_base64: string; screenshot_count: number; draft: Mapping | null }
type Release = { revision: number; status: 'building' | 'deployed' | 'failed'; note: string; error: string; created_at: string }
type Status = { revision: number; drafts: number; pending_events: number; pending_publications: number; deploy_mode: string; public_base: string; main_event_configured: boolean; release: Release | null; last_delivery: { last_error: string; attempts: number } | null }

export function TemplateServiceView() {
  const [tab, setTab] = useState('templates')
  const [filter, setFilter] = useState('temporary')
  const [offset, setOffset] = useState(0)
  const [pulse, setPulse] = useState(0)
  const [selected, setSelected] = useState<Template | null>(null)
  const [mapping, setMapping] = useState<Mapping>({ item_id: '', name: '', tag: '' })
  const [formal, setFormal] = useState<Mapping>({ item_id: '', name: '', tag: '' })
  const [file, setFile] = useState<File | null>(null)
  const status = useLoad(() => templateRPC.state<Status>(), [pulse], 'templates')
  const rows = useLoad(() => templateRPC.request<{ items: Template[] }>('templates.list', { limit: 50, offset, ...(filter ? { kind: filter } : {}) }), [filter, offset, pulse], 'templates')
  const releases = useLoad(() => templateRPC.request<{ items: Release[] }>('releases.list'), [pulse], 'templates')
  const action = useAction()
  const refresh = () => setPulse(value => value + 1)
  const choose = (row: Template) => {
    setSelected(row)
    setMapping(row.draft ?? { item_id: row.kind === 'formal' ? row.canonical_id : '', name: row.name, tag: row.tag })
  }
  const publish = () => action.run(async () => {
    const result = await templateRPC.request<{ request_id: number }>('publish', { note: '管理后台发布模板映射' })
    refresh()
    return `发布任务 #${result.request_id} 已排队`
  })
  const saveMapping = () => action.run(async () => {
    if (!selected) throw new Error('请选择模板')
    await templateRPC.request('mappings.save', { unknown_id: selected.id, ...mapping })
    refresh()
    return `${selected.id} → ${mapping.item_id} 已保存为草稿`
  })
  const importTemplate = () => action.run(async () => {
    if (!file) throw new Error('请选择 PNG 模板')
    if (file.size > 256 * 1024) throw new Error('模板文件不能超过 256KB')
    const image_base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(new Error('无法读取模板文件'))
      reader.onload = () => resolve(String(reader.result).split(',')[1])
      reader.readAsDataURL(file)
    })
    await templateRPC.request('templates.import', { ...formal, image_base64 })
    refresh()
    return `模板 ${formal.item_id} 已导入，等待发布`
  })

  return (
    <>
      {status.error && <Banner variant="error">{status.error}</Banner>}
      {action.message && !selected && <Banner variant={action.message.kind === 'err' ? 'error' : 'secondary'}>{action.message.text}</Banner>}
      {status.data && <Card title="分发状态" extra={<div className="admin-actions"><Badge variant="secondary">版本 {status.data.revision}</Badge><Button onClick={refresh}>刷新</Button><Button variant="primary" loading={action.running} onClick={() => void publish()}>发布映射{status.data.drafts ? `（${status.data.drafts}）` : ''}</Button></div>}>
        <div className="admin-template-metrics">
          <div><Text variant="secondary">映射草稿</Text><Text>{status.data.drafts}</Text></div>
          <div><Text variant="secondary">排队发布</Text><Text>{status.data.pending_publications}</Text></div>
          <div><Text variant="secondary">待同步事件</Text><Text>{status.data.pending_events}</Text></div>
        </div>
        {status.data.public_base && <Link href={status.data.public_base} target="_blank" rel="noreferrer">{status.data.public_base}</Link>}
        {status.data.deploy_mode !== 'cloudflare' && <Banner variant="alert">仅本地生成，未发布</Banner>}
        {!status.data.main_event_configured && <Banner variant="alert">主服务同步未配置</Banner>}
        {status.data.release?.error && <Banner variant="error">{status.data.release.error}</Banner>}
        {status.data.last_delivery?.last_error && <Banner variant="error">同步重试中：{status.data.last_delivery.last_error}</Banner>}
      </Card>}
      <Tabs value={tab} onValueChange={value => { setTab(value); setFile(null) }} tabs={[{ value: 'templates', label: '模板' }, { value: 'import', label: '导入模板' }, { value: 'releases', label: '发布记录' }]} indicatorClassName="motion-reduce:transition-none" />
      {tab === 'templates' && <Card title="模板列表" extra={<Select aria-label="模板类型" value={filter} items={{ temporary: '未知模板', formal: '正式模板', '': '全部模板' }} onValueChange={value => { setFilter(value ?? ''); setOffset(0); setSelected(null) }} />}>
        {rows.error && <Banner variant="error">{rows.error}</Banner>}
        {rows.data?.items.length ? <div className="admin-table-scroll"><Table>
          <Table.Header><Table.Row><Table.Head>名称</Table.Head><Table.Head>编号</Table.Head><Table.Head>状态</Table.Head><Table.Head>匹配次数</Table.Head><Table.Head>原图</Table.Head></Table.Row></Table.Header>
          <Table.Body>{rows.data.items.map(row => <Table.Row key={row.id}>
            <Table.Cell><div className="admin-template-name"><img src={`data:image/png;base64,${row.image_base64}`} alt="" width={49} height={49} /><Button variant="ghost" onClick={() => choose(row)}>{row.name || row.canonical_id || row.id}</Button></div></Table.Cell>
            <Table.Cell><code>{row.id}</code></Table.Cell>
            <Table.Cell><Badge variant={row.draft ? 'warning' : row.kind === 'formal' ? 'success' : 'secondary'}>{row.draft ? '映射待发布' : row.kind === 'formal' ? '正式' : '未知'}</Badge></Table.Cell>
            <Table.Cell>{row.hits}</Table.Cell><Table.Cell>{row.screenshot_count ?? 0}</Table.Cell>
          </Table.Row>)}</Table.Body>
        </Table></div> : <Empty title={rows.loading ? '读取模板…' : '暂无模板'} />}
        {(offset > 0 || (rows.data?.items.length ?? 0) === 50) && <Pagination page={offset / 50 + 1} perPage={50} hasNextPage={(rows.data?.items.length ?? 0) === 50} setPage={page => { setOffset((page - 1) * 50); setSelected(null) }} labels={{ navigation: '模板分页', previousPage: '上一页模板', nextPage: '下一页模板' }} controls="simple" />}
      </Card>}
      {tab === 'import' && <Card title="导入正式模板">
        <form className="admin-form admin-import-form" onSubmit={event => { event.preventDefault(); void importTemplate() }}>
          <Input label="正式物品 ID" required maxLength={128} value={formal.item_id} onChange={event => setFormal({ ...formal, item_id: event.target.value })} />
          <Input label="物品名称" required maxLength={128} value={formal.name} onChange={event => setFormal({ ...formal, name: event.target.value })} />
          <Input label="标签（可选）" maxLength={32} value={formal.tag} onChange={event => setFormal({ ...formal, tag: event.target.value })} />
          <Input label="PNG（49×49 或 96×96，≤256KB）" type="file" required accept="image/png" onChange={event => setFile(event.target.files?.[0] ?? null)} />
          <div className="admin-actions"><Button type="submit" variant="primary" loading={action.running}>导入模板</Button></div>
        </form>
      </Card>}
      {tab === 'releases' && <Card title="发布记录">
        {releases.error && <Banner variant="error">{releases.error}</Banner>}
        {releases.data?.items.length ? <div className="admin-table-scroll"><Table>
          <Table.Header><Table.Row><Table.Head>版本</Table.Head><Table.Head>状态</Table.Head><Table.Head>备注</Table.Head><Table.Head>时间</Table.Head><Table.Head>错误</Table.Head></Table.Row></Table.Header>
          <Table.Body>{releases.data.items.map(release => <Table.Row key={release.revision}>
            <Table.Cell>{release.revision}</Table.Cell><Table.Cell><Badge variant={release.status === 'deployed' ? 'success' : release.status === 'failed' ? 'error' : 'warning'}>{release.status === 'deployed' ? '已发布' : release.status === 'failed' ? '失败，待重试' : '发布中'}</Badge></Table.Cell>
            <Table.Cell>{release.note || '—'}</Table.Cell><Table.Cell>{formatTime(release.created_at)}</Table.Cell><Table.Cell className="admin-pre">{release.error || '—'}</Table.Cell>
          </Table.Row>)}</Table.Body>
        </Table></div> : <Empty title={releases.loading ? '加载中…' : '暂无发布记录'} />}
      </Card>}
      <Dialog.Root open={selected !== null} onOpenChange={open => { if (!open && !action.running) setSelected(null) }}>
        <Dialog size="xl" className="admin-dialog">
          <div className="admin-card-heading"><Dialog.Title>{selected?.name || selected?.id || '模板'}</Dialog.Title><Button variant="ghost" shape="square" aria-label="关闭模板" disabled={action.running} onClick={() => setSelected(null)}><X size={18} /></Button></div>
          {selected && <>
            <Text variant="secondary">{selected.id}</Text>
            {selected.id.startsWith('U-') && <form className="admin-form" onSubmit={event => { event.preventDefault(); void saveMapping() }}>
              <div className="admin-mapping-fields">
                <Input label="正式物品 ID" required maxLength={128} value={mapping.item_id} onChange={event => setMapping({ ...mapping, item_id: event.target.value })} />
                <Input label="物品名称" required maxLength={128} value={mapping.name} onChange={event => setMapping({ ...mapping, name: event.target.value })} />
                <Input label="标签（可选）" maxLength={32} value={mapping.tag} onChange={event => setMapping({ ...mapping, tag: event.target.value })} />
              </div>
              <div className="admin-actions"><Button type="submit" variant="primary" loading={action.running}>保存映射草稿</Button></div>
            </form>}
            {action.message && <Banner variant={action.message.kind === 'err' ? 'error' : 'secondary'}>{action.message.text}</Banner>}
            <TemplateScreenshots key={selected.id} identity={selected.id} />
          </>}
        </Dialog>
      </Dialog.Root>
    </>
  )
}
