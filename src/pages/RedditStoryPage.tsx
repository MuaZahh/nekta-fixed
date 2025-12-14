import { Player } from '@remotion/player'
import { StitchingState } from '@remotion/renderer'
import { DownloadSimpleIcon, FolderOpenIcon } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { HelloWorld, myCompSchema } from '../remotion/templates/demo/HelloWorld'
import { useRouter } from '../state/router'
import { PageLayout } from '../components/PageLayout'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { OpenAITTSProvider } from '@/lib/providers/openAI'

interface RenderProgress {
  renderedFrames: number
  encodedFrames: number
  encodedDoneIn: number | null
  renderedDoneIn: number | null
  renderEstimatedTime: number
  progress: number
  stitchStage: StitchingState
}

interface RenderError {
  name: string
  message: string
  stack?: string
}

const defaultProps: z.infer<typeof myCompSchema> = {
  titleText: 'Welcome To Electron + Remotion',
  titleColor: '#000000',
  logoColor1: '#91EAE4',
  logoColor2: '#86A8E7',
  metadata: {
    durationInFrames: 150,
    compositionWidth: 1920,
    compositionHeight: 1080,
    fps: 30,
  },
}

export const RedditStoryPage = () => {
  const setRoute = useRouter((state) => state.setRoute)
  const [isRendering, setIsRendering] = useState(false)
  const [renderProgress, setRenderProgress] = useState<RenderProgress | null>(null)
  const [renderError, setRenderError] = useState<RenderError | null>(null)

  useEffect(() => {
    window.ipcRenderer.on('RENDER_PROGRESS', (_event, progress: RenderProgress) => {
      setRenderProgress(progress)
    })
    window.ipcRenderer.on('RENDER_ERROR', (_event, error: RenderError) => {
      console.error('Render error:', error)
      setRenderError(error)
      setIsRendering(false)
    })
    return () => {
      window.ipcRenderer.removeAllListeners('RENDER_PROGRESS')
      window.ipcRenderer.removeAllListeners('RENDER_ERROR')
    }
  }, [])

  const renderVideo = async () => {
    setRenderError(null)
    setRenderProgress({
      renderedFrames: 0,
      encodedFrames: 0,
      encodedDoneIn: null,
      renderedDoneIn: null,
      renderEstimatedTime: 0,
      progress: 0,
      stitchStage: 'encoding',
    })
    setIsRendering(true)

    const response: boolean = await window.ipcRenderer.invoke('RENDER_MEDIA', defaultProps)

    if (response) {
      console.log('Video rendered successfully!')
    } else {
      console.error('Failed to render video.')
    }

    setIsRendering(false)
  }

  const onGenerate = async() => {
    const p = new OpenAITTSProvider()
    const res = await p.generate('shimmer', 'Hey there! how was your day?')
    console.log(res)
  }

  const progressPercent = renderProgress ? Math.round(renderProgress.progress * 100) : 0

  return (
    <PageLayout title="Reddit Story">
      <div className="flex flex-col items-center gap-6">
          <Player
            component={HelloWorld}
            inputProps={defaultProps}
            style={{
              width: 320 * 2,
              height: 180 * 2,
              borderRadius: 12,
              overflow: 'hidden',
            }}
            controls
            {...defaultProps.metadata}
          />

          {/* Render Button & Progress */}
          <div className="w-full max-w-[640px]">
            {renderError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4">
                <p className="font-medium">Error: {renderError.name}</p>
                <p className="text-sm mt-1">{renderError.message}</p>
              </div>
            )}

            {isRendering && renderProgress ? (
              <div className="bg-white rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-neutral-700">
                    {renderProgress.stitchStage === 'encoding' ? 'Encoding' : 'Muxing Audio'}
                  </span>
                  <span className="text-sm font-medium text-neutral-900">{progressPercent}%</span>
                </div>
                <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-black rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-3 text-xs text-neutral-500">
                  <span>Frames: {renderProgress.renderedFrames} / {defaultProps.metadata.durationInFrames}</span>
                  <span>
                    {renderProgress.renderEstimatedTime > 0
                      ? `~${Math.round(renderProgress.renderEstimatedTime / 1000)}s remaining`
                      : 'Calculating...'}
                  </span>
                </div>
              </div>
            ) : renderProgress && !isRendering && renderProgress.progress === 1 ? (
              <div className="bg-white rounded-2xl p-5">
                <p className="text-neutral-900 font-medium text-center">Render Complete!</p>
                <p className="text-sm text-neutral-500 mt-1 text-center">
                  Saved to Library
                </p>
                <button
                  onClick={() => setRoute('library')}
                  className="w-full flex items-center justify-center gap-2 mt-4 bg-black text-white font-medium py-3 px-6 rounded-xl hover:bg-neutral-800 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <FolderOpenIcon size={20} weight="bold" />
                  Open Library
                </button>
              </div>
            ) : (
              <button
                onClick={renderVideo}
                disabled={isRendering}
                className="w-full flex items-center justify-center gap-2 bg-black text-white font-medium py-3 px-6 rounded-xl hover:bg-neutral-800 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <DownloadSimpleIcon size={20} weight="bold" />
                Render Video
              </button>
            )}
          </div>

          <Button onClick={onGenerate}>Generate text</Button>
        </div>
    </PageLayout>
  )
}
