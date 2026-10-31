'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  Anchor,
  Flask,
  Compass,
  BookOpen,
  ArrowUpRight,
  CaretRight,
  List,
  Database
} from '@phosphor-icons/react'
import type { Scene } from '../../statistics'
export function StatisticsShell({
  scene,
  children
}: {
  scene?: Scene
  children: React.ReactNode
}) {
  const [mobile, setMobile] = useState(false)
  return (
    <div className="stats-shell">
      <a className="skip-link" href="#main">
        跳到主要内容
      </a>
      <header className="site-header">
        <div className="brand">
          <Anchor size={27} weight="bold" />
          <span>
            AzurPilot<span className="brand-divider">/</span>
            <span className="brand-product">数据观测站</span>
          </span>
        </div>
        <div className="header-right">
          <span className="public-label">
            <span />
            公开统计
          </span>
          <Link href="/methodology/">
            数据说明 <BookOpen size={13} />
          </Link>
          <button
            className="mobile-menu icon-button"
            aria-label="切换导航"
            aria-expanded={mobile}
            onClick={() => setMobile(!mobile)}
          >
            <List size={21} />
          </button>
        </div>
      </header>
      <aside className={`stats-sidebar ${mobile ? 'is-open' : ''}`}>
        <div className="workspace-label">
          <span className="workspace-icon">
            <Anchor size={18} />
          </span>
          <div>
            碧蓝航线<span>社区数据统计</span>
          </div>
        </div>
        <div className="nav-label">产物分析</div>
        <nav aria-label="主导航">
          <Link
            className={scene === 'research' ? 'nav-link selected' : 'nav-link'}
            href="/"
            onClick={() => setMobile(false)}
          >
            <Flask size={19} />
            科研产物
            <CaretRight size={13} />
          </Link>
          <Link
            className={
              scene === 'commission' ? 'nav-link selected' : 'nav-link'
            }
            href="/commission/"
            onClick={() => setMobile(false)}
          >
            <Compass size={19} />
            军事委托
            <CaretRight size={13} />
          </Link>
          <div className="nav-label nav-label-spaced">数据与说明</div>
          <Link
            className={!scene ? 'nav-link selected' : 'nav-link'}
            href="/methodology/"
            onClick={() => setMobile(false)}
          >
            <BookOpen size={19} />
            统计口径
          </Link>
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-note">
            <Database size={17} />
            <span>每一份产出，都有据可查</span>
          </div>
          <p>
            基于玩家上传的真实完成记录
            <br />
            为你的资源规划提供参考
          </p>
          <a href="https://azurpilot.com" target="_blank" rel="noreferrer">
            了解 AzurPilot <ArrowUpRight size={12} />
          </a>
        </div>
      </aside>
      <main id="main" className="stats-content">
        <div className="breadcrumb">
          数据观测站
          <CaretRight size={12} />
          <span>
            {scene === 'research'
              ? '科研产物'
              : scene === 'commission'
                ? '军事委托'
                : '统计口径'}
          </span>
        </div>
        {children}
        <footer className="page-footer">
          <span>AzurPilot · 碧蓝航线社区统计</span>
          <span>样本反映已观测产出，概率随样本积累变化</span>
        </footer>
      </main>
    </div>
  )
}
