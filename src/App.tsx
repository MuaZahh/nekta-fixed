import "./App.css";

import { useEffect } from "react";
import { LoginScreen } from "./components/login/LoginScreen";
import { Sidebar } from "./components/sidebar/Sidebar";
import { BrowserDownloadModal } from "./components/browser-download/BrowserDownloadModal";
import { ContentDownloadIndicator } from "./components/shared/ContentDownloadIndicator";
import { HomePage } from "./pages/HomePage";
import { UgcAvatarHookPage } from "./pages/UgcAvatarHook";
import { LibraryPage } from "./pages/LibraryPage";
import { useRouter } from "./state/router";
import { AIVideoPage } from "./pages/AIVideoPage";
import { SettingsPage } from "./pages/SettingsPage";
import { CaptionedVideoPage } from "./pages/CaptionedVideoPage";
import { contentManager } from "./lib/contentManager";

function App() {
  const route = useRouter((state) => state.route);

  useEffect(() => {
    contentManager.initialize()
  }, [])

  return (
    <div className="flex w-full h-full absolute inset-0 overflow-hidden">
      <LoginScreen />
      <BrowserDownloadModal />
      <ContentDownloadIndicator />

      <Sidebar />

      <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 scrollbar-none">
        {route === 'home' && <HomePage />}
        {route === 'ai-video' && <AIVideoPage />}
        {route === 'ugc-avatar-hook' && <UgcAvatarHookPage />}
        {route === 'library' && <LibraryPage />}
        {route === 'settings' && <SettingsPage />}
        {route === 'captioned-video' && <CaptionedVideoPage />}

      </main>
    </div>
  );
}

export default App;
