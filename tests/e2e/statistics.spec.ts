import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

// Synthetic responses exist only in browser tests; production has no demo mode.
const metrics = {
  samples: 100,
  occurrences: 60,
  amount: 120,
  min: 0,
  max: 4,
  extra_amount: 20,
  other_amount: 0,
  success_samples: 0,
  success_amount: 0,
  total_seconds: 360000,
  unknown_durations: 0,
  drop_rate: 0.6,
  average: 1.2,
  per_hour: 1.2
}
const groups = [
  {
    ...metrics,
    id: '4:D-718-MI',
    name: 'D-718-MI',
    series: 4,
    category: 'D',
    duration: 9000,
    condition: '',
    costs: [{ name: '物资', amount: 3000 }],
    per_hour: 0.48,
    total_seconds: 900000
  },
  {
    ...metrics,
    id: '4:H-063-UL',
    name: 'H-063-UL',
    series: 4,
    category: 'H',
    duration: 1800,
    condition: '',
    costs: [{ name: '心智魔方', amount: 3 }],
    per_hour: 2.4,
    total_seconds: 180000
  },
  {
    ...metrics,
    id: '4:G-412-MI',
    name: 'G-412-MI',
    series: 4,
    category: 'G',
    duration: 5400,
    condition: '',
    costs: [],
    per_hour: null,
    unknown_durations: 1
  }
]
async function mock(page: Page, mode: 'data' | 'empty' | 'error' = 'data') {
  await page.route(
    'https://api.azurpilot.com/api/v3/get/analysis?*',
    async (route) => {
      const url = new URL(route.request().url())
      expect(route.request().headers().authorization).toBeUndefined()
      expect(route.request().headers().cookie).toBeUndefined()
      if (mode === 'error')
        return route.fulfill({
          status: 503,
          json: { error: { message: '测试服务暂不可用' } }
        })
      const unit = url.searchParams.get('scene') === 'commission' ? '个' : '张'
      return route.fulfill({
        json: {
          schema_version: 3,
          from: url.searchParams.get('from'),
          to: url.searchParams.get('to'),
          scene: url.searchParams.get('scene'),
          target: url.searchParams.get('target'),
          result:
            mode === 'empty'
              ? {
                  ...metrics,
                  samples: 0,
                  occurrences: 0,
                  amount: 0,
                  min: 0,
                  max: 0,
                  extra_amount: 0,
                  total_seconds: 0,
                  drop_rate: 0,
                  average: 0,
                  per_hour: null,
                  unit,
                  groups: []
                }
              : { ...metrics, unit, groups }
        }
      })
    }
  )
}

test('target-first comparison, sorting, reward details, exports and isolated public navigation', async ({
  page
}, info) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (
      m.type() === 'error' &&
      /Content Security Policy|Refused to/.test(m.text())
    )
      errors.push(m.text())
  })
  await mock(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    '科研产物分析'
  )
  await expect(page.locator('tbody tr')).toHaveCount(3)
  await expect(page.locator('tbody tr').first()).toContainText('H-063-UL')
  await expect(
    page.locator('a[href*="admin"], a[href*="templates"], a[href*="/tm"]')
  ).toHaveCount(0)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true)
  await page.screenshot({
    path: `test-results/${info.project.name}-research.png`,
    fullPage: true
  })
  await page
    .getByRole('columnheader', { name: '每小时平均' })
    .getByRole('button')
    .click()
  await expect(page.locator('tbody tr').first()).toContainText('D-718-MI')
  await expect(page.locator('tbody tr').last()).toContainText('G-412-MI')
  await page
    .locator('tbody')
    .getByRole('button')
    .filter({ hasText: 'H-063-UL' })
    .click()
  await expect(page.getByRole('dialog')).toContainText('心智魔方 × 3')
  await expect(page.getByRole('dialog')).toContainText('零掉落样本')
  await page.getByRole('button', { name: '关闭明细', exact: true }).click()
  await page.getByRole('button', { name: '单项查询', exact: true }).click()
  await page.getByRole('combobox', { name: '搜索具体产物' }).fill('埃吉尔')
  await page.getByRole('option', { name: /蓝图：埃吉尔/ }).click()
  await expect(page).toHaveURL(/target=item%3ABlueprintAgir/)
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出数据' }).click()
  const report = await download
  expect(report.suggestedFilename()).toContain('蓝图：埃吉尔')
  const csv = await readFile((await report.path())!, 'utf8')
  expect(csv).toContain('"样本数"')
  expect(csv).toContain('"魔方解析"')
  await page.getByRole('button', { name: '排行榜视图' }).click()
  await expect(page.locator('.ranking-list li')).toHaveCount(3)
  await page
    .getByRole('combobox', { name: '科研期数', exact: true })
    .selectOption('4')
  await expect(page).toHaveURL(/series=4/)
  await page
    .getByRole('combobox', { name: '任务时长', exact: true })
    .selectOption('1800')
  await expect(page).toHaveURL(/duration=1800/)
  await page.reload()
  await expect(
    page.getByRole('combobox', { name: '科研期数', exact: true })
  ).toHaveValue('4')
  await expect(page.locator('.target-tag')).toHaveText('蓝图：埃吉尔')
  await page
    .locator('.scene-tabs')
    .getByRole('link', { name: '军事委托' })
    .click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    '军事委托分析'
  )
  await expect(
    page.getByRole('button', { name: '心智魔方', exact: true })
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('tbody tr')).toHaveCount(3)
  await page
    .locator('.method-note')
    .getByRole('link', { name: '了解更多' })
    .click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    '每一份数据，都有据可查'
  )
  expect(errors).toEqual([])
})

test('no samples, custom dates and errors never display invented yield', async ({
  page
}) => {
  await mock(page, 'empty')
  await page.goto('/commission/')
  await expect(
    page.getByRole('heading', { name: '当前条件下暂无公开样本' })
  ).toBeVisible()
  await expect(page.getByRole('button', { name: '导出数据' })).toBeDisabled()
  await page
    .getByRole('combobox', { name: '统计范围', exact: true })
    .selectOption('custom')
  await expect(page.locator('.error-banner[role=alert]')).toContainText(
    '请选择有效的起止日期'
  )
  await page.getByLabel('开始日期', { exact: true }).fill('2026-10-01')
  await page.getByLabel('结束日期', { exact: true }).fill('2026-10-07')
  await expect(page.locator('.error-banner[role=alert]')).toHaveCount(0)
  await page.unrouteAll({ behavior: 'wait' })
  await mock(page, 'error')
  await page.getByRole('button', { name: '刷新统计' }).click()
  await expect(page.locator('.error-banner[role=alert]')).toContainText(
    '测试服务暂不可用'
  )
  await expect(page.locator('tbody tr')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '导出数据' })).toBeDisabled()
})

test('admin export still hydrates its login under the generated CSP', async ({
  page
}) => {
  await page.goto('http://127.0.0.1:5183')
  await expect(page.getByRole('button', { name: /登录/ })).toBeVisible()
  await expect(page.locator('input[type="password"]')).toBeVisible()
})
