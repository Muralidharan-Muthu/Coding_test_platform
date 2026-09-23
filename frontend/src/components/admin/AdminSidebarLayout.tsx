import { Fragment, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ThemeToggle from '../ui/ThemeToggle'
import { PlatformLogoSmall } from '../ui/Branding'
import { getQuestionTypes, createQuestionType, deleteQuestionType } from '../../api'
import { useToast } from '../ui/ToastProvider'
import { useConfirm } from '../ui/ConfirmDialog'
import { ADMIN_NAV_ITEMS } from '../../constants/data'
import { FiPlus, FiX } from 'react-icons/fi'

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

function isNavItemActive(item, pathname, search = '') {
  if (!item || !item.href) return false
  const fullCurrent = pathname + (search || '')
  const cleanPath = (pathname || '').replace(/\/+$/, '')
  const cleanHref = (item.href || '').replace(/\/+$/, '')

  // Specific check for Assessment Dashboard:
  const labelLower = (item.label || '').toLowerCase()
  if (labelLower.includes('assessment') || labelLower.includes('dashboard')) {
    if (
      cleanPath === '/admin/dashboard' ||
      cleanPath === '/admin/dashboard/assessment' ||
      cleanPath === '/dashboard/assessment' ||
      cleanPath.startsWith('/admin/dashboard') ||
      cleanPath.startsWith('/dashboard/assessment')
    ) {
      return true
    }
  }

  // Direct exact match
  if (cleanPath === cleanHref) return true

  // activePaths array check
  if (Array.isArray(item.activePaths)) {
    for (const path of item.activePaths) {
      const cleanTarget = (path || '').replace(/\/+$/, '')
      if (cleanPath === cleanTarget || fullCurrent === path) return true
      if (cleanPath.startsWith(`${cleanTarget}/`)) return true
    }
  }

  return cleanHref ? cleanPath.startsWith(`${cleanHref}/`) : false
}

function getGroupKey(item) {
  return item.href || item.label
}

function AddTypeGlobalModal({ onAdd, onClose }) {
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) {
      setError('Please enter a type name (e.g. Java, C++, JavaScript)')
      return
    }
    setLoading(true)
    setError('')
    try {
      await onAdd(trimmed)
      onClose()
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to create question type table')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="qp-modal-overlay" onClick={onClose}>
      <div className="qp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="qp-modal-header">
          <h3>Add Question Type</h3>
          <button className="qp-modal-close" onClick={onClose} aria-label="Close"><FiX /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <p className="qp-modal-desc">
            Enter a custom language like <code>Java</code>, <code>C++</code>, <code>JavaScript</code>.
            A dedicated database table will be automatically provisioned in Turso.
          </p>
          <input
            className="qp-modal-input"
            type="text"
            value={value}
            onChange={(e) => { setValue(e.target.value); setError('') }}
            placeholder="e.g. Java, C++, JavaScript"
            autoFocus
            disabled={loading}
          />
          {error && <p className="qp-modal-error">{error}</p>}
          <div className="qp-modal-actions">
            <button type="button" className="qp-modal-btn-cancel" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="qp-modal-btn-add" disabled={loading}>
              <FiPlus /> {loading ? 'Creating Table…' : 'Add Type'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AdminSidebarLayout({
  className = '',
  adminName = 'Admin User',
  navItems = ADMIN_NAV_ITEMS,
  sidebarExtra = null,
  sidebarExtraAfterHref = null,
  onNavigate = () => {},
  onLogout = () => {},
  onAddType = null,
  onRemoveCustomType = null,
  children,
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_STATE_KEY) === '1')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState({})
  const [globalQuestionTypes, setGlobalQuestionTypes] = useState([])
  const [showGlobalAddType, setShowGlobalAddType] = useState(false)

  // Load question types dynamically in sidebar
  const fetchSidebarQuestionTypes = async () => {
    try {
      const types = await getQuestionTypes()
      setGlobalQuestionTypes(types || [])
    } catch (err) {
      console.error('[Sidebar] Failed to load dynamic question types:', err)
    }
  }

  useEffect(() => {
    fetchSidebarQuestionTypes()
  }, [location.pathname])

  const handleGlobalCreateType = async (typeName) => {
    const res = await createQuestionType(typeName)
    toast.success(`Question type '${res.type?.display_name || typeName}' created! Database table provisioned.`)
    await fetchSidebarQuestionTypes()
    navigate(`/admin/questions/python_questions?type=${res.type?.slug || typeName.toLowerCase()}`)
  }

  const handleGlobalRemoveType = async (typeSlug) => {
    const ok = await confirm({
      title: 'Delete Question Type',
      message: `Are you sure you want to delete question type "${typeSlug}"? This will drop its dedicated table from the database and remove all its questions.`,
      confirmText: 'Delete Type & Table',
      cancelText: 'Cancel',
      type: 'danger'
    })
    if (!ok) return

    try {
      await deleteQuestionType(typeSlug)
      toast.success(`Deleted question type '${typeSlug}'.`)
      await fetchSidebarQuestionTypes()
      navigate('/admin/questions/python_questions')
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to delete question type')
    }
  }

  // Enrich navItems so that all menu groups are complete, robust and styled consistently
  const enrichedNavItems = useMemo(() => {
    const customTypes = globalQuestionTypes.filter((t) => t.is_system === 0)
    const itemsToUse = (Array.isArray(navItems) && navItems.length > 0) ? navItems : ADMIN_NAV_ITEMS
    
    return itemsToUse.map((item) => {
      const label = (item.label || '').toLowerCase()

      // 1. Assessment Dashboard: canonical href and activePaths
      if (label.includes('assessment') || label.includes('dashboard')) {
        return {
          ...item,
          href: '/admin/dashboard/assessment',
          activePaths: ['/admin/dashboard', '/admin/dashboard/assessment', '/dashboard/assessment'],
        }
      }

      // 2. Questions: ALWAYS ensure children with Python, SQL, MCQ, custom types, and Add Type
      if (label.includes('question')) {
        const baseSystemChildren = [
          {
            label: 'Python Questions',
            href: '/admin/questions/python_questions',
            activePaths: ['/admin/questions/python_questions', '/admin/questions/python'],
          },
          {
            label: 'SQL Questions',
            href: '/admin/questions/sql_questions',
            activePaths: ['/admin/questions/sql_questions', '/admin/questions/sql'],
          },
          {
            label: 'MCQ Questions',
            href: '/admin/questions/mcq_questions',
            activePaths: ['/admin/questions/mcq_questions', '/admin/questions/mcq'],
          },
        ]

        const customChildren = customTypes.map((t) => ({
          label: `${t.display_name} Questions`,
          href: `/admin/questions/python_questions?type=${t.slug}`,
          activePaths: [
            `/admin/questions/python_questions?type=${t.slug}`,
            `/admin/questions/python_questions?lang=${t.slug}`,
          ],
          isCustom: true,
          typeKey: t.slug,
        }))

        return {
          ...item,
          href: item.href || '/admin/questions/python_questions',
          activePaths: item.activePaths || ['/admin/questions'],
          children: [
            ...baseSystemChildren,
            ...customChildren,
            {
              label: '+ Add Type',
              isAddButton: true,
            },
          ],
        }
      }

      // 3. Manage Candidates: ALWAYS ensure children with Choose Test Type and Send Mail
      if (label.includes('candidate') || label.includes('manage')) {
        const candidateChildren = [
          {
            label: 'Choose Test Type',
            href: '/admin/test-type',
            activePaths: ['/admin/test-type'],
          },
          {
            label: 'Send Mail',
            href: '/admin/send-mail',
            activePaths: ['/admin/send-mail'],
          },
        ]

        return {
          ...item,
          href: item.href || '/admin/otp',
          activePaths: item.activePaths || ['/admin/otp'],
          children: candidateChildren,
        }
      }

      return item
    })
  }, [navItems, globalQuestionTypes])

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STATE_KEY, collapsed ? '1' : '0')
  }, [collapsed])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    setExpandedGroups((prev) => {
      const next = { ...prev }
      enrichedNavItems.forEach((item) => {
        if (!Array.isArray(item.children) || item.children.length === 0) return
        const key = getGroupKey(item)
        const shouldOpen = isNavItemActive(item, location.pathname, location.search) ||
          item.children.some((child) => isNavItemActive(child, location.pathname, location.search))
        if (prev[key] === undefined || shouldOpen) {
          next[key] = true
        }
      })
      return next
    })
  }, [location.pathname, location.search, enrichedNavItems])

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
    walk(enrichedNavItems)
    return flattened
  }, [enrichedNavItems])

  const activeItem = useMemo(
    () => flattenedNavItems.find((item) => isNavItemActive(item, location.pathname, location.search)),
    [flattenedNavItems, location.pathname, location.search]
  )

  const currentLabel = activeItem?.label || 'Admin Dashboard'
  const renderedSidebarExtra = typeof sidebarExtra === 'function'
    ? sidebarExtra({ collapsed, pathname: location.pathname })
    : sidebarExtra
  const appendSidebarExtraToEnd = Boolean(renderedSidebarExtra) && (
    !sidebarExtraAfterHref || !enrichedNavItems.some((item) => item.href === sidebarExtraAfterHref)
  )

  const toggleGroup = (item) => {
    const key = getGroupKey(item)
    setExpandedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  return (
    <div className={`admin-shell flex min-h-screen relative text-slate-800 dark:text-[#eff1f6] ${className} ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      <button
        type="button"
        className="admin-shell-overlay"
        aria-label="Close navigation menu"
        onClick={() => setMobileOpen(false)}
      />

      <aside className="admin-shell-sidebar shrink-0 sticky top-0 h-screen flex flex-col z-[120]" aria-label="Admin navigation">
        <div className="admin-shell-brand-row">
          {!collapsed ? (
            <button
              type="button"
              className="admin-shell-brand"
              onClick={() => onNavigate(enrichedNavItems[0]?.href || '/admin/dashboard/assessment')}
              aria-label="Go to assessment dashboard"
            >
              <img
                src="/assets/meptrasoft-logo.png"
                alt="Meptrasoft AI Technologies"
                className="admin-shell-brand-img"
              />
            </button>
          ) : (
            <button
              type="button"
              className="admin-shell-brand-mini"
              onClick={() => onNavigate(enrichedNavItems[0]?.href || '/admin/dashboard/assessment')}
              aria-label="Go to assessment dashboard"
              title="Meptrasoft AI Technologies"
            >
              <img
                src="/assets/meptrasoft-icon.png"
                alt="Meptrasoft AI Technologies"
                className="admin-shell-brand-mini-img"
              />
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
          {enrichedNavItems.map((item) => {
            const hasChildren = Array.isArray(item.children) && item.children.length > 0
            const hasActiveChild = hasChildren && item.children.some((child) => isNavItemActive(child, location.pathname, location.search))
            const isActive = isNavItemActive(item, location.pathname, location.search) || hasActiveChild
            const isExpanded = hasChildren ? Boolean(expandedGroups[getGroupKey(item)]) : false

            return (
              <Fragment key={`${item.label}-${item.href || 'root'}`}>
                <div
                  className={`admin-shell-nav-group${hasActiveChild ? ' has-active-child' : ''}${isExpanded ? ' expanded' : ''}`}
                >
                  <div className={`admin-shell-nav-row${hasChildren ? ' has-children' : ''}`}>
                    <button
                      type="button"
                      className={`admin-shell-nav-item admin-shell-nav-main${isActive ? ' active' : ''}`}
                      onClick={() => {
                        if (item.href) onNavigate(item.href)
                        if (hasChildren && !isExpanded) {
                          toggleGroup(item)
                        }
                      }}
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
                                else setShowGlobalAddType(true)
                              }}
                            >
                              <span className="admin-shell-nav-icon" aria-hidden="true">
                                <PlusIcon />
                              </span>
                              <span className="admin-shell-nav-label">Add Type</span>
                            </button>
                          )
                        }

                        const isChildActive = isNavItemActive(child, location.pathname, location.search)
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

                            {child.isCustom && (
                              <button
                                type="button"
                                className="admin-shell-subnav-del-btn"
                                title={`Remove ${child.label}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (onRemoveCustomType) {
                                    onRemoveCustomType(child.typeKey || child.label.replace(' Questions', '').toLowerCase())
                                  } else {
                                    handleGlobalRemoveType(child.typeKey || child.label.replace(' Questions', '').toLowerCase())
                                  }
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
              </Fragment>
            )
          })}
        </nav>

        <div className="admin-shell-footer">
          <button
            type="button"
            className="admin-shell-logout"
            onClick={onLogout}
            title={collapsed ? 'Logout' : undefined}
          >
            <span className="admin-shell-logout-icon" aria-hidden="true">
              <LogoutIcon />
            </span>
            <span className="admin-shell-nav-label">Logout</span>
          </button>
        </div>
      </aside>

      <div className="admin-shell-main flex-1 min-w-0 flex flex-col">
        <header className="admin-shell-topbar">
          <div className="admin-shell-topbar-left">
            <button
              type="button"
              className="admin-shell-mobile-toggle"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label="Open navigation menu"
            >
              <MenuIcon />
            </button>
            <h1 className="admin-shell-page-title">{currentLabel}</h1>
          </div>

          <div className="admin-shell-topbar-right">
            <ThemeToggle />
            <div className="admin-shell-user">
              <span className="admin-shell-user-avatar" aria-hidden="true">
                {(adminName || 'A').charAt(0).toUpperCase()}
              </span>
              <span className="admin-shell-user-name">{adminName}</span>
            </div>
          </div>
        </header>

        <main className="admin-shell-body flex-1 min-w-0 min-h-0">
          {children}
        </main>
      </div>

      {showGlobalAddType && (
        <AddTypeGlobalModal
          onAdd={handleGlobalCreateType}
          onClose={() => setShowGlobalAddType(false)}
        />
      )}
    </div>
  )
}

export default AdminSidebarLayout