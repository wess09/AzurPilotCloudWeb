'use client'
import { Table } from '@cloudflare/kumo/components/table'
import { Text } from '@cloudflare/kumo/components/text'
import { Surface } from '@cloudflare/kumo/components/surface'

const definitions = [
  ['样本数', '筛选范围内的有效完成记录，包含目标产物零掉落的记录。'],
  ['分类汇总', '只合并同类别、同单位的产物；单项查询只统计指定物品。'],
  ['掉落概率', '获得目标产物的记录数 ÷ 样本数。同一次任务只计一次命中。'],
  ['最小 / 最大', '每次任务的目标产物合计数量的最小值与最大值，包含零。'],
  ['单次平均', '总产出 ÷ 样本数。'],
  [
    '每小时平均',
    '总产出 × 3600 ÷ 样本任务总耗时（秒）。分组后重新计算；存在未知时长时显示“—”。'
  ],
  [
    '额外奖励',
    'BONUS、追赶、活动奖励和大成功记录产出均已计入总产出。大成功产出不等于额外增量。'
  ],
  ['委托样本门槛', '分组超过 50 个有效样本后展示。']
]
export function Methodology() {
  return (
    <>
      <div className="page-heading">
        <Text as="h1" variant="heading" size="lg">
          统计口径
        </Text>
      </div>
      <Surface className="methodology">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.Head>指标</Table.Head>
              <Table.Head>定义</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {definitions.map(([name, definition]) => (
              <Table.Row key={name}>
                <Table.Cell>{name}</Table.Cell>
                <Table.Cell>{definition}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Surface>
    </>
  )
}
