'use client'
import { forwardRef, useEffect } from 'react'
import NextLink from 'next/link'
import { usePathname } from 'next/navigation'
import { LinkProvider, type LinkComponentProps } from '@cloudflare/kumo/utils'
import { Sidebar, useSidebar } from '@cloudflare/kumo/components/sidebar'
import { Link } from '@cloudflare/kumo/components/link'
import { Flask, Compass, BookOpen } from '@phosphor-icons/react'
import { Logo } from '../Logo'

const AppLink = forwardRef<HTMLAnchorElement, LinkComponentProps>(
  ({ href, ...props }, ref) => <NextLink {...props} href={href ?? '#'} ref={ref} />
)
AppLink.displayName = 'AppLink'

export function StatisticsShell({
  children
}: {
  children: React.ReactNode
}) {
  return <LinkProvider component={AppLink}><Sidebar.Provider defaultOpen collapsible="offcanvas" mobileBreakpoint={640} className="min-h-screen"><Layout>{children}</Layout></Sidebar.Provider></LinkProvider>
}

function Layout({children}:{children:React.ReactNode}) {
  const pathname = usePathname()
  const scene = pathname === '/commission/' || pathname === '/commission' ? 'commission' : pathname === '/' ? 'research' : undefined
  const { setOpenMobile } = useSidebar()
  useEffect(() => { setOpenMobile(false) }, [pathname,setOpenMobile])
  return (
    <>
      <Link href="#main" className="skip-link">
        跳到主要内容
      </Link>
      <Sidebar>
        <Sidebar.Header>
          <div className="site-brand">
            <Logo />
            <span>AzurPilot</span>
          </div>
        </Sidebar.Header>
        <Sidebar.Content>
          <Sidebar.Group>
            <Sidebar.Menu>
              <Sidebar.MenuButton
                href="/"
                active={scene === 'research'}
                icon={<Flask size={18} />}
              >
                科研产物
              </Sidebar.MenuButton>
              <Sidebar.MenuButton
                href="/commission/"
                active={scene === 'commission'}
                icon={<Compass size={18} />}
              >
                军事委托
              </Sidebar.MenuButton>
            </Sidebar.Menu>
          </Sidebar.Group>
        </Sidebar.Content>
        <Sidebar.Footer>
          <Sidebar.Menu>
            <Sidebar.MenuButton
              href="/methodology/"
              active={!scene}
              icon={<BookOpen size={18} />}
            >
              统计口径
            </Sidebar.MenuButton>
          </Sidebar.Menu>
        </Sidebar.Footer>
      </Sidebar>
      <main id="main" className="stats-content">
        <div className="mobile-navigation">
          <Sidebar.Trigger aria-label="切换导航" />
          <Logo size={28} />
        </div>
        {children}
      </main>
    </>
  )
}
