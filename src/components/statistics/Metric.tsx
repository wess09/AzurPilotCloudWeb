import { Surface } from '@cloudflare/kumo/components/surface'
import { Text } from '@cloudflare/kumo/components/text'

export function Metric({
  title,
  value,
  suffix
}: {
  title: string
  value: string
  suffix: string
}) {
  return (
    <Surface className="metric">
      <Text as="h3">{title}</Text>
      <Text as="p" bold>
        {value}
        <span className="metric-unit">{suffix}</span>
      </Text>
    </Surface>
  )
}
