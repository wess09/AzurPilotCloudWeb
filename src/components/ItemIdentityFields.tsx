import { useMemo, useState } from 'react'
import { Combobox } from '@cloudflare/kumo/components/combobox'
import { Input } from '@cloudflare/kumo/components/input'
import { Tabs } from '@cloudflare/kumo/components/tabs'
import { Text } from '@cloudflare/kumo/components/text'
import { Select } from '@cloudflare/kumo/components/select'
import { emptyMetadata, itemOptions, normalizeMetadata, type ItemMetadata } from '../item-metadata'
import catalog from '../data/catalog.json'

export type ItemIdentity = { item_id: string; name: string; tag: string; metadata?: ItemMetadata | null }
const gameLabels = new Map(itemOptions.items.map(item => [`${item.name} · ${item.metadata.game_id}`, item]))
const rarityItems = { '0': '未设置', '1': '普通', '2': '蓝色', '3': '紫色', '4': '金色', '5': '彩色', ...Object.fromEntries(Array.from(new Set(itemOptions.items.map(item => item.metadata.rarity).filter(rarity => rarity > 5))).sort((a, b) => a - b).map(rarity => [String(rarity), `游戏稀有度 ${rarity}`])) }

export function ItemIdentityFields({ value, items, onChange, fixedIdentity = false, initialMode = 'existing', includeTag = true }: {
  value: ItemIdentity
  items: ItemIdentity[]
  onChange: (value: ItemIdentity) => void
  fixedIdentity?: boolean
  initialMode?: 'existing' | 'new'
  includeTag?: boolean
}) {
  const [mode, setMode] = useState<string>(initialMode)
  const options = useMemo(() => {
    const known = new Map(items.map(item => [item.item_id, item]))
    if (value.item_id && !known.has(value.item_id)) known.set(value.item_id, value)
    return Array.from(known.values())
  }, [items, value])
  const label = (item: ItemIdentity) => `${item.name || item.item_id} · ${item.item_id}`
  const byLabel = new Map(options.map(item => [label(item), item]))
  const selected = options.find(item => item.item_id === value.item_id)
  const metadata = normalizeMetadata(value.metadata)
  const family = metadata.category.startsWith('blueprint-') ? 'ship_blueprint' : metadata.category.startsWith('gear-') ? 'gear_blueprint' : metadata.category
  const blueprint = family === 'ship_blueprint' || family === 'gear_blueprint'
  const families = { ship_blueprint: '舰船科研蓝图', gear_blueprint: '装备设计图', ...Object.fromEntries(catalog.categories.filter(category => !category.id.startsWith('blueprint-') && !category.id.startsWith('gear-')).map(category => [category.id, category.name])) }
  const updateMetadata = (changes: Partial<ItemMetadata>) => onChange({ ...value, metadata: { ...metadata, ...changes } })
  const categoryFor = (kind: string, rarity: number) => kind === 'ship_blueprint' ? (rarity === 5 ? 'blueprint-rainbow' : 'blueprint-gold') : kind === 'gear_blueprint' ? (rarity === 5 ? 'gear-rainbow' : rarity === 4 ? 'gear-gold' : 'gear-other') : kind
  const chooseFamily = (kind: string) => {
    const rarity = kind === 'ship_blueprint' && ![4, 5].includes(metadata.rarity) ? 0 : metadata.rarity
    const category = categoryFor(kind, rarity)
    updateMetadata({ category, rarity, unit: catalog.categories.find(row => row.id === category)?.unit ?? '', subtype: '', series: 0, faction: '', ship_id: '', equipment_id: '', tier: kind === 'ship_blueprint' ? '' : metadata.tier })
  }
  const source = itemOptions.items.find(item => item.metadata.game_id === metadata.game_id)
  const chooseSource = (item: typeof itemOptions.items[number]) => {
    const nextId = !fixedIdentity && (mode === 'existing' || !value.item_id || value.item_id === source?.item_id) ? item.item_id : value.item_id
    if (!fixedIdentity) setMode(items.some(known => known.item_id === nextId) ? 'existing' : 'new')
    onChange({ ...value, item_id: nextId, name: item.name, metadata: normalizeMetadata(item.metadata) })
  }
  const choices = (values: string[], current = '', empty = '未设置') => Object.fromEntries([['', empty], ...Array.from(new Set([...values, ...(current ? [current] : [])])).map(option => [option, option])])
  const subtypes = family === 'ship_blueprint' ? itemOptions.ship_types : family === 'gear_blueprint' ? itemOptions.equipment_types : Array.from(new Set(itemOptions.items.filter(item => item.metadata.category === metadata.category).map(item => item.metadata.subtype).filter(Boolean)))
  const subtypeLabel = family === 'ship_blueprint' ? '舰种' : family === 'gear_blueprint' ? '装备类型' : family === 'book' ? '教材类型' : family === 'plate' ? '部件类型' : family === 'retrofit' ? '改造图纸类型' : '物品细分类'

  return (
    <div className="admin-form">
      {!fixedIdentity && <Tabs
        className="w-fit"
        value={mode}
        tabs={[{ value: 'existing', label: '选择已有物品' }, { value: 'new', label: '新建物品' }]}
        onValueChange={next => { setMode(next); onChange({ item_id: '', name: '', tag: value.tag, metadata: emptyMetadata() }) }}
        indicatorClassName="motion-reduce:transition-none"
      />}
      {fixedIdentity ? <Input label="正式物品 ID" readOnly value={value.item_id} /> : mode === 'existing' ? (
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
      <Combobox<string> label="游戏物品" items={Array.from(gameLabels.keys())} value={source ? `${source.name} · ${source.metadata.game_id}` : null} onValueChange={next => { const item = typeof next === 'string' ? gameLabels.get(next) : undefined; if (item) chooseSource(item); else updateMetadata({ game_id: '' }) }}>
        <Combobox.TriggerInput aria-label="搜索游戏物品名称或 ID" placeholder="搜索游戏物品名称或 ID" className="w-full" />
        <Combobox.Content><Combobox.Empty>没有匹配的游戏物品</Combobox.Empty><Combobox.List>{(option: string) => <Combobox.Item key={option} value={option}>{option}</Combobox.Item>}</Combobox.List></Combobox.Content>
      </Combobox>
      <div className="admin-columns">
        <Input label="物品名称" required maxLength={128} value={value.name} onChange={event => onChange({ ...value, name: event.target.value })} />
        {!fixedIdentity && includeTag && <Input label="标签（可选）" maxLength={32} value={value.tag} onChange={event => onChange({ ...value, tag: event.target.value })} />}
      </div>
      <div className="admin-columns">
        <Select required label="物品分类" aria-label="物品分类" value={family || undefined} placeholder="选择物品分类" items={families} onValueChange={next => chooseFamily(next ?? '')} />
        <Select label="稀有度" aria-label="稀有度" value={String(metadata.rarity)} items={family === 'ship_blueprint' ? { '0': '请选择', '4': '金色', '5': '彩色' } : rarityItems} onValueChange={next => updateMetadata({ rarity: Number(next ?? 0), category: categoryFor(family, Number(next ?? 0)) })} />
      </div>
      <div className="admin-columns">
        {blueprint && <Select label="科研期数" value={String(metadata.series)} items={Object.fromEntries([['0', '通用'], ...Array.from(new Set([...itemOptions.series, ...(metadata.series ? [metadata.series] : [])])).sort((a, b) => a - b).map(series => [String(series), `第 ${series} 期`])])} onValueChange={next => updateMetadata({ series: Number(next ?? 0) })} />}
        <Input label="所属版本" maxLength={64} value={metadata.version} onChange={event => updateMetadata({ version: event.target.value })} />
      </div>
      {family === 'ship_blueprint' && <Select label="关联舰船" value={metadata.ship_id} items={{ '': '未关联', ...Object.fromEntries(itemOptions.ships.map(ship => [ship.id, `${ship.name} · ${ship.id}`])), ...(metadata.ship_id ? { [metadata.ship_id]: `${itemOptions.ships.find(ship => ship.id === metadata.ship_id)?.name ?? '舰船'} · ${metadata.ship_id}` } : {}) }} onValueChange={next => { const item = itemOptions.items.find(item => item.metadata.ship_id === next && next); if (item) chooseSource(item); else updateMetadata({ ship_id: next ?? '' }) }} />}
      {family === 'gear_blueprint' && <Select label="关联装备" value={metadata.equipment_id} items={{ '': '未关联', ...Object.fromEntries(itemOptions.equipment.map(equipment => [equipment.id, `${equipment.name} ${equipment.tier} · ${equipment.id}`])), ...(metadata.equipment_id && !itemOptions.equipment.some(equipment => equipment.id === metadata.equipment_id) ? { [metadata.equipment_id]: metadata.equipment_id } : {}) }} onValueChange={next => { const item = itemOptions.items.find(item => item.metadata.equipment_id === next && next); if (item) chooseSource(item); else updateMetadata({ equipment_id: next ?? '' }) }} />}
      {(blueprint || ['book', 'plate', 'retrofit', 'box'].includes(family)) && <div className="admin-columns">
        {family !== 'ship_blueprint' && <Select label={family === 'gear_blueprint' ? '装备版本' : '物品等级'} value={metadata.tier} items={choices(itemOptions.tiers, metadata.tier)} onValueChange={next => updateMetadata({ tier: next ?? '' })} />}
        <Select label={subtypeLabel} value={metadata.subtype} items={choices(subtypes, metadata.subtype)} onValueChange={next => updateMetadata({ subtype: next ?? '' })} />
      </div>}
      <div className="admin-columns">
        <Input label="计量单位" readOnly value={metadata.unit} />
        <Select label="统计范围" aria-label="统计范围" value={metadata.scenes.length === 2 ? 'both' : metadata.scenes[0]} items={{ both: '科研与军事委托', research: '科研', commission: '军事委托' }} onValueChange={next => updateMetadata({ scenes: next === 'both' ? ['research', 'commission'] : [next ?? 'research'] })} />
      </div>
      <Input label="游戏物品 ID" maxLength={64} value={metadata.game_id} onChange={event => updateMetadata({ game_id: event.target.value })} />
      {(blueprint || family === 'box') && <Select label="所属阵营" value={metadata.faction} items={choices(itemOptions.factions, metadata.faction)} onValueChange={next => updateMetadata({ faction: next ?? '' })} />}
    </div>
  )
}
