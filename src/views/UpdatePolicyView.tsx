import { useEffect, useState } from 'react'
import { Banner } from '@cloudflare/kumo/components/banner'
import { Button } from '@cloudflare/kumo/components/button'
import { Switch } from '@cloudflare/kumo/components/switch'
import { api } from '../api'
import { Card, PublishBadge, useAction, useLoad } from '../ui'

export function UpdatePolicyView() {
  const load = useLoad(() => api.getUpdatePolicy(), [])
  const [force, setForce] = useState(false)
  const action = useAction()
  const [lastPublish, setLastPublish] = useState<Parameters<typeof PublishBadge>[0]['publish']>(null)

  useEffect(() => { if (load.data) setForce(load.data.force_update) }, [load.data?.force_update])

  const save = () => action.run(async () => {
    const result = await api.setUpdatePolicy(force)
    setLastPublish(result.publish)
    load.reload()
    return result.force_update ? '已开启强制更新' : '已关闭强制更新'
  })

  return (
    <Card title="客户端更新">
      {load.loading && !load.data && <Banner variant="secondary">加载中…</Banner>}
      {load.error && <Banner variant="error">{load.error}</Banner>}
      {load.data && <form className="admin-form" onSubmit={event => { event.preventDefault(); void save() }}>
        <Switch label="强制更新" checked={force} onCheckedChange={setForce} disabled={action.running} />
        <PublishBadge publish={lastPublish} />
        {action.message && <Banner variant={action.message.kind === 'err' ? 'error' : 'secondary'}>{action.message.text}</Banner>}
        <div className="admin-actions"><Button type="submit" variant="primary" loading={action.running}>保存并发布</Button></div>
      </form>}
    </Card>
  )
}
