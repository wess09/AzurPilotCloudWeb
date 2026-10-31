import { startTransition, useEffect, useState, ViewTransition } from 'react'
import { Sidebar, useSidebar } from '@cloudflare/kumo/components/sidebar'
import { Button } from '@cloudflare/kumo/components/button'
import { Text } from '@cloudflare/kumo/components/text'
import { Banner } from '@cloudflare/kumo/components/banner'
import { Badge } from '@cloudflare/kumo/components/badge'
import { House, Megaphone, ArrowCircleUp, CalendarBlank, CloudArrowUp, SquaresFour, SignOut, ChartBar } from '@phosphor-icons/react'
import { clearToken, getToken, setAuthErrorHandler, isAdminPreview } from './api'
import { Login } from './views/Login'
import { OverviewView } from './views/OverviewView'
import { AnnouncementView } from './views/AnnouncementView'
import { UpdatePolicyView } from './views/UpdatePolicyView'
import { MaintenanceView } from './views/MaintenanceView'
import { PublishStatusView } from './views/PublishStatusView'
import { TemplateServiceView } from './views/TemplateServiceView'
import { Logo } from './ui'

type Section = 'overview' | 'announcement' | 'update-policy' | 'maintenance' | 'publish' | 'template-service'

const SECTIONS = [
  { key: 'overview', label: '概览', icon: House },
  { key: 'announcement', label: '公告管理', icon: Megaphone },
  { key: 'update-policy', label: '更新策略', icon: ArrowCircleUp },
  { key: 'maintenance', label: '维护计划', icon: CalendarBlank },
  { key: 'publish', label: '发布状态', icon: CloudArrowUp },
  { key: 'template-service', label: '模板服务', icon: SquaresFour }
] as const

export function App() {
  const [authed, setAuthed] = useState(() => isAdminPreview() || getToken() !== '')
  const [banner, setBanner] = useState<string | null>(null)

  useEffect(() => {
    setAuthErrorHandler(() => {
      setBanner('管理凭据已失效，请重新登录')
      setAuthed(false)
    })
  }, [])

  if (!authed) return <Login errorMessage={banner} onLogin={() => { setBanner(null); setAuthed(true) }} />

  return (
    <Sidebar.Provider defaultOpen collapsible="offcanvas" mobileBreakpoint={640} className="h-dvh overflow-hidden">
      <AdminLayout banner={banner} onDismiss={() => setBanner(null)} onLogout={() => { if (isAdminPreview()) { window.location.assign('/'); return }; clearToken(); setAuthed(false) }} />
    </Sidebar.Provider>
  )
}

function AdminLayout({ banner, onDismiss, onLogout }: { banner: string | null; onDismiss: () => void; onLogout: () => void }) {
  const [section, setSection] = useState<Section>(() => {
    const selected = isAdminPreview() ? new URLSearchParams(window.location.search).get('section') : null
    return SECTIONS.find(item => item.key === selected)?.key ?? 'overview'
  })
  const { setOpenMobile } = useSidebar()
  const navigate = (next: Section) => {
    startTransition(() => setSection(next))
    setOpenMobile(false)
  }

  return (
    <>
      <Sidebar>
        <Sidebar.Header>
          <div className="admin-brand"><Logo /><Text as="span" variant="heading">AzurPilot</Text>{isAdminPreview() && <Badge variant="warning">预览数据</Badge>}</div>
        </Sidebar.Header>
        <Sidebar.Content>
          <Sidebar.Group>
            <Sidebar.Menu>
              {SECTIONS.map(({ key, label, icon: Icon }) => (
                <Sidebar.MenuButton key={key} active={section === key} icon={<Icon size={18} />} onClick={() => navigate(key)}>{label}</Sidebar.MenuButton>
              ))}
            </Sidebar.Menu>
          </Sidebar.Group>
          <Sidebar.Group>
            <Sidebar.Menu>
              <Sidebar.MenuButton href="https://stats.azurpilot.com" target="_blank" icon={<ChartBar size={18} />}>公开统计</Sidebar.MenuButton>
            </Sidebar.Menu>
          </Sidebar.Group>
        </Sidebar.Content>
        <Sidebar.Footer>
          <Sidebar.Menu>
            <Sidebar.MenuButton onClick={onLogout} icon={<SignOut size={18} />}>{isAdminPreview() ? '退出预览' : '退出登录'}</Sidebar.MenuButton>
          </Sidebar.Menu>
        </Sidebar.Footer>
      </Sidebar>
      <main className="admin-content">
        <div className="admin-mobile-navigation"><Sidebar.Trigger aria-label="切换导航" /><Logo size={28} /></div>
        {banner && <Banner variant="error" title={banner} action={<Button variant="ghost" onClick={onDismiss}>关闭</Button>} />}
        <ViewTransition key={section} name="admin-page" enter="auto" share="auto" default="none">
          <div className="admin-page">
            <Text as="h1" variant="heading" size="lg">{SECTIONS.find(item => item.key === section)?.label}</Text>
            {section === 'overview' && <OverviewView onNavigate={() => navigate('publish')} />}
            {section === 'announcement' && <AnnouncementView />}
            {section === 'update-policy' && <UpdatePolicyView />}
            {section === 'maintenance' && <MaintenanceView />}
            {section === 'publish' && <PublishStatusView />}
            {section === 'template-service' && <TemplateServiceView />}
          </div>
        </ViewTransition>
      </main>
    </>
  )
}
