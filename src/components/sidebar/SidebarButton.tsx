import { twMerge } from 'tailwind-merge'

interface SidebarButtonProps {
  icon: React.ReactNode
  label: string
  active?: boolean
  collapsed?: boolean
  onClick?: () => void
}

export const SidebarButton = ({
  icon,
  label,
  active = false,
  collapsed = false,
  onClick,
}: SidebarButtonProps) => {
  return (
    <button
      className={twMerge(
        'flex items-center w-full rounded-[10px] cursor-pointer text-sm font-medium text-left transition-colors duration-150 focus:outline-none',
        collapsed ? 'justify-center p-2' : 'gap-3 px-2.5 py-2',
        active
          ? 'bg-neutral-100 text-black'
          : 'text-neutral-600 hover:bg-neutral-100 hover:text-black'
      )}
      onClick={onClick}
      title={collapsed ? label : undefined}
    >
      <span className="flex items-center justify-center shrink-0">
        {icon}
      </span>
      {!collapsed && (
        <span className="whitespace-nowrap overflow-hidden text-ellipsis">
          {label}
        </span>
      )}
    </button>
  )
}
