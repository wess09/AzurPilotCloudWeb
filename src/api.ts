import type { Announcement, Maintenance, MaintenanceSource, PublishRecord, PublishResult } from './types'
import { mainRPC } from './rpc'
export { ApiError, getToken, setToken, clearToken, setAuthErrorHandler } from './rpc'

type MainState = { announcement: Announcement | null; force_update: boolean; maintenances: Maintenance[] | null; maintenance_source: MaintenanceSource | null; publish_history: Record<string, PublishRecord> | null }
const state = () => mainRPC.state<MainState>()

export const api = {
  probe: () => state(),
  getAnnouncement: async () => ({ announcement: (await state()).announcement }),
  publishAnnouncement: (payload: { title: string; content?: string; url?: string }) => mainRPC.request<{ announcement: Announcement; publish: PublishResult }>('announcement.publish', payload),
  withdrawAnnouncement: () => mainRPC.request<{ publish: PublishResult }>('announcement.withdraw'),
  getUpdatePolicy: async () => ({ force_update: (await state()).force_update }),
  setUpdatePolicy: (forceUpdate: boolean) => mainRPC.request<{ force_update: boolean; publish: PublishResult }>('update_policy.set', { force_update: forceUpdate }),
  listMaintenance: async () => ({ maintenances: (await state()).maintenances ?? [] }),
  maintenanceSource: async () => (await state()).maintenance_source,
  syncMaintenance: () => mainRPC.request<MaintenanceSource>('maintenance.sync'),
  saveMaintenance: (server: string, payload: { name: string; starts_at: string; ends_at?: string }) => mainRPC.request<{ saved: boolean }>('maintenance.save', { server, ...payload }),
  deleteMaintenance: (server: string) => mainRPC.request<{ deleted: boolean }>('maintenance.delete', { server }),
  publishStatus: async () => ({ publish_history: (await state()).publish_history ?? {} }),
}
