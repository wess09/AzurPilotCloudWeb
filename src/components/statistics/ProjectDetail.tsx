'use client'
import { Button } from '@cloudflare/kumo/components/button'
import { Dialog } from '@cloudflare/kumo/components/dialog'
import { X } from '@phosphor-icons/react'
import { durationName, format, type Group, type Scene } from '../../statistics'
import { Metric } from './Metric'

export function ProjectDetail({
  group,
  scene,
  unit,
  label,
  onClose
}: {
  group: Group | null
  scene: Scene
  unit: string
  label: string
  onClose: () => void
}) {
  return (
    <Dialog.Root
      open={Boolean(group)}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <Dialog size="lg" className="detail-dialog">
        <div className="detail-header">
          <Dialog.Title>{group?.name || '项目明细'}</Dialog.Title>
          <Dialog.Close
            render={
              <Button variant="ghost" shape="square" aria-label="关闭项目明细">
                <X size={18} />
              </Button>
            }
          />
        </div>
        <Dialog.Description>{label}</Dialog.Description>
        {group && (
          <>
            <div className="detail-summary">
              <Metric
                title="每小时平均"
                value={format(group.per_hour)}
                suffix={`${unit}/时`}
              />
              <Metric
                title="单次平均"
                value={format(group.average)}
                suffix={unit}
              />
            </div>
            <dl>
              <div>
                <dt>样本数</dt>
                <dd>{format(group.samples)} 次</dd>
              </div>
              <div>
                <dt>零掉落样本</dt>
                <dd>{format(group.samples - group.occurrences)} 次</dd>
              </div>
              <div>
                <dt>总产出</dt>
                <dd>
                  {format(group.amount)} {unit}
                </dd>
              </div>
              <div>
                <dt>最小 / 最大</dt>
                <dd>
                  {format(group.min)} / {format(group.max)}
                </dd>
              </div>
              {scene === 'research' && (
                <>
                  <div>
                    <dt>BONUS</dt>
                    <dd>
                      {format(group.extra_amount)} {unit}
                    </dd>
                  </div>
                  <div>
                    <dt>追赶 / 活动奖励</dt>
                    <dd>
                      {format(group.other_amount)} {unit}
                    </dd>
                  </div>
                </>
              )}
              {scene === 'commission' && (
                <>
                  <div>
                    <dt>大成功样本</dt>
                    <dd>{format(group.success_samples)} 次</dd>
                  </div>
                  <div>
                    <dt>大成功产出</dt>
                    <dd>
                      {format(group.success_amount)} {unit}
                    </dd>
                  </div>
                </>
              )}
              <div>
                <dt>任务时长</dt>
                <dd>{group.duration ? durationName(group.duration) : '—'}</dd>
              </div>
              <div>
                <dt>样本总耗时</dt>
                <dd>{format(group.total_seconds / 3600)} 小时</dd>
              </div>
              <div>
                <dt>消耗</dt>
                <dd>
                  {group.costs?.length
                    ? group.costs
                        .map((cost) => `${cost.name} × ${format(cost.amount)}`)
                        .join('、')
                    : '—'}
                </dd>
              </div>
              {group.condition && (
                <div>
                  <dt>任务条件</dt>
                  <dd>{group.condition}</dd>
                </div>
              )}
            </dl>
          </>
        )}
        <div className="detail-actions">
          <Dialog.Close
            render={<Button variant="secondary">关闭明细</Button>}
          />
        </div>
      </Dialog>
    </Dialog.Root>
  )
}
