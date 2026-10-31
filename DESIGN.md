# 界面规范

## 原文与用途

| 资源 | 用途 |
| --- | --- |
| [refactoring-ui](https://github.com/edisonmbli/refactoring-ui-skill/blob/main/skills/refactoring-ui/SKILL.md) | 按层级、间距、排版、颜色、深度、图像、收尾检查页面；已有组件库规则优先。 |
| [Kumo design](https://github.com/cloudflare/kumo/blob/main/skills/kumo-design/SKILL.md) | 现成组件、14px 正文、字重、圆角、弹窗和交互规范。 |
| [awesome-design-md](https://github.com/VoltAgent/awesome-design-md) | 本文的设计文档结构。该目录没有 Cloudflare 主题，样式以 Kumo 为准。 |
| [anti-ai-vibes](https://github.com/nagelanping/anti-ai-vibes-skill/blob/main/skills/anti-ai-vibes/SKILL.md) | 删除包装语和重复说明，保留统计含义与实际状态。 |
| [说人话](https://github.com/MrGeDiao/shuorenhua/blob/main/SKILL.md) | 按用户指定范围删除宣传和多余说明，保留数值、单位、操作标签和错误。 |

## 主题、颜色与排版

Next.js App Router、React 19、Tailwind 4、Kumo 浅色主题。颜色直接使用 Kumo 语义令牌，不另设控件主题。正文、数据和交互文字为 14px，标题使用 Text 的 heading 变体，不调整字距，不用 700 字重。

Logo 和网站图标使用用户提供的 PNG 原图。公开站和管理站各自保存一份相同资源。

## 组件

公开站所有交互控件使用 Kumo：Sidebar、Link、Button、Tabs、Combobox、Select、Input、Table、Pagination、Dialog。图表使用 Kumo Chart，内容使用 Surface、Text，空状态使用 Empty。仅绑定统计数据和业务操作，不实现原生控件或替代控件。

Dialog 始终挂载，由 open 控制显示。搜索、选择器、菜单和弹窗的键盘、焦点、浮层和收起行为由组件库处理。

## 切换

实际检查 [Cloudflare 官网产品分类](https://www.cloudflare.com/products/) 和 [Kumo Tabs](https://kumo-ui.com/components/tabs/)。官网的选中背景与文字裁切随标签移动；使用 Kumo Tabs 现成的 200ms 滑动指示器，不复写控件。产物分类、分类/单项和表格/排行共用该组件。

页面链接通过 Kumo LinkProvider 接入 Next Link，侧栏放在持久 layout。template 使用 React 19.3 ViewTransition 自带的新旧内容交叉淡入淡出，使用浏览器默认时长；查询参数变化不会重建 template。没有自制关键帧或额外动画依赖。减少动态效果时，指示器立即切换，页面只保留 125ms 透明度过渡。动画用途为衔接页面变化和指示选中状态，按 animate 的频率与用途流程检查。

## 布局与深度

CSS 只负责布局、间距、滚动和响应式排列。使用组件库默认尺寸、状态、圆角和阴影，不另写悬浮颜色过渡，不叠加边框阴影，不嵌套 LayerCard。

## 文案

保留产物选择、筛选、统计结果、图表、项目明细及必要状态。删除宣传段落、英文装饰标题、编号步骤、效率观察、重复导航和页脚说明。统计定义只在“统计口径”页保留一份简表。公开站没有管理后台、TM 或模板服务跳转。

## 响应式与验证

手机导航使用 Sidebar，自身容器内滚动的数据表使用 Table。检查 1280px 和 375px，页面本身不得横向溢出。浏览器验证搜索、筛选、排序、弹窗、导出、导航和页面切换。

`tests/component-library.test.mjs` 禁止公开页面源码出现原生 button、input、select、textarea、dialog 和 a 控件。

## 审查记录

| 位置 | 规则 | 修改 |
| --- | --- | --- |
| 说明段落、效率观察、页脚 | Refactoring UI §2.1、§2.4 | 删除与数据、操作重复的文字。 |
| 控件 | Kumo 组件文档 | 替换为库内实现。 |
| 正文与表格 | Kumo content-text-size、font-tracking、font-weight | 使用库内字号和字重，不调整字距。 |
| 弹窗 | Kumo dialog-rendering | 保持挂载，使用 open。 |
| Logo | 用户要求 | 使用附件原图，删除原云形、锚形标识。 |

## 管理面板

管理站采用相同的 Kumo 浅色主题、字号及间距。登录页只保留 Logo、凭据输入和登录操作。主内容依次为页面标题、当前状态、业务表单或数据表；原有装饰顶栏、橙色宣传面板及重复说明删除。主操作为保存、发布或导入，刷新和编辑使用次级按钮。

Sidebar 负责桌面及手机导航。按钮、输入、文本域、开关、选择、标签页、表格、分页、链接、状态、空状态及对话框均使用 Kumo。Card 使用 LayerCard.Secondary 和 LayerCard.Primary，不覆写卡片外观。模板列表、导入、发布记录使用 Tabs；未知模板的映射草稿与完整原图放在同一 Dialog。撤回公告、删除维护计划使用 Dialog，所有 Dialog.Root 保持挂载。

| 位置 | 规则 | 来源判断与修改 |
| --- | --- | --- |
| 登录页、顶部导航 | Refactoring UI §2.1、§2.4 | 源码可见装饰、重复标题和宣传文案；改为单一标题与登录表单。 |
| 原 styles.css 与模板卡片 | Refactoring UI §1.5、Kumo 组件规范 | 源码可见手写色板、控件、阴影和状态；删除并使用库内组件，仅保留布局 CSS。 |
| 维护、发布状态 | Refactoring UI §3.6、§8.5 | 源码可见空说明卡片和嵌套卡片；改为数据表与明确的编辑入口。 |
| 模板详情 | Kumo dialog-rendering | 使用始终挂载的 Dialog，保留原图读取和草稿操作。 |

按用户指令未运行测试或类型检查。用户随后要求查看实际 UI，已打开当前登录页检查：Surface 是已弃用的方角基础容器，替换为 LayerCard，登录按钮使用库内全宽布局。用户查看的本地管理预览端口为 5173。

用户截图指出侧栏高度仅随菜单内容展开。Sidebar.Provider 使用明确的 h-dvh，内容区在自身容器内滚动，使 Sidebar.Footer 位于视口底部。统计站使用相同的布局修正。

Sidebar.Footer 沿用库内单行结构，只放“退出登录”；“公开统计”置于 Content 中的独立导航组，避免在固定高度的 Footer 中堆叠两行。Next.js 开发浮标通过 devIndicators: false 关闭，避免遮挡底部导航。
