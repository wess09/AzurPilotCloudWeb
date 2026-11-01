import catalog from './data/catalog.json'
import game from './data/item-options.json'

export type ItemMetadata = {
  category: string; rarity: number; series: number; version: string; unit: string
  scenes: string[]; game_id: string; faction: string; subtype: string
  ship_id: string; equipment_id: string; tier: string
}
export const emptyMetadata = (): ItemMetadata => ({ category: '', rarity: 0, series: 0, version: '', unit: '', scenes: ['research', 'commission'], game_id: '', faction: '', subtype: '', ship_id: '', equipment_id: '', tier: '' })
export const itemOptions = game
export const normalizeMetadata = (metadata?: Partial<ItemMetadata> | null): ItemMetadata => ({ ...emptyMetadata(), ...metadata })
export function catalogMetadata(item: typeof catalog.items[number]): ItemMetadata {
  const source = game.items.find(row => row.item_id === item.id || row.name === item.name)
  return { ...emptyMetadata(), ...source?.metadata, category: item.category, unit: item.unit, rarity: item.category.endsWith('rainbow') ? 5 : item.category.endsWith('gold') ? 4 : item.rarity || source?.metadata.rarity || 0, scenes: item.scenes }
}
export function completeMetadata(metadata?: ItemMetadata | null) {
  if (!metadata?.category || !metadata.unit || !metadata.scenes.length) return false
  if (!Number.isInteger(metadata.series) || metadata.series < 0 || metadata.series > 100 || !Number.isInteger(metadata.rarity) || metadata.rarity < 0 || metadata.rarity > 9) return false
  if (metadata.category.endsWith('rainbow')) return metadata.rarity === 5
  if (metadata.category.endsWith('gold')) return metadata.rarity === 4
  if (metadata.category === 'gear-other') return metadata.rarity < 4
  return true
}
