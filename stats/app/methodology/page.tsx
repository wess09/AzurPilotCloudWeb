import type { Metadata } from 'next'
import { StatisticsShell } from '../../../src/components/statistics/StatisticsShell'
import catalog from '../../../src/data/catalog.json'
export const metadata: Metadata = { title: '统计口径' }
export default function Page() {
  return (
    <StatisticsShell>
      <div className="page-heading">
        <div>
          <div className="eyebrow">DATA METHODOLOGY</div>
          <h1>每一份数据，都有据可查</h1>
          <p>科研与军事委托使用同一套统计定义。</p>
        </div>
      </div>
      <article className="methodology">
        <section>
          <h2>先选择产物，再比较效率</h2>
          <p>
            分类汇总仅合并同类别、同单位的物品。例如彩科研蓝图可以合并统计张数，但物资与石油分别统计。单项查询只合并指定物品的已知图标变体。未识别或未收录分类的物品不会被猜测为某类产物。
          </p>
        </section>
        <section>
          <h2>样本与概率</h2>
          <ul>
            <li>
              样本数：当前筛选条件下所有有效的任务完成记录，目标产物为零的记录也计入。
            </li>
            <li>
              掉落概率：获得目标产物的记录数 ÷
              有效样本数。同一次任务掉落多个匹配物品，掉落次数仍为一次。
            </li>
            <li>
              最小 /
              最大数量：先按完成记录合并目标产物，再求最小值和最大值，包含零掉落。
            </li>
            <li>单次平均产量：实际目标总产出 ÷ 有效样本数。</li>
          </ul>
        </section>
        <section>
          <h2>每小时平均产量</h2>
          <p>
            <code>每小时平均产量 = 总产出 × 3600 ÷ 样本任务总耗时（秒）</code>
          </p>
          <p>
            每条完成记录使用对应项目的配置时长；分组后重新累加产出和任务耗时，不直接平均已有的“每小时平均值”。该指标衡量任务运行时间的产出效率，不计入等待刷新、领取延迟或客户端离线时间。时长未知时显示“—”，不会用已知任务的耗时替代未知部分。
          </p>
        </section>
        <section>
          <h2>额外奖励与样本门槛</h2>
          <p>
            总产出包含实际观测到的全部匹配奖励。科研 BONUS
            单独列示，追赶与活动标签奖励在项目明细中列示。委托“大成功产出”指大成功记录中实际获得的目标数量，已包含在总产出中；由于没有相同任务的反事实收益，不据此估算大成功额外增量。
          </p>
          <p>
            委托的每个展示分组需超过 50
            个有效样本。科研没有该展示门槛；小样本结果波动较大。上传样本受玩家选择项目与客户端识别情况影响，不代表官方理论概率。
          </p>
        </section>
        <section>
          <h2>数据来源与更新</h2>
          <p>
            统计来自玩家上传的真实完成记录；物品映射发布后，查询使用当前正式映射解析历史记录。数据目录包含{' '}
            {Object.keys(catalog.research).length} 个科研项目、
            {Object.keys(catalog.commission).length} 种委托、
            {catalog.items.length}{' '}
            个可识别产物。项目时长、消耗和委托类型来自本地 AzurLaneLuaScripts
            国服 Lua 快照，产物名称与模板变体来自 AzurLaneAutoScript。
          </p>
          <p>
            Lua
            配置中的奖励预览仅作为资料，不用于推算概率或构造统计样本。游戏更新后需重新生成目录；目录保留来源文件
            SHA-256，详见项目的 DESIGN.md 和生成工具。
          </p>
        </section>
      </article>
    </StatisticsShell>
  )
}
