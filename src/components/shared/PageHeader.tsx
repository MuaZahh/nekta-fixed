import { XIcon } from '@phosphor-icons/react'
import { useRouter } from '@/state/router'

interface PageHeaderProps {
  title: string
}

export const PageHeader = ({ title }: PageHeaderProps) => {
  const setRoute = useRouter((state) => state.setRoute)

  return (
    <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-[#F3F3EE]">
      <h1 className="text-xl font-medium text-neutral-900">{title}</h1>
      <button
        onClick={() => setRoute('home')}
        className="flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-200/60 text-neutral-600 hover:bg-neutral-300 hover:text-neutral-900 transition-colors cursor-pointer"
        aria-label="Close"
      >
        <XIcon size={18} />
      </button>
    </div>
  )
}
