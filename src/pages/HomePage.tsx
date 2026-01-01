import { useState, useRef, useEffect } from 'react'
import { useRouter, AppRoute } from '../state/router'

type ContentType = 'videos' | 'images'

interface Suggestion {
  id: string
  title: string
  description: string
  route?: AppRoute
}

const suggestions: Record<ContentType, Suggestion[]> = {
  videos: [
    { id: 'v1', title: 'AI Story', description: 'Generate narrated stories with AI voices and visuals', route: 'ai-video' },
    { id: 'v6', title: 'Captioned video', description: 'Create a video with captions and/or dialog', route: 'captioned-video' },
    { id: 'v2', title: 'UGC Avatar (hook + demo)', description: 'Great for marketing your eCom/SaaS/mobile app', route: 'ugc-avatar-hook' },
    { id: 'v3', title: 'Video Slideshow', description: 'Create slideshows with AI-generated images', route: 'video-slideshow' },
    { id: 'v4', title: 'Music Visualization', description: 'Create audio visualizations for your music', route: 'music-visualization' },
    { id: 'v5', title: 'Fake Texts', description: 'Create realistic text message conversation videos' },
  ],
  images: [
    { id: 'i1', title: 'Generate Image', description: 'Create images with AI from text descriptions', route: 'generate-image' },
  ],
}

const tabs: { id: ContentType; label: string }[] = [
  { id: 'videos', label: 'Videos' },
  { id: 'images', label: 'Images' },
]

export const HomePage = () => {
  const [activeTab, setActiveTab] = useState<ContentType>('videos')
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })
  const tabRefs = useRef<Map<ContentType, HTMLButtonElement>>(new Map())
  const setRoute = useRouter((state) => state.setRoute)

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
              onClick={() => suggestion.route && setRoute(suggestion.route)}
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
