import { twMerge } from 'tailwind-merge'
import {
  HouseIcon,
  FolderOpenIcon,
    UsersIcon,
  MusicNotesIcon,
  ChartLineIcon,
  GearIcon,
  CaretLeftIcon,
  CaretRightIcon,
} from '@phosphor-icons/react'
import { SidebarButton } from './SidebarButton'
import { useRouter, AppRoute } from '../../state/router'
import { useState } from 'react'
import loginLogo from '/login-logo.svg'

interface SidebarItem {
  id: AppRoute
  label: string
  icon: React.ReactNode
}

const menuItems: SidebarItem[] = [
  { id: 'home', label: 'Home', icon: <HouseIcon size={20} /> },
  { id: 'library', label: 'Library', icon: <FolderOpenIcon size={20} /> },
  { id: 'avatars', label: 'UGC Avatars', icon: <UsersIcon size={20} /> },
  { id: 'music', label: 'Music', icon: <MusicNotesIcon size={20} /> },
  { id: 'usage', label: 'Usage', icon: <ChartLineIcon size={20} /> },
]

const bottomItems: SidebarItem[] = [
  { id: 'settings', label: 'Settings', icon: <GearIcon size={20} /> },
]

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false)
  const route = useRouter((state) => state.route)
  const setRoute = useRouter((state) => state.setRoute)

  const activeId = route === 'reddit-story' ? 'home' : route

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
              <img src={loginLogo} alt="Nekta" className="h-6 w-auto" />
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
                onClick={() => setRoute(item.id)}
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
                onClick={() => setRoute(item.id)}
              />
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
