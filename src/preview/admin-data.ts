import type { Announcement, Maintenance, MaintenanceSource, PublishRecord } from '../types'
import icons from './icons.json'
import type { ItemIdentity } from '../components/ItemIdentityFields'

const startedAt = Date.now()
const time = (minutes = 0) => new Date(startedAt + minutes * 60000).toISOString()
const publishResult = { success: true, skipped: false, error: '' }
let sequence = 24

let announcement: Announcement | null = {
  id: 'preview-notice-001',
  title: '版本更新公告',
  content: '## 本次更新\n\n- 科研与军事委托产物统计\n- 按产物、期数和任务时长筛选\n- 模板映射及原始截图管理\n\n> 此处为界面预览数据。\n\n### 维护安排\n\n| 区服 | 开始时间 | 预计结束 |\n| :--- | :--- | :--- |\n| 国服 | 10:00 | 16:00 |\n| 国际服 | 11:00 | 15:00 |\n\n### 发布清单\n\n- [x] 公告内容已更新\n- [x] 统计页面已发布\n- [ ] 模板映射待发布\n\n```json\n{ "force_update": false }\n```\n\n[查看更新记录](https://github.com/wess09/AzurPilotCloudWeb)',
  url: 'https://github.com/wess09/AzurPilotCloudWeb',
  active: true,
  updated_at: time(-18)
}
let forceUpdate = false
let maintenances: Maintenance[] = [
  { server: 'cn', name: '国服版本维护', starts_at: time(60), ends_at: time(300), updated_at: time(-12), source: 'official', source_url: 'https://game.bilibili.com/blhx/' },
  { server: 'en', name: '国际服例行维护', starts_at: time(120), ends_at: time(360), updated_at: time(-35), source: 'manual' },
  { server: 'jp', name: '日服临时维护', starts_at: time(180), ends_at: null, updated_at: time(-40), source: 'manual' }
]
const maintenanceSource: MaintenanceSource = {
  server: 'cn', title: '国服版本维护公告', url: 'https://game.bilibili.com/blhx/', plan: maintenances[0],
  checked_at: time(-2), synced_at: time(-12), error: '', enabled: true, interval_seconds: 600, running: false
}
const history: Record<string, PublishRecord> = {
  'ap-notice': { worker: 'ap-notice', content_hash: '8b18e41e2c6a9d30', status: 'success', created_at: time(-18) },
  'ap-update-policy': { worker: 'ap-update-policy', content_hash: 'a4d792f31f8b54ce', status: 'success', created_at: time(-25) }
}

type Mapping = ItemIdentity
type Template = { id: string; canonical_id: string; name: string; tag: string; kind: 'formal' | 'temporary'; hits: number; image_base64: string; screenshot_count: number; draft: Mapping | null; discarded?: boolean; metadata?: Mapping['metadata'] }
const templates: Template[] = [
  { id: 'U-000128', canonical_id: 'U-000128', name: '埃吉尔蓝图', tag: 'blueprint', kind: 'temporary', hits: 283, image_base64: icons.agir, screenshot_count: 0, draft: { item_id: 'BlueprintAgir', name: '埃吉尔蓝图', tag: 'blueprint' } },
  { id: 'U-000129', canonical_id: 'U-000129', name: '白龙蓝图', tag: 'blueprint', kind: 'temporary', hits: 147, image_base64: icons.hakuryu, screenshot_count: 0, draft: null },
  { id: 'U-000130', canonical_id: 'U-000130', name: '伊吹蓝图', tag: 'blueprint', kind: 'temporary', hits: 96, image_base64: icons.ibuki, screenshot_count: 0, draft: null },
  { id: 'U-000131', canonical_id: 'U-000131', name: '普利茅斯蓝图', tag: 'blueprint', kind: 'temporary', hits: 412, image_base64: icons.plymouth, screenshot_count: 0, draft: { item_id: 'BlueprintPlymouth', name: '普利茅斯蓝图', tag: 'blueprint' } },
  { id: 'Cubes', canonical_id: 'Cubes', name: '心智魔方', tag: 'resource', kind: 'formal', hits: 2486, image_base64: icons.cube, screenshot_count: 0, draft: null },
  { id: 'BlueprintAgir', canonical_id: 'BlueprintAgir', name: '埃吉尔蓝图', tag: 'blueprint', kind: 'formal', hits: 1328, image_base64: icons.agir, screenshot_count: 0, draft: null }
]
const releases = [
  { revision: 24, status: 'deployed', note: '科研蓝图模板更新', error: '', created_at: time(-15) },
  { revision: 23, status: 'deployed', note: '委托奖励映射更新', error: '', created_at: time(-90) },
  { revision: 22, status: 'deployed', note: '补充正式模板变体', error: '', created_at: time(-210) }
]
const clone = <T,>(value: T): T => structuredClone(value)
const changed = (source: 'main' | 'templates') => queueMicrotask(() => window.dispatchEvent(new Event(`ap:${source}-state`)))
const mainState = () => ({ announcement, force_update: forceUpdate, maintenances, maintenance_source: maintenanceSource, publish_history: history })
const templateState = () => ({ revision: sequence, drafts: templates.filter(row => row.draft).length, pending_events: 0, pending_publications: 0, deploy_mode: 'cloudflare', public_base: 'https://templates.azurpilot.com', main_event_configured: true, release: releases[0], last_delivery: { last_error: '', attempts: 0 } })

