import { useMemo, useState } from 'react'
import { Combobox } from '@cloudflare/kumo/components/combobox'
import { Input } from '@cloudflare/kumo/components/input'
import { Tabs } from '@cloudflare/kumo/components/tabs'
import { Text } from '@cloudflare/kumo/components/text'

export type ItemIdentity = { item_id: string; name: string; tag: string }

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

  return (
    <div className="admin-form">
      <Tabs
        className="w-fit"
        value={mode}
        tabs={[{ value: 'existing', label: '选择已有物品' }, { value: 'new', label: '新建物品' }]}
        onValueChange={next => { setMode(next); onChange({ ...value, item_id: '' }) }}
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
    </div>
  )
}
