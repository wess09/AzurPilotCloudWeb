'use client'
import { useEffect, useRef } from 'react'
import { Button } from '@cloudflare/kumo/components/button'
import { X } from '@phosphor-icons/react'
import { durationName, format, type Group, type Scene } from '../../statistics'
import { Metric } from './Metric'
export function ProjectDetail({
  group: g,
  scene,
  unit,
  label,
  onClose
}: {
  group: Group
  scene: Scene
  unit: string
  label: string
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const el = dialog.current
    el?.showModal()
    return () => el?.close()
  }, [])
  return (
    <dialog
      ref={dialog}
      className="detail-dialog"
      aria-labelledby="detail-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="detail-header">
        <div>
          <span className="eyebrow">PROJECT DETAILS</span>
          <h2 id="detail-title">{g.name}</h2>
        </div>
        <button
          className="icon-button"
          aria-label="关闭项目明细"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <p className="detail-subtitle">
        {label} · {format(g.samples)} 次有效完成记录
      </p>
      <div className="detail-summary">
        <Metric
          title="每小时平均"
          value={format(g.per_hour)}
          suffix={`${unit}/时`}
          note={`总任务耗时 ${format(g.total_seconds / 3600)} 小时`}
        />
        <Metric
          title="单次平均"
          value={format(g.average)}
          suffix={unit}
          note={`最小 ${format(g.min)} / 最大 ${format(g.max)}`}
        />
      </div>
      <h3>奖励明细</h3>
      <dl>
        <div>
          <dt>目标总产出</dt>
          <dd>
            {format(g.amount)} {unit}
          </dd>
        </div>
        <div>
          <dt>科研 BONUS（已包含）</dt>
          <dd>
            {format(g.extra_amount)} {unit}
          </dd>
        </div>
        <div>
          <dt>追赶 / 活动奖励（已包含）</dt>
          <dd>
            {format(g.other_amount)} {unit}
          </dd>
        </div>
        {scene === 'commission' && (
          <>
            <div>
              <dt>大成功样本</dt>
              <dd>{format(g.success_samples)} 次</dd>
            </div>
            <div>
              <dt>大成功记录产出（已包含）</dt>
              <dd>
                {format(g.success_amount)} {unit}
              </dd>
            </div>
          </>
        )}
        <div>
          <dt>零掉落样本</dt>
          <dd>{format(g.samples - g.occurrences)} 次</dd>
        </div>
      </dl>
      <h3>任务资料</h3>
      <p>
        {g.duration
          ? durationName(g.duration)
          : '当前为合并分组，或任务时长尚未收录'}
      </p>
      {g.condition && <p>{g.condition}</p>}
      <p>
        {g.costs?.length
          ? g.costs.map((c) => `${c.name} × ${format(c.amount)}`).join('、')
          : '无已收录的道具消耗；任务条件以游戏内说明为准。'}
      </p>
      {g.unknown_durations > 0 && (
        <p className="error-text">存在时长未知的记录，每小时产量暂不计算。</p>
      )}
      <div className="detail-bottom">
        <Button variant="secondary" onClick={onClose}>
          关闭明细
        </Button>
      </div>
    </dialog>
  )
}
