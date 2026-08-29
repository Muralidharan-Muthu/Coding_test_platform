import { Fragment, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import ThemeToggle from '../ui/ThemeToggle'
import { PlatformLogoSmall } from '../ui/Branding'
import './AdminSidebarLayout.css'

const SIDEBAR_STATE_KEY = 'admin_sidebar_collapsed'

const ChevronLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="15 18 9 12 15 6" />
  </svg>
)

const ChevronRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

const MenuIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
)

const LogoutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)

const DashboardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="8" height="8" rx="2" />
    <rect x="13" y="3" width="8" height="5" rx="2" />
    <rect x="13" y="10" width="8" height="11" rx="2" />
    <rect x="3" y="13" width="8" height="8" rx="2" />
  </svg>
)

const QuestionsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="8" y1="13" x2="16" y2="13" />
    <line x1="8" y1="17" x2="14" y2="17" />
  </svg>
)

const CodeIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
)

const DatabaseIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
)

const McqIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
)

const UsersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const TestTypeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 6h18" />
    <path d="M3 12h12" />
    <path d="M3 18h18" />
    <circle cx="16" cy="12" r="2" />
    <circle cx="8" cy="6" r="2" />
    <circle cx="13" cy="18" r="2" />
  </svg>
)

const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
    <polyline points="22,8 12,13 2,8" />
  </svg>
)

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const CloseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

function getNavIcon(href = '', label = '') {
  const lower = (href + ' ' + label).toLowerCase()
  if (lower.includes('assessment') || lower.includes('dashboard')) return <DashboardIcon />
  if (lower.includes('python')) return <CodeIcon />
  if (lower.includes('sql')) return <DatabaseIcon />
  if (lower.includes('mcq')) return <McqIcon />
  if (lower.includes('add') || lower.includes('plus')) return <PlusIcon />
  if (lower.includes('test-type')) return <TestTypeIcon />
  if (lower.includes('send-mail') || lower.includes('mail')) return <MailIcon />
  if (lower.includes('otp') || lower.includes('candidate')) return <UsersIcon />
  if (lower.includes('question')) return <QuestionsIcon />
  return <CodeIcon />
}

