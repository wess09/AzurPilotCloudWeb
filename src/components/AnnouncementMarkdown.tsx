import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Checkbox } from '@cloudflare/kumo/components/checkbox'
import { Link } from '@cloudflare/kumo/components/link'
import { Table } from '@cloudflare/kumo/components/table'
import { Text } from '@cloudflare/kumo/components/text'

export function AnnouncementMarkdown({ content }: { content: string }) {
  return (
    <div className="prose prose-sm prose-neutral max-w-none min-w-0 prose-headings:font-semibold prose-strong:font-medium">
      <Markdown remarkPlugins={[remarkGfm]} skipHtml components={{
        a: ({ href, id, title, children }) => <Link href={href} id={id} title={title} target={href?.startsWith('#') ? undefined : '_blank'} rel="noopener noreferrer">{children}</Link>,
        input: ({ checked }) => <Checkbox checked={Boolean(checked)} disabled aria-label={checked ? '已完成' : '未完成'} />,
        h1: ({ children }) => <Text as="h1" variant="heading" size="lg">{children}</Text>,
        h2: ({ children }) => <Text as="h2" variant="heading">{children}</Text>,
        h3: ({ children }) => <Text as="h3" variant="heading">{children}</Text>,
        h4: ({ children }) => <Text as="h4" variant="heading">{children}</Text>,
        h5: ({ children }) => <Text as="h5" variant="heading">{children}</Text>,
        h6: ({ children }) => <Text as="h6" variant="heading">{children}</Text>,
        strong: ({ children }) => <Text as="strong" bold>{children}</Text>,
        table: ({ children }) => <div className="overflow-x-auto"><Table>{children}</Table></div>,
        thead: ({ children }) => <Table.Header>{children}</Table.Header>,
        tbody: ({ children }) => <Table.Body>{children}</Table.Body>,
        tr: ({ children }) => <Table.Row>{children}</Table.Row>,
        th: ({ children, style }) => <Table.Head style={style}>{children}</Table.Head>,
        td: ({ children, style }) => <Table.Cell style={style}>{children}</Table.Cell>
      }}>{content}</Markdown>
    </div>
  )
}
