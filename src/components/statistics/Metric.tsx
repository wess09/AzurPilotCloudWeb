import { ChartBar } from '@phosphor-icons/react'
export function Metric({
  title,
  value,
  suffix,
  note,
  accent
}: {
  title: string
  value: string
  suffix: string
  note: string
  accent?: boolean
}) {
  return (
    <div className={accent ? 'metric accent' : 'metric'}>
      <h3>
        {title}
        {accent && <ChartBar size={14} />}
      </h3>
      <div className="metric-value">
        {value}
        <span>{suffix}</span>
      </div>
      <p>{note}</p>
    </div>
  )
}
