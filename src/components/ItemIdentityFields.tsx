import { useMemo, useState } from 'react'
import { Combobox } from '@cloudflare/kumo/components/combobox'
import { Input } from '@cloudflare/kumo/components/input'
import { Tabs } from '@cloudflare/kumo/components/tabs'
import { Text } from '@cloudflare/kumo/components/text'
import { Select } from '@cloudflare/kumo/components/select'
import { emptyMetadata, type ItemMetadata } from '../item-metadata'
import catalog from '../data/catalog.json'

export type ItemIdentity = { item_id: string; name: string; tag: string; metadata?: ItemMetadata | null }

export function ItemIdentityFields({ value, items, onChange }: {
  value: ItemIdentity
  items: ItemIdentity[]
  onChange: (value: ItemIdentity) => void
}) {
  const [mode, setMode] = useState('existing')
  const options = useMemo(() => {
    const known = new Map(items.map(item => [item.item_id, item]))
    if (value.item_id && !known.has(value.item_id)) known.set(value.item_id, value)
    return Array.from(known.values())
  }, [items, value])
  const label = (item: ItemIdentity) => `${item.name || item.item_id} · ${item.item_id}`
  const byLabel = new Map(options.map(item => [label(item), item]))
  const selected = options.find(item => item.item_id === value.item_id)
  const metadata = value.metadata ?? emptyMetadata()
  const family = metadata.category.startsWith('blueprint-') ? 'ship_blueprint' : metadata.category.startsWith('gear-') ? 'gear_blueprint' : metadata.category
  const blueprint = family === 'ship_blueprint' || family === 'gear_blueprint'
  const families = { ship_blueprint: '舰船科研蓝图', gear_blueprint: '装备设计图', ...Object.fromEntries(catalog.categories.filter(category => !category.id.startsWith('blueprint-') && !category.id.startsWith('gear-')).map(category => [category.id, category.name])) }
  const updateMetadata = (changes: Partial<ItemMetadata>) => onChange({ ...value, metadata: { ...metadata, ...changes } })
  const categoryFor = (kind: string, rarity: number) => kind === 'ship_blueprint' ? (rarity === 5 ? 'blueprint-rainbow' : 'blueprint-gold') : kind === 'gear_blueprint' ? (rarity === 5 ? 'gear-rainbow' : rarity === 4 ? 'gear-gold' : 'gear-other') : kind
  const chooseFamily = (kind: string) => {
    const category = categoryFor(kind, 0)
    updateMetadata({ category, rarity: 0, unit: catalog.categories.find(row => row.id === category)?.unit ?? '', subtype: '', series: 0 })
  }

  return (
    <div className="admin-form">
      <Tabs
        className="w-fit"
        value={mode}
        tabs={[{ value: 'existing', label: '选择已有物品' }, { value: 'new', label: '新建物品' }]}
        onValueChange={next => { setMode(next); onChange({ ...value, item_id: '', metadata: emptyMetadata() }) }}
        indicatorClassName="motion-reduce:transition-none"
      />
      {mode === 'existing' ? (
        <Combobox<string>
          label="正式物品"
          required
          items={Array.from(byLabel.keys())}
          value={selected ? label(selected) : null}
          onValueChange={next => {
            const item = typeof next === 'string' ? byLabel.get(next) : undefined
            onChange(item ? { ...item } : { ...value, item_id: '' })
          }}
        >
          <Combobox.TriggerInput aria-label="搜索正式物品名称或 ID" placeholder="搜索物品名称或 ID" className="w-full" />
          <Combobox.Content>
            <Combobox.Empty>没有匹配的物品</Combobox.Empty>
            <Combobox.List>{(option: string) => {
              const item = byLabel.get(option)
              return <Combobox.Item key={option} value={option}>
                <div className="grid gap-1 py-1">
                  <Text>{item?.name || item?.item_id}</Text>
                  <Text variant="mono-secondary">{item?.item_id}</Text>
                </div>
              </Combobox.Item>
            }}</Combobox.List>
          </Combobox.Content>
        </Combobox>
      ) : <Input label="新物品 ID" required maxLength={128} value={value.item_id} onChange={event => onChange({ ...value, item_id: event.target.value })} />}
      <div className="admin-columns">
        <Input label="物品名称" required maxLength={128} value={value.name} onChange={event => onChange({ ...value, name: event.target.value })} />
        <Input label="标签（可选）" maxLength={32} value={value.tag} onChange={event => onChange({ ...value, tag: event.target.value })} />
      </div>
      <div className="admin-columns">
        <Select label="物品分类" aria-label="物品分类" value={family || undefined} placeholder="选择物品分类" items={families} onValueChange={next => chooseFamily(next ?? '')} />
        <Select label="稀有度" aria-label="稀有度" value={String(metadata.rarity)} items={family === 'ship_blueprint' ? { '0': '请选择', '4': '金色', '5': '彩色' } : { '0': '未设置', '1': '普通', '2': '蓝色', '3': '紫色', '4': '金色', '5': '彩色' }} onValueChange={next => updateMetadata({ rarity: Number(next ?? 0), category: categoryFor(family, Number(next ?? 0)) })} />
      </div>
      <div className="admin-columns">
        {blueprint && <Input label="科研期数" type="number" min={1} max={100} step={1} placeholder="通用" value={metadata.series || ''} onChange={event => updateMetadata({ series: Number(event.target.value || 0) })} />}
        <Input label="所属版本" maxLength={64} value={metadata.version} onChange={event => updateMetadata({ version: event.target.value })} />
      </div>
      <div className="admin-columns">
        <Input label="计量单位" readOnly value={metadata.unit} />
        <Select label="统计范围" aria-label="统计范围" value={metadata.scenes.length === 2 ? 'both' : metadata.scenes[0]} items={{ both: '科研与军事委托', research: '科研', commission: '军事委托' }} onValueChange={next => updateMetadata({ scenes: next === 'both' ? ['research', 'commission'] : [next ?? 'research'] })} />
      </div>
      <Input label="游戏物品 ID" maxLength={64} value={metadata.game_id} onChange={event => updateMetadata({ game_id: event.target.value })} />
      {blueprint && <div className="admin-columns">
        <Input label={family === 'ship_blueprint' ? '舰种' : '装备类型'} maxLength={64} value={metadata.subtype} onChange={event => updateMetadata({ subtype: event.target.value })} />
        <Input label="所属阵营" maxLength={64} value={metadata.faction} onChange={event => updateMetadata({ faction: event.target.value })} />
      </div>}
    </div>
  )
}
