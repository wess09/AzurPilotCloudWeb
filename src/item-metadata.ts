import catalog from './data/catalog.json'

export type ItemMetadata = {
  category: string; rarity: number; series: number; version: string; unit: string
  scenes: string[]; game_id: string; faction: string; subtype: string
}
export const emptyMetadata = (): ItemMetadata => ({ category: '', rarity: 0, series: 0, version: '', unit: '', scenes: ['research', 'commission'], game_id: '', faction: '', subtype: '' })
export function catalogMetadata(item: typeof catalog.items[number]): ItemMetadata {
  return { ...emptyMetadata(), category: item.category, unit: item.unit, rarity: item.category.endsWith('rainbow') ? 5 : item.category.endsWith('gold') ? 4 : Math.min(item.rarity, 5), scenes: item.scenes }
}
export function completeMetadata(metadata?: ItemMetadata | null) {
  if (!metadata?.category || !metadata.unit || !metadata.scenes.length) return false
  if (metadata.category.endsWith('rainbow')) return metadata.rarity === 5
  if (metadata.category.endsWith('gold')) return metadata.rarity === 4
  return true
}
