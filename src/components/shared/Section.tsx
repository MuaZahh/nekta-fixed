import {
  CaretDownIcon,
} from '@phosphor-icons/react'
import { useState } from 'react'

export const Section = ({
  title,
  children,
  className = '',
  rightElement,
  defaultOpen = true,
}: {
  title: string
  children: React.ReactNode
  className?: string
  rightElement?: React.ReactNode
  defaultOpen?: boolean
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div
      className={`w-full max-w-[640px] rounded-xl bg-white border border-neutral-100 ${className}`}
    >
      <div
        className="flex items-center justify-between p-4 cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <CaretDownIcon
            size={14}
            weight="bold"
            className={`text-neutral-400 transition-transform ${isOpen ? '' : '-rotate-90'}`}
          />
          <span className="text-sm font-medium text-neutral-700">{title}</span>
        </div>
        {rightElement && isOpen && (
          <div onClick={(e) => e.stopPropagation()}>{rightElement}</div>
        )}
      </div>
      {isOpen && (
        <div className="px-4 pb-4 flex flex-col gap-4">{children}</div>
      )}
    </div>
  )
}