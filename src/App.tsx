import "./App.css";

import { ComponentType, useEffect } from "react";
import { LoginScreen } from "./components/login/LoginScreen";
import { Sidebar } from "./components/sidebar/Sidebar";
import { BrowserDownloadModal } from "./components/browser-download/BrowserDownloadModal";
import { ContentDownloadIndicator } from "./components/shared/ContentDownloadIndicator";
import { AppUpdateIndicator } from "./components/shared/AppUpdateIndicator";
import { HomePage } from "./pages/HomePage";
import { UgcAvatarHookPage } from "./pages/UgcAvatarHook";
import { LibraryPage } from "./pages/LibraryPage";
import { AppRoute, useRouter } from "./state/router";
import { AIVideoPage } from "./pages/AIVideoPage";
import { SettingsPage } from "./pages/SettingsPage";
import { CaptionedVideoPage } from "./pages/CaptionedVideoPage";
import { VideoSlideshowPage } from "./pages/VideoSlideshowPage";
import { MusicVisualizationPage } from "./pages/music-visualization/MusicVisualizationPage";
import { GenerateImagePage } from "./pages/GenerateImagePage";
import { contentManager } from "./lib/contentManager";

const ROUTES: Partial<Record<AppRoute, ComponentType>> = {
  'home': HomePage,
  'ai-video': AIVideoPage,
  'ugc-avatar-hook': UgcAvatarHookPage,
  'library': LibraryPage,
  'settings': SettingsPage,
  'captioned-video': CaptionedVideoPage,
  'video-slideshow': VideoSlideshowPage,
  'music-visualization': MusicVisualizationPage,
  'generate-image': GenerateImagePage,
};

function App() {
  const route = useRouter((state) => state.route);
  const PageComponent = ROUTES[route] ?? HomePage;

  useEffect(() => {
    contentManager.initialize()
  }, [])

  return (
    <div className="flex w-full h-full absolute inset-0 overflow-hidden">
      <LoginScreen />
      <BrowserDownloadModal />
      <ContentDownloadIndicator />
      <AppUpdateIndicator />

      <Sidebar />

      <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 scrollbar-none">
        <PageComponent />
      </main>
    </div>
  );
}

export default App;