function isNavItemActive(item, pathname) {
  if (!item || !item.href) return false
  if (Array.isArray(item.activePaths) && item.activePaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return true
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

function getGroupKey(item) {
  return item.href || item.label
}

function AdminSidebarLayout({
  className = '',
  adminName = 'Admin User',
  navItems = [],
  sidebarExtra = null,
  sidebarExtraAfterHref = null,
  onNavigate = () => {},
  onLogout = () => {},
  onAddType = null,
  onRemoveCustomType = null,
  children,
}) {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_STATE_KEY) === '1')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState({})

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STATE_KEY, collapsed ? '1' : '0')
  }, [collapsed])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    setExpandedGroups((prev) => {
      const next = { ...prev }
      navItems.forEach((item) => {
        if (!Array.isArray(item.children) || item.children.length === 0) return
        const key = getGroupKey(item)
        const shouldOpen = isNavItemActive(item, location.pathname) || item.children.some((child) => isNavItemActive(child, location.pathname))
        if (prev[key] === undefined || shouldOpen) {
          next[key] = true
        }
      })
      return next
    })
  }, [location.pathname, navItems])

  const flattenedNavItems = useMemo(() => {
    const flattened = []
    const walk = (items = []) => {
      items.forEach((item) => {
        flattened.push(item)
        if (Array.isArray(item.children) && item.children.length > 0) {
          walk(item.children)
        }
      })
    }
    walk(navItems)
    return flattened
  }, [navItems])

  const activeItem = useMemo(
    () => flattenedNavItems.find((item) => isNavItemActive(item, location.pathname)),
    [flattenedNavItems, location.pathname]
  )

  const currentLabel = activeItem?.label || 'Admin Dashboard'
  const renderedSidebarExtra = typeof sidebarExtra === 'function'
    ? sidebarExtra({ collapsed, pathname: location.pathname })
    : sidebarExtra
  const appendSidebarExtraToEnd = Boolean(renderedSidebarExtra) && (
    !sidebarExtraAfterHref || !navItems.some((item) => item.href === sidebarExtraAfterHref)
  )

  const toggleGroup = (item) => {
    const key = getGroupKey(item)
    setExpandedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  return (
    <div className={`admin-shell ${className} ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      <button
        type="button"
        className="admin-shell-overlay"
        aria-label="Close navigation menu"
        onClick={() => setMobileOpen(false)}
      />

      <aside className="admin-shell-sidebar" aria-label="Admin navigation">
        <div className="admin-shell-brand-row">
          {!collapsed && (
            <button
              type="button"
              className="admin-shell-brand"
              onClick={() => onNavigate(navItems[0]?.href || '/admin/dashboard/assessment')}
              aria-label="Go to assessment dashboard"
            >
              <PlatformLogoSmall />
            </button>
          )}

          <button
            type="button"
            className="admin-shell-toggle"
            onClick={() => setCollapsed((prev) => !prev)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </button>
        </div>

        <nav className="admin-shell-nav">
          {navItems.map((item) => {
            const hasChildren = Array.isArray(item.children) && item.children.length > 0
            const hasActiveChild = hasChildren && item.children.some((child) => isNavItemActive(child, location.pathname))
            const isActive = isNavItemActive(item, location.pathname) || hasActiveChild
            const isExpanded = hasChildren ? Boolean(expandedGroups[getGroupKey(item)]) : false
            const insertSidebarExtraAfterItem = Boolean(renderedSidebarExtra) && item.href === sidebarExtraAfterHref

            return (
              <Fragment key={`${item.label}-${item.href || 'root'}`}>
                <div
                  className={`admin-shell-nav-group${hasActiveChild ? ' has-active-child' : ''}${isExpanded ? ' expanded' : ''}`}
                >
                  <div className={`admin-shell-nav-row${hasChildren ? ' has-children' : ''}`}>
                    <button
                      type="button"
                      className={`admin-shell-nav-item admin-shell-nav-main${isActive ? ' active' : ''}`}
                      onClick={() => item.href && onNavigate(item.href)}
                      title={collapsed ? item.label : undefined}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <span className="admin-shell-nav-icon" aria-hidden="true">
                        {getNavIcon(item.href, item.label)}
                      </span>
                      <span className="admin-shell-nav-label">{item.label}</span>
                    </button>

                    {!collapsed && hasChildren && (
                      <button
                        type="button"
                        className={`admin-shell-nav-toggle${isExpanded ? ' expanded' : ''}${isActive ? ' active' : ''}`}
                        onClick={() => toggleGroup(item)}
                        aria-label={isExpanded ? `Collapse ${item.label}` : `Expand ${item.label}`}
                        aria-expanded={isExpanded}
                      >
                        <ChevronDownIcon />
                      </button>
                    )}
                  </div>

                  {!collapsed && hasChildren && isExpanded && (
                    <div className={`admin-shell-subnav${hasActiveChild ? ' active' : ''}`}>
                      {item.children.map((child) => {
                        if (child.isAddButton) {
                          return (
                            <button
                              key="add-type-button"
                              type="button"
                              className="admin-shell-subnav-add-btn"
                              onClick={() => {
                                if (onAddType) onAddType()
                              }}
                            >
                              <span className="admin-shell-nav-icon" aria-hidden="true">
                                <PlusIcon />
                              </span>
                              <span className="admin-shell-nav-label">Add Type</span>
                            </button>
                          )
                        }

                        const isChildActive = isNavItemActive(child, location.pathname)
                        return (
                          <div key={`${child.label}-${child.href || 'child'}`} className="admin-shell-subnav-row">
                            <button
                              type="button"
                              className={`admin-shell-nav-item admin-shell-subnav-item${isChildActive ? ' active' : ''}`}
                              onClick={() => child.href && onNavigate(child.href, child)}
                              aria-current={isChildActive ? 'page' : undefined}
                            >
                              <span className="admin-shell-nav-icon" aria-hidden="true">
                                {getNavIcon(child.href, child.label)}
                              </span>
                              <span className="admin-shell-nav-label">{child.label}</span>
                            </button>

                            {child.isCustom && onRemoveCustomType && (
                              <button
                                type="button"
                                className="admin-shell-subnav-del-btn"
                                title={`Remove ${child.label}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onRemoveCustomType(child.typeKey || child.label.replace(' Questions', '').toLowerCase())
                                }}
                              >
                                <CloseIcon />
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {insertSidebarExtraAfterItem && (
                  <div className="admin-shell-nav-extra">
                    {renderedSidebarExtra}
                  </div>
                )}
              </Fragment>
            )
          })}

          {appendSidebarExtraToEnd && (
            <div className="admin-shell-nav-extra">
              {renderedSidebarExtra}
            </div>
          )}
        </nav>

        <div className="admin-shell-sidebar-footer">
          <button
            type="button"
            className="admin-shell-logout"
            onClick={onLogout}
            title={collapsed ? 'Logout' : undefined}
            aria-label="Log out"
          >
            <span className="admin-shell-nav-icon" aria-hidden="true">
              <LogoutIcon />
            </span>
            <span className="admin-shell-nav-label">Logout</span>
          </button>
        </div>
      </aside>

      <div className="admin-shell-main">
        <header className="admin-shell-topbar">
          <div className="admin-shell-topbar-left">
            <button
              type="button"
              className="admin-shell-mobile-toggle"
              aria-label="Open navigation menu"
              onClick={() => setMobileOpen(true)}
            >
              <MenuIcon />
            </button>
            {collapsed && (
              <div className="admin-shell-topbar-brand" aria-hidden="true">
                <img
                  className="admin-shell-topbar-brand-img"
                  src="/assets/meptrasoft-logo.png"
                  alt=""
                />
              </div>
            )}
            <p className="admin-shell-page-title">{currentLabel}</p>
          </div>

          <div className="admin-shell-topbar-right">
            <ThemeToggle />
            <div className="admin-shell-user-chip" title={adminName || 'Admin User'}>
              <span className="admin-shell-user-avatar" aria-hidden="true">
                {(adminName || 'A').charAt(0).toUpperCase()}
              </span>
              <span className="admin-shell-user-name">{adminName || 'Admin User'}</span>
            </div>
          </div>
        </header>

        <div className="admin-shell-body">
          {children}
        </div>
      </div>
    </div>
  )
}

export default AdminSidebarLayout