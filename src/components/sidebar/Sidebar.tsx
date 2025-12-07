import { useState } from 'react'
import { twMerge } from 'tailwind-merge'
import {
  HouseIcon,
  FolderSimpleIcon,
  LayoutIcon,
  FilmReelIcon,
  ExportIcon,
  GearIcon,
  CaretLeftIcon,
  CaretRightIcon,
} from '@phosphor-icons/react'
import { SidebarButton } from './SidebarButton'

interface SidebarItem {
  id: string
  label: string
  icon: React.ReactNode
  onClick?: () => void
}

const menuItems: SidebarItem[] = [
  { id: 'home', label: 'Home', icon: <HouseIcon size={20} /> },
  { id: 'projects', label: 'Projects', icon: <FolderSimpleIcon size={20} /> },
  { id: 'templates', label: 'Templates', icon: <LayoutIcon size={20} /> },
  { id: 'media', label: 'Media', icon: <FilmReelIcon size={20} /> },
  { id: 'exports', label: 'Exports', icon: <ExportIcon size={20} /> },
]

const bottomItems: SidebarItem[] = [
  { id: 'settings', label: 'Settings', icon: <GearIcon size={20} /> },
]

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false)
  const [activeId, setActiveId] = useState('home')

  return (
    <aside
      className={twMerge(
        'flex flex-col h-full bg-white border-r border-neutral-200 shrink-0 transition-[width] duration-200 ease-in-out',
        collapsed ? 'w-16' : 'w-[220px]'
      )}
    >
      <div
        className={twMerge(
          'flex items-center min-h-[60px] p-2',
          collapsed ? 'justify-center' : 'justify-between'
        )}
      >
        {collapsed ? (
          <button
            className="flex items-center justify-center w-9 h-9 p-0 rounded-[10px] cursor-pointer text-neutral-500 transition-colors duration-150 hover:bg-neutral-100 hover:text-black shrink-0"
            onClick={() => setCollapsed(false)}
            aria-label="Expand sidebar"
          >
            <CaretRightIcon size={20} />
          </button>
        ) : (
          <>
            <div className="flex items-center overflow-hidden pl-1">
              <img src="/login-logo.svg" alt="Nekta" className="h-6 w-auto" />
            </div>
            <button
              className="flex items-center justify-center w-9 h-9 p-0 rounded-[10px] cursor-pointer text-neutral-500 transition-colors duration-150 hover:bg-neutral-100 hover:text-black shrink-0"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
            >
              <CaretLeftIcon size={20} />
            </button>
          </>
        )}
      </div>

      <div className={twMerge('h-px bg-neutral-200', collapsed ? 'mx-2' : 'mx-2')} />

      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2 scrollbar-none">
        <ul className="flex flex-col gap-1 list-none m-0 p-0">
          {menuItems.map((item) => (
            <li key={item.id}>
              <SidebarButton
                icon={item.icon}
                label={item.label}
                active={activeId === item.id}
                collapsed={collapsed}
                onClick={() => {
                  setActiveId(item.id)
                  item.onClick?.()
                }}
              />
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-2 border-t border-neutral-200">
        <ul className="flex flex-col gap-1 list-none m-0 p-0">
          {bottomItems.map((item) => (
            <li key={item.id}>
              <SidebarButton
                icon={item.icon}
                label={item.label}
                active={activeId === item.id}
                collapsed={collapsed}
                onClick={() => {
                  setActiveId(item.id)
                  item.onClick?.()
                }}
              />
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
