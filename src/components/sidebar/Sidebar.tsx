import { useState } from 'react'
import './sidebar.css'

interface SidebarButton {
  id: string
  label: string
  icon: React.ReactNode
  onClick?: () => void
}

const menuButtons: SidebarButton[] = [
  { id: 'home', label: 'Home', icon: <HomeIcon /> },
  { id: 'projects', label: 'Projects', icon: <ProjectsIcon /> },
  { id: 'templates', label: 'Templates', icon: <TemplatesIcon /> },
  { id: 'media', label: 'Media', icon: <MediaIcon /> },
  { id: 'exports', label: 'Exports', icon: <ExportsIcon /> },
]

const bottomButtons: SidebarButton[] = [
  { id: 'settings', label: 'Settings', icon: <SettingsIcon /> },
]

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false)
  const [activeId, setActiveId] = useState('home')

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      <div className="sidebar__header">
        {collapsed ? (
          <button
            className="sidebar__toggle"
            onClick={() => setCollapsed(false)}
            aria-label="Expand sidebar"
          >
            <ChevronIcon direction="right" />
          </button>
        ) : (
          <>
            <div className="sidebar__logo">
              <img src="/login-logo.svg" alt="Nekta" className="sidebar__logo-img" />
            </div>
            <button
              className="sidebar__toggle"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
            >
              <ChevronIcon direction="left" />
            </button>
          </>
        )}
      </div>

      <div className="sidebar__separator" />

      <nav className="sidebar__nav">
        <ul className="sidebar__menu">
          {menuButtons.map((btn) => (
            <li key={btn.id}>
              <button
                className={`sidebar__btn ${activeId === btn.id ? 'sidebar__btn--active' : ''}`}
                onClick={() => {
                  setActiveId(btn.id)
                  btn.onClick?.()
                }}
                title={collapsed ? btn.label : undefined}
              >
                <span className="sidebar__btn-icon">{btn.icon}</span>
                {!collapsed && <span className="sidebar__btn-label">{btn.label}</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar__bottom">
        <ul className="sidebar__menu">
          {bottomButtons.map((btn) => (
            <li key={btn.id}>
              <button
                className={`sidebar__btn ${activeId === btn.id ? 'sidebar__btn--active' : ''}`}
                onClick={() => {
                  setActiveId(btn.id)
                  btn.onClick?.()
                }}
                title={collapsed ? btn.label : undefined}
              >
                <span className="sidebar__btn-icon">{btn.icon}</span>
                {!collapsed && <span className="sidebar__btn-label">{btn.label}</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}

// Icons
function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function ProjectsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function TemplatesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  )
}

function MediaIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
      <line x1="7" y1="2" x2="7" y2="22" />
      <line x1="17" y1="2" x2="17" y2="22" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="2" y1="7" x2="7" y2="7" />
      <line x1="2" y1="17" x2="7" y2="17" />
      <line x1="17" y1="17" x2="22" y2="17" />
      <line x1="17" y1="7" x2="22" y2="7" />
    </svg>
  )
}

function ExportsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: direction === 'right' ? 'rotate(180deg)' : undefined }}
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}