export async function previewRequest(source: 'main' | 'templates', method: string, params: unknown): Promise<unknown> {
  const values = (params ?? {}) as Record<string, unknown>
  const text = (key: string) => String(values[key] ?? '')
  if (method === 'state.subscribe') return clone(source === 'main' ? mainState() : templateState())
  let result: unknown
  if (source === 'main') {
    switch (method) {
      case 'announcement.publish':
        announcement = { id: `preview-notice-${++sequence}`, title: text('title'), content: text('content') || null, url: text('url') || null, active: true, updated_at: new Date().toISOString() }
        result = { announcement, publish: publishResult }
        break
      case 'announcement.withdraw': announcement = null; result = { publish: publishResult }; break
      case 'update_policy.set': forceUpdate = Boolean(values.force_update); result = { force_update: forceUpdate, publish: publishResult }; break
      case 'maintenance.sync': maintenanceSource.checked_at = new Date().toISOString(); maintenanceSource.synced_at = maintenanceSource.checked_at; result = maintenanceSource; break
      case 'maintenance.save': {
        const plan: Maintenance = { server: text('server'), name: text('name'), starts_at: text('starts_at'), ends_at: text('ends_at') || null, source: 'manual', updated_at: new Date().toISOString() }
        maintenances = [...maintenances.filter(row => row.server !== plan.server), plan]
        result = { saved: true }
        break
      }
      case 'maintenance.delete': maintenances = maintenances.filter(row => row.server !== text('server')); if (text('server') === 'cn' && maintenanceSource.plan) maintenances.push(maintenanceSource.plan); result = { deleted: true }; break
      default: throw new Error(`预览不支持此操作：${method}`)
    }
  } else {
    switch (method) {
      case 'items.list': return { items: templates.filter(row => row.kind === 'formal' && row.metadata).slice(Number(values.offset ?? 0), Number(values.offset ?? 0) + Number(values.limit ?? 200)).map(row => ({ item_id: row.canonical_id, name: row.name, tag: row.tag, metadata: row.metadata })) }
      case 'templates.list': {
        const filtered = templates.filter(row => Boolean(row.discarded) === Boolean(values.discarded) && (!values.kind || row.kind === values.kind))
        const offset = Number(values.offset ?? 0)
        return clone({ items: filtered.slice(offset, offset + Number(values.limit ?? 50)) })
      }
      case 'releases.list': return clone({ items: releases })
      case 'screenshots.list': return { items: [] }
      case 'templates.discard': {
        const row = templates.find(template => template.id === text('identity_id'))
        if (!row) throw new Error('未找到预览模板')
        for (const member of templates) if (member.canonical_id === row.canonical_id) {
          member.discarded = Boolean(values.discarded)
          if (member.discarded) member.draft = null
        }
        result = { discarded: row.discarded, published: false }
        break
      }
      case 'mappings.save': {
        const row = templates.find(template => template.id === text('unknown_id'))
        if (!row) throw new Error('未找到预览模板')
        row.draft = { item_id: text('item_id'), name: text('name'), tag: text('tag'), metadata: values.metadata as Mapping['metadata'] }
        result = { saved: true }
        break
      }
      case 'templates.import': templates.push({ id: text('item_id'), canonical_id: text('item_id'), name: text('name'), tag: text('tag'), metadata: values.metadata as Mapping['metadata'], kind: 'formal', hits: 0, image_base64: text('image_base64'), screenshot_count: 0, draft: null }); result = { imported: true }; break
      case 'publish':
        for (const row of templates) if (row.draft) { row.canonical_id = row.draft.item_id; row.name = row.draft.name; row.tag = row.draft.tag; row.metadata = row.draft.metadata; row.kind = 'formal'; row.draft = null }
        releases.unshift({ revision: ++sequence, status: 'deployed', note: '预览发布', error: '', created_at: new Date().toISOString() })
        result = { request_id: sequence }
        break
      default: throw new Error(`预览不支持此操作：${method}`)
    }
  }
  changed(source)
  return clone(result)
}
