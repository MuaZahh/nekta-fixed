import { useState, useRef, useEffect } from 'react'

type ContentType = 'videos' | 'images' | 'other'

interface Suggestion {
  id: string
  title: string
  description: string
}

const suggestions: Record<ContentType, Suggestion[]> = {
  videos: [
    { id: 'v1', title: 'Product Demo', description: 'Showcase your product with a professional walkthrough' },
    { id: 'v2', title: 'Social Reel', description: 'Vertical video optimized for Instagram & TikTok' },
    { id: 'v3', title: 'Explainer', description: 'Break down complex topics with animated visuals' },
    { id: 'v4', title: 'Testimonial', description: 'Customer stories that build trust' },
  ],
  images: [
    { id: 'i1', title: 'Social Post', description: 'Eye-catching graphics for your feed' },
    { id: 'i2', title: 'Story Slide', description: 'Vertical designs for ephemeral content' },
    { id: 'i3', title: 'Banner Ad', description: 'Display ads that convert' },
  ],
  other: [
    { id: 'o1', title: 'Audio Clip', description: 'Voiceovers and sound effects' },
    { id: 'o2', title: 'Script', description: 'AI-generated scripts for your content' },
  ],
}

const tabs: { id: ContentType; label: string }[] = [
  { id: 'videos', label: 'Videos' },
  { id: 'images', label: 'Images' },
  { id: 'other', label: 'Other' },
]

export const HomePage = () => {
  const [activeTab, setActiveTab] = useState<ContentType>('videos')
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })
  const tabRefs = useRef<Map<ContentType, HTMLButtonElement>>(new Map())

  useEffect(() => {
    const activeButton = tabRefs.current.get(activeTab)
    if (activeButton) {
      const parent = activeButton.parentElement
      if (parent) {
        const parentRect = parent.getBoundingClientRect()
        const buttonRect = activeButton.getBoundingClientRect()
        setIndicatorStyle({
          left: buttonRect.left - parentRect.left,
          width: buttonRect.width,
        })
      }
    }
  }, [activeTab])

  const setTabRef = (id: ContentType) => (el: HTMLButtonElement | null) => {
    if (el) {
      tabRefs.current.set(id, el)
    }
  }

  return (
    <div className="flex flex-col items-center w-full pt-16">
      <div className="w-full max-w-[700px] px-4">
        <h1 className="text-[2.5rem] font-medium text-neutral-900 text-center mb-10 leading-tight tracking-tight">
          What do you want to create?
        </h1>

        <div className="relative flex items-center justify-center mb-10">
          <div className="relative flex items-center bg-neutral-200/60 rounded-full p-1">
            <div
              className="absolute top-1 bottom-1 bg-black rounded-full transition-all duration-300 ease-out"
              style={{
                left: indicatorStyle.left,
                width: indicatorStyle.width,
              }}
            />

            {tabs.map((tab) => (
              <button
                key={tab.id}
                ref={setTabRef(tab.id)}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  relative z-10 px-6 py-2.5 text-sm font-medium rounded-full cursor-pointer
                  transition-colors duration-300
                  ${activeTab === tab.id ? 'text-white' : 'text-neutral-600 hover:text-neutral-900'}
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] xl:grid-cols-3 gap-3">
          {suggestions[activeTab].map((suggestion, index) => (
            <button
              key={suggestion.id}
              className="group min-h-[110px] min-w-[200px] flex flex-col w-full h-full text-left bg-white rounded-2xl p-4 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]"
              style={{
                animationDelay: `${index * 50}ms`,
              }}
            >
              <h3 className="text-base font-medium text-neutral-900 leading-none group-hover:text-black m-0">
                {suggestion.title}
              </h3>
              <div className="flex-1" />
              <p className="text-sm text-neutral-500 group-hover:text-neutral-600 m-0">
                {suggestion.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
