import { XIcon } from '@phosphor-icons/react'
import { useRouter } from '../state/router'

interface PageLayoutProps {
  title: string
  children: React.ReactNode
}

export const PageLayout = ({ title, children }: PageLayoutProps) => {
  const setRoute = useRouter((state) => state.setRoute)

  return (
    <div className="flex flex-col items-center w-full pt-8">
      <div className="w-full max-w-[800px] px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-medium text-neutral-900">{title}</h1>
          <button
            onClick={() => setRoute('home')}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-neutral-200/60 text-neutral-600 hover:bg-neutral-300 hover:text-neutral-900 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <XIcon size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
